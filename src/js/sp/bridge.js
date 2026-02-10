// PTPM — Service Provider Portal Config Bridge
// Maps window.AppConfig values to the global variables expected by the
// SP portal Alpine.js components.
// This file MUST load AFTER config.js and BEFORE all other SP scripts.
(function () {
  'use strict';
  var cfg = window.AppConfig || {};

  // SDK config bridge (used by sdk.js)
  window.SDK_CONFIG = {
    slug: cfg.SLUG || 'peterpm',
    apiKey: cfg.API_KEY || '',
  };

  // SP-specific context IDs (set by Ontraport merge fields)
  window.loggedInUserIdOp = cfg.LOGGED_IN_USER_ID || cfg.SERVICE_PROVIDER_ID || '';
  window.SERVICE_PROVIDER_ID = cfg.SERVICE_PROVIDER_ID || '';
  window.accountType = cfg.ACCOUNT_TYPE || '';

  // Page-context IDs for detail pages
  window.jobId = cfg.JOB_ID || '';
  window.propertyID = cfg.PROPERTY_ID || '';
  window.INQUIRY_ID = cfg.INQUIRY_RECORD_ID || '';

  // GraphQL endpoints (used by inquiryDetails.js for direct fetch)
  window.GRAPHQL_ENDPOINT = cfg.GRAPHQL_ENDPOINT || ('https://' + (cfg.SLUG || 'peterpm') + '.vitalstats.app/api/v1/graphql');
  window.GRAPHQL_API_KEY = cfg.API_KEY || '';
  window.UPLOAD_ENDPOINT = cfg.UPLOAD_ENDPOINT || ('https://' + (cfg.SLUG || 'peterpm') + '.vitalstats.app/api/v1/rest/upload');
})();
