// Mock Ontraport merge field values for local development.
// In production, these are set by Ontraport's server-side rendering
// before the page reaches the browser.

window.__ONTRAPORT_MOCK__ = true;

// Simulates [Visitor//Contact ID]
window.__MOCK_CONTACT_ID__ = '20';

// Simulates logged-in user ID
window.__MOCK_LOGGED_IN_USER_ID__ = '20';

// Simulates a VitalSync API key (replace with a real dev key)
window.__MOCK_API_KEY__ = '';

// Service provider context (for SP portal pages)
window.__MOCK_SERVICE_PROVIDER_ID__ = '';
window.__MOCK_ACCOUNT_TYPE__ = '';
