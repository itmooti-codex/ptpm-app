#!/usr/bin/env node
/**
 * Create and verify inquiry->job/property linkage via GraphQL.
 *
 * Usage:
 *   PTPM_API_KEY=... PTPM_JOB_ID=730 PTPM_CONTACT_ID=20 node scripts/verify-inquiry-linkage.mjs
 *
 * Optional:
 *   PTPM_API_BASE=https://peterpm.vitalstats.app
 *   PTPM_PROPERTY_ID=123
 *   PTPM_COMPANY_ID=456
 *   PTPM_DELETE_AFTER=true
 */

const apiKey = process.env.PTPM_API_KEY || "";
const base = (process.env.PTPM_API_BASE || "https://peterpm.vitalstats.app").replace(/\/+$/, "");
const endpoint = `${base}/api/v1/graphql`;
const jobId = Number(process.env.PTPM_JOB_ID || 0);
const contactId = Number(process.env.PTPM_CONTACT_ID || 0);
const propertyIdOverride = Number(process.env.PTPM_PROPERTY_ID || 0) || null;
const companyId = Number(process.env.PTPM_COMPANY_ID || 0) || null;
const deleteAfter = String(process.env.PTPM_DELETE_AFTER || "").toLowerCase() === "true";

async function gql(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Api-Key": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  if (json.errors && json.errors.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data || {};
}

function first(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

async function main() {
  if (!apiKey) throw new Error("Missing PTPM_API_KEY.");
  if (!jobId) throw new Error("Missing PTPM_JOB_ID.");
  if (!contactId) throw new Error("Missing PTPM_CONTACT_ID.");

  const jobData = await gql(
    `query calcJobs($id: PeterpmJobID!) {
      calcJobs(query: [{ where: { id: $id } }]) {
        id: field(arg: ["id"])
        property_id: field(arg: ["property_id"])
      }
    }`,
    { id: jobId }
  );
  const job = first(jobData.calcJobs);
  if (!job) throw new Error(`Job ${jobId} not found.`);

  const propertyId = propertyIdOverride || Number(job.property_id || 0);
  if (!propertyId) throw new Error(`No property_id found on job ${jobId}; set PTPM_PROPERTY_ID.`);

  const payload = {
    deal_name: `Linkage verification ${new Date().toISOString()}`,
    inquiry_source: "Web Form",
    inquiry_status: "New",
    primary_contact_id: contactId,
    inquiry_for_job_id: jobId,
    property_id: propertyId,
    how_can_we_help: "Automated linkage verification",
  };
  if (companyId) payload.company_id = companyId;

  const created = await gql(
    `mutation createDeal($payload: DealCreateInput = null) {
      createDeal(payload: $payload) {
        id
        inquiry_for_job_id
        property_id
        primary_contact_id
      }
    }`,
    { payload }
  );

  const createdDeal = created.createDeal;
  if (!createdDeal || !createdDeal.id) throw new Error("createDeal did not return an ID.");

  const verify = await gql(
    `query calcDeals($id: PeterpmDealID!) {
      calcDeals(query: [{ where: { id: $id } }]) {
        id: field(arg: ["id"])
        inquiry_for_job_id: field(arg: ["inquiry_for_job_id"])
        property_id: field(arg: ["property_id"])
        primary_contact_id: field(arg: ["primary_contact_id"])
      }
    }`,
    { id: Number(createdDeal.id) }
  );
  const deal = first(verify.calcDeals);
  if (!deal) throw new Error(`Unable to read created deal ${createdDeal.id}.`);

  const checks = {
    inquiry_for_job_id: Number(deal.inquiry_for_job_id) === jobId,
    property_id: Number(deal.property_id) === propertyId,
    primary_contact_id: Number(deal.primary_contact_id) === contactId,
  };

  if (deleteAfter) {
    await gql(
      `mutation deleteDeal($id: PeterpmDealID!) {
        deleteDeal(query: [{ where: { id: $id } }]) { id }
      }`,
      { id: Number(createdDeal.id) }
    );
  }

  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  console.log(JSON.stringify({ createdDealId: createdDeal.id, expected: { jobId, propertyId, contactId }, actual: deal, checks, deleteAfter }, null, 2));
  if (failed.length) throw new Error(`Linkage verification failed for: ${failed.join(", ")}`);
}

main().catch((err) => {
  console.error(`[verify-inquiry-linkage] ${err.message}`);
  process.exit(1);
});
