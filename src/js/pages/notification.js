// PTPM — Notification Page
// Full notification list with tab filtering, read/unread toggling, mark-all-as-read.
// Depends on: config.js, utils.js, vitalsync.js
// Exposes window.PtpmNotification with init().
(function () {
  'use strict';

  var config = window.AppConfig;
  var utils = window.PtpmUtils;

  // ─── State ──────────────────────────────────────────────────

  var state = {
    notifications: [],
    currentTab: 'Action Required',
    onlyUnread: false,
    selectedIndex: 0,
    sub: null,
    model: null,
    query: null,
  };

  // ─── DOM Refs ───────────────────────────────────────────────

  var els = {};
  function cacheEls() {
    els.list = utils.byId('notifList');
    els.unreadToggle = utils.byId('notifUnreadToggle');
    els.markAllBtn = utils.byId('notifMarkAll');
    els.tabAction = utils.byId('notifTabAction');
    els.tabGeneral = utils.byId('notifTabGeneral');
    els.badge = utils.byId('notification-count');
    els.viewMore = utils.byId('notifViewMore');
    els.bellBtn = utils.byId('notification-btn');
  }

  // ─── Helpers ────────────────────────────────────────────────

  function formatNotificationDate(value) {
    var d = window.dayjs ? window.dayjs(value) : null;
    if (d && d.isValid && d.isValid()) return d.format('DD MMM · h:mma');
    return value || '';
  }

  function normalizeType(type) {
    var t = (type || '').toLowerCase();
    if (t.includes('action')) return 'Action Required';
    return 'General Updates';
  }

  function mapRecord(n) {
    var raw = (n && typeof n.getState === 'function') ? n.getState() : n;
    if (!raw) return null;
    var label = raw.unique_id ? '#' + raw.unique_id : (raw.title || 'Notification');
    return {
      id: label,
      uniqueId: raw.unique_id || raw.id,
      text: raw.title || 'Notification',
      when: formatNotificationDate(raw.created_at),
      tab: normalizeType(raw.type),
      read: !!raw.is_read,
      origin_url: raw.origin_url || '',
    };
  }

  function mapRecords(records) {
    if (!records) return [];
    if (!Array.isArray(records)) records = [records];
    return records.map(mapRecord).filter(function (n) { return n && (n.text || n.when); });
  }

  // Merge incoming notifications while preserving local read state
  function mergeReadState(incoming) {
    var prev = {};
    state.notifications.forEach(function (n) { prev[n.id] = n.read; });
    return incoming.map(function (n) {
      return Object.assign({}, n, {
        read: (n.id in prev) ? prev[n.id] : (n.read || false),
      });
    });
  }

  // ─── Render ─────────────────────────────────────────────────

  function render() {
    if (!els.list) return;

    var tab = state.currentTab;
    var onlyUnread = state.onlyUnread;
    var hasUnread = state.notifications.some(function (n) { return !n.read; });

    // Tab styles
    var activeCls = 'px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm';
    var inactiveCls = 'px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100';
    if (els.tabAction) els.tabAction.className = (tab === 'Action Required') ? activeCls : inactiveCls;
    if (els.tabGeneral) els.tabGeneral.className = (tab === 'General Updates') ? activeCls : inactiveCls;

    // Unread toggle
    if (els.unreadToggle) {
      els.unreadToggle.setAttribute('aria-pressed', String(onlyUnread));
      els.unreadToggle.classList.toggle('bg-blue-600', onlyUnread);
      els.unreadToggle.classList.toggle('bg-gray-300', !onlyUnread);
      var knob = els.unreadToggle.querySelector('.knob');
      if (knob) {
        knob.classList.toggle('translate-x-0', !onlyUnread);
        knob.classList.toggle('translate-x-5', onlyUnread);
      }
    }

    // Mark-all checkbox icon
    if (els.markAllBtn) {
      var icon = els.markAllBtn.querySelector('svg');
      if (icon) icon.classList.toggle('hidden', hasUnread);
    }

    // Filter items
    var items = [];
    state.notifications.forEach(function (n, i) {
      if (n.tab !== tab) return;
      if (onlyUnread && n.read) return;
      items.push(Object.assign({}, n, { _idx: i }));
    });

    if (state.selectedIndex >= items.length) state.selectedIndex = items.length - 1;
    if (state.selectedIndex < 0) state.selectedIndex = 0;

    // Render rows
    els.list.innerHTML = items.map(function (item, i) {
      return rowTemplate(item, i === state.selectedIndex);
    }).join('');

    // Row click handlers
    Array.from(els.list.children).forEach(function (el, i) {
      el.addEventListener('click', function () {
        state.selectedIndex = i;
        var target = (items[i] && items[i]._idx != null) ? state.notifications[items[i]._idx] : null;
        if (target) {
          if (!target.read) {
            target.read = true;
            markAsRead([target.uniqueId]);
          }
          if (target.origin_url) {
            try { window.open(target.origin_url, '_blank', 'noreferrer'); } catch (e) { /* */ }
          }
        }
        render();
      });
    });

    updateBadge();
  }

  function rowTemplate(item) {
    var unreadDot = !item.read
      ? '<span class="ml-2 w-2.5 h-2.5 rounded-full bg-red-600 shrink-0"></span>'
      : '';
    var baseBg = !item.read ? 'bg-slate-200' : 'bg-white';
    return '<div class="px-4 py-3 ' + baseBg + ' border-b last:border-b-0 cursor-pointer hover:bg-slate-50">' +
      '<div class="flex items-start">' +
        '<div class="flex-1">' +
          '<div class="flex items-center justify-between">' +
            '<div class="text-sm font-medium text-slate-800">' + utils.escapeHtml(item.id) +
              ' <span class="font-normal text-slate-600">- ' + utils.escapeHtml(item.text) + '</span>' +
            '</div>' +
            unreadDot +
          '</div>' +
          '<div class="mt-1 text-xs text-slate-500">' + utils.escapeHtml(item.when) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function updateBadge() {
    if (!els.badge) return;
    var count = state.notifications.filter(function (n) { return !n.read; }).length;
    els.badge.textContent = count > 0 ? String(count) : '';
    els.badge.classList.toggle('hidden', count === 0);
  }

  // ─── SDK Methods ────────────────────────────────────────────

  function markAsRead(ids) {
    if (!ids || !ids.length || !state.model) return;
    try {
      var mutation = state.model.mutation();
      mutation.update(function (q) {
        return q.where('unique_id', 'in', ids).set({ is_read: true });
      });
      mutation.execute(true).toPromise().catch(function (err) {
        console.error('[Notification] markAsRead failed', err);
      });
    } catch (err) {
      console.error('[Notification] markAsRead error', err);
    }
  }

  function loadNotifications() {
    var plugin = window.VitalSync.getPlugin();
    if (!plugin) { console.warn('[Notification] SDK not ready'); return; }

    var modelOrPromise = plugin.switchTo('PeterpmAnnouncement');
    var modelPromise = modelOrPromise && typeof modelOrPromise.then === 'function'
      ? modelOrPromise
      : Promise.resolve(modelOrPromise);
    modelPromise.then(function (model) {
      state.model = model;
      state.query = model.query()
        .where('notified_contact_id', '=', config.LOGGED_IN_USER_ID || '')
        .deSelectAll()
        .select(['id', 'created_at', 'title', 'unique_id', 'type', 'is_read', 'notified_contact_id', 'origin_url'])
        .orderBy('created_at', 'desc')
        .noDestroy();

      state.query.getOrInitQueryCalc();

      state.query.fetchDirect()
        .pipe(window.toMainInstance ? window.toMainInstance(true) : function (x) { return x; })
        .subscribe({
          next: function (result) {
            var records = (result && result.resp) || [];
            handleUpdate(records);
          },
          error: function (err) { console.error('[Notification] fetch error', err); },
        });

      // Subscribe for real-time updates
      subscribeToChanges();
    }).catch(function (err) {
      console.error('[Notification] switchTo failed', err);
    });
  }

  function subscribeToChanges() {
    if (state.sub) { state.sub.unsubscribe(); state.sub = null; }
    if (!state.query) return;

    var liveObs = null;
    try {
      if (typeof state.query.subscribe === 'function') liveObs = state.query.subscribe();
    } catch (_) { /* fallback below */ }

    if (!liveObs && typeof state.query.localSubscribe === 'function') {
      try { liveObs = state.query.localSubscribe(); } catch (_) { /* ignore */ }
    }
    if (!liveObs) return;

    state.sub = liveObs
      .pipe(window.toMainInstance ? window.toMainInstance(true) : function (x) { return x; })
      .subscribe({
        next: function (payload) { handleUpdate(payload); },
        error: function () {},
      });
  }

  function handleUpdate(records) {
    var mapped = mapRecords(records);
    state.notifications = mergeReadState(mapped);
    render();
  }

  // ─── Bind Events ────────────────────────────────────────────

  function bindEvents() {
    // Tab switching
    if (els.tabAction) els.tabAction.addEventListener('click', function () {
      state.currentTab = 'Action Required';
      state.selectedIndex = 0;
      render();
    });
    if (els.tabGeneral) els.tabGeneral.addEventListener('click', function () {
      state.currentTab = 'General Updates';
      state.selectedIndex = 0;
      render();
    });

    // Unread toggle
    if (els.unreadToggle) els.unreadToggle.addEventListener('click', function () {
      state.onlyUnread = !state.onlyUnread;
      render();
    });

    // Mark all as read
    if (els.markAllBtn) els.markAllBtn.addEventListener('click', function () {
      var unread = state.notifications.filter(function (n) { return !n.read; });
      if (!unread.length) return;
      var ids = unread.map(function (n) { return n.uniqueId; }).filter(Boolean);
      if (ids.length) markAsRead(ids);
      unread.forEach(function (n) { n.read = true; });
      render();
    });

    // View more (expand list height)
    if (els.viewMore) els.viewMore.addEventListener('click', function (e) {
      e.preventDefault();
      if (els.list) els.list.style.maxHeight = '600px';
    });
  }

  // ─── Init ───────────────────────────────────────────────────

  function init() {
    cacheEls();
    bindEvents();
    loadNotifications();
  }

  window.PtpmNotification = { init: init };
})();
