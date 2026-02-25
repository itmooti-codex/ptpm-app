// PTPM — Configuration (AppConfig Bridge)
// In production (Ontraport), window.AppConfig is set by merge fields in header code.
// In development, values come from dev/mock-data.js.
(function () {
  'use strict';

  window.AppConfig = window.AppConfig || {};

  var config = window.AppConfig;

  // Core VitalSync settings
  config.SLUG = config.SLUG || 'peterpm';
  config.API_KEY = config.API_KEY || '';
  config.CONTACT_ID = config.CONTACT_ID || '';
  config.LOGGED_IN_USER_ID = config.LOGGED_IN_USER_ID || '';
  config.DEBUG = config.DEBUG || false;

  // Timezone (all date operations use this)
  config.TIMEZONE = config.TIMEZONE || 'Australia/Brisbane';

  // GitHub Pages CDN base URL
  config.CDN_BASE = config.CDN_BASE || 'https://itmooti-codex.github.io/ptpm-app';

  // VitalSync API base
  config.API_BASE = config.API_BASE || 'https://peterpm.vitalstats.app';

  // Ontraport object IDs (for SDK model references)
  config.INQUIRY_OBJECT_ID = config.INQUIRY_OBJECT_ID || '312';
  config.CONTACT_OBJECT_ID = config.CONTACT_OBJECT_ID || '168';
  config.PROPERTY_OBJECT_ID = config.PROPERTY_OBJECT_ID || '174';

  // Service provider context (set by Ontraport merge fields on SP pages)
  config.SERVICE_PROVIDER_ID = config.SERVICE_PROVIDER_ID || '';
  config.ACCOUNT_TYPE = config.ACCOUNT_TYPE || '';

  // Brand
  config.BRAND_COLOR = config.BRAND_COLOR || '#003882';

  // Detail page URLs (for dashboard row navigation). In production set via Ontraport merge fields.
  // Use {id} as placeholder for the record id (e.g. ./inquiry-detail.html?inquiry={id}).
  config.INQUIRY_DETAIL_URL_TEMPLATE = config.INQUIRY_DETAIL_URL_TEMPLATE || '';
  config.JOB_DETAIL_URL_TEMPLATE = config.JOB_DETAIL_URL_TEMPLATE || '';
  config.QUOTE_DETAIL_URL_TEMPLATE = config.QUOTE_DETAIL_URL_TEMPLATE || '';
  config.PAYMENT_DETAIL_URL_TEMPLATE = config.PAYMENT_DETAIL_URL_TEMPLATE || '';
  config.NEW_INQUIRY_URL = config.NEW_INQUIRY_URL || '';
  config.NEW_JOB_URL = config.NEW_JOB_URL || '';
  // Where to send user after new inquiry submit (e.g. dashboard). Empty = history.back().
  config.DASHBOARD_URL = config.DASHBOARD_URL || '';
  // Customers list page (linked from dashboard).
  config.CUSTOMERS_LIST_URL = config.CUSTOMERS_LIST_URL || '';
  // Customer detail page (e.g. ./customer-detail.html?contact={id}).
  config.CUSTOMER_DETAIL_URL_TEMPLATE = config.CUSTOMER_DETAIL_URL_TEMPLATE || '';
  // Company detail page (e.g. ./company-detail.html?company={id}).
  config.COMPANY_DETAIL_URL_TEMPLATE = config.COMPANY_DETAIL_URL_TEMPLATE || '';
  // Property detail page (e.g. ./property-detail.html?property={id}).
  config.PROPERTY_DETAIL_URL_TEMPLATE = config.PROPERTY_DETAIL_URL_TEMPLATE || '';
  // Add new customer page (e.g. ./new-customer.html).
  config.NEW_CUSTOMER_URL = config.NEW_CUSTOMER_URL || '';

  // Optional n8n webhook integration for aggregated batch actions
  // (e.g. "Email List to Serviceman"). Empty means not configured yet.
  config.N8N_BATCH_EMAIL_WEBHOOK_URL = config.N8N_BATCH_EMAIL_WEBHOOK_URL || '';
  config.N8N_BATCH_WEBHOOK_TIMEOUT_MS = config.N8N_BATCH_WEBHOOK_TIMEOUT_MS || 20000;
  config.N8N_ACTION_WEBHOOK_URL = config.N8N_ACTION_WEBHOOK_URL || '';
  config.N8N_ACTION_WEBHOOK_TIMEOUT_MS = config.N8N_ACTION_WEBHOOK_TIMEOUT_MS || 20000;
  // Optional auth header for n8n action webhook (recommended in production).
  config.N8N_ACTION_WEBHOOK_TOKEN = config.N8N_ACTION_WEBHOOK_TOKEN || '';
  // Version identifier for request/response contract sent to action webhook.
  config.N8N_ACTION_CONTRACT_VERSION = config.N8N_ACTION_CONTRACT_VERSION || 'ptpm.action.v1';

  Object.freeze(config);
})();
