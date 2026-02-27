/**
 * Shared interaction helpers for detail/list pages.
 * Lightweight, framework-agnostic helpers to avoid duplicating
 * toast, panel-action, and empty-state patterns.
 */
(function (global) {
  'use strict';

  function dispatchPanelAction(event, handlerMap, fallback) {
    var target = event && event.target && event.target.closest
      ? event.target.closest('[data-panel-action]')
      : null;
    if (!target) return null;

    var action = target.getAttribute('data-panel-action');
    var handler = handlerMap && handlerMap[action];
    if (typeof handler === 'function') {
      handler(target, action, event);
    } else if (typeof fallback === 'function') {
      fallback(action, target, event);
    }
    return action;
  }

  function showVmToast(vm, message, durationMs) {
    if (!vm) return;
    if (vm.toastTimer) clearTimeout(vm.toastTimer);
    vm.toastMessage = message;
    vm.toastTimer = setTimeout(function () {
      vm.toastMessage = null;
    }, Number(durationMs || 3000));
  }

  function emptyState(message) {
    return '<div class="ptpm-empty-state">' + escapeHtml(message || 'No records found.') + '</div>';
  }

  function tableEmptyRow(colspan, message) {
    return '<tr><td colspan="' + Number(colspan || 1) + '" class="px-4 py-8 text-center text-slate-500">' +
      escapeHtml(message || 'No records found.') +
      '</td></tr>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  global.PtpmInteraction = {
    dispatchPanelAction: dispatchPanelAction,
    showVmToast: showVmToast,
    emptyState: emptyState,
    tableEmptyRow: tableEmptyRow,
  };
})(window);
