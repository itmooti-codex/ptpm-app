// PTPM — Shared Utilities
// DOM helpers, formatters, date utils, normalizer, modals, file upload, loaders.
// Exposes window.PtpmUtils (also aliased as window.AppUtils).
(function () {
  'use strict';

  var config = window.AppConfig || {};

  // ── DOM Helpers ──────────────────────────────────────────────

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  // ── Number / Currency Formatters ────────────────────────────

  function formatCurrency(amount, currency, locale) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat(locale || 'en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
    }).format(amount);
  }

  function money(n) {
    if (n == null || Number.isNaN(Number(n))) return '-';
    return '$' + Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function toNum(str) {
    var n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.textContent = String(text);
    return d.innerHTML;
  }

  // ── Date Formatters ─────────────────────────────────────────

  function formatDate(ts, locale) {
    if (!ts) return 'N/A';
    try {
      var date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
      return date.toLocaleDateString(locale || 'en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return 'N/A';
    }
  }

  function formatUnixDate(unixTimestamp) {
    if (!unixTimestamp) return null;
    var date = new Date(unixTimestamp * 1000);
    var dd = String(date.getUTCDate()).padStart(2, '0');
    var mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    var yyyy = date.getUTCFullYear();
    var hh = String(date.getUTCHours()).padStart(2, '0');
    var min = String(date.getUTCMinutes()).padStart(2, '0');
    var ss = String(date.getUTCSeconds()).padStart(2, '0');
    return dd + '-' + mm + '-' + yyyy + ' ' + hh + ':' + min + ':' + ss;
  }

  function formatDisplayDate(input) {
    if (!input || typeof input !== 'string') return '';
    var parts = input.split('-');
    if (parts.length < 3) return '';
    var day = parts[0];
    var month = parts[1];
    var yearAndTime = parts[2];
    var year = yearAndTime.split(' ')[0];
    var monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    var monthName = monthNames[parseInt(month, 10) - 1] || '';
    return day + ' ' + monthName + ' ' + year;
  }

  function toEpoch(dateStr, endOfDay) {
    if (!dateStr) return null;
    var dayjs = window.dayjs;
    if (!dayjs) return null;
    var tz = config.TIMEZONE || 'Australia/Brisbane';
    var m = dayjs.tz ? dayjs.tz(dateStr, tz) : dayjs(dateStr);
    if (!m.isValid()) return null;
    var z = endOfDay ? m.endOf('day') : m.startOf('day');
    return z.unix();
  }

  // ── Data Normalizer ─────────────────────────────────────────

  function normalizeKeysArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (item) {
      var result = {};
      for (var key in item) {
        if (!item.hasOwnProperty(key)) continue;
        var normalizedKey = key
          .trim()
          .toLowerCase()
          .replace(/[\s]+/g, '_')
          .replace(/_+/g, '_');
        result[normalizedKey] = item[key];
      }
      return result;
    });
  }

  // ── Operation Loader (ref-counted) ──────────────────────────

  var operationLoaderEl = null;

  function initOperationLoader() {
    if (operationLoaderEl) return operationLoaderEl;
    operationLoaderEl = document.createElement('div');
    operationLoaderEl.id = 'ptpm-operation-loader';
    operationLoaderEl.className =
      'fixed inset-0 z-[9999] hidden flex items-center justify-center bg-black/40 backdrop-blur-sm';
    operationLoaderEl.innerHTML =
      '<div class="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-5 shadow-lg ring-1 ring-slate-200">' +
      '<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[' + (config.BRAND_COLOR || '#003882') + ']"></div>' +
      '<p class="text-sm font-semibold text-slate-800" data-loader-message>Working...</p>' +
      '</div>';
    document.body.appendChild(operationLoaderEl);
    return operationLoaderEl;
  }

  function showLoader(loaderElement, loaderMessageEl, counterRef, message) {
    if (!loaderElement || !counterRef) return;
    counterRef.count = (counterRef.count || 0) + 1;
    if (loaderMessageEl && message) loaderMessageEl.textContent = message;
    loaderElement.classList.remove('hidden');
  }

  function hideLoader(loaderElement, counterRef, force) {
    if (!loaderElement || !counterRef) return;
    if (force) {
      counterRef.count = 0;
    } else if (counterRef.count > 0) {
      counterRef.count -= 1;
    }
    if (counterRef.count <= 0) {
      loaderElement.classList.add('hidden');
      counterRef.count = 0;
    }
  }

  // ── Page Loader (simple) ────────────────────────────────────

  var pageLoaderEl = null;
  var pageLoaderMsgEl = null;

  function ensurePageLoader() {
    if (pageLoaderEl) return;
    pageLoaderEl = document.createElement('div');
    pageLoaderEl.id = 'page-loader-overlay';
    pageLoaderEl.style.cssText =
      'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(255,255,255,0.85);opacity:0;transition:opacity 0.2s;pointer-events:none;';
    pageLoaderEl.innerHTML =
      '<div style="text-align:center">' +
      '<div class="loading-spinner" style="width:32px;height:32px;margin:0 auto 12px"></div>' +
      '<p id="page-loader-msg" style="font-size:13px;color:#666"></p>' +
      '</div>';
    document.body.appendChild(pageLoaderEl);
    pageLoaderMsgEl = byId('page-loader-msg');
  }

  function showPageLoader(msg) {
    ensurePageLoader();
    if (msg && pageLoaderMsgEl) pageLoaderMsgEl.textContent = msg;
    pageLoaderEl.style.opacity = '1';
    pageLoaderEl.style.pointerEvents = 'auto';
  }

  function hidePageLoader() {
    if (!pageLoaderEl) return;
    pageLoaderEl.style.opacity = '0';
    pageLoaderEl.style.pointerEvents = 'none';
    if (pageLoaderMsgEl) pageLoaderMsgEl.textContent = '';
  }

  function withPageLoader(promise, msg) {
    showPageLoader(msg);
    return promise.finally(hidePageLoader);
  }

  // ── Toast Notifications ─────────────────────────────────────

  var toastContainer = null;
  var TOAST_STYLES = {
    success: { bg: '#f0fdf4', border: '#16a34a', color: '#15803d' },
    error: { bg: '#fef2f2', border: '#dc2626', color: '#b91c1c' },
    warning: { bg: '#fffbeb', border: '#d97706', color: '#92400e' },
    info: { bg: '#eff6ff', border: '#2563eb', color: '#1e40af' },
  };

  function showToast(message, type, duration) {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText =
        'position:fixed;top:16px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(toastContainer);
    }
    type = type || 'info';
    duration = duration || 4000;
    var s = TOAST_STYLES[type] || TOAST_STYLES.info;

    var toast = document.createElement('div');
    toast.style.cssText =
      'padding:12px 20px;border-radius:8px;font-size:14px;max-width:360px;' +
      'box-shadow:0 4px 12px rgba(0,0,0,0.1);opacity:0;transition:opacity 0.2s;' +
      'background:' + s.bg + ';border:1px solid ' + s.border + ';color:' + s.color + ';';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    requestAnimationFrame(function () { toast.style.opacity = '1'; });
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, duration);
  }

  // ── Status Modal ────────────────────────────────────────────

  function initCustomModal(opts) {
    var id = (opts && opts.id) || 'statusModal';
    var modal = byId(id);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = id;
      modal.className =
        'fixed inset-0 z-[9999] hidden items-center justify-center bg-black/40 transition-opacity duration-200';
      modal.innerHTML =
        '<div class="bg-white rounded-lg shadow-xl w-[350px] text-center p-6 flex flex-col items-center space-y-4 font-[\'Inter\']">' +
        '<div id="statusIcon" class="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl"></div>' +
        '<h3 id="statusTitle" class="text-lg font-semibold text-gray-800">Success</h3>' +
        '<p id="statusMessage" class="text-sm text-gray-600">Your action was successful.</p>' +
        '<button id="statusCloseBtn" class="!mt-3 !px-4 !py-2 !bg-[' + (config.BRAND_COLOR || '#003882') + '] !text-white !rounded">OK</button>' +
        '</div>';
      document.body.appendChild(modal);
    }

    var headerEl = modal.querySelector('#statusTitle');
    var bodyEl = modal.querySelector('#statusMessage');
    var iconEl = modal.querySelector('#statusIcon');
    var closeBtn = modal.querySelector('#statusCloseBtn');

    var hide = function () {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.style.overflow = '';
    };

    if (closeBtn && !closeBtn.dataset.boundClose) {
      closeBtn.dataset.boundClose = 'true';
      closeBtn.addEventListener('click', hide);
    }
    if (!modal.dataset.boundOverlay) {
      modal.dataset.boundOverlay = 'true';
      modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });
    }
    if (!modal.dataset.boundEscape) {
      modal.dataset.boundEscape = 'true';
      document.addEventListener('keydown', function (e) {
        if (!modal.classList.contains('hidden') && e.key === 'Escape') hide();
      });
    }

    return { modal: modal, headerEl: headerEl, bodyEl: bodyEl, iconEl: iconEl, hide: hide };
  }

  // ── Unsaved Changes Modal ───────────────────────────────────

  var unsavedModalCache = null;

  function showUnsavedChangesModal(opts) {
    if (!unsavedModalCache) {
      var modal = document.createElement('div');
      modal.id = 'ptpm-unsaved-modal';
      modal.className = 'fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40';
      modal.innerHTML =
        '<div class="bg-white rounded-lg inline-flex flex-col justify-start items-start overflow-hidden font-[\'Inter\']">' +
        '<div class="self-stretch px-6 py-4 border-b border-gray-300 inline-flex justify-end items-center gap-4">' +
        '<div class="flex-1 text-neutral-700 text-lg font-semibold leading-5">Unsaved Changes</div>' +
        '<button type="button" data-unsaved-close class="!bg-transparent !w-6 !h-6">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button></div>' +
        '<div class="self-stretch p-6"><div class="w-96 rounded">' +
        '<div class="text-neutral-700 text-base font-normal leading-5">You have unsaved changes. Do you want to discard them or save and exit?</div>' +
        '</div></div>' +
        '<div class="self-stretch px-6 py-4 bg-white border-t border-gray-300 inline-flex justify-end items-center gap-4">' +
        '<button type="button" data-unsaved-discard class="!bg-transparent !px-4 !py-3 !rounded !outline !outline-1 !outline-offset-[-1px] !outline-red-600">' +
        '<span class="text-red-600 text-sm font-medium">Discard Changes</span></button>' +
        '<button type="button" data-unsaved-save class="!px-4 !py-3 !bg-[' + (config.BRAND_COLOR || '#003882') + '] !rounded !outline !outline-1 !outline-offset-[-1px] !outline-white">' +
        '<span class="text-white text-sm font-medium">Save & Exit</span></button>' +
        '</div></div>';

      var closeBtn = modal.querySelector('[data-unsaved-close]');
      var discardBtn = modal.querySelector('[data-unsaved-discard]');
      var saveBtn = modal.querySelector('[data-unsaved-save]');

      var hide = function () {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
      };
      var show = function (o) {
        modal._onDiscard = (o && typeof o.onDiscard === 'function') ? o.onDiscard : null;
        modal._onSave = (o && typeof o.onSave === 'function') ? o.onSave : null;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
      };

      if (discardBtn) discardBtn.addEventListener('click', function () { hide(); if (modal._onDiscard) modal._onDiscard(); });
      if (saveBtn) saveBtn.addEventListener('click', function () { hide(); if (modal._onSave) modal._onSave(); });
      if (closeBtn) closeBtn.addEventListener('click', hide);
      modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) hide();
      });

      document.body.appendChild(modal);
      unsavedModalCache = { modal: modal, show: show, hide: hide };
    }
    unsavedModalCache.show(opts || {});
    return unsavedModalCache;
  }

  // ── Reset Confirm Modal ─────────────────────────────────────

  var resetModalCache = null;

  function showResetConfirmModal(opts) {
    if (!resetModalCache) {
      var modal = document.createElement('div');
      modal.id = 'ptpm-reset-modal';
      modal.className = 'fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40';
      modal.innerHTML =
        '<div class="bg-white rounded-lg inline-flex flex-col justify-start items-start overflow-hidden font-[\'Inter\']">' +
        '<div class="self-stretch px-6 py-4 border-b border-gray-300 inline-flex justify-end items-center gap-4">' +
        '<div class="flex-1 text-neutral-700 text-lg font-semibold leading-5">Reset Form</div>' +
        '<button type="button" data-reset-close class="!w-6 !h-6 !text-zinc-800">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button></div>' +
        '<div class="self-stretch p-6"><div class="w-96 rounded"><div class="text-neutral-700 text-base font-normal leading-5">This will clear all entered information. This action cannot be undone.</div></div></div>' +
        '<div class="self-stretch px-6 py-4 bg-white border-t border-gray-300 inline-flex justify-end items-center gap-4">' +
        '<button type="button" data-reset-cancel class="!rounded !text-slate-500 !text-sm !font-medium">Cancel</button>' +
        '<button type="button" data-reset-confirm class="!px-4 !py-3 !bg-red-600 !rounded !text-white !text-sm !font-semibold">Reset</button>' +
        '</div></div>';

      var closeBtn = modal.querySelector('[data-reset-close]');
      var cancelBtn = modal.querySelector('[data-reset-cancel]');
      var confirmBtn = modal.querySelector('[data-reset-confirm]');

      var hide = function () {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
      };
      var show = function (o) {
        modal._onConfirm = (o && typeof o.onConfirm === 'function') ? o.onConfirm : null;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
      };

      [closeBtn, cancelBtn].forEach(function (btn) { if (btn) btn.addEventListener('click', hide); });
      if (confirmBtn) confirmBtn.addEventListener('click', function () { hide(); if (modal._onConfirm) modal._onConfirm(); });
      modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) hide();
      });

      document.body.appendChild(modal);
      resetModalCache = { modal: modal, show: show, hide: hide };
    }
    resetModalCache.show(opts || {});
    return resetModalCache;
  }

  // ── Alert Modal ─────────────────────────────────────────────

  function showAlertModal(opts) {
    opts = opts || {};
    var title = opts.title || 'Notice';
    var message = opts.message || '';
    var buttonLabel = opts.buttonLabel || 'OK';

    var modal = byId('ptpm-alert-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ptpm-alert-modal';
      modal.className = 'fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40';
      modal.innerHTML =
        '<div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden font-[\'Inter\']">' +
        '<div class="flex items-start justify-between px-4 py-3 border-b border-slate-200">' +
        '<h3 class="text-lg font-semibold text-slate-900" data-alert-title>Notice</h3>' +
        '<button type="button" data-alert-close class="!bg-transparent !text-slate-500">' +
        '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button></div>' +
        '<div class="px-4 py-5 space-y-4 text-left">' +
        '<p class="text-sm text-slate-700" data-alert-message></p>' +
        '<div class="flex justify-end gap-3">' +
        '<button type="button" data-alert-confirm class="!px-4 !py-2 !rounded !bg-[' + (config.BRAND_COLOR || '#003882') + '] !text-white !text-sm !font-semibold">OK</button>' +
        '</div></div></div>';

      document.body.appendChild(modal);
      var close = function () {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
      };
      modal.querySelector('[data-alert-close]').addEventListener('click', close);
      modal.querySelector('[data-alert-confirm]').addEventListener('click', close);
      modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
      });
    }

    var titleEl = modal.querySelector('[data-alert-title]');
    var msgEl = modal.querySelector('[data-alert-message]');
    var confirmEl = modal.querySelector('[data-alert-confirm]');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (confirmEl) confirmEl.textContent = buttonLabel;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    return modal;
  }

  // ── File Preview Modal ──────────────────────────────────────

  var filePreviewCache = null;

  function ensureFilePreviewModal() {
    if (filePreviewCache) return filePreviewCache;
    var modal = document.createElement('div');
    modal.id = 'ptpm-file-preview-modal';
    modal.className = 'flex fixed inset-0 z-[9999] hidden items-center justify-center bg-black/50';
    modal.innerHTML =
      '<div class="bg-white rounded-lg shadow-lg max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden relative font-[\'Inter\']">' +
      '<button type="button" data-file-preview-close class="!absolute !top-3 !right-3 !text-slate-500 !bg-transparent">' +
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<div class="p-4 flex flex-col gap-4">' +
      '<div class="text-base font-semibold text-slate-800" data-file-preview-title>Preview</div>' +
      '<div class="flex-1 overflow-auto max-h-[70vh]">' +
      '<img data-file-preview-img class="max-h-[70vh] mx-auto object-contain hidden" alt="File preview" />' +
      '<iframe data-file-preview-frame class="w-full h-[70vh] hidden" frameborder="0"></iframe>' +
      '</div>' +
      '<div class="flex justify-end">' +
      '<button type="button" data-file-preview-close class="!px-4 !py-2 !rounded !border !border-slate-300 !text-slate-700">Close</button>' +
      '</div></div></div>';

    document.body.appendChild(modal);
    var hide = function () { modal.classList.add('hidden'); };
    modal.querySelectorAll('[data-file-preview-close]').forEach(function (btn) {
      btn.addEventListener('click', hide);
    });
    modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });

    var imgEl = modal.querySelector('[data-file-preview-img]');
    var frameEl = modal.querySelector('[data-file-preview-frame]');
    var titleEl = modal.querySelector('[data-file-preview-title]');

    var show = function (opts) {
      opts = opts || {};
      if (!opts.src) return;
      var isImage = (opts.type || '').indexOf('image/') === 0;
      if (titleEl) titleEl.textContent = opts.name || 'Preview';
      if (imgEl && frameEl) {
        if (isImage) {
          imgEl.src = opts.src;
          imgEl.classList.remove('hidden');
          frameEl.classList.add('hidden');
          frameEl.src = '';
        } else {
          frameEl.src = opts.src;
          frameEl.classList.remove('hidden');
          imgEl.classList.add('hidden');
          imgEl.src = '';
        }
      }
      modal.classList.remove('hidden');
    };

    filePreviewCache = { show: show, hide: hide, modal: modal };
    return filePreviewCache;
  }

  // ── File Upload (S3 Pre-signed URL) ─────────────────────────

  var uploadApiBase = (config.API_BASE || 'https://peterpm.vitalstats.app');

  function sanitizeFolderName(folderName) {
    if (!folderName || typeof folderName !== 'string') return '';
    return folderName.replace(/^[\\/]+|[\\/]+$/g, '');
  }

  function requestUploadDetails(file, folderName) {
    var safeFolder = sanitizeFolderName(folderName || '');
    var name = (safeFolder ? safeFolder + '/' : '') + ((file && file.name) || 'upload');
    var params = new URLSearchParams({
      type: (file && file.type) || 'application/octet-stream',
      name: name,
      generateName: '1',
    });
    return fetch(uploadApiBase + '/api/v1/rest/upload?' + params, {
      headers: { 'Api-Key': config.API_KEY || '' },
    })
      .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (r) {
        if (!r.res.ok || r.data.statusCode !== 200) throw new Error('Failed to obtain upload URL');
        return r.data.data;
      });
  }

  function uploadFileToS3(url, file) {
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': (file && file.type) || 'application/octet-stream' },
      body: file,
    }).then(function (res) {
      if (!res.ok) throw new Error('File upload failed');
    });
  }

  function uploadAndGetFileLink(file, folderName) {
    return requestUploadDetails(file, folderName || '').then(function (details) {
      return uploadFileToS3(details.uploadUrl, file).then(function () {
        return details.url;
      });
    });
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) { resolve(event.target.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function buildUploadCard(meta, handlers) {
    meta = meta || {};
    handlers = handlers || {};
    var name = meta.name || 'Upload';
    var type = meta.type || '';
    var url = meta.url || '';
    var isPdf = type.toLowerCase().indexOf('pdf') !== -1;
    var isImage = type.indexOf('image/') === 0;

    var icon = isImage && url
      ? '<img src="' + url + '" class="w-10 h-10 object-cover rounded-md" />'
      : '<div class="w-10 h-10 rounded-md bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-semibold">' +
        (isPdf ? 'PDF' : 'FILE') + '</div>';

    var card = document.createElement('div');
    card.className = 'bg-[#F5F6F8] p-3 rounded-lg';
    card.innerHTML =
      '<div class="flex flex-row justify-between items-center">' +
      '<div class="flex flex-row items-center gap-3">' + icon +
      '<p class="text-gray-800 text-sm break-all">' + escapeHtml(name) + '</p></div>' +
      '<div class="flex items-center gap-3">' +
      '<button type="button" data-upload-action="view" class="!text-sky-700" title="Preview">' +
      '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M18.2848 9.49731C18.2605 9.44245 17.6723 8.13758 16.3646 6.82994C14.6223 5.08758 12.4216 4.16675 9.99935 4.16675C7.57712 4.16675 5.37643 5.08758 3.63407 6.82994C2.32643 8.13758 1.73545 9.44453 1.71393 9.49731C1.68234 9.56836 1.66602 9.64525 1.66602 9.723C1.66602 9.80076 1.68234 9.87765 1.71393 9.9487C1.73823 10.0036 2.32643 11.3077 3.63407 12.6154C5.37643 14.357 7.57712 15.2779 9.99935 15.2779C12.4216 15.2779 14.6223 14.357 16.3646 12.6154C17.6723 11.3077 18.2605 10.0036 18.2848 9.9487C18.3164 9.87765 18.3327 9.80076 18.3327 9.723C18.3327 9.64525 18.3164 9.56836 18.2848 9.49731ZM9.99935 12.5001C9.44996 12.5001 8.9129 12.3372 8.4561 12.0319C7.99929 11.7267 7.64326 11.2929 7.43301 10.7853C7.22277 10.2777 7.16776 9.71923 7.27494 9.18039C7.38212 8.64155 7.64668 8.1466 8.03516 7.75812C8.42364 7.36964 8.91859 7.10508 9.45743 6.9979C9.99627 6.89072 10.5548 6.94573 11.0624 7.15597C11.5699 7.36622 12.0038 7.72225 12.309 8.17906C12.6142 8.63586 12.7771 9.17291 12.7771 9.72231C12.7771 10.459 12.4845 11.1656 11.9635 11.6865C11.4426 12.2074 10.7361 12.5001 9.99935 12.5001Z" fill="currentColor"></path></svg>' +
      '</button>' +
      '<button type="button" data-upload-action="delete" class="!text-rose-600" title="Delete">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.7949 3.38453H11.2308V2.87171C11.2308 2.46369 11.0687 2.07237 10.7802 1.78386C10.4916 1.49534 10.1003 1.33325 9.69231 1.33325H6.61539C6.20736 1.33325 5.81605 1.49534 5.52753 1.78386C5.23901 2.07237 5.07692 2.46369 5.07692 2.87171V3.38453H2.51282C2.37681 3.38453 2.24637 3.43856 2.1502 3.53474C2.05403 3.63091 2 3.76135 2 3.89735C2 4.03336 2.05403 4.1638 2.1502 4.25997C2.24637 4.35615 2.37681 4.41018 2.51282 4.41018H3.02564V13.6409C3.02564 13.913 3.1337 14.1738 3.32604 14.3662C3.51839 14.5585 3.77927 14.6666 4.05128 14.6666H12.2564C12.5284 14.6666 12.7893 14.5585 12.9816 14.3662C13.174 14.1738 13.2821 13.913 13.2821 13.6409V4.41018H13.7949C13.9309 4.41018 14.0613 4.35615 14.1575 4.25997C14.2537 4.1638 14.3077 4.03336 14.3077 3.89735C14.3077 3.76135 14.2537 3.63091 14.1575 3.53474C14.0613 3.43856 13.9309 3.38453 13.7949 3.38453Z" fill="currentColor"></path></svg>' +
      '</button></div></div>';

    var viewBtn = card.querySelector('[data-upload-action="view"]');
    if (viewBtn && handlers.onView) {
      viewBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); handlers.onView(); });
    }
    var deleteBtn = card.querySelector('[data-upload-action="delete"]');
    if (deleteBtn && handlers.onDelete) {
      deleteBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); handlers.onDelete(); });
    }
    return card;
  }

  // ── Form Utilities ──────────────────────────────────────────

  function resetFormFields(container) {
    container = container || document;
    var fields = container.querySelectorAll('input, select, textarea');
    fields.forEach(function (field) {
      var type = (field.getAttribute('type') || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        field.checked = false;
      } else if (field.tagName === 'SELECT') {
        field.selectedIndex = 0;
      } else {
        field.value = '';
      }
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // ── SDK Alert Creation ──────────────────────────────────────

  function createAlert(plugin, opts) {
    opts = opts || {};
    var alertObj = {
      title: opts.title || '',
      created_at: opts.createdAt || '',
      type: opts.type || '',
      quote_job_id: opts.quoteJobId || '',
      inquiry_id: opts.inquiryId || '',
      notified_contact_id: opts.notifiedContact || '',
      is_read: opts.isRead || false,
      origin_url: opts.originUrl || '',
    };
    var query = plugin.switchTo('PeterpmAnnouncement').mutation();
    query.createOne(alertObj);
    return query.execute(true).toPromise().then(function (result) {
      return result.resp;
    });
  }

  // ── Expose on window ───────────────────────────────────────

  window.PtpmUtils = {
    // DOM
    $: $,
    $$: $$,
    byId: byId,

    // Formatters
    formatCurrency: formatCurrency,
    money: money,
    formatDate: formatDate,
    formatUnixDate: formatUnixDate,
    formatDisplayDate: formatDisplayDate,
    toNum: toNum,
    clamp: clamp,
    escapeHtml: escapeHtml,
    toEpoch: toEpoch,

    // Data normalizer
    normalizeKeysArray: normalizeKeysArray,

    // Loaders
    initOperationLoader: initOperationLoader,
    showLoader: showLoader,
    hideLoader: hideLoader,
    showPageLoader: showPageLoader,
    hidePageLoader: hidePageLoader,
    withPageLoader: withPageLoader,

    // Toasts
    showToast: showToast,

    // Modals
    initCustomModal: initCustomModal,
    showUnsavedChangesModal: showUnsavedChangesModal,
    showResetConfirmModal: showResetConfirmModal,
    showAlertModal: showAlertModal,
    ensureFilePreviewModal: ensureFilePreviewModal,

    // File upload
    requestUploadDetails: requestUploadDetails,
    uploadFileToS3: uploadFileToS3,
    uploadAndGetFileLink: uploadAndGetFileLink,
    readFileAsBase64: readFileAsBase64,
    buildUploadCard: buildUploadCard,

    // Forms
    resetFormFields: resetFormFields,

    // SDK helpers
    createAlert: createAlert,
  };

  // Also expose as AppUtils for VibeCodeApps template compatibility
  window.AppUtils = window.PtpmUtils;
})();
