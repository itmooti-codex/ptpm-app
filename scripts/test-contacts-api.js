#!/usr/bin/env node
/**
 * Test VitalSync Contacts API directly via GraphQL.
 * Run: node scripts/test-contacts-api.js
 * Requires .env with VITALSYNC_API_KEY=your-key
 */

const fs = require('fs');
const path = require('path');

// Load .env from project root
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(function (line) {
      const m = line.match(/^VITALSYNC_API_KEY=(.+)$/);
      if (m) {
        process.env.VITALSYNC_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
      }
    });
  } catch (e) {
    // .env optional if key passed via env
  }
}

loadEnv();

const API_KEY = process.env.VITALSYNC_API_KEY || '';
const SLUG = 'peterpm';
const URL = 'https://' + SLUG + '.vitalstats.app/api/v1/graphql';

// Same shape as sp/quotes.js and inquiry-detail — known to work in browser
const QUERY = `
  query calcContacts {
    calcContacts(limit: 50, offset: 0) {
      id: field(arg: ["id"])
      first_name: field(arg: ["first_name"])
      last_name: field(arg: ["last_name"])
      email: field(arg: ["email"])
      sms_number: field(arg: ["sms_number"])
      office_phone: field(arg: ["office_phone"])
    }
  }
`;

async function main() {
  if (!API_KEY) {
    console.error('Missing VITALSYNC_API_KEY. Set it in .env or run: VITALSYNC_API_KEY=your-key node scripts/test-contacts-api.js');
    process.exit(1);
  }

  console.log('POST', URL);
  console.log('Query: calcContacts(limit: 50)');
  console.log('');

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Api-Key': API_KEY,
    },
    body: JSON.stringify({ query: QUERY }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('Response not JSON:', text.slice(0, 500));
    process.exit(1);
  }

  if (!res.ok) {
    console.error('HTTP', res.status, res.statusText);
    console.error(data);
    process.exit(1);
  }

  if (data.errors && data.errors.length) {
    console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }

  const contacts = (data.data && data.data.calcContacts) || [];
  console.log('Success. Contacts count:', contacts.length);
  if (contacts.length > 0) {
    console.log('First contact keys:', Object.keys(contacts[0]));
    console.log('First contact sample:', JSON.stringify(contacts[0], null, 2));
  } else {
    console.log('(No contacts returned — list is empty)');
  }
  process.exit(0);
}

main().catch(function (err) {
  console.error('Request failed:', err.message);
  process.exit(1);
});
