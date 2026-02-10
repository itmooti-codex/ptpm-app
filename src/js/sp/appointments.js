const tabs = document.querySelectorAll(".tab");
const tableRoot = document.getElementById("appointment-table-root");
const NULL_TEXT_RE = /^null$/i;
const ID_FIELD_RE = /(^id$|_id$)/i;
const STATUS_FIELD_RE = /^status$/i;
const ACTIONS_FIELD = "__actions";

const LIST_CONFIG = {
  all: allAppointments,
  new: newAppointments,
  scheduled: scheduledAppointments,
  completed: completedAppointments,
};

const TABLE_ATTRS = {
  entity: "peterpm",
  entityKey: "1rBR-jpR3yE3HE1VhFD0j",
  varServiceproviderid: loggedInUserIdOp,
  table: "true",
  op: "subscribe",
  initCbName: "initAppointmentTable",
};

const STATUS_STYLES = {
  New: "bg-[#E8D3EE] text-[#8E24AA]",
  "To Be Scheduled": "bg-[#FEE8CC] text-[#FB8C00]",
  Scheduled: "bg-[#CCE7F6] text-[#0288D1]",
  Completed: "bg-[#D9ECDA] text-[#43A047]",
  Cancelled: "bg-[#ECECEC] text-[#9E9E9E]",
};
const STATUS_FALLBACK = "bg-gray-200 text-gray-500";
const APPOINTMENT_MODAL_SELECTOR = "[data-appointment-detail-modal]";
const START_FIELD_RE = /^start(_time)?$/i;
const END_FIELD_RE = /^end(_time)?$/i;
const getVitalStatsPlugin = async () => {
  if (typeof window.getVitalStatsPlugin !== "function") {
    throw new Error("VitalStats SDK init function missing");
  }
  return window.getVitalStatsPlugin();
};
const toast = document.getElementById("toast");
let toastTimer = null;
let isQuoteCreating = false;
let isRescheduling = false;
let isReturningInquiry = false;

const showToast = (message, type = "info") => {
  if (!toast) {
    return;
  }
  const classes = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-gray-900 text-white",
  };
  toast.className = `pointer-events-none fixed right-4 top-4 z-50 max-w-xs rounded-md px-4 py-3 text-sm shadow-lg ${
    classes[type] || classes.info
  }`;
  toast.textContent = message;
  toast.classList.remove("hidden");
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
};

const setButtonLoading = (button, isLoading, label = "Creating...") => {
  if (!button) {
    return;
  }
  if (isLoading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent.trim();
    }
    button.disabled = true;
    button.classList.add("opacity-60", "cursor-not-allowed");
    button.setAttribute("aria-busy", "true");
    button.textContent = label;
    return;
  }
  button.disabled = false;
  button.classList.remove("opacity-60", "cursor-not-allowed");
  button.removeAttribute("aria-busy");
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
};

const getCellText = (value) => {
  if (isNullValue(value)) {
    return "-";
  }
  return String(value);
};

const returnInquiryFromModal = async (triggerButton) => {
  if (isReturningInquiry) {
    return;
  }
  isReturningInquiry = true;
  const activeButton =
    triggerButton ||
    document.querySelector('[data-appointment-action="return-inquiry"]');
  setButtonLoading(activeButton, true, "Returning...");
  try {
    const alpineData = getAlpineData();
    const appointmentData = buildAppointmentDisplayData(
      (alpineData && alpineData.appointmentData) || window.appointmentData || {},
    );
    if (!appointmentData || Object.keys(appointmentData).length === 0) {
      showToast("Appointment data is missing.", "error");
      return;
    }

    const inquiryId =
      appointmentData.Inquiry_ID ||
      appointmentData.inquiry_id ||
      appointmentData.Inquiry_Unique_ID ||
      "";
    if (!inquiryId) {
      showToast("Missing inquiry id.", "error");
      return;
    }

    const reasonInput = document.querySelector(".returnText");
    const reason = reasonInput ? reasonInput.value.trim() : "";

    const plugin = await getVitalStatsPlugin();
    const dealModel = plugin.switchTo("PeterpmDeal");
    const dealMutation = dealModel.mutation();
    const isNumericId =
      typeof inquiryId === "number" ||
      (typeof inquiryId === "string" && /^\d+$/.test(inquiryId.trim()));
    const idValue = isNumericId ? Number(inquiryId) : inquiryId;
    dealMutation.update((q) =>
      q.where(isNumericId ? "id" : "unique_id", idValue).set({
        inquiry_return_reason: reason,
        inquiry_status: "Cancelled",
      }),
    );
    await dealMutation.execute(true).toPromise();

    showToast("Inquiry returned successfully.", "success");
  } catch (error) {
    console.error("Return inquiry failed:", error);
    showToast("Failed to return inquiry.", "error");
  } finally {
    isReturningInquiry = false;
    setButtonLoading(activeButton, false);
  }
};

let currentTab = "all";
let currentRange = "all";
let currentRangeVars = null;

const isNullValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return NULL_TEXT_RE.test(value.trim());
  }
  return false;
};

const toUnixSeconds = (date) => Math.floor(date.getTime() / 1000);

const getRangeVars = (rangeType) => {
  const now = new Date();
  let start;
  let end;

  if (rangeType === "all") {
    return {
      startTime: 0,
      endTime: 4102444800,
    };
  }
  if (rangeType === "week") {
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay(),
    );
    start = startOfWeek;
    end = new Date(
      startOfWeek.getFullYear(),
      startOfWeek.getMonth(),
      startOfWeek.getDate() + 6,
      23,
      59,
      59,
    );
  } else if (rangeType === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );
  }

  return {
    startTime: toUnixSeconds(start),
    endTime: toUnixSeconds(end),
  };
};

const applyRangeToElement = (elem) => {
  if (!elem) {
    return;
  }
  if (!currentRangeVars) {
    return;
  }
  elem.dataset.varSttime = String(currentRangeVars.startTime);
  elem.dataset.varEndtime = String(currentRangeVars.endTime);
};

const refreshDynamicList = () => {
  if (!tableRoot) {
    return;
  }
  const elem = tableRoot.querySelector("[data-dynamic-list]");
  const mgr = window.vitalStatsDynamicListsMgr;
  if (!elem || !mgr || typeof mgr.get !== "function") {
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

const setRange = (rangeType, { refresh } = {}) => {
  currentRange = rangeType;
  currentRangeVars = getRangeVars(rangeType);
  const elem = tableRoot
    ? tableRoot.querySelector("[data-dynamic-list]")
    : null;
  if (elem) {
    applyRangeToElement(elem);
  }
  if (refresh) {
    refreshDynamicList();
  }
};

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
  if (TABLE_ATTRS.varServiceproviderid) {
    elem.dataset.varServiceproviderid = TABLE_ATTRS.varServiceproviderid;
  }
  applyRangeToElement(elem);
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

    tabs.forEach((t) => t.classList.remove("activeTab"));
    tab.classList.add("activeTab");

    currentTab = type;
    replaceDynamicList(type);
  });
});

const getTimestampSeconds = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const asNumber = Number(String(value).trim());
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return Math.floor(parsed.getTime() / 1000);
  }
  return null;
};

const formatDateAndTime = (value) => {
  const timestamp = getTimestampSeconds(value);
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp * 1000);
  return date
    .toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
    .replace(",", " at");
};

const formatYesNo = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return "Yes";
  }
  if (value === false || value === "false" || value === 0 || value === "0") {
    return "No";
  }
  return "";
};

const pickDisplayValue = (...values) => {
  for (const value of values) {
    if (isNullValue(value)) {
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }
    return value;
  }
  return "";
};

const cleanText = (value) => {
  if (isNullValue(value)) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return String(value);
};

const buildAppointmentDisplayData = (raw) => {
  const data = { ...(raw || {}) };

  const firstName = cleanText(
    data.Primary_Guest_First_Name || data.primary_guest_first_name,
  );
  const lastName = cleanText(
    data.Primary_Guest_Last_Name || data.primary_guest_last_name,
  );
  data.Primary_Guest_Full_Name = [firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  data.Primary_GuestEmail = pickDisplayValue(
    data.Primary_GuestEmail,
    data.Primary_Guest_Email,
    data.primary_guest_email,
  );
  data.Primary_Guest_SMS_Number = pickDisplayValue(
    data.Primary_Guest_SMS_Number,
    data.primary_guest_sms_number,
  );

  data.Inquiry_How_can_we_help = pickDisplayValue(
    data.Inquiry_How_can_we_help,
    data.Inquiry_How_Can_We_Help,
  );

  const residentFirst = cleanText(data.Contact_First_Name);
  const residentLast = cleanText(data.Contact_Last_Name);
  data.Location_Resident_s_Name = [residentFirst, residentLast]
    .filter(Boolean)
    .join(" ")
    .trim();
  data.Location_Resident_s_Mobile = pickDisplayValue(data.Contact_SMS_Number);
  data.Location_Resident_s_Email = pickDisplayValue(data.ContactEmail);

  data.LocationManholeLabel = formatYesNo(data.LocationManhole);

  data.formattedDateAndTime =
    data.formattedDateAndTime ||
    formatDateAndTime(
      data.Start_Time || data.start_time || data.Start || "",
    );
  data.descriptions = data.descriptions || data.Description || data.description || "";
  data.title = data.title || data.Title || "";
  data.unique_id = data.unique_id || data.Unique_ID || "";

  const durationHours = data.duration_hours ?? data.Duration_Hours ?? 0;
  const durationMinutes = data.duration_minutes ?? data.Duration_Minutes ?? 0;
  data.duration_hours = durationHours;
  data.duration_minutes = durationMinutes;

  data.PeterpmJob_Unique_ID =
    data.PeterpmJob_Unique_ID ||
    data.Job_Unique_ID ||
    data.Job_ID ||
    data.job_id ||
    "";
  data.Job_Unique_ID =
    data.Job_Unique_ID ||
    data.Job_ID ||
    data.job_id ||
    data.PeterpmJob_Unique_ID ||
    "";
  data.Inquiry_Unique_ID =
    data.Inquiry_Unique_ID || data.Inquiry_ID || data.inquiry_id || "";
  data.Primary_Guest_Unique_ID =
    data.Primary_Guest_Unique_ID ||
    data.Primary_Guest_ID ||
    data.primary_guest_id ||
    data.Primary_Guest_Contact_ID ||
    data.primary_guest_contact_id ||
    "";
  data.PeterpmProperty_Unique_ID =
    data.PeterpmProperty_Unique_ID ||
    data.Location_ID ||
    data.location_id ||
    "";

  data.Location_Display = pickDisplayValue(
    data.Location_Property_Name,
    data.Location_Address_1,
    data.Address,
  );
  data.Location_Map_Query = data.Location_Display;

  data.PeterpmService_Service_Name =
    data.PeterpmService_Service_Name || data.Inquiry_Service_Type || "";

  data.Quote_Button_Label = "Create Quote";

  return data;
};

const applyAppointmentText = (root, data) => {
  if (!root) {
    return;
  }
  const targets = root.querySelectorAll("[data-appointment-text]");
  targets.forEach((elem) => {
    const key = elem.dataset.appointmentText || "";
    const emptyText =
      elem.dataset.appointmentEmpty !== undefined
        ? elem.dataset.appointmentEmpty
        : "";
    const rawValue = key ? data[key] : "";
    let nextValue = "";
    if (isNullValue(rawValue)) {
      nextValue = emptyText;
    } else if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      nextValue = trimmed ? trimmed : emptyText;
    } else if (rawValue === false) {
      nextValue = "No";
    } else {
      nextValue = String(rawValue);
    }
    elem.textContent = nextValue;
  });
};

const applyAppointmentLinks = (root, data) => {
  if (!root) {
    return;
  }
  const targets = root.querySelectorAll("[data-appointment-href]");
  targets.forEach((elem) => {
    const key = elem.dataset.appointmentHref || "";
    const prefix = elem.dataset.appointmentHrefPrefix || "";
    const suffix = elem.dataset.appointmentHrefSuffix || "";
    const encode = elem.dataset.appointmentHrefEncode !== "false";
    const rawValue = key ? data[key] : "";
    if (isNullValue(rawValue)) {
      elem.removeAttribute("href");
      return;
    }
    const stringValue = String(rawValue).trim();
    if (!stringValue) {
      elem.removeAttribute("href");
      return;
    }
    const body = encode ? encodeURIComponent(stringValue) : stringValue;
    elem.setAttribute("href", `${prefix}${body}${suffix}`);
  });
};

const populateAppointmentDetailModal = (appointmentData) => {
  const root = document.querySelector(APPOINTMENT_MODAL_SELECTOR);
  if (!root) {
    return;
  }
  const data = buildAppointmentDisplayData(appointmentData);
  applyAppointmentText(root, data);
  applyAppointmentLinks(root, data);
};

const isFlattenedAppointmentRecord = (record) =>
  Boolean(
    record &&
      (record.Title ||
        record.Start_Time ||
        record.Location_Property_Name ||
        record.Primary_Guest_First_Name ||
        record.Inquiry_Admin_Notes),
  );

const getAlpineData = () => {
  const root = document.body;
  if (root && root.__x && root.__x.$data) {
    return root.__x.$data;
  }
  return null;
};

const mapAppointmentRecord = (record) => {
  const location = record?.Location || {};
  const primaryGuest = record?.Primary_Guest || {};
  const inquiry = record?.Inquiry || {};
  const ownerCompany = location?.Owner_Company || {};
  let residentLink = location?.Primary_Resident_Contact_for_Property || {};
  if (Array.isArray(residentLink)) {
    residentLink = residentLink[0] || {};
  }
  let residentContact = residentLink?.Contact || {};
  if (Array.isArray(residentContact)) {
    residentContact = residentContact[0] || {};
  }

  const startTime = record?.start_time || "";
  const endTime = record?.end_time || "";
  const description = record?.description || "";

  const addressParts = [
    location?.property_name,
    location?.address_1,
    location?.suburb_town,
    location?.state,
  ]
    .filter((value) => value)
    .join(" ");

  return {
    ID: record?.id || "",
    Type: record?.type || "",
    Title: record?.title || "",
    Job_ID: record?.job_id || "",
    Status: record?.status || "",
    Host_ID: record?.host_id || "",
    End_Time: endTime,
    Owner_ID: record?.owner_id || "",
    Last_Note: record?.last_note || "",
    Unique_ID: record?.unique_id || "",
    Date_Added: record?.created_at || "",
    Inquiry_ID: record?.inquiry_id || "",
    IP_Address: record?.ip_address || "",
    Start_Time: startTime,
    Description: description,
    Location_ID: record?.location_id || "",
    API_Response: record?.api_response || "",
    Event_Colour: record?.event_colour || "",
    Last_Activity: record?.last_activity || "",
    Last_SMS_Sent: record?.last_sms_sent || "",
    Profile_Image: record?.profile_image || "",
    Duration_Hours: record?.duration_hours || 0,
    Last_Email_Sent: record?.last_email_sent || "",
    Duration_Minutes: record?.duration_minutes || 0,
    Last_Call_Logged: record?.last_call_logged || "",
    Date_Modified: record?.last_modified_at || "",
    Primary_Guest_ID: record?.primary_guest_id || "",
    Calendar_Event_ID: record?.calendar_event_id || "",
    Last_SMS_Received: record?.last_sms_received || "",
    Last_Email_Received: record?.last_email_received || "",
    externalRawDataStatus: record?.externalRawDataStatus || "",
    Appointment_Edit_Page_URL: record?.appointment_edit_page_url || "",
    Appointment_Edit_Page_visits: record?.appointment_edit_page_visits || "",
    Appointment_Edit_Page_published:
      record?.appointment_edit_page_published || "",
    Appointment_Edit_Page_unique_visits:
      record?.appointment_edit_page_unique_visits || "",
    Primary_Guest_First_Name: primaryGuest?.first_name || "",
    Primary_Guest_Last_Name: primaryGuest?.last_name || "",
    Primary_Guest_Email: primaryGuest?.email || "",
    Primary_Guest_SMS_Number: primaryGuest?.sms_number || "",
    Location_Property_Name: location?.property_name || "",
    Location_Address_1: location?.address_1 || "",
    Location_Address_2: location?.address_2 || "",
    Location_Lot_Number: location?.lot_number || "",
    Location_Unit_Number: location?.unit_number || "",
    Location_Suburb_Town: location?.suburb_town || "",
    Location_Postal_Code: location?.postal_code || "",
    LocationState: location?.state || "",
    Location_Owner_Type: location?.owner_type || "",
    Location_Property_Type: location?.property_type || "",
    Location_Building_Type: location?.building_type || "",
    Location_Building_Type_Other: location?.building_type_other || "",
    Location_Foundation_Type: location?.foundation_type || "",
    LocationBedrooms: location?.bedrooms || "",
    LocationStories: location?.stories || "",
    LocationManhole: location?.manhole || "",
    CompanyName: ownerCompany?.name || "",
    Contact_First_Name: residentContact?.first_name || "",
    Contact_Last_Name: residentContact?.last_name || "",
    Contact_SMS_Number: residentContact?.sms_number || "",
    ContactEmail: residentContact?.email || "",
    Inquiry_Admin_Notes: inquiry?.admin_notes || "",
    Inquiry_How_Can_We_Help: inquiry?.how_can_we_help || "",
    Inquiry_How_can_we_help: inquiry?.how_can_we_help || "",
    Inquiry_Service_Type: inquiry?.service_type || "",
    formattedDateAndTime: formatDateAndTime(startTime),
    descriptions: description,
    description,
    title: record?.title || "",
    status: record?.status || "",
    type: record?.type || "",
    unique_id: record?.unique_id || "",
    inquiry_id: record?.inquiry_id || "",
    job_id: record?.job_id || "",
    duration_hours: record?.duration_hours || 0,
    duration_minutes: record?.duration_minutes || 0,
    start_time: startTime,
    end_time: endTime,
    location_id: record?.location_id || "",
    Primary_Guest_Contact_ID: record?.primary_guest_id || "",
    primary_guest_contact_id: record?.primary_guest_id || "",
    primary_guest_id: record?.primary_guest_id || "",
    Primary_GuestEmail: primaryGuest?.email || "",
    Address: addressParts,
    Inquiry_Unique_ID: record?.inquiry_id || "",
    Job_Unique_ID: record?.job_id || "",
    PeterpmJob_Unique_ID: record?.job_id || "",
    Primary_Guest_Unique_ID: record?.primary_guest_id || "",
    PeterpmProperty_Unique_ID: record?.location_id || "",
  };
};

const looksLikeRecord = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return (
    "id" in value ||
    "unique_id" in value ||
    "title" in value ||
    "start_time" in value
  );
};

const extractFirstRecord = (payload) => {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    return payload[0] || null;
  }

  const candidates = [
    payload?.resp,
    payload?.records,
    payload?.data,
    payload?.createJob,
    payload?.resp?.data,
    payload?.resp?.records,
    payload?.data?.records,
    payload?.data?.createJob,
    payload?.resp?.createJob,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate[0] || null;
    }
    if (looksLikeRecord(candidate)) {
      return candidate;
    }
  }

  if (looksLikeRecord(payload?.record)) {
    return payload.record;
  }
  if (looksLikeRecord(payload?.resp)) {
    return payload.resp;
  }

  if (payload && typeof payload === "object") {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value)) {
        return value[0] || null;
      }
      if (looksLikeRecord(value)) {
        return value;
      }
    }
  }

  return looksLikeRecord(payload) ? payload : null;
};

const extractCreateJobRecord = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const directCandidates = [
    payload.createJob,
    payload.data?.createJob,
    payload.resp?.createJob,
    payload.resp?.data?.createJob,
    payload.data?.resp?.createJob,
    payload.data?.data?.createJob,
  ];

  for (const candidate of directCandidates) {
    if (looksLikeRecord(candidate)) {
      return candidate;
    }
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate;
    }
  }

  return null;
};

const extractRecords = (payload) => {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  const candidates = [
    payload?.resp,
    payload?.records,
    payload?.data,
    payload?.resp?.data,
    payload?.resp?.records,
    payload?.data?.records,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
};

const getLatestRecordByCreatedAt = (records) => {
  if (!records.length) {
    return null;
  }
  return records.reduce((best, record) => {
    const bestTime = getTimestampSeconds(best?.created_at) || 0;
    const recordTime = getTimestampSeconds(record?.created_at) || 0;
    if (recordTime > bestTime) {
      return record;
    }
    if (recordTime === bestTime) {
      const bestId = Number(best?.id || best?.ID || 0);
      const recordId = Number(record?.id || record?.ID || 0);
      if (recordId > bestId) {
        return record;
      }
    }
    return best;
  }, records[0]);
};

const fetchLatestJobForProperty = async (propertyId) => {
  const plugin = await getVitalStatsPlugin();
  const jobModel = plugin.switchTo("PeterpmJob");
  let query = jobModel.query();
  query = query.where("property_id", propertyId);
  query = query.deSelectAll().select(["id", "unique_id", "job_id", "created_at"]);
  query.getOrInitQueryCalc?.();
  const result = await query.fetchDirect().toPromise();
  const records = extractRecords(result);
  return getLatestRecordByCreatedAt(records);
};

const fetchAppointmentDetails = async (appointmentId) => {
  const plugin = await getVitalStatsPlugin();
  const appointmentModel = plugin.switchTo("PeterpmAppointment");
  const idValue = appointmentId;
  const isNumericId =
    typeof idValue === "number" ||
    (typeof idValue === "string" && /^\d+$/.test(idValue.trim()));

  let query = appointmentModel.query();
  query = query.where(isNumericId ? "id" : "unique_id", idValue);
  query = query.deSelectAll().select([
    "id",
    "type",
    "title",
    "job_id",
    "status",
    "host_id",
    "end_time",
    "owner_id",
    "last_note",
    "unique_id",
    "created_at",
    "inquiry_id",
    "ip_address",
    "start_time",
    "description",
    "location_id",
    "api_response",
    "event_colour",
    "last_activity",
    "last_sms_sent",
    "profile_image",
    "duration_hours",
    "last_email_sent",
    "duration_minutes",
    "last_call_logged",
    "last_modified_at",
    "primary_guest_id",
    "calendar_event_id",
    "last_sms_received",
    "last_email_received",
    "externalRawDataStatus",
    "appointment_edit_page_url",
    "appointment_edit_page_visits",
    "appointment_edit_page_published",
    "appointment_edit_page_unique_visits",
  ]);

  if (typeof query.include === "function") {
    query.include("Primary_Guest", (q) => {
      if (q && typeof q.select === "function") {
        q.select(["id", "first_name", "last_name", "email", "sms_number"]);
      }
    });
    query.include("Inquiry", (q) => {
      if (q && typeof q.select === "function") {
        q.select(["admin_notes", "how_can_we_help", "service_type"]);
      }
    });
    query.include("Location", (q) => {
      if (q && typeof q.select === "function") {
        q.select([
          "property_name",
          "address_1",
          "address_2",
          "lot_number",
          "unit_number",
          "suburb_town",
          "postal_code",
          "state",
          "owner_type",
          "property_type",
          "building_type",
          "building_type_other",
          "foundation_type",
          "bedrooms",
          "stories",
          "manhole",
        ]);
      }
      if (q && typeof q.include === "function") {
        q.include("Owner_Company", (oc) => {
          if (oc && typeof oc.select === "function") {
            oc.select(["name"]);
          }
        });
        q.include("Primary_Resident_Contact_for_Property", (pc) => {
          if (pc && typeof pc.include === "function") {
            pc.include("Contact", (c) => {
              if (c && typeof c.select === "function") {
                c.select(["first_name", "last_name", "sms_number", "email"]);
              }
            });
          }
        });
      }
    });
  }

  query.getOrInitQueryCalc?.();
  const result = await query.fetchDirect().toPromise();
  return extractFirstRecord(result);
};

const handleAppointmentSelect = async (row) => {
  if (!row) {
    return;
  }
  try {
    const appointmentId =
      row.ID ||
      row.id ||
      row.Appointment_ID ||
      row.appointment_id ||
      row.Unique_ID ||
      row.unique_id ||
      "";
    if (!appointmentId) {
      alert("Appointment ID is missing.");
      return;
    }
    const record = await fetchAppointmentDetails(appointmentId);
    if (!record) {
      alert("Appointment details not found.");
      return;
    }
    const mappedRecord = isFlattenedAppointmentRecord(record)
      ? record
      : mapAppointmentRecord(record);
    const appointmentData = buildAppointmentDisplayData(mappedRecord);
    const alpineData = getAlpineData();
    if (alpineData) {
      alpineData.appointmentData = appointmentData;
    }
    window.appointmentData = appointmentData;
    populateAppointmentDetailModal(appointmentData);

    const jobData = document.querySelectorAll(".jobData");
    const inquiryData = document.querySelectorAll(".inquiryData");
    if (appointmentData.Type === "Job" || appointmentData.type === "Job") {
      jobData.forEach((element) => {
        element.classList.remove("hidden");
      });
      inquiryData.forEach((element) => {
        element.classList.add("hidden");
      });
    } else {
      jobData.forEach((element) => {
        element.classList.add("hidden");
      });
      inquiryData.forEach((element) => {
        element.classList.remove("hidden");
      });
    }

    if (alpineData) {
      alpineData.modalIsOpen = true;
    } else {
      window.modalIsOpen = true;
    }
  } catch (error) {
    console.error("Failed to load appointment details:", error);
    alert("Failed to load appointment details.");
  }
};

window.initAppointmentTable = (dynamicList) => {
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
      onRowClick: (params) => {
        handleAppointmentSelect(params.row);
      },
    };
  });

  dynamicList.tableCtx.setFinalizeColumns((cols) => {
    const mapped = cols
      .map((col) => {
        const fieldName = col.field || "";
        const isStart = START_FIELD_RE.test(fieldName);
        const isEnd = END_FIELD_RE.test(fieldName);
        if (isEnd) {
          return null;
        }
      const isId = ID_FIELD_RE.test(col.field || "");
      const isStatus = STATUS_FIELD_RE.test(col.field || "");
      if (col.field === ACTIONS_FIELD) {
        return col;
      }
      const baseRender = col.renderCell;
      return {
        ...col,
        headerName: isStart ? "Start - End" : col.headerName,
        minWidth: isId ? 100 : 160,
        width: isId ? 120 : col.width,
        flex: isId ? 0 : col.flex,
        renderCell: (params) => {
          if (isStart) {
            const startText = getCellText(params.value);
            const row = params.row || {};
            const endValue =
              row.End ||
              row.End_Time ||
              row.end_time ||
              row.end ||
              row.EndTime ||
              row.endTime;
            const endText = getCellText(endValue);
            return `${startText} - ${endText}`;
          }
          const rawValue = params.value;
          if (isNullValue(rawValue)) {
            return "-";
          }
          if (isStatus) {
            const statusText = String(rawValue || "");
            const statusClass = STATUS_STYLES[statusText] || STATUS_FALLBACK;
            return React.createElement(
              "span",
              {
                className: `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`,
              },
              statusText || "-",
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
      })
      .filter(Boolean);

    if (mapped.some((col) => col.field === ACTIONS_FIELD)) {
      return mapped;
    }

    return [
      ...mapped,
      {
        field: ACTIONS_FIELD,
        headerName: "Action",
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
                handleAppointmentSelect(params.row);
              },
              className: "text-[#0052CC] hover:text-[#003882]",
              "aria-label": "View appointment",
              title: "View appointment",
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

const dayFilter = document.querySelector(".showDayData");
const weekFilter = document.querySelector(".showWeekData");
const monthFilter = document.querySelector(".showMonthData");
const allFilter = document.querySelector(".showAllData");

if (allFilter) {
  allFilter.addEventListener("click", () => {
    setRange("all");
    replaceDynamicList(currentTab);
  });
}

if (dayFilter) {
  dayFilter.addEventListener("click", () => {
    setRange("day");
    replaceDynamicList(currentTab);
  });
}

if (weekFilter) {
  weekFilter.addEventListener("click", () => {
    setRange("week");
    replaceDynamicList(currentTab);
  });
}

if (monthFilter) {
  monthFilter.addEventListener("click", () => {
    setRange("month");
    replaceDynamicList(currentTab);
  });
}

setRange(currentRange, { refresh: true });

const prefillRescheduleModal = () => {
  const alpineData = getAlpineData();
  const appointmentData = buildAppointmentDisplayData(
    (alpineData && alpineData.appointmentData) || window.appointmentData || {},
  );
  if (!appointmentData || Object.keys(appointmentData).length === 0) {
    return;
  }

  const appointmentTitleInput = document.getElementById("appointmentTitle");
  if (appointmentTitleInput) {
    const titleParts = [appointmentData.title, appointmentData.unique_id].filter(
      Boolean,
    );
    appointmentTitleInput.value = titleParts.join(" - ");
  }

  const firstName = document.querySelector(".customFirstName");
  if (firstName) {
    firstName.value = appointmentData.Primary_Guest_First_Name || "";
  }

  const lastName = document.querySelector(".customLastName");
  if (lastName) {
    lastName.value = appointmentData.Primary_Guest_Last_Name || "";
  }

  const email = document.querySelector(".customEmail");
  if (email) {
    email.value = appointmentData.Primary_GuestEmail || "";
  }

  const sms = document.querySelector(".customSms");
  if (sms) {
    sms.value = appointmentData.Primary_Guest_SMS_Number || "";
  }

  const property = document.querySelector(".scheduleProperty");
  if (property) {
    property.value = appointmentData.Location_Display || "";
  }

  const durationHour = document.querySelector("#durationHour");
  if (durationHour) {
    durationHour.value = String(appointmentData.duration_hours || 0);
  }

  const durationMinute = document.querySelector("#durationMinute");
  if (durationMinute) {
    durationMinute.value = String(appointmentData.duration_minutes || 0);
  }
};

const createQuoteFromModal = async (triggerButton) => {
  if (isQuoteCreating) {
    return;
  }
  isQuoteCreating = true;
  const activeButton =
    triggerButton ||
    document.querySelector('[data-appointment-action="create-quote"]');
  setButtonLoading(activeButton, true, "Creating quote...");
  try {
    const alpineData = getAlpineData();
    const appointmentData = buildAppointmentDisplayData(
      (alpineData && alpineData.appointmentData) || window.appointmentData || {},
    );
    if (!appointmentData || Object.keys(appointmentData).length === 0) {
      showToast("Appointment data is missing.", "error");
      return;
    }

    const propertyId =
      appointmentData.PeterpmProperty_Unique_ID ||
      appointmentData.Location_ID ||
      appointmentData.location_id ||
      "";

    if (!propertyId) {
      showToast("Missing property details.", "error");
      return;
    }

    const propertyValue = Number.isFinite(Number(propertyId))
      ? Number(propertyId)
      : propertyId;

    const payload = {
      property_id: propertyValue,
      quote_status: "Requested",
      job_status: "Quote",
      primary_service_provider_id:
        typeof SERVICE_PROVIDER_ID !== "undefined" && SERVICE_PROVIDER_ID !== null
          ? SERVICE_PROVIDER_ID
          : null,
      Inquiry_Record: {
        inquiry_status: "Quote Created",
      },
    };
    console.log("create job payload", payload, SERVICE_PROVIDER_ID);

    const plugin = await getVitalStatsPlugin();
    const jobModel = plugin.switchTo("PeterpmJob");
    const jobMutation = jobModel.mutation();
    if (typeof jobMutation.deSelectAll === "function") {
      jobMutation.deSelectAll();
    }
    if (typeof jobMutation.select === "function") {
      jobMutation.select(["id", "unique_id", "job_id"]);
    }
    jobMutation.createOne(payload);
    const jobResponse = await jobMutation.execute(true).toPromise();
    const createdJobRecord =
      extractCreateJobRecord(jobResponse) || extractFirstRecord(jobResponse);
    let createdJobId =
      createdJobRecord?.id ||
      createdJobRecord?.ID ||
      createdJobRecord?.job_id ||
      createdJobRecord?.Job_ID ||
      createdJobRecord?.unique_id ||
      createdJobRecord?.Unique_ID ||
      "";

    if (!createdJobId) {
      const fallbackRecord = await fetchLatestJobForProperty(propertyValue);
      createdJobId =
        fallbackRecord?.id ||
        fallbackRecord?.ID ||
        fallbackRecord?.job_id ||
        fallbackRecord?.Job_ID ||
        fallbackRecord?.unique_id ||
        fallbackRecord?.Unique_ID ||
        "";
    }

    if (!createdJobId) {
      showToast("Quote created, but no job id was returned.", "info");
      return;
    }

    showToast("Quote created successfully.", "success");
  } catch (error) {
    console.error("Quote creation failed:", error);
    showToast("Failed to create quote.", "error");
  } finally {
    isQuoteCreating = false;
    setButtonLoading(activeButton, false);
  }
};

const scheduleAppointmentFromModal = async (triggerButton) => {
  if (isRescheduling) {
    return;
  }
  isRescheduling = true;
  const activeButton =
    triggerButton ||
    document.querySelector('[data-appointment-action="reschedule-appointment"]');
  setButtonLoading(activeButton, true, "Scheduling...");
  try {
    const alpineData = getAlpineData();
    const appointmentData =
      (alpineData && alpineData.appointmentData) || window.appointmentData;
    if (!appointmentData) {
      showToast("Appointment data is missing.", "error");
      return;
    }

    const dateTimeInputEl = document.querySelector(
      ".dateTimeScheduleInquiry",
    );
    const scheduleDescriptionEl = document.querySelector(
      ".scheduleDescription",
    );
    const appointmentTitleEl = document.querySelector("#appointmentTitle");
    const durationHourEl = document.getElementById("durationHour");
    const durationMinuteEl = document.getElementById("durationMinute");

    const dateTimeInput = dateTimeInputEl ? dateTimeInputEl.value : "";
    const scheduleDescription = scheduleDescriptionEl
      ? scheduleDescriptionEl.value
      : "";
    const appointmentTitle = appointmentTitleEl ? appointmentTitleEl.value : "";
    const durationHour = durationHourEl ? durationHourEl.value : "0";
    const durationMinute = durationMinuteEl ? durationMinuteEl.value : "0";

    if (!dateTimeInput) {
      showToast("Please select a date and time.", "error");
      return;
    }

    const dateObj = new Date(dateTimeInput);
    if (Number.isNaN(dateObj.getTime())) {
      showToast("Invalid date/time selected.", "error");
      return;
    }

    const timestamp = Math.floor(dateObj.getTime() / 1000);
    const propertyID =
      appointmentData.location_id ||
      appointmentData.Location_ID ||
      appointmentData.PeterpmProperty_Unique_ID ||
      "";
    const inquiryId =
      appointmentData.inquiry_id ||
      appointmentData.Inquiry_ID ||
      appointmentData.Inquiry_Unique_ID ||
      "";
    const contactID =
      appointmentData.Primary_Guest_Contact_ID ||
      appointmentData.primary_guest_contact_id ||
      "";

    if (!propertyID || !inquiryId || !contactID) {
      showToast("Missing property, inquiry, or contact details.", "error");
      return;
    }

    const hostId =
      typeof loggedInUserIdOp !== "undefined" && loggedInUserIdOp !== null
        ? loggedInUserIdOp
        : appointmentData.Host_ID ||
          appointmentData.host_id ||
          appointmentData.contact_contact_id ||
          appointmentData.Contact_Contact_ID ||
          "";

    const payload = {
      inquiry_id: inquiryId,
      status: "New",
      start_time: timestamp,
      title: appointmentTitle,
      location_id: propertyID,
      primary_guest_id: contactID,
      host_id: hostId,
      duration_minutes: parseInt(durationMinute, 10) || 0,
      duration_hours: parseInt(durationHour, 10) || 0,
      description: scheduleDescription,
      Inquiry: {
        inquiry_status: "Site Visit to be Re-Scheduled",
      },
    };

    const plugin = await getVitalStatsPlugin();
    const appointmentModel = plugin.switchTo("PeterpmAppointment");
    const appointmentMutation = appointmentModel.mutation();
    appointmentMutation.createOne(payload);
    await appointmentMutation.execute(true).toPromise();
console.log("create job payload", payload, SERVICE_PROVIDER_ID);

    const dealModel = plugin.switchTo("PeterpmDeal");
    const dealMutation = dealModel.mutation();
    const inquiryField =
      typeof inquiryId === "string" && inquiryId.trim().length
        ? Number.isFinite(Number(inquiryId))
          ? "id"
          : "unique_id"
        : "id";
    dealMutation.update((q) =>
      q.where(inquiryField, inquiryId).set({
        inquiry_status: "Site Visit to be Re-Scheduled",
      }),
    );
    await dealMutation.execute(true).toPromise();

    showToast("Appointment scheduled successfully.", "success");
    setTimeout(() => {
      location.reload();
    }, 800);
  } catch (error) {
    console.error("Reschedule appointment failed:", error);
    showToast("Failed to schedule appointment.", "error");
  } finally {
    isRescheduling = false;
    setButtonLoading(activeButton, false);
  }
};

window.scheduleAppointmentFromModal = scheduleAppointmentFromModal;
window.prefillRescheduleModal = prefillRescheduleModal;
window.createQuoteFromModal = createQuoteFromModal;

document.addEventListener("click", (event) => {
  const button = event.target.closest(
    '[data-appointment-action="create-quote"]',
  );
  if (!button) {
    return;
  }
  event.preventDefault();
  createQuoteFromModal(button);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(
    '[data-appointment-action="reschedule-appointment"]',
  );
  if (!button) {
    return;
  }
  event.preventDefault();
  scheduleAppointmentFromModal(button);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(
    '[data-appointment-action="return-inquiry"]',
  );
  if (!button) {
    return;
  }
  event.preventDefault();
  returnInquiryFromModal(button);
});
