// PTPM — Admin Dashboard Page
// Controller + view for the admin dashboard: tabs, calendar, filters, notifications, tables.
// Depends on: config.js, utils.js, vitalsync.js, domain.js, table.js
// Exposes window.PtpmDashboard with init().
(function () {
  'use strict';

  var config = window.AppConfig;
  var utils = window.PtpmUtils;
  var domain = window.PtpmDomain;
  var tbl = window.PtpmTable;
  var brandColor = config.BRAND_COLOR || '#003882';

  // ─── State ─────────────────────────────────────────────────

  var state = {
    activeTab: 'inquiry',
    filters: createEmptyFilters(),
    currentPage: 1,
    pageSize: 20,
    totalPages: 1,
    totalCount: 0,
    calendarDays: [],
    calendarWeekOffset: 0, // 0=current+previous week, -1=older, +1=future
    selectedDate: null,
    notificationSub: null,
    notifications: [],
    unreadCount: 0,
    batchMode: false,
    batchSelections: new Set(),
    pagination: null,
    urgentCount: 0,
    sortByTab: {}, // { [tab]: { field, direction } }
    columnsByTab: {},
    viewsByTab: {},
    activeViewIdByTab: {},
  };
  var currentTabNavId = 'top-tabs';
  var batchActionsBound = false;
  var jobsActionsBound = false;
  var TAB_DEFAULT_COLUMN_IDS = {
    inquiry: ['dealName', 'client', 'salesStage', 'dealValue', 'dateAdded', 'type', 'inquiryStatus', 'actions'],
    jobs: ['id', 'client', 'startDate', 'service', 'bookedDate', 'jobTotal', 'jobStatus', 'actions'],
    quote: ['id', 'client', 'dateQuotedAccepted', 'service', 'quoteTotal', 'quoteStatus', 'actions'],
    payment: ['id', 'client', 'invoiceNumber', 'invoiceDate', 'dueDate', 'invoiceTotal', 'xeroInvoiceStatus', 'actions'],
    'active-jobs': ['id', 'client', 'dateAccepted', 'service', 'activeJobTotal', 'activeJobStatus', 'actions'],
    'urgent-calls': ['id', 'client', 'startDate', 'service', 'bookedDate', 'jobTotal', 'jobStatus', 'actions'],
  };
  var VIEW_STORAGE_PREFIX = 'ptpm:dashboard:views:';
  var columnEditorState = {
    isOpen: false,
    draftColumns: [],
    path: [],
  };

  var INQUIRY_COLUMN_CATALOG = {
    dealName: {
      id: 'dealName',
      label: 'Deal Name',
      group: 'Deal Info',
      header: {
        key: 'dealName',
        label: 'Deal Name',
        cellClass: 'px-4 py-4 text-[#0052cc] font-medium whitespace-nowrap',
        render: function (row) {
          var href = getInquiryDetailUrlFromRow(row);
          var text = (utils && utils.escapeHtml) ? utils.escapeHtml(row && row.dealName ? row.dealName : '-') : (row && row.dealName ? row.dealName : '-');
          return '<a href="' + href + '" class="text-[#0052cc] hover:underline">' + text + '</a>';
        },
      },
      query: { select: ['deal_name'] },
    },
    uniqueId: { id: 'uniqueId', label: 'Unique ID', group: 'Deal Info', header: { key: 'id', label: 'Unique ID' }, query: { select: ['id', 'unique_id'] } },
    inquiryStatus: {
      id: 'inquiryStatus',
      label: 'Inquiry Status',
      group: 'Deal Info',
      header: { key: 'inquiryStatus', label: 'Inquiry Status', render: function (row) { return renderStatusBadge(row.inquiryStatus); } },
      query: { select: ['inquiry_status'] },
    },
    salesStage: { id: 'salesStage', label: 'Sales Stage', group: 'Deal Info', header: { key: 'salesStage', label: 'Sales Stage' }, query: { select: ['sales_stage'] } },
    dealValue: { id: 'dealValue', label: 'Deal Value', group: 'Deal Info', header: { key: 'dealValue', label: 'Deal Value', render: function (row) { return tbl.money(row.dealValue); } }, query: { select: ['deal_value'] } },
    dateAdded: { id: 'dateAdded', label: 'Date Added', group: 'Deal Info', header: { key: 'dateAdded', label: 'Date Added', sortField: 'created_at' }, query: { select: ['created_at'] } },
    type: { id: 'type', label: 'Type', group: 'Deal Info', header: { key: 'type', label: 'Type' }, query: { select: ['type'] } },
    referral: { id: 'referral', label: 'How Did You Hear', group: 'Deal Info', header: { key: 'referral', label: 'How Did You Hear' }, query: { select: ['how_did_you_hear'] } },
    howCanWeHelp: { id: 'howCanWeHelp', label: 'How Can We Help', group: 'Deal Info', header: { key: 'howCanWeHelp', label: 'How Can We Help' }, query: { select: ['how_can_we_help'] } },
    adminNotes: { id: 'adminNotes', label: 'Admin Notes', group: 'Deal Info', header: { key: 'adminNotes', label: 'Admin Notes' }, query: { select: ['admin_notes'] } },
    client: { id: 'client', label: 'Client Info', group: 'Client Information', header: { key: 'client', label: 'Client Info', render: function (row) { return tbl.buildClientCell(row); } }, query: { select: ['company_id', 'primary_contact_id', 'account_type'], include: { Company: ['id', 'name', 'account_type'], Primary_Contact: ['id', 'first_name', 'last_name', 'email', 'sms_number', 'address_1'] } } },
    accountType: { id: 'accountType', label: 'Account Type', group: 'Client Information', header: { key: 'accountType', label: 'Account Type' }, query: { select: ['account_type'], include: { Company: ['account_type'] } } },
    company: { id: 'company', label: 'Company', group: 'Client Information', subgroup: 'Company', header: { key: 'company', label: 'Company' }, query: { select: ['company_id'], include: { Company: ['id', 'name'] } } },
    companyType: { id: 'companyType', label: 'Company Type', group: 'Client Information', subgroup: 'Company', header: { key: 'companyType', label: 'Company Type' }, query: { select: ['company_id'], include: { Company: ['account_type'] } } },
    primaryContact: { id: 'primaryContact', label: 'Primary Contact', group: 'Client Information', subgroup: 'Primary Contact', header: { key: 'primaryContact', label: 'Primary Contact' }, query: { select: ['primary_contact_id'], include: { Primary_Contact: ['id', 'first_name', 'last_name'] } } },
    contactEmail: { id: 'contactEmail', label: 'Primary Contact Email', group: 'Client Information', subgroup: 'Primary Contact', header: { key: 'contactEmail', label: 'Primary Contact Email' }, query: { include: { Primary_Contact: ['email'] } } },
    contactPhone: { id: 'contactPhone', label: 'Primary Contact Phone', group: 'Client Information', subgroup: 'Primary Contact', header: { key: 'contactPhone', label: 'Primary Contact Phone' }, query: { include: { Primary_Contact: ['sms_number'] } } },
    propertyName: { id: 'propertyName', label: 'Property Name', group: 'Property Information', subgroup: 'Property', header: { key: 'propertyName', label: 'Property Name' }, query: { include: { Property: ['property_name'] } } },
    propertyAddress: { id: 'propertyAddress', label: 'Property Address', group: 'Property Information', subgroup: 'Property', header: { key: 'propertyAddress', label: 'Property Address' }, query: { include: { Property: ['address_1'] } } },
    propertySuburbTown: { id: 'propertySuburbTown', label: 'Property Suburb/Town', group: 'Property Information', subgroup: 'Property', header: { key: 'propertySuburbTown', label: 'Property Suburb/Town' }, query: { include: { Property: ['suburb_town'] } } },
    propertyState: { id: 'propertyState', label: 'Property State', group: 'Property Information', subgroup: 'Property', header: { key: 'propertyState', label: 'Property State' }, query: { include: { Property: ['state'] } } },
    propertyPostalCode: { id: 'propertyPostalCode', label: 'Property Postal Code', group: 'Property Information', subgroup: 'Property', header: { key: 'propertyPostalCode', label: 'Property Postal Code' }, query: { include: { Property: ['postal_code'] } } },
    actions: { id: 'actions', label: 'Action', group: 'System', lock: true, header: { key: 'actions', label: 'Action', render: function () { return tbl.actionButtons; }, cellClass: 'px-3 py-4 text-slate-600 text-center' }, query: {} },
  };
  var JOB_COLUMN_CATALOG = {
    id: { id: 'id', label: 'ID', group: 'Job', header: { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' }, query: { select: ['unique_id'] } },
    client: { id: 'client', label: 'Client', group: 'Client', header: { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } }, query: { include: { Client_Individual: ['first_name', 'last_name', 'email', 'sms_number'], Property: ['property_name', 'address_1'] } } },
    startDate: { id: 'startDate', label: 'Start Date', group: 'Dates', header: { key: 'startDate', label: 'Start Date', sortField: 'date_started' }, query: { select: ['date_started'] } },
    service: { id: 'service', label: 'Service', group: 'Job', header: { key: 'service', label: 'Service' }, query: { include: { Inquiry_Record: ['service_name'] } } },
    bookedDate: { id: 'bookedDate', label: 'Booked', group: 'Dates', header: { key: 'bookedDate', label: 'Booked', sortField: 'date_booked' }, query: { select: ['date_booked'] } },
    jobTotal: { id: 'jobTotal', label: 'Total', group: 'Money', header: { key: 'jobTotal', label: 'Total', render: function (row) { return tbl.money(row.jobTotal); } }, query: { select: ['job_total'] } },
    jobStatus: { id: 'jobStatus', label: 'Status', group: 'Job', header: { key: 'jobStatus', label: 'Status', render: function (row) { return renderStatusBadge(row.jobStatus); } }, query: { select: ['job_status'] } },
    actions: { id: 'actions', label: 'Action', group: 'System', lock: true, header: { key: 'actions', label: '', render: function () { return tbl.actionButtons; } }, query: {} },
  };
  var QUOTE_COLUMN_CATALOG = {
    id: { id: 'id', label: 'ID', group: 'Quote', header: { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' }, query: { select: ['unique_id'] } },
    client: { id: 'client', label: 'Client', group: 'Client', header: { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } }, query: { include: { Client_Individual: ['first_name', 'last_name', 'email', 'sms_number'], Property: ['property_name'] } } },
    dateQuotedAccepted: { id: 'dateQuotedAccepted', label: 'Quote Accepted', group: 'Dates', header: { key: 'dateQuotedAccepted', label: 'Quote Accepted', sortField: 'date_quoted_accepted' }, query: { select: ['date_quoted_accepted'] } },
    service: { id: 'service', label: 'Service', group: 'Quote', header: { key: 'service', label: 'Service' }, query: { include: { Inquiry_Record: ['service_name'] } } },
    quoteDate: { id: 'quoteDate', label: 'Quote Date', group: 'Dates', header: { key: 'quoteDate', label: 'Quote Date', sortField: 'quote_date' }, query: { select: ['quote_date'] } },
    quoteTotal: { id: 'quoteTotal', label: 'Total', group: 'Money', header: { key: 'quoteTotal', label: 'Total', render: function (row) { return tbl.money(row.quoteTotal); } }, query: { select: ['quote_total'] } },
    quoteStatus: { id: 'quoteStatus', label: 'Status', group: 'Quote', header: { key: 'quoteStatus', label: 'Status', render: function (row) { return renderStatusBadge(row.quoteStatus); } }, query: { select: ['quote_status'] } },
    actions: { id: 'actions', label: 'Action', group: 'System', lock: true, header: { key: 'actions', label: '', render: function () { return tbl.actionButtons; } }, query: {} },
  };
  var PAYMENT_COLUMN_CATALOG = {
    id: { id: 'id', label: 'ID', group: 'Payment', header: { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' }, query: { select: ['unique_id'] } },
    client: { id: 'client', label: 'Client', group: 'Client', header: { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } }, query: { include: { Client_Individual: ['first_name', 'last_name', 'email', 'sms_number'], Property: ['property_name'] } } },
    invoiceNumber: { id: 'invoiceNumber', label: 'Invoice #', group: 'Payment', header: { key: 'invoiceNumber', label: 'Invoice #' }, query: { select: ['invoice_number'] } },
    paymentStatus: { id: 'paymentStatus', label: 'Payment Status', group: 'Payment', header: { key: 'paymentStatus', label: 'Payment Status', render: function (row) { return renderStatusBadge(row.paymentStatus); } }, query: { select: ['payment_status'] } },
    invoiceDate: { id: 'invoiceDate', label: 'Invoice Date', group: 'Dates', header: { key: 'invoiceDate', label: 'Invoice Date', sortField: 'invoice_date' }, query: { select: ['invoice_date'] } },
    dueDate: { id: 'dueDate', label: 'Due Date', group: 'Dates', header: { key: 'dueDate', label: 'Due Date', sortField: 'due_date' }, query: { select: ['due_date'] } },
    invoiceTotal: { id: 'invoiceTotal', label: 'Total', group: 'Money', header: { key: 'invoiceTotal', label: 'Total', render: function (row) { return tbl.money(row.invoiceTotal); } }, query: { select: ['invoice_total'] } },
    xeroInvoiceStatus: { id: 'xeroInvoiceStatus', label: 'Xero Status', group: 'Payment', header: { key: 'xeroInvoiceStatus', label: 'Xero Status', render: function (row) { return renderStatusBadge(row.xeroInvoiceStatus); } }, query: { select: ['xero_invoice_status'] } },
    actions: { id: 'actions', label: 'Action', group: 'System', lock: true, header: { key: 'actions', label: '', render: function () { return tbl.actionButtons; } }, query: {} },
  };
  var ACTIVE_JOB_COLUMN_CATALOG = {
    id: { id: 'id', label: 'ID', group: 'Active Job', header: { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' }, query: { select: ['unique_id'] } },
    client: { id: 'client', label: 'Client', group: 'Client', header: { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } }, query: { include: { Client_Individual: ['first_name', 'last_name', 'email', 'sms_number'], Property: ['property_name'] } } },
    dateAccepted: { id: 'dateAccepted', label: 'Accepted', group: 'Dates', header: { key: 'dateAccepted', label: 'Accepted', sortField: 'date_active_job_accepted' }, query: { select: ['date_active_job_accepted'] } },
    service: { id: 'service', label: 'Service', group: 'Active Job', header: { key: 'service', label: 'Service' }, query: { include: { Inquiry_Record: ['service_name'] } } },
    activeJobTotal: { id: 'activeJobTotal', label: 'Total', group: 'Money', header: { key: 'activeJobTotal', label: 'Total', render: function (row) { return tbl.money(row.activeJobTotal); } }, query: { select: ['active_job_total'] } },
    activeJobStatus: { id: 'activeJobStatus', label: 'Status', group: 'Active Job', header: { key: 'activeJobStatus', label: 'Status', render: function (row) { return renderStatusBadge(row.activeJobStatus); } }, query: { select: ['active_job_status'] } },
    validUntil: { id: 'validUntil', label: 'Valid Until', group: 'Dates', header: { key: 'validUntil', label: 'Valid Until', sortField: 'active_job_valid_until' }, query: { select: ['active_job_valid_until'] } },
    actions: { id: 'actions', label: 'Action', group: 'System', lock: true, header: { key: 'actions', label: '', render: function () { return tbl.actionButtons; } }, query: {} },
  };
  var TAB_COLUMN_CATALOGS = {
    inquiry: INQUIRY_COLUMN_CATALOG,
    jobs: JOB_COLUMN_CATALOG,
    quote: QUOTE_COLUMN_CATALOG,
    payment: PAYMENT_COLUMN_CATALOG,
    'active-jobs': ACTIVE_JOB_COLUMN_CATALOG,
    'urgent-calls': JOB_COLUMN_CATALOG,
  };

  function createEmptyFilters() {
    return {
      global: null, accountName: null, resident: null, address: null,
      source: [], serviceman: null, type: null, accountTypes: [],
      serviceProviders: [], serviceProviderIds: [], quoteNumber: null, invoiceNumber: null,
      recommendation: null, priceMin: null, priceMax: null,
      statuses: [], dateFrom: null, dateTo: null, allDatesFilter: null,
      xeroInvoiceStatus: null, invoiceDateFrom: null, invoiceDateTo: null,
      dueDateFrom: null, dueDateTo: null, billPaidDateFrom: null, billPaidDateTo: null,
      taskPropertySearch: null, taskDueToday: null, taskAssignedToMe: null,
      jobPreset: null,
      paymentPreset: null,
    };
  }

  function getDashboardUserKey() {
    return (config.LOGGED_IN_USER_ID && String(config.LOGGED_IN_USER_ID).trim()) || 'anonymous';
  }

  function getViewsStorageKey(tabKey) {
    return VIEW_STORAGE_PREFIX + getDashboardUserKey() + ':' + tabKey;
  }

  function getCatalogForTab(tabKey) {
    return TAB_COLUMN_CATALOGS[tabKey] || INQUIRY_COLUMN_CATALOG;
  }

  function normalizeColumns(tabKey, columnIds) {
    var catalog = getCatalogForTab(tabKey);
    var defaults = TAB_DEFAULT_COLUMN_IDS[tabKey] || TAB_DEFAULT_COLUMN_IDS.inquiry;
    var seen = {};
    var safe = (Array.isArray(columnIds) ? columnIds : [])
      .filter(function (id) { return !!catalog[id]; })
      .filter(function (id) {
        if (seen[id]) return false;
        seen[id] = true;
        return true;
      });
    if (!safe.length) safe = defaults.slice();
    if (safe.indexOf('actions') === -1) safe.push('actions');
    return safe;
  }

  function getActiveColumns(tabKey) {
    return normalizeColumns(tabKey, state.columnsByTab[tabKey]);
  }

  function getHeadersFromColumns(tabKey, columnIds) {
    var catalog = getCatalogForTab(tabKey);
    return normalizeColumns(tabKey, columnIds).map(function (id) {
      return catalog[id].header;
    });
  }

  function buildProjectionForTab(tabKey, columnIds) {
    var catalog = getCatalogForTab(tabKey);
    var ids = normalizeColumns(tabKey, columnIds);
    var selectSet = { id: true };
    var includeMap = {};
    ids.forEach(function (id) {
      var dep = (catalog[id] && catalog[id].query) || {};
      (dep.select || []).forEach(function (field) { selectSet[field] = true; });
      var include = dep.include || {};
      Object.keys(include).forEach(function (relation) {
        if (!includeMap[relation]) includeMap[relation] = {};
        (include[relation] || []).forEach(function (field) { includeMap[relation][field] = true; });
      });
    });
    var select = Object.keys(selectSet);
    var includes = {};
    Object.keys(includeMap).forEach(function (relation) {
      includes[relation] = Object.keys(includeMap[relation]);
    });
    return { select: select, includes: includes };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function cloneFilterValue(value) {
    if (Array.isArray(value)) return value.slice();
    return value;
  }

  function getDefaultView(tabKey) {
    return {
      id: 'default',
      name: 'Default',
      columns: (TAB_DEFAULT_COLUMN_IDS[tabKey] || TAB_DEFAULT_COLUMN_IDS.inquiry).slice(),
      isDefault: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function loadViewsForTab(tabKey) {
    var fallback = [getDefaultView(tabKey)];
    try {
      var raw = localStorage.getItem(getViewsStorageKey(tabKey));
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.views)) return fallback;
      var normalized = parsed.views.map(function (view, idx) {
        view = view || {};
        return {
          id: view.id || ('view-' + idx),
          name: view.name || ('View ' + (idx + 1)),
          columns: normalizeColumns(tabKey, view.columns),
          isDefault: !!view.isDefault,
          createdAt: view.createdAt || nowIso(),
          updatedAt: view.updatedAt || nowIso(),
        };
      });
      if (!normalized.length) normalized = fallback.slice();
      if (!normalized.some(function (v) { return v.id === 'default'; })) normalized.unshift(getDefaultView(tabKey));
      if (!normalized.some(function (v) { return v.isDefault; })) normalized[0].isDefault = true;
      return normalized;
    } catch (err) {
      console.warn('Failed to read dashboard views from local storage:', err);
      return fallback;
    }
  }

  function loadActiveViewIdForTab(tabKey) {
    try {
      var raw = localStorage.getItem(getViewsStorageKey(tabKey));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.activeViewId !== 'string') return null;
      return parsed.activeViewId;
    } catch (_) {
      return null;
    }
  }

  function saveViewsForTab(tabKey) {
    try {
      localStorage.setItem(getViewsStorageKey(tabKey), JSON.stringify({
        views: state.viewsByTab[tabKey] || [],
        activeViewId: state.activeViewIdByTab[tabKey] || 'default',
      }));
    } catch (err) {
      console.warn('Failed to save dashboard views to local storage:', err);
    }
  }

  function getActiveView(tabKey) {
    var activeId = state.activeViewIdByTab[tabKey];
    var views = state.viewsByTab[tabKey] || [];
    var match = views.find(function (v) { return v.id === activeId; });
    if (match) return match;
    return views[0] || getDefaultView(tabKey);
  }

  function renderViewPicker() {
    var picker = document.getElementById('dashboard-view-select');
    if (!picker) return;
    var tabKey = state.activeTab;
    var views = state.viewsByTab[tabKey] || [getDefaultView(tabKey)];
    var activeId = state.activeViewIdByTab[tabKey] || 'default';
    picker.innerHTML = '';
    views.forEach(function (view) {
      var opt = document.createElement('option');
      opt.value = view.id;
      opt.textContent = view.name + (view.isDefault ? ' (Default)' : '');
      picker.appendChild(opt);
    });
    picker.value = activeId;
  }

  function applyView(tabKey, viewId) {
    var views = state.viewsByTab[tabKey] || [];
    var view = views.find(function (v) { return v.id === viewId; });
    if (!view) return;
    state.activeViewIdByTab[tabKey] = view.id;
    state.columnsByTab[tabKey] = normalizeColumns(tabKey, view.columns);
    view.updatedAt = nowIso();
    saveViewsForTab(tabKey);
    renderViewPicker();
    fetchAndRenderCurrentTab();
  }

  function syncViewControls() {
    var editCols = document.getElementById('dashboard-edit-columns-btn');
    var saveView = document.getElementById('dashboard-save-view-btn');
    if (editCols) editCols.disabled = false;
    if (saveView) saveView.disabled = false;
    renderViewPicker();
  }

  // ─── Status Classes ────────────────────────────────────────

  var STATUS_CLASSES = {
    // Inquiry statuses
    'new inquiry': 'bg-rose-50 text-rose-500',
    'not allocated': 'bg-fuchsia-50 text-fuchsia-600',
    'contact client': 'bg-indigo-50 text-indigo-600',
    'contact for site visit': 'bg-sky-50 text-sky-600',
    'site visit scheduled': 'bg-amber-50 text-amber-600',
    'site visit to be re-scheduled': 'bg-orange-50 text-orange-600',
    'generate quote': 'bg-[#e8f0fb] text-[#003882]',
    'quote created': 'bg-emerald-50 text-emerald-600',
    'completed': 'bg-green-50 text-green-700',
    'cancelled': 'bg-slate-100 text-slate-500',
    'expired': 'bg-gray-100 text-gray-500',
    // Quote statuses
    'new': 'bg-rose-50 text-rose-500',
    'requested': 'bg-amber-50 text-amber-600',
    'sent': 'bg-sky-50 text-sky-600',
    'accepted': 'bg-emerald-50 text-emerald-600',
    'declined': 'bg-red-50 text-red-600',
    // Job statuses
    'quote': 'bg-purple-50 text-purple-600',
    'on hold': 'bg-yellow-50 text-yellow-700',
    'booked': 'bg-blue-50 text-blue-600',
    'call back': 'bg-orange-50 text-orange-600',
    'scheduled': 'bg-emerald-50 text-emerald-600',
    'reschedule': 'bg-amber-50 text-amber-600',
    'in progress': 'bg-sky-50 text-sky-600',
    'waiting for payment': 'bg-yellow-50 text-yellow-700',
    // Payment statuses
    'invoice required': 'bg-amber-50 text-amber-600',
    'invoice sent': 'bg-sky-50 text-sky-600',
    'paid': 'bg-green-50 text-green-700',
    'overdue': 'bg-red-50 text-red-600',
    'written off': 'bg-slate-100 text-slate-500',
    // Active job
    'unknown': 'bg-slate-100 text-slate-600',
  };

  function getStatusClass(statusStr) {
    if (!statusStr) return 'bg-slate-100 text-slate-600';
    return STATUS_CLASSES[statusStr.toLowerCase()] || 'bg-slate-100 text-slate-600';
  }

  function renderStatusBadge(status) {
    var cls = getStatusClass(status);
    var label = utils.escapeHtml(status || '-');
    return '<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ' + cls + '">' + label + '</span>';
  }

  function parseNumericId(rawId) {
    if (rawId == null) return '';
    var s = String(rawId).trim();
    return s.charAt(0) === '#' ? s.slice(1) : s;
  }

  function getInquiryDetailUrlFromRow(row) {
    var numericId = (row && row.recordId) || parseNumericId(row && row.id);
    if (!numericId) return '#';
    var template = config.INQUIRY_DETAIL_URL_TEMPLATE || './inquiry-detail.html?inquiry={id}';
    return template.replace(/\{id\}/g, numericId);
  }


  // ═══════════════════════════════════════════════════════════
  // CALENDAR (14-day)
  // ═══════════════════════════════════════════════════════════

  function buildCalendarDays() {
    var dayjs = window.dayjs;
    if (!dayjs) return [];
    var tz = config.TIMEZONE || 'Australia/Brisbane';
    var now = dayjs.tz ? dayjs.tz(undefined, tz).startOf('day') : dayjs().startOf('day');
    var todayIso = now.format('YYYY-MM-DD');
    var dayIndex = now.day();
    var daysFromMonday = (dayIndex + 6) % 7;
    var thisWeekMonday = now.subtract(daysFromMonday, 'day').add((state.calendarWeekOffset || 0) * 7, 'day');
    var start = thisWeekMonday.subtract(7, 'day');
    var days = [];
    for (var i = 0; i < 14; i++) {
      var d = start.add(i, 'day');
      days.push({
        iso: d.format('YYYY-MM-DD'),
        label: d.format('ddd D/M'),
        total: 0,
        isToday: d.format('YYYY-MM-DD') === todayIso,
      });
    }
    return days;
  }

  function renderCalendar(containerId) {
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    var existingTotals = {};
    (state.calendarDays || []).forEach(function (d) {
      if (d && d.iso) existingTotals[d.iso] = Number(d.total || 0);
    });
    state.calendarDays = buildCalendarDays().map(function (d) {
      d.total = existingTotals[d.iso] || 0;
      return d;
    });
    container.innerHTML = '';
    if (state.calendarDays.length) {
      var rangeLabel = document.createElement('div');
      rangeLabel.className = 'mb-1 px-1 text-[11px] font-medium text-slate-600';
      var firstLabel = state.calendarDays[0].label || '';
      var lastLabel = state.calendarDays[state.calendarDays.length - 1].label || '';
      rangeLabel.textContent = 'Showing: ' + firstLabel + ' - ' + lastLabel;
      container.appendChild(rangeLabel);
    }
    var frame = document.createElement('div');
    frame.className = 'flex w-full items-stretch gap-2';

    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'shrink-0 w-9 rounded border border-[#d3d7e2] bg-white text-slate-600 hover:bg-slate-50';
    prevBtn.setAttribute('aria-label', 'Previous week');
    prevBtn.textContent = '‹';
    prevBtn.addEventListener('click', function () {
      shiftCalendarWeeks(-1);
    });

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'shrink-0 w-9 rounded border border-[#d3d7e2] bg-white text-slate-600 hover:bg-slate-50';
    nextBtn.setAttribute('aria-label', 'Next week');
    nextBtn.textContent = '›';
    nextBtn.addEventListener('click', function () {
      shiftCalendarWeeks(1);
    });

    var strip = document.createElement('div');
    strip.className = 'flex w-full gap-0 overflow-x-auto rounded border border-[#d3d7e2] bg-white';

    var displayDays = [];
    var runningTotal = 0;
    state.calendarDays.forEach(function (day, idx) {
      runningTotal += Number(day.total || 0);
      displayDays.push(day);
      if (idx % 7 === 6) {
        displayDays.push({
          iso: null,
          label: 'Total',
          total: runningTotal,
          isTotal: true,
        });
        runningTotal = 0;
      }
    });

    displayDays.forEach(function (day, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      if (day.iso) btn.dataset.date = day.iso;
      var isTotal = !!day.isTotal;
      var isSelected = !isTotal && day.iso === state.selectedDate;
      var isToday = !isTotal && !!day.isToday;
      btn.className = 'flex-1 min-w-[86px] border-r border-[#d3d7e2] text-xs cursor-pointer transition-colors ' +
        (isTotal
          ? 'bg-[#f8fafc] text-slate-700 cursor-default'
          : isSelected
            ? 'bg-[#e3efff] text-[#003882]'
            : isToday
              ? 'bg-amber-50 text-[#003882]'
            : 'bg-white text-slate-600 hover:bg-slate-50');
      btn.innerHTML =
        '<div class="h-[38px] border-b border-[#d3d7e2] flex items-center justify-center text-[14px] font-medium">' + day.label + '</div>' +
        '<div class="h-[44px] flex items-center justify-center ' + (isTotal ? 'text-[20px]' : 'text-[28px]') + ' font-medium leading-none">' + day.total + '</div>';
      if (idx === displayDays.length - 1) btn.classList.remove('border-r');
      if (!isTotal) {
        btn.addEventListener('click', function () {
          state.selectedDate = day.iso;
          renderCalendar(container);
          renderAppliedFilters();
          fetchAndRenderCurrentTab();
        });
      }
      strip.appendChild(btn);
    });

    frame.appendChild(prevBtn);
    frame.appendChild(strip);
    frame.appendChild(nextBtn);
    container.appendChild(frame);
  }

  function shiftCalendarWeeks(deltaWeeks) {
    var delta = Number(deltaWeeks) || 0;
    if (!delta) return;
    state.calendarWeekOffset = Number(state.calendarWeekOffset || 0) + delta;
    state.selectedDate = null;
    renderCalendar('calendar-grid');
    renderAppliedFilters();
    refreshCalendarCountsForActiveTab();
    fetchAndRenderCurrentTab();
  }

  function getGraphQLEndpoint() {
    var base = (config.API_BASE || ('https://' + (config.SLUG || 'peterpm') + '.vitalstats.app')).replace(/\/+$/, '');
    return base + '/api/v1/graphql';
  }

  function getApiKey() {
    return (config.API_KEY && String(config.API_KEY).trim()) || (window.__MOCK_API_KEY__ && String(window.__MOCK_API_KEY__).trim()) || '';
  }

  function getServiceProviderDisplayName(row) {
    row = row || {};
    var first = String(row.first_name || row.contact_first_name || row.contact_information_first_name || '').trim();
    var last = String(row.last_name || row.contact_last_name || row.contact_information_last_name || '').trim();
    var full = [first, last].filter(Boolean).join(' ').trim();
    if (full) return full;
    var fallback = String(row.account_name || row.name || '').trim();
    return fallback || '';
  }

  function fetchServiceProviders() {
    var apiKey = getApiKey();
    if (!apiKey) return Promise.resolve([]);
    var query = [
      'query DashboardServiceProviders {',
      '  calcServiceProviders(',
      '    query: [{ where: { type: "Service Provider" } }]',
      '    limit: 500',
      '    offset: 0',
      '  ) {',
      '    id: field(arg: ["id"])',
      '    first_name: field(arg: ["Contact_Information", "first_name"])',
      '    last_name: field(arg: ["Contact_Information", "last_name"])',
      '  }',
      '}',
    ].join('\n');

    return fetch(getGraphQLEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({ query: query }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'GraphQL error');
        var rows = (json.data && json.data.calcServiceProviders) || [];
        var unique = {};
        rows.forEach(function (row) {
          var id = String(row && row.id != null ? row.id : '').trim();
          var label = getServiceProviderDisplayName(row);
          if (!id || !label) return;
          unique[id] = { id: id, name: label };
        });
        return Object.keys(unique)
          .map(function (id) { return unique[id]; })
          .sort(function (a, b) { return a.name.localeCompare(b.name); });
      });
  }

  function renderServiceProviderOptions(names) {
    var card = document.getElementById('service-provider-filter-card');
    if (!card) return;
    var list = card.querySelector('ul');
    if (!list) return;

    var selectedMap = {};
    Array.from(card.querySelectorAll('input[type="checkbox"][data-service-provider]:checked')).forEach(function (cb) {
      var key = String(cb.value || '').trim();
      if (key) selectedMap[key] = true;
    });
    if (Array.isArray(state.filters.serviceProviderIds)) {
      state.filters.serviceProviderIds.forEach(function (id) {
        var key = String(id || '').trim();
        if (key) selectedMap[key] = true;
      });
    }

    list.innerHTML = '';
    (names || []).forEach(function (provider, idx) {
      var id = String(provider && provider.id != null ? provider.id : '').trim();
      var name = String(provider && provider.name ? provider.name : '').trim();
      if (!id || !name) return;
      var item = document.createElement('li');
      item.className = 'px-2 py-1 flex items-center gap-2';
      var checkboxId = 'service-provider-option-' + idx;
      var checkedAttr = selectedMap[id] ? ' checked' : '';
      item.innerHTML =
        '<input id="' + checkboxId + '" data-service-provider data-provider-label="' + utils.escapeHtml(name) + '" value="' + utils.escapeHtml(id) + '" type="checkbox" class="h-4 w-4 accent-[#003882]"' + checkedAttr + '>' +
        '<label for="' + checkboxId + '">' + utils.escapeHtml(name) + '</label>';
      list.appendChild(item);
    });
  }

  function hydrateServiceProviderFilter() {
    return fetchServiceProviders()
      .then(function (names) {
        if (!Array.isArray(names) || !names.length) return;
        renderServiceProviderOptions(names);
      })
      .catch(function (err) {
        console.warn('Service provider filter options failed to load:', err);
      });
  }

  function getCalendarCountConfig(tabKey) {
    var urgentCallsField = (config && config.JOBS_TO_CHECK_URGENT_FIELD) || 'Urgent_Calls';
    var map = {
      inquiry: {
        calcRoot: 'calcDeals',
        dateField: 'created_at',
        countModel: 'id',
        extraPredicates: [],
      },
      jobs: {
        calcRoot: 'calcJobs',
        dateField: 'date_booked',
        countModel: 'id',
        extraPredicates: ['{ andWhereNot: { job_status: null, _OPERATOR_: isNull } }'],
      },
      quote: {
        calcRoot: 'calcJobs',
        dateField: 'quote_date',
        countModel: 'id',
        extraPredicates: ['{ andWhereNot: { quote_status: null, _OPERATOR_: isNull } }'],
      },
      payment: {
        calcRoot: 'calcJobs',
        dateField: 'invoice_date',
        countModel: 'id',
        extraPredicates: ['{ andWhereNot: { xero_invoice_status: null, _OPERATOR_: isNull } }'],
      },
      'active-jobs': {
        calcRoot: 'calcJobs',
        dateField: 'date_active_job_accepted',
        countModel: 'id',
        extraPredicates: [
          '{ andWhereNot: { job_status: "completed" } }',
          '{ andWhereNot: { job_status: "cancelled" } }',
        ],
      },
      'urgent-calls': {
        calcRoot: 'calcJobs',
        dateField: 'date_booked',
        countModel: 'id',
        extraPredicates: ['{ andWhere: { ' + urgentCallsField + ': 0, _OPERATOR_: gt } }'],
      },
    };
    return map[tabKey] || map.jobs;
  }

  function fetchUrgentBadgeCount() {
    var dayjs = window.dayjs;
    if (!dayjs || !state.calendarDays.length) return Promise.resolve();
    var apiKey = getApiKey();
    if (!apiKey) return Promise.resolve();

    var tz = config.TIMEZONE || 'Australia/Brisbane';
    var firstIso = state.calendarDays[0].iso;
    var lastIso = state.calendarDays[state.calendarDays.length - 1].iso;
    if (!firstIso || !lastIso) return Promise.resolve();

    var first = dayjs.tz ? dayjs.tz(firstIso, tz).startOf('day') : dayjs(firstIso).startOf('day');
    var last = dayjs.tz ? dayjs.tz(lastIso, tz).endOf('day') : dayjs(lastIso).endOf('day');
    var urgentCfg = getCalendarCountConfig('urgent-calls');
    var query = [
      'query DashboardUrgentCount($X_WEEK_BEGIN: TimestampSecondsScalar!, $X_WEEK_END: TimestampSecondsScalar!, $limit: IntScalar, $offset: IntScalar) {',
      '  calcJobs(',
      '    query: [',
      '      { where: { ' + urgentCfg.dateField + ': $X_WEEK_BEGIN, _OPERATOR_: gte } }',
      '      { andWhere: { ' + urgentCfg.dateField + ': $X_WEEK_END, _OPERATOR_: lte } }',
      '      { andWhere: { ' + ((config && config.JOBS_TO_CHECK_URGENT_FIELD) || 'Urgent_Calls') + ': 0, _OPERATOR_: gt } }',
      '    ]',
      '    limit: $limit',
      '    offset: $offset',
      '  ) {',
      '    urgent_count: count(args: [{ field: ["id"] }])',
      '  }',
      '}',
    ].join('\n');

    var vars = {
      X_WEEK_BEGIN: first.unix(),
      X_WEEK_END: last.unix(),
      limit: 1,
      offset: 0,
    };

    return fetch(getGraphQLEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({ query: query, variables: vars }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'GraphQL error');
        var rows = (json.data && json.data.calcJobs) || [];
        var count = Number(rows[0] && rows[0].urgent_count);
        var next = Number.isFinite(count) ? count : 0;
        if (next !== state.urgentCount) {
          state.urgentCount = next;
          if (currentTabNavId) renderTabs(currentTabNavId);
        }
      })
      .catch(function (err) {
        console.warn('Urgent badge count failed:', err);
      });
  }

  function fetchCalendarCountsForActiveTab() {
    var dayjs = window.dayjs;
    if (!dayjs || !state.calendarDays.length) return Promise.resolve();
    var apiKey = getApiKey();
    if (!apiKey) return Promise.resolve();

    var tz = config.TIMEZONE || 'Australia/Brisbane';
    var firstIso = state.calendarDays[0].iso;
    var lastIso = state.calendarDays[state.calendarDays.length - 1].iso;
    if (!firstIso || !lastIso) return Promise.resolve();

    var first = dayjs.tz ? dayjs.tz(firstIso, tz).startOf('day') : dayjs(firstIso).startOf('day');
    var last = dayjs.tz ? dayjs.tz(lastIso, tz).endOf('day') : dayjs(lastIso).endOf('day');
    var tabKey = state.activeTab;
    var countCfg = getCalendarCountConfig(tabKey);

    var queryParts = [
      'query DashboardCounts($X_WEEK_BEGIN: TimestampSecondsScalar!, $X_WEEK_END: TimestampSecondsScalar!, $limit: IntScalar, $offset: IntScalar) {',
      '  ' + countCfg.calcRoot + '(',
      '    query: [',
      '      { where: { ' + countCfg.dateField + ': $X_WEEK_BEGIN, _OPERATOR_: gte } }',
      '      { andWhere: { ' + countCfg.dateField + ': $X_WEEK_END, _OPERATOR_: lte } }',
    ];
    (countCfg.extraPredicates || []).forEach(function (line) { queryParts.push('      ' + line); });
    queryParts = queryParts.concat([
      '    ]',
      '    limit: $limit',
      '    offset: $offset',
      '    orderBy: [{ path: ["' + countCfg.dateField + '"], type: asc }]',
      '  ) {',
      '    bucket_day: field(arg: ["' + countCfg.dateField + '"]) @dateFormat(value: "YYYY-MM-DD")',
      '    bucket_count: count(args: [{ field: ["' + countCfg.countModel + '"] }])',
      '  }',
      '}',
    ]);

    var query = queryParts.join('\n');

    var vars = {
      X_WEEK_BEGIN: first.unix(),
      X_WEEK_END: last.unix(),
      limit: 500,
      offset: 0,
    };

    return fetch(getGraphQLEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({ query: query, variables: vars }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'GraphQL error');
        var rows = (json.data && json.data[countCfg.calcRoot]) || [];
        var countsByIso = {};
        rows.forEach(function (row) {
          var iso = row && row.bucket_day ? String(row.bucket_day).trim() : '';
          if (!iso) return;
          var count = Number(row && row.bucket_count);
          countsByIso[iso] = Number.isFinite(count) ? count : 0;
        });
        if (config.DEBUG) {
          var total = Object.keys(countsByIso).reduce(function (sum, k) { return sum + (countsByIso[k] || 0); }, 0);
          console.log('[dashboard-count-debug]', tabKey, 'bucketTotal=', total, countsByIso);
        }
        if (tabKey === 'urgent-calls') {
          var urgentTotal = Object.keys(countsByIso).reduce(function (sum, k) { return sum + (countsByIso[k] || 0); }, 0);
          if (urgentTotal !== state.urgentCount) {
            state.urgentCount = urgentTotal;
            if (currentTabNavId) renderTabs(currentTabNavId);
          }
        }
        state.calendarDays = state.calendarDays.map(function (d) {
          return {
            iso: d.iso,
            label: d.label,
            total: countsByIso[d.iso] || 0,
            isToday: !!d.isToday,
          };
        });
        renderCalendar('calendar-grid');
      })
      .catch(function (err) {
        console.warn('Calendar count failed for tab "' + tabKey + '":', err);
      });
  }

  function refreshCalendarCountsForActiveTab() {
    return fetchCalendarCountsForActiveTab()
      .then(fetchUrgentBadgeCount);
  }


  // ═══════════════════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════════════════

  var TABS = [
    { key: 'inquiry', label: 'Inquiry' },
    { key: 'quote', label: 'Quote' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'payment', label: 'Payment' },
    { key: 'active-jobs', label: 'Active Jobs' },
    { key: 'urgent-calls', label: 'Urgent Calls', badgeKey: 'urgentCount' },
  ];

  function renderTabs(navId) {
    var nav = typeof navId === 'string' ? document.getElementById(navId) : navId;
    if (!nav) return;

    nav.innerHTML = '';
    TABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.tab = tab.key;
      var isActive = tab.key === state.activeTab;
      btn.className = 'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap inline-flex items-center gap-2 ' +
        (isActive
          ? 'bg-white text-[' + brandColor + '] border-b-2 border-[' + brandColor + ']'
          : 'text-slate-600 hover:text-slate-800');
      btn.textContent = tab.label;
      if (tab.badgeKey === 'urgentCount' && state.urgentCount != null && state.urgentCount > 0) {
        var badge = document.createElement('span');
        badge.className = 'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700';
        badge.textContent = state.urgentCount;
        btn.appendChild(badge);
      }
      btn.addEventListener('click', function () {
        if (state.activeTab === tab.key) return;
        state.activeTab = tab.key;
        state.currentPage = 1;
        renderTabs(nav);
        syncViewControls();
        refreshCalendarCountsForActiveTab();
        fetchAndRenderCurrentTab();
        syncJobsTabActionsState();
      });
      nav.appendChild(btn);
    });
  }


  // ═══════════════════════════════════════════════════════════
  // TABLE COLUMN DEFINITIONS
  // ═══════════════════════════════════════════════════════════

  function getInquiryHeaders() {
    return getHeadersFromColumns('inquiry', getActiveColumns('inquiry'));
  }

  function getJobHeaders() {
    return getHeadersFromColumns('jobs', getActiveColumns('jobs'));
  }

  function getQuoteHeaders() {
    return getHeadersFromColumns('quote', getActiveColumns('quote'));
  }

  function getPaymentHeaders() {
    return getHeadersFromColumns('payment', getActiveColumns('payment'));
  }

  function getActiveJobHeaders() {
    return getHeadersFromColumns('active-jobs', getActiveColumns('active-jobs'));
  }


  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING & TABLE RENDERING
  // ═══════════════════════════════════════════════════════════

  var tableContainerEl = null;

  function buildFiltersForTab(tab, opts) {
    opts = opts || {};
    var includeSelectedDate = opts.includeSelectedDate !== false;
    var filtersForTab = Object.assign({}, state.filters);
    var tabSort = state.sortByTab[tab] || null;

    Object.keys(filtersForTab).forEach(function (key) {
      filtersForTab[key] = cloneFilterValue(filtersForTab[key]);
    });

    if (includeSelectedDate && state.selectedDate) {
      var dayjs = window.dayjs;
      var tz = config.TIMEZONE || 'Australia/Brisbane';
      var startOfDay = dayjs && dayjs.tz
        ? dayjs.tz(state.selectedDate, tz).startOf('day')
        : (dayjs ? dayjs(state.selectedDate).startOf('day') : null);
      var endOfDay = dayjs && dayjs.tz
        ? dayjs.tz(state.selectedDate, tz).endOf('day')
        : (dayjs ? dayjs(state.selectedDate).endOf('day') : null);
      if (startOfDay && endOfDay) {
        filtersForTab.calendarDateIso = state.selectedDate;
        filtersForTab.calendarDateStartEpoch = startOfDay.unix();
        filtersForTab.calendarDateEndEpoch = endOfDay.unix();
      }
    }
    if (tabSort && tabSort.field) {
      filtersForTab.sortBy = tabSort.field;
      filtersForTab.sortDirection = tabSort.direction || 'desc';
    } else {
      filtersForTab.sortBy = null;
      filtersForTab.sortDirection = null;
    }

    if (tab === 'inquiry') {
      filtersForTab.inquiryProjection = buildProjectionForTab('inquiry', getActiveColumns('inquiry'));
    } else if (tab === 'quote') {
      filtersForTab.quoteProjection = buildProjectionForTab('quote', getActiveColumns('quote'));
    } else if (tab === 'jobs') {
      filtersForTab.jobProjection = buildProjectionForTab('jobs', getActiveColumns('jobs'));
    } else if (tab === 'payment') {
      filtersForTab.paymentProjection = buildProjectionForTab('payment', getActiveColumns('payment'));
    } else if (tab === 'active-jobs') {
      filtersForTab.activeJobProjection = buildProjectionForTab('active-jobs', getActiveColumns('active-jobs'));
    } else if (tab === 'urgent-calls') {
      filtersForTab.urgentOnly = true;
      filtersForTab.jobProjection = buildProjectionForTab('urgent-calls', getActiveColumns('urgent-calls'));
    }

    return filtersForTab;
  }

  function fetchAndRenderCurrentTab() {
    if (!tableContainerEl) return;
    var tab = state.activeTab;
    var offset = (state.currentPage - 1) * state.pageSize;

    utils.showPageLoader('Loading ' + tab + '...');
    tbl.clearTable(tableContainerEl);

    var promise;
    var headers;
    var rowsKey;

    var tabSort = state.sortByTab[tab] || null;
    var filtersForTab = buildFiltersForTab(tab, { includeSelectedDate: true });

    switch (tab) {
      case 'inquiry':
        headers = getInquiryHeaders();
        promise = domain.inquiry.fetchInquiries({
          filters: filtersForTab,
          limit: state.pageSize,
          offset: offset,
        });
        break;
      case 'quote':
        headers = getQuoteHeaders();
        promise = domain.quote.fetchQuotes(filtersForTab, state.pageSize, offset);
        break;
      case 'jobs':
        headers = getJobHeaders();
        promise = domain.job.fetchJobs(filtersForTab, state.pageSize, offset);
        break;
      case 'payment':
        headers = getPaymentHeaders();
        promise = domain.payment.fetchPayments(filtersForTab, state.pageSize, offset);
        break;
      case 'active-jobs':
        headers = getActiveJobHeaders();
        promise = domain.activeJob.fetchActiveJobs(filtersForTab, state.pageSize, offset);
        break;
      case 'urgent-calls':
        headers = getHeadersFromColumns('urgent-calls', getActiveColumns('urgent-calls'));
        promise = domain.job.fetchJobs(filtersForTab, state.pageSize, offset);
        break;
      default:
        utils.hidePageLoader();
        return;
    }

    promise
      .then(function (result) {
        state.totalCount = result.totalCount || 0;
        state.totalPages = result.totalPages || 1;

        tbl.renderDynamicTable({
          container: tableContainerEl,
          headers: headers,
          rows: result.rows || [],
          sortState: tabSort,
          onSort: function (sortField) {
            var current = state.sortByTab[tab] || null;
            var nextDirection = 'desc';
            if (current && current.field === sortField) {
              nextDirection = current.direction === 'desc' ? 'asc' : 'desc';
            }
            state.sortByTab[tab] = { field: sortField, direction: nextDirection };
            state.currentPage = 1;
            fetchAndRenderCurrentTab();
          },
          zebra: true,
          tableClass: 'w-full text-xs text-slate-700',
          theadClass: 'bg-[#f5f5f5] text-[#414042] border-b border-[#d3d7e2]',
          defaultHeaderClass: 'px-4 py-3 text-left font-medium text-[12px] leading-4',
          defaultCellClass: 'px-4 py-4 text-[#414042] text-xs leading-4 align-top',
          emptyState: 'No records found.',
        });

        updatePagination();
        updateRecordCount();
        if (config.DEBUG && state.selectedDate) {
          var selectedBucket = (state.calendarDays || []).find(function (d) { return d.iso === state.selectedDate; });
          if (selectedBucket) {
            var bucketValue = Number(selectedBucket.total || 0);
            var rowTotal = Number(result.totalCount || 0);
            var dateField = (getCalendarCountConfig(tab) || {}).dateField || 'n/a';
            console.log(
              '[dashboard-count-debug-row-compare]',
              tab,
              state.selectedDate,
              'dateField=', dateField,
              'bucket=', bucketValue,
              'rows=', rowTotal
            );
            if (bucketValue !== rowTotal) {
              console.warn(
                '[dashboard-count-debug-mismatch]',
                tab,
                state.selectedDate,
                'dateField=', dateField,
                'bucket=', bucketValue,
                'rows=', rowTotal,
                'possible cause: date-field mapping/timezone/query predicate mismatch'
              );
            }
          }
        }
      })
      .catch(function (err) {
        console.error('Error fetching ' + tab + ':', err);
        tbl.renderDynamicTable({
          container: tableContainerEl,
          headers: headers,
          rows: [],
          emptyState: 'Error loading data. Please try again.',
        });
      })
      .finally(function () {
        utils.hidePageLoader();
        syncJobsTabActionsState();
      });
  }


  // ─── Pagination ────────────────────────────────────────────

  function updatePagination() {
    if (state.pagination) {
      state.pagination.setTotalPages(state.totalPages);
      state.pagination.goToPage(state.currentPage);
    }
  }

  function initPagination() {
    var container = document.getElementById('pagination-pages');
    if (!container) return;

    state.pagination = tbl.createPagination({
      container: '#pagination-pages',
      prevBtn: '#lt-btn',
      nextBtn: '#gt-btn',
      totalPages: state.totalPages,
      currentPage: state.currentPage,
      pageGroupSize: 5,
      onPageChange: function (page) {
        state.currentPage = page;
        fetchAndRenderCurrentTab();
      },
    });
  }

  function updateRecordCount() {
    var el = document.getElementById('record-count');
    if (el) {
      var start = (state.currentPage - 1) * state.pageSize + 1;
      var end = Math.min(state.currentPage * state.pageSize, state.totalCount);
      el.textContent = state.totalCount > 0
        ? start + '-' + end + ' of ' + state.totalCount
        : '0 records';
    }
  }


  // ═══════════════════════════════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════════════════════════════

  function collectAllFiltersFromUI() {
    var byId = function (id) { return document.getElementById(id); };
    var val = function (id) { var el = byId(id); return el ? (el.value || '').trim() : ''; };
    var toNum = function (x) { var n = Number(x); return Number.isFinite(n) ? n : null; };
    var nz = function (s) { return (s && s.length) ? s : null; };

    // Source checkboxes
    var sourceCard = byId('source-filter-card');
    var sources = sourceCard
      ? Array.from(sourceCard.querySelectorAll('input[type="checkbox"][data-source]:checked'))
          .map(function (c) { return (c.value || '').trim(); }).filter(Boolean)
      : [];

    // Status checkboxes
    var statusCard = byId('status-filter-card');
    var statuses = statusCard
      ? Array.from(statusCard.querySelectorAll('input[type="checkbox"][data-status]:checked'))
          .map(function (c) { return (c.value || '').toString().trim().toLowerCase(); })
      : [];

    // Account type checkboxes
    var typeCard = byId('account-type-filter-card');
    var accountTypes = typeCard
      ? Array.from(typeCard.querySelectorAll('input[type="checkbox"][data-account-type]:checked'))
          .map(function (c) { return (c.dataset.accountType || c.value || '').trim(); }).filter(Boolean)
      : [];

    // Service provider checkboxes
    var spCard = byId('service-provider-filter-card');
    var selectedProviderCheckboxes = spCard
      ? Array.from(spCard.querySelectorAll('input[type="checkbox"][data-service-provider]:checked'))
      : [];
    var servicemanText = nz(val('filter-serviceman'));
    if (servicemanText && spCard) {
      var lowered = String(servicemanText).toLowerCase();
      var allProviderCheckboxes = Array.from(spCard.querySelectorAll('input[type="checkbox"][data-service-provider]'));
      var inferred = allProviderCheckboxes.filter(function (cb) {
        var label = String(cb.getAttribute('data-provider-label') || '').toLowerCase();
        return label.indexOf(lowered) !== -1;
      });
      if (inferred.length) {
        var existingIds = {};
        selectedProviderCheckboxes.forEach(function (cb) {
          existingIds[String(cb.value || '').trim()] = true;
        });
        inferred.forEach(function (cb) {
          var id = String(cb.value || '').trim();
          if (id && !existingIds[id]) selectedProviderCheckboxes.push(cb);
        });
      }
    }
    var serviceProviderIds = selectedProviderCheckboxes
      .map(function (c) { return (c.value || '').trim(); })
      .filter(Boolean);
    var serviceProviders = selectedProviderCheckboxes
      .map(function (c) { return (c.getAttribute('data-provider-label') || '').trim(); })
      .filter(Boolean);
    var minSlider = byId('price-range-min-slider');
    var maxSlider = byId('price-range-max-slider');
    var minInputVal = toNum(val('price-min'));
    var maxInputVal = toNum(val('price-max'));
    var defaultMin = minSlider ? Number(minSlider.min || 0) : null;
    var defaultMax = maxSlider ? Number(maxSlider.max || 0) : null;
    var hasDefaultRange =
      Number.isFinite(defaultMin) &&
      Number.isFinite(defaultMax) &&
      minInputVal === defaultMin &&
      maxInputVal === defaultMax;

    return {
      global: nz(val('global-search')),
      accountName: nz(val('filter-account-name')),
      resident: nz(val('filter-resident')),
      address: nz(val('filter-address')),
      source: sources.length ? sources : [],
      serviceman: nz(val('filter-serviceman')),
      accountTypes: accountTypes,
      serviceProviders: serviceProviders,
      serviceProviderIds: serviceProviderIds,
      quoteNumber: nz(val('filter-quote-number')),
      invoiceNumber: nz(val('filter-invoice-number')),
      recommendation: nz(val('filter-recommendation')),
      priceMin: hasDefaultRange ? null : minInputVal,
      priceMax: hasDefaultRange ? null : maxInputVal,
      statuses: statuses,
      dateFrom: nz(val('date-from')),
      dateTo: nz(val('date-to')),
      allDatesFilter: nz(val('filter-all-dates')),
      xeroInvoiceStatus: nz(val('xero-invoice-status')),
      invoiceDateFrom: nz(val('invoice-date-from')),
      invoiceDateTo: nz(val('invoice-date-to')),
      dueDateFrom: nz(val('due-date-from')),
      dueDateTo: nz(val('due-date-to')),
      billPaidDateFrom: nz(val('bill-paid-date-from')),
      billPaidDateTo: nz(val('bill-paid-date-to')),
      taskPropertySearch: nz(val('task-property-search')),
      taskDueToday: (byId('task-due-today') && byId('task-due-today').checked) || null,
      taskAssignedToMe: (byId('task-assigned-to-me') && byId('task-assigned-to-me').checked) || null,
    };
  }


  // ─── Filter Chips ──────────────────────────────────────────

  function renderAppliedFilters() {
    var root = document.getElementById('filter-applied');
    if (!root) return;

    var f = state.filters;
    var chips = [];

    function addChip(key, label, value) {
      if (value == null) return;
      var text = '';
      if (Array.isArray(value)) {
        if (!value.length) return;
        text = value.join(', ');
      } else {
        text = String(value).trim();
      }
      if (!text) return;
      chips.push(
        '<div data-chip-key="' + key + '" class="px-3 py-2 bg-sky-100 rounded-[20px] outline outline-1 outline-offset-[-1px] outline-blue-700 flex justify-center items-center gap-1 mr-2">' +
        '<div class="text-blue-700 text-xs font-normal leading-3">' + label + ': ' + utils.escapeHtml(text) + '</div>' +
        '<button type="button" class="w-3 h-3 remove-chip" aria-label="Remove ' + label + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 3 24 24" class="w-4 h-4 fill-[#003882]"><path d="M6.225 4.811a1 1 0 0 0-1.414 1.414L10.586 12l-5.775 5.775a1 1 0 1 0 1.414 1.414L12 13.414l5.775 5.775a1 1 0 0 0 1.414-1.414L13.414 12l5.775-5.775a1 1 0 0 0-1.414-1.414L12 10.586 6.225 4.811z"></path></svg>' +
        '</button></div>'
      );
    }

    addChip('statuses', 'Status', f.statuses);
    addChip('global', 'Search', f.global);
    addChip('accountTypes', 'Account Types', f.accountTypes);
    addChip('serviceProviders', 'Service Provider', f.serviceProviders);
    addChip('accountName', 'Account Name', f.accountName);
    addChip('resident', 'Resident', f.resident);
    addChip('address', 'Address', f.address);
    addChip('source', 'Source', f.source);
    addChip('serviceman', 'Serviceman', f.serviceman);
    addChip('quoteNumber', 'Quote #', f.quoteNumber);
    addChip('invoiceNumber', 'Invoice #', f.invoiceNumber);
    addChip('recommendation', 'Recommendation', f.recommendation);
    if (f.priceMin != null || f.priceMax != null) {
      addChip('priceRange', 'Price', (f.priceMin || '') + ' - ' + (f.priceMax || ''));
    }
    if (f.dateFrom || f.dateTo) {
      addChip('dateRange', 'Date', (f.dateFrom || '') + ' - ' + (f.dateTo || ''));
    }
    addChip('xeroInvoiceStatus', 'Xero Status', f.xeroInvoiceStatus);
    if (state.selectedDate) {
      var dayjs = window.dayjs;
      var dayLabel = state.selectedDate;
      if (dayjs) {
        var d = dayjs(state.selectedDate);
        if (d && d.isValid && d.isValid()) dayLabel = d.format('ddd D/M');
      }
      addChip('calendarDate', 'Day', dayLabel);
    }
    if (f.jobPreset === 'jobs-to-check') addChip('jobPreset', 'Batch', 'Jobs To Check');
    if (f.jobPreset === 'email-list-to-serviceman') addChip('jobPreset', 'Batch', 'Email List to Serviceman');
    if (f.jobPreset === 'show-active-jobs') {
      var activeLabel = (Array.isArray(f.serviceProviders) && f.serviceProviders[0]) ? f.serviceProviders[0] : 'Selected serviceman';
      addChip('jobPreset', 'Batch', 'Active jobs: ' + activeLabel);
    }
    if (f.paymentPreset === 'list-unpaid-invoices') addChip('paymentPreset', 'Batch', 'List Unpaid Invoices');
    if (f.paymentPreset === 'list-part-payments') addChip('paymentPreset', 'Batch', 'List Part Payments');

    var hasChips = chips.length > 0;
    var clearAllBtn = hasChips
      ? '<button id="clear-all-filters" type="button" class="px-1 text-slate-500 text-sm font-medium whitespace-nowrap leading-4">Clear All</button>'
      : '';

    root.innerHTML = chips.join('') + clearAllBtn;

    // Attach remove handlers
    root.querySelectorAll('.remove-chip').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var chip = e.currentTarget.closest('[data-chip-key]');
        if (!chip) return;
        var key = chip.getAttribute('data-chip-key');
        removeFilterByKey(key);
      });
    });

    var clearAll = root.querySelector('#clear-all-filters');
    if (clearAll) {
      clearAll.addEventListener('click', clearAllFilters);
    }
  }

  function removeFilterByKey(key) {
    var f = state.filters;
    switch (key) {
      case 'statuses': f.statuses = []; break;
      case 'global': f.global = null; break;
      case 'accountTypes': f.accountTypes = []; break;
      case 'serviceProviders': f.serviceProviders = []; f.serviceProviderIds = []; break;
      case 'accountName': f.accountName = null; break;
      case 'resident': f.resident = null; break;
      case 'address': f.address = null; break;
      case 'source': f.source = []; break;
      case 'serviceman': f.serviceman = null; break;
      case 'quoteNumber': f.quoteNumber = null; break;
      case 'invoiceNumber': f.invoiceNumber = null; break;
      case 'recommendation': f.recommendation = null; break;
      case 'priceRange': f.priceMin = null; f.priceMax = null; break;
      case 'dateRange': f.dateFrom = null; f.dateTo = null; break;
      case 'xeroInvoiceStatus': f.xeroInvoiceStatus = null; break;
      case 'calendarDate':
      case 'calendardate':
        state.selectedDate = null;
        renderCalendar('calendar-grid');
        break;
      case 'jobPreset': f.jobPreset = null; break;
      case 'paymentPreset': f.paymentPreset = null; break;
    }
    renderAppliedFilters();
    state.currentPage = 1;
    fetchAndRenderCurrentTab();
  }

  function applyJobsToCheckPreset() {
    state.activeTab = 'jobs';
    state.currentPage = 1;
    state.filters = createEmptyFilters();
    state.filters.jobPreset = 'jobs-to-check';
    renderTabs(currentTabNavId);
    renderAppliedFilters();
    fetchAndRenderCurrentTab();
    if (utils.showToast) utils.showToast('Applied: Jobs To Check', 'info');
  }

  function getMissingServicemanDateRequirements(filters) {
    var f = filters || {};
    var missing = [];
    var hasSingleProvider = Array.isArray(f.serviceProviderIds) && f.serviceProviderIds.length === 1;
    var hasStart = !!(f.dateFrom && String(f.dateFrom).trim());
    var hasEnd = !!(f.dateTo && String(f.dateTo).trim());
    if (!hasSingleProvider) missing.push('Select exactly one service person');
    if (!hasStart) missing.push('Set Start Date');
    if (!hasEnd) missing.push('Set End Date');
    return missing;
  }

  function canRunServicemanDateActions(filters) {
    return getMissingServicemanDateRequirements(filters).length === 0;
  }

  function canRunEmailListToServiceman(filters) {
    return canRunServicemanDateActions(filters);
  }

  function applyShowActiveJobsPreset() {
    var uiFilters = collectAllFiltersFromUI();
    var missing = getMissingServicemanDateRequirements(uiFilters);
    if (missing.length) {
      if (utils.showToast) utils.showToast(missing.join('. ') + '.', 'error');
      return;
    }

    var nextFilters = createEmptyFilters();
    var preserveKeys = [
      'global', 'accountName', 'resident', 'address', 'source', 'accountTypes',
      'quoteNumber', 'invoiceNumber', 'recommendation', 'priceMin', 'priceMax',
      'statuses', 'allDatesFilter',
    ];
    preserveKeys.forEach(function (key) {
      nextFilters[key] = cloneFilterValue(uiFilters[key]);
    });

    nextFilters.jobPreset = 'show-active-jobs';
    nextFilters.serviceProviders = uiFilters.serviceProviders.slice(0, 1);
    nextFilters.serviceProviderIds = uiFilters.serviceProviderIds.slice(0, 1);
    nextFilters.dateFrom = uiFilters.dateFrom;
    nextFilters.dateTo = uiFilters.dateTo;

    state.activeTab = 'jobs';
    state.currentPage = 1;
    state.selectedDate = null;
    state.filters = nextFilters;

    renderTabs(currentTabNavId);
    syncViewControls();
    renderAppliedFilters();
    refreshCalendarCountsForActiveTab();
    fetchAndRenderCurrentTab();
    syncJobsTabActionsState();
    if (utils.showToast) utils.showToast('Applied: Active Jobs for selected serviceman/date range', 'info');
  }

  function applyEmailListToServicemanPreset() {
    var uiFilters = collectAllFiltersFromUI();
    if (!canRunEmailListToServiceman(uiFilters)) {
      if (utils.showToast) utils.showToast('Select exactly one service person and both Start Date + End Date first.', 'error');
      return;
    }

    state.activeTab = 'jobs';
    state.currentPage = 1;
    state.filters = createEmptyFilters();
    state.filters.jobPreset = 'email-list-to-serviceman';
    state.filters.serviceProviders = uiFilters.serviceProviders.slice(0, 1);
    state.filters.serviceProviderIds = uiFilters.serviceProviderIds.slice(0, 1);
    state.filters.dateFrom = uiFilters.dateFrom;
    state.filters.dateTo = uiFilters.dateTo;
    renderTabs(currentTabNavId);
    renderAppliedFilters();
    fetchAndRenderCurrentTab();
    if (utils.showToast) utils.showToast('Applied: Email List to Serviceman segment', 'info');
    if (!config.N8N_BATCH_EMAIL_WEBHOOK_URL && utils.showToast) {
      utils.showToast('Webhook send is deferred until n8n is configured.', 'info');
    }
  }

  function applyListUnpaidInvoicesPreset() {
    state.activeTab = 'payment';
    state.currentPage = 1;
    state.filters = createEmptyFilters();
    state.filters.paymentPreset = 'list-unpaid-invoices';
    renderTabs(currentTabNavId);
    renderAppliedFilters();
    fetchAndRenderCurrentTab();
    if (utils.showToast) utils.showToast('Applied: List Unpaid Invoices', 'info');
  }

  function applyListPartPaymentsPreset() {
    state.activeTab = 'payment';
    state.currentPage = 1;
    state.filters = createEmptyFilters();
    state.filters.paymentPreset = 'list-part-payments';
    renderTabs(currentTabNavId);
    renderAppliedFilters();
    fetchAndRenderCurrentTab();
    if (utils.showToast) utils.showToast('Applied: List Part Payments', 'info');
  }

  function clearAllFilters() {
    state.filters = createEmptyFilters();
    state.selectedDate = null;
    // Reset UI inputs
    var textIds = [
      'filter-account-name', 'filter-resident', 'filter-address', 'filter-serviceman',
      'filter-quote-number', 'filter-invoice-number', 'filter-recommendation',
      'global-search', 'date-from', 'date-to', 'xero-invoice-status',
      'invoice-date-from', 'invoice-date-to', 'due-date-from', 'due-date-to',
      'bill-paid-date-from', 'bill-paid-date-to', 'task-property-search',
    ];
    textIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var minSlider = document.getElementById('price-range-min-slider');
    var maxSlider = document.getElementById('price-range-max-slider');
    var minInput = document.getElementById('price-min');
    var maxInput = document.getElementById('price-max');
    var minLabel = document.getElementById('price-range-min-label');
    var maxLabel = document.getElementById('price-range-max-label');
    if (minSlider && maxSlider) {
      minSlider.value = String(minSlider.min || 0);
      maxSlider.value = String(maxSlider.max || 10000);
      if (minInput) minInput.value = String(minSlider.value);
      if (maxInput) maxInput.value = String(maxSlider.value);
      if (minLabel) minLabel.textContent = '$' + Number(minSlider.value || 0).toLocaleString();
      if (maxLabel) maxLabel.textContent = '$' + Number(maxSlider.value || 0).toLocaleString();
    }
    // Uncheck all filter checkboxes
    ['status-filter-card', 'source-filter-card', 'account-type-filter-card', 'service-provider-filter-card'].forEach(function (cardId) {
      var card = document.getElementById(cardId);
      if (card) {
        Array.from(card.querySelectorAll('input[type="checkbox"]')).forEach(function (cb) { cb.checked = false; });
      }
    });
    renderCalendar('calendar-grid');
    renderAppliedFilters();
    state.currentPage = 1;
    fetchAndRenderCurrentTab();
  }

  function bindFilters() {
    reorderFilterControls();
    bindPriceRangeSliders();
    bindFilterPanelToggle();

    // Apply filters button
    var applyBtn = document.getElementById('apply-filters-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        state.filters = collectAllFiltersFromUI();
        state.currentPage = 1;
        renderAppliedFilters();
        fetchAndRenderCurrentTab();
      });
    }

    // Reset filters button
    var resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', clearAllFilters);
    }

    // Global search input (server query on Enter)
    var globalInput = document.querySelector('input[placeholder*="Search all records"]');
    if (!globalInput) globalInput = document.getElementById('global-search');
    if (globalInput) {
      globalInput.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        state.filters = collectAllFiltersFromUI();
        state.filters.global = (globalInput.value || '').trim() || null;
        state.currentPage = 1;
        renderAppliedFilters();
        fetchAndRenderCurrentTab();
      });
      globalInput.addEventListener('search', function () {
        // Handles native "clear" affordance on search-capable inputs/browsers.
        if ((globalInput.value || '').trim()) return;
        state.filters = collectAllFiltersFromUI();
        state.filters.global = null;
        state.currentPage = 1;
        renderAppliedFilters();
        fetchAndRenderCurrentTab();
      });
      var globalClearBtn = document.getElementById('global-search-clear');
      if (globalClearBtn) {
        globalClearBtn.addEventListener('click', function () {
          globalInput.value = '';
          state.filters = collectAllFiltersFromUI();
          state.filters.global = null;
          state.currentPage = 1;
          renderAppliedFilters();
          fetchAndRenderCurrentTab();
        });
      }
    }
  }

  function bindFilterPanelToggle() {
    var filtersToggle = document.getElementById('filters-toggle');
    var filtersPanel = document.getElementById('filters-panel');
    var filtersClose = document.getElementById('filters-close');
    var filtersToggleLabel = document.getElementById('filters-toggle-label');
    if (!filtersPanel) return;

    function setVisible(isVisible) {
      filtersPanel.classList.toggle('hidden', !isVisible);
      if (filtersToggle) filtersToggle.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
      if (filtersToggleLabel) filtersToggleLabel.textContent = isVisible ? 'Hide Filters' : 'Show Filters';
    }

    setVisible(false);
    if (filtersToggle) {
      filtersToggle.addEventListener('click', function () {
        var currentlyVisible = !filtersPanel.classList.contains('hidden');
        setVisible(!currentlyVisible);
      });
    }
    if (filtersClose) {
      filtersClose.addEventListener('click', function () { setVisible(false); });
    }
  }

  function reorderFilterControls() {
    var root = document.getElementById('related-filters');
    if (!root) return;
    var statusBtn = document.getElementById('status-filter-btn');
    var statusCard = document.getElementById('status-filter-card');
    var accountInput = document.getElementById('filter-account-name');
    var residentInput = document.getElementById('filter-resident');
    var addressInput = document.getElementById('filter-address');
    var accountTypeBtn = document.getElementById('account-type-filter-btn');
    var accountTypeCard = document.getElementById('account-type-filter-card');
    var takenByBtn = document.getElementById('service-provider-filter-btn');
    var takenByCard = document.getElementById('service-provider-filter-card');
    var sourceBtn = document.getElementById('source-filter-btn');
    var sourceCard = document.getElementById('source-filter-card');
    var servicemanInput = document.getElementById('filter-serviceman');

    var blocks = [
      statusBtn,
      statusCard,
      accountInput && accountInput.closest('.w-full'),
      residentInput && residentInput.closest('.w-full'),
      addressInput && addressInput.closest('.w-full'),
      accountTypeBtn,
      accountTypeCard,
      takenByBtn,
      takenByCard,
      sourceBtn,
      sourceCard,
      servicemanInput && servicemanInput.closest('.w-full'),
    ].filter(Boolean);

    blocks.forEach(function (el) { root.appendChild(el); });
  }

  function bindPriceRangeSliders() {
    var minSlider = document.getElementById('price-range-min-slider');
    var maxSlider = document.getElementById('price-range-max-slider');
    var minInput = document.getElementById('price-min');
    var maxInput = document.getElementById('price-max');
    var minLabel = document.getElementById('price-range-min-label');
    var maxLabel = document.getElementById('price-range-max-label');
    if (!minSlider || !maxSlider) return;

    function sync(fromMin) {
      var min = Number(minSlider.value || 0);
      var max = Number(maxSlider.value || 0);
      if (min > max) {
        if (fromMin) maxSlider.value = String(min);
        else minSlider.value = String(max);
      }
      min = Number(minSlider.value || 0);
      max = Number(maxSlider.value || 0);
      if (minInput) minInput.value = String(min);
      if (maxInput) maxInput.value = String(max);
      if (minLabel) minLabel.textContent = '$' + min.toLocaleString();
      if (maxLabel) maxLabel.textContent = '$' + max.toLocaleString();
    }

    minSlider.addEventListener('input', function () { sync(true); });
    maxSlider.addEventListener('input', function () { sync(false); });
    sync(true);
  }


  // ═══════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════

  function initNotifications() {
    var bellBtn = document.getElementById('notification-btn');
    var countEl = document.getElementById('notification-count');
    var popover = document.getElementById('notificationPopover');
    if (!bellBtn) return;

    // Subscribe to notifications via VitalSync
    try {
      var plugin = window.VitalSync.getPlugin();
      if (!plugin) return;

      var announcementModel = plugin.switchTo('PeterpmAnnouncement');
      var modelPromise = announcementModel && typeof announcementModel.then === 'function'
        ? announcementModel
        : Promise.resolve(announcementModel);
      modelPromise.then(function (model) {
        var query = model.query()
          .andWhere('notified_contact_id', '=', config.LOGGED_IN_USER_ID || '')
          .orderBy('created_at', 'desc')
          .select(['id', 'title', 'created_at', 'type', 'is_read', 'origin_url', 'quote_job_id', 'inquiry_id'])
          .noDestroy();

        var sub = query.fetchDirect()
          .pipe(window.toMainInstance ? window.toMainInstance(true) : function (x) { return x; })
          .subscribe(function (result) {
            var records = (result && result.resp) || [];
            state.notifications = records;
            state.unreadCount = records.filter(function (n) {
              var r = n.is_read || (n.getState && n.getState().is_read);
              return !r;
            }).length;

            if (countEl) {
              countEl.textContent = state.unreadCount > 0 ? state.unreadCount : '';
              countEl.style.display = state.unreadCount > 0 ? '' : 'none';
            }
          });

        state.notificationSub = sub;
      });
    } catch (err) {
      console.warn('Notification subscription failed:', err);
    }

    // Toggle popover
    if (bellBtn && popover) {
      bellBtn.addEventListener('click', function () {
        var isHidden = popover.classList.contains('hidden');
        popover.classList.toggle('hidden');
        if (isHidden) renderNotificationPopover(popover);
      });
    }
  }

  function renderNotificationPopover(popover) {
    if (!popover) return;
    var list = state.notifications.slice(0, 20);
    if (!list.length) {
      popover.innerHTML = '<div class="p-4 text-sm text-slate-500 text-center">No notifications</div>';
      return;
    }

    var html = '<div class="max-h-[400px] overflow-y-auto">';
    list.forEach(function (n) {
      var rec = n.getState ? n.getState() : n;
      var isRead = rec.is_read;
      var title = rec.title || 'Notification';
      var created = rec.created_at ? utils.formatDate(rec.created_at) : '';
      html += '<div class="px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ' +
        (!isRead ? 'bg-blue-50/30' : '') + '" data-notification-id="' + (rec.id || '') + '">' +
        '<div class="text-sm font-medium text-slate-800">' + utils.escapeHtml(title) + '</div>' +
        '<div class="text-xs text-slate-400 mt-1">' + created + '</div>' +
        '</div>';
    });
    html += '</div>';
    popover.innerHTML = html;
  }


  // ═══════════════════════════════════════════════════════════
  // FLATPICKR DATE PICKERS
  // ═══════════════════════════════════════════════════════════

  function initDatePickers() {
    if (typeof flatpickr !== 'function') return;
    var dateIds = ['date-from', 'date-to', 'invoice-date-from', 'invoice-date-to', 'due-date-from', 'due-date-to', 'bill-paid-date-from', 'bill-paid-date-to'];
    dateIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        flatpickr(el, { dateFormat: 'd/m/Y', allowInput: true });
      }
    });
  }


  // ═══════════════════════════════════════════════════════════
  // ROW CLICK HANDLING
  // ═══════════════════════════════════════════════════════════

  function normalizeJobDetailTemplate(template) {
    var raw = String(template || '');
    if (!raw) return '';
    return raw.replace(/job-detail\.html\?(?:job|quote|payment)=\{id\}/g, 'inquiry-detail.html?job={id}');
  }

  function getDetailUrlTemplateForTab(tabKey) {
    var c = config;
    switch (tabKey) {
      case 'inquiry':
      case 'urgent-calls':
        return c.INQUIRY_DETAIL_URL_TEMPLATE || '';
      case 'quote':
        return normalizeJobDetailTemplate(c.QUOTE_DETAIL_URL_TEMPLATE || '');
      case 'jobs':
      case 'active-jobs':
        return normalizeJobDetailTemplate(c.JOB_DETAIL_URL_TEMPLATE || '');
      case 'payment':
        return normalizeJobDetailTemplate(c.PAYMENT_DETAIL_URL_TEMPLATE || c.JOB_DETAIL_URL_TEMPLATE || '');
      default:
        return '';
    }
  }

  function bindTableRowClicks() {
    if (!tableContainerEl) return;
    tableContainerEl.addEventListener('click', function (e) {
      var viewBtn = e.target.closest('[data-action="view"]');
      if (viewBtn) {
        var row = viewBtn.closest('tr[data-unique-id]');
        if (row) {
          var recordId = row.getAttribute('data-record-id') || parseNumericId(row.getAttribute('data-unique-id'));
          if (recordId) {
            var template = getDetailUrlTemplateForTab(state.activeTab);
            if (template) {
              var url = template.replace(/\{id\}/g, recordId);
              window.location.href = url;
            } else {
              if (utils.showToast) utils.showToast('Navigation URL is not configured for this tab.', 'error');
              if (config.DEBUG) {
                console.log('View record:', recordId, 'tab:', state.activeTab, '(no URL template set)');
              }
            }
          }
        }
        e.preventDefault();
        return;
      }

      var deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        var delRow = deleteBtn.closest('tr[data-unique-id]');
        if (delRow) {
          console.log('Delete record:', delRow.getAttribute('data-unique-id'), '(not implemented)');
        }
        e.preventDefault();
        return;
      }
    });
  }

  function formatReportTimestamp(ts) {
    var d = ts ? new Date(ts) : new Date();
    return d.toLocaleString();
  }

  function formatReportDateValue(v) {
    return v ? String(v) : '-';
  }

  function formatMoneyValue(v) {
    var num = Number(v);
    if (!Number.isFinite(num)) return '-';
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCurrentJobsReportDataset() {
    if (state.activeTab !== 'jobs') {
      return Promise.reject(new Error('Jobs report actions are available on the Jobs tab only.'));
    }

    var reportFilters = buildFiltersForTab('jobs', { includeSelectedDate: true });
    var pageSize = 200;
    var offset = 0;
    var allRows = [];
    var expectedTotal = null;

    function fetchNextPage() {
      return domain.job.fetchJobs(reportFilters, pageSize, offset).then(function (result) {
        var rows = (result && Array.isArray(result.rows)) ? result.rows : [];
        expectedTotal = Number(result && result.totalCount);
        if (!Number.isFinite(expectedTotal) || expectedTotal < 0) expectedTotal = rows.length;
        allRows = allRows.concat(rows);
        offset += pageSize;
        if (!rows.length) return null;
        if (allRows.length >= expectedTotal) return null;
        return fetchNextPage();
      });
    }

    return fetchNextPage().then(function () {
      return {
        rows: allRows,
        totalCount: Number.isFinite(expectedTotal) ? expectedTotal : allRows.length,
        generatedAt: new Date().toISOString(),
        filters: reportFilters,
        sort: state.sortByTab.jobs || null,
      };
    });
  }

  function buildJobsPrintTableRows(rows) {
    return (rows || []).map(function (row) {
      row = row || {};
      var meta = row.meta || {};
      var serviceman = [meta.servicemanFirstName, meta.servicemanLastName].filter(Boolean).join(' ') || '-';
      return '<tr>' +
        '<td>' + utils.escapeHtml(row.id || '-') + '</td>' +
        '<td>' + utils.escapeHtml(row.client || '-') + '</td>' +
        '<td>' + utils.escapeHtml(meta.accountName || '-') + '</td>' +
        '<td>' + utils.escapeHtml(row.service || '-') + '</td>' +
        '<td>' + utils.escapeHtml(formatReportDateValue(row.scheduledDate)) + '</td>' +
        '<td>' + utils.escapeHtml(formatReportDateValue(row.bookedDate)) + '</td>' +
        '<td>' + utils.escapeHtml(serviceman) + '</td>' +
        '<td>' + utils.escapeHtml(row.jobStatus || '-') + '</td>' +
        '<td>' + utils.escapeHtml(row.paymentStatus || '-') + '</td>' +
        '<td style="text-align:right;">' + utils.escapeHtml(formatMoneyValue(row.jobTotal)) + '</td>' +
      '</tr>';
    }).join('');
  }

  function buildJobsPrintHtml(payload) {
    var filters = (payload && payload.filters) || {};
    var rows = (payload && payload.rows) || [];
    var serviceman = (Array.isArray(filters.serviceProviders) && filters.serviceProviders.length)
      ? filters.serviceProviders.join(', ')
      : 'All';
    var range = (filters.dateFrom || filters.dateTo)
      ? [filters.dateFrom || '-', filters.dateTo || '-'].join(' to ')
      : 'All dates';
    var sortLabel = (payload.sort && payload.sort.field)
      ? (payload.sort.field + ' (' + (payload.sort.direction || 'desc') + ')')
      : 'Default';

    return '<!doctype html>' +
      '<html><head><meta charset="utf-8"><title>Jobs Report</title>' +
      '<style>' +
      'body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:24px;}' +
      'h1{margin:0 0 8px;font-size:22px;}' +
      '.meta{margin:0 0 14px;font-size:12px;color:#334155;display:flex;flex-wrap:wrap;gap:14px;}' +
      'table{width:100%;border-collapse:collapse;font-size:11px;}' +
      'th,td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;}' +
      'th{background:#f1f5f9;text-align:left;font-weight:600;}' +
      '</style></head><body>' +
      '<h1>Jobs Report</h1>' +
      '<div class="meta">' +
      '<div><strong>Serviceman:</strong> ' + utils.escapeHtml(serviceman) + '</div>' +
      '<div><strong>Date range:</strong> ' + utils.escapeHtml(range) + '</div>' +
      '<div><strong>Generated:</strong> ' + utils.escapeHtml(formatReportTimestamp(payload.generatedAt)) + '</div>' +
      '<div><strong>Record count:</strong> ' + utils.escapeHtml(String(payload.totalCount || rows.length || 0)) + '</div>' +
      '<div><strong>Sort:</strong> ' + utils.escapeHtml(sortLabel) + '</div>' +
      '</div>' +
      '<table><thead><tr>' +
      '<th>Job #</th><th>Client</th><th>Account</th><th>Service</th><th>Date Scheduled</th>' +
      '<th>Date Booked</th><th>Serviceman</th><th>Job Status</th><th>Payment Status</th><th>Total</th>' +
      '</tr></thead><tbody>' +
      (buildJobsPrintTableRows(rows) || '<tr><td colspan="10" style="text-align:center;">No records found.</td></tr>') +
      '</tbody></table>' +
      '</body></html>';
  }

  function toSafeFileToken(v) {
    return String(v || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'all';
  }

  function getJobsExportFileName(filters) {
    var serviceman = (filters && Array.isArray(filters.serviceProviders) && filters.serviceProviders[0]) || 'all';
    var now = new Date();
    var yyyy = now.getFullYear();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    return 'jobs_' + toSafeFileToken(serviceman) + '_' + yyyy + '-' + mm + '-' + dd + '.xlsx';
  }

  function buildJobsExportRows(rows) {
    return (rows || []).map(function (row) {
      row = row || {};
      var meta = row.meta || {};
      return {
        Job_Number: row.id || '',
        Client: row.client || '',
        Account_Name: meta.accountName || '',
        Service: row.service || '',
        Date_Scheduled: row.scheduledDate || '',
        Date_Booked: row.bookedDate || '',
        Date_Started: row.startDate || '',
        Job_Status: row.jobStatus || '',
        Payment_Status: row.paymentStatus || '',
        Priority: row.priority || '',
        Job_Total: row.jobTotal != null ? Number(row.jobTotal) : '',
        Invoice_Number: row.invoiceNumber || '',
        Invoice_Date: row.invoiceDate || '',
        Recommendation: row.recommendation || '',
        Address: meta.address || '',
      };
    });
  }

  function exportRowsAsCsvFallback(rows, filename) {
    var records = buildJobsExportRows(rows);
    var headers = records.length ? Object.keys(records[0]) : ['Job_Number'];
    var escapeCsv = function (value) {
      var s = String(value == null ? '' : value);
      if (/[,"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    var csvLines = [headers.map(escapeCsv).join(',')];
    records.forEach(function (record) {
      csvLines.push(headers.map(function (h) { return escapeCsv(record[h]); }).join(','));
    });
    var blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = String(filename || 'jobs-export.xlsx').replace(/\.xlsx$/i, '.csv');
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleJobsPrintClick() {
    utils.showPageLoader('Preparing jobs print report...');
    return getCurrentJobsReportDataset()
      .then(function (payload) {
        var printWindow = window.open('', '_blank');
        if (!printWindow) throw new Error('Pop-up blocked. Please allow pop-ups and try again.');
        printWindow.document.open();
        printWindow.document.write(buildJobsPrintHtml(payload));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(function () { printWindow.print(); }, 200);
      })
      .then(function () {
        if (utils.showToast) utils.showToast('Print report ready.', 'success');
      })
      .catch(function (err) {
        if (utils.showToast) utils.showToast((err && err.message) || 'Unable to print Jobs report.', 'error');
      })
      .finally(function () {
        utils.hidePageLoader();
      });
  }

  function handleJobsExportExcelClick() {
    utils.showPageLoader('Preparing jobs Excel export...');
    return getCurrentJobsReportDataset()
      .then(function (payload) {
        var rows = payload.rows || [];
        var filename = getJobsExportFileName(payload.filters || {});
        if (window.XLSX && window.XLSX.utils) {
          var exportRows = buildJobsExportRows(rows);
          var headers = [
            'Job_Number', 'Client', 'Account_Name', 'Service', 'Date_Scheduled', 'Date_Booked',
            'Date_Started', 'Job_Status', 'Payment_Status', 'Priority', 'Job_Total',
            'Invoice_Number', 'Invoice_Date', 'Recommendation', 'Address',
          ];
          var ws = window.XLSX.utils.json_to_sheet(exportRows, { header: headers });
          var wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'Jobs');
          window.XLSX.writeFile(wb, filename);
        } else {
          exportRowsAsCsvFallback(rows, filename);
        }
      })
      .then(function () {
        if (utils.showToast) utils.showToast('Jobs export downloaded.', 'success');
      })
      .catch(function (err) {
        if (utils.showToast) utils.showToast((err && err.message) || 'Unable to export Jobs list.', 'error');
      })
      .finally(function () {
        utils.hidePageLoader();
      });
  }

  function syncJobsTabActionsState() {
    var wrap = document.getElementById('jobs-tab-actions');
    var showActiveBtn = document.getElementById('jobs-show-active-btn');
    if (!wrap || !showActiveBtn) return;
    var isJobsTab = state.activeTab === 'jobs';
    wrap.classList.toggle('hidden', !isJobsTab);
    if (!isJobsTab) return;

    var uiFilters = collectAllFiltersFromUI();
    var missing = getMissingServicemanDateRequirements(uiFilters);
    var enabled = missing.length === 0;
    showActiveBtn.disabled = !enabled;
    showActiveBtn.classList.toggle('opacity-50', !enabled);
    showActiveBtn.classList.toggle('cursor-not-allowed', !enabled);
    if (!enabled) {
      showActiveBtn.title = missing.join(' | ') + ' (uses Date Scheduled).';
    } else {
      showActiveBtn.removeAttribute('title');
    }
  }

  function bindJobsTabActions() {
    if (jobsActionsBound) return;
    jobsActionsBound = true;
    var showActiveBtn = document.getElementById('jobs-show-active-btn');
    var printBtn = document.getElementById('jobs-print-list-btn');
    var exportBtn = document.getElementById('jobs-export-excel-btn');
    if (showActiveBtn) {
      showActiveBtn.addEventListener('click', function () {
        applyShowActiveJobsPreset();
      });
    }
    if (printBtn) {
      printBtn.addEventListener('click', function () {
        handleJobsPrintClick();
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        handleJobsExportExcelClick();
      });
    }

    ['date-from', 'date-to', 'filter-serviceman'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', syncJobsTabActionsState);
        el.addEventListener('input', syncJobsTabActionsState);
      }
    });
    var serviceProviderCard = document.getElementById('service-provider-filter-card');
    if (serviceProviderCard) {
      serviceProviderCard.addEventListener('change', syncJobsTabActionsState);
    }
    syncJobsTabActionsState();
  }

  function bindCreateButton() {
    var btn = document.getElementById('create-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var url = config.NEW_INQUIRY_URL || './new-inquiry.html';
      window.location.href = url;
    });
  }

  function bindBatchActionsMenu() {
    if (batchActionsBound) return;
    batchActionsBound = true;

    function getBtn() { return document.getElementById('batch-actions-btn'); }
    function getMenu() { return document.getElementById('batch-actions-menu'); }
    function closeMenu() {
      var menu = getMenu();
      if (menu) menu.classList.add('hidden');
    }
    function openMenu() {
      var menu = getMenu();
      if (!menu) return;
      updateMenuAvailability();
      menu.classList.remove('hidden');
    }

    function updateMenuAvailability() {
      var menu = getMenu();
      if (!menu) return;
      var emailItem = menu.querySelector('[data-batch-action="email-list-to-serviceman"]');
      if (!emailItem) return;
      var filters = collectAllFiltersFromUI();
      var enabled = canRunEmailListToServiceman(filters);
      emailItem.disabled = !enabled;
      emailItem.classList.toggle('opacity-50', !enabled);
      emailItem.classList.toggle('cursor-not-allowed', !enabled);
      if (!enabled) {
        emailItem.title = 'Requires exactly one service person and Start/End date.';
      } else {
        emailItem.removeAttribute('title');
      }
    }

    document.addEventListener('click', function (e) {
      var btn = getBtn();
      var menu = getMenu();
      if (!btn || !menu) return;

      if (e.target.closest('#batch-actions-btn')) {
        e.preventDefault();
        var isHidden = menu.classList.contains('hidden');
        if (isHidden) openMenu();
        else closeMenu();
        return;
      }

      var item = e.target.closest('#batch-actions-menu [data-batch-action]');
      if (item) {
        var action = item.getAttribute('data-batch-action');
        closeMenu();
        if (action === 'jobs-to-check') {
          applyJobsToCheckPreset();
          return;
        }
        if (action === 'email-list-to-serviceman') {
          applyEmailListToServicemanPreset();
          return;
        }
        if (action === 'list-unpaid-invoices') {
          applyListUnpaidInvoicesPreset();
          return;
        }
        if (action === 'list-part-payments') {
          applyListPartPaymentsPreset();
          return;
        }
        if (utils.showToast) utils.showToast('Batch action coming soon: ' + item.textContent.trim(), 'info');
        return;
      }

      if (!menu.classList.contains('hidden') && !menu.contains(e.target)) closeMenu();
    });
  }

  function getEditorOverlay() { return document.getElementById('inquiry-column-editor-overlay'); }
  function getEditorList() { return document.getElementById('inquiry-column-editor-list'); }
  function getEditorAddMenu() { return document.getElementById('inquiry-column-add-menu'); }

  function renderColumnEditorSelectedList() {
    var list = getEditorList();
    if (!list) return;
    var tabKey = state.activeTab;
    var catalog = getCatalogForTab(tabKey);
    list.innerHTML = '';
    columnEditorState.draftColumns.forEach(function (columnId, idx) {
      var column = catalog[columnId];
      if (!column) return;
      var row = document.createElement('div');
      row.className = 'inquiry-column-editor-row';
      row.innerHTML =
        '<div class="inquiry-column-editor-label">' + utils.escapeHtml(column.label) + '</div>' +
        '<div class="inquiry-column-editor-actions">' +
          '<button type="button" class="inquiry-col-btn" data-col-action="up" data-col-id="' + columnId + '" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
          '<button type="button" class="inquiry-col-btn" data-col-action="down" data-col-id="' + columnId + '" ' + (idx === columnEditorState.draftColumns.length - 1 ? 'disabled' : '') + '>↓</button>' +
          '<button type="button" class="inquiry-col-btn" data-col-action="remove" data-col-id="' + columnId + '" ' + (column.lock ? 'disabled' : '') + '>×</button>' +
        '</div>';
      list.appendChild(row);
    });
  }

  function getColumnEditorMenuState() {
    var tabKey = state.activeTab;
    var catalog = getCatalogForTab(tabKey);
    var path = columnEditorState.path || [];
    if (!path.length) {
      var groups = {};
      Object.keys(catalog).forEach(function (id) {
        var col = catalog[id];
        if (col.lock) return;
        var group = col.group || 'Other';
        if (!groups[group]) groups[group] = {};
        if (col.subgroup) groups[group][col.subgroup] = true;
        else groups[group][id] = false;
      });
      var rootItems = Object.keys(groups).map(function (group) {
        return { type: 'group', id: group, label: group };
      });
      return { title: 'Add field...', items: rootItems };
    }
    if (path.length === 1) {
      var groupName = path[0];
      var groupItems = [];
      Object.keys(catalog).forEach(function (id) {
        var col = catalog[id];
        if (col.lock || col.group !== groupName) return;
        if (col.subgroup) {
          if (!groupItems.some(function (x) { return x.type === 'subgroup' && x.id === col.subgroup; })) {
            groupItems.push({ type: 'subgroup', id: col.subgroup, label: col.subgroup });
          }
        } else {
          groupItems.push({ type: 'column', id: id, label: col.label });
        }
      });
      return { title: groupName, items: groupItems };
    }
    var subgroupName = path[1];
    var subgroupItems = [];
    Object.keys(catalog).forEach(function (id) {
      var col = catalog[id];
      if (col.lock) return;
      if (col.group === path[0] && col.subgroup === subgroupName) subgroupItems.push({ type: 'column', id: id, label: col.label });
    });
    return { title: subgroupName, items: subgroupItems };
  }

  function renderColumnEditorAddMenu() {
    var menu = getEditorAddMenu();
    if (!menu) return;
    var stateForMenu = getColumnEditorMenuState();
    var selectedSet = {};
    columnEditorState.draftColumns.forEach(function (id) { selectedSet[id] = true; });
    var html = '';
    if ((columnEditorState.path || []).length) {
      html += '<button type="button" class="inquiry-column-menu-item" data-menu-action="back">← Back</button>';
    }
    html += '<div class="inquiry-column-menu-title">' + utils.escapeHtml(stateForMenu.title) + '</div>';
    stateForMenu.items.forEach(function (item) {
      if (item.type === 'column') {
        html += '<button type="button" class="inquiry-column-menu-item" data-menu-action="add-column" data-column-id="' + item.id + '" ' + (selectedSet[item.id] ? 'disabled' : '') + '>' +
          utils.escapeHtml(item.label) + (selectedSet[item.id] ? ' (added)' : '') + '</button>';
      } else {
        html += '<button type="button" class="inquiry-column-menu-item" data-menu-action="drill" data-node-id="' + utils.escapeHtml(item.id) + '">' +
          utils.escapeHtml(item.label) + ' →</button>';
      }
    });
    menu.innerHTML = html;
  }

  function openColumnEditor() {
    var overlay = getEditorOverlay();
    if (!overlay) return;
    var tabKey = state.activeTab;
    columnEditorState.isOpen = true;
    columnEditorState.draftColumns = getActiveColumns(tabKey).slice();
    columnEditorState.path = [];
    renderColumnEditorSelectedList();
    renderColumnEditorAddMenu();
    overlay.classList.remove('hidden');
  }

  function closeColumnEditor() {
    var overlay = getEditorOverlay();
    if (!overlay) return;
    columnEditorState.isOpen = false;
    overlay.classList.add('hidden');
  }

  function bindColumnEditor() {
    var overlay = getEditorOverlay();
    var list = getEditorList();
    var menu = getEditorAddMenu();
    var closeBtn = document.getElementById('inquiry-column-editor-close');
    var cancelBtn = document.getElementById('inquiry-column-editor-cancel');
    var saveBtn = document.getElementById('inquiry-column-editor-save');
    var addBtn = document.getElementById('inquiry-column-editor-add');
    if (!overlay || !list || !menu) return;

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeColumnEditor();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeColumnEditor);
    if (cancelBtn) cancelBtn.addEventListener('click', closeColumnEditor);
    if (addBtn) addBtn.addEventListener('click', function () {
      columnEditorState.path = [];
      renderColumnEditorAddMenu();
    });
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var tabKey = state.activeTab;
        state.columnsByTab[tabKey] = normalizeColumns(tabKey, columnEditorState.draftColumns);
        var active = getActiveView(tabKey);
        if (active) {
          active.columns = state.columnsByTab[tabKey].slice();
          active.updatedAt = nowIso();
        }
        saveViewsForTab(tabKey);
        closeColumnEditor();
        fetchAndRenderCurrentTab();
      });
    }

    list.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-col-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-col-action');
      var id = btn.getAttribute('data-col-id');
      var idx = columnEditorState.draftColumns.indexOf(id);
      var tabKey = state.activeTab;
      var catalog = getCatalogForTab(tabKey);
      if (idx === -1) return;
      if (action === 'remove') {
        if (catalog[id] && catalog[id].lock) return;
        columnEditorState.draftColumns.splice(idx, 1);
      } else if (action === 'up' && idx > 0) {
        var prev = columnEditorState.draftColumns[idx - 1];
        columnEditorState.draftColumns[idx - 1] = columnEditorState.draftColumns[idx];
        columnEditorState.draftColumns[idx] = prev;
      } else if (action === 'down' && idx < columnEditorState.draftColumns.length - 1) {
        var next = columnEditorState.draftColumns[idx + 1];
        columnEditorState.draftColumns[idx + 1] = columnEditorState.draftColumns[idx];
        columnEditorState.draftColumns[idx] = next;
      }
      columnEditorState.draftColumns = normalizeColumns(tabKey, columnEditorState.draftColumns);
      renderColumnEditorSelectedList();
      renderColumnEditorAddMenu();
    });

    menu.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-menu-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-menu-action');
      if (action === 'back') {
        columnEditorState.path = (columnEditorState.path || []).slice(0, -1);
      } else if (action === 'drill') {
        var nodeId = btn.getAttribute('data-node-id');
        var nextPath = (columnEditorState.path || []).slice();
        nextPath.push(nodeId);
        columnEditorState.path = nextPath.slice(0, 2);
      } else if (action === 'add-column') {
        var columnId = btn.getAttribute('data-column-id');
        if (columnEditorState.draftColumns.indexOf(columnId) === -1) columnEditorState.draftColumns.push(columnId);
        columnEditorState.draftColumns = normalizeColumns(state.activeTab, columnEditorState.draftColumns);
        renderColumnEditorSelectedList();
      }
      renderColumnEditorAddMenu();
    });
  }

  function handleSaveViewAs() {
    var tabKey = state.activeTab;
    var name = window.prompt('Save view as:', 'My ' + (tabKey === 'inquiry' ? 'Inquiry' : 'Dashboard') + ' View');
    if (!name) return;
    var cleanName = String(name).trim();
    if (!cleanName) return;
    var id = 'view-' + Date.now();
    var views = (state.viewsByTab[tabKey] || []).map(function (v) { return Object.assign({}, v, { isDefault: false }); });
    views.push({
      id: id,
      name: cleanName,
      columns: getActiveColumns(tabKey).slice(),
      isDefault: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    state.viewsByTab[tabKey] = views;
    state.activeViewIdByTab[tabKey] = id;
    saveViewsForTab(tabKey);
    renderViewPicker();
    if (utils.showToast) utils.showToast('Saved view: ' + cleanName, 'success');
  }

  function bindDashboardCustomersAndViewButtons() {
    var customersLink = document.getElementById('dashboard-customers-link');
    if (customersLink) {
      var url = config.CUSTOMERS_LIST_URL || './customers-list.html';
      customersLink.href = url;
    }
    var editCols = document.getElementById('dashboard-edit-columns-btn');
    if (editCols) editCols.addEventListener('click', openColumnEditor);
    var saveView = document.getElementById('dashboard-save-view-btn');
    if (saveView) saveView.addEventListener('click', handleSaveViewAs);
    var picker = document.getElementById('dashboard-view-select');
    if (picker) {
      picker.addEventListener('change', function () {
        applyView(state.activeTab, picker.value);
      });
    }
    syncViewControls();
  }


  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  function init(opts) {
    opts = opts || {};
    var calendarId = opts.calendarContainerId || 'calendar-grid';
    var tableId = opts.tableContainerId || 'inquiry-table-container';
    var tabNavId = opts.tabNavId || 'top-tabs';
    currentTabNavId = tabNavId;
    Object.keys(TAB_DEFAULT_COLUMN_IDS).forEach(function (tabKey) {
      var views = loadViewsForTab(tabKey);
      var storedActiveId = loadActiveViewIdForTab(tabKey);
      var defaultView = views.find(function (v) { return v.id === storedActiveId; }) ||
        views.find(function (v) { return v.isDefault; }) ||
        views[0] ||
        getDefaultView(tabKey);
      state.viewsByTab[tabKey] = views;
      state.activeViewIdByTab[tabKey] = defaultView.id;
      state.columnsByTab[tabKey] = normalizeColumns(tabKey, defaultView.columns);
    });

    tableContainerEl = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;

    function renderUI() {
      renderCalendar(calendarId);
      renderTabs(tabNavId);
      renderViewPicker();
      renderAppliedFilters();
      initPagination();
      bindFilters();
      hydrateServiceProviderFilter();
      initDatePickers();
      bindTableRowClicks();
      bindCreateButton();
      bindBatchActionsMenu();
      bindJobsTabActions();
      bindColumnEditor();
      bindDashboardCustomersAndViewButtons();
      syncJobsTabActionsState();
    }

    function showEmptyConnectionState() {
      if (tableContainerEl) {
        tbl.renderDynamicTable({
          container: tableContainerEl,
          headers: getInquiryHeaders(),
          rows: [],
          emptyState: 'No data — set your VitalSync API key in dev/mock-data.js (window.__MOCK_API_KEY__) to connect.',
        });
      }
      state.totalCount = 0;
      updateRecordCount();
    }

    var hasApiKey = config.API_KEY && String(config.API_KEY).trim();

    if (!hasApiKey) {
      // Don't call VitalSync when key is missing — SDK throws "Missing required options: slug and/or apiKey"
      renderUI();
      showEmptyConnectionState();
      utils.showToast('No API key set. Add your VitalSync API key in dev/mock-data.js as window.__MOCK_API_KEY__ = "your-key";', 'error');
      return;
    }

    // Wait for VitalSync to connect
    window.VitalSync.connect()
      .then(function () {
        if (config.DEBUG) console.log('Dashboard: VitalSync connected');
        renderUI();
        initNotifications();
        refreshCalendarCountsForActiveTab();
        fetchAndRenderCurrentTab();
      })
      .catch(function (err) {
        console.error('Dashboard: VitalSync connection failed', err);
        renderUI();
        showEmptyConnectionState();
        utils.showToast('Failed to connect to data service. Please refresh.', 'error');
      });
  }


  // ─── Expose on window ──────────────────────────────────────

  window.PtpmDashboard = {
    init: init,
    getState: function () { return state; },
    refreshCurrentTab: fetchAndRenderCurrentTab,
    clearFilters: clearAllFilters,
  };
})();
