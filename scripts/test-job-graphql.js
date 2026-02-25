#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function getApiKey() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const m = content.match(/^VITALSYNC_API_KEY=(.+)$/m);
    if (!m) return '';
    return m[1].trim().replace(/^["']|["']$/g, '');
  } catch (_) {
    return process.env.VITALSYNC_API_KEY || '';
  }
}

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Missing VITALSYNC_API_KEY');
    process.exit(1);
  }

  const url = 'https://peterpm.vitalstats.app/api/v1/graphql';
  const queries = {
    calcJobs: 'query { calcJobs(limit:1){ id: field(arg:["id"]) unique_id: field(arg:["unique_id"]) } }',
    getJobs: 'query { getJobs(limit:1){ id unique_id } }',
    calcPeterpmJobs: 'query { calcPeterpmJobs(limit:1){ id: field(arg:["id"]) unique_id: field(arg:["unique_id"]) } }',
    getPeterpmJobs: 'query { getPeterpmJobs(limit:1){ id unique_id } }',
    calcJobsFilter: 'query { calcJobs(query:[{ where:{ unique_id: "62I97PS", _OPERATOR_: eq } }], limit:1){ id: field(arg:["id"]) unique_id: field(arg:["unique_id"]) } }',
    getJobsFilter: 'query { getJobs(query:[{ where:{ unique_id: "62I97PS", _OPERATOR_: eq } }], limit:1){ id unique_id } }',
  };

  for (const [name, query] of Object.entries(queries)) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Api-Key': apiKey,
        },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      console.log('---', name);
      console.log('status:', res.status);
      console.log('data keys:', Object.keys(json.data || {}));
      if (json.errors && json.errors.length) console.log('error:', json.errors[0].message);
      else console.log('first row:', JSON.stringify(((Object.values(json.data || {})[0] || [])[0]) || null));
    } catch (err) {
      console.log('---', name);
      console.log('request error:', err.message);
    }
  }
}

main();
