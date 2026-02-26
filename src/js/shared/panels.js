/**
 * Shared tab panel renderers for Inquiry & Job detail pages.
 * Each function returns an HTML string for use with Alpine x-html.
 *
 * @namespace PtpmPanels
 */
(function () {
  'use strict';

  var UI = function () { return window.PtpmUI; };
  var esc = function (s) { return UI().esc(s); };
  var badge = function (s) { return UI().badge(s); };
  var money = function (n) { return UI().money(n); };
  var fmtDate = function (v) { return UI().fmtDate(v); };
  var field = function (l, v, o) { return UI().field(l, v, o); };
  var tagPill = function (l) { return UI().tagPill(l); };

  function fmtMemoDate(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'string') {
      var s = v.trim();
      // Backend occasionally returns literal minute token ":mm".
      if (s) return s.replace(/:mm\b/i, ':00');
    }
    return fmtDate(v);
  }

  // ── Memos (ForumPost + ForumComment) ─────────────────────────────────────

  function memos(posts, opts) {
    opts = opts || {};
    if (!posts || !posts.length) {
      return '<p class="text-xs text-gray-400 italic">No memos yet.</p>' + memoCompose(opts);
    }
    var html = '<div class="space-y-3 mb-4 max-h-80 overflow-y-auto">';
    posts.forEach(function (post) {
      html += memoItem(post, false);
      if (post.ForumComments && post.ForumComments.length) {
        post.ForumComments.forEach(function (c) {
          html += memoItem(c, true);
        });
      }
    });
    html += '</div>';
    html += memoCompose(opts);
    return html;
  }

  function memoItem(m, isReply) {
    var author = m.Author || {};
    var name = (author.first_name || '') + (author.last_name ? ' ' + author.last_name : '');
    if (!name.trim()) name = 'System';
    var initial = name.charAt(0).toUpperCase();
    var isAdmin = !author.id || (author.display_name && author.display_name.toLowerCase().indexOf('admin') >= 0);
    var bgCls = isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600';
    var roleBadge = isAdmin ? badge('Admin') : badge('SP');
    var content = m.post_copy || m.comment || '';
    var date = fmtMemoDate(m.created_at || m.Date_Added);

    return '<div class="flex gap-3' + (isReply ? ' pl-6' : '') + '">' +
      '<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ' + bgCls + '">' + esc(initial) + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="flex items-center gap-2">' +
          '<span class="text-xs font-semibold text-gray-800">' + esc(name) + '</span>' +
          roleBadge +
          '<span class="text-xs text-gray-400">' + esc(date) + '</span>' +
        '</div>' +
        '<p class="text-xs text-gray-600 mt-0.5 leading-relaxed">' + esc(content) + '</p>' +
      '</div></div>';
  }

  function memoCompose(opts) {
    return '<div class="flex gap-2">' +
      '<input data-panel-action="memo-input" placeholder="Write a memo..." class="flex-1 text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />' +
      '<button data-panel-action="memo-send" class="inline-flex items-center justify-center font-medium rounded-md px-3 py-1.5 text-xs bg-gray-900 text-white hover:bg-gray-800 border border-gray-900">Send</button>' +
      '</div>';
  }

  // ── Tasks ────────────────────────────────────────────────────────────────

  function tasks(items, opts) {
    opts = opts || {};
    if (!items || !items.length) {
      return '<p class="text-xs text-gray-400 italic">No tasks.</p>' +
        '<div class="mt-2"><button data-panel-action="task-add" class="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Add Task</button></div>';
    }

    var openCount = items.filter(function (t) { return t.status === 'Open' || t.Status === 'Open'; }).length;
    var doneCount = items.length - openCount;

    var html = '<div class="flex items-center justify-between mb-3">' +
      '<p class="text-xs text-gray-500">' + openCount + ' open, ' + doneCount + ' completed</p>' +
      '<button data-panel-action="task-add" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Add Task</button>' +
      '</div><div class="space-y-2">';

    items.forEach(function (t) {
      var s = t.status || t.Status || '';
      var isDone = s === 'Completed';
      var subject = t.subject || t.Subject || '';
      var details = t.details || t.Details || '';
      var assignee = t.assignee_name || ((t.Assignee_First_Name || '') + ' ' + (t.Assignee_Last_Name || '')).trim() || '';
      var due = t.date_due || t.Date_Due || '';
      var completed = t.date_complete || '';

      var taskId = esc(t.id || t.ID);
      var actionHtml = isDone
        ? '<button data-panel-action="task-reopen" data-task-id="' + taskId + '" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">Reopen</button>'
        : '<button data-panel-action="task-complete" data-task-id="' + taskId + '" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 rounded-md">Complete</button>';

      html += '<div class="flex items-start gap-3 p-3 rounded-lg border ' +
        (isDone ? 'border-gray-100 bg-white' : 'border-blue-200 bg-blue-50/50') + '">' +
        '<div class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ' +
        (isDone ? 'border-emerald-400 bg-emerald-100 text-emerald-600' : 'border-gray-300 bg-white text-transparent') + '">' +
        '<span class="text-xs">&check;</span>' +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-xs font-semibold ' + (isDone ? 'text-gray-400 line-through' : 'text-gray-800') + '">' + esc(subject) + '</p>' +
          (details ? '<p class="text-xs text-gray-500 mt-0.5">' + esc(details) + '</p>' : '') +
          '<div class="flex items-center gap-3 mt-1 text-xs text-gray-400">' +
            (assignee ? '<span>Assigned: ' + esc(assignee) + '</span>' : '') +
            (due ? '<span>Due: ' + esc(fmtDate(due)) + '</span>' : '') +
            (completed ? '<span class="text-emerald-600">Done: ' + esc(fmtDate(completed)) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="flex flex-col items-end gap-2">' +
          badge(s) +
          actionHtml +
        '</div>' +
        '</div>';
    });

    html += '</div>';
    return html;
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  function notes(items, opts) {
    opts = opts || {};
    if (!items || !items.length) {
      return '<p class="text-xs text-gray-400 italic">No notes.</p>' +
        '<div class="mt-2"><button data-panel-action="note-add" class="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Add Note</button></div>';
    }

    var html = '<div class="flex items-center justify-between mb-3">' +
      '<p class="text-xs text-gray-500">System and manual notes log</p>' +
      '<button data-panel-action="note-add" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Add Note</button>' +
      '</div><div class="space-y-2">';

    items.forEach(function (n) {
      var type = n.type || 'Manual';
      var author = n.author || n.Author || 'System';
      if (typeof author === 'object') author = (author.first_name || '') + ' ' + (author.last_name || '');
      html += '<div class="flex items-start gap-3 p-2.5 border border-gray-100 rounded-lg">' +
        badge(type) +
        '<div class="flex-1">' +
          '<p class="text-xs text-gray-700">' + esc(n.note || n.Note || '') + '</p>' +
          '<p class="text-xs text-gray-400 mt-0.5">By ' + esc(author) + ' &middot; ' + esc(fmtDate(n.created_at || n.date_created)) + '</p>' +
        '</div></div>';
    });

    html += '</div>';
    return html;
  }

  // ── Appointments ─────────────────────────────────────────────────────────

  function appointments(items, opts) {
    opts = opts || {};
    var filtered = items || [];
    if (opts.filter) {
      filtered = filtered.filter(function (a) { return a.type === opts.filter; });
    }

    if (!filtered.length) {
      return '<p class="text-xs text-gray-400 italic">No appointments.</p>' +
        '<div class="mt-2"><button data-panel-action="appointment-add" class="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Schedule</button></div>';
    }

    var html = '<div class="flex items-center justify-between mb-3">' +
      '<p class="text-xs text-gray-500">' + filtered.length + ' appointment(s)</p>' +
      '<button data-panel-action="appointment-add" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Schedule</button>' +
      '</div><div class="space-y-2">';

    filtered.forEach(function (a) {
      var startDate = a.start_time || '';
      var dateParts = startDate.split ? startDate.split(' ') : [];
      var dateStr = dateParts[0] || '';
      var timeStr = dateParts[1] || '';
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var day = '', mon = '';
      if (dateStr) {
        var dp = dateStr.split('-');
        day = dp[2] || '';
        mon = months[parseInt(dp[1], 10) - 1] || '';
      }

      var host = a.host || '';
      if (typeof host === 'object') host = (host.first_name || '') + ' ' + (host.last_name || '');
      var duration = a.duration || (a.duration_hours ? a.duration_hours + 'hr' : '');

      html += '<div class="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">' +
        '<div class="flex items-center gap-3">' +
          '<div class="w-10 h-10 rounded-lg bg-gray-100 flex flex-col items-center justify-center">' +
            '<span class="text-xs font-bold text-gray-700">' + esc(day) + '</span>' +
            '<span class="text-xs text-gray-400">' + esc(mon) + '</span>' +
          '</div>' +
          '<div>' +
            '<p class="text-xs font-semibold text-gray-800">' + esc(a.title || '') + '</p>' +
            '<p class="text-xs text-gray-500">' + esc(timeStr) + (duration ? ' &middot; ' + esc(duration) : '') + (host ? ' &middot; Host: ' + esc(host) : '') + '</p>' +
          '</div>' +
        '</div>' +
        badge(a.status || '') +
        '</div>';
    });

    html += '</div>';
    return html;
  }

  // ── Uploads ──────────────────────────────────────────────────────────────

  function uploads(items, opts) {
    opts = opts || {};
    if (!items || !items.length) {
      return '<p class="text-xs text-gray-400 italic">No uploads.</p>' +
        '<div class="mt-2"><button data-panel-action="upload-add" class="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Upload</button></div>';
    }

    var photos = items.filter(function (u) { return u.type === 'Photo'; }).length;
    var forms = items.filter(function (u) { return u.type === 'Form'; }).length;
    var files = items.length - photos - forms;

    var html = '<div class="flex items-center justify-between mb-3">' +
      '<div class="flex gap-3 text-xs text-gray-400">' +
        '<span>&#x1F4F7; ' + photos + ' Photos</span>' +
        '<span>&#x1F4DD; ' + forms + ' Forms</span>' +
        '<span>&#x1F4CE; ' + files + ' Files</span>' +
      '</div>' +
      '<button data-panel-action="upload-add" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Upload</button>' +
      '</div><div class="space-y-2">';

    items.forEach(function (u) {
      var icon = u.type === 'Photo' ? '&#x1F5BC;' : u.type === 'Form' ? '&#x1F4DD;' : '&#x1F4CE;';
      var name = u.file_name || u.photo_name || u.form_name || u.name || 'Untitled';
      var uploader = u.uploaded_by || '';
      if (typeof uploader === 'object') uploader = (uploader.first_name || '') + ' ' + (uploader.last_name || '');
      var canView = u.customer_can_view ? ' &middot; &#x1F441; Client visible' : '';

      html += '<div class="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50">' +
        '<div class="flex items-center gap-3">' +
          '<span class="text-base">' + icon + '</span>' +
          '<div>' +
            '<p class="text-xs font-semibold text-gray-800">' + esc(name) + '</p>' +
            '<p class="text-xs text-gray-400">' + esc(u.type || '') + ' &middot; ' + esc(uploader) + ' &middot; ' + esc(fmtDate(u.created_at)) + canView + '</p>' +
          '</div>' +
        '</div>' +
        '<button data-panel-action="upload-view" data-upload-id="' + esc(u.id) + '" class="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">View</button>' +
        '</div>';
    });

    html += '</div>';
    return html;
  }

  // ── Communications ───────────────────────────────────────────────────────

  function comms(items, opts) {
    opts = opts || {};
    if (!items || !items.length) {
      return '<p class="text-xs text-gray-400 italic">No communications recorded.</p>';
    }

    var html = '<p class="text-xs text-gray-500 mb-3">Communications sent via Ontraport automation</p>' +
      '<table class="w-full text-xs">' +
      '<thead><tr class="border-b border-gray-200">' +
      '<th class="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider"></th>' +
      '<th class="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider">Template</th>' +
      '<th class="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider">Recipient</th>' +
      '<th class="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider">Sent</th>' +
      '<th class="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider">Status</th>' +
      '</tr></thead><tbody>';

    items.forEach(function (cm) {
      var icon = cm.type === 'Email' ? '&#x2709;' : '&#x1F4F1;';
      html += '<tr class="border-b border-gray-50 hover:bg-gray-50">' +
        '<td class="py-2 px-2">' + icon + '</td>' +
        '<td class="py-2 px-2 font-medium text-gray-800">' + esc(cm.template || cm.note || '') + '</td>' +
        '<td class="py-2 px-2 text-gray-600 font-mono">' + esc(cm.recipient || '') + '</td>' +
        '<td class="py-2 px-2 text-gray-500">' + esc(fmtDate(cm.sent_at || cm.created_at)) + '</td>' +
        '<td class="py-2 px-2"><div class="flex items-center gap-1.5">' + badge(cm.status || '') +
          (cm.opened ? '<span class="text-xs text-blue-500" title="Opened">&#x1F441;</span>' : '') +
        '</div></td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // ── SP Views ─────────────────────────────────────────────────────────────

  function spViews(items, opts) {
    if (!items || !items.length) {
      return '<p class="text-xs text-gray-400 italic">No service providers have viewed this inquiry.</p>';
    }

    var html = '<p class="text-xs text-gray-500 mb-3">Service providers who have viewed this inquiry</p>' +
      '<div class="space-y-2">';

    items.forEach(function (sv) {
      var name = sv.service_provider_name || '';
      if (typeof sv.Service_Provider === 'object') {
        name = (sv.Service_Provider.first_name || '') + ' ' + (sv.Service_Provider.last_name || '');
      }
      html += '<div class="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg">' +
        '<span class="text-xs font-semibold text-gray-700">' + esc(name) + '</span>' +
        '<span class="text-xs text-gray-400">' + esc(fmtDate(sv.created_at || sv.viewed_at)) + '</span>' +
        '</div>';
    });

    html += '</div>';
    return html;
  }

  // ── Activities ───────────────────────────────────────────────────────────

  function activities(items, opts) {
    opts = opts || {};
    if (!items || !items.length) {
      return '<div class="flex items-center justify-between mb-3">' +
        '<p class="text-xs text-gray-400 italic">No activities.</p>' +
        '<button data-panel-action="activity-add" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Add Activity</button>' +
        '</div>';
    }

    var html = '<div class="flex items-center justify-between mb-4">' +
      '<p class="text-xs text-gray-500">' + items.length + ' activity line(s)</p>' +
      '<button data-panel-action="activity-add" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Add Activity</button>' +
      '</div>';

    // Group by task
    var byTask = {};
    items.forEach(function (a) {
      var task = a.task || 'Job 1';
      if (!byTask[task]) byTask[task] = [];
      byTask[task].push(a);
    });

    Object.keys(byTask).forEach(function (task) {
      var acts = byTask[task];
      var hasOptionGroup = acts.some(function (a) { return a.option_group || a.option; });
      var allOptional = acts.every(function (a) { return a.is_optional; });

      html += '<div class="mb-3 last:mb-0">';
      html += '<div class="flex items-center gap-2 mb-1.5 ml-1">' +
        '<span class="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded font-mono">' + esc(task) + '</span>';
      if (hasOptionGroup) html += '<span class="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Client selects one</span>';
      else if (allOptional) html += '<span class="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Optional</span>';
      html += '</div>';

      acts.forEach(function (a) {
        var accepted = a.quote_accepted;
        var borderCls = accepted === true ? 'bg-emerald-50/50 border-emerald-200'
          : accepted === false ? 'bg-gray-50 border-gray-100 opacity-50'
          : 'bg-white border-gray-200 hover:border-gray-300';

        html += '<div class="flex items-start gap-3 p-2.5 rounded-lg border mb-1.5 transition-all ' + borderCls + '">';

        // Selection indicator
        if (hasOptionGroup) {
          html += '<div class="flex-shrink-0 mt-0.5"><div class="w-4 h-4 rounded-full border-2 flex items-center justify-center ' +
            (accepted ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300') + '">' +
            (accepted ? '<span class="text-white text-xs">&bull;</span>' : '') +
            '</div></div>';
        } else if (a.is_optional) {
          html += '<div class="flex-shrink-0 mt-0.5"><div class="w-4 h-4 rounded border-2 flex items-center justify-center ' +
            (accepted ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300') + '">' +
            (accepted ? '<span class="text-white text-xs font-bold">&check;</span>' : '') +
            '</div></div>';
        } else {
          html += '<div class="flex-shrink-0 mt-0.5"><div class="w-4 h-4 rounded bg-gray-900 flex items-center justify-center">' +
            '<span class="text-white text-xs font-bold">&check;</span></div></div>';
        }

        // Content
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="flex items-center gap-2 mb-0.5">';
        if (a.option) html += '<span class="text-xs font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">' + esc(a.option) + '</span>';
        html += badge(a.activity_status || a.status || 'Quoted');
        if (a.warranty) html += '<span class="text-xs text-gray-400">&#x1F6E1; ' + esc(a.warranty) + '</span>';
        html += '</div>';
        html += '<p class="text-xs text-gray-800 leading-relaxed">' + esc(a.quoted_text || a.activity_text || a.description || '') + '</p>';
        html += '</div>';

        // Price
        var price = a.quoted_price || a.activity_price;
        html += '<div class="flex-shrink-0 text-right">';
        if (price != null) {
          html += '<p class="text-sm font-bold font-mono text-gray-900">' + money(price) + '</p>';
          html += '<p class="text-xs text-gray-400">inc GST</p>';
        } else {
          html += '<p class="text-xs text-gray-400 italic">incl. in section</p>';
        }
        html += '</div>';

        // Actions
        html += '<div class="flex-shrink-0"><button data-panel-action="activity-edit" data-activity-id="' + esc(a.id) + '" class="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">&vellip;</button></div>';

        html += '</div>';
      });

      html += '</div>';
    });

    return html;
  }

  // ── Materials ────────────────────────────────────────────────────────────

  function materials(items, opts) {
    opts = opts || {};
    if (!items || !items.length) {
      return '<div class="flex items-center justify-between">' +
        '<p class="text-xs text-gray-400 italic">No materials.</p>' +
        '<button data-panel-action="material-add" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Add Material</button>' +
        '</div>';
    }

    var html = '<div class="flex items-center justify-between mb-3">' +
      '<p class="text-xs text-gray-500">Materials: <span class="text-red-600 font-semibold">Deduct</span> = from SP pay &middot; <span class="text-emerald-600 font-semibold">Reimburse</span> = add to SP pay</p>' +
      '<button data-panel-action="material-add" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">+ Add Material</button>' +
      '</div>';

    html += '<table class="w-full text-xs"><thead><tr class="border-b border-gray-200">';
    ['Material', 'Description', 'Type', 'Amount', 'Status', 'Receipt', ''].forEach(function (h) {
      html += '<th class="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider">' + h + '</th>';
    });
    html += '</tr></thead><tbody>';

    items.forEach(function (m) {
      html += '<tr class="border-b border-gray-50">' +
        '<td class="py-2.5 px-2 font-medium text-gray-800">' + esc(m.material_name || '') + '</td>' +
        '<td class="py-2.5 px-2 text-gray-500 max-w-[200px] truncate">' + esc(m.description || '') + '</td>' +
        '<td class="py-2.5 px-2">' + badge(m.transaction_type || '') + '</td>' +
        '<td class="py-2.5 px-2 font-mono">' + money(m.total) + '</td>' +
        '<td class="py-2.5 px-2">' + badge(m.status || '') + '</td>' +
        '<td class="py-2.5 px-2">' + (m.receipt ? '<span class="text-blue-600 cursor-pointer hover:underline" data-panel-action="material-receipt" data-material-id="' + esc(m.id) + '">View</span>' : '<span class="text-gray-300">&mdash;</span>') + '</td>' +
        '<td class="py-2.5 px-2"><button data-panel-action="material-edit" data-material-id="' + esc(m.id) + '" class="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">Edit</button></td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // ── Wildlife ─────────────────────────────────────────────────────────────

  function wildlife(job, opts) {
    if (!job) return '<p class="text-xs text-gray-400 italic">No wildlife data.</p>';

    var html = '<div class="space-y-3">' +
      '<div class="flex items-center justify-between">' +
        '<p class="text-xs text-gray-500">Wildlife capture and release reporting</p>' +
        '<button data-panel-action="wildlife-edit" class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">Edit Report</button>' +
      '</div>' +
      '<div class="grid grid-cols-3 gap-4">';

    [['Possums', job.possum_number || 0, job.possum_comment], ['Turkeys', job.turkey_number || 0, job.turkey_comment]].forEach(function (item) {
      html += '<div class="border border-gray-200 rounded-lg p-3">' +
        '<p class="text-xs text-gray-400 font-medium mb-1">' + esc(item[0]) + '</p>' +
        '<p class="text-2xl font-bold text-gray-900">' + item[1] + '</p>' +
        (item[2] ? '<p class="text-xs text-gray-500 mt-1">' + esc(item[2]) + '</p>' : '') +
        '</div>';
    });

    html += '<div class="border border-gray-200 rounded-lg p-3">' +
      '<p class="text-xs text-gray-400 font-medium mb-1">Release Site</p>' +
      '<p class="text-sm font-semibold text-gray-900">' + esc(job.turkey_release_site || 'N/A') + '</p>' +
      '</div></div>';

    // Noise signs
    var signs = job.noise_signs || job.noise_signs_options_as_text;
    if (signs) {
      var arr = Array.isArray(signs) ? signs : String(signs).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (arr.length) {
        html += '<div class="pt-3 border-t border-gray-100">' +
          '<dt class="text-xs text-gray-400 font-medium mb-1.5">Noise / Signs Observed (Job)</dt>' +
          '<div class="flex flex-wrap gap-1">' + arr.map(tagPill).join('') + '</div></div>';
      }
    }
    if (job.location_name) {
      html += field('Location on Property', job.location_name);
    }

    html += '</div>';
    return html;
  }

  // ── Compliance ───────────────────────────────────────────────────────────

  function compliance(job, opts) {
    if (!job) return '';

    var checks = [
      { done: !!job.prestart_done, label: 'Prestart Checklist', descDone: 'Completed before work commenced', descNot: 'NOT completed \u2014 work cannot proceed' },
      { done: !!job.pca_done, label: 'Pest Control Advice (PCA)', descDone: 'PCA form completed and filed', descNot: 'PCA form outstanding' },
    ];

    var html = '<div class="space-y-3">' +
      '<p class="text-xs text-gray-500 mb-2">Pre-work compliance \u2014 must be completed before work commences</p>' +
      '<div class="grid grid-cols-2 gap-4">';

    checks.forEach(function (f) {
      html += '<div class="border rounded-lg p-4 ' + (f.done ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50') + '">' +
        '<div class="flex items-center gap-2 mb-1">' +
          '<span class="text-lg ' + (f.done ? 'text-emerald-500' : 'text-red-400') + '">' + (f.done ? '&check;' : '&cross;') + '</span>' +
          '<p class="text-sm font-semibold text-gray-900">' + esc(f.label) + '</p>' +
        '</div>' +
        '<p class="text-xs text-gray-500">' + esc(f.done ? f.descDone : f.descNot) + '</p>' +
        '<button data-panel-action="compliance-view" class="inline-flex items-center px-2 py-1 mt-2 text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md">View Form</button>' +
        '</div>';
    });

    html += '</div>';

    // Signature & T&C
    html += '<div class="grid grid-cols-2 gap-4 pt-2">' +
      '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">' +
        '<span class="text-gray-500">Terms & Conditions</span>' +
        '<span class="' + (job.terms_and_conditions_accepted ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold') + '">' +
          (job.terms_and_conditions_accepted ? '&check; Accepted' : '&cross; Not accepted') +
        '</span>' +
      '</div>' +
      '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">' +
        '<span class="text-gray-500">Signature</span>' +
        '<span class="' + (job.signature ? 'text-emerald-600 font-semibold' : 'text-gray-400') + '">' +
          (job.signature ? '&check; On file' : 'Not provided') +
        '</span>' +
      '</div>' +
      '</div></div>';

    return html;
  }

  // ── Export ────────────────────────────────────────────────────────────────

  window.PtpmPanels = {
    memos: memos,
    tasks: tasks,
    notes: notes,
    appointments: appointments,
    uploads: uploads,
    comms: comms,
    spViews: spViews,
    activities: activities,
    materials: materials,
    wildlife: wildlife,
    compliance: compliance,
  };
})();
