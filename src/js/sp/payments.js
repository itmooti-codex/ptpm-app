const tabs = document.querySelectorAll(".tab");
const NULL_TEXT_RE = /^null$/i;
const ID_FIELD_RE = /^id$/i;
const STATUS_FIELD_RE = /^job_status/i;
const PAYMENT_STATUS_FIELD_RE = /^payment_status/i;
const PRIORITY_FIELD_RE = /^xero_bill_status/i;

const ACTIONS_FIELD = "__actions";
const LIST_CONFIG = {
  waitingapproval: waitingApprovalPayments,
  scheduled: scheduledPayments,
  awaitingpayment: awaitingPayments,
  paid: paidPayments,
  cancelled: cancelledPayments,
};
const TABLE_ATTRS = {
  entity: "peterpm",
  entityKey: "1rBR-jpR3yE3HE1VhFD0j",
  varServiceproviderid: SERVICE_PROVIDER_ID,
  table: "true",
  op: "subscribe",
  initCbName: "initInquiryTable",
};
const STATUS_STYLES = {
  Quote: "bg-[#e8d3ee] text-[#8e24aa]",
  "On Hold": "bg-[#ececec] text-[#9e9e9e]",
  Booked: "bg-[#d2e7fa] text-[#1e88e5]",
  Scheduled: "bg-[#cceef3] text-[#00acc1]",
  Reschedule: "bg-[#fce2cc] text-[#ef6c00]",
  "In Progress": "bg-[#cceef3] text-[#00acc1]",
  "Waiting For Payment": "bg-[#fee8cc] text-[#fb8c00]",
  Completed: "bg-[#d9ecda] text-[#43a047]",
  Cancelled: "bg-[#e3e3e3] text-[#757575]",
  Default: "bg-gray-200 text-gray-500",
};

const PAYMENT_STATUS_STYLES = {
  "Invoice Required": "bg-[#e8d3ee] text-[#8e24aa]",
  "Invoice Sent": "bg-[#d7dbee] text-[#3949ab]",
  Paid: "bg-[#d9ecda] text-[#43a047]",
  Overdue: "bg-[#fddcd2] text-[#f4511e]",
  "Written Off": "bg-[#fee8cc] text-[#fb8c00]",
  Cancelled: "bg-[#dfdfdf] text-[#616161]",
  Default: "bg-gray-200 text-gray-500",
};

const PRIORITY_STYLES = {
  "Create Bill Line Item'": "bg-[#e8d3ee] text-[#8e24aa]",
  "Update Bill Line Item": "bg-[#e8d3ee] text-[#8e24aa]",
  "Waiting Approval": "bg-[#cdebfa] text-[#039be5]",
  Scheduled: "bg-[#fee8cc] text-[#fb8c00]",
  "Awaiting Payment": "bg-[#fddcd2] text-[#f4511e]",
  Paid: "bg-[#d9ecda] text-[#43a047]",
  Cancelled: "bg-[#cccccc] text-[#000000]",
  Default: "bg-gray-200 text-gray-500",
};

const STATUS_FALLBACK = "bg-gray-200 text-gray-500";
const XERO_BILL_STATUS_STYLES = {
  "Create Bill Line Item": "bg-[#e8d3ee] text-[#8e24aa]",
  "Update Bill Line Item": "bg-[#e8d3ee] text-[#8e24aa]",
  "Waiting Approval": "bg-[#cdebfa] text-[#039be5]",
  Scheduled: "bg-[#fee8cc] text-[#fb8c00]",
  "Awaiting Payment": "bg-[#fddcd2] text-[#f4511e]",
  Paid: "bg-[#d9ecda] text-[#43a047]",
  Cancelled: "bg-[#cccccc] text-[#000000]",
};

const PAYMENT_BADGE_STYLES = {
  "Invoice Required": "bg-[#e8d3ee] text-[#8e24aa]",
  "Invoice Sent": "bg-[#d7dbee] text-[#3949ab]",
  Paid: "bg-[#d9ecda] text-[#43a047]",
  Overdue: "bg-[#fddcd2] text-[#f4511e]",
  "Written Off": "bg-[#fee8cc] text-[#fb8c00]",
  Cancelled: "bg-[#dfdfdf] text-[#616161]",
};

const PAYMENT_FIELD_EXTRAS = [
  {
    alias: "Primary_Service_Provider_Job_Rate_Percentage",
    arg: ["Primary_Service_Provider", "job_rate_percentage"],
  },
];

const PAYMENT_FIELDS = [
  "accepted_quote_activity_price",
  "account_type",
  "accounts_contact_id",
  "activities_on_job",
  "activities_to_complete",
  "admin_recommendation",
  "all_files_submitted",
  "all_forms_submitted",
  "all_photos_submitted",
  "bill_approval_time",
  "bill_approved_admin",
  "bill_approved_service_provider",
  "bill_batch_date",
  "bill_batch_id",
  "bill_batch_week",
  "bill_date",
  "bill_due_date",
  "bill_gst",
  "bill_time_paid",
  "bill_total",
  "bill_xero_id",
  "calculate_job_price",
  "calculate_quote_price",
  "client_entity_id",
  "client_individual_id",
  "create_a_callback",
  "created_at",
  "date_booked",
  "date_cancelled",
  "date_completed",
  "date_feedback_requested",
  "date_feedback_submitted",
  "date_quote_requested",
  "date_quote_sent",
  "date_quoted_accepted",
  "date_scheduled",
  "date_started",
  "deduct_total",
  "del_activities_to_complete",
  "due_date",
  "duplicate_job",
  "email_bc_quote_fu",
  "email_customer_job_email",
  "email_electronic_quote",
  "email_manual_quote",
  "email_o_quote_fu",
  "email_re_quote_fu",
  "email_tenant_job_email",
  "externalRawDataErrors",
  "externalRawDataStatus",
  "feedback_form_job_published",
  "feedback_form_job_unique_visits",
  "feedback_form_job_url",
  "feedback_form_job_visits",
  "feedback_number",
  "feedback_status",
  "feedback_text",
  "follow_up_comment",
  "follow_up_date",
  "form_pest_control_advice_published",
  "form_pest_control_advice_unique_visits",
  "form_pest_control_advice_url",
  "form_pest_control_advice_visits",
  "form_prestart_published",
  "form_prestart_unique_visits",
  "form_prestart_url",
  "form_prestart_visits",
  "id",
  "inquiry_record_id",
  "invoice_date",
  "invoice_id",
  "invoice_number",
  "invoice_total",
  "invoice_url_admin",
  "invoice_url_client",
  "ip_address",
  "job_activity_subtotal",
  "job_call_backs",
  "job_gst",
  "job_sheet_published",
  "job_sheet_unique_visits",
  "job_sheet_url",
  "job_sheet_visits",
  "job_status",
  "job_status_old",
  "job_total",
  "job_type",
  "job_variation_price",
  "job_variation_text",
  "job_variation_type",
  "last_activity",
  "last_call_logged",
  "last_email_received",
  "last_email_sent",
  "last_modified_at",
  "last_note",
  "last_sms_received",
  "last_sms_sent",
  "location_name",
  "mark_complete",
  "materials_total",
  "new_direct_job_published",
  "new_direct_job_unique_visits",
  "new_direct_job_url",
  "new_direct_job_visits",
  "noise_signs_options_as_text",
  "options_on_quote",
  "owner_id",
  "past_job_id",
  "payment_id",
  "payment_method",
  "payment_status",
  "pca_done",
  "possum_comment",
  "possum_number",
  "prestart_done",
  "prestart_form_submitted",
  "primary_service_provider_id",
  "priority",
  "profile_image",
  "property_id",
  "ptpm_edit_job_published",
  "ptpm_edit_job_unique_visits",
  "ptpm_edit_job_url",
  "ptpm_edit_job_visits",
  "ptpm_edit_quote_admin_published",
  "ptpm_edit_quote_admin_unique_visits",
  "ptpm_edit_quote_admin_url",
  "ptpm_edit_quote_admin_visits",
  "ptpm_edit_quote_published",
  "ptpm_edit_quote_unique_visits",
  "ptpm_edit_quote_url",
  "ptpm_edit_quote_visits",
  "ptpm_memos_published",
  "ptpm_memos_unique_visits",
  "ptpm_memos_url",
  "ptpm_memos_visits",
  "ptpm_view_quote_published",
  "ptpm_view_quote_unique_visits",
  "ptpm_view_quote_url",
  "ptpm_view_quote_visits",
  "quote_creator_published",
  "quote_creator_unique_visits",
  "quote_creator_url",
  "quote_creator_visits",
  "quote_date",
  "quote_gst",
  "quote_note",
  "quote_status",
  "quote_template_client_view_published",
  "quote_template_client_view_unique_visits",
  "quote_template_client_view_url",
  "quote_template_client_view_visits",
  "quote_total",
  "quote_valid_until",
  "quote_variation_price",
  "quote_variation_text",
  "quote_variation_type",
  "quoted_activities_subtotal",
  "rating",
  "referrer_id",
  "reimburse_total",
  "request_review",
  "reset_batch_id",
  "return_job_to_admin",
  "send_job_update_to_service_provider",
  "signature",
  "tasks_on_quote",
  "terms_and_conditions_accepted",
  "time_terms_and_conditions_agreed",
  "turkey_comment",
  "turkey_number",
  "turkey_release_site",
  "unique_id",
  "view_job_photos_published",
  "view_job_photos_unique_visits",
  "view_job_photos_url",
  "view_job_photos_visits",
  "xero_api_response",
  "xero_bill_status",
  "xero_invoice_pdf",
  "xero_invoice_status",
];


const isNullValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return NULL_TEXT_RE.test(value.trim());
  }
  return false;
};

const getVitalStatsPlugin = async () => {
  if (typeof window.getVitalStatsPlugin !== "function") {
    throw new Error("SDK not initialized. Ensure sdk.js is loaded first.");
  }
  return window.getVitalStatsPlugin();
};

const fetchDirectOnce = (query) => {
  if (!query || typeof query.fetchDirect !== "function") {
    return Promise.resolve(null);
  }
  const result = query.fetchDirect();
  if (!result) {
    return Promise.resolve(null);
  }
  if (typeof result.subscribe === "function") {
    return new Promise((resolve, reject) => {
      let lastValue = null;
      const shouldResolve = (value) => {
        if (!value) {
          return false;
        }
        if (extractFirstRecord(value)) {
          return true;
        }
        if (value?.resp || value?.data) {
          return true;
        }
        if (value?.payload?.resp || value?.payload?.data) {
          return true;
        }
        return false;
      };
      const sub = result.subscribe({
        next: (value) => {
          lastValue = value;
          if (!shouldResolve(value)) {
            return;
          }
          resolve(value);
          if (sub && typeof sub.unsubscribe === "function") {
            sub.unsubscribe();
          }
        },
        error: (error) => {
          reject(error);
          if (sub && typeof sub.unsubscribe === "function") {
            sub.unsubscribe();
          }
        },
      });
      setTimeout(() => {
        if (sub && typeof sub.unsubscribe === "function") {
          sub.unsubscribe();
        }
        resolve(lastValue);
      }, 12000);
    });
  }
  if (typeof result.toPromise === "function") {
    return result.toPromise();
  }
  if (typeof result.then === "function") {
    return result;
  }
  return Promise.resolve(result);
};

const getAlpineData = () => {
  const root = document.body;
  if (root && root.__x && root.__x.$data) {
    return root.__x.$data;
  }
  return null;
};

const setPaymentModalOpen = (isOpen) => {
  const modal = document.querySelector("[data-payment-modal]");
  if (!modal) {
    return;
  }
  const alpineData = getAlpineData();
  if (alpineData) {
    alpineData.modalIsOpen = isOpen;
    return;
  }
  if (isOpen) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  } else {
    modal.style.display = "none";
  }
};

const setPaymentLoading = (isLoading) => {
  const modal = document.querySelector("[data-payment-modal]");
  if (!modal) {
    return;
  }
  const loader = modal.querySelector("[data-payment-loading]");
  const content = modal.querySelector("[data-payment-content]");
  if (loader) {
    loader.classList.toggle("hidden", !isLoading);
  }
  if (content) {
    content.classList.toggle("hidden", isLoading);
  }
};

const looksLikeRecord = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return "id" in value || "unique_id" in value || "job_status" in value;
};

const extractFirstRecord = (payload) => {
  const getRecordFromCandidate = (candidate) => {
    if (!candidate) {
      return null;
    }
    if (Array.isArray(candidate)) {
      return candidate[0] || null;
    }
    if (looksLikeRecord(candidate)) {
      return candidate;
    }
    if (typeof candidate === "object") {
      for (const value of Object.values(candidate)) {
        if (Array.isArray(value)) {
          return value[0] || null;
        }
        if (looksLikeRecord(value)) {
          return value;
        }
      }
    }
    return null;
  };

  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const record = getRecordFromCandidate(item);
      if (record) {
        return record;
      }
    }
    return payload[0] || null;
  }

  const candidates = [
    payload?.resp,
    payload?.records,
    payload?.data,
    payload?.payload,
    payload?.payload?.data,
    payload?.payload?.records,
    payload?.resp?.data,
    payload?.resp?.records,
    payload?.data?.records,
  ];

  for (const candidate of candidates) {
    const record = getRecordFromCandidate(candidate);
    if (record) {
      return record;
    }
  }

  const directRecord = getRecordFromCandidate(payload?.record);
  if (directRecord) {
    return directRecord;
  }
  const respRecord = getRecordFromCandidate(payload?.resp);
  if (respRecord) {
    return respRecord;
  }

  const rootRecord = getRecordFromCandidate(payload);
  return rootRecord || null;
};

const TITLE_PART_OVERRIDES = {
  id: "ID",
  url: "URL",
  gst: "GST",
  sms: "SMS",
  ip: "IP",
  xero: "Xero",
  ptpm: "PTPM",
  ts: "ts",
};

const toAliasKey = (key) => {
  if (!key || typeof key !== "string") {
    return key;
  }
  if (!key.includes("_")) {
    return key;
  }
  return key
    .split("_")
    .map((part) => {
      if (!part) {
        return part;
      }
      const lower = part.toLowerCase();
      if (TITLE_PART_OVERRIDES[lower]) {
        return TITLE_PART_OVERRIDES[lower];
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("_");
};

const buildCalcJobsSelection = () => {
  const fieldSelections = PAYMENT_FIELDS.map(
    (field) => `${toAliasKey(field)}: field(arg: ["${field}"])`,
  );
  const extraSelections = PAYMENT_FIELD_EXTRAS.map((extra) => {
    const args = extra.arg.map((part) => `"${part}"`).join(", ");
    return `${extra.alias}: field(arg: [${args}])`;
  });
  return [...fieldSelections, ...extraSelections].join("\n");
};

const normalizePaymentData = (record) => {
  const data = {};
  if (!record || typeof record !== "object") {
    return data;
  }
  Object.entries(record).forEach(([key, value]) => {
    data[key] = value;
    const alias = toAliasKey(key);
    data[alias] = value;
  });
  if (typeof data.Bill_Approved_Service_Provider === "boolean") {
    data.Bill_Approved_Service_Provider = data.Bill_Approved_Service_Provider
      ? "true"
      : "false";
  }
  if (typeof data.Bill_Approved_Admin === "boolean") {
    data.Bill_Approved_Admin = data.Bill_Approved_Admin ? "true" : "false";
  }
  if (data.Unique_ID === undefined && data.unique_id === undefined && data.ID) {
    data.Unique_ID = data.ID;
    data.unique_id = data.ID;
  }
  return data;
};

const getGraphqlConfig = () => {
  const slug = window.SDK_CONFIG?.slug || TABLE_ATTRS.entity;
  const apiKey = window.SDK_CONFIG?.apiKey || TABLE_ATTRS.entityKey;
  if (!slug || !apiKey) {
    return null;
  }
  return {
    endpoint: `https://${slug}.vitalstats.app/api/v1/graphql`,
    apiKey,
  };
};

const graphqlRequest = async (query, variables = {}) => {
  const config = getGraphqlConfig();
  if (!config) {
    return null;
  }
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": config.apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.message ||
      payload?.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    throw new Error(payload.errors[0]?.message || "GraphQL error");
  }
  return payload?.data ?? null;
};

const fetchPaymentDetailsViaHttp = async (uniqueId) => {
  if (!uniqueId) {
    return null;
  }
  const selection = buildCalcJobsSelection();
  const query = `query calcJobs($uniqueId: StringScalar_0_8!) {
  calcJobs(query: [{ where: { unique_id: $uniqueId } }]) {
    ${selection}
  }
}`;
  const data = await graphqlRequest(query, { uniqueId });
  const records = data?.calcJobs;
  if (Array.isArray(records)) {
    return records[0] || null;
  }
  return records || null;
};

const fetchPaymentActivities = async (jobId) => {
  if (!jobId) {
    return [];
  }
  const query = `query calcActivities($jobId: PeterpmJobID!) {
  calcActivities(query: [{ where: { job_id: $jobId } }]) {
    Service_Service_Name: field(arg: ["Service", "service_name"])
    Activity_Price: field(arg: ["activity_price"])
  }
}`;
  const data = await graphqlRequest(query, { jobId });
  const records = data?.calcActivities;
  if (Array.isArray(records)) {
    return records;
  }
  return records ? [records] : [];
};

const fetchPaymentMaterials = async (jobId) => {
  if (!jobId) {
    return [];
  }
  const query = `query calcMaterials($jobId: PeterpmJobID!) {
  calcMaterials(query: [{ where: { job_id: $jobId } }]) {
    Material_Name: field(arg: ["material_name"])
    Transaction_Type: field(arg: ["transaction_type"])
    Total: field(arg: ["total"])
  }
}`;
  const data = await graphqlRequest(query, { jobId });
  const records = data?.calcMaterials;
  if (Array.isArray(records)) {
    return records;
  }
  return records ? [records] : [];
};

const parseDelimitedList = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeActivityRows = (rows) =>
  rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      return {
        name:
          row.Service_Service_Name ||
          row.service_service_name ||
          row.Service_Name ||
          row.service_name ||
          "",
        price:
          row.Activity_Price ||
          row.activity_price ||
          row.Price ||
          row.price ||
          "",
      };
    })
    .filter((row) => row && (row.name || row.price));

const normalizeMaterialRows = (rows) =>
  rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      return {
        name:
          row.Material_Name ||
          row.material_name ||
          row.Name ||
          row.name ||
          "",
        type:
          row.Transaction_Type ||
          row.transaction_type ||
          row.Type ||
          row.type ||
          "",
        total: row.Total || row.total || "",
      };
    })
    .filter((row) => row && (row.name || row.type || row.total));

const renderPaymentActivities = (root, data) => {
  const container = root.querySelector("[data-payment-activities]");
  if (!container) {
    return;
  }
  const raw =
    data.Activities_on_Job ||
    data.activities_on_job ||
    data.activityData ||
    data.activities ||
    data.Activity_Data;
  let activities = [];
  if (Array.isArray(raw)) {
    activities = normalizeActivityRows(raw);
  } else {
    activities = parseDelimitedList(raw)
      .map((item) => {
        const parts = String(item).split("#");
        if (!parts.length) {
          return null;
        }
        return {
          name: parts[0] || "",
          price: parts[1] || "",
          status: parts[2] || "",
        };
      })
      .filter((item) => item && item.status === "Completed");
  }
  container.innerHTML = "";
  activities.forEach((item) => {
    const row = document.createElement("div");
    row.className =
      "flex items-center justify-between border-b border-[#d3d7e2] py-4 pl-6 pr-3 w-full max-[1100px]:px-0";
    const name = document.createElement("div");
    name.className = "text-bodyText text-[#414042]";
    name.textContent = item?.name || "";
    const total = document.createElement("div");
    total.className = "text-bodyText text-[#414042]";
    total.textContent = item?.price || "";
    row.appendChild(name);
    row.appendChild(total);
    container.appendChild(row);
  });
};

const renderPaymentMaterials = (root, data) => {
  const container = root.querySelector("[data-payment-materials]");
  if (!container) {
    return;
  }
  const raw =
    data.Materials_on_Job ||
    data.materials_on_job ||
    data.Materials_Data ||
    data.materialData ||
    data.materials;
  let materials = [];
  if (Array.isArray(raw)) {
    materials = normalizeMaterialRows(raw);
  } else {
    materials = parseDelimitedList(raw)
      .map((item) => {
        const parts = String(item).split("#");
        if (!parts.length) {
          return null;
        }
        return {
          name: parts[0] || "",
          total: parts[1] || "",
          type: parts[2] || "",
          status: parts[3] || "",
        };
      })
      .filter((item) => {
        if (!item) {
          return false;
        }
        return (
          item.status === "Assigned to Job" ||
          item.status === "Pending Payment" ||
          item.status === "Paid"
        );
      });
  }
  container.innerHTML = "";
  materials.forEach((item) => {
    const row = document.createElement("div");
    row.className =
      "flex items-center justify-between border-b border-[#d3d7e2] py-4 pl-6 pr-3 w-full max-[1100px]:px-0";
    const name = document.createElement("div");
    name.className = "text-bodyText text-[#414042] flex-1";
    name.textContent = item?.name || "";
    const type = document.createElement("div");
    type.className = "text-bodyText text-[#414042] flex-1";
    type.textContent = item?.type || "";
    const total = document.createElement("div");
    total.className = "text-bodyText text-[#414042] flex-1 text-right";
    total.textContent = item?.total || "";
    row.appendChild(name);
    row.appendChild(type);
    row.appendChild(total);
    container.appendChild(row);
  });
};

const DATE_FIELD_KEYS = new Set([
  "Bill_Approval_Time",
  "Bill_Date",
  "Bill_Due_Date",
  "Bill_Time_Paid",
  "Date_Added",
  "Date_Booked",
  "Date_Cancelled",
  "Date_Completed",
  "Date_Feedback_Requested",
  "Date_Feedback_Submitted",
  "Date_Modified",
  "Date_Quote_Requested",
  "Date_Quote_Sent",
  "Date_Quoted_Accepted",
  "Date_Scheduled",
  "Date_Started",
  "Due_Date",
  "Invoice_Date",
  "Quote_Date",
  "Quote_Valid_Until",
]);

const formatUnixDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return value;
  }
  const numeric =
    typeof value === "number" ? value : Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) {
    return value;
  }
  const ms = numeric < 1e12 ? numeric * 1000 : numeric;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const applyPaymentText = (root, data) => {
  const targets = root.querySelectorAll("[data-payment-text]");
  targets.forEach((elem) => {
    const key = elem.dataset.paymentText || "";
    const defaultValue =
      elem.dataset.paymentDefault !== undefined
        ? elem.dataset.paymentDefault
        : "-";
    const prefix = elem.dataset.paymentPrefix || "";
    const suffix = elem.dataset.paymentSuffix || "";
    let rawValue = key ? data[key] : "";
    if (key && DATE_FIELD_KEYS.has(key) && !isNullValue(rawValue)) {
      rawValue = formatUnixDate(rawValue);
    }
    const displayValue = isNullValue(rawValue) ? defaultValue : rawValue;
    const text =
      displayValue === undefined || displayValue === null || displayValue === ""
        ? defaultValue
        : String(displayValue);
    elem.textContent = `${prefix}${text}${suffix}`;
  });
};

const applyPaymentLinks = (root, data) => {
  const links = root.querySelectorAll("[data-payment-href]");
  links.forEach((elem) => {
    const key = elem.dataset.paymentHref || "";
    const rawValue = key ? data[key] : "";
    if (isNullValue(rawValue)) {
      elem.removeAttribute("href");
      return;
    }
    const href = String(rawValue).trim();
    if (!href) {
      elem.removeAttribute("href");
      return;
    }
    elem.setAttribute("href", href);
  });
};

const applyPaymentStatusBadges = (root, data) => {
  const badges = root.querySelectorAll("[data-payment-status]");
  badges.forEach((elem) => {
    if (!elem.dataset.paymentBaseClass) {
      elem.dataset.paymentBaseClass = elem.className;
    }
    const key = elem.dataset.paymentStatus || "";
    const type = elem.dataset.paymentStatusType || "";
    const defaultValue =
      elem.dataset.paymentDefault !== undefined
        ? elem.dataset.paymentDefault
        : "N/A";
    const rawValue = key ? data[key] : "";
    const text = isNullValue(rawValue)
      ? defaultValue
      : String(rawValue).trim();
    const styleMap =
      type === "xero" ? XERO_BILL_STATUS_STYLES : PAYMENT_BADGE_STYLES;
    const badgeClass = styleMap[text] || STATUS_FALLBACK;
    elem.className = `${elem.dataset.paymentBaseClass} ${badgeClass}`.trim();
    elem.textContent = text;
  });
};

const isTruthyValue = (value) => {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
};

const updateApprovalButtonState = (checkbox, button) => {
  if (!button) {
    return;
  }
  const canApprove = button.dataset.canApprove === "true";
  const isChecked = checkbox ? checkbox.checked : false;
  const shouldEnable = Boolean(canApprove && isChecked);
  button.disabled = !shouldEnable;
  button.classList.toggle("cursor-not-allowed", !shouldEnable);
  button.classList.toggle("opacity-50", !shouldEnable);
};

const setupPaymentApprovalSection = (root, data) => {
  if (!root) {
    return;
  }
  const checkboxRow = root.querySelector("[data-payment-approval-checkbox]");
  const approvalTimeRow = root.querySelector("[data-payment-approval-time]");
  const checkbox =
    root.querySelector("[data-payment-approve-checkbox]") ||
    root.querySelector(".confirmCheckbox");
  const approveButton =
    root.querySelector("[data-payment-approve]") ||
    root.querySelector(".approveButton");

  const xeroStatusRaw = data.Xero_Bill_Status || data.xero_bill_status || "";
  const xeroStatus = String(xeroStatusRaw || "").trim();
  const isWaitingApproval = xeroStatus.toLowerCase() === "waiting approval";
  const spApproved = isTruthyValue(
    data.Bill_Approved_Service_Provider ?? data.bill_approved_service_provider,
  );
  const adminApproved = isTruthyValue(
    data.Bill_Approved_Admin ?? data.bill_approved_admin,
  );

  const canApprove = isWaitingApproval && !spApproved;
  const shouldShowApprovalTime =
    isWaitingApproval && spApproved && adminApproved;

  if (checkboxRow) {
    checkboxRow.classList.toggle("hidden", !isWaitingApproval);
  }
  if (approvalTimeRow) {
    approvalTimeRow.classList.toggle("hidden", !shouldShowApprovalTime);
  }
  if (approveButton) {
    approveButton.classList.toggle("hidden", !canApprove);
    approveButton.dataset.paymentUniqueId =
      data.Unique_ID || data.unique_id || data.ID || data.id || "";
    approveButton.dataset.canApprove = canApprove ? "true" : "false";
  }
  if (checkbox) {
    checkbox.checked = Boolean(spApproved);
    checkbox.disabled = Boolean(spApproved);
    const alpineData = getAlpineData();
    if (alpineData) {
      alpineData.isChecked = checkbox.checked;
    }
    updateApprovalButtonState(checkbox, approveButton);
    if (!checkbox.dataset.bound) {
      const onToggle = () => {
        const alpine = getAlpineData();
        if (alpine) {
          alpine.isChecked = checkbox.checked;
        }
        updateApprovalButtonState(checkbox, approveButton);
      };
      checkbox.addEventListener("change", onToggle);
      checkbox.addEventListener("input", onToggle);
      checkbox.dataset.bound = "true";
    }
  } else {
    updateApprovalButtonState(null, approveButton);
  }
};

const approveBillByUniqueId = async (uniqueId, triggerButton) => {
  if (!uniqueId) {
    return null;
  }
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "Approving...";
  }
  try {
    const mutation = `mutation updateJob($uniqueId: StringScalar_0_8!, $payload: JobUpdateInput = null) {
  updateJob(query: [{ where: { unique_id: $uniqueId } }], payload: $payload) {
    bill_approved_service_provider
  }
}`;
    await graphqlRequest(mutation, {
      uniqueId,
      payload: { bill_approved_service_provider: true },
    });
    return await fetchPaymentDetails(uniqueId);
  } catch (error) {
    console.error("Error approving bill:", error);
    return null;
  } finally {
    if (triggerButton) {
      triggerButton.textContent = "Approve Bill";
      triggerButton.disabled = false;
    }
  }
};

const bindPaymentApproval = (root) => {
  if (!root) {
    return;
  }
  const approveButton = root.querySelector("[data-payment-approve]");
  if (!approveButton || approveButton.dataset.bound) {
    return;
  }
  approveButton.addEventListener("click", async () => {
    const uniqueId = approveButton.dataset.paymentUniqueId;
    if (!uniqueId) {
      return;
    }
    const updated = await approveBillByUniqueId(uniqueId, approveButton);
    if (updated) {
      const normalized = normalizePaymentData(updated);
      populatePaymentModal(normalized);
      window.paymentsData = normalized;
      const alpineData = getAlpineData();
      if (alpineData) {
        alpineData.paymentsData = normalized;
      }
    }
  });
  approveButton.dataset.bound = "true";
};

const populatePaymentModal = (data) => {
  const root = document.querySelector("[data-payment-modal]");
  if (!root) {
    return;
  }
  const content = root.querySelector("[data-payment-id]");
  if (content) {
    const paymentId =
      data.ID || data.id || data.Unique_ID || data.unique_id || "";
    content.dataset.paymentId = paymentId;
  }
  applyPaymentText(root, data);
  applyPaymentLinks(root, data);
  applyPaymentStatusBadges(root, data);
  renderPaymentActivities(root, data);
  renderPaymentMaterials(root, data);
  setupPaymentApprovalSection(root, data);
  bindPaymentApproval(root);
};

const fetchPaymentDetails = async (uniqueId) => {
  if (!uniqueId) {
    return null;
  }
  const idValue = String(uniqueId).trim();
  try {
    return await fetchPaymentDetailsViaHttp(idValue);
  } catch (error) {
    console.error("Payment HTTP fetch failed:", error);
    return null;
  }
};

const openPaymentModal = async (row) => {
  const uniqueId =
    row?.Unique_ID ||
    row?.unique_id ||
    row?.ID ||
    row?.Id ||
    row?.id ||
    "";
  setPaymentModalOpen(true);
  setPaymentLoading(true);
  if (row) {
    populatePaymentModal(normalizePaymentData(row));
  }
  if (!uniqueId) {
    console.warn("Payment id missing.");
    setPaymentLoading(false);
    return;
  }
  try {
    const record = await fetchPaymentDetails(uniqueId);
    if (!record) {
      console.warn("Payment record not found for", uniqueId);
      setPaymentLoading(false);
      return;
    }
    const data = normalizePaymentData(record);
    const jobId = data.ID || data.id || data.Job_ID || data.job_id || null;
    const [activities, materials] = await Promise.all([
      fetchPaymentActivities(jobId),
      fetchPaymentMaterials(jobId),
    ]);
    data.activityData = activities;
    data.materialData = materials;
    populatePaymentModal(data);
    setPaymentLoading(false);
    window.paymentsData = data;
    const alpineData = getAlpineData();
    if (alpineData) {
      alpineData.paymentsData = data;
      alpineData.modalIsOpen = true;
    }
  } catch (error) {
    console.error("Failed to load payment details:", error);
    setPaymentLoading(false);
  }
};


const tableRoot = document.getElementById("inquiry-table-root");

const createDynamicListElement = (type) => {
  const listId = LIST_CONFIG[type];
  if (!listId) {
    return null;
  }
  const elem = document.createElement("div");
  elem.dataset.inquiryType = type;
  elem.dataset.dynamicList = listId;
  elem.dataset.entity = TABLE_ATTRS.entity;
  elem.dataset.entityKey = TABLE_ATTRS.entityKey;
  elem.dataset.varServiceproviderid = TABLE_ATTRS.varServiceproviderid;
  elem.dataset.table = TABLE_ATTRS.table;
  elem.dataset.op = TABLE_ATTRS.op;
  elem.dataset.initCbName = TABLE_ATTRS.initCbName;
  return elem;
};

const replaceDynamicList = (type) => {
  if (!tableRoot) {
    return;
  }
  const oldElem = tableRoot.querySelector("[data-dynamic-list]");
  const mgr = window.vitalStatsDynamicListsMgr;
  if (!mgr || typeof mgr.renderNew !== "function") {
    return;
  }
  if (oldElem) {
    const instance = mgr && mgr.get ? mgr.get(oldElem) : null;
    if (instance && typeof instance.destroy === "function") {
      instance.destroy();
    }
    oldElem.remove();
  }
  const nextElem = createDynamicListElement(type);
  if (!nextElem) {
    return;
  }
  tableRoot.appendChild(nextElem);
  mgr.renderNew().subscribe(() => {});
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const type = tab.dataset.status;

    // tab active state
    tabs.forEach((t) => t.classList.remove("activeTab"));
    tab.classList.add("activeTab");

    replaceDynamicList(type);
  });
});

const refreshCurrentList = () => {
  if (!tableRoot) {
    return;
  }
  const mgr = window.vitalStatsDynamicListsMgr;
  if (!mgr || typeof mgr.get !== "function") {
    return;
  }
  const elem = tableRoot.querySelector("[data-dynamic-list]");
  if (!elem) {
    return;
  }
  const instance = mgr.get(elem);
  if (!instance) {
    return;
  }
  if (typeof instance.render === "function") {
    instance.render();
    return;
  }
  if (typeof instance.refresh === "function") {
    instance.refresh();
  }
};

window.initInquiryTable = (dynamicList) => {
  const React = window.vitalStatsReact || window.React;
  if (!dynamicList || !dynamicList.tableCtx || !React) {
    return;
  }

  dynamicList.tableCtx.setFinalizeDataGridProps((props) => {
    const wrapStyles = {
      "& .MuiDataGrid-cell": {
        whiteSpace: "normal",
        lineHeight: "1.4",
        alignItems: "flex-start",
        paddingTop: 2,
        paddingBottom: 2,
      },
      "& .MuiDataGrid-columnHeaderTitle": {
        whiteSpace: "normal",
        lineHeight: "1.2",
      },
    };
    const sx = Array.isArray(props.sx)
      ? [...props.sx, wrapStyles]
      : props.sx
        ? [props.sx, wrapStyles]
        : wrapStyles;
    return {
      ...props,
      getRowHeight: () => "auto",
      sx,
    };
  });

  dynamicList.tableCtx.setFinalizeColumns((cols) => {
    const mapped = cols.map((col) => {
      const isId = ID_FIELD_RE.test(col.field || "");
      const isStatus = STATUS_FIELD_RE.test(col.field || "");
      if (col.field === ACTIONS_FIELD) {
        return col;
      }
      const baseRender = col.renderCell;
      return {
        ...col,
        minWidth: isId ? 100 : 160,
        width: isId ? 120 : col.width,
        flex: isId ? 0 : col.flex,
        renderCell: (params) => {
          const rawValue = params.value;
          if (isNullValue(rawValue)) {
            return "-";
          }
          const isPaymentStatus = PAYMENT_STATUS_FIELD_RE.test(col.field || "");
          const isPriority = PRIORITY_FIELD_RE.test(col.field || "");

          if (isStatus || isPaymentStatus || isPriority) {
            const text = String(rawValue || "");

            let style = isStatus
              ? STATUS_STYLES[text]
              : isPaymentStatus
                ? PAYMENT_STATUS_STYLES[text]
                : PRIORITY_STYLES[text];

            const finalClass = style || "bg-gray-200 text-gray-500";

            return React.createElement(
              "span",
              {
                className:
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                  finalClass,
              },
              text || "-",
            );
          }

          if (baseRender) {
            const rendered = baseRender(params);
            if (
              typeof rendered === "string" &&
              NULL_TEXT_RE.test(rendered.trim())
            ) {
              return "-";
            }
            return rendered;
          }
          return rawValue;
        },
      };
    });

    if (mapped.some((col) => col.field === ACTIONS_FIELD)) {
      return mapped;
    }

    return [
      ...mapped,
      {
        field: ACTIONS_FIELD,
        headerName: "Actions",
        sortable: false,
        filterable: false,
        flex: 0,
        width: 80,
        renderCell: (params) =>
          React.createElement(
            "button",
            {
              type: "button",
              onClick: (event) => {
                event.stopPropagation();
                openPaymentModal(params.row);
              },
              className: "text-[#0052CC] hover:text-[#003882]",
              "aria-label": "View payment",
              title: "View payment",
            },
            React.createElement("svg", {
              viewBox: "0 0 24 24",
              width: 18,
              height: 18,
              "aria-hidden": "true",
              fill: "currentColor",
              children: React.createElement("path", {
                d: "M12 5c-5 0-9 5-9 7s4 7 9 7 9-5 9-7-4-7-9-7zm0 12c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z",
              }),
            }),
          ),
      },
    ];
  });
};
