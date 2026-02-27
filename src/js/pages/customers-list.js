// PTPM — Customers List Page
// Controller for the Customers List: filters, search, table, pagination.
// Loads contacts from VitalSync when API key is set; otherwise uses mock data.
// Exposes window.PtpmCustomersList with init().
(function () {
  'use strict';

  var config = window.AppConfig || {};
  var utils = window.PtpmUtils || window.AppUtils || {};
  var interaction = window.PtpmInteraction || {};

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(text) { return utils.escapeHtml ? utils.escapeHtml(text) : (function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; })(text); }

  function str(v) { return v == null || v === undefined ? '' : String(v).trim(); }

  // ─── Mock data (fallback when no API key or fetch fails) ───

  function getMockCustomers() {
    return [
      { id: 132132, accountName: 'Eagle Real Estate', firstName: 'Devon', email: 'devon@eagle.com', phone: '0412 345 678', address: '1 Queen St, South Brisbane', accountContact: 'Property Manager', accountType: 'Real Estate Agent', suburb: '964 Holland Park', createdDate: '12 July, 2025', bodyCorp: 'Body Corp 1', source: 'Real Estate/Body Corp' },
      { id: 321324, accountName: 'Sunrise Properties', firstName: 'Jordan', email: 'jordan@sunrise.com', phone: '0423 456 789', address: '45 Park Rd, Milton', accountContact: 'Leasing', accountType: 'Real Estate Agent', suburb: 'South Brisbane', createdDate: '10 July, 2025', bodyCorp: '-', source: 'Phone Call' },
      { id: 445566, accountName: 'Body Corp 2', firstName: 'Sam', email: 'sam@bodycorp2.com', phone: '0434 567 890', address: '12 Grey St, South Brisbane', accountContact: 'Committee', accountType: 'Body Corp', suburb: 'South Brisbane', createdDate: '8 July, 2025', bodyCorp: 'Body Corp 2', source: 'Website' },
      { id: 778899, accountName: 'Metro Rentals', firstName: 'Alex', email: 'alex@metro.com', phone: '0445 678 901', address: 'Queen Street', accountContact: 'Property Manager', accountType: 'Real Estate Agent', suburb: 'Brisbane City', createdDate: '1 July, 2025', bodyCorp: '-', source: 'Real Estate Agent' },
      { id: 101112, accountName: 'Harbour View', firstName: 'Casey', email: 'casey@harbour.com', phone: '0456 789 012', address: '88 Creek St', accountContact: 'Manager', accountType: 'Business & Gov', suburb: 'Brisbane City', createdDate: '15 June, 2025', bodyCorp: '-', source: 'Referral' },
    ];
  }

  // ─── Unwrap VitalSync record to plain object ─────────────────

  function unwrapRecord(record) {
    if (!record || typeof record !== 'object') return record;
    if (typeof record.getState === 'function') {
      try {
        var s = record.getState();
        if (s && typeof s === 'object') return Object.assign({}, s);
      } catch (_) { /* ignore */ }
    }
    return record;
  }

  // ─── Format contact record for customers table ──────────────

  function formatContactAsCustomer(rec, index) {
    var r = unwrapRecord(rec);
    if (!r) return null;
    var id = r.id != null ? r.id : (r.contact_id != null ? r.contact_id : 'contact-' + index);
    var firstName = str(r.first_name || r.firstName || r.First_Name);
    var lastName = str(r.last_name || r.lastName || r.Last_Name);
    var email = str(r.email || r.Email);
    var phone = str(r.sms_number || r.smsNumber || r.SMS_Number || r.office_phone || r.officePhone);
    var company = str(r.companyname || r.company_name || r.companyName);
    var dateAdded = r.date_added != null ? r.date_added : (r.created_at != null ? r.created_at : null);
    var createdDate = '';
    if (dateAdded != null) {
      if (typeof dateAdded === 'number') {
        try {
          var d = new Date(dateAdded * 1000);
          createdDate = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (_) { createdDate = String(dateAdded); }
      } else createdDate = String(dateAdded);
    }
    var address = str(r.address1 || r.address_1 || r.property_address_1 || r.address);
    return {
      id: id,
      accountName: company || '-',
      firstName: firstName || lastName || '-',
      email: email || '',
      phone: phone || '',
      address: address || '',
      accountContact: '',
      accountType: '',
      suburb: '',
      createdDate: createdDate || '-',
      bodyCorp: '-',
      source: '-',
    };
  }

  // ─── Direct GraphQL (proven to return data; SDK path was unreliable) ───

  var GRAPHQL_ENDPOINT = (config.API_BASE || 'https://' + (config.SLUG || 'peterpm') + '.vitalstats.app') + '/api/v1/graphql';
  var CALC_CONTACTS_QUERY = 'query calcContacts { calcContacts(limit: 1000, offset: 0) { id: field(arg: [\"id\"]) first_name: field(arg: [\"first_name\"]) last_name: field(arg: [\"last_name\"]) email: field(arg: [\"email\"]) sms_number: field(arg: [\"sms_number\"]) office_phone: field(arg: [\"office_phone\"]) } }';

  function fetchContactsViaGraphQL(apiKey) {
    return fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Api-Key': apiKey },
      body: JSON.stringify({ query: CALC_CONTACTS_QUERY }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
        return res.json();
      })
      .then(function (json) {
        if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'GraphQL error');
        var list = (json.data && json.data.calcContacts) || [];
        return Array.isArray(list) ? list : [];
      });
  }

  // ─── Load contacts from VitalSync or return mock ─────────────

  function extractRecordsFromResult(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    // VitalSync fetchDirect() returns { resp: [...] } (same as dashboard/domain)
    if (result.resp != null && Array.isArray(result.resp)) return result.resp;
    if (result.records != null && Array.isArray(result.records)) return result.records;
    if (result.data && Array.isArray(result.data)) return result.data;
    if (result.data && typeof result.data === 'object') {
      var keys = Object.keys(result.data);
      for (var i = 0; i < keys.length; i++) {
        var val = result.data[keys[i]];
        if (Array.isArray(val)) return val;
      }
    }
    // managedObjects: { PeterpmContact: { id1: {...}, id2: {...} } } -> array
    if (result.managedObjects && typeof result.managedObjects === 'object') {
      var mo = result.managedObjects;
      if (mo.PeterpmContact && typeof mo.PeterpmContact === 'object') {
        var arr = Object.values(mo.PeterpmContact);
        if (arr.length) return arr;
      }
      var firstKey = Object.keys(mo)[0];
      if (firstKey && mo[firstKey] && typeof mo[firstKey] === 'object') {
        var vals = Object.values(mo[firstKey]);
        if (vals.length) return vals;
      }
    }
    return [];
  }

  function loadContacts() {
    var apiKey = (config.API_KEY && String(config.API_KEY).trim()) || (window.__MOCK_API_KEY__ && String(window.__MOCK_API_KEY__).trim());
    console.log('[CustomersList] loadContacts: API key present?', !!apiKey, '| endpoint:', GRAPHQL_ENDPOINT);
    if (!apiKey) {
      var mockFromWindow = window.__MOCK_CONTACTS__;
      if (Array.isArray(mockFromWindow) && mockFromWindow.length > 0) {
        return Promise.resolve(mockFromWindow.map(function (r, i) { return formatContactAsCustomer(r, i); }).filter(Boolean));
      }
      return Promise.resolve(getMockCustomers());
    }
    return fetchContactsViaGraphQL(apiKey)
      .then(function (records) {
        console.log('[CustomersList] GraphQL response: records count =', records ? records.length : 0);
        if (!records || records.length === 0) return getMockCustomers();
        var list = records.map(function (r, i) { return formatContactAsCustomer(r, i); }).filter(Boolean);
        return list.length > 0 ? list : getMockCustomers();
      })
      .catch(function (err) {
        console.warn('[CustomersList] GraphQL fetch failed, using mock:', err);
        return getMockCustomers();
      });
  }

  var state = {
    allCustomers: [],
    filteredCustomers: [],
    filters: {
      accountName: '',
      firstName: '',
      email: '',
      accountContact: '',
      address: '',
      accountType: [],
      suburb: [],
      street: [],
      source: [],
      dateFrom: null,
      dateTo: null,
      hasEmail: 'all',
      wantsNewsletter: 'all',
    },
    appliedChips: [],
    searchQuery: '',
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    jobsBooked: 32,
    jobsInvoiced: 12,
  };

  var flatpickrInstances = { from: null, to: null };

  function getFiltered() {
    var list = state.allCustomers.slice();
    var q = (state.searchQuery || '').toLowerCase().trim();
    if (q) {
      list = list.filter(function (c) {
        return (
          String(c.id).indexOf(q) !== -1 ||
          (c.accountName || '').toLowerCase().indexOf(q) !== -1 ||
          (c.firstName || '').toLowerCase().indexOf(q) !== -1 ||
          (c.email || '').toLowerCase().indexOf(q) !== -1 ||
          (c.address || '').toLowerCase().indexOf(q) !== -1 ||
          (c.accountContact || '').toLowerCase().indexOf(q) !== -1
        );
      });
    }
    var f = state.filters;
    if (f.accountName) list = list.filter(function (c) { return (c.accountName || '').toLowerCase().indexOf(f.accountName.toLowerCase()) !== -1; });
    if (f.firstName) list = list.filter(function (c) { return (c.firstName || '').toLowerCase().indexOf(f.firstName.toLowerCase()) !== -1; });
    if (f.email) list = list.filter(function (c) { return (c.email || '').toLowerCase().indexOf(f.email.toLowerCase()) !== -1; });
    if (f.accountContact) list = list.filter(function (c) { return (c.accountContact || '').toLowerCase().indexOf(f.accountContact.toLowerCase()) !== -1; });
    if (f.address) list = list.filter(function (c) { return (c.address || '').toLowerCase().indexOf(f.address.toLowerCase()) !== -1; });
    if (f.accountType.length) list = list.filter(function (c) { return f.accountType.indexOf(c.accountType) !== -1; });
    if (f.suburb.length) list = list.filter(function (c) { return f.suburb.indexOf(c.suburb) !== -1; });
    if (f.source.length) list = list.filter(function (c) { return f.source.indexOf(c.source) !== -1; });
    return list;
  }

  function buildAppliedChips() {
    var chips = [];
    var f = state.filters;
    if (f.dateFrom && f.dateTo) chips.push({ label: f.dateFrom + ' to ' + f.dateTo, key: 'dateRange' });
    if (f.suburb.length) f.suburb.forEach(function (s) { chips.push({ label: s, key: 'suburb', value: s }); });
    if (f.street.length) f.street.forEach(function (s) { chips.push({ label: s, key: 'street', value: s }); });
    if (f.source.length) f.source.forEach(function (s) { chips.push({ label: s, key: 'source', value: s }); });
    if (f.accountType.length) f.accountType.forEach(function (s) { chips.push({ label: s, key: 'accountType', value: s }); });
    return chips;
  }

  function renderTable() {
    state.filteredCustomers = getFiltered();
    state.totalPages = Math.max(1, Math.ceil(state.filteredCustomers.length / state.pageSize));
    state.currentPage = Math.min(state.currentPage, state.totalPages);

    var container = byId('customers-table-container');
    if (!container) return;

    var start = (state.currentPage - 1) * state.pageSize;
    var pageRows = state.filteredCustomers.slice(start, start + state.pageSize);

    var headers = ['Account #', 'Principal Name', 'Account Status', 'Property Type', 'Customer Type', 'Last Activity', 'Next Activity', 'Created Date', 'Job Status', 'Actions'];
    var html = '<table class="w-full border-collapse text-sm"><thead><tr class="border-b border-slate-200 bg-slate-50">';
    headers.forEach(function (h) {
      html += '<th class="text-left px-4 py-3 font-semibold text-slate-700">' + escapeHtml(h) + '</th>';
    });
    html += '</tr></thead><tbody>';

    var principalName = function (row) {
      var n = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
      return n || '—';
    };

    pageRows.forEach(function (row, i) {
      var trClass = (start + i) % 2 === 0 ? 'table-row-even' : 'table-row-odd';
      var detailHref = (config.CUSTOMER_DETAIL_URL_TEMPLATE || './customer-detail.html?contact={id}').replace(/\{id\}/g, String(row.id));
      var goDetail = 'window.location.href=this.href;return false;';
      html += '<tr class="border-b border-slate-100 ' + trClass + '">';
      html += '<td class="px-4 py-2"><a href="' + escapeHtml(detailHref) + '" class="text-[#003882] font-medium hover:underline" onclick="' + goDetail + '">#' + escapeHtml(String(row.id)) + '</a></td>';
      html += '<td class="px-4 py-2 text-slate-800">' + escapeHtml(principalName(row)) + '</td>';
      html += '<td class="px-4 py-2 text-slate-600">—</td>';
      html += '<td class="px-4 py-2 text-slate-600">—</td>';
      html += '<td class="px-4 py-2 text-slate-600">—</td>';
      html += '<td class="px-4 py-2 text-slate-600">—</td>';
      html += '<td class="px-4 py-2 text-slate-600">—</td>';
      html += '<td class="px-4 py-2 text-slate-600">' + escapeHtml(row.createdDate || '—') + '</td>';
      html += '<td class="px-4 py-2 text-slate-600">—</td>';
      html += '<td class="px-4 py-2"><div class="flex items-center gap-1">';
      html += '<a href="' + escapeHtml(detailHref) + '" class="inline-flex p-1.5 cursor-pointer text-slate-500 hover:text-[#003882] rounded" title="View" onclick="' + goDetail + '"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg></a>';
      html += '<button type="button" class="p-1.5 cursor-pointer text-slate-500 hover:text-red-600 rounded" title="Delete" data-action="delete" data-customer-id="' + row.id + '"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg></button>';
      html += '<button type="button" class="p-1.5 cursor-pointer text-slate-500 hover:text-slate-700 rounded" title="More" data-action="more" data-customer-id="' + row.id + '"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg></button>';
      html += '</div></td>';
      html += '</tr>';
    });

    if (pageRows.length === 0) {
      html += interaction.tableEmptyRow
        ? interaction.tableEmptyRow(10, 'No customers match your filters.')
        : '<tr><td colspan="10" class="px-4 py-8 text-center text-slate-500">No customers match your filters.</td></tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderPaginationSummary() {
    var summaryEl = byId('pagination-summary');
    var pageOfEl = byId('pagination-page-of');
    var totalItems = state.filteredCustomers.length;
    var pageSize = state.pageSize;
    var totalPages = state.totalPages;
    var cur = state.currentPage;
    var from = totalItems === 0 ? 0 : (cur - 1) * pageSize + 1;
    var to = Math.min(cur * pageSize, totalItems);
    if (summaryEl) summaryEl.textContent = from + ' - ' + to + ' of ' + totalItems + ' items';
    if (pageOfEl) pageOfEl.textContent = 'Page ' + cur + ' of ' + Math.max(1, totalPages);
  }

  function renderPagination() {
    renderPaginationSummary();
    var wrap = byId('pagination-pages');
    if (!wrap) return;
    wrap.innerHTML = '';
    var total = state.totalPages;
    var cur = state.currentPage;
    var show = [];
    if (total <= 7) {
      for (var i = 1; i <= total; i++) show.push(i);
    } else {
      show.push(1);
      if (cur > 3) show.push('…');
      for (var j = Math.max(2, cur - 1); j <= Math.min(total - 1, cur + 1); j++) { if (show.indexOf(j) === -1) show.push(j); }
      if (cur < total - 2) show.push('…');
      if (total > 1) show.push(total);
    }
    show.forEach(function (p) {
      if (p === '…') {
        wrap.appendChild(document.createTextNode('…'));
        return;
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ptpm-btn ptpm-btn-sm h-8 min-w-[2rem] rounded ' + (p === cur ? 'bg-[#003882] text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50');
      btn.textContent = p;
      btn.dataset.page = p;
      btn.addEventListener('click', function () {
        state.currentPage = parseInt(p, 10);
        renderTable();
        renderPagination();
      });
      wrap.appendChild(btn);
    });
  }

  function renderFilterChips() {
    state.appliedChips = buildAppliedChips();
    var container = byId('filter-chips');
    var clearBtn = byId('clear-all-filters');
    if (!container) return;
    container.innerHTML = '';
    var allChip = document.createElement('span');
    allChip.className = 'inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-medium';
    allChip.textContent = 'All Customers (' + state.allCustomers.length + ')';
    container.appendChild(allChip);
    state.appliedChips.forEach(function (chip) {
      var span = document.createElement('span');
      span.className = 'inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-2.5 py-1 text-xs font-medium';
      span.innerHTML = escapeHtml(chip.label) + ' <button type="button" class="hover:text-blue-900" data-chip-key="' + escapeHtml(chip.key) + '" data-chip-value="' + escapeHtml(chip.value || '') + '">&times;</button>';
      container.appendChild(span);
    });
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', state.appliedChips.length === 0);
    }
    container.querySelectorAll('[data-chip-key]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-chip-key');
        var val = btn.getAttribute('data-chip-value');
        if (key === 'dateRange') {
          state.filters.dateFrom = null;
          state.filters.dateTo = null;
          if (flatpickrInstances.from) flatpickrInstances.from.clear();
          if (flatpickrInstances.to) flatpickrInstances.to.clear();
        } else if (key && state.filters[key] && state.filters[key].indexOf) {
          state.filters[key] = state.filters[key].filter(function (v) { return v !== val; });
        }
        renderFilterChips();
        renderTable();
        renderPagination();
      });
    });
    if (clearBtn) {
      clearBtn.onclick = function () {
        state.filters.dateFrom = null;
        state.filters.dateTo = null;
        state.filters.suburb = [];
        state.filters.street = [];
        state.filters.source = [];
        state.filters.accountType = [];
        if (flatpickrInstances.from) flatpickrInstances.from.clear();
        if (flatpickrInstances.to) flatpickrInstances.to.clear();
        state.appliedChips = [];
        renderFilterChips();
        renderTable();
        renderPagination();
      };
    }
  }

  function updateBadges() {
    var jobsBookedEl = byId('jobs-booked-count');
    var jobsInvoicedEl = byId('jobs-invoiced-count');
    if (jobsBookedEl) jobsBookedEl.textContent = state.jobsBooked;
    if (jobsInvoicedEl) jobsInvoicedEl.textContent = state.jobsInvoiced;
  }

  function initFlatpickr() {
    var inputFrom = byId('filter-date-from');
    var inputTo = byId('filter-date-to');
    if (typeof window.flatpickr !== 'function') return;
    if (inputFrom) {
      flatpickrInstances.from = window.flatpickr(inputFrom, {
        dateFormat: 'd M Y',
        onChange: function (sel) {
          state.filters.dateFrom = sel[0] && window.dayjs ? window.dayjs(sel[0]).format('D MMM YYYY') : null;
          renderFilterChips();
        },
      });
    }
    if (inputTo) {
      flatpickrInstances.to = window.flatpickr(inputTo, {
        dateFormat: 'd M Y',
        onChange: function (sel) {
          state.filters.dateTo = sel[0] && window.dayjs ? window.dayjs(sel[0]).format('D MMM YYYY') : null;
          renderFilterChips();
        },
      });
    }
  }

  function populateDropdowns() {
    var customers = state.allCustomers;
    var uniq = function (key) {
      var seen = {};
      return customers.map(function (c) { return c[key]; }).filter(Boolean).filter(function (v) {
        if (seen[v]) return false;
        seen[v] = true;
        return true;
      }).sort();
    };
    var accountTypes = uniq('accountType');
    var suburbs = uniq('suburb');
    var sources = uniq('source');
    var streets = ['Queen Street', 'Grey St', 'Park Rd', 'Creek St'];
    function fillList(ulId, items, dataAttr) {
      var ul = document.querySelector('#' + ulId);
      if (!ul) return;
      var attr = dataAttr || 'data-value';
      ul.innerHTML = items.map(function (item) {
        return '<li class="px-2 py-1 flex items-center gap-2"><input ' + attr + ' value="' + escapeHtml(item) + '" type="checkbox" class="h-4 w-4 accent-[#003882]"><label>' + escapeHtml(item) + '</label></li>';
      }).join('');
    }
    fillList('account-type-filter-card', accountTypes, 'data-account-type');
    fillList('suburb-filter-card', suburbs, 'data-suburb');
    fillList('street-filter-card', streets, 'data-street');
    fillList('source-filter-card', sources, 'data-source');
  }

  function bindFilterCheckboxes() {
    function bindCard(cardId, filterKey, dataAttr) {
      var card = byId(cardId);
      if (!card) return;
      var attr = dataAttr || 'data-value';
      card.addEventListener('change', function (e) {
        var input = e.target;
        if (input.type !== 'checkbox') return;
        var val = input.getAttribute(attr) || input.value;
        if (!val) return;
        var arr = state.filters[filterKey] || [];
        if (input.checked) {
          if (arr.indexOf(val) === -1) arr.push(val);
        } else {
          state.filters[filterKey] = arr.filter(function (v) { return v !== val; });
          renderFilterChips();
          renderTable();
          renderPagination();
          return;
        }
        state.filters[filterKey] = arr;
        renderFilterChips();
        renderTable();
        renderPagination();
      });
    }
    bindCard('account-type-filter-card', 'accountType', 'data-account-type');
    bindCard('suburb-filter-card', 'suburb', 'data-suburb');
    bindCard('street-filter-card', 'street', 'data-street');
    bindCard('source-filter-card', 'source', 'data-source');
  }

  function showTableLoading(show) {
    var container = byId('customers-table-container');
    if (!container) return;
    if (show) {
      container.innerHTML = '<div class="flex items-center justify-center py-12 text-slate-500 text-sm">Loading contacts…</div>';
    }
  }

  function init() {
    showTableLoading(true);

    var newCustomerBtn = byId('new-customer-btn');
    if (newCustomerBtn) {
      newCustomerBtn.addEventListener('click', function () {
        window.location.href = config.NEW_CUSTOMER_URL || './new-customer.html';
      });
    }
    var addNewLink = byId('add-new-customer-link');
    if (addNewLink) {
      addNewLink.href = config.NEW_CUSTOMER_URL || './new-customer.html';
      addNewLink.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = this.href;
      });
    }
    var exportCsvBtn = byId('export-csv-btn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', function () {
        var rows = state.filteredCustomers || [];
        var headers = ['Account #', 'Principal Name', 'Account Status', 'Property Type', 'Customer Type', 'Last Activity', 'Next Activity', 'Created Date', 'Job Status', 'Email', 'Phone'];
        var esc = function (v) {
          var s = String(v == null ? '' : v);
          if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        };
        var principalName = function (r) { return [r.firstName, r.lastName].filter(Boolean).join(' ').trim() || ''; };
        var line = headers.map(esc).join(',');
        var lines = [line];
        rows.forEach(function (r) {
          lines.push([r.id, principalName(r), '', '', '', '', '', r.createdDate || '', '', r.email || '', r.phone || ''].map(esc).join(','));
        });
        var csv = lines.join('\r\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'customers.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    loadContacts().then(function (customers) {
      var list = Array.isArray(customers) ? customers : getMockCustomers();
      state.allCustomers = list.length > 0 ? list : getMockCustomers();
      state.filteredCustomers = state.allCustomers.slice();
      state.totalPages = Math.max(1, Math.ceil(state.filteredCustomers.length / state.pageSize));
      state.currentPage = 1;

      initFlatpickr();
      populateDropdowns();
      bindFilterCheckboxes();

      // Delegate: only action buttons (View/Customer ID are real <a href="...">, so no JS needed)
      var tableContainer = byId('customers-table-container');
      if (tableContainer) {
        tableContainer.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest && e.target.closest('button[data-action]');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            var action = btn.getAttribute('data-action');
            var id = btn.getAttribute('data-customer-id');
            if (action === 'delete' && config.DEBUG) console.log('Delete customer', id);
            if (action === 'more' && config.DEBUG) console.log('More options', id);
          }
        });
      }
      updateBadges();
      renderTable();
      renderPagination();
      renderFilterChips();

    var applyBtn = byId('apply-filters-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        state.filters.accountName = (byId('filter-account-name') && byId('filter-account-name').value) || '';
        state.filters.firstName = (byId('filter-first-name') && byId('filter-first-name').value) || '';
        state.filters.email = (byId('filter-email') && byId('filter-email').value) || '';
        state.filters.accountContact = (byId('filter-account-contact') && byId('filter-account-contact').value) || '';
        state.filters.address = (byId('filter-address') && byId('filter-address').value) || '';
        var fromEl = byId('filter-date-from');
        var toEl = byId('filter-date-to');
        state.filters.dateFrom = (fromEl && fromEl.value) || null;
        state.filters.dateTo = (toEl && toEl.value) || null;
        state.appliedChips = buildAppliedChips();
        renderFilterChips();
        renderTable();
        renderPagination();
      });
    }

    var searchInput = byId('search-customers');
    if (searchInput) {
      var searchTimeout;
      searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          state.searchQuery = searchInput.value;
          state.currentPage = 1;
          renderTable();
          renderPagination();
        }, 200);
      });
    }

    var prevBtn = byId('prev-page-btn');
    var nextBtn = byId('next-page-btn');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
        renderPagination();
      }
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (state.currentPage < state.totalPages) {
        state.currentPage++;
        renderTable();
        renderPagination();
      }
    });

    // Back link: in dev set to dashboard; in Ontraport set href via merge/config
    var backLink = byId('customers-list-back');
    if (backLink) {
      var href = backLink.getAttribute('href');
      if (!href || href === '#') {
        backLink.href = (config.DASHBOARD_URL || './dashboard.html');
      }
      backLink.addEventListener('click', function (e) {
        if (this.getAttribute('href') === '#') {
          e.preventDefault();
          if (window.history && window.history.length > 1) window.history.back();
        }
      });
    }

    // Other header buttons (placeholder)
    ['email-customers-btn', 'export-mailchimp-btn', 'export-excel-btn', 'print-list-btn'].forEach(function (id) {
      var el = byId(id);
      if (el) el.addEventListener('click', function () {
        if (config.DEBUG) console.log('Customers list action:', id);
      });
    });
    var editCols = byId('edit-columns-btn');
    var saveView = byId('save-view-btn');
    if (editCols) editCols.addEventListener('click', function () { if (config.DEBUG) console.log('Edit columns'); });
    if (saveView) saveView.addEventListener('click', function () { if (config.DEBUG) console.log('Save view as'); });
    }).catch(function (err) {
      if (config.DEBUG) console.error('[CustomersList] init error:', err);
      state.allCustomers = getMockCustomers();
      state.filteredCustomers = state.allCustomers.slice();
      state.totalPages = Math.max(1, Math.ceil(state.filteredCustomers.length / state.pageSize));
      updateBadges();
      renderTable();
      renderPagination();
      renderFilterChips();
      initFlatpickr();
      populateDropdowns();
      bindFilterCheckboxes();
      var tableContainer = byId('customers-table-container');
      if (tableContainer) {
        tableContainer.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest && e.target.closest('button[data-action]');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            var action = btn.getAttribute('data-action');
            var id = btn.getAttribute('data-customer-id');
            if (action === 'delete' && config.DEBUG) console.log('Delete customer', id);
            if (action === 'more' && config.DEBUG) console.log('More options', id);
          }
        });
      }
    });
  }

  window.PtpmCustomersList = { init: init };
})();
