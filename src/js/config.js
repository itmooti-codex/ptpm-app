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

  Object.freeze(config);
})();
