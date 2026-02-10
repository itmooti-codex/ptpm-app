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
    pageSize: 25,
    totalPages: 1,
    totalCount: 0,
    calendarDays: [],
    selectedDate: null,
    notificationSub: null,
    notifications: [],
    unreadCount: 0,
    batchMode: false,
    batchSelections: new Set(),
    pagination: null,
  };

  function createEmptyFilters() {
    return {
      global: null, accountName: null, resident: null, address: null,
      source: [], serviceman: null, type: null, accountTypes: [],
      serviceProviders: [], quoteNumber: null, invoiceNumber: null,
      recommendation: null, priceMin: null, priceMax: null,
      statuses: [], dateFrom: null, dateTo: null,
      xeroInvoiceStatus: null, invoiceDateFrom: null, invoiceDateTo: null,
      dueDateFrom: null, dueDateTo: null, billPaidDateFrom: null, billPaidDateTo: null,
      taskPropertySearch: null, taskDueToday: null, taskAssignedToMe: null,
    };
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


  // ═══════════════════════════════════════════════════════════
  // CALENDAR (14-day)
  // ═══════════════════════════════════════════════════════════

  function buildCalendarDays() {
    var dayjs = window.dayjs;
    if (!dayjs) return [];
    var tz = config.TIMEZONE || 'Australia/Brisbane';
    var start = dayjs.tz ? dayjs.tz(undefined, tz).startOf('day') : dayjs().startOf('day');
    var days = [];
    for (var i = 0; i < 14; i++) {
      var d = start.add(i, 'day');
      days.push({
        iso: d.format('YYYY-MM-DD'),
        label: d.format('ddd D/M'),
        total: 0,
      });
    }
    return days;
  }

  function renderCalendar(containerId) {
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    state.calendarDays = buildCalendarDays();
    if (state.calendarDays.length && !state.selectedDate) {
      state.selectedDate = state.calendarDays[0].iso;
    }

    container.innerHTML = '';
    var grid = document.createElement('div');
    grid.className = 'grid grid-cols-7 gap-1';

    state.calendarDays.forEach(function (day) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.date = day.iso;
      var isSelected = day.iso === state.selectedDate;
      btn.className = 'flex flex-col items-center justify-center p-2 rounded-lg text-xs cursor-pointer transition-colors ' +
        (isSelected
          ? 'bg-[' + brandColor + '] text-white'
          : 'bg-white text-slate-600 hover:bg-slate-100');
      btn.innerHTML =
        '<span class="font-medium">' + day.label + '</span>' +
        '<span class="mt-1 text-[10px] font-semibold ' + (isSelected ? 'text-white/80' : 'text-slate-400') + '">' + day.total + '</span>';
      btn.addEventListener('click', function () {
        state.selectedDate = day.iso;
        renderCalendar(container);
        fetchAndRenderCurrentTab();
      });
      grid.appendChild(btn);
    });

    container.appendChild(grid);
  }


  // ═══════════════════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════════════════

  var TABS = [
    { key: 'inquiry', label: 'Inquiries' },
    { key: 'quote', label: 'Quotes' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'payment', label: 'Payments' },
    { key: 'active-jobs', label: 'Active Jobs' },
    { key: 'urgent-calls', label: 'Urgent Calls' },
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
      btn.className = 'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ' +
        (isActive
          ? 'bg-white text-[' + brandColor + '] border-b-2 border-[' + brandColor + ']'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50');
      btn.textContent = tab.label;
      btn.addEventListener('click', function () {
        if (state.activeTab === tab.key) return;
        state.activeTab = tab.key;
        state.currentPage = 1;
        renderTabs(nav);
        fetchAndRenderCurrentTab();
      });
      nav.appendChild(btn);
    });
  }


  // ═══════════════════════════════════════════════════════════
  // TABLE COLUMN DEFINITIONS
  // ═══════════════════════════════════════════════════════════

  function getInquiryHeaders() {
    return [
      { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' },
      { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } },
      { key: 'created', label: 'Created' },
      { key: 'service', label: 'Service' },
      { key: 'source', label: 'Source' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status', render: function (row) { return renderStatusBadge(row.status); } },
      { key: 'actions', label: '', render: function () { return tbl.actionButtons; } },
    ];
  }

  function getJobHeaders() {
    return [
      { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' },
      { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } },
      { key: 'startDate', label: 'Start Date' },
      { key: 'service', label: 'Service' },
      { key: 'bookedDate', label: 'Booked' },
      { key: 'jobTotal', label: 'Total', render: function (row) { return tbl.money(row.jobTotal); } },
      { key: 'jobStatus', label: 'Status', render: function (row) { return renderStatusBadge(row.jobStatus); } },
      { key: 'actions', label: '', render: function () { return tbl.actionButtons; } },
    ];
  }

  function getQuoteHeaders() {
    return [
      { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' },
      { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } },
      { key: 'dateQuotedAccepted', label: 'Quote Accepted' },
      { key: 'service', label: 'Service' },
      { key: 'quoteTotal', label: 'Total', render: function (row) { return tbl.money(row.quoteTotal); } },
      { key: 'quoteStatus', label: 'Status', render: function (row) { return renderStatusBadge(row.quoteStatus); } },
      { key: 'actions', label: '', render: function () { return tbl.actionButtons; } },
    ];
  }

  function getPaymentHeaders() {
    return [
      { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' },
      { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } },
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'invoiceDate', label: 'Invoice Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'invoiceTotal', label: 'Total', render: function (row) { return tbl.money(row.invoiceTotal); } },
      { key: 'xeroInvoiceStatus', label: 'Xero Status', render: function (row) { return renderStatusBadge(row.xeroInvoiceStatus); } },
      { key: 'actions', label: '', render: function () { return tbl.actionButtons; } },
    ];
  }

  function getActiveJobHeaders() {
    return [
      { key: 'id', label: 'ID', cellClass: 'px-6 py-4 text-slate-800 font-medium' },
      { key: 'client', label: 'Client', render: function (row) { return tbl.buildClientCell(row); } },
      { key: 'dateAccepted', label: 'Accepted' },
      { key: 'service', label: 'Service' },
      { key: 'activeJobTotal', label: 'Total', render: function (row) { return tbl.money(row.activeJobTotal); } },
      { key: 'activeJobStatus', label: 'Status', render: function (row) { return renderStatusBadge(row.activeJobStatus); } },
      { key: 'actions', label: '', render: function () { return tbl.actionButtons; } },
    ];
  }


  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING & TABLE RENDERING
  // ═══════════════════════════════════════════════════════════

  var tableContainerEl = null;

  function fetchAndRenderCurrentTab() {
    if (!tableContainerEl) return;
    var tab = state.activeTab;
    var offset = (state.currentPage - 1) * state.pageSize;

    utils.showPageLoader('Loading ' + tab + '...');
    tbl.clearTable(tableContainerEl);

    var promise;
    var headers;
    var rowsKey;

    switch (tab) {
      case 'inquiry':
        headers = getInquiryHeaders();
        promise = domain.inquiry.fetchInquiries({
          filters: state.filters,
          limit: state.pageSize,
          offset: offset,
        });
        break;
      case 'quote':
        headers = getQuoteHeaders();
        promise = domain.quote.fetchQuotes(state.filters, state.pageSize, offset);
        break;
      case 'jobs':
        headers = getJobHeaders();
        promise = domain.job.fetchJobs(state.filters, state.pageSize, offset);
        break;
      case 'payment':
        headers = getPaymentHeaders();
        promise = domain.payment.fetchPayments(state.filters, state.pageSize, offset);
        break;
      case 'active-jobs':
        headers = getActiveJobHeaders();
        promise = domain.activeJob.fetchActiveJobs(state.filters, state.pageSize, offset);
        break;
      case 'urgent-calls':
        // Urgent calls use inquiry domain with special filter
        headers = getInquiryHeaders();
        var urgentFilters = Object.assign({}, state.filters);
        promise = domain.inquiry.fetchInquiries({
          filters: urgentFilters,
          limit: state.pageSize,
          offset: offset,
        });
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
          zebra: true,
          emptyState: 'No records found.',
        });

        updatePagination();
        updateRecordCount();
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
    var serviceProviders = spCard
      ? Array.from(spCard.querySelectorAll('input[type="checkbox"][data-service-provider]:checked'))
          .map(function (c) { return (c.value || '').trim(); }).filter(Boolean)
      : [];

    return {
      global: nz(val('global-search')),
      accountName: nz(val('filter-account-name')),
      resident: nz(val('filter-resident')),
      address: nz(val('filter-address')),
      source: sources.length ? sources : [],
      serviceman: nz(val('filter-serviceman')),
      accountTypes: accountTypes,
      serviceProviders: serviceProviders,
      quoteNumber: nz(val('filter-quote-number')),
      invoiceNumber: nz(val('filter-invoice-number')),
      recommendation: nz(val('filter-recommendation')),
      priceMin: toNum(val('price-min')),
      priceMax: toNum(val('price-max')),
      statuses: statuses,
      dateFrom: nz(val('date-from')),
      dateTo: nz(val('date-to')),
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

    var hasChips = chips.length > 0;
    var clearAllBtn = hasChips
      ? '<button id="clear-all-filters" type="button" class="px-1 text-slate-500 text-sm font-medium whitespace-nowrap leading-4">Clear All</button>'
      : '';

    root.innerHTML = chips.join('') + clearAllBtn;

    // Attach remove handlers
    root.querySelectorAll('.remove-chip').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
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
      case 'accountTypes': f.accountTypes = []; break;
      case 'serviceProviders': f.serviceProviders = []; break;
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
    }
    renderAppliedFilters();
    state.currentPage = 1;
    fetchAndRenderCurrentTab();
  }

  function clearAllFilters() {
    state.filters = createEmptyFilters();
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
    // Uncheck all filter checkboxes
    ['status-filter-card', 'source-filter-card', 'account-type-filter-card', 'service-provider-filter-card'].forEach(function (cardId) {
      var card = document.getElementById(cardId);
      if (card) {
        Array.from(card.querySelectorAll('input[type="checkbox"]')).forEach(function (cb) { cb.checked = false; });
      }
    });
    renderAppliedFilters();
    state.currentPage = 1;
    fetchAndRenderCurrentTab();
  }

  function bindFilters() {
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

    // Global search input (live filtering)
    var globalInput = document.querySelector('input[placeholder*="Search all records"]');
    if (!globalInput) globalInput = document.getElementById('global-search');
    if (globalInput) {
      var debounce = null;
      globalInput.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          state.filters.global = (globalInput.value || '').trim() || null;
          state.currentPage = 1;
          fetchAndRenderCurrentTab();
        }, 300);
      });
    }
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
      announcementModel.then(function (model) {
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

  function bindTableRowClicks() {
    if (!tableContainerEl) return;
    tableContainerEl.addEventListener('click', function (e) {
      // View icon click
      var viewIcon = e.target.closest('#view-icon');
      if (viewIcon) {
        var row = viewIcon.closest('tr[data-unique-id]');
        if (row) {
          var uniqueId = row.getAttribute('data-unique-id');
          if (uniqueId) {
            // Navigate to detail page based on active tab
            console.log('View record:', uniqueId, 'tab:', state.activeTab);
          }
        }
        return;
      }

      // Delete icon click
      var deleteIcon = e.target.closest('#delete-icon');
      if (deleteIcon) {
        var delRow = deleteIcon.closest('tr[data-unique-id]');
        if (delRow) {
          console.log('Delete record:', delRow.getAttribute('data-unique-id'));
        }
        return;
      }
    });
  }


  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  function init(opts) {
    opts = opts || {};
    var calendarId = opts.calendarContainerId || 'calendar-grid';
    var tableId = opts.tableContainerId || 'inquiry-table-container';
    var tabNavId = opts.tabNavId || 'top-tabs';

    tableContainerEl = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;

    // Wait for VitalSync to connect
    window.VitalSync.connect()
      .then(function () {
        if (config.DEBUG) console.log('Dashboard: VitalSync connected');

        // Render calendar
        renderCalendar(calendarId);

        // Render tabs
        renderTabs(tabNavId);

        // Init pagination
        initPagination();

        // Bind filters
        bindFilters();

        // Init date pickers
        initDatePickers();

        // Init notifications
        initNotifications();

        // Bind table row clicks
        bindTableRowClicks();

        // Fetch initial data
        fetchAndRenderCurrentTab();
      })
      .catch(function (err) {
        console.error('Dashboard: VitalSync connection failed', err);
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
