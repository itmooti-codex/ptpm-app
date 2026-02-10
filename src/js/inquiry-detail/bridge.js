// PTPM — Inquiry Detail Config Bridge
// Maps window.AppConfig values to the global variables expected by the
// Alpine.js inquiry detail components (alpine.js, functions.js, queries.js).
// This file MUST load AFTER config.js and BEFORE all other inquiry-detail scripts.
(function () {
  'use strict';
  var cfg = window.AppConfig || {};
  var slug = cfg.SLUG || 'peterpm';

  // GraphQL endpoints
  window.GRAPHQL_ENDPOINT = cfg.GRAPHQL_ENDPOINT || ('https://' + slug + '.vitalstats.app/api/v1/graphql');
  window.GRAPHQL_WS_ENDPOINT = cfg.GRAPHQL_WS_ENDPOINT || ('wss://' + slug + '.vitalstats.app/api/v1/graphql');
  window.GRAPHQL_API_KEY = cfg.API_KEY || '';
  window.UPLOAD_ENDPOINT = cfg.UPLOAD_ENDPOINT || ('https://' + slug + '.vitalstats.app/api/v1/rest/upload');

  // Page-context IDs (set by Ontraport merge fields in production)
  window.INQUIRY_RECORD_ID = cfg.INQUIRY_RECORD_ID || '';
  window.CONTACT_ID = cfg.CONTACT_ID || '';
  window.COMPANY_ID = cfg.COMPANY_ID || '';
  window.JOB_ID = cfg.JOB_ID || '';
  window.PROPERTY_ID = cfg.PROPERTY_ID || '';
  window.JOB_UNIQUE_ID = cfg.JOB_UNIQUE_ID || '';
  window.accountType = cfg.ACCOUNT_TYPE || '';
  window.SERVICE_PROVIDER_ID = cfg.SERVICE_PROVIDER_ID || '';
  window.loggedInUserID = cfg.LOGGED_IN_USER_ID || '';

  // UI constants
  window.DEFAULT_PROVIDER_PLACEHOLDER = 'Allocate To Service Provider';
  window.DEFAULT_RECIPIENT_PLACEHOLDER = 'Select recipients or type to search...';
})();
