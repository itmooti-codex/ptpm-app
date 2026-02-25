#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const ROOT = path.resolve(__dirname, '..', '..');
const MAPPINGS_DIR = path.join(__dirname, 'mappings');
const REPORTS_DIR = path.join(__dirname, 'reports');
const STATE_FILE = path.join(__dirname, '.sync-state.json');
const DEAD_LETTER_DIR = path.join(__dirname, 'dead-letter');
const JOB_ID_MAP_FILE = path.join(__dirname, '.legacy-job-id-map.json');
const SERVICE_PROVIDER_ID_MAP_FILE = path.join(__dirname, '.legacy-service-provider-id-map.json');

function parseArgs(argv) {
  const args = {
    dryRun: true,
    write: false,
    entities: [],
    from: null,
    to: null,
    batchSize: Number(process.env.SYNC_BATCH_SIZE || 200),
    maxBatches: Number(process.env.SYNC_MAX_BATCHES || 1000),
    stateFile: STATE_FILE,
    mappingDir: MAPPINGS_DIR,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === '--dry-run') args.dryRun = true;
    if (token === '--write') {
      args.write = true;
      args.dryRun = false;
    }
    if (token === '--entities' && next) {
      args.entities = next.split(',').map((s) => s.trim()).filter(Boolean);
      i += 1;
    }
    if (token === '--from' && next) {
      args.from = next;
      i += 1;
    }
    if (token === '--to' && next) {
      args.to = next;
      i += 1;
    }
    if (token === '--batch-size' && next) {
      args.batchSize = Number(next);
      i += 1;
    }
    if (token === '--max-batches' && next) {
      args.maxBatches = Number(next);
      i += 1;
    }
    if (token === '--state-file' && next) {
      args.stateFile = next;
      i += 1;
    }
    if (token === '--mapping-dir' && next) {
      args.mappingDir = next;
      i += 1;
    }
  }
  return args;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function loadMappings(mappingDir) {
  const files = fs.readdirSync(mappingDir).filter((f) => f.endsWith('.json')).sort();
  return files.map((f) => {
    const p = path.join(mappingDir, f);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  });
}

function loadState(stateFile) {
  if (!fs.existsSync(stateFile)) return { entities: {} };
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    console.warn('[sync] Failed to parse state file, starting fresh:', err.message);
    return { entities: {} };
  }
}

function saveState(stateFile, state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

function loadJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`[sync] Failed to parse ${filePath}, using fallback:`, err.message);
    return fallback;
  }
}

function saveJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function sqlConfigFromEnv() {
  const cfg = {
    server: process.env.LEGACY_SQL_SERVER || '',
    database: process.env.LEGACY_SQL_DATABASE || '',
    user: process.env.LEGACY_SQL_USER || '',
    password: process.env.LEGACY_SQL_PASSWORD || '',
    options: {
      encrypt: String(process.env.LEGACY_SQL_ENCRYPT || 'false').toLowerCase() === 'true',
      trustServerCertificate: String(process.env.LEGACY_SQL_TRUST_CERT || 'true').toLowerCase() === 'true',
    },
    pool: {
      max: Number(process.env.LEGACY_SQL_POOL_MAX || 5),
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
  const missing = ['server', 'database', 'user', 'password'].filter((k) => !cfg[k]);
  if (missing.length) {
    throw new Error(`Missing SQL env vars: ${missing.join(', ')}`);
  }
  return cfg;
}

function graphqlConfigFromEnv() {
  return {
    endpoint: process.env.VITALSYNC_GRAPHQL_ENDPOINT || '',
    apiKey: process.env.VITALSYNC_API_KEY || '',
    maxRetries: Number(process.env.SYNC_GRAPHQL_MAX_RETRIES || 3),
  };
}

function getModelOps(model) {
  if (!model) return null;
  const calc = model.endsWith('y') ? `calc${model.slice(0, -1)}ies` : `calc${model}s`;
  return {
    calc,
    update: `update${model}`,
    idScalar: `Peterpm${model}ID`,
    updateInput: `${model}UpdateInput`,
  };
}

function gqlLiteral(value) {
  if (value == null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(String(value));
}

async function findExistingIdByLegacyKey(graphqlCfg, mapping, payload) {
  const legacyField = mapping.idempotency && mapping.idempotency.targetLegacyIdField;
  if (!legacyField) return null;
  const legacyValue = payload[legacyField];
  if (legacyValue == null || legacyValue === '') return null;
  const model = mapping.target && mapping.target.model;
  const ops = getModelOps(model);
  if (!ops) return null;

  const query = `query FindExisting {
  ${ops.calc}(query: [{ where: { ${legacyField}: ${gqlLiteral(legacyValue)} } }], limit: 1) {
    id: field(arg: ["id"])
  }
}`;

  const res = await fetch(graphqlCfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Api-Key': graphqlCfg.apiKey,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.errors && json.errors.length) return null;
  const rows = json.data && json.data[ops.calc];
  if (!Array.isArray(rows) || !rows.length) return null;
  const firstId = rows[0] && rows[0].id;
  const parsed = Number(firstId);
  return Number.isNaN(parsed) ? null : parsed;
}

function addAuditSample(bucket, rawValue, max = 8) {
  if (!bucket || rawValue == null) return;
  const value = String(rawValue);
  if (!value) return;
  if (!bucket.samples.includes(value) && bucket.samples.length < max) {
    bucket.samples.push(value);
  }
}

function normalizeAuSmsNumber(value) {
  if (value == null) return null;
  const cleaned = String(value).trim().replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  if (/^\+614\d{8}$/.test(cleaned)) return cleaned;
  if (/^04\d{8}$/.test(cleaned)) return `+61${cleaned.slice(1)}`;
  if (/^614\d{8}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

function normalizeCompanyAccountType(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const s = raw.toLowerCase();

  if (s.includes('body corp company')) return 'Body Corp Company';
  if (s.includes('body corp')) return 'Body Corp';
  if (s.includes('closed') && s.includes('real estate')) return 'Closed Real Estate';
  if (s.includes('real estate')) return 'Real Estate Agent';
  if (s.includes('school') || s.includes('childcare')) return 'School/Childcare';
  if (s.includes('wildlife')) return 'Wildlife Rescue';
  if (s.includes('tenant') && (s.includes('pay') || s.includes('enquiry'))) return 'Tenant to Pay';
  if (s.includes('business') || s.includes('gov')) return 'Business & Gov';
  return null;
}

function normalizeDealType(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const s = raw.toLowerCase();

  if (s.includes('follow')) return 'Service Request or Quote';
  if (s.includes('regular')) return 'General Inquiry';
  if (s.includes('scheduled')) return 'Appointment Scheduling or Rescheduling';
  return null;
}

function normalizeInquiryStatus(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s === 'current') return 'New Inquiry';
  if (s.includes('phone')) return 'Contact Client';
  return null;
}

function normalizeJobStatus(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n === 1) return 'Booked';
  if (n === 2) return 'Cancelled';
  if (n === 3) return 'In Progress';
  if (n === 4) return 'Quote';
  if (n === 5) return 'Waiting For Payment';
  return null;
}

function normalizeServiceProviderStatus(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n === 1) return 'Active';
  return null;
}

function transformValue(value, fieldRule, audit) {
  const transforms = fieldRule && fieldRule.transforms ? fieldRule.transforms : [];
  let v = value;
  transforms.forEach((t) => {
    if (t === 'trim' && typeof v === 'string') v = v.trim();
    if (t === 'emptyToNull' && (v === '' || v === undefined)) v = null;
    if (t === 'boolFromBit') v = v == null ? null : Boolean(v);
    if (t === 'number') v = v == null || v === '' ? null : Number(v);
    if (t === 'fractionToPercentInt') {
      if (v == null || v === '') {
        v = null;
      } else {
        const n = Number(v);
        v = Number.isNaN(n) ? null : Math.round(n * 100);
      }
    }
    if (t === 'auSmsNumber') {
      const normalized = normalizeAuSmsNumber(v);
      if (v != null && String(v).trim() && normalized == null) {
        audit.invalidSms.count += 1;
        addAuditSample(audit.invalidSms, v);
      }
      v = normalized;
    }
    if (t === 'dateToEpochSeconds') {
      if (v == null || v === '') {
        v = null;
      } else {
        const date = new Date(v);
        v = Number.isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000);
      }
    }
    if (t === 'normalizeCompanyAccountType') {
      const normalized = normalizeCompanyAccountType(v);
      if (v != null && String(v).trim() && normalized == null) {
        const key = fieldRule && fieldRule.to ? fieldRule.to : 'unknown_field';
        if (!audit.enumMismatches[key]) audit.enumMismatches[key] = { count: 0, samples: [] };
        audit.enumMismatches[key].count += 1;
        addAuditSample(audit.enumMismatches[key], v);
      }
      v = normalized;
    }
    if (t === 'normalizeDealType') {
      const normalized = normalizeDealType(v);
      if (v != null && String(v).trim() && normalized == null) {
        const key = fieldRule && fieldRule.to ? fieldRule.to : 'unknown_field';
        if (!audit.enumMismatches[key]) audit.enumMismatches[key] = { count: 0, samples: [] };
        audit.enumMismatches[key].count += 1;
        addAuditSample(audit.enumMismatches[key], v);
      }
      v = normalized;
    }
    if (t === 'normalizeInquiryStatus') {
      const normalized = normalizeInquiryStatus(v);
      if (v != null && String(v).trim() && normalized == null) {
        const key = fieldRule && fieldRule.to ? fieldRule.to : 'unknown_field';
        if (!audit.enumMismatches[key]) audit.enumMismatches[key] = { count: 0, samples: [] };
        audit.enumMismatches[key].count += 1;
        addAuditSample(audit.enumMismatches[key], v);
      }
      v = normalized;
    }
    if (t === 'normalizeJobStatus') {
      const normalized = normalizeJobStatus(v);
      if (v != null && String(v).trim() && normalized == null) {
        const key = fieldRule && fieldRule.to ? fieldRule.to : 'unknown_field';
        if (!audit.enumMismatches[key]) audit.enumMismatches[key] = { count: 0, samples: [] };
        audit.enumMismatches[key].count += 1;
        addAuditSample(audit.enumMismatches[key], v);
      }
      v = normalized;
    }
    if (t === 'normalizeServiceProviderStatus') {
      const normalized = normalizeServiceProviderStatus(v);
      if (v != null && String(v).trim() && normalized == null) {
        const key = fieldRule && fieldRule.to ? fieldRule.to : 'unknown_field';
        if (!audit.enumMismatches[key]) audit.enumMismatches[key] = { count: 0, samples: [] };
        audit.enumMismatches[key].count += 1;
        addAuditSample(audit.enumMismatches[key], v);
      }
      v = normalized;
    }
  });
  return v;
}

function buildPayload(row, mapping, audit, context) {
  const payload = Object.assign({}, mapping.constants || {});
  (mapping.fieldMap || []).forEach((m) => {
    const raw = row[m.from];
    payload[m.to] = transformValue(raw, m, audit);
    if (m.lookup === 'legacyJobIdToTargetJobId') {
      const legacyId = raw == null || raw === '' ? null : Number(raw);
      if (legacyId == null || Number.isNaN(legacyId)) {
        payload[m.to] = null;
      } else {
        const mapped = context.legacyJobIdMap[String(legacyId)];
        if (mapped == null) {
          payload[m.to] = null;
          if (!audit.unresolvedRelations[m.to]) audit.unresolvedRelations[m.to] = { count: 0, samples: [] };
          audit.unresolvedRelations[m.to].count += 1;
          addAuditSample(audit.unresolvedRelations[m.to], legacyId);
        } else {
          payload[m.to] = Number(mapped);
        }
      }
    }
    if (m.lookup === 'legacyServiceProviderIdToTargetServiceProviderId') {
      const legacyId = raw == null || raw === '' ? null : Number(raw);
      if (legacyId == null || Number.isNaN(legacyId)) {
        payload[m.to] = null;
      } else {
        const mapped = context.legacyServiceProviderIdMap[String(legacyId)];
        if (mapped == null) {
          payload[m.to] = null;
          if (!audit.unresolvedRelations[m.to]) audit.unresolvedRelations[m.to] = { count: 0, samples: [] };
          audit.unresolvedRelations[m.to].count += 1;
          addAuditSample(audit.unresolvedRelations[m.to], legacyId);
        } else {
          payload[m.to] = Number(mapped);
        }
      }
    }
  });
  if (mapping.idempotency && mapping.idempotency.targetLegacyIdField && mapping.idempotency.sourceIdField) {
    payload[mapping.idempotency.targetLegacyIdField] = row[mapping.idempotency.sourceIdField];
  }
  return payload;
}

function buildSourceQuery(mapping, args, entityState) {
  const source = mapping.source;
  const schema = source.schema || 'dbo';
  const table = source.table;
  const pk = source.pk;
  const watermark = source.watermark || { type: 'pk', column: pk };
  const selectList = (source.select || []).map((s) => `${s.expr} AS [${s.as}]`).join(',\n  ');
  const whereParts = [];
  const params = [];

  params.push({ name: 'batchSize', type: sql.Int, value: args.batchSize });

  const cursor = entityState || {};
  if (watermark.type === 'pk') {
    whereParts.push(`${pk} > @cursorPk`);
    params.push({ name: 'cursorPk', type: sql.BigInt, value: Number(cursor.lastPk || 0) });
  } else {
    const wmExpr = watermark.expression || watermark.column;
    whereParts.push(`${wmExpr} IS NOT NULL`);
    whereParts.push(`(${wmExpr} > @cursorWm OR (${wmExpr} = @cursorWm AND ${pk} > @cursorPk))`);
    params.push({ name: 'cursorWm', type: sql.DateTime2, value: cursor.lastWatermark ? new Date(cursor.lastWatermark) : new Date('1900-01-01T00:00:00Z') });
    params.push({ name: 'cursorPk', type: sql.BigInt, value: Number(cursor.lastPk || 0) });
    if (args.from) {
      whereParts.push(`${wmExpr} >= @fromDate`);
      params.push({ name: 'fromDate', type: sql.DateTime2, value: new Date(args.from) });
    }
    if (args.to) {
      whereParts.push(`${wmExpr} < @toDate`);
      params.push({ name: 'toDate', type: sql.DateTime2, value: new Date(args.to) });
    }
  }

  if (source.where) whereParts.push(`(${source.where})`);
  const whereClause = whereParts.length ? `WHERE ${whereParts.join('\n  AND ')}` : '';
  const wmOrder = watermark.type === 'pk' ? pk : (watermark.expression || watermark.column);
  const orderByClause = wmOrder === pk ? `${pk} ASC` : `${wmOrder} ASC, ${pk} ASC`;
  const query = `
SELECT TOP (@batchSize)
  ${selectList}
FROM ${schema}.${table}
${whereClause}
ORDER BY ${orderByClause};`;

  return { query, params, pk, watermark };
}

async function fetchBatch(pool, mapping, args, entityState) {
  const built = buildSourceQuery(mapping, args, entityState);
  const req = pool.request();
  built.params.forEach((p) => req.input(p.name, p.type, p.value));
  const result = await req.query(built.query);
  return { rows: result.recordset || [], meta: built };
}

async function graphqlUpsert(graphqlCfg, mapping, payload) {
  const g = mapping.target && mapping.target.graphql;
  if (!g || !g.mutation) throw new Error(`Missing target.graphql.mutation for entity ${mapping.entity}`);
  if (!graphqlCfg.endpoint || !graphqlCfg.apiKey) throw new Error('Missing GraphQL endpoint or API key');
  const inputVar = g.inputVariable || 'input';

  const model = mapping.target && mapping.target.model;
  const ops = getModelOps(model);
  const existingId = await findExistingIdByLegacyKey(graphqlCfg, mapping, payload);
  const useUpdate = existingId != null && ops;

  const mutation = useUpdate
    ? `mutation UpdateExisting($ID: ${ops.idScalar}, $payload: ${ops.updateInput}) { ${ops.update}(ID: $ID, payload: $payload) { id } }`
    : g.mutation;
  const variables = useUpdate
    ? { ID: existingId, payload }
    : { [inputVar]: payload };

  let attempt = 0;
  let lastErr = null;
  while (attempt < graphqlCfg.maxRetries) {
    attempt += 1;
    try {
      const res = await fetch(graphqlCfg.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Api-Key': graphqlCfg.apiKey,
        },
        body: JSON.stringify({
          query: mutation,
          variables,
        }),
      });
      if (!res.ok) {
        const bodyText = await res.text();
        throw new Error(`HTTP ${res.status}: ${bodyText}`);
      }
      const json = await res.json();
      if (json.errors && json.errors.length) throw new Error(json.errors.map((e) => e.message).join('; '));
      return { ok: true, response: json.data };
    } catch (err) {
      lastErr = err;
      const sleepMs = attempt * 250;
      await new Promise((r) => setTimeout(r, sleepMs));
    }
  }
  return { ok: false, error: lastErr ? lastErr.message : 'Unknown GraphQL upsert error' };
}

function writeDeadLetter(entity, row, payload, error) {
  ensureDir(DEAD_LETTER_DIR);
  const fp = path.join(DEAD_LETTER_DIR, `${entity}.jsonl`);
  const record = {
    ts: new Date().toISOString(),
    entity,
    error,
    row,
    payload,
  };
  fs.appendFileSync(fp, JSON.stringify(record) + '\n', 'utf8');
}

function initEntityReport(entity) {
  return {
    entity,
    extracted: 0,
    attemptedUpserts: 0,
    successfulUpserts: 0,
    failedUpserts: 0,
    batches: 0,
    firstCursor: null,
    lastCursor: null,
    invalidSms: { count: 0, samples: [] },
    enumMismatches: {},
    unresolvedRelations: {},
    activitiesCreated: 0,
    activitiesAlreadyLinked: 0,
    activitiesSkippedNoService: 0,
    activitiesSkippedMissingService: 0,
    activitiesFailed: 0,
  };
}

function getMutationReturnedId(responseData) {
  if (!responseData || typeof responseData !== 'object') return null;
  const first = Object.values(responseData)[0];
  if (!first || typeof first !== 'object') return null;
  const id = first.id;
  if (id == null || id === '') return null;
  const n = Number(id);
  return Number.isNaN(n) ? null : n;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function mapLegacyServiceName(animalValue, commentsValue) {
  const animal = normalizeText(animalValue);
  const comments = normalizeText(commentsValue);
  const hay = `${animal} ${comments}`;

  if (hay.includes('possum')) return 'Possum Removal & Proofing';
  if (hay.includes('rat') || hay.includes('mice') || hay.includes('mouse')) return 'Rodent Treatment (Roof/Ceiling)';
  if (
    hay.includes('pigeon') || hay.includes('bird') || hay.includes('myna') || hay.includes('swallow') || hay.includes('duck')
  ) return 'Bird Proofing & Pigeon Control';
  if (hay.includes('wasp') || hay.includes('bee')) return 'Wasp Removal';
  if (hay.includes('gutter clean') || hay.includes('gutter vacuum') || hay.includes('gutter vacc')) return 'Gutter Cleaning';
  if (hay.includes('ceiling vacuum')) return 'Ceiling Vacuum & Debris Removal';
  if (hay.includes('insulation')) return 'Insulation Installation';
  if (hay.includes('solar')) return 'Solar Panel Bird Proofing';
  if (hay.includes('turkey')) return 'Turkey Removal & Relocation';
  if (hay.includes('dead')) return 'Dead Animal Removal';
  return null;
}

function mapActivityStatus(jobStatus, hasScheduledDate) {
  const s = String(jobStatus || '').trim();
  if (s === 'Completed') return 'Completed';
  if (s === 'Cancelled') return 'Cancelled';
  if (s === 'Quote') return 'Quoted';
  if (s === 'Reschedule') return 'Reschedule';
  if (s === 'Scheduled') return 'Scheduled';
  if (s === 'Booked' || s === 'In Progress' || s === 'Waiting For Payment' || s === 'Call Back' || s === 'On Hold') {
    return hasScheduledDate ? 'Scheduled' : 'To Be Scheduled';
  }
  return hasScheduledDate ? 'Scheduled' : 'To Be Scheduled';
}

function isQuoteLikeStatus(jobStatus) {
  const s = String(jobStatus || '').trim();
  return s === 'Quote';
}

async function fetchServiceNameToIdMap(graphqlCfg) {
  const query = `query ListServices {
  calcServices(limit: 500) {
    id: field(arg: ["id"])
    service_name: field(arg: ["service_name"])
  }
}`;
  const res = await fetch(graphqlCfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Api-Key': graphqlCfg.apiKey,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return {};
  const json = await res.json();
  if (json.errors && json.errors.length) return {};
  const rows = (json.data && json.data.calcServices) || [];
  const map = {};
  rows.forEach((row) => {
    const name = normalizeText(row.service_name);
    const id = Number(row.id);
    if (name && !Number.isNaN(id)) map[name] = id;
  });
  return map;
}

async function ensureActivityForImportedJob(graphqlCfg, row, payload, targetJobId, context, report) {
  const serviceName = mapLegacyServiceName(row.jobs_animal, row.jobs_comments);
  if (!serviceName) {
    report.activitiesSkippedNoService += 1;
    return;
  }
  const serviceId = context.serviceNameToId[normalizeText(serviceName)];
  if (!serviceId) {
    report.activitiesSkippedMissingService += 1;
    return;
  }

  const marker = `Legacy Job ID: ${payload.legacy_sql_job_id}`;
  const existsQuery = `query ExistingActivity {
  calcActivities(query: [
    { where: { job_id: ${Number(targetJobId)} } }
    { andWhere: { note: ${gqlLiteral(marker)} } }
  ], limit: 1) {
    id: field(arg: ["id"])
  }
}`;
  const existsRes = await fetch(graphqlCfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Api-Key': graphqlCfg.apiKey,
    },
    body: JSON.stringify({ query: existsQuery }),
  });
  if (!existsRes.ok) {
    report.activitiesFailed += 1;
    return;
  }
  const existsJson = await existsRes.json();
  if ((existsJson.errors && existsJson.errors.length) || !existsJson.data) {
    report.activitiesFailed += 1;
    return;
  }
  const quoteLike = isQuoteLikeStatus(payload.job_status);
  const quotedPrice = payload.quote_total == null ? null : Number(payload.quote_total);
  const fallbackActivityPrice = payload.job_total == null ? quotedPrice : Number(payload.job_total);

  const activityPayload = {
    job_id: Number(targetJobId),
    service_id: Number(serviceId),
    quantity: 1,
    activity_price: fallbackActivityPrice,
    activity_status: mapActivityStatus(payload.job_status, payload.date_scheduled != null),
    activity_text: serviceName,
    note: marker,
    quoted_price: quotedPrice,
    include_in_quote: quoteLike,
    quote_accepted: false,
  };
  if (Array.isArray(existsJson.data.calcActivities) && existsJson.data.calcActivities.length > 0) {
    const existingId = Number(existsJson.data.calcActivities[0].id);
    const updateMutation = `mutation UpdateActivity($ID: PeterpmActivityID, $payload: ActivityUpdateInput) {
  updateActivity(ID: $ID, payload: $payload) { id }
}`;
    const updateRes = await fetch(graphqlCfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Api-Key': graphqlCfg.apiKey,
      },
      body: JSON.stringify({ query: updateMutation, variables: { ID: existingId, payload: activityPayload } }),
    });
    if (!updateRes.ok) {
      report.activitiesFailed += 1;
      return;
    }
    const updateJson = await updateRes.json();
    if (updateJson.errors && updateJson.errors.length) {
      report.activitiesFailed += 1;
      return;
    }
    report.activitiesAlreadyLinked += 1;
    return;
  }

  const createMutation = `mutation CreateActivity($payload: ActivityCreateInput) {
  createActivity(payload: $payload) { id }
}`;
  const createRes = await fetch(graphqlCfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Api-Key': graphqlCfg.apiKey,
    },
    body: JSON.stringify({ query: createMutation, variables: { payload: activityPayload } }),
  });
  if (!createRes.ok) {
    report.activitiesFailed += 1;
    return;
  }
  const createJson = await createRes.json();
  if (createJson.errors && createJson.errors.length) {
    report.activitiesFailed += 1;
    return;
  }
  report.activitiesCreated += 1;
}

async function runEntity(pool, graphqlCfg, mapping, args, state, context) {
  const report = initEntityReport(mapping.entity);
  const entityState = Object.assign({}, state.entities[mapping.entity] || {});

  for (let batchNum = 1; batchNum <= args.maxBatches; batchNum += 1) {
    const { rows, meta } = await fetchBatch(pool, mapping, args, entityState);
    if (!rows.length) break;

    report.batches += 1;
    report.extracted += rows.length;
    if (!report.firstCursor) {
      report.firstCursor = {
        pk: rows[0][meta.pk],
        watermark: meta.watermark.type === 'pk' ? null : rows[0].source_created_at || null,
      };
    }

    let batchFailures = 0;
    for (const row of rows) {
      const payload = buildPayload(row, mapping, report, context);
      if (!args.dryRun) {
        report.attemptedUpserts += 1;
        const result = await graphqlUpsert(graphqlCfg, mapping, payload);
        if (result.ok) {
          report.successfulUpserts += 1;
          const targetId = getMutationReturnedId(result.response);
          if (mapping.entity === 'jobs' && targetId != null) {
            await ensureActivityForImportedJob(graphqlCfg, row, payload, targetId, context, report);
          }
          if (mapping.entity === 'jobs' && mapping.idempotency && mapping.idempotency.sourceIdField) {
            const sourceId = row[mapping.idempotency.sourceIdField];
            if (sourceId != null && targetId != null) {
              context.legacyJobIdMap[String(Number(sourceId))] = Number(targetId);
            }
          }
          if (mapping.entity === 'serviceProviders' && mapping.idempotency && mapping.idempotency.sourceIdField) {
            const sourceId = row[mapping.idempotency.sourceIdField];
            const targetId = getMutationReturnedId(result.response);
            if (sourceId != null && targetId != null) {
              context.legacyServiceProviderIdMap[String(Number(sourceId))] = Number(targetId);
            }
          }
        } else {
          batchFailures += 1;
          report.failedUpserts += 1;
          writeDeadLetter(mapping.entity, row, payload, result.error);
        }
      }
    }

    const last = rows[rows.length - 1];
    report.lastCursor = {
      pk: last[meta.pk],
      watermark: meta.watermark.type === 'pk' ? null : (last.source_created_at || null),
    };

    // Advance cursor only when the full batch is successful (or dry-run).
    if (batchFailures === 0 || args.dryRun) {
      entityState.lastPk = Number(last[meta.pk]) || Number(entityState.lastPk || 0);
      if (meta.watermark.type !== 'pk') {
        entityState.lastWatermark = last.source_created_at
          ? new Date(last.source_created_at).toISOString()
          : entityState.lastWatermark || null;
      }
      state.entities[mapping.entity] = entityState;
      saveState(args.stateFile, state);
      if (!args.dryRun) {
        saveJsonFile(context.jobIdMapFile, context.legacyJobIdMap);
        saveJsonFile(context.serviceProviderIdMapFile, context.legacyServiceProviderIdMap);
      }
    } else {
      console.warn(`[sync:${mapping.entity}] Batch had ${batchFailures} failures; cursor not advanced.`);
      break;
    }
  }

  return report;
}

function writeReport(args, reports) {
  ensureDir(REPORTS_DIR);
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: args.dryRun ? 'dry-run' : 'write',
    entities: reports,
    totals: reports.reduce((acc, r) => {
      acc.extracted += r.extracted;
      acc.attemptedUpserts += r.attemptedUpserts;
      acc.successfulUpserts += r.successfulUpserts;
      acc.failedUpserts += r.failedUpserts;
      return acc;
    }, { extracted: 0, attemptedUpserts: 0, successfulUpserts: 0, failedUpserts: 0 }),
    window: {
      from: args.from || null,
      to: args.to || null,
    },
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fp = path.join(REPORTS_DIR, `sync-report-${stamp}.json`);
  fs.writeFileSync(fp, JSON.stringify(summary, null, 2), 'utf8');
  return fp;
}

async function main() {
  const args = parseArgs(process.argv);
  ensureDir(path.dirname(args.stateFile));
  ensureDir(args.mappingDir);

  const allMappings = loadMappings(args.mappingDir);
  const mappings = args.entities.length
    ? allMappings.filter((m) => args.entities.includes(m.entity))
    : allMappings;
  mappings.sort((a, b) => {
    const order = {
      serviceProviders: 1,
      jobs: 2,
      inquiries: 3,
    };
    const pa = order[a.entity] || 9;
    const pb = order[b.entity] || 9;
    return pa - pb;
  });

  if (!mappings.length) {
    throw new Error('No matching mappings found. Check --entities and scripts/sync/mappings/*.json');
  }

  const state = loadState(args.stateFile);
  const legacyJobIdMap = loadJsonFile(JOB_ID_MAP_FILE, {});
  const legacyServiceProviderIdMap = loadJsonFile(SERVICE_PROVIDER_ID_MAP_FILE, {});
  const sqlCfg = sqlConfigFromEnv();
  const graphqlCfg = graphqlConfigFromEnv();
  const serviceNameToId = await fetchServiceNameToIdMap(graphqlCfg);
  const context = {
    legacyJobIdMap,
    jobIdMapFile: JOB_ID_MAP_FILE,
    legacyServiceProviderIdMap,
    serviceProviderIdMapFile: SERVICE_PROVIDER_ID_MAP_FILE,
    serviceNameToId,
  };

  const pool = new sql.ConnectionPool(sqlCfg);
  await pool.connect();
  console.log(`[sync] Connected SQL ${sqlCfg.server}/${sqlCfg.database}`);
  console.log(`[sync] Mode: ${args.dryRun ? 'dry-run' : 'write'}`);
  if (args.from || args.to) console.log(`[sync] Window: ${args.from || '-inf'} -> ${args.to || '+inf'}`);

  const reports = [];
  for (const mapping of mappings) {
    console.log(`[sync:${mapping.entity}] Starting`);
    const report = await runEntity(pool, graphqlCfg, mapping, args, state, context);
    reports.push(report);
    console.log(`[sync:${mapping.entity}] Extracted=${report.extracted} Upserted=${report.successfulUpserts} Failed=${report.failedUpserts}`);
  }

  await pool.close();
  const reportPath = writeReport(args, reports);
  console.log(`[sync] Report written: ${reportPath}`);
}

main().catch((err) => {
  console.error('[sync] Fatal:', err.message);
  process.exit(1);
});
