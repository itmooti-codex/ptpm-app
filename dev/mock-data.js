// Mock Ontraport merge field values for local development.
// In production, these are set by Ontraport's server-side rendering
// before the page reaches the browser.

window.__ONTRAPORT_MOCK__ = true;

// Simulates [Visitor//Contact ID]
window.__MOCK_CONTACT_ID__ = '20';

// Simulates logged-in user ID
window.__MOCK_LOGGED_IN_USER_ID__ = '20';

// VitalSync API key — REQUIRED for Dashboard and any page that loads data.
// Set it here or in dev/mock-data.local.js (gitignored). Dev pages load mock-data.local.js after this file.
window.__MOCK_API_KEY__ = '';

// Service provider context (for SP portal pages)
window.__MOCK_SERVICE_PROVIDER_ID__ = '';
window.__MOCK_ACCOUNT_TYPE__ = '';

// Mock contacts for contact search when VitalSync is not connected or returns no data.
// Override in mock-data.local.js to add more.
window.__MOCK_CONTACTS__ = [
  { id: '1', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', sms_number: '0400000001', office_phone: '' },
  { id: '2', first_name: 'John', last_name: 'Jones', email: 'john.jones@example.com', sms_number: '', office_phone: '07 3123 4567' },
  { id: '3', first_name: 'Acme', last_name: 'Property', email: 'info@acmeproperty.com.au', sms_number: '', office_phone: '07 3234 5678' },
];
