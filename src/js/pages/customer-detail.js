// PTPM — Customer Detail Page
// Single-customer view: Account Overview, Contact Information, Additional Information, Related Records (tabs + table).
// Loads contact by ID from URL (?contact=). Uses direct GraphQL (see docs/vitalsync-list-pages.md).
(function () {
  'use strict';

  var config = window.AppConfig || {};
  var utils = window.PtpmUtils || window.AppUtils || {};
  var interaction = window.PtpmInteraction || {};

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(text) { return utils.escapeHtml ? utils.escapeHtml(text) : (function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; })(text); }
  function str(v) { return v == null || v === undefined ? '' : String(v).trim(); }

  var GRAPHQL_ENDPOINT = (config.API_BASE || 'https://' + (config.SLUG || 'peterpm') + '.vitalstats.app') + '/api/v1/graphql';
  var CONTACT_BY_ID_QUERY = 'query calcContacts($id: PeterpmContactID!) { calcContacts(query: [{ where: { id: $id } }]) { id: field(arg: [\"id\"]) first_name: field(arg: [\"first_name\"]) last_name: field(arg: [\"last_name\"]) email: field(arg: [\"email\"]) sms_number: field(arg: [\"sms_number\"]) office_phone: field(arg: [\"office_phone\"]) } }';

  var CONTACT_MODEL = 'PeterpmContact';

  var CALC_JOBS_FIELDS = 'ID: field(arg: [\"id\"]) Unique_ID: field(arg: [\"unique_id\"]) Quote_Date: field(arg: [\"quote_date\"]) Quote_Total: field(arg: [\"quote_total\"]) Quote_Status: field(arg: [\"quote_status\"]) Inquiry_Record_ID: field(arg: [\"Inquiry_Record\", \"id\"])';
  var CALC_DEALS_FIELDS = 'id: field(arg: [\"id\"]) Deal_Name: field(arg: [\"deal_name\"]) Sales_Stage: field(arg: [\"sales_stage\"]) Deal_Value: field(arg: [\"deal_value\"])';
  function buildCalcJobsByContactQuery(contactId) {
    var id = /^\d+$/.test(String(contactId)) ? parseInt(contactId, 10) : contactId;
    return 'query { calcJobs(query: [{ where: { client_individual_id: ' + id + ', _OPERATOR_: eq } }], limit: 200, offset: 0) { ' + CALC_JOBS_FIELDS + ' } }';
  }
  function buildCalcDealsByContactQuery(contactId) {
    var id = /^\d+$/.test(String(contactId)) ? parseInt(contactId, 10) : contactId;
    return 'query { calcDeals(query: [{ where: { primary_contact_id: ' + id + ', _OPERATOR_: eq } }], limit: 200, offset: 0) { ' + CALC_DEALS_FIELDS + ' } }';
  }

  var state = {
    contactId: null,
    contact: null,
    relatedRecordsTab: 'all',
    relatedRecords: [],
    relatedJobs: [],
    relatedDeals: [],
    isEditing: false,
    isSaving: false,
    actionsBound: false,
  };

  var EDITABLE_INPUT_IDS = ['cd-first-name', 'cd-last-name', 'cd-email', 'cd-mobile', 'cd-phone', 'cd-contact-email', 'cd-abn', 'cd-customer-status', 'cd-customer-type', 'cd-customer-source', 'cd-referred-by', 'cd-notes', 'cd-address1', 'cd-address2', 'cd-suburb', 'cd-postcode', 'cd-state', 'cd-country', 'cd-region', 'cd-area', 'cd-sub-area', 'cd-referral-source', 'cd-service-agreement', 'cd-next-service-date', 'cd-preferred-time', 'cd-customer-notes'];

  var TAB_IDS = ['tab-all', 'tab-inquiries', 'tab-engagements', 'tab-jobs', 'tab-payments', 'tab-credits', 'tab-notes'];

  function normalizeAuMobile(raw) {
    var value = String(raw || '').trim();
    if (!value) return '';
    var digits = value.replace(/[^\d+]/g, '');
    if (digits.indexOf('+61') === 0) return '+61' + digits.slice(3).replace(/\D/g, '');
    var compact = digits.replace(/\D/g, '');
    if (compact.indexOf('61') === 0) return '+61' + compact.slice(2);
    if (compact.indexOf('0') === 0) return '+61' + compact.slice(1);
    return value;
  }

  function getContactIdFromUrl() {
    var p = new URLSearchParams(window.location.search);
    return p.get('contact') || p.get('id') || '';
  }

  function fetchContactById(contactId, apiKey) {
    if (!apiKey) return Promise.resolve(null);
    return fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Api-Key': apiKey },
      body: JSON.stringify({ query: CONTACT_BY_ID_QUERY, variables: { id: /^\d+$/.test(String(contactId)) ? parseInt(contactId, 10) : contactId } }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'GraphQL error');
        var list = (json.data && json.data.calcContacts) || [];
        return Array.isArray(list) && list.length > 0 ? list[0] : null;
      });
  }

  function getApiKey() {
    return (config.API_KEY && String(config.API_KEY).trim()) || (window.__MOCK_API_KEY__ && String(window.__MOCK_API_KEY__).trim()) || '';
  }

  function normalizeContactIdForApi(contactId) {
    return /^\d+$/.test(String(contactId)) ? parseInt(contactId, 10) : contactId;
  }

  function getCloseDestination() {
    return config.CUSTOMERS_LIST_URL || config.DASHBOARD_URL || './customers-list.html';
  }

  function getBookJobUrl() {
    var base = config.NEW_JOB_URL || config.NEW_INQUIRY_URL || './new-inquiry.html';
    var qs = [];
    if (state.contactId) qs.push('contact=' + encodeURIComponent(String(state.contactId)));
    if (state.contact && state.contact.first_name) qs.push('first_name=' + encodeURIComponent(String(state.contact.first_name)));
    if (state.contact && state.contact.last_name) qs.push('last_name=' + encodeURIComponent(String(state.contact.last_name)));
    if (state.contact && state.contact.email) qs.push('email=' + encodeURIComponent(String(state.contact.email)));
    if (state.contact && state.contact.sms_number) qs.push('sms_number=' + encodeURIComponent(String(state.contact.sms_number)));
    if (state.contact && state.contact.office_phone) qs.push('office_phone=' + encodeURIComponent(String(state.contact.office_phone)));
    if (state.contact && state.contact.company_id) qs.push('company=' + encodeURIComponent(String(state.contact.company_id)));
    if (state.contact && state.contact.company_id) qs.push('accountType=entity');
    if (!qs.length) return base;
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + qs.join('&');
  }

  function fetchRelatedJobs(contactId, apiKey) {
    if (!apiKey) return Promise.resolve([]);
    return fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Api-Key': apiKey },
      body: JSON.stringify({ query: buildCalcJobsByContactQuery(contactId) }),
    })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
      .then(function (json) {
        if (json.errors && json.errors.length) return [];
        var list = (json.data && json.data.calcJobs) || [];
        return Array.isArray(list) ? list.map(function (row) {
          return {
            id: row.ID != null ? row.ID : row.id,
            uniqueId: row.Unique_ID,
            date: row.Quote_Date,
            totalDue: row.Quote_Total,
            status: row.Quote_Status,
            type: 'Job',
            recordType: 'job',
            inquiryRecordId: row.Inquiry_Record_ID,
          };
        }) : [];
      })
      .catch(function () { return []; });
  }

  function fetchRelatedDeals(contactId, apiKey) {
    if (!apiKey) return Promise.resolve([]);
    return fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Api-Key': apiKey },
      body: JSON.stringify({ query: buildCalcDealsByContactQuery(contactId) }),
    })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
      .then(function (json) {
        if (json.errors && json.errors.length) return [];
        var list = (json.data && json.data.calcDeals) || [];
        return Array.isArray(list) ? list.map(function (row) {
          return {
            id: row.id,
            dealName: row.Deal_Name,
            salesStage: row.Sales_Stage,
            dealValue: row.Deal_Value,
            date: null,
            status: row.Sales_Stage,
            type: 'Inquiry',
            recordType: 'inquiry',
          };
        }) : [];
      })
      .catch(function () { return []; });
  }

  function updateRelatedRecordsForTab() {
    var tab = state.relatedRecordsTab;
    var jobs = state.relatedJobs || [];
    var deals = state.relatedDeals || [];
    if (tab === 'all') {
      state.relatedRecords = [].concat(
        jobs.map(function (j) { return Object.assign({}, j, { source: '—', assignedTo: '—', priority: '—' }); }),
        deals.map(function (d) { return Object.assign({}, d, { source: '—', assignedTo: '—', priority: '—', totalDue: d.dealValue }); })
      );
    } else if (tab === 'jobs') {
      state.relatedRecords = jobs.map(function (j) { return Object.assign({}, j, { source: '—', assignedTo: '—', priority: '—' }); });
    } else if (tab === 'inquiries') {
      state.relatedRecords = deals.map(function (d) { return Object.assign({}, d, { source: '—', assignedTo: '—', priority: '—', totalDue: d.dealValue }); });
    } else {
      state.relatedRecords = [];
    }
  }

  function saveContactViaSDK(contactId, payload) {
    var normalizedId = /^\d+$/.test(String(contactId)) ? parseInt(contactId, 10) : contactId;
    function executeUpdate(plugin) {
      var switched = plugin.switchTo(CONTACT_MODEL);
      var modelPromise = switched && typeof switched.then === 'function' ? switched : Promise.resolve(switched);
      return modelPromise.then(function (model) {
        if (!model || typeof model.mutation !== 'function') throw new Error('Contact model mutation unavailable.');
        var mut = model.mutation();
        if (typeof mut.updateOne === 'function') {
          mut.updateOne(normalizedId, payload);
        } else if (typeof mut.update === 'function') {
          mut.update(function (q) { return q.where('id', normalizedId).set(payload); });
        } else {
          throw new Error('Contact update method unavailable.');
        }
        return mut.execute(true).toPromise();
      });
    }

    var plugin = window.VitalSync && window.VitalSync.getPlugin && window.VitalSync.getPlugin();
    if (plugin) {
      return executeUpdate(plugin);
    }
    var connect = window.VitalSync && window.VitalSync.connect;
    if (!connect || typeof connect !== 'function') {
      return Promise.reject(new Error('VitalSync not available. Connect to save.'));
    }
    return connect().then(function () {
      plugin = window.VitalSync.getPlugin();
      if (!plugin) return Promise.reject(new Error('VitalSync not available after connect.'));
      return executeUpdate(plugin);
    });
  }

  function setEditMode(editing) {
    state.isEditing = !!editing;
    var editBtn = byId('customer-detail-edit-btn');
    var actionsEl = byId('customer-detail-edit-actions');
    var indicator = byId('customer-edit-mode-indicator');
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

  function syncActionButtonsState() {
    var editBtn = byId('customer-detail-edit-btn');
    var saveBtn = byId('customer-detail-save-btn');
    var saveCloseBtn = byId('customer-detail-save-close-btn');
    var cancelBtn = byId('customer-detail-cancel-btn');
    if (editBtn) editBtn.disabled = !!state.isSaving;
    if (saveBtn) saveBtn.disabled = !state.isEditing || !!state.isSaving;
    if (saveCloseBtn) saveCloseBtn.disabled = !state.isEditing || !!state.isSaving;
    if (cancelBtn) cancelBtn.disabled = !state.isEditing || !!state.isSaving;
  }

  // Match new-customer create payload names (address1, suburb, postcode); unknown keys can cause 400.
  var PAYLOAD_KEYS_ALLOWED = ['first_name', 'last_name', 'email', 'sms_number', 'office_phone', 'address1', 'address2', 'suburb', 'postcode', 'state', 'country', 'notes'];

  function getEditablePayload() {
    var payload = {};
    var idsToKeys = {
      'cd-first-name': 'first_name', 'cd-last-name': 'last_name', 'cd-email': 'email', 'cd-mobile': 'sms_number',
      'cd-phone': 'office_phone', 'cd-address1': 'address1', 'cd-address2': 'address2',
      'cd-suburb': 'suburb', 'cd-postcode': 'postcode', 'cd-state': 'state', 'cd-country': 'country', 'cd-notes': 'notes',
      'cd-abn': 'abn', 'cd-customer-status': 'customer_status', 'cd-customer-type': 'customer_type',
      'cd-customer-source': 'customer_source', 'cd-referred-by': 'referred_by', 'cd-region': 'region', 'cd-area': 'area',
      'cd-sub-area': 'sub_area', 'cd-referral-source': 'referral_source', 'cd-service-agreement': 'service_agreement',
      'cd-next-service-date': 'next_service_date', 'cd-preferred-time': 'preferred_time', 'cd-customer-notes': 'customer_notes'
    };
    Object.keys(idsToKeys).forEach(function (id) {
      var el = byId(id);
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        var value = String(el.value || '').trim();
        if (id === 'cd-mobile') value = normalizeAuMobile(value);
        payload[idsToKeys[id]] = value;
      }
    });
    var allowed = {};
    PAYLOAD_KEYS_ALLOWED.forEach(function (k) {
      if (payload.hasOwnProperty(k)) {
        var v = payload[k];
        if (v !== '' && v !== undefined) allowed[k] = v;
      }
    });
    return allowed;
  }

  function bindEditButtons() {
    if (state.actionsBound) return;
    state.actionsBound = true;
    var editBtn = byId('customer-detail-edit-btn');
    var saveBtn = byId('customer-detail-save-btn');
    var saveCloseBtn = byId('customer-detail-save-close-btn');
    var cancelBtn = byId('customer-detail-cancel-btn');
    var bookBtn = byId('customer-detail-book-job-btn');

    function performSave(closeAfterSave) {
      if (state.isSaving) return;
      var id = state.contactId;
      var contact = state.contact;
      if (!id || !contact) return;
      var payload = getEditablePayload();
      var apiKey = getApiKey();
      if (!apiKey) {
        if (utils.showToast) utils.showToast('API key required');
        return;
      }
      state.isSaving = true;
      syncActionButtonsState();
      saveContactViaSDK(id, payload)
        .then(function () {
          state.contact = Object.assign({}, contact, payload);
          setEditMode(false);
          renderFromState();
          if (utils.showToast) utils.showToast(closeAfterSave ? 'Saved. Closing…' : 'Saved');
          if (closeAfterSave) window.location.href = getCloseDestination();
        })
        .catch(function (e) {
          var msg = (e && e.message) ? e.message : 'Save failed';
          if (utils.showToast) utils.showToast(msg);
          if (config.DEBUG) console.warn('[CustomerDetail] Save failed', e);
        })
        .finally(function () {
          state.isSaving = false;
          syncActionButtonsState();
        });
    }

    if (editBtn) editBtn.addEventListener('click', function () { setEditMode(true); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      setEditMode(false);
      renderFromState();
    });
    if (saveBtn) saveBtn.addEventListener('click', function () { performSave(false); });
    if (saveCloseBtn) saveCloseBtn.addEventListener('click', function () { performSave(true); });
    if (bookBtn) {
      bookBtn.addEventListener('click', function () {
        window.location.href = getBookJobUrl();
      });
    }
  }

  function renderFromState() {
    renderHeader();
    renderAccountOverview();
    renderContactInfo();
    renderAdditionalInfo();
    renderClientRecordsTable();
  }

  function renderHeader() {
    var back = byId('customer-detail-back');
    var title = byId('customer-detail-title');
    if (back) back.href = (config.CUSTOMERS_LIST_URL || './customers-list.html');
    if (title) title.textContent = state.contact ? (str(state.contact.first_name) + ' ' + str(state.contact.last_name)).trim() || 'Customer #' + state.contactId : 'Customer Details';
  }

  function setField(id, value) {
    var el = byId(id);
    if (!el) return;
    var v = value == null || value === undefined ? '—' : String(value).trim() || '—';
    if (el.tagName === 'SELECT') {
      var nextValue = v === '—' ? '' : v;
      var hasOption = Array.prototype.some.call(el.options || [], function (opt) { return opt.value === nextValue; });
      if (!hasOption && nextValue) {
        var dynamic = document.createElement('option');
        dynamic.value = nextValue;
        dynamic.textContent = nextValue;
        el.appendChild(dynamic);
      }
      el.value = nextValue;
    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = v === '—' ? '' : v;
    else el.textContent = v;
  }

  function renderAccountOverview() {
    var c = state.contact;
    setField('account-number', c ? '#' + state.contactId : '—');
    setField('account-property-type', '—');
    setField('cd-first-name', c ? str(c.first_name) : '');
    setField('cd-last-name', c ? str(c.last_name) : '');
    setField('cd-email', c ? str(c.email) : '');
    setField('cd-mobile', c ? str(c.sms_number) : '');
    setField('cd-abn', c ? str(c.abn) : '');
    setField('cd-customer-status', c ? str(c.customer_status) : '');
    setField('cd-customer-type', c ? str(c.customer_type) : '');
    setField('cd-customer-source', c ? str(c.customer_source) : '');
    setField('cd-created-date', '—');
    setField('cd-referred-by', c ? str(c.referred_by) : '');
    setField('cd-notes', c ? str(c.notes) : '');
  }

  function renderContactInfo() {
    var c = state.contact;
    setField('cd-address1', c ? str(c.address_1 || c.address1) : '');
    setField('cd-address2', c ? str(c.address_2 || c.address2) : '');
    setField('cd-suburb', c ? str(c.city || c.suburb) : '');
    setField('cd-postcode', c ? str(c.postal_code || c.postcode) : '');
    setField('cd-state', c ? str(c.state) : '');
    setField('cd-country', c ? str(c.country) : '');
    setField('cd-phone', c ? str(c.office_phone) : '');
    setField('cd-contact-email', c ? str(c.email) : '');
  }

  function renderAdditionalInfo() {
    var c = state.contact;
    setField('cd-region', c ? str(c.region) : '');
    setField('cd-area', c ? str(c.area) : '');
    setField('cd-sub-area', c ? str(c.sub_area) : '');
    setField('cd-referral-source', c ? str(c.referral_source) : '');
    setField('cd-service-agreement', c ? str(c.service_agreement) : '');
    setField('cd-next-service-date', c ? str(c.next_service_date) : '');
    setField('cd-preferred-time', c ? str(c.preferred_time) : '');
    setField('cd-customer-notes', c ? str(c.customer_notes) : '');
    updateInquiryEngagementCounts();
  }

  function updateInquiryEngagementCounts() {
    var inqTag = byId('cd-inquiries-tag');
    var engTag = byId('cd-engagements-tag');
    var inqCount = (state.relatedDeals && state.relatedDeals.length) || 0;
    if (inqTag) inqTag.textContent = 'Inquiries (' + inqCount + ')';
    if (engTag) engTag.textContent = 'Engagements (0)';
  }

  function getViewUrl(record) {
    var t = (config.JOB_DETAIL_URL_TEMPLATE || 'job-detail.html?job={id}').replace('{id}', String(record.id || ''));
    var i = (config.INQUIRY_DETAIL_URL_TEMPLATE || 'inquiry-detail.html?inquiry={id}').replace('{id}', String(record.id || ''));
    return record.recordType === 'job' ? t : i;
  }

  function renderClientRecordsTable() {
    var container = byId('client-records-table-container');
    if (!container) return;
    var tab = state.relatedRecordsTab;
    if (tab === 'payments' || tab === 'credits' || tab === 'notes' || tab === 'engagements') {
      container.innerHTML = interaction.emptyState
        ? interaction.emptyState('No records for this tab.')
        : '<div class="px-4 py-8 text-center text-slate-500 text-sm">No records for this tab.</div>';
      return;
    }
    var rows = state.relatedRecords || [];
    if (rows.length === 0) {
      container.innerHTML = interaction.emptyState
        ? interaction.emptyState('No records for this tab.')
        : '<div class="px-4 py-8 text-center text-slate-500 text-sm">No records for this tab.</div>';
      return;
    }
    var headers = ['ID', 'Date', 'Priority', 'Status', 'Source', 'Type', 'Assigned To', 'Total Due', 'Actions'];
    var html = '<table class="w-full border-collapse text-sm"><thead><tr class="border-b border-slate-200 bg-slate-50">';
    headers.forEach(function (h) { html += '<th class="text-left px-4 py-3 font-semibold text-slate-700">' + escapeHtml(h) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var viewUrl = getViewUrl(r);
      html += '<tr class="border-b border-slate-100">';
      html += '<td class="px-4 py-2"><a href="' + escapeHtml(viewUrl) + '" class="text-[#003882] font-medium hover:underline">' + escapeHtml(String(r.uniqueId || r.id || '')) + '</a></td>';
      html += '<td class="px-4 py-2 text-slate-600">' + escapeHtml(r.date || '—') + '</td>';
      html += '<td class="px-4 py-2 text-slate-600">' + escapeHtml(r.priority || '—') + '</td>';
      html += '<td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">' + escapeHtml(r.status || '—') + '</span></td>';
      html += '<td class="px-4 py-2 text-slate-600">' + escapeHtml(r.source || '—') + '</td>';
      html += '<td class="px-4 py-2 text-slate-600">' + escapeHtml(r.type || '—') + '</td>';
      html += '<td class="px-4 py-2 text-slate-600">' + escapeHtml(r.assignedTo || '—') + '</td>';
      html += '<td class="px-4 py-2 text-slate-600">' + escapeHtml(r.totalDue != null ? String(r.totalDue) : '—') + '</td>';
      html += '<td class="px-4 py-2"><div class="flex items-center gap-1"><a href="' + escapeHtml(viewUrl) + '" class="p-1.5 text-slate-500 hover:text-[#003882]" title="View">View</a></div></td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function bindTabs() {
    TAB_IDS.forEach(function (id) {
      var btn = byId(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        TAB_IDS.forEach(function (tid) {
          var b = byId(tid);
          if (b) b.classList.remove('bg-white', 'border-[#003882]', 'text-[#003882]');
          if (b) b.classList.add('border-transparent', 'text-slate-600');
        });
        btn.classList.add('bg-white', 'border-[#003882]', 'text-[#003882]');
        btn.classList.remove('border-transparent', 'text-slate-600');
        state.relatedRecordsTab = id.replace('tab-', '');
        updateRelatedRecordsForTab();
        renderClientRecordsTable();
      });
    });
  }

  function showLoading(show) {
    var main = document.querySelector('[data-page="customer-detail"]');
    if (!main) return;
    var loader = byId('customer-detail-loading');
    var content = byId('customer-detail-content');
    if (loader) loader.classList.toggle('loading-state', !show);
    if (content) content.classList.toggle('hidden', show);
    // Guard against stale inline display values from previous script versions.
    if (loader) loader.style.display = show ? 'flex' : 'none';
    if (content) content.style.display = show ? 'none' : 'block';
  }

  function init() {
    state.contactId = getContactIdFromUrl();
    if (!state.contactId) {
      window.location.replace(config.CUSTOMERS_LIST_URL || './customers-list.html');
      return;
    }

    if (window.VitalSync && typeof window.VitalSync.connect === 'function') {
      window.VitalSync.connect().catch(function (err) {
        if (config.DEBUG) console.warn('[CustomerDetail] VitalSync connect failed', err);
      });
    }

    bindTabs();
    bindEditButtons();
    showLoading(true);
    var apiKey = (config.API_KEY && String(config.API_KEY).trim()) || (window.__MOCK_API_KEY__ && String(window.__MOCK_API_KEY__).trim());
    fetchContactById(state.contactId, apiKey)
      .then(function (contact) {
        state.contact = contact;
        showLoading(false);
        renderFromState();
        setEditMode(false);
        state.relatedJobs = [];
        state.relatedDeals = [];
        Promise.all([fetchRelatedJobs(state.contactId, apiKey), fetchRelatedDeals(state.contactId, apiKey)])
          .then(function (results) {
            state.relatedJobs = results[0] || [];
            state.relatedDeals = results[1] || [];
            updateRelatedRecordsForTab();
            renderClientRecordsTable();
            updateInquiryEngagementCounts();
          });
      })
      .catch(function (err) {
        showLoading(false);
        if (config.DEBUG) console.warn('[CustomerDetail] Load failed:', err);
        state.contact = null;
        state.relatedJobs = [];
        state.relatedDeals = [];
        renderFromState();
        setEditMode(false);
        var content = byId('customer-detail-content');
        if (content) {
          var msg = document.createElement('div');
          msg.className = 'mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800';
          msg.textContent = 'Could not load customer.';
          content.insertBefore(msg, content.firstChild);
        }
      });
  }

  window.initCustomerDetailAutocomplete = function () {
    var input = byId('cd-address-search');
    if (!input || !window.google || !window.google.maps || !window.google.maps.places) return;
    var autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'au' },
    });
    autocomplete.addListener('place_changed', function () {
      var place = autocomplete.getPlace();
      if (!place || !place.address_components) return;
      var mapping = { street_number: '', route: '', subpremise: '', locality: '', administrative_area_level_1: '', postal_code: '', country: '' };
      place.address_components.forEach(function (comp) {
        comp.types.forEach(function (type) {
          if (mapping.hasOwnProperty(type)) mapping[type] = comp.long_name || comp.short_name || '';
        });
      });
      var addr1 = [mapping.street_number, mapping.route].filter(Boolean).join(' ');
      var addr2 = mapping.subpremise || '';
      var stateComp = place.address_components.find(function (c) { return c.types.indexOf('administrative_area_level_1') >= 0; });
      var stateVal = stateComp ? stateComp.short_name : '';
      var countryComp = place.address_components.find(function (c) { return c.types.indexOf('country') >= 0; });
      var countryVal = countryComp ? countryComp.long_name : mapping.country;
      setField('cd-address1', addr1);
      setField('cd-address2', addr2);
      setField('cd-suburb', mapping.locality);
      setField('cd-postcode', mapping.postal_code);
      setField('cd-state', stateVal);
      setField('cd-country', countryVal);
    });
  };

  window.PtpmCustomerDetail = { init: init };
})();
