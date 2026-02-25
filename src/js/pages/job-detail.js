// PTPM — Job Detail Page
// Multi-step job form: Job Info → Activities → Materials → Uploads → Invoice
// Exposes window.PtpmJobDetail with init() and getState().
(function () {
  'use strict';

  var U = window.PtpmUtils;
  var VS = window.VitalSync;
  var config = window.AppConfig || {};

  // ── State ──────────────────────────────────────────────────
  var state = {
    models: {},
    jobId: '',
    contacts: [],
    companies: [],
    serviceProviders: [],
    properties: [],
    inquiries: [],
    jobs: [],
    services: [],
    activities: [],
    materials: [],
    uploads: [],
    appointment: null,
    activeContactType: 'individual',
    sectionOrder: ['job-information', 'add-activities', 'add-materials', 'uploads', 'invoice'],
    currentSectionIdx: 0,
    sidebarCollapsed: true,
    editingActivityId: null,
    editingMaterialId: null,
    activityRecordsById: {},
    materialRecordsById: {},
    loaderEl: null,
    loaderMsgEl: null,
    loaderCount: { count: 0 },
    statusModal: null,
    previewModal: null,
    latestAction: null,
  };

  // ── Option Data ────────────────────────────────────────────
  var STATE_OPTIONS = [
    { value: 'NSW', text: 'New South Wales' },
    { value: 'QLD', text: 'Queensland' },
    { value: 'VIC', text: 'Victoria' },
    { value: 'TAS', text: 'Tasmania' },
    { value: 'SA', text: 'South Australia' },
    { value: 'ACT', text: 'Australian Capital Territory' },
    { value: 'NT', text: 'Northern Territory' },
    { value: 'WA', text: 'Western Australia' },
  ];

  var BUILDING_FEATURES = [
    { value: '713', text: 'Brick' },
    { value: '712', text: 'Concrete' },
    { value: '711', text: 'Flat Roof' },
    { value: '710', text: 'Highset' },
    { value: '709', text: 'Iron Roof' },
    { value: '708', text: 'Lowset' },
    { value: '707', text: 'PostWar' },
    { value: '706', text: 'Queenslander' },
    { value: '705', text: 'Raked Ceiling' },
    { value: '704', text: 'Sloping Block' },
    { value: '703', text: 'Super 6 / Fibro roof' },
    { value: '702', text: 'Tile Roof' },
    { value: '701', text: 'Town house' },
    { value: '700', text: 'Unit Block' },
    { value: '699', text: 'Warehouse' },
    { value: '698', text: 'Wood' },
    { value: '697', text: 'Wood & Brick' },
  ];

  var ACTIVITY_STATUSES = ['Quoted', 'To Be Scheduled', 'Reschedule', 'Scheduled', 'Completed', 'Cancelled'];
  var MATERIAL_STATUSES = ['New', 'In Progress', 'Pending Payment', 'Assigned to Job', 'Paid'];
  var TRANSACTION_TYPES = ['Reimburse', 'Deduct'];
  var TAX_TYPES = ['Exemptexpenses', 'Input'];
  var APPOINTMENT_STATUSES = ['New', 'To Be Scheduled', 'Scheduled', 'Completed', 'Cancelled'];
  var APPOINTMENT_TYPES = ['Inquiry', 'Job'];

  // ── Helpers ────────────────────────────────────────────────
  var $ = U.$;
  var $$ = U.$$;
  var byId = U.byId;

  function getModel(name) {
    if (state.models[name]) return Promise.resolve(state.models[name]);
    return VS.waitForPlugin().then(function (plugin) {
      state.models[name] = plugin.switchTo(name);
      return state.models[name];
    });
  }

  function unwrap(resp) {
    if (!resp) return [];
    if (Array.isArray(resp.resp)) return resp.resp;
    if (Array.isArray(resp)) return resp;
    return resp.resp ? [resp.resp] : [];
  }

  function unwrapOne(resp) {
    var arr = unwrap(resp);
    return arr[0] || null;
  }

  function extractId(result, typeKey) {
    if (!result) return '';
    var managed = result.managedObjects || result.resp?.managedObjects;
    if (managed && typeKey) {
      var keys = Object.keys(managed[typeKey] || {});
      if (keys.length) return keys[0];
    }
    return result.resp?.id || result.id || '';
  }

  function startLoading(msg) {
    U.showLoader(state.loaderEl, state.loaderMsgEl, state.loaderCount, msg || 'Processing...');
  }

  function stopLoading() {
    U.hideLoader(state.loaderEl, state.loaderCount, true);
  }

  function actionBadgeClass(status) {
    var s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'success' || s === 'ok') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s === 'failed' || s === 'error') return 'bg-red-100 text-red-700 border-red-200';
    if (s === 'queued' || s === 'processing' || s === 'running') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }

  function renderLatestActionBanner() {
    var action = state.latestAction || null;
    var banner = byId('job-latest-action-banner');
    if (!banner) return;
    if (!action || (!action.status && !action.message && !action.type)) {
      banner.classList.add('hidden');
      return;
    }
    banner.classList.remove('hidden');
    var statusEl = byId('job-latest-action-status');
    var typeEl = byId('job-latest-action-type');
    var msgEl = byId('job-latest-action-message');
    var srcEl = byId('job-latest-action-source');
    var atEl = byId('job-latest-action-at');
    if (statusEl) {
      statusEl.className = 'inline-flex items-center px-2 py-0.5 rounded border ' + actionBadgeClass(action.status);
      statusEl.textContent = action.status || 'processing';
    }
    if (typeEl) typeEl.textContent = action.type || '—';
    if (msgEl) msgEl.textContent = action.message || 'Awaiting action updates.';
    if (srcEl) srcEl.textContent = action.source || 'job-detail';
    if (atEl) atEl.textContent = action.at || '—';
  }

  function setLatestAction(status, type, message, source, at) {
    state.latestAction = {
      status: status || 'processing',
      type: type || 'job.action',
      message: message || '',
      source: source || 'job-detail',
      at: at || (window.dayjs ? window.dayjs().format('YYYY-MM-DD HH:mm') : new Date().toISOString()),
    };
    renderLatestActionBanner();
  }

  function hydrateLatestActionFromRecord(record) {
    if (!record) return;
    var status = record.last_action_status || record.PTPM_Last_Action_Status;
    var message = record.last_action_message || record.PTPM_Last_Action_Message;
    var type = record.last_action_type || record.PTPM_Last_Action_Type;
    var source = record.last_action_source || record.PTPM_Last_Action_Source;
    var at = record.last_action_at || record.PTPM_Last_Action_At;
    if (status || message || type || source || at) {
      setLatestAction(status || 'processing', type || 'job.action', message || '', source || 'job-detail', at || null);
    }
  }

  function showSuccess(msg, type) {
    U.showToast(msg || 'Success', 'success');
    setLatestAction('completed', type || 'job.action', msg || 'Success', 'job-detail');
  }

  function showError(msg, type) {
    U.showToast(msg || 'An error occurred.', 'error');
    setLatestAction('failed', type || 'job.action', msg || 'An error occurred.', 'job-detail');
  }

  function newActionRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'ptpm-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
  }

  function dispatchWorkflowAction(actionType, payload) {
    var webhook = config.N8N_ACTION_WEBHOOK_URL || '';
    var timeoutMs = Number(config.N8N_ACTION_WEBHOOK_TIMEOUT_MS || 20000);
    var contractVersion = config.N8N_ACTION_CONTRACT_VERSION || 'ptpm.action.v1';
    var requestId = newActionRequestId();
    if (!webhook) return Promise.resolve({ ok: true, status: 'queued', requestId: requestId, message: 'Webhook not configured yet' });
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, timeoutMs);
    var headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-PTPM-Request-Id': requestId,
      'X-PTPM-Contract-Version': contractVersion,
    };
    if (config.N8N_ACTION_WEBHOOK_TOKEN) headers.Authorization = 'Bearer ' + config.N8N_ACTION_WEBHOOK_TOKEN;
    return fetch(webhook, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        requestId: requestId,
        contractVersion: contractVersion,
        source: 'job-detail',
        actionType: actionType,
        jobId: state.jobId ? Number(state.jobId) : null,
        payload: payload || {},
        sentAt: new Date().toISOString(),
      }),
      signal: controller ? controller.signal : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (json) {
        if (!res.ok) throw new Error((json && json.message) || ('Webhook HTTP ' + res.status));
        return json || { ok: true, status: 'dispatched', requestId: requestId };
      });
    }).finally(function () { clearTimeout(timer); });
  }

  function syncWorkflowStatus(actionType, payload, queuedMessage) {
    setLatestAction('queued', actionType, queuedMessage || 'Syncing workflow status...', 'job-detail');
    dispatchWorkflowAction(actionType, payload || {})
      .then(function (resp) {
        setLatestAction(
          (resp && resp.status) || 'completed',
          actionType,
          (resp && resp.message) || 'Workflow action dispatched',
          'job-detail'
        );
      })
      .catch(function (err) {
        setLatestAction(
          'failed',
          actionType,
          err && err.message ? err.message : 'Workflow action failed',
          'job-detail'
        );
      });
  }

  function dateToUnix(val) {
    if (!val) return '';
    var d = window.dayjs ? window.dayjs(val, 'DD/MM/YYYY') : null;
    return d && d.isValid() ? d.unix() : '';
  }

  function formatDateInput(val) {
    if (!val) return '';
    var d = window.dayjs ? window.dayjs.unix(Number(val)) : null;
    return d && d.isValid() ? d.format('DD/MM/YYYY') : '';
  }

  function populateSelect(el, items, placeholder) {
    if (!el) return;
    el.innerHTML = '';
    var ph = document.createElement('option');
    ph.disabled = true;
    ph.selected = true;
    ph.value = '';
    ph.textContent = placeholder || 'Select';
    el.appendChild(ph);
    (items || []).forEach(function (item) {
      var opt = document.createElement('option');
      if (typeof item === 'string') { opt.value = item; opt.textContent = item; }
      else { opt.value = item.value || item.id || ''; opt.textContent = item.text || item.name || ''; }
      el.appendChild(opt);
    });
  }

  function getFieldValues(root, selector) {
    var result = {};
    var fields = (root || document).querySelectorAll(selector || '[data-field]');
    fields.forEach(function (el) {
      var key = el.getAttribute('data-field');
      if (!key) return;
      var type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'checkbox') result[key] = el.checked;
      else result[key] = (el.value || '').trim();
    });
    return result;
  }

  function clearFields(root, selector) {
    var fields = (root || document).querySelectorAll(selector || 'input, select, textarea');
    fields.forEach(function (el) {
      var type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') el.checked = false;
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
  }

  // ── Model Layer ────────────────────────────────────────────

  function fetchAll(modelName, fields, includes) {
    return getModel(modelName).then(function (model) {
      var q = model.query().deSelectAll().select(fields || ['id']).noDestroy();
      if (includes) includes(q);
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrap);
    });
  }

  function fetchById(modelName, id, fields, includes) {
    return getModel(modelName).then(function (model) {
      var q = model.query().where('id', id).deSelectAll().select(fields || ['id']).noDestroy();
      if (includes) includes(q);
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrapOne);
    });
  }

  function createRecord(modelName, data) {
    return getModel(modelName).then(function (model) {
      var q = model.mutation();
      q.createOne(data);
      return q.execute(true).toPromise();
    });
  }

  function updateRecord(modelName, id, data) {
    return getModel(modelName).then(function (model) {
      var q = model.mutation();
      q.update(function (sub) { sub.where('id', id).set(data); });
      return q.execute(true).toPromise();
    });
  }

  function deleteRecord(modelName, id) {
    return getModel(modelName).then(function (model) {
      var q = model.mutation();
      q.delete(function (sub) { sub.where('id', id); });
      return q.execute(true).toPromise();
    });
  }

  // Specific fetchers
  function fetchContacts() {
    return fetchAll('PeterpmContact', ['first_name', 'last_name', 'email', 'id', 'sms_number', 'profile_image']).then(function (data) {
      state.contacts = data;
      return data;
    });
  }

  function fetchServiceProviders() {
    return getModel('PeterpmServiceProvider').then(function (model) {
      var q = model.query().deSelectAll().select(['status', 'id'])
        .include('Contact_Information', function (cq) {
          cq.deSelectAll().select(['first_name', 'last_name', 'sms_number', 'profile_image', 'id']);
        }).noDestroy();
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrap);
    }).then(function (data) {
      state.serviceProviders = data;
      return data;
    });
  }

  function fetchProperties() {
    return fetchAll('PeterpmProperty', ['id', 'property_name']).then(function (data) {
      state.properties = data;
      return data;
    });
  }

  function fetchInquiries() {
    return fetchAll('PeterpmDeal', ['id', 'deal_name']).then(function (data) {
      state.inquiries = data;
      return data;
    });
  }

  function fetchJobs() {
    return getModel('PeterpmJob').then(function (model) {
      var q = model.query().deSelectAll().select(['id', 'unique_id'])
        .include('Property', function (pq) { pq.deSelectAll().select(['property_name']); })
        .noDestroy();
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrap);
    }).then(function (data) {
      state.jobs = data;
      return data;
    });
  }

  function fetchCompanies() {
    return getModel('PeterpmCompany').then(function (model) {
      var q = model.query().deSelectAll().select(['id', 'account_type', 'name'])
        .include('Primary_Person', function (pq) {
          pq.deSelectAll().select(['id', 'first_name', 'last_name', 'email', 'sms_number']);
        }).noDestroy();
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrap);
    }).then(function (data) {
      state.companies = data;
      return data;
    });
  }

  function fetchServices() {
    return fetchAll('PeterpmService', ['id', 'service_name', 'description', 'service_price', 'standard_warranty', 'primary_service_id', 'service_type']).then(function (data) {
      state.services = data;
      return data;
    });
  }

  function fetchActivities(jobId) {
    if (!jobId) return Promise.resolve([]);
    return getModel('PeterpmActivity').then(function (model) {
      var q = model.query().where('job_id', jobId).deSelectAll()
        .select(['id', 'service_id', 'task', 'option', 'quantity', 'activity_price', 'activity_text', 'activity_status', 'date_required', 'quoted_price', 'quoted_text', 'note', 'include_in_quote_subtotal', 'include_in_quote', 'invoice_to_client'])
        .include('Service', function (sq) { sq.deSelectAll().select(['id', 'service_name']); })
        .noDestroy();
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrap);
    }).then(function (data) {
      state.activities = data;
      state.activityRecordsById = {};
      data.forEach(function (r) { state.activityRecordsById[r.ID || r.id] = r; });
      return data;
    });
  }

  function fetchMaterials(jobId) {
    if (!jobId) return Promise.resolve([]);
    return getModel('PeterpmMaterial').then(function (model) {
      var q = model.query().where('job_id', jobId).deSelectAll()
        .select(['id', 'material_name', 'status', 'total', 'tax', 'description', 'created_at', 'transaction_type', 'service_provider_id'])
        .include('Service_Provider', function (spq) {
          spq.deSelectAll().select(['id']).include('Contact_Information', function (cq) {
            cq.deSelectAll().select(['first_name', 'last_name']);
          });
        }).noDestroy();
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrap);
    }).then(function (data) {
      state.materials = data;
      state.materialRecordsById = {};
      data.forEach(function (r) { state.materialRecordsById[r.ID || r.id] = r; });
      return data;
    });
  }

  function fetchUploads(jobId) {
    if (!jobId) return Promise.resolve([]);
    return getModel('PeterpmUpload').then(function (model) {
      var q = model.query().where('job_id', jobId).deSelectAll()
        .select(['id', 'photo_upload', 'type', 'created_at', 'photo_name', 'file_name']).noDestroy();
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrap);
    }).then(function (data) {
      state.uploads = data;
      return data;
    });
  }

  function fetchJobDetail(jobId) {
    if (!jobId) return Promise.resolve(null);
    return getModel('PeterpmJob').then(function (model) {
      var q = model.query().where('id', jobId).deSelectAll()
        .select([
          'id', 'unique_id', 'job_status', 'date_started', 'date_booked', 'date_job_required_by',
          'payment_status', 'job_total', 'account_type', 'priority', 'invoice_total', 'invoice_number',
          'xero_invoice_status', 'invoice_date', 'due_date',
          'PTPM_Last_Action_Status', 'PTPM_Last_Action_Message', 'PTPM_Last_Action_Type', 'PTPM_Last_Action_At', 'PTPM_Last_Action_Source',
        ])
        .include('Property', function (pq) { pq.deSelectAll().select(['id', 'property_name', 'address_1']); })
        .include('Client_Individual', function (cq) { cq.deSelectAll().select(['id', 'first_name', 'last_name', 'email']); })
        .include('Client_Entity', function (eq) { eq.select(['name', 'id']); })
        .include('Primary_Service_Provider', function (spq) {
          spq.deSelectAll().select(['id']).include('Contact_Information', function (cq) {
            cq.deSelectAll().select(['first_name', 'last_name', 'sms_number']);
          });
        }).noDestroy();
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrapOne);
    }).then(function (job) {
      hydrateLatestActionFromRecord(job);
      return job;
    });
  }

  function fetchAppointment(jobId) {
    if (!jobId) return Promise.resolve(null);
    return getModel('PeterpmAppointment').then(function (model) {
      var q = model.query().where('job_id', jobId).deSelectAll()
        .select(['status', 'title', 'start_time', 'end_time', 'description', 'inquiry_id', 'job_id', 'location_id', 'host_id', 'type'])
        .include('Location', function (lq) { lq.select(['id', 'property_name']); })
        .include('Job', function (jq) { jq.select(['job_status']); })
        .include('Host', function (hq) {
          hq.include('Contact_Information', function (cq) { cq.select(['id', 'first_name', 'last_name']); });
        })
        .include('Primary_Guest', function (gq) { gq.select(['id', 'first_name', 'last_name']); })
        .noDestroy();
      q.getOrInitQueryCalc && q.getOrInitQueryCalc();
      return q.fetchDirect().toPromise().then(unwrapOne);
    }).then(function (data) {
      state.appointment = data;
      return data;
    });
  }

  // CRUD shortcuts
  function createActivity(data) {
    if (data.service_id) {
      data.Service = { id: data.service_id };
      delete data.service_id;
    } else if (data.service_name) {
      data.Service = { service_name: data.service_name };
      delete data.service_name;
    }
    return createRecord('PeterpmActivity', data);
  }

  // ── View: Section Navigation ───────────────────────────────

  function showSection(sectionId) {
    state.sectionOrder.forEach(function (id) {
      var wrappers = $$('[data-section="' + id + '"]');
      wrappers.forEach(function (el) {
        if (el.id === 'replaceable-section') return;
        el.classList.toggle('hidden', id !== sectionId);
      });
    });
    state.currentSectionIdx = state.sectionOrder.indexOf(sectionId);
    updateSidebar(sectionId);
    updateNavButtons();
    var label = $('[data-current-section-label]');
    if (label) label.textContent = '- ' + getSectionName(sectionId);
  }

  function getSectionName(id) {
    var names = { 'job-information': 'Job Information', 'add-activities': 'Add Activities', 'add-materials': 'Materials', 'uploads': 'Uploads', 'invoice': 'Invoice' };
    return names[id] || id;
  }

  function updateSidebar(activeId) {
    state.sectionOrder.forEach(function (id, idx) {
      var icon = $('[data-section-icon="' + id + '"]');
      var connector = $('[data-section-connector-after="' + id + '"]');
      if (!icon) return;
      var isActive = id === activeId;
      var isPast = idx < state.currentSectionIdx;
      icon.classList.toggle('bg-sky-100', isActive);
      icon.classList.toggle('bg-neutral-100', !isActive);
      icon.classList.toggle('text-sky-700', isActive);
      icon.classList.toggle('text-neutral-400', !isActive && !isPast);
      icon.classList.toggle('text-green-600', isPast);
      if (connector) {
        var line = connector.querySelector('div');
        if (line) {
          line.classList.toggle('border-sky-300', isActive || isPast);
          line.classList.toggle('border-neutral-200', !isActive && !isPast);
        }
      }
    });
  }

  function updateNavButtons() {
    var idx = state.currentSectionIdx;
    var backBtn = $('[data-nav-action="back"]');
    var nextBtn = $('[data-nav-action="next"]');
    var backLabel = $('[data-nav-back-label]');
    var nextLabel = $('[data-nav-next-label]');
    if (backBtn) backBtn.classList.toggle('hidden', idx === 0);
    if (nextBtn) {
      var isLast = idx === state.sectionOrder.length - 1;
      if (nextLabel) nextLabel.textContent = isLast ? 'Submit' : 'Next: ' + getSectionName(state.sectionOrder[idx + 1]);
    }
    if (backLabel && idx > 0) backLabel.textContent = getSectionName(state.sectionOrder[idx - 1]);
  }

  function goNext() {
    if (state.currentSectionIdx < state.sectionOrder.length - 1) {
      showSection(state.sectionOrder[state.currentSectionIdx + 1]);
    }
  }

  function goBack() {
    if (state.currentSectionIdx > 0) {
      showSection(state.sectionOrder[state.currentSectionIdx - 1]);
    }
  }

  // ── View: Contact Search ───────────────────────────────────

  function setupContactSearch() {
    var input = $('[data-field="client"]');
    var hiddenId = $('[data-field="client_id"]');
    var results = $('[data-search-root="contact-individual"] [data-search-results]');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.toLowerCase().trim();
      if (!results) return;
      if (q.length < 2) { results.classList.add('hidden'); return; }
      var matches = state.contacts.filter(function (c) {
        var name = ((c.First_Name || c.first_name || '') + ' ' + (c.Last_Name || c.last_name || '')).toLowerCase();
        var email = (c.Email || c.email || '').toLowerCase();
        return name.indexOf(q) !== -1 || email.indexOf(q) !== -1;
      }).slice(0, 10);
      results.innerHTML = '';
      matches.forEach(function (c) {
        var id = c.Contact_ID || c.id || c.ID;
        var name = (c.First_Name || c.first_name || '') + ' ' + (c.Last_Name || c.last_name || '');
        var div = document.createElement('div');
        div.className = 'px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700';
        div.textContent = name.trim() + (c.Email || c.email ? ' (' + (c.Email || c.email) + ')' : '');
        div.addEventListener('click', function () {
          input.value = name.trim();
          if (hiddenId) hiddenId.value = id;
          results.classList.add('hidden');
        });
        results.appendChild(div);
      });
      results.classList.remove('hidden');
    });
    document.addEventListener('click', function (e) {
      if (results && !input.contains(e.target) && !results.contains(e.target)) results.classList.add('hidden');
    });
  }

  function setupCompanySearch() {
    var input = $('[data-field="entity_name"]');
    var hiddenId = $('[data-field="company_id"]');
    var results = $('[data-search-root="contact-entity"] [data-search-results]');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.toLowerCase().trim();
      if (!results) return;
      if (q.length < 2) { results.classList.add('hidden'); return; }
      var matches = state.companies.filter(function (c) {
        return (c.Name || c.name || '').toLowerCase().indexOf(q) !== -1;
      }).slice(0, 10);
      results.innerHTML = '';
      matches.forEach(function (c) {
        var id = c.ID || c.id;
        var name = c.Name || c.name || '';
        var div = document.createElement('div');
        div.className = 'px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700';
        div.textContent = name;
        div.addEventListener('click', function () {
          input.value = name;
          if (hiddenId) hiddenId.value = id;
          results.classList.add('hidden');
        });
        results.appendChild(div);
      });
      results.classList.remove('hidden');
    });
  }

  function setupServiceProviderSearch() {
    var input = $('[data-field="serviceman"]');
    var hiddenId = $('[data-field="serviceman_id"]');
    var results = $('[data-search-root="service-provider"] [data-search-results]');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.toLowerCase().trim();
      if (!results) return;
      if (q.length < 1) { results.classList.add('hidden'); return; }
      var matches = state.serviceProviders.filter(function (sp) {
        var ci = sp.Contact_Information || {};
        var name = ((ci.first_name || '') + ' ' + (ci.last_name || '')).toLowerCase();
        return name.indexOf(q) !== -1;
      }).slice(0, 10);
      results.innerHTML = '';
      matches.forEach(function (sp) {
        var ci = sp.Contact_Information || {};
        var name = ((ci.first_name || '') + ' ' + (ci.last_name || '')).trim();
        var id = sp.ID || sp.id;
        var div = document.createElement('div');
        div.className = 'px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700';
        div.textContent = name;
        div.addEventListener('click', function () {
          input.value = name;
          if (hiddenId) hiddenId.value = id;
          results.classList.add('hidden');
        });
        results.appendChild(div);
      });
      results.classList.remove('hidden');
    });
  }

  function setupPropertySearch() {
    var input = $('[data-field="properties"]');
    var hiddenId = $('[data-field="property_id"]');
    var results = $('[data-search-root="property"] [data-search-results]');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.toLowerCase().trim();
      if (!results) return;
      if (q.length < 2) { results.classList.add('hidden'); return; }
      var matches = state.properties.filter(function (p) {
        return (p.Property_Name || p.property_name || '').toLowerCase().indexOf(q) !== -1;
      }).slice(0, 10);
      results.innerHTML = '';
      matches.forEach(function (p) {
        var name = p.Property_Name || p.property_name || '';
        var id = p.ID || p.id;
        var div = document.createElement('div');
        div.className = 'px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700';
        div.textContent = name;
        div.addEventListener('click', function () {
          input.value = name;
          if (hiddenId) hiddenId.value = id;
          results.classList.add('hidden');
        });
        results.appendChild(div);
      });
      // Add "Add New Property" option
      var addDiv = document.createElement('div');
      addDiv.className = 'px-3 py-2 hover:bg-sky-50 cursor-pointer text-sm text-sky-700 border-t border-slate-200 font-medium';
      addDiv.textContent = '+ Add New Property';
      addDiv.addEventListener('click', function () {
        results.classList.add('hidden');
        toggleModal('jobAddPropertyModal');
      });
      results.appendChild(addDiv);
      results.classList.remove('hidden');
    });
  }

  // ── View: Contact Type Toggle ──────────────────────────────

  function setupContactTypeToggle() {
    var toggles = $$('[data-contact-toggle]');
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-contact-toggle');
        state.activeContactType = type;
        toggles.forEach(function (b) {
          var isActive = b.getAttribute('data-contact-toggle') === type;
          b.classList.toggle('bg-white', isActive);
          b.classList.toggle('text-[#003882]', isActive);
          b.classList.toggle('font-semibold', isActive);
          b.classList.toggle('text-slate-500', !isActive);
        });
        var indSection = $('[data-client-section="individual"]');
        var entSection = $('[data-client-section="entity"]');
        if (indSection) indSection.classList.toggle('hidden', type !== 'individual');
        if (entSection) entSection.classList.toggle('hidden', type !== 'entity');
      });
    });
  }

  // ── View: Job Info Tabs (Overview / Appointments) ──────────

  function setupJobInfoTabs() {
    var tabs = $$('[data-tab]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-tab');
        tabs.forEach(function (t) {
          var isActive = t.getAttribute('data-tab') === target;
          t.classList.toggle('border-[#003882]', isActive);
          t.classList.toggle('text-[#003882]', isActive);
          t.classList.toggle('border-transparent', !isActive);
          t.classList.toggle('text-slate-500', !isActive);
        });
        var overview = $('[data-job-section="job-section-individual"]');
        var appt = $('[data-job-section="job-section-appointment"]');
        if (overview) overview.classList.toggle('hidden', target !== 'overview');
        if (appt) appt.classList.toggle('hidden', target !== 'appointments');
      });
    });
  }

  // ── View: Activities Section ───────────────────────────────

  function renderActivitiesTable() {
    var container = byId('addActivitiesTable');
    if (!container) return;
    if (!state.activities.length) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No activities added yet.</p>';
      return;
    }
    var rows = state.activities.map(function (a) {
      var id = a.ID || a.id;
      var service = a.Service_Service_Name || a.service_name || '';
      var status = a.Activity_Status || a.activity_status || '';
      var price = U.money(a.Activity_Price || a.activity_price);
      var task = a.Task || a.task || '';
      var invoiceFlag = (a.Invoice_To_Client || a.invoice_to_client) ? 'Yes' : 'No';
      return '<tr class="border-b border-slate-100">' +
        '<td class="px-3 py-2 text-sm">' + U.escapeHtml(task) + '</td>' +
        '<td class="px-3 py-2 text-sm">' + U.escapeHtml(service) + '</td>' +
        '<td class="px-3 py-2 text-sm"><span class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">' + U.escapeHtml(status) + '</span></td>' +
        '<td class="px-3 py-2 text-sm text-right">' + price + '</td>' +
        '<td class="px-3 py-2 text-sm text-center">' + invoiceFlag + '</td>' +
        '<td class="px-3 py-2 text-sm"><div class="flex gap-2">' +
        '<button data-edit-id="' + id + '" class="text-sky-700 text-xs font-medium">Edit</button>' +
        '<button data-delete-id="' + id + '" class="text-rose-600 text-xs font-medium">Delete</button>' +
        '</div></td></tr>';
    }).join('');
    container.innerHTML = '<table class="w-full text-left">' +
      '<thead><tr class="border-b border-slate-200 text-xs text-slate-500 uppercase">' +
      '<th class="px-3 py-2">Task</th><th class="px-3 py-2">Service</th><th class="px-3 py-2">Status</th>' +
      '<th class="px-3 py-2 text-right">Price</th><th class="px-3 py-2 text-center">Invoice</th><th class="px-3 py-2">Actions</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
    bindTableActions(container, 'activity');
  }

  function bindTableActions(container, type) {
    container.querySelectorAll('[data-edit-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-edit-id');
        if (type === 'activity') populateActivityForm(state.activityRecordsById[id]);
        else if (type === 'material') populateMaterialForm(state.materialRecordsById[id]);
      });
    });
    container.querySelectorAll('[data-delete-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete-id');
        var modelName = type === 'activity' ? 'PeterpmActivity' : 'PeterpmMaterial';
        startLoading('Deleting...');
        deleteRecord(modelName, id).then(function () {
          if (type === 'activity') return fetchActivities(state.jobId).then(renderActivitiesTable);
          else return fetchMaterials(state.jobId).then(renderMaterialsTable);
        }).then(function () {
          showSuccess('Deleted successfully.');
          syncWorkflowStatus('job.action', { operation: type + '-delete', recordId: id }, 'Delete completed. Syncing workflow status...');
        })
          .catch(function (err) { console.error(err); showError('Delete failed.'); })
          .finally(stopLoading);
      });
    });
  }

  function populateActivityForm(record) {
    if (!record) return;
    var section = $('[data-section="add-activities"]');
    if (!section) return;
    state.editingActivityId = record.ID || record.id;
    var set = function (field, val) {
      var el = section.querySelector('[data-field="' + field + '"]');
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!val;
      else el.value = val || '';
    };
    set('task', record.Task || record.task);
    set('activity_price', record.Activity_Price || record.activity_price);
    set('activity_text', record.Activity_Text || record.activity_text);
    set('activity_status', record.Activity_Status || record.activity_status);
    set('quantity', record.Quantity || record.quantity || 1);
    set('date_required', formatDateInput(record.Date_Required || record.date_required));
    set('note', record.Note || record.note);
    set('warranty', record.Standard_Warranty || '');
    set('invoice_to_client', record.Invoice_To_Client || record.invoice_to_client);
    var addBtn = byId('add-activities');
    if (addBtn) addBtn.textContent = 'Update';
  }

  function resetActivityForm() {
    var section = $('[data-section="add-activities"]');
    if (section) clearFields(section, '[data-field]');
    state.editingActivityId = null;
    var addBtn = byId('add-activities');
    if (addBtn) addBtn.textContent = 'Add';
    var qtyField = section && section.querySelector('[data-field="quantity"]');
    if (qtyField) qtyField.value = '1';
  }

  function handleAddActivity() {
    var section = $('[data-section="add-activities"]');
    if (!section) return Promise.resolve();
    var data = getFieldValues(section);
    if (!data.task && !data.service_name) { showError('Please select a task or service.'); return Promise.resolve(); }
    data.job_id = state.jobId;
    if (data.date_required) data.date_required = dateToUnix(data.date_required);
    if (data.invoice_to_client === true) data.invoice_to_client = '1';
    var wasEditing = !!state.editingActivityId;
    startLoading(wasEditing ? 'Updating activity...' : 'Adding activity...');
    var promise = wasEditing
      ? updateRecord('PeterpmActivity', state.editingActivityId, data)
      : createActivity(data);
    return promise.then(function () {
      resetActivityForm();
      return fetchActivities(state.jobId).then(renderActivitiesTable);
    }).then(function () {
      showSuccess(wasEditing ? 'Activity updated.' : 'Activity added.');
      syncWorkflowStatus(
        'job.action',
        { operation: wasEditing ? 'activity-update' : 'activity-add', jobId: state.jobId },
        (wasEditing ? 'Activity updated.' : 'Activity added.') + ' Syncing workflow status...'
      );
    })
      .catch(function (err) { console.error(err); showError('Failed to save activity.'); })
      .finally(stopLoading);
  }

  // ── View: Services Dropdown ────────────────────────────────

  function renderServiceDropdowns() {
    var primary = state.services.filter(function (s) { return s.Service_Type === 'Primary'; });
    var secondaryMap = {};
    state.services.forEach(function (s) {
      var pid = s.Primary_Service_ID || '';
      if (!secondaryMap[pid]) secondaryMap[pid] = [];
      secondaryMap[pid].push(s);
    });

    var servSelect = $('[data-section="add-activities"] [data-field="service_name"]');
    var secWrapper = $('[data-element="service_name_secondary"]');
    var secSelect = secWrapper && secWrapper.querySelector('select');
    var priceField = $('[data-section="add-activities"] [data-field="activity_price"]');
    var warrantyField = $('[data-section="add-activities"] [data-field="warranty"]');
    var textField = $('[data-section="add-activities"] [data-field="activity_text"]');
    var serviceIdField = $('[data-section="add-activities"] [data-field="service_id"]');

    if (!serviceIdField) {
      serviceIdField = document.createElement('input');
      serviceIdField.type = 'hidden';
      serviceIdField.setAttribute('data-field', 'service_id');
      if (servSelect && servSelect.parentElement) servSelect.parentElement.appendChild(serviceIdField);
    }

    if (servSelect) {
      populateSelect(servSelect, primary.map(function (s) { return { value: s.Service_Name, text: s.Service_Name, id: s.ID }; }), 'Select');
      servSelect.addEventListener('change', function () {
        var selected = primary.find(function (s) { return s.Service_Name === servSelect.value; });
        if (!selected) return;
        serviceIdField.value = selected.ID || '';
        if (priceField) priceField.value = selected.Service_Price || '';
        if (warrantyField) warrantyField.value = selected.Standard_Warranty || '';
        if (textField) textField.value = selected.Description || '';
        var subs = secondaryMap[selected.ID] || [];
        if (secWrapper && secSelect) {
          if (subs.length) {
            populateSelect(secSelect, subs.map(function (s) { return { value: s.Service_Name, text: s.Service_Name }; }), 'Select');
            secWrapper.classList.remove('hidden');
            secSelect.classList.remove('hidden');
          } else {
            secWrapper.classList.add('hidden');
          }
        }
      });
    }
    if (secSelect) {
      secSelect.addEventListener('change', function () {
        var allSubs = state.services.filter(function (s) { return s.Service_Name === secSelect.value; });
        var sel = allSubs[0];
        if (!sel) return;
        serviceIdField.value = sel.ID || '';
        if (priceField) priceField.value = sel.Service_Price || '';
        if (warrantyField) warrantyField.value = sel.Standard_Warranty || '';
        if (textField) textField.value = sel.Description || '';
      });
    }
  }

  // ── View: Materials Section ────────────────────────────────

  function renderMaterialsTable() {
    var container = byId('addMaterialsTable');
    if (!container) return;
    if (!state.materials.length) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No materials added yet.</p>';
      return;
    }
    var rows = state.materials.map(function (m) {
      var id = m.ID || m.id;
      var name = m.Material_Name || m.material_name || '';
      var total = U.money(m.Total || m.total);
      var txType = m.Transaction_Type || m.transaction_type || '';
      var tax = m.Tax || m.tax || '';
      var sp = '';
      if (m.Contact_First_Name || m.Contact_Last_Name) sp = (m.Contact_First_Name || '') + ' ' + (m.Contact_Last_Name || '');
      var created = U.formatDate(m.Created_At || m.created_at);
      return '<tr class="border-b border-slate-100">' +
        '<td class="px-3 py-2 text-sm">' + created + '</td>' +
        '<td class="px-3 py-2 text-sm">' + U.escapeHtml(name) + '</td>' +
        '<td class="px-3 py-2 text-sm text-right">' + total + '</td>' +
        '<td class="px-3 py-2 text-sm">' + U.escapeHtml(txType) + '</td>' +
        '<td class="px-3 py-2 text-sm">' + U.escapeHtml(tax) + '</td>' +
        '<td class="px-3 py-2 text-sm">' + U.escapeHtml(sp.trim()) + '</td>' +
        '<td class="px-3 py-2 text-sm"><div class="flex gap-2">' +
        '<button data-edit-id="' + id + '" class="text-sky-700 text-xs font-medium">Edit</button>' +
        '<button data-delete-id="' + id + '" class="text-rose-600 text-xs font-medium">Delete</button>' +
        '</div></td></tr>';
    }).join('');
    container.innerHTML = '<table class="w-full text-left">' +
      '<thead><tr class="border-b border-slate-200 text-xs text-slate-500 uppercase">' +
      '<th class="px-3 py-2">Date</th><th class="px-3 py-2">Material</th><th class="px-3 py-2 text-right">Total</th>' +
      '<th class="px-3 py-2">Type</th><th class="px-3 py-2">Tax</th><th class="px-3 py-2">Provider</th><th class="px-3 py-2">Actions</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
    bindTableActions(container, 'material');
  }

  function populateMaterialForm(record) {
    if (!record) return;
    var section = $('[data-section="add-materials"]');
    if (!section) return;
    state.editingMaterialId = record.ID || record.id;
    var set = function (field, val) {
      var el = section.querySelector('[data-field="' + field + '"]');
      if (!el) return;
      el.value = val || '';
    };
    set('material_name', record.Material_Name || record.material_name);
    set('total', record.Total || record.total);
    set('description', record.Description || record.description);
    set('transaction_type', record.Transaction_Type || record.transaction_type);
    set('tax', record.Tax || record.tax);
    var addBtn = byId('add-material-btn');
    if (addBtn) addBtn.textContent = 'Update';
  }

  function resetMaterialForm() {
    var section = $('[data-section="add-materials"]');
    if (section) clearFields(section, '[data-field]');
    state.editingMaterialId = null;
    var addBtn = byId('add-material-btn');
    if (addBtn) {
      addBtn.textContent = 'Add';
      addBtn.dataset.ptpmOriginalContent = 'Add';
    }
  }

  function handleAddMaterial() {
    var section = $('[data-section="add-materials"]');
    if (!section) return Promise.resolve();
    var data = getFieldValues(section);
    if (!data.material_name) { showError('Please enter a material name.'); return Promise.resolve(); }
    var addBtn = byId('add-material-btn');
    if (addBtn && U.setButtonLoading) U.setButtonLoading(addBtn, true, { label: state.editingMaterialId ? 'Updating...' : 'Adding...' });
    data.job_id = state.jobId;
    var wasEditing = !!state.editingMaterialId;
    startLoading(wasEditing ? 'Updating material...' : 'Adding material...');
    var promise = wasEditing
      ? updateRecord('PeterpmMaterial', state.editingMaterialId, data)
      : createRecord('PeterpmMaterial', data);
    return promise.then(function () {
      resetMaterialForm();
      return fetchMaterials(state.jobId).then(renderMaterialsTable);
    }).then(function () {
      showSuccess(wasEditing ? 'Material updated.' : 'Material added.');
      syncWorkflowStatus(
        'job.action',
        { operation: wasEditing ? 'material-update' : 'material-add', jobId: state.jobId },
        (wasEditing ? 'Material updated.' : 'Material added.') + ' Syncing workflow status...'
      );
    })
      .catch(function (err) { console.error(err); showError('Failed to save material.'); })
      .finally(function () {
        stopLoading();
        if (addBtn && U.setButtonLoading) U.setButtonLoading(addBtn, false);
      });
  }

  // ── View: Uploads Section ──────────────────────────────────

  function renderExistingUploads() {
    var container = $('[data-section="existing-uploads"]');
    if (!container) return;
    container.innerHTML = '';
    if (!state.uploads.length) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No uploads yet.</p>';
      return;
    }
    state.previewModal = state.previewModal || U.ensureFilePreviewModal();
    state.uploads.forEach(function (upload) {
      var url = upload.Photo_Upload || upload.photo_upload || '';
      var name = upload.Photo_Name || upload.photo_name || upload.File_Name || upload.file_name || 'Upload';
      var type = upload.Type || upload.type || '';
      var id = upload.ID || upload.id;
      var card = U.buildUploadCard({ url: url, name: name, type: type }, {
        onView: function () { state.previewModal.show({ src: url, name: name, type: type }); },
        onDelete: function () {
          startLoading('Deleting...');
          deleteRecord('PeterpmUpload', id).then(function () {
            return fetchUploads(state.jobId).then(renderExistingUploads);
          }).then(function () {
            showSuccess('Upload deleted.');
            syncWorkflowStatus('job.action', { operation: 'upload-delete', recordId: id, jobId: state.jobId }, 'Upload deleted. Syncing workflow status...');
          })
            .catch(function () { showError('Delete failed.'); })
            .finally(stopLoading);
        },
      });
      container.appendChild(card);
    });
  }

  function handleAddUploads() {
    var newCards = $$('[data-section="images-uploads"] [data-upload-url]');
    if (!newCards.length) { showError('Please upload at least one file.'); return; }
    if (!state.jobId) { showError('Missing job ID.'); return; }
    var uploadBtn = byId('add-images-btn');
    if (uploadBtn && U.setButtonLoading) U.setButtonLoading(uploadBtn, true, { label: 'Saving...' });
    startLoading('Saving uploads...');
    var promises = [];
    newCards.forEach(function (card) {
      var url = card.getAttribute('data-upload-url') || '';
      var name = card.getAttribute('data-file-name') || 'Upload';
      var type = card.getAttribute('file-type') || '';
      promises.push(createRecord('PeterpmUpload', {
        photo_upload: url,
        photo_name: name,
        type: type,
        job_id: state.jobId,
      }));
    });
    Promise.all(promises).then(function () {
      var listEl = $('[data-section="images-uploads"]');
      if (listEl) listEl.innerHTML = '';
      return fetchUploads(state.jobId).then(renderExistingUploads);
    }).then(function () {
      showSuccess('Uploads saved.');
      syncWorkflowStatus('job.action', { operation: 'uploads-save', uploadedCount: promises.length, jobId: state.jobId }, 'Uploads saved. Syncing workflow status...');
    })
      .catch(function (err) { console.error(err); showError('Upload save failed.'); })
      .finally(function () {
        stopLoading();
        if (uploadBtn && U.setButtonLoading) U.setButtonLoading(uploadBtn, false);
      });
  }

  // ── View: Invoice Section ──────────────────────────────────

  function renderInvoiceSection() {
    if (!state.jobId) return;
    fetchJobDetail(state.jobId).then(function (job) {
      if (!job) return;
      var set = function (field, val) {
        var el = $('[data-section="invoice"] [data-field="' + field + '"]');
        if (el) el.value = val || '';
      };
      set('invoice_number', job.Invoice_Number || job.invoice_number);
      set('invoice_date', formatDateInput(job.Invoice_Date || job.invoice_date));
      set('due_date', formatDateInput(job.Due_Date || job.due_date));
      set('xero_invoice_status', job.Xero_Invoice_Status || job.xero_invoice_status);
    });
  }

  // ── View: Appointments ─────────────────────────────────────

  function populateAppointmentFields() {
    var appt = state.appointment;
    if (!appt) return;
    var section = $('[data-job-section="job-section-appointment"]');
    if (!section) return;
    var set = function (field, val) {
      var el = section.querySelector('[data-field="' + field + '"]');
      if (!el) return;
      el.value = val || '';
    };
    set('status', appt.Status || appt.status);
    set('type', appt.Type || appt.type);
    set('title', appt.Title || appt.title);
    set('description', appt.Description || appt.description);
    set('start_time', formatDateInput(appt.Start_Time || appt.start_time));
    set('end_time', formatDateInput(appt.End_Time || appt.end_time));
    set('location_id', appt.Location_ID || appt.location_id);
    set('host_id', appt.Host_ID || appt.host_id);
    set('inquiry_id', appt.Inquiry_ID || appt.inquiry_id);
    set('job_id', appt.Job_ID || appt.job_id);
  }

  function handleCreateAppointment() {
    var section = $('[data-job-section="job-section-appointment"]');
    if (!section) return Promise.resolve();
    var data = getFieldValues(section);
    data.job_id = state.jobId;
    if (data.start_time) data.start_time = dateToUnix(data.start_time);
    if (data.end_time) data.end_time = dateToUnix(data.end_time);
    startLoading('Creating appointment...');
    return createRecord('PeterpmAppointment', data)
      .then(function () {
        showSuccess('Appointment created.');
        syncWorkflowStatus('job.updateFutureBooking', { operation: 'appointment-create', jobId: state.jobId }, 'Appointment created. Syncing workflow status...');
      })
      .catch(function (err) { console.error(err); showError('Appointment creation failed.'); })
      .finally(stopLoading);
  }

  // ── View: Populate Select Options ──────────────────────────

  function populateDropdowns() {
    // Guest (contact) dropdown
    var guest = $('[data-field="primary_guest_id"]');
    if (guest) {
      populateSelect(guest, state.contacts.map(function (c) {
        return { value: c.Contact_ID || c.id || c.ID, text: ((c.First_Name || c.first_name || '') + ' ' + (c.Last_Name || c.last_name || '')).trim() };
      }), 'Select');
    }
    // Location (property) dropdown
    var loc = $('[data-field="location_id"]');
    if (loc) {
      populateSelect(loc, state.properties.map(function (p) {
        return { value: p.ID || p.id, text: p.Property_Name || p.property_name || '' };
      }), 'Select');
    }
    // Host (service provider) dropdown
    var host = $('[data-field="host_id"]');
    if (host) {
      populateSelect(host, state.serviceProviders.map(function (sp) {
        var ci = sp.Contact_Information || {};
        return { value: sp.ID || sp.id, text: ((ci.first_name || '') + ' ' + (ci.last_name || '')).trim() };
      }), 'Select');
    }
    // Inquiry dropdown
    var inq = $('[data-field="inquiry_id"]');
    if (inq) {
      populateSelect(inq, state.inquiries.map(function (i) {
        return { value: i.ID || i.id, text: i.Deal_Name || i.deal_name || '' };
      }), 'Select');
    }
    // Job dropdown
    var job = $('[data-field="job_id"]');
    if (job) {
      populateSelect(job, state.jobs.map(function (j) {
        return { value: j.ID || j.id, text: (j.Unique_ID || j.unique_id || '') + ' - ' + (j.Property_Property_Name || '') };
      }), 'Select');
    }
    // State dropdowns
    $$('[data-field="state"], [data-field="postal_state"]').forEach(function (el) {
      populateSelect(el, STATE_OPTIONS.map(function (s) { return { value: s.value, text: s.text }; }), 'Select State');
    });
    // Activity status dropdown
    var actStatus = $('[data-section="add-activities"] [data-field="activity_status"]');
    if (actStatus) populateSelect(actStatus, ACTIVITY_STATUSES, 'Select One');
    // Appointment status
    var apptStatus = $('[data-job-section="job-section-appointment"] [data-field="status"]');
    if (apptStatus) populateSelect(apptStatus, APPOINTMENT_STATUSES, 'Select');
    // Appointment type
    var apptType = $('[data-job-section="job-section-appointment"] [data-field="type"]');
    if (apptType) populateSelect(apptType, APPOINTMENT_TYPES, 'Select');
    // Material dropdowns
    var txType = $('[data-section="add-materials"] [data-field="transaction_type"]');
    if (txType) populateSelect(txType, TRANSACTION_TYPES, 'Select one');
    var taxField = $('[data-section="add-materials"] [data-field="tax"]');
    if (taxField) populateSelect(taxField, TAX_TYPES, 'Select one');
    // Building features
    renderBuildingFeatures();
  }

  function renderBuildingFeatures() {
    var list = byId('property-building-list');
    if (!list) return;
    list.innerHTML = '';
    var allCb = document.createElement('li');
    allCb.innerHTML = '<label class="flex items-center gap-2 px-2 py-1 cursor-pointer"><input type="checkbox" data-building-all class="accent-[#003882]"> <span class="text-sm font-medium">All</span></label>';
    list.appendChild(allCb);
    BUILDING_FEATURES.forEach(function (f) {
      var li = document.createElement('li');
      li.innerHTML = '<label class="flex items-center gap-2 px-2 py-1 cursor-pointer"><input type="checkbox" value="' + f.value + '" data-building-feature class="accent-[#003882]"> <span class="text-sm">' + U.escapeHtml(f.text) + '</span></label>';
      list.appendChild(li);
    });
    var allInput = list.querySelector('[data-building-all]');
    if (allInput) {
      allInput.addEventListener('change', function () {
        list.querySelectorAll('[data-building-feature]').forEach(function (cb) { cb.checked = allInput.checked; });
      });
    }
    var triggerBtn = byId('property-building-btn');
    var card = byId('property-building-card');
    if (triggerBtn && card) {
      triggerBtn.addEventListener('click', function () { card.classList.toggle('hidden'); });
    }
  }

  // ── View: Modals ───────────────────────────────────────────

  function toggleModal(id) {
    var modal = byId(id);
    if (modal) modal.classList.toggle('hidden');
  }

  // ── View: Populate Job Details (Edit Mode) ─────────────────

  function populateJobFromRecord(data) {
    if (!data) return;
    var accountType = (data.account_type || data.Account_Type || '').toLowerCase();
    var initialType = accountType === 'contact' ? 'individual' : 'entity';
    var toggle = $('[data-contact-toggle="' + initialType + '"]');
    if (toggle) toggle.click();

    var setProp = function (field, val) {
      var el = $('[data-field="' + field + '"]');
      if (el) el.value = val || '';
    };
    setProp('priority', data.priority || data.Priority);
    setProp('job_status', data.job_status || data.Job_Status);
    setProp('payment_status', data.payment_status || data.Payment_Status);
    setProp('job_required_by', formatDateInput(data.date_job_required_by || data.Date_Job_Required_By));
    setProp('properties', data.property_name || data.Property_Property_Name || '');
    setProp('property_id', data.property_id || data.Property_ID || '');
    setProp('serviceman_id', data.serviceman_id || data.Primary_Service_Provider_ID || '');
    var spName = [data.serviceman_first_name || data.Contact_First_Name, data.serviceman_last_name || data.Contact_Last_Name].filter(Boolean).join(' ');
    setProp('serviceman', spName);

    if (accountType === 'contact') {
      setProp('client', [data.client_individual_first_name || data.Client_Individual_First_Name, data.client_individual_last_name || data.Client_Individual_Last_Name].filter(Boolean).join(' '));
      setProp('client_id', data.client_individual_id || data.Client_Individual_Contact_ID || '');
    } else {
      setProp('entity_name', data.client_entity_name || data.Client_Entity_Name || '');
      setProp('company_id', data.client_entity_id || data.Client_Entity_ID || '');
    }

    // Prefill invoice fields on load for edit consistency.
    setProp('invoice_number', data.invoice_number || data.Invoice_Number || '');
    setProp('invoice_date', formatDateInput(data.invoice_date || data.Invoice_Date));
    setProp('due_date', formatDateInput(data.due_date || data.Due_Date));
    setProp('xero_invoice_status', data.xero_invoice_status || data.Xero_Invoice_Status || '');
  }

  // ── View: Job Information Submit ───────────────────────────

  function handleJobInfoSubmit() {
    var section = $('[data-section="job-information"]');
    if (!section) return Promise.resolve();
    var fields = getFieldValues(section);
    var jobData = {
      priority: fields.priority || '',
      date_job_required_by: dateToUnix(fields.job_required_by) || '',
      payment_status: fields.payment_status || '',
      job_status: fields.job_status || '',
    };
    if (state.activeContactType === 'individual' && fields.client_id) {
      jobData.Client_Individual = { id: fields.client_id };
      jobData.account_type = 'Contact';
    } else if (fields.company_id) {
      jobData.Client_Entity = { id: fields.company_id };
      jobData.account_type = 'Entity';
    }
    if (fields.property_id) jobData.Property = { id: fields.property_id };
    if (fields.serviceman_id) jobData.Primary_Service_Provider = { id: fields.serviceman_id };

    startLoading('Saving job information...');
    var promise = state.jobId
      ? updateRecord('PeterpmJob', state.jobId, jobData)
      : createRecord('PeterpmJob', jobData);
    return promise.then(function (result) {
      if (!state.jobId) {
        state.jobId = extractId(result, 'PeterpmJob') || extractId(result, 'PeterpmJobID');
        var body = document.body;
        if (body && state.jobId) body.setAttribute('data-job-id', state.jobId);
      }
      syncWorkflowStatus('job.action', { operation: 'save-job-information' }, 'Job information saved. Syncing workflow status...');
      showSuccess('Job information saved.', 'job.action');
    }).catch(function (err) { console.error(err); showError('Failed to save job information.'); })
      .finally(function () {
        stopLoading();
        if (submitBtn && U.setButtonLoading) U.setButtonLoading(submitBtn, false);
      });
  }

  // ── View: Google Places Autocomplete ───────────────────────

  function initGooglePlaces() {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    var inputs = $$('[data-field="modal-properties"], [data-contact-field="bot_address_line1"], [data-contact-field="top_address_line1"]');
    inputs.forEach(function (input) {
      if (input.dataset.googlePlacesBound === 'true') return;
      var autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'au' },
      });
      autocomplete.addListener('place_changed', function () {
        var place = autocomplete.getPlace();
        input.value = place && place.formatted_address || input.value;
        var parsed = parseAddressComponents(place);
        if (input.getAttribute('data-field') === 'modal-properties') {
          setPropertyFieldsFromAddress(parsed);
          createRecord('PeterpmProperty', { property_name: place.formatted_address, Properties: parsed });
        }
      });
      input.dataset.googlePlacesBound = 'true';
    });
  }

  function parseAddressComponents(place) {
    var components = place && place.address_components || [];
    var result = { unit_number: '', lot_number: '', address_1: '', address_2: '', suburb_town: '', state: '', postal_code: '', street_number: '', street: '' };
    components.forEach(function (c) {
      if (c.types.indexOf('subpremise') !== -1) result.unit_number = c.long_name;
      if (c.types.indexOf('premise') !== -1) result.lot_number = c.long_name;
      if (c.types.indexOf('street_number') !== -1) result.street_number = c.long_name;
      if (c.types.indexOf('route') !== -1) result.street = c.long_name;
      if (c.types.indexOf('locality') !== -1) result.suburb_town = c.long_name;
      if (c.types.indexOf('administrative_area_level_1') !== -1) result.state = c.short_name;
      if (c.types.indexOf('postal_code') !== -1) result.postal_code = c.long_name;
      if (c.types.indexOf('country') !== -1) result.country = c.short_name;
    });
    result.address_1 = (result.street_number + ' ' + result.street).trim();
    if (result.unit_number) result.address_2 = 'Unit ' + result.unit_number;
    return result;
  }

  function setPropertyFieldsFromAddress(parsed) {
    var map = { address_1: 'address_1', address_2: 'address_2', suburb_town: 'suburb_town', state: 'state', postal_code: 'postal_code' };
    Object.keys(map).forEach(function (key) {
      var el = $('[data-property-id="' + map[key] + '"]') || $('[data-field="' + map[key] + '"]');
      if (el) el.value = parsed[key] || '';
    });
  }

  // ── View: File Upload Setup ────────────────────────────────

  function setupFileUpload() {
    var trigger = $('[data-upload-trigger]');
    var input = $('[data-field="upload-file"]');
    var listEl = $('[data-section="images-uploads"]');
    if (!trigger || !input) return;
    state.previewModal = state.previewModal || U.ensureFilePreviewModal();
    trigger.addEventListener('click', function () { input.click(); });
    trigger.addEventListener('dragover', function (e) { e.preventDefault(); trigger.classList.add('border-sky-400'); });
    trigger.addEventListener('dragleave', function () { trigger.classList.remove('border-sky-400'); });
    trigger.addEventListener('drop', function (e) {
      e.preventDefault();
      trigger.classList.remove('border-sky-400');
      if (e.dataTransfer && e.dataTransfer.files) processFiles(e.dataTransfer.files, listEl);
    });
    input.addEventListener('change', function () {
      if (input.files) processFiles(input.files, listEl);
      input.value = '';
    });
  }

  function processFiles(files, listEl) {
    if (!listEl) return;
    Array.from(files).forEach(function (file) {
      if (!/^(image\/|application\/pdf)/.test(file.type)) return;
      startLoading('Uploading ' + file.name + '...');
      U.uploadAndGetFileLink(file, 'uploads').then(function (url) {
        var card = U.buildUploadCard({ url: url, name: file.name, type: file.type }, {
          onView: function () { state.previewModal.show({ src: url, name: file.name, type: file.type }); },
          onDelete: function () { card.remove(); },
        });
        card.setAttribute('data-upload-url', url);
        card.setAttribute('data-file-name', file.name);
        card.setAttribute('file-type', file.type);
        listEl.appendChild(card);
      }).catch(function (err) { console.error(err); showError('Upload failed: ' + file.name); })
        .finally(stopLoading);
    });
  }

  // ── View: Sidebar Toggle ───────────────────────────────────

  function setupSidebarToggle() {
    var toggle = $('[data-sidebar-toggle]');
    var container = $('[data-sidebar-container]');
    if (!toggle || !container) return;
    toggle.addEventListener('click', function () {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      container.classList.toggle('w-64', !state.sidebarCollapsed);
      container.classList.toggle('w-16', state.sidebarCollapsed);
      $$('[data-section-label]').forEach(function (label) {
        label.classList.toggle('hidden', state.sidebarCollapsed);
      });
    });
  }

  // ── Controller: Bind Events ────────────────────────────────

  function bindEvents() {
    // Navigation
    var nextBtn = $('[data-nav-action="next"]');
    var backBtn = $('[data-nav-action="back"]');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (state.currentSectionIdx === 0) {
        handleJobInfoSubmit().then(goNext);
      } else {
        goNext();
      }
    });
    if (backBtn) backBtn.addEventListener('click', goBack);

    // Cancel
    var cancelBtn = $('[data-nav-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        U.showUnsavedChangesModal({
          onDiscard: function () { window.location.href = config.CDN_BASE || '/'; },
          onSave: function () { history.back(); },
        });
      });
    }

    // Reset
    var resetBtn = $('[data-nav-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        U.showResetConfirmModal({
          onConfirm: function () {
            var section = $('[data-section="' + state.sectionOrder[state.currentSectionIdx] + '"]');
            if (section) U.resetFormFields(section);
          },
        });
      });
    }

    // Submit info button
    var submitInfo = byId('submit-information-btn');
    if (submitInfo) submitInfo.addEventListener('click', function () { handleJobInfoSubmit(); });

    // Create appointment
    var createAppt = byId('create-appointment');
    if (createAppt) createAppt.addEventListener('click', function () { handleCreateAppointment(); });

    // Add activities
    var addAct = byId('add-activities');
    if (addAct) addAct.addEventListener('click', function () { handleAddActivity(); });
    var cancelAct = byId('cancel-activities');
    if (cancelAct) cancelAct.addEventListener('click', function (e) { e.preventDefault(); resetActivityForm(); });

    // Add materials
    var addMat = byId('add-material-btn');
    if (addMat) addMat.addEventListener('click', function (e) { e.preventDefault(); handleAddMaterial(); });
    var cancelMat = byId('cancel-material-btn');
    if (cancelMat) cancelMat.addEventListener('click', function (e) { e.preventDefault(); resetMaterialForm(); });

    // Add uploads
    var addUpload = byId('add-images-btn');
    if (addUpload) addUpload.addEventListener('click', function () { handleAddUploads(); });

    // Add property
    var addPropBtn = byId('add-property-btn');
    if (addPropBtn) {
      addPropBtn.addEventListener('click', function () {
        var modalSearch = $('#jobAddPropertyModal [data-field="modal-properties"]');
        var raw = {};
        $$('#jobAddPropertyModal [data-field]').forEach(function (el) {
          var key = el.getAttribute('data-field');
          if (key) raw[key] = (el.value || '').trim();
        });
        raw.property_name = modalSearch ? modalSearch.value : '';
        if (!raw.property_name) {
          showError('Please enter a property name.');
          return;
        }
        startLoading('Creating property...');
        createRecord('PeterpmProperty', raw).then(function (result) {
          var newId = extractId(result, 'PeterpmProperty');
          var propInput = $('[data-field="properties"]');
          var propHidden = $('[data-field="property_id"]');
          setLookupValue(propInput, propHidden, newId, raw.property_name);
          return fetchProperties();
        }).then(function () { showSuccess('Property created.'); toggleModal('jobAddPropertyModal'); })
          .catch(function (err) { console.error(err); showError('Property creation failed.'); })
          .finally(stopLoading);
      });
    }

    // Sidebar section targets
    $$('[data-section-target]').forEach(function (el) {
      el.addEventListener('click', function () {
        var target = el.getAttribute('data-section-target');
        if (target) showSection(target);
      });
    });
  }

  // ── Controller: Init ───────────────────────────────────────

  function init() {
    // Resolve job ID
    var body = document.body;
    state.jobId = (body && (body.dataset.jobId || body.dataset.JobId) || '').toString().trim();

    // Init loader and modal
    state.loaderEl = U.initOperationLoader();
    state.loaderMsgEl = state.loaderEl && state.loaderEl.querySelector('[data-loader-message]');
    var customModal = U.initCustomModal();
    state.statusModal = customModal.modal;

    // Init flatpickr
    if (window.flatpickr) {
      window.flatpickr('.date-picker', { dateFormat: 'd/m/Y', allowInput: true });
    }

    // Setup contact type toggle and job info tabs
    setupContactTypeToggle();
    setupJobInfoTabs();
    setupSidebarToggle();

    // Show initial section
    showSection('job-information');

    // Bind all events
    bindEvents();

    // Setup file upload for uploads section
    setupFileUpload();

    // Load data in parallel
    startLoading('Loading...');
    Promise.all([
      fetchContacts().then(setupContactSearch),
      fetchCompanies().then(setupCompanySearch),
      fetchServiceProviders().then(setupServiceProviderSearch),
      fetchProperties().then(setupPropertySearch),
      fetchInquiries(),
      fetchJobs(),
      fetchServices().then(renderServiceDropdowns),
    ]).then(function () {
      populateDropdowns();

      // Load job details if editing
      if (state.jobId) {
        return Promise.all([
          fetchJobDetail(state.jobId).then(populateJobFromRecord),
          fetchActivities(state.jobId).then(renderActivitiesTable),
          fetchMaterials(state.jobId).then(renderMaterialsTable),
          fetchUploads(state.jobId).then(renderExistingUploads),
          fetchAppointment(state.jobId).then(populateAppointmentFields),
        ]).then(renderInvoiceSection);
      }
    }).catch(function (err) {
      console.error('[PtpmJobDetail] Init error:', err);
    }).finally(stopLoading);

    // Lazy-load Google Places
    setTimeout(function () { initGooglePlaces(); }, 3000);
  }

  // ── Expose ─────────────────────────────────────────────────

  window.PtpmJobDetail = {
    init: init,
    getState: function () { return state; },
  };

})();
