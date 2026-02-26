/**
 * PTPM Form Modal — Reusable form modal for panel CRUD actions.
 *
 * Usage:
 *   PtpmFormModal.open({ title, fields, values, submitLabel, dangerAction })
 *     .then(function (data) { ... })   // user submitted
 *     .catch(function () { ... });     // user cancelled
 *
 * Loaded after queries.js, before page controllers.
 */
(function () {
  'use strict';

  var Utils = window.PtpmUtils || window.AppUtils || {};
  var UI = window.PtpmUI || {};

  var modalEl = null;
  var _resolve = null;
  var _reject = null;
  var _fields = [];
  var _flatpickrInstances = [];
  var _fileValues = {};     // name → uploaded URL
  var _fileUploading = {};  // name → boolean

  // ── Form Definitions ──────────────────────────────────────────────────────

  var FORM_DEFS = {
    task: [
      { name: 'subject', label: 'Subject', type: 'text', required: true },
      { name: 'details', label: 'Details', type: 'textarea' },
      { name: 'date_due', label: 'Due Date', type: 'date' },
    ],
    taskComplete: [
      { name: 'outcome_id', label: 'Task Outcome', type: 'select', options: [] },
      { name: 'completion_notes', label: 'Completion Notes', type: 'textarea' },
    ],
    note: [
      { name: 'note', label: 'Note', type: 'textarea', required: true },
    ],
    activity: [
      { name: 'task', label: 'Task', type: 'select', required: true, options: ['Job 1', 'Job 2', 'Job 3', 'Job 4', 'Job 5'] },
      { name: 'activity_text', label: 'Description', type: 'textarea', required: true },
      { name: 'activity_price', label: 'Price', type: 'number', step: '0.01', min: '0' },
      { name: 'activity_status', label: 'Status', type: 'select', options: (UI.ENUMS || {}).activity_status || ['Quoted', 'Scheduled', 'To Be Scheduled', 'Completed', 'Reschedule', 'Cancelled'], default: 'Quoted' },
      { name: 'warranty', label: 'Warranty', type: 'text' },
      { name: 'is_optional', label: 'Optional item', type: 'checkbox' },
    ],
    'activity-edit': [
      { name: 'task', label: 'Task', type: 'select', required: true, options: ['Job 1', 'Job 2', 'Job 3', 'Job 4', 'Job 5'] },
      { name: 'activity_text', label: 'Description', type: 'textarea', required: true },
      { name: 'activity_price', label: 'Price', type: 'number', step: '0.01', min: '0' },
      { name: 'quoted_text', label: 'Quoted Description', type: 'textarea' },
      { name: 'quoted_price', label: 'Quoted Price', type: 'number', step: '0.01', min: '0' },
      { name: 'activity_status', label: 'Status', type: 'select', options: (UI.ENUMS || {}).activity_status || ['Quoted', 'Scheduled', 'To Be Scheduled', 'Completed', 'Reschedule', 'Cancelled'] },
      { name: 'warranty', label: 'Warranty', type: 'text' },
      { name: 'is_optional', label: 'Optional item', type: 'checkbox' },
    ],
    material: [
      { name: 'material_name', label: 'Material Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'total', label: 'Amount ($)', type: 'number', step: '0.01', min: '0' },
      { name: 'transaction_type', label: 'Type', type: 'select', required: true, options: ['Deduct', 'Reimburse'], default: 'Deduct' },
      { name: 'status', label: 'Status', type: 'select', options: ['New', 'Assigned to Job', 'In Progress', 'Pending Payment', 'Paid'], default: 'New' },
    ],
    upload: [
      { name: 'type', label: 'File Type', type: 'select', required: true, options: ['Photo', 'File', 'Form'], default: 'Photo' },
      { name: 'file', label: 'File', type: 'file', required: true },
      { name: 'customer_can_view', label: 'Client can view', type: 'checkbox' },
    ],
    appointment: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'start_time', label: 'Date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['New', 'Scheduled', 'To Be Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
    ],
    inquiryDetails: [
      { name: 'type', label: 'Type', type: 'select', options: (UI.ENUMS || {}).inquiry_type || [] },
      { name: 'inquiry_source', label: 'Source', type: 'select', options: (UI.ENUMS || {}).inquiry_source || [] },
      { name: 'how_did_you_hear', label: 'How Did You Hear', type: 'select', options: (UI.ENUMS || {}).how_did_you_hear || [] },
      { name: 'service_type', label: 'Service Type', type: 'select', options: (UI.ENUMS || {}).service_type_deal || [] },
      { name: 'account_type', label: 'Account Type', type: 'select', options: (UI.ENUMS || {}).account_type_deal || [] },
      { name: 'how_can_we_help', label: 'How Can We Help', type: 'textarea' },
      { name: 'renovations', label: 'Renovations', type: 'select', options: ['Yes', 'No'] },
      { name: 'resident_availability', label: 'Resident Availability', type: 'text' },
    ],
    inquiryAdminNotes: [
      { name: 'admin_notes', label: 'Admin Notes', type: 'textarea' },
    ],
    inquiryClientNotes: [
      { name: 'client_notes', label: 'Client Notes', type: 'textarea' },
    ],
    wildlife: [
      { name: 'possum_number', label: 'Possums', type: 'number', min: '0' },
      { name: 'possum_comment', label: 'Possum Notes', type: 'textarea' },
      { name: 'turkey_number', label: 'Turkeys', type: 'number', min: '0' },
      { name: 'turkey_comment', label: 'Turkey Notes', type: 'textarea' },
      { name: 'turkey_release_site', label: 'Release Site', type: 'select', options: (UI.ENUMS || {}).turkey_release_site || [] },
    ],
  };

  // ── Modal DOM ─────────────────────────────────────────────────────────────

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'ptpm-form-modal';
    modalEl.className = 'fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40';
    modalEl.innerHTML =
      '<div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden font-[\'Inter\']">' +
        '<div class="flex items-center justify-between px-5 py-3 border-b border-gray-200">' +
          '<h3 class="text-sm font-bold text-gray-900" data-fm-title></h3>' +
          '<button type="button" data-fm-close class="!bg-transparent !text-gray-400 hover:!text-gray-700">' +
            '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div data-fm-body class="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto thin-scrollbar"></div>' +
        '<div class="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">' +
          '<div data-fm-danger-slot></div>' +
          '<div class="flex gap-3 ml-auto">' +
            '<button type="button" data-fm-cancel class="ptpm-btn ptpm-btn-light-secondary ptpm-btn-sm">Cancel</button>' +
            '<button type="button" data-fm-submit class="ptpm-btn ptpm-btn-primary ptpm-btn-sm">Create</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modalEl);

    // Close handlers
    modalEl.querySelector('[data-fm-close]').addEventListener('click', cancel);
    modalEl.querySelector('[data-fm-cancel]').addEventListener('click', cancel);
    modalEl.querySelector('[data-fm-submit]').addEventListener('click', submit);
    modalEl.addEventListener('click', function (e) { if (e.target === modalEl) cancel(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && !modalEl.classList.contains('hidden')) cancel();
    });

    return modalEl;
  }

  // ── Field Rendering ───────────────────────────────────────────────────────

  var inputClass = 'w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  function renderField(field, value) {
    var id = 'fm-' + field.name;
    var req = field.required ? ' <span class="text-red-500">*</span>' : '';
    var html = '';

    switch (field.type) {
      case 'text':
        html = '<label class="block text-xs font-medium text-gray-700 mb-1" for="' + id + '">' + field.label + req + '</label>' +
          '<input type="text" id="' + id + '" data-fm-field="' + field.name + '" class="' + inputClass + '"' +
          (value != null ? ' value="' + UI.esc(String(value)) + '"' : '') +
          (field.placeholder ? ' placeholder="' + UI.esc(field.placeholder) + '"' : '') + '>';
        break;

      case 'textarea':
        html = '<label class="block text-xs font-medium text-gray-700 mb-1" for="' + id + '">' + field.label + req + '</label>' +
          '<textarea id="' + id + '" data-fm-field="' + field.name + '" rows="3" class="' + inputClass + ' resize-y"' +
          (field.placeholder ? ' placeholder="' + UI.esc(field.placeholder) + '"' : '') +
          '>' + (value != null ? UI.esc(String(value)) : '') + '</textarea>';
        break;

      case 'number':
        html = '<label class="block text-xs font-medium text-gray-700 mb-1" for="' + id + '">' + field.label + req + '</label>' +
          '<input type="number" id="' + id + '" data-fm-field="' + field.name + '" class="' + inputClass + '"' +
          (value != null ? ' value="' + value + '"' : '') +
          (field.step ? ' step="' + field.step + '"' : '') +
          (field.min != null ? ' min="' + field.min + '"' : '') +
          (field.max != null ? ' max="' + field.max + '"' : '') + '>';
        break;

      case 'date':
        html = '<label class="block text-xs font-medium text-gray-700 mb-1" for="' + id + '">' + field.label + req + '</label>' +
          '<input type="text" id="' + id + '" data-fm-field="' + field.name + '" data-fm-date="true" class="' + inputClass + '"' +
          (value != null ? ' value="' + UI.esc(String(value)) + '"' : '') +
          ' placeholder="Select date...">';
        break;

      case 'select': {
        var opts = field.options || [];
        var defaultVal = value != null ? String(value) : (field.default != null ? String(field.default) : '');
        html = '<label class="block text-xs font-medium text-gray-700 mb-1" for="' + id + '">' + field.label + req + '</label>' +
          '<select id="' + id + '" data-fm-field="' + field.name + '" class="' + inputClass + '">';
        if (!field.required) html += '<option value="">—</option>';
        for (var i = 0; i < opts.length; i++) {
          var opt = opts[i];
          var optVal = typeof opt === 'object' ? opt.value : opt;
          var optLabel = typeof opt === 'object' ? opt.label : opt;
          var selected = String(optVal) === defaultVal ? ' selected' : '';
          html += '<option value="' + UI.esc(String(optVal)) + '"' + selected + '>' + UI.esc(String(optLabel)) + '</option>';
        }
        html += '</select>';
        break;
      }

      case 'checkbox':
        html = '<label class="flex items-center gap-2 cursor-pointer select-none">' +
          '<input type="checkbox" id="' + id + '" data-fm-field="' + field.name + '" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"' +
          (value ? ' checked' : '') + '>' +
          '<span class="text-sm text-gray-700">' + field.label + '</span></label>';
        break;

      case 'file':
        html = '<label class="block text-xs font-medium text-gray-700 mb-1">' + field.label + req + '</label>' +
          '<div data-fm-file-zone="' + field.name + '" class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">' +
            '<input type="file" data-fm-field="' + field.name + '" class="hidden"' +
            (field.accept ? ' accept="' + field.accept + '"' : '') + '>' +
            '<div data-fm-file-label="' + field.name + '" class="text-sm text-gray-500">' +
              '<span class="text-lg block mb-1">&#x1F4CE;</span>' +
              'Click to select or drag & drop' +
            '</div>' +
            '<div data-fm-file-progress="' + field.name + '" class="hidden text-sm text-blue-600 font-medium">' +
              '<span class="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2 align-middle"></span>Uploading...' +
            '</div>' +
            '<div data-fm-file-done="' + field.name + '" class="hidden text-sm text-emerald-600 font-medium"></div>' +
          '</div>';
        break;

      default:
        html = '<p class="text-xs text-red-500">Unknown field type: ' + field.type + '</p>';
    }

    return '<div>' + html + '</div>';
  }

  // ── File Upload Handling ──────────────────────────────────────────────────

  function bindFileFields() {
    if (!modalEl) return;
    var zones = modalEl.querySelectorAll('[data-fm-file-zone]');
    for (var i = 0; i < zones.length; i++) {
      (function (zone) {
        var name = zone.getAttribute('data-fm-file-zone');
        var input = zone.querySelector('input[type="file"]');
        if (!input) return;

        // Click zone to trigger file input
        zone.addEventListener('click', function (e) {
          if (e.target === input) return;
          input.click();
        });

        // File selected
        input.addEventListener('change', function () {
          if (input.files && input.files.length) handleFileUpload(name, input.files[0]);
        });

        // Drag & drop
        zone.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          zone.classList.add('!border-blue-400', '!bg-blue-50/30');
        });
        zone.addEventListener('dragleave', function () {
          zone.classList.remove('!border-blue-400', '!bg-blue-50/30');
        });
        zone.addEventListener('drop', function (e) {
          e.preventDefault();
          zone.classList.remove('!border-blue-400', '!bg-blue-50/30');
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            handleFileUpload(name, e.dataTransfer.files[0]);
          }
        });
      })(zones[i]);
    }
  }

  function handleFileUpload(fieldName, file) {
    if (!file || !modalEl) return;
    var labelEl = modalEl.querySelector('[data-fm-file-label="' + fieldName + '"]');
    var progressEl = modalEl.querySelector('[data-fm-file-progress="' + fieldName + '"]');
    var doneEl = modalEl.querySelector('[data-fm-file-done="' + fieldName + '"]');

    // Show progress
    if (labelEl) labelEl.classList.add('hidden');
    if (doneEl) doneEl.classList.add('hidden');
    if (progressEl) progressEl.classList.remove('hidden');
    _fileUploading[fieldName] = true;

    var uploadFn = Utils.uploadAndGetFileLink || function () { return Promise.reject(new Error('Upload not available')); };

    uploadFn(file, 'uploads')
      .then(function (url) {
        _fileValues[fieldName] = url;
        _fileValues[fieldName + '_name'] = file.name || 'Upload';
        _fileUploading[fieldName] = false;
        if (progressEl) progressEl.classList.add('hidden');
        if (doneEl) {
          doneEl.textContent = '\u2713 ' + (file.name || 'File uploaded');
          doneEl.classList.remove('hidden');
        }
      })
      .catch(function (err) {
        console.error('File upload failed:', err);
        _fileUploading[fieldName] = false;
        _fileValues[fieldName] = null;
        if (progressEl) progressEl.classList.add('hidden');
        if (labelEl) labelEl.classList.remove('hidden');
        if (Utils.showToast) Utils.showToast('Upload failed: ' + (err.message || err), 'error');
      });
  }

  // ── Value Collection ──────────────────────────────────────────────────────

  function toEpochFallback(value) {
    if (value == null) return null;
    var raw = String(value).trim();
    if (!raw) return null;
    if (/^\d{10}$/.test(raw)) return Number(raw);
    if (/^\d{13}$/.test(raw)) return Math.floor(Number(raw) / 1000);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      var d1 = new Date(raw + 'T00:00:00');
      return isNaN(d1.getTime()) ? null : Math.floor(d1.getTime() / 1000);
    }
    var d2 = new Date(raw);
    return isNaN(d2.getTime()) ? null : Math.floor(d2.getTime() / 1000);
  }

  function toEpochSafe(value) {
    if (!value) return null;
    if (Utils && typeof Utils.toEpoch === 'function') {
      var ts = Utils.toEpoch(value);
      if (ts != null && ts !== '' && !isNaN(Number(ts))) return Number(ts);
    }
    return toEpochFallback(value);
  }

  function collectData() {
    var data = {};
    for (var i = 0; i < _fields.length; i++) {
      var f = _fields[i];
      if (f.type === 'file') {
        data[f.name] = _fileValues[f.name] || null;
        data[f.name + '_name'] = _fileValues[f.name + '_name'] || null;
        continue;
      }
      var el = modalEl.querySelector('[data-fm-field="' + f.name + '"]');
      if (!el) continue;

      switch (f.type) {
        case 'checkbox':
          data[f.name] = el.checked;
          break;
        case 'number':
          data[f.name] = el.value !== '' ? parseFloat(el.value) : null;
          break;
        case 'date':
          data[f.name] = el.value ? toEpochSafe(el.value) : null;
          break;
        default:
          data[f.name] = el.value.trim() || null;
      }
    }
    return data;
  }

  function validate() {
    for (var i = 0; i < _fields.length; i++) {
      var f = _fields[i];
      if (!f.required) continue;

      if (f.type === 'file') {
        if (_fileUploading[f.name]) {
          if (Utils.showToast) Utils.showToast('Please wait for file upload to complete', 'warning');
          return false;
        }
        if (!_fileValues[f.name]) {
          if (Utils.showToast) Utils.showToast(f.label + ' is required', 'warning');
          return false;
        }
        continue;
      }

      var el = modalEl.querySelector('[data-fm-field="' + f.name + '"]');
      if (!el) continue;
      var val = f.type === 'checkbox' ? el.checked : el.value.trim();
      if (!val) {
        el.focus();
        el.classList.add('!border-red-400');
        setTimeout(function () { el.classList.remove('!border-red-400'); }, 2000);
        if (Utils.showToast) Utils.showToast(f.label + ' is required', 'warning');
        return false;
      }
    }
    return true;
  }

  // ── Open / Close / Submit ─────────────────────────────────────────────────

  function open(config) {
    config = config || {};
    var modal = ensureModal();
    var title = config.title || 'Form';
    var fields = config.fields || [];
    var values = config.values || {};
    var submitLabel = config.submitLabel || 'Create';
    var dangerAction = config.dangerAction || null;

    // If fields is a string, look up in FORM_DEFS
    if (typeof fields === 'string') {
      fields = FORM_DEFS[fields] || [];
    }

    _fields = fields;
    _fileValues = {};
    _fileUploading = {};

    // Cleanup previous flatpickr instances
    for (var fp = 0; fp < _flatpickrInstances.length; fp++) {
      try { _flatpickrInstances[fp].destroy(); } catch (e) { /* ignore */ }
    }
    _flatpickrInstances = [];

    // Set title and button text
    modal.querySelector('[data-fm-title]').textContent = title;
    modal.querySelector('[data-fm-submit]').textContent = submitLabel;

    // Render fields
    var bodyEl = modal.querySelector('[data-fm-body]');
    var html = '';
    for (var i = 0; i < fields.length; i++) {
      var val = values[fields[i].name];
      if (val === undefined && fields[i].default !== undefined) val = fields[i].default;
      html += renderField(fields[i], val);
    }
    bodyEl.innerHTML = html;

    // Initialize flatpickr on date fields
    var dateInputs = bodyEl.querySelectorAll('[data-fm-date="true"]');
    for (var d = 0; d < dateInputs.length; d++) {
      if (window.flatpickr) {
        _flatpickrInstances.push(window.flatpickr(dateInputs[d], {
          dateFormat: 'Y-m-d',
          allowInput: true,
        }));
      }
    }

    // Bind file upload zones
    bindFileFields();

    // Danger action (e.g. Delete button)
    var dangerSlot = modal.querySelector('[data-fm-danger-slot]');
    if (dangerSlot) {
      if (dangerAction && dangerAction.label) {
        dangerSlot.innerHTML = '<button type="button" data-fm-danger class="ptpm-btn ptpm-btn-danger ptpm-btn-sm">' +
          UI.esc(dangerAction.label) + '</button>';
        dangerSlot.querySelector('[data-fm-danger]').addEventListener('click', function () {
          if (dangerAction.onConfirm) dangerAction.onConfirm();
        });
      } else {
        dangerSlot.innerHTML = '';
      }
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    // Focus first text input
    var firstInput = bodyEl.querySelector('input[type="text"], textarea, select');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 50);

    return new Promise(function (resolve, reject) {
      _resolve = resolve;
      _reject = reject;
    });
  }

  function submit() {
    if (!validate()) return;
    var data = collectData();
    close();
    if (_resolve) _resolve(data);
    _resolve = null;
    _reject = null;
  }

  function cancel() {
    close();
    if (_reject) _reject(new Error('cancelled'));
    _resolve = null;
    _reject = null;
  }

  function close() {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    modalEl.classList.remove('flex');
    document.body.style.overflow = '';
    // Cleanup flatpickr
    for (var i = 0; i < _flatpickrInstances.length; i++) {
      try { _flatpickrInstances[i].destroy(); } catch (e) { /* ignore */ }
    }
    _flatpickrInstances = [];
  }

  // ── Export ────────────────────────────────────────────────────────────────

  window.PtpmFormModal = {
    open: open,
    close: close,
    FORM_DEFS: FORM_DEFS,
  };
})();
