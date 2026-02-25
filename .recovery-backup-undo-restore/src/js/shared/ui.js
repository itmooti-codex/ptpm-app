/**
 * Shared UI helpers for Inquiry & Job detail pages.
 * Returns HTML strings — used with Alpine x-html or innerHTML.
 *
 * @namespace PtpmUI
 */
(function () {
  'use strict';

  // ── Status → Tailwind class map ──────────────────────────────────────────
  var statusColors = {
    // Inquiry
    'New Inquiry': 'bg-blue-100 text-blue-800 border-blue-200',
    'Quote Created': 'bg-violet-100 text-violet-800 border-violet-200',
    'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Cancelled': 'bg-gray-100 text-gray-500 border-gray-200',
    'Expired': 'bg-orange-100 text-orange-700 border-orange-200',
    'Contact Client': 'bg-amber-100 text-amber-800 border-amber-200',
    'Site Visit Scheduled': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Site Visit to be Re-Scheduled': 'bg-amber-100 text-amber-700 border-amber-200',
    'Generate Quote': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Not Allocated': 'bg-red-100 text-red-700 border-red-200',
    // Quote
    'Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Sent': 'bg-blue-100 text-blue-800 border-blue-200',
    'Declined': 'bg-red-100 text-red-700 border-red-200',
    'New': 'bg-blue-100 text-blue-800 border-blue-200',
    'Requested': 'bg-amber-100 text-amber-800 border-amber-200',
    // Job
    'Booked': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'Scheduled': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'On Hold': 'bg-amber-100 text-amber-800 border-amber-200',
    'Quote': 'bg-violet-100 text-violet-800 border-violet-200',
    'Call Back': 'bg-orange-100 text-orange-700 border-orange-200',
    'Reschedule': 'bg-amber-100 text-amber-700 border-amber-200',
    'Waiting For Payment': 'bg-amber-100 text-amber-800 border-amber-200',
    // Payment
    'Paid': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Invoice Sent': 'bg-blue-100 text-blue-800 border-blue-200',
    'Invoice Required': 'bg-amber-100 text-amber-800 border-amber-200',
    'Overdue': 'bg-red-100 text-red-700 border-red-200',
    'Written Off': 'bg-gray-100 text-gray-500 border-gray-200',
    'Awaiting payment': 'bg-amber-100 text-amber-800 border-amber-200',
    'Awaiting Payment': 'bg-amber-100 text-amber-800 border-amber-200',
    'Create Invoice': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    // Activity
    'Quoted': 'bg-violet-100 text-violet-800 border-violet-200',
    'To Be Scheduled': 'bg-amber-100 text-amber-800 border-amber-200',
    // General
    'Active': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Opened': 'bg-blue-100 text-blue-800 border-blue-200',
    'Open': 'bg-blue-100 text-blue-800 border-blue-200',
    // Materials
    'Deduct': 'bg-red-50 text-red-700 border-red-200',
    'Reimburse': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    // Priority
    'High': 'bg-red-100 text-red-700 border-red-200',
    'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
    'Low': 'bg-gray-100 text-gray-600 border-gray-200',
    // Note types
    'Manual': 'bg-gray-100 text-gray-600 border-gray-200',
    'API': 'bg-indigo-50 text-indigo-600 border-indigo-200',
    'Incoming': 'bg-blue-50 text-blue-600 border-blue-200',
    'Outgoing': 'bg-cyan-50 text-cyan-600 border-cyan-200',
    // Service
    'Primary': 'bg-gray-900 text-white border-gray-900',
    'Add On': 'bg-gray-100 text-gray-700 border-gray-300',
    'Option': 'bg-gray-50 text-gray-500 border-gray-200',
    // Company
    'Body Corp': 'bg-purple-100 text-purple-700 border-purple-200',
    'Body Corp Company': 'bg-purple-50 text-purple-600 border-purple-200',
    // Roles
    'Admin': 'bg-blue-100 text-blue-700 border-blue-200',
    'SP': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  var DEFAULT_COLOR = 'bg-gray-100 text-gray-600 border-gray-200';

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Components ───────────────────────────────────────────────────────────

  /** Status badge */
  function badge(status) {
    if (!status) return '';
    var cls = statusColors[status] || DEFAULT_COLOR;
    return '<span class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ' + cls + '">' + esc(status) + '</span>';
  }

  /** Label + value field */
  function field(label, value, opts) {
    opts = opts || {};
    var mono = opts.mono ? ' font-mono text-xs' : '';
    var cls = opts.className || '';
    var val = value
      ? '<dd class="text-sm text-gray-900' + mono + ' break-words">' + esc(value) + '</dd>'
      : '<dd class="text-sm text-gray-300">&mdash;</dd>';
    return '<div class="min-w-0 ' + cls + '">' +
      '<dt class="text-xs text-gray-400 font-medium mb-0.5 truncate">' + esc(label) + '</dt>' +
      val + '</div>';
  }

  /** Tag pill */
  function tagPill(label) {
    return '<span class="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full border border-gray-200">' + esc(label) + '</span>';
  }

  /** Tag pills from comma-separated string or array */
  function tagPills(items) {
    if (!items) return '';
    var arr = Array.isArray(items) ? items : String(items).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return arr.map(tagPill).join(' ');
  }

  /** Warning banner */
  function popupWarning(message, source) {
    if (!message) return '';
    return '<div class="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">' +
      '<span class="text-amber-500 text-sm flex-shrink-0 mt-px">&#x26A0;</span>' +
      '<div><span class="font-bold">' + esc(source) + ':</span> <span class="font-medium leading-relaxed">' + esc(message) + '</span></div>' +
      '</div>';
  }

  /** Info banner (blue) */
  function infoBanner(html) {
    return '<div class="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">' +
      '<span class="text-blue-500 text-sm">&#x1F517;</span>' + html + '</div>';
  }

  /** Compliance alert (red) */
  function alertBanner(html) {
    return '<div class="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">' +
      '<span class="text-red-500 text-sm">&#x1F6A8;</span>' + html + '</div>';
  }

  /** Metric card (used in financial summary) */
  function metricCard(label, value, sub, extra) {
    var html = '<div class="bg-white rounded-lg border border-gray-200 p-3">' +
      '<p class="text-xs text-gray-400 font-medium">' + esc(label) + '</p>' +
      '<p class="text-lg font-bold text-gray-900 mt-0.5">' + esc(value) + '</p>' +
      '<p class="text-xs text-gray-500">' + esc(sub || '') + '</p>';
    if (extra) html += '<p class="text-xs text-gray-400 mt-0.5">' + esc(extra) + '</p>';
    html += '</div>';
    return html;
  }

  /** Contact avatar + info */
  function contactCard(name, initials, subtitle, contact, opts) {
    opts = opts || {};
    var bgClass = opts.bgClass || 'bg-gray-200';
    var textClass = opts.textClass || 'text-gray-500';
    var lines = '';
    if (contact.email) {
      lines += '<div class="flex items-center gap-2"><span class="text-gray-400 w-4">&#x2709;</span><a href="mailto:' + esc(contact.email) + '" class="text-blue-600 hover:underline truncate">' + esc(contact.email) + '</a></div>';
    }
    if (contact.sms_number || contact.phone) {
      lines += '<div class="flex items-center gap-2"><span class="text-gray-400 w-4">&#x1F4F1;</span><span class="text-gray-700">' + esc(contact.sms_number || contact.phone) + '</span></div>';
    }
    if (contact.office_phone) {
      lines += '<div class="flex items-center gap-2"><span class="text-gray-400 w-4">&#x1F4DE;</span><span class="text-gray-700">' + esc(contact.office_phone) + '</span></div>';
    }
    if (contact.address) {
      lines += '<div class="flex items-center gap-2"><span class="text-gray-400 w-4">&#x1F4CD;</span><span class="text-gray-700">' + esc(contact.address) + '</span></div>';
    }
    return '<div class="flex items-center gap-3 mb-3">' +
      '<div class="w-9 h-9 rounded-full ' + bgClass + ' flex items-center justify-center text-sm font-bold ' + textClass + '">' + esc(initials) + '</div>' +
      '<div><p class="text-sm font-semibold text-gray-900">' + esc(name) + '</p>' +
      (subtitle ? '<p class="text-xs text-gray-500">' + esc(subtitle) + '</p>' : '') +
      '</div></div>' +
      '<div class="space-y-1.5 text-xs">' + lines + '</div>';
  }

  /** Format currency — uses PtpmUtils.money if available */
  function money(n) {
    if (window.PtpmUtils && window.PtpmUtils.money) return window.PtpmUtils.money(n);
    if (n == null || isNaN(n)) return '$0.00';
    return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /** Format date for display */
  function fmtDate(v) {
    if (!v) return '';
    if (window.PtpmUtils && window.PtpmUtils.formatDate) return window.PtpmUtils.formatDate(v);
    return String(v);
  }

  /** Enum option lists */
  var ENUMS = {
    inquiry_status: ['New Inquiry', 'Not Allocated', 'Contact Client', 'Contact For Site Visit', 'Site Visit Scheduled', 'Site Visit to be Re-Scheduled', 'Generate Quote', 'Quote Created', 'Completed', 'Cancelled', 'Expired'],
    sales_stage: ['New Lead', 'Qualified Prospect', 'Consideration', 'Committed', 'Visit Scheduled', 'Closed - Won', 'Closed - Lost'],
    quote_status: ['New', 'Requested', 'Sent', 'Accepted', 'Declined', 'Expired', 'Cancelled'],
    job_status: ['Quote', 'Booked', 'Scheduled', 'In Progress', 'Completed', 'Call Back', 'Reschedule', 'On Hold', 'Cancelled', 'Waiting For Payment'],
    payment_status: ['Invoice Required', 'Invoice Sent', 'Paid', 'Overdue', 'Written Off', 'Cancelled'],
    priority: ['Low', 'Medium', 'High'],
    account_type_deal: ['Contact', 'Company'],
    xero_invoice_status: ['Create Invoice', 'Update Invoice', 'Awaiting payment', 'Paid', 'Failed'],
    xero_bill_status: ['Create Bill Line Item', 'Update Bill Line Item', 'Scheduled', 'Waiting Approval', 'Awaiting Payment', 'Paid', 'Cancelled'],
    activity_status: ['Quoted', 'Scheduled', 'To Be Scheduled', 'Completed', 'Reschedule', 'Cancelled'],
  };

  // ── Export ────────────────────────────────────────────────────────────────

  window.PtpmUI = {
    statusColors: statusColors,
    ENUMS: ENUMS,
    esc: esc,
    badge: badge,
    field: field,
    tagPill: tagPill,
    tagPills: tagPills,
    popupWarning: popupWarning,
    infoBanner: infoBanner,
    alertBanner: alertBanner,
    metricCard: metricCard,
    contactCard: contactCard,
    money: money,
    fmtDate: fmtDate,
  };
})();
