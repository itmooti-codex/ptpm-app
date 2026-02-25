// PTPM - Company Detail Page
// Single-company view: company overview + address + related records.
// Loads company by ID from URL (?company=). Uses direct GraphQL fetch.
(function () {
  'use strict';

  var config = window.AppConfig || {};
  var utils = window.PtpmUtils || window.AppUtils || {};

  function byId(id) { return document.getElementById(id); }
  function esc(v) { return utils.escapeHtml ? utils.escapeHtml(v) : String(v == null ? '' : v); }
  function str(v) { return v == null ? '' : String(v).trim(); }

  var GRAPHQL_ENDPOINT = (config.API_BASE || 'https://' + (config.SLUG || 'peterpm') + '.vitalstats.app') + '/api/v1/graphql';
  var COMPANY_BY_ID_QUERY = 'query calcCompanies($id: PeterpmCompanyID!) { calcCompanies(query: [{ where: { id: $id } }]) { id: field(arg: ["id"]) unique_id: field(arg: ["unique_id"]) name: field(arg: ["name"]) account_type: field(arg: ["account_type"]) phone: field(arg: ["phone"]) address: field(arg: ["address"]) city: field(arg: ["city"]) state: field(arg: ["state"]) postal_code: field(arg: ["postal_code"]) created_at: field(arg: ["created_at"]) popup_comment: field(arg: ["popup_comment"]) } }';

  function buildJobsByCompanyQuery(companyId) {
    var id = /^\d+$/.test(String(companyId)) ? parseInt(companyId, 10) : companyId;
    return 'query { calcJobs(query: [{ where: { client_entity_id: ' + id + ', _OPERATOR_: eq } }], limit: 200, offset: 0) { ID: field(arg: ["id"]) Unique_ID: field(arg: ["unique_id"]) Quote_Date: field(arg: ["quote_date"]) Quote_Total: field(arg: ["quote_total"]) Quote_Status: field(arg: ["quote_status"]) Invoice_Number: field(arg: ["invoice_number"]) Invoice_Total: field(arg: ["invoice_total"]) Job_Status: field(arg: ["job_status"]) Date_Booked: field(arg: ["date_booked"]) Date_Scheduled: field(arg: ["date_scheduled"]) } }';
  }

  function buildDealsByCompanyQuery(companyId) {
    var id = /^\d+$/.test(String(companyId)) ? parseInt(companyId, 10) : companyId;
    return 'query { calcDeals(query: [{ where: { company_id: ' + id + ', _OPERATOR_: eq } }], limit: 200, offset: 0) { id: field(arg: ["id"]) Unique_ID: field(arg: ["unique_id"]) Deal_Name: field(arg: ["deal_name"]) Sales_Stage: field(arg: ["sales_stage"]) Deal_Value: field(arg: ["deal_value"]) Created_At: field(arg: ["created_at"]) Type: field(arg: ["type"]) Inquiry_Status: field(arg: ["inquiry_status"]) } }';
  }

  var state = {
    companyId: null,
    company: null,
    tab: 'all',
    relatedJobs: [],
    relatedDeals: [],
    relatedRows: [],
    isEditing: false,
    isSaving: false,
  };

  var COMPANY_MODEL = 'PeterpmCompany';
  var COMPANY_ACCOUNT_TYPE_OPTIONS = ['Business', 'Family/Individual'];
  var EDITABLE_INPUT_IDS = ['cmp-name', 'cmp-account-type', 'cmp-phone', 'cmp-popup-comment', 'cmp-address', 'cmp-city', 'cmp-state', 'cmp-postal-code'];
  var PAYLOAD_KEYS_ALLOWED = ['name', 'account_type', 'phone', 'popup_comment', 'address', 'city', 'state', 'postal_code'];

  function getApiKey() {
    return (config.API_KEY && String(config.API_KEY).trim()) || (window.__MOCK_API_KEY__ && String(window.__MOCK_API_KEY__).trim()) || '';
  }

  function getCloseDestination() {
    return config.DASHBOARD_URL || './dashboard.html';
  }

  function getBookJobUrl() {
    var base = config.NEW_JOB_URL || config.NEW_INQUIRY_URL || './new-inquiry.html';
    var qs = [];
    if (state.companyId) qs.push('company=' + encodeURIComponent(String(state.companyId)));
    qs.push('accountType=entity');
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + qs.join('&');
  }

  function getCompanyIdFromUrl() {
    var p = new URLSearchParams(window.location.search);
    return p.get('company') || p.get('id') || '';
  }

  function gql(query, variables, apiKey) {
    return fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Api-Key': apiKey },
      body: JSON.stringify({ query: query, variables: variables || {} }),
    })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
      .then(function (json) {
        if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'GraphQL error');
        return json.data || {};
      });
  }

  function formatDateMaybeUnix(v) {
    if (v == null || v === '') return '—';
    var n = Number(v);
    if (Number.isFinite(n)) {
      if (utils.formatDate) return utils.formatDate(n);
      return String(v);
    }
    return String(v);
  }

  function setField(id, value) {
    var el = byId(id);
    if (!el) return;
    var out = value == null || value === '' ? '—' : String(value);
    if (el.tagName === 'SELECT') {
      var nextValue = out === '—' ? '' : out;
      var hasOption = Array.prototype.some.call(el.options || [], function (opt) { return opt.value === nextValue; });
      if (!hasOption && nextValue) {
        var dynamic = document.createElement('option');
        dynamic.value = nextValue;
        dynamic.textContent = nextValue;
        el.appendChild(dynamic);
      }
      el.value = nextValue;
    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = out === '—' ? '' : out;
    else el.textContent = out;
  }

  function initEnumSelects() {
    var el = byId('cmp-account-type');
    if (!el || el.tagName !== 'SELECT') return;
    var current = el.value;
    el.innerHTML = '<option value="">—</option>';
    COMPANY_ACCOUNT_TYPE_OPTIONS.forEach(function (opt) {
      var node = document.createElement('option');
      node.value = opt;
      node.textContent = opt;
      el.appendChild(node);
    });
    if (current && Array.prototype.some.call(el.options, function (o) { return o.value === current; })) {
      el.value = current;
    }
  }

  function renderHeader() {
    var title = byId('company-detail-title');
    var back = byId('company-detail-back');
    if (title) title.textContent = state.company ? (str(state.company.name) || ('Company #' + state.companyId)) : 'Company Details';
    if (back) back.href = config.DASHBOARD_URL || './dashboard.html';
  }

  function renderOverview() {
    var c = state.company || {};
    setField('cmp-id', c.id || state.companyId || '—');
    setField('cmp-unique-id', c.unique_id || '—');
    setField('cmp-name', c.name || '—');
    setField('cmp-account-type', c.account_type || '—');
    setField('cmp-phone', c.phone || '—');
    setField('cmp-created-at', formatDateMaybeUnix(c.created_at));
    setField('cmp-popup-comment', c.popup_comment || '—');
    setField('cmp-address', c.address || '—');
    setField('cmp-city', c.city || '—');
    setField('cmp-state', c.state || '—');
    setField('cmp-postal-code', c.postal_code || '—');
  }

  function updateRelatedRows() {
    var tab = state.tab;
    if (tab === 'jobs') {
      state.relatedRows = state.relatedJobs.slice();
      return;
    }
    if (tab === 'inquiries') {
      state.relatedRows = state.relatedDeals.slice();
      return;
    }
    if (tab === 'all') {
      state.relatedRows = state.relatedJobs.concat(state.relatedDeals);
      return;
    }
    state.relatedRows = [];
  }

  function getViewUrl(row) {
    if (row.recordType === 'job') {
      var jobTpl = config.JOB_DETAIL_URL_TEMPLATE || './job-detail.html?job={id}';
      return jobTpl.replace(/\{id\}/g, String(row.id || ''));
    }
    var inquiryTpl = config.INQUIRY_DETAIL_URL_TEMPLATE || './inquiry-detail.html?inquiry={id}';
    return inquiryTpl.replace(/\{id\}/g, String(row.id || ''));
  }

  function renderRelatedTable() {
    var el = byId('company-records-table-container');
    if (!el) return;
    var rows = state.relatedRows || [];
    if (!rows.length) {
      el.innerHTML = '<div class="px-4 py-8 text-center text-slate-500 text-sm">No related records.</div>';
      return;
    }
    var html = '<table class="w-full border-collapse text-sm"><thead><tr class="border-b border-slate-200 bg-slate-50">' +
      '<th class="text-left px-4 py-3 font-semibold text-slate-700">ID</th>' +
      '<th class="text-left px-4 py-3 font-semibold text-slate-700">Name</th>' +
      '<th class="text-left px-4 py-3 font-semibold text-slate-700">Status</th>' +
      '<th class="text-left px-4 py-3 font-semibold text-slate-700">Date</th>' +
      '<th class="text-left px-4 py-3 font-semibold text-slate-700">Value</th>' +
      '<th class="text-left px-4 py-3 font-semibold text-slate-700">Type</th>' +
      '<th class="text-left px-4 py-3 font-semibold text-slate-700">Action</th>' +
      '</tr></thead><tbody>';

    rows.forEach(function (r) {
      var url = getViewUrl(r);
      html += '<tr class="border-b border-slate-100">' +
        '<td class="px-4 py-2 text-slate-700">' + esc(r.uniqueId || r.id || '—') + '</td>' +
        '<td class="px-4 py-2 text-slate-700">' + esc(r.name || '—') + '</td>' +
        '<td class="px-4 py-2 text-slate-700">' + esc(r.status || '—') + '</td>' +
        '<td class="px-4 py-2 text-slate-700">' + esc(r.date || '—') + '</td>' +
        '<td class="px-4 py-2 text-slate-700">' + esc(r.value || '—') + '</td>' +
        '<td class="px-4 py-2 text-slate-700">' + esc(r.type || '—') + '</td>' +
        '<td class="px-4 py-2"><a href="' + esc(url) + '" class="text-[#003882] hover:underline">View</a></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function bindTabs() {
    ['tab-all', 'tab-inquiries', 'tab-jobs'].forEach(function (id) {
      var btn = byId(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        ['tab-all', 'tab-inquiries', 'tab-jobs'].forEach(function (otherId) {
          var b = byId(otherId);
          if (!b) return;
          b.classList.remove('bg-white', 'border-[#003882]', 'text-[#003882]');
          b.classList.add('border-transparent', 'text-slate-600');
        });
        btn.classList.add('bg-white', 'border-[#003882]', 'text-[#003882]');
        btn.classList.remove('border-transparent', 'text-slate-600');
        state.tab = id.replace('tab-', '');
        updateRelatedRows();
        renderRelatedTable();
      });
    });
  }

  function showLoading(show) {
    var loading = byId('company-detail-loading');
    var content = byId('company-detail-content');
    if (loading) loading.classList.toggle('loading-state', !show);
    if (content) content.classList.toggle('hidden', show);
    // Guard against stale inline display values from previous script versions.
    if (loading) loading.style.display = show ? 'flex' : 'none';
    if (content) content.style.display = show ? 'none' : 'block';
  }

  function syncActionButtonsState() {
    var editBtn = byId('company-detail-edit-btn');
    var saveBtn = byId('company-detail-save-btn');
    var saveCloseBtn = byId('company-detail-save-close-btn');
    var cancelBtn = byId('company-detail-cancel-btn');
    if (editBtn) editBtn.disabled = !!state.isSaving;
    if (saveBtn) saveBtn.disabled = !state.isEditing || !!state.isSaving;
    if (saveCloseBtn) saveCloseBtn.disabled = !state.isEditing || !!state.isSaving;
    if (cancelBtn) cancelBtn.disabled = !state.isEditing || !!state.isSaving;
  }

  function setEditMode(editing) {
    state.isEditing = !!editing;
    var editBtn = byId('company-detail-edit-btn');
    var actionsEl = byId('company-detail-edit-actions');
    var indicator = byId('company-edit-mode-indicator');
    if (editBtn) editBtn.classList.toggle('hidden', state.isEditing);
    if (actionsEl) actionsEl.classList.toggle('hidden', !state.isEditing);
    if (indicator) indicator.classList.toggle('hidden', !state.isEditing);
    EDITABLE_INPUT_IDS.forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.disabled = !state.isEditing;
      } else {
        el.readOnly = !state.isEditing;
      }
      el.classList.toggle('bg-slate-50', !state.isEditing);
      el.classList.toggle('bg-white', state.isEditing);
      el.classList.toggle('ring-2', state.isEditing);
      el.classList.toggle('ring-blue-200', state.isEditing);
      el.classList.toggle('border-[#003882]', state.isEditing);
    });
    syncActionButtonsState();
    if (state.isEditing && utils.showToast) utils.showToast('Edit mode enabled');
  }

  function getEditablePayload() {
    var idsToKeys = {
      'cmp-name': 'name',
      'cmp-account-type': 'account_type',
      'cmp-phone': 'phone',
      'cmp-popup-comment': 'popup_comment',
      'cmp-address': 'address',
      'cmp-city': 'city',
      'cmp-state': 'state',
      'cmp-postal-code': 'postal_code',
    };
    var payload = {};
    Object.keys(idsToKeys).forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      payload[idsToKeys[id]] = String(el.value || '').trim();
    });
    var allowed = {};
    PAYLOAD_KEYS_ALLOWED.forEach(function (k) {
      if (payload.hasOwnProperty(k) && payload[k] !== undefined) allowed[k] = payload[k];
    });
    return allowed;
  }

  function saveCompanyViaSDK(companyId, payload) {
    var normalizedId = /^\d+$/.test(String(companyId)) ? parseInt(companyId, 10) : companyId;
    function executeUpdate(plugin) {
      var switched = plugin.switchTo(COMPANY_MODEL);
      var modelPromise = switched && typeof switched.then === 'function' ? switched : Promise.resolve(switched);
      return modelPromise.then(function (model) {
        if (!model || typeof model.mutation !== 'function') throw new Error('Company model mutation unavailable.');
        var mut = model.mutation();
        if (typeof mut.updateOne === 'function') {
          mut.updateOne(normalizedId, payload);
        } else if (typeof mut.update === 'function') {
          mut.update(function (q) { return q.where('id', normalizedId).set(payload); });
        } else {
          throw new Error('Company update method unavailable.');
        }
        return mut.execute(true).toPromise();
      });
    }

    var plugin = window.VitalSync && window.VitalSync.getPlugin && window.VitalSync.getPlugin();
    if (plugin) return executeUpdate(plugin);
    var connect = window.VitalSync && window.VitalSync.connect;
    if (!connect || typeof connect !== 'function') return Promise.reject(new Error('VitalSync not available. Connect to save.'));
    return connect().then(function () {
      plugin = window.VitalSync.getPlugin();
      if (!plugin) return Promise.reject(new Error('VitalSync not available after connect.'));
      return executeUpdate(plugin);
    });
  }

  function bindHeaderActions() {
    var editBtn = byId('company-detail-edit-btn');
    var saveBtn = byId('company-detail-save-btn');
    var saveCloseBtn = byId('company-detail-save-close-btn');
    var cancelBtn = byId('company-detail-cancel-btn');
    var bookBtn = byId('company-detail-book-job-btn');

    function performSave(closeAfterSave) {
      if (state.isSaving || !state.companyId || !state.company) return;
      state.isSaving = true;
      syncActionButtonsState();
      var payload = getEditablePayload();
      saveCompanyViaSDK(state.companyId, payload)
        .then(function () {
          state.company = Object.assign({}, state.company, payload);
          setEditMode(false);
          renderHeader();
          renderOverview();
          if (utils.showToast) utils.showToast(closeAfterSave ? 'Saved. Closing…' : 'Saved');
          if (closeAfterSave) window.location.href = getCloseDestination();
        })
        .catch(function (e) {
          var msg = e && e.message ? e.message : 'Save failed';
          if (utils.showToast) utils.showToast(msg);
          if (config.DEBUG) console.warn('[CompanyDetail] Save failed', e);
        })
        .finally(function () {
          state.isSaving = false;
          syncActionButtonsState();
        });
    }

    if (editBtn) editBtn.addEventListener('click', function () { setEditMode(true); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      setEditMode(false);
      renderHeader();
      renderOverview();
    });
    if (saveBtn) saveBtn.addEventListener('click', function () { performSave(false); });
    if (saveCloseBtn) saveCloseBtn.addEventListener('click', function () { performSave(true); });
    if (bookBtn) {
      bookBtn.addEventListener('click', function () {
        window.location.href = getBookJobUrl();
      });
    }
  }

  function loadCompanyAndRelations() {
    var apiKey = getApiKey();
    if (!apiKey) return Promise.reject(new Error('API key missing'));
    return Promise.all([
      gql(COMPANY_BY_ID_QUERY, { id: /^\d+$/.test(String(state.companyId)) ? parseInt(state.companyId, 10) : state.companyId }, apiKey)
        .then(function (data) {
          var list = data.calcCompanies || [];
          return list[0] || null;
        }),
      gql(buildJobsByCompanyQuery(state.companyId), null, apiKey)
        .then(function (data) {
          var list = data.calcJobs || [];
          return list.map(function (row) {
            return {
              id: row.ID || row.id,
              uniqueId: row.Unique_ID || row.unique_id,
              name: row.Unique_ID || row.unique_id,
              status: row.Job_Status || row.Quote_Status || '—',
              date: formatDateMaybeUnix(row.Date_Scheduled || row.Date_Booked || row.Quote_Date),
              value: row.Invoice_Total || row.Quote_Total || '—',
              type: 'Job',
              recordType: 'job',
            };
          });
        }),
      gql(buildDealsByCompanyQuery(state.companyId), null, apiKey)
        .then(function (data) {
          var list = data.calcDeals || [];
          return list.map(function (row) {
            return {
              id: row.id,
              uniqueId: row.Unique_ID || row.unique_id,
              name: row.Deal_Name || row.deal_name || '—',
              status: row.Inquiry_Status || row.Sales_Stage || '—',
              date: formatDateMaybeUnix(row.Created_At || row.created_at),
              value: row.Deal_Value || '—',
              type: 'Inquiry',
              recordType: 'inquiry',
            };
          });
        }),
    ]);
  }

  function init() {
    state.companyId = getCompanyIdFromUrl();
    if (!state.companyId) {
      window.location.replace(config.DASHBOARD_URL || './dashboard.html');
      return;
    }
    showLoading(true);
    initEnumSelects();
    bindTabs();
    bindHeaderActions();
    loadCompanyAndRelations()
      .then(function (results) {
        state.company = results[0];
        state.relatedJobs = results[1] || [];
        state.relatedDeals = results[2] || [];
        showLoading(false);
        renderHeader();
        renderOverview();
        setEditMode(false);
        updateRelatedRows();
        renderRelatedTable();
      })
      .catch(function (err) {
        showLoading(false);
        if (config.DEBUG) console.warn('[CompanyDetail] Load failed', err);
        renderHeader();
        renderOverview();
        setEditMode(false);
        var content = byId('company-detail-content');
        if (content) {
          var msg = document.createElement('div');
          msg.className = 'mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800';
          msg.textContent = 'Could not load company.';
          content.insertBefore(msg, content.firstChild);
        }
      });
  }

  window.PtpmCompanyDetail = { init: init };
})();

