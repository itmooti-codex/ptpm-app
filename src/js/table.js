// PTPM — Table Renderer
// Dynamic table with pagination, status badges, client cells, and action buttons.
// Adapted from z-new-version's ui/shared modules.
// Exposes window.PtpmTable.
(function () {
  'use strict';

  var config = window.AppConfig || {};
  var brandColor = config.BRAND_COLOR || '#003882';
  var utils = window.PtpmUtils;

  // ─── Dynamic Table Renderer ────────────────────────────────
  // Generic table builder that renders headers + rows into a container.
  // Supports: string/HTML/Node cell values, zebra striping, custom row classes,
  // header render functions, colSpan/rowSpan, and empty state.

  function renderDynamicTable(opts) {
    opts = opts || {};
    var container = opts.container;
    var headers = opts.headers || [];
    var rows = opts.rows || [];
    var emptyState = opts.emptyState || 'No records found.';
    var zebra = opts.zebra || false;
    var getRowClass = opts.getRowClass || null;
    var tableClass = opts.tableClass || 'w-full table-fixed text-sm text-slate-700';
    var theadClass = opts.theadClass || 'bg-[#f5f8ff] text-xs font-semibold uppercase tracking-wide border-b border-slate-200';
    var tbodyClass = opts.tbodyClass || 'bg-white';
    var defaultHeaderClass = opts.defaultHeaderClass || 'truncate px-6 py-4 text-left';
    var defaultCellClass = opts.defaultCellClass || 'px-6 py-4 text-slate-600';
    var emptyCellClass = opts.emptyCellClass || 'px-6 py-6 text-center text-sm text-slate-500';
    var onSort = typeof opts.onSort === 'function' ? opts.onSort : null;
    var sortState = opts.sortState || null; // { field, direction }

    var root = typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) return null;

    // Normalize headers
    var normHeaders = headers.map(function (header, index) {
      if (typeof header === 'string') return { key: index, label: header };
      if (header == null || typeof header !== 'object') return { key: index, label: String(header || '') };
      if (header.key == null) return Object.assign({}, header, { key: header.label || index });
      return header;
    });

    // Cell content renderer
    var createCellContent = function (cell, value) {
      if (value instanceof Node) { cell.appendChild(value); return; }
      if (value == null) { cell.textContent = ''; return; }
      if (typeof value === 'string') { cell.innerHTML = value; return; }
      if (typeof value === 'object' && value.hasOwnProperty('__html')) { cell.innerHTML = value.__html || ''; return; }
      cell.textContent = String(value);
    };

    root.innerHTML = '';
    var table = document.createElement('table');
    table.className = tableClass;

    // THEAD
    var thead = document.createElement('thead');
    thead.className = theadClass;
    var headRow = document.createElement('tr');

    normHeaders.forEach(function (header) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.className = header.headerClass || defaultHeaderClass;
      if (header.colSpan != null) th.colSpan = header.colSpan;
      if (header.rowSpan != null) th.rowSpan = header.rowSpan;
      if (header.html != null) {
        th.innerHTML = header.html;
      } else if (header.sortField) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inline-flex items-center gap-1 text-left';
        btn.setAttribute('data-sort-field', header.sortField);
        btn.setAttribute('aria-label', 'Sort by ' + (header.label || header.key || 'column'));
        var label = document.createElement('span');
        label.textContent = header.label || '';
        btn.appendChild(label);

        var arrow = document.createElement('span');
        var isActive = sortState && sortState.field === header.sortField;
        var direction = isActive ? (sortState.direction || 'desc') : '';
        arrow.textContent = direction === 'asc' ? '↑' : (direction === 'desc' ? '↓' : '↕');
        arrow.className = 'text-[10px] text-slate-500';
        btn.appendChild(arrow);
        th.appendChild(btn);
      } else {
        th.textContent = header.label || '';
      }
      th.setAttribute('data-col', header.label || header.key || '');
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    if (onSort) {
      thead.addEventListener('click', function (e) {
        var sortBtn = e.target.closest('[data-sort-field]');
        if (!sortBtn) return;
        var field = sortBtn.getAttribute('data-sort-field');
        if (field) onSort(field);
      });
    }
    table.appendChild(thead);

    // TBODY
    var tbody = document.createElement('tbody');
    tbody.className = tbodyClass;

    if (!rows.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = normHeaders.length || 1;
      emptyCell.className = emptyCellClass;
      var emptyValue = typeof emptyState === 'function' ? emptyState() : emptyState;
      createCellContent(emptyCell, emptyValue);
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      rows.forEach(function (row, rowIndex) {
        var tr = document.createElement('tr');
        if (row.id) tr.setAttribute('data-unique-id', row.id);
        if (row.recordId) tr.setAttribute('data-record-id', row.recordId);
        var zebraClass = zebra ? (rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#f5f8ff]') : '';
        var extraRowClass = typeof getRowClass === 'function' ? getRowClass(row, rowIndex) : '';
        var rowClass = [zebraClass, extraRowClass].filter(Boolean).join(' ').trim();
        if (rowClass) tr.className = rowClass;

        normHeaders.forEach(function (header, columnIndex) {
          var td = document.createElement('td');
          td.className = header.cellClass || defaultCellClass;
          td.setAttribute('data-col', header.label || header.key || '');
          var cellValue;
          if (typeof header.render === 'function') {
            cellValue = header.render(row, { rowIndex: rowIndex, columnIndex: columnIndex, header: header });
          } else if (Array.isArray(row)) {
            cellValue = row[columnIndex];
          } else if (header.key != null) {
            cellValue = row[header.key];
          }
          createCellContent(td, cellValue);
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    root.appendChild(table);
    return { table: table, thead: thead, tbody: tbody };
  }


  // ─── Pagination ────────────────────────────────────────────
  // Renders page buttons into a container and dispatches 'paginationChange' events.

  function createPagination(opts) {
    opts = opts || {};
    var containerSelector = opts.container || '#pagination-pages';
    var prevSelector = opts.prevBtn || '#lt-btn';
    var nextSelector = opts.nextBtn || '#gt-btn';
    var totalPages = opts.totalPages || 1;
    var currentPage = opts.currentPage || 1;
    var pageGroupSize = opts.pageGroupSize || 5;
    var onPageChange = opts.onPageChange || null;

    var container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
    var prevBtn = typeof prevSelector === 'string' ? document.querySelector(prevSelector) : prevSelector;
    var nextBtn = typeof nextSelector === 'string' ? document.querySelector(nextSelector) : nextSelector;

    if (!container) return null;

    var startIndex = 1;
    var endIndex = Math.min(pageGroupSize, totalPages);

    function renderButtons() {
      container.innerHTML = '';
      var fragment = document.createDocumentFragment();

      for (var i = startIndex; i <= endIndex && i <= totalPages; i++) {
        var btn = document.createElement('div');
        btn.dataset.idx = i;
        btn.className = 'h-8 min-w-8 px-2 rounded inline-flex justify-center items-center cursor-pointer text-xs text-slate-500';

        var text = document.createElement('div');
        text.textContent = i;
        text.className = 'text-xs text-slate-500';

        if (i === currentPage) {
          btn.classList.add('bg-[#003882]', 'text-white');
          text.classList.remove('text-slate-500');
          text.classList.add('text-white', 'font-medium');
        }

        btn.appendChild(text);
        fragment.appendChild(btn);
      }

      if (endIndex < totalPages) {
        var ellipsis = document.createElement('div');
        ellipsis.className = 'h-8 px-3 py-1 rounded inline-flex items-center text-slate-400 text-xs';
        ellipsis.textContent = '...';
        fragment.appendChild(ellipsis);
      }

      container.appendChild(fragment);
    }

    function emitChange() {
      if (onPageChange) onPageChange(currentPage);
      document.dispatchEvent(new CustomEvent('paginationChange', {
        detail: { currentPage: currentPage },
      }));
    }

    function handlePageClick(e) {
      var btn = e.target.closest('div[data-idx]');
      if (!btn) return;
      var page = Number(btn.dataset.idx);
      if (page === currentPage) return;
      currentPage = page;
      renderButtons();
      emitChange();
    }

    function handlePrev() {
      if (startIndex <= 1) return;
      startIndex = Math.max(1, startIndex - pageGroupSize);
      endIndex = startIndex + pageGroupSize - 1;
      currentPage = startIndex;
      renderButtons();
      emitChange();
    }

    function handleNext() {
      if (endIndex >= totalPages) return;
      startIndex = endIndex + 1;
      endIndex = startIndex + pageGroupSize - 1;
      currentPage = startIndex;
      renderButtons();
      emitChange();
    }

    container.addEventListener('click', handlePageClick);
    if (prevBtn) prevBtn.addEventListener('click', handlePrev);
    if (nextBtn) nextBtn.addEventListener('click', handleNext);

    renderButtons();

    return {
      getCurrentPage: function () { return currentPage; },
      setTotalPages: function (n) {
        totalPages = n;
        startIndex = 1;
        endIndex = Math.min(pageGroupSize, totalPages);
        currentPage = 1;
        renderButtons();
      },
      goToPage: function (page) {
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        // Adjust group if page is outside visible range
        if (page < startIndex || page > endIndex) {
          startIndex = Math.max(1, page - Math.floor(pageGroupSize / 2));
          endIndex = startIndex + pageGroupSize - 1;
        }
        renderButtons();
      },
      destroy: function () {
        container.removeEventListener('click', handlePageClick);
        if (prevBtn) prevBtn.removeEventListener('click', handlePrev);
        if (nextBtn) nextBtn.removeEventListener('click', handleNext);
      },
    };
  }


  // ─── Status Badge ──────────────────────────────────────────
  // Returns HTML string for a colored status badge.

  function buildStatusBadge(row, statusClasses) {
    statusClasses = statusClasses || {};
    var status = (row && row.status) || (row && row.jobStatus) || (row && row.quoteStatus) ||
                 (row && row.paymentStatus) || (row && row.activeJobStatus) || '-';
    var badgeClass = statusClasses[status] || 'bg-slate-100 text-slate-600';
    return '<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ' + badgeClass + '">' + status + '</span>';
  }


  // ─── Client Cell ───────────────────────────────────────────
  // Renders client name + contact icons (phone, email, map).

  function buildClientCell(row) {
    var meta = (row && row.meta) || {};
    var clientName = (row && row.client) || '';
    var subtext = (row && row.clientSubtext) || '';
    var clientUrl = meta.clientUrl || '';
    var clientSubtextUrl = meta.clientSubtextUrl || '';
    var clientHtml = clientUrl
      ? '<a href="' + clientUrl + '" class="font-normal text-slate-700 hover:underline">' + utils.escapeHtml(clientName) + '</a>'
      : '<div class="font-normal text-slate-700">' + utils.escapeHtml(clientName) + '</div>';
    var subtextHtml = '';
    if (subtext) {
      subtextHtml = clientSubtextUrl
        ? '<a href="' + clientSubtextUrl + '" class="text-xs text-slate-500 mt-0.5 block hover:underline">' + utils.escapeHtml(subtext) + '</a>'
        : '<div class="text-xs text-slate-500 mt-0.5">' + utils.escapeHtml(subtext) + '</div>';
    }
    return clientHtml + subtextHtml +
      buildClientContactIcons(meta);
  }

  function buildClientContactIcons(meta) {
    meta = meta || {};
    var email = meta.email || '';
    var sms = meta.sms || '';
    var address = meta.address || '';
    var emailHref = email && email !== '-' ? 'mailto:' + email : '#';
    var mapHref = address && address !== '-'
      ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address)
      : '#';
    var callHref = sms && sms !== '-' ? 'tel:' + sms : '#';
    var fill = brandColor;

    return '<div class="mt-2 flex items-center gap-2">' +
      '<a data-action="call" href="' + callHref + '"' + (sms && sms !== '-' ? '' : ' aria-disabled="true"') + ' title="' + sms + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="' + fill + '"><path d="M2.003 5.884l3.245-.62a1 1 0 011.066.553l1.284 2.568a1 1 0 01-.23 1.149l-1.516 1.513a11.037 11.037 0 005.004 5.004l1.513-1.516a1 1 0 011.149-.23l2.568 1.284a1 1 0 01.553 1.066l-.62 3.245a1 1 0 01-.979.815A14.978 14.978 0 012 5.863a1 1 0 01.003.021z"/></svg>' +
      '</a>' +
      '<a data-action="email" href="' + emailHref + '"' + (email && email !== '-' ? '' : ' aria-disabled="true"') + ' title="' + email + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="' + fill + '"><path d="M2.94 6.342A2 2 0 014.564 5h10.872a2 2 0 011.624.842l-7.06 5.297-7.06-5.297z"/><path d="M18 8.118l-6.76 5.07a1.5 1.5 0 01-1.76 0L2.72 8.118A1.994 1.994 0 002 9.874V14a2 2 0 002 2h12a2 2 0 002-2V9.874c0-.603-.272-1.175-.74-1.756z"/></svg>' +
      '</a>' +
      '<a data-action="address" href="' + mapHref + '"' + (address && address !== '-' ? ' target="_blank" rel="noopener"' : ' aria-disabled="true"') + ' title="' + address + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="' + fill + '"><path fill-rule="evenodd" d="M10 18a.75.75 0 01-.53-.22c-.862-.864-2.392-2.56-3.55-4.383C4.746 11.425 4 9.666 4 8a6 6 0 1112 0c0 1.666-.746 3.425-1.92 5.397-1.158 1.822-2.688 3.519-3.55 4.383A.75.75 0 0110 18zm0-8.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd"/></svg>' +
      '</a></div>';
  }


  // ─── Action Buttons ────────────────────────────────────────
  // Returns HTML string for view/add/delete row action icons.

  // Use data-action + class (no id) so multiple rows don't duplicate ids
  var actionButtons = '<div class="flex items-center justify-center gap-4">' +
    '<span data-action="view" class="ptpm-action-view cursor-pointer inline-flex" title="View" role="button"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.6283 7.59794C14.6089 7.55406 14.1383 6.51017 13.0922 5.46405C11.6983 4.07016 9.93776 3.3335 7.99998 3.3335C6.0622 3.3335 4.30164 4.07016 2.90775 5.46405C1.86164 6.51017 1.38886 7.55572 1.37164 7.59794C1.34637 7.65478 1.33331 7.7163 1.33331 7.7785C1.33331 7.8407 1.34637 7.90222 1.37164 7.95905C1.39109 8.00294 1.86164 9.04628 2.90775 10.0924C4.30164 11.4857 6.0622 12.2224 7.99998 12.2224C9.93776 12.2224 11.6983 11.4857 13.0922 10.0924C14.1383 9.04628 14.6089 8.00294 14.6283 7.95905C14.6536 7.90222 14.6666 7.8407 14.6666 7.7785C14.6666 7.7163 14.6536 7.65478 14.6283 7.59794ZM7.99998 10.0002C7.56047 10.0002 7.13082 9.86984 6.76538 9.62566C6.39994 9.38147 6.11511 9.03441 5.94691 8.62835C5.77872 8.22229 5.73471 7.77548 5.82046 7.34441C5.9062 6.91334 6.11785 6.51738 6.42863 6.20659C6.73941 5.89581 7.13538 5.68416 7.56644 5.59842C7.99751 5.51267 8.44433 5.55668 8.85039 5.72488C9.25645 5.89307 9.60351 6.1779 9.84769 6.54334C10.0919 6.90879 10.2222 7.33843 10.2222 7.77794C10.2222 8.36731 9.98808 8.93255 9.57133 9.34929C9.15458 9.76604 8.58935 10.0002 7.99998 10.0002Z" fill="#636D88"/></span>' +
    '<span data-action="add" class="ptpm-action-add cursor-pointer inline-flex" title="Add" role="button"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.00001 1.3335C6.68147 1.3335 5.39254 1.72449 4.29621 2.45703C3.19988 3.18957 2.3454 4.23077 1.84082 5.44894C1.33623 6.66711 1.20421 8.00756 1.46144 9.30076C1.71868 10.594 2.35362 11.7819 3.28597 12.7142C4.21832 13.6466 5.4062 14.2815 6.69941 14.5387C7.99262 14.796 9.33306 14.6639 10.5512 14.1594C11.7694 13.6548 12.8106 12.8003 13.5431 11.704C14.2757 10.6076 14.6667 9.3187 14.6667 8.00016C14.6648 6.23263 13.9618 4.53802 12.712 3.28818C11.4622 2.03834 9.76755 1.33536 8.00001 1.3335ZM11.0769 8.51298H8.51283V10.5643C8.51283 10.7003 8.4588 10.8307 8.36263 10.9269C8.26646 11.0231 8.13602 11.0771 8.00001 11.0771C7.864 11.0771 7.73356 11.0231 7.63739 10.9269C7.54122 10.8307 7.48719 10.7003 7.48719 10.5643V8.51298H5.43591C5.2999 8.51298 5.16946 8.45895 5.07329 8.36278C4.97712 8.26661 4.92309 8.13617 4.92309 8.00016C4.92309 7.86415 4.97712 7.73372 5.07329 7.63754C5.16946 7.54137 5.2999 7.48734 5.43591 7.48734H7.48719V5.43606C7.48719 5.30005 7.54122 5.16961 7.63739 5.07344C7.73356 4.97727 7.864 4.92324 8.00001 4.92324C8.13602 4.92324 8.26646 4.97727 8.36263 5.07344C8.4588 5.16961 8.51283 5.30005 8.51283 5.43606V7.48734H10.5641C10.7001 7.48734 10.8306 7.54137 10.9267 7.63754C11.0229 7.73372 11.0769 7.86415 11.0769 8.00016C11.0769 8.13617 11.0229 8.26661 10.9267 8.36278C10.8306 8.45895 10.7001 8.51298 10.5641 8.51298H8.51283Z" fill="#636D88"/></span>' +
    '<span data-action="delete" class="ptpm-action-delete cursor-pointer inline-flex" title="Delete" role="button"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.7949 3.38478H11.2308V2.87196C11.2308 2.46393 11.0687 2.07262 10.7802 1.7841C10.4916 1.49558 10.1003 1.3335 9.69231 1.3335H6.61539C6.20736 1.3335 5.81605 1.49558 5.52753 1.7841C5.23901 2.07262 5.07692 2.46393 5.07692 2.87196V3.38478H2.51282C2.37681 3.38478 2.24637 3.43881 2.1502 3.53498C2.05403 3.63115 2 3.76159 2 3.8976C2 4.03361 2.05403 4.16405 2.1502 4.26022C2.24637 4.35639 2.37681 4.41042 2.51282 4.41042H3.02564V13.6412C3.02564 13.9132 3.1337 14.1741 3.32604 14.3664C3.51839 14.5588 3.77927 14.6668 4.05128 14.6668H12.2564C12.5284 14.6668 12.7893 14.5588 12.9816 14.3664C13.174 14.1741 13.2821 13.9132 13.2821 13.6412V4.41042H13.7949C13.9309 4.41042 14.0613 4.35639 14.1575 4.26022C14.2537 4.16405 14.3077 4.03361 14.3077 3.8976C14.3077 3.76159 14.2537 3.63115 14.1575 3.53498C14.0613 3.43881 13.9309 3.38478 13.7949 3.38478ZM10.2051 3.38478H6.10256V2.87196C6.10256 2.73595 6.15659 2.60551 6.25277 2.50934C6.34894 2.41317 6.47938 2.35914 6.61539 2.35914H9.69231C9.82832 2.35914 9.95876 2.41317 10.0549 2.50934C10.1511 2.60551 10.2051 2.73595 10.2051 2.87196V3.38478Z" fill="#636D88"/></span>' +
    '</div>';


  // ─── Table Helpers ─────────────────────────────────────────

  function clearTable(selector) {
    var el = typeof selector === 'string'
      ? document.querySelector(selector)
      : (selector || document.querySelector('#inquiry-table-container'));
    if (el) el.innerHTML = '';
  }


  // ─── Expose on window ─────────────────────────────────────

  window.PtpmTable = {
    renderDynamicTable: renderDynamicTable,
    createPagination: createPagination,
    buildStatusBadge: buildStatusBadge,
    buildClientCell: buildClientCell,
    buildClientContactIcons: buildClientContactIcons,
    actionButtons: actionButtons,
    clearTable: clearTable,
    money: utils.money,
  };
})();
