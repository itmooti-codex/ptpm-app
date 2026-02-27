/**
 * Shared GraphQL queries and mutations for detail pages.
 * Ported from inquiry-detail/queries.js + job-detail.js and extended.
 *
 * @namespace PtpmQueries
 */
(function () {
  'use strict';

  var TIMEOUT = 45000;

  // ── Helper: fetch GraphQL ────────────────────────────────────────────────

  function getEndpoint() {
    var cfg = window.AppConfig || {};
    var base = (cfg.API_BASE || ('https://' + (cfg.SLUG || 'peterpm') + '.vitalstats.app')).replace(/\/+$/, '');
    return base + '/api/v1/graphql';
  }

  function gqlFetch(query, variables, timeoutMs) {
    var cfg = window.AppConfig || {};
    var endpoint = getEndpoint();
    if (!cfg.API_KEY) return Promise.reject(new Error('Missing API_KEY'));

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var ms = timeoutMs || TIMEOUT;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, ms);

    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Api-Key': cfg.API_KEY },
      body: JSON.stringify({ query: query, variables: variables || {} }),
      signal: controller ? controller.signal : undefined,
    }).then(function (res) {
      if (!res.ok) throw new Error('GraphQL ' + res.status);
      return res.json();
    }).then(function (json) {
      if (json.errors && json.errors[0]) throw new Error(json.errors[0].message);
      return json.data || {};
    }).catch(function (err) {
      if (err && err.name === 'AbortError') throw new Error('GraphQL timeout (' + ms + 'ms)');
      throw err;
    }).finally(function () {
      clearTimeout(timer);
    });
  }

  /** Return first record from a GraphQL response */
  function firstRecord(data) {
    if (!data || typeof data !== 'object') return null;
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      var arr = data[keys[i]];
      if (Array.isArray(arr)) return arr[0] || null;
    }
    return null;
  }

  /** Return all records from a GraphQL response */
  function allRecords(data) {
    if (!data || typeof data !== 'object') return [];
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      var arr = data[keys[i]];
      if (Array.isArray(arr)) return arr;
    }
    return [];
  }

  function escGQL(v) { return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

  // ── Inquiry (Deal) Queries ───────────────────────────────────────────────

  var INQUIRY_DETAIL_QUERY = [
    'query calcDeals($id: PeterpmDealID!) {',
    '  calcDeals(query: [{ where: { id: $id } }]) {',
    '    id: field(arg: ["id"])',
    '    unique_id: field(arg: ["unique_id"])',
    '    deal_name: field(arg: ["deal_name"])',
    '    deal_value: field(arg: ["deal_value"])',
    '    sales_stage: field(arg: ["sales_stage"])',
    '    inquiry_status: field(arg: ["inquiry_status"])',
    '    type: field(arg: ["type"])',
    '    inquiry_source: field(arg: ["inquiry_source"])',
    '    how_did_you_hear: field(arg: ["how_did_you_hear"])',
    '    how_can_we_help: field(arg: ["how_can_we_help"])',
    '    admin_notes: field(arg: ["admin_notes"])',
    '    client_notes: field(arg: ["client_notes"])',
    '    account_type: field(arg: ["account_type"])',
    '    service_type: field(arg: ["service_type"])',
    '    deal_size: field(arg: ["deal_size"])',
    '    expected_close_timeframe: field(arg: ["expected_close_timeframe"])',
    '    call_back: field(arg: ["call_back"])',
    '    inquiry_for_job_id: field(arg: ["inquiry_for_job_id"])',
    '    service_inquiry_id: field(arg: ["service_inquiry_id"])',
    '    quote_record_id: field(arg: ["quote_record_id"])',
    '    service_provider_id: field(arg: ["service_provider_id"])',
    '    primary_contact_id: field(arg: ["primary_contact_id"])',
    '    property_id: field(arg: ["property_id"])',
    '    return_inquiry_to_admin: field(arg: ["return_inquiry_to_admin"])',
    '    inquiry_return_reason: field(arg: ["inquiry_return_reason"])',
    '    date_job_required_by: field(arg: ["date_job_required_by"]) @dateFormat(value: "YYYY-MM-DD")',
    '    expected_close_date: field(arg: ["expected_close_date"]) @dateFormat(value: "YYYY-MM-DD")',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY")',
    '    noise_signs: field(arg: ["noise_signs_options_as_text"])',
    '    pest_location: field(arg: ["pest_location_options_as_text"])',
    '    pest_active_times: field(arg: ["pest_active_times_options_as_text"])',
    '    renovations: field(arg: ["renovations"])',
    '    resident_availability: field(arg: ["resident_availability"])',
    '    open_tasks: field(arg: ["open_tasks"])',
    '    popup_comment: field(arg: ["Primary_Contact", "popup_comment"])',
    '    last_action_status: field(arg: ["PTPM_Last_Action_Status"])',
    '    last_action_message: field(arg: ["PTPM_Last_Action_Message"])',
    '    last_action_type: field(arg: ["PTPM_Last_Action_Type"])',
    '    last_action_request_id: field(arg: ["PTPM_Last_Action_Request_ID"])',
    '    last_action_at: field(arg: ["PTPM_Last_Action_At"]) @dateFormat(value: "YYYY-MM-DD HH:mm")',
    '    last_action_source: field(arg: ["PTPM_Last_Action_Source"])',
    '  }',
    '}',
  ].join('\n');

  // ── Job Queries ──────────────────────────────────────────────────────────

  var JOB_DETAIL_QUERY = [
    'query calcJobs($id: PeterpmJobID!) {',
    '  calcJobs(query: [{ where: { id: $id } }]) {',
    '    id: field(arg: ["id"])',
    '    unique_id: field(arg: ["unique_id"])',
    '    job_type: field(arg: ["job_type"])',
    '    priority: field(arg: ["priority"])',
    '    account_type: field(arg: ["account_type"])',
    '    job_status: field(arg: ["job_status"])',
    '    quote_status: field(arg: ["quote_status"])',
    '    payment_status: field(arg: ["payment_status"])',
    // Dates
    '    quote_date: field(arg: ["quote_date"]) @dateFormat(value: "YYYY-MM-DD")',
    '    follow_up_date: field(arg: ["follow_up_date"]) @dateFormat(value: "YYYY-MM-DD")',
    '    date_quote_sent: field(arg: ["date_quote_sent"]) @dateFormat(value: "YYYY-MM-DD")',
    '    date_quoted_accepted: field(arg: ["date_quoted_accepted"]) @dateFormat(value: "YYYY-MM-DD")',
    '    quote_valid_until: field(arg: ["quote_valid_until"]) @dateFormat(value: "YYYY-MM-DD")',
    '    date_booked: field(arg: ["date_booked"]) @dateFormat(value: "YYYY-MM-DD")',
    '    date_scheduled: field(arg: ["date_scheduled"]) @dateFormat(value: "YYYY-MM-DD")',
    '    date_started: field(arg: ["date_started"]) @dateFormat(value: "YYYY-MM-DD")',
    '    date_completed: field(arg: ["date_completed"]) @dateFormat(value: "YYYY-MM-DD")',
    '    date_cancelled: field(arg: ["date_cancelled"]) @dateFormat(value: "YYYY-MM-DD")',
    '    invoice_date: field(arg: ["invoice_date"]) @dateFormat(value: "YYYY-MM-DD")',
    '    due_date: field(arg: ["due_date"]) @dateFormat(value: "YYYY-MM-DD")',
    '    bill_date: field(arg: ["bill_date"]) @dateFormat(value: "YYYY-MM-DD")',
    '    bill_due_date: field(arg: ["bill_due_date"]) @dateFormat(value: "YYYY-MM-DD")',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY")',
    // Totals
    '    quote_total: field(arg: ["quote_total"])',
    '    quote_gst: field(arg: ["quote_gst"])',
    '    quoted_activities_subtotal: field(arg: ["quoted_activities_subtotal"])',
    '    job_total: field(arg: ["job_total"])',
    '    job_gst: field(arg: ["job_gst"])',
    '    invoice_total: field(arg: ["invoice_total"])',
    '    invoice_number: field(arg: ["invoice_number"])',
    // Variations
    '    quote_variation_type: field(arg: ["quote_variation_type"])',
    '    quote_variation_price: field(arg: ["quote_variation_price"])',
    '    quote_variation_text: field(arg: ["quote_variation_text"])',
    '    job_variation_type: field(arg: ["job_variation_type"])',
    '    job_variation_price: field(arg: ["job_variation_price"])',
    '    job_variation_text: field(arg: ["job_variation_text"])',
    // Payment
    '    payment_method: field(arg: ["payment_method"])',
    '    Part_Payment_Made: field(arg: ["Part_Payment_Made"])',
    '    xero_invoice_status: field(arg: ["xero_invoice_status"])',
    '    xero_invoice_pdf: field(arg: ["xero_invoice_pdf"])',
    '    invoice_url_admin: field(arg: ["invoice_url_admin"])',
    '    send_to_contact: field(arg: ["send_to_contact"])',
    // Bill
    '    bill_total: field(arg: ["bill_total"])',
    '    bill_gst: field(arg: ["bill_gst"])',
    '    bill_batch_id: field(arg: ["bill_batch_id"])',
    '    bill_batch_week: field(arg: ["bill_batch_week"])',
    '    xero_bill_status: field(arg: ["xero_bill_status"])',
    '    bill_approved_admin: field(arg: ["bill_approved_admin"])',
    '    bill_approved_service_provider: field(arg: ["bill_approved_service_provider"])',
    // Materials totals
    '    materials_total: field(arg: ["materials_total"])',
    '    deduct_total: field(arg: ["deduct_total"])',
    '    reimburse_total: field(arg: ["reimburse_total"])',
    // Compliance
    '    prestart_done: field(arg: ["prestart_done"])',
    '    pca_done: field(arg: ["pca_done"])',
    '    form_prestart_url: field(arg: ["form_prestart_url"])',
    '    form_pest_control_advice_url: field(arg: ["form_pest_control_advice_url"])',
    '    mark_complete: field(arg: ["mark_complete"])',
    '    terms_and_conditions_accepted: field(arg: ["terms_and_conditions_accepted"])',
    '    signature: field(arg: ["signature"])',
    // Wildlife
    '    possum_number: field(arg: ["possum_number"])',
    '    turkey_number: field(arg: ["turkey_number"])',
    '    possum_comment: field(arg: ["possum_comment"])',
    '    turkey_comment: field(arg: ["turkey_comment"])',
    '    turkey_release_site: field(arg: ["turkey_release_site"])',
    '    location_name: field(arg: ["location_name"])',
    '    noise_signs: field(arg: ["noise_signs_options_as_text"])',
    // Recommendation
    '    admin_recommendation: field(arg: ["admin_recommendation"])',
    '    follow_up_comment: field(arg: ["follow_up_comment"])',
    // Feedback
    '    feedback_status: field(arg: ["feedback_status"])',
    '    rating: field(arg: ["rating"])',
    '    feedback_text: field(arg: ["feedback_text"])',
    // FKs
    '    property_id: field(arg: ["property_id"])',
    '    client_individual_id: field(arg: ["client_individual_id"])',
    '    client_entity_id: field(arg: ["client_entity_id"])',
    '    accounts_contact_id: field(arg: ["accounts_contact_id"])',
    '    primary_service_provider_id: field(arg: ["primary_service_provider_id"])',
    '    inquiry_record_id: field(arg: ["inquiry_record_id"])',
    '    past_job_id: field(arg: ["past_job_id"])',
    '    duplicate_job: field(arg: ["duplicate_job"])',
    '    job_call_backs: field(arg: ["job_call_backs"])',
    '    return_job_to_admin: field(arg: ["return_job_to_admin"])',
    '    create_a_callback: field(arg: ["create_a_callback"])',
    // Contact popup (for warning banner)
    '    popup_comment: field(arg: ["Client_Individual", "popup_comment"])',
    '    last_action_status: field(arg: ["PTPM_Last_Action_Status"])',
    '    last_action_message: field(arg: ["PTPM_Last_Action_Message"])',
    '    last_action_type: field(arg: ["PTPM_Last_Action_Type"])',
    '    last_action_request_id: field(arg: ["PTPM_Last_Action_Request_ID"])',
    '    last_action_at: field(arg: ["PTPM_Last_Action_At"]) @dateFormat(value: "YYYY-MM-DD HH:mm")',
    '    last_action_source: field(arg: ["PTPM_Last_Action_Source"])',
    '  }',
    '}',
  ].join('\n');

  // ── Contact Detail ───────────────────────────────────────────────────────

  var CONTACT_DETAIL_QUERY = [
    'query calcContacts($id: PeterpmContactID!) {',
    '  calcContacts(query: [{ where: { id: $id } }]) {',
    '    id: field(arg: ["id"])',
    '    first_name: field(arg: ["first_name"])',
    '    last_name: field(arg: ["last_name"])',
    '    email: field(arg: ["email"])',
    '    sms_number: field(arg: ["sms_number"])',
    '    office_phone: field(arg: ["office_phone"])',
    '    address: field(arg: ["address"])',
    '    city: field(arg: ["city"])',
    '    state: field(arg: ["state"])',
    '    zip_code: field(arg: ["zip_code"])',
    '    popup_comment: field(arg: ["popup_comment"])',
    '    how_referred: field(arg: ["how_referred"])',
    '    inquiring_as: field(arg: ["inquiring_as"])',
    '    xero_contact_id: field(arg: ["xero_contact_id"])',
    '  }',
    '}',
  ].join('\n');

  // ── Company Detail ───────────────────────────────────────────────────────

  var COMPANY_DETAIL_QUERY = [
    'query calcCompanies($id: PeterpmCompanyID!) {',
    '  calcCompanies(query: [{ where: { id: $id } }]) {',
    '    id: field(arg: ["id"])',
    '    name: field(arg: ["name"])',
    '    phone: field(arg: ["phone"])',
    '    address: field(arg: ["address"])',
    '    city: field(arg: ["city"])',
    '    state: field(arg: ["state"])',
    '    postal_code: field(arg: ["postal_code"])',
    '    account_type: field(arg: ["account_type"])',
    '    popup_comment: field(arg: ["popup_comment"])',
    '    xero_contact_id: field(arg: ["xero_contact_id"])',
    '    industry: field(arg: ["industry"])',
    '    body_corporate_company_id: field(arg: ["body_corporate_company_id"])',
    '    primary_person_id: field(arg: ["primary_person_id"])',
    '    accounts_contact_id: field(arg: ["accounts_contact_id"])',
    '  }',
    '}',
  ].join('\n');

  // ── Property Detail ──────────────────────────────────────────────────────

  var PROPERTY_DETAIL_QUERY = [
    'query calcProperties($id: PeterpmPropertyID!) {',
    '  calcProperties(query: [{ where: { id: $id } }]) {',
    '    id: field(arg: ["id"])',
    '    property_name: field(arg: ["property_name"])',
    '    address_1: field(arg: ["address_1"])',
    '    address_2: field(arg: ["address_2"])',
    '    suburb_town: field(arg: ["suburb_town"])',
    '    state: field(arg: ["state"])',
    '    postal_code: field(arg: ["postal_code"])',
    '    unit_number: field(arg: ["unit_number"])',
    '    property_type: field(arg: ["property_type"])',
    '    building_type: field(arg: ["building_type"])',
    '    owner_type: field(arg: ["owner_type"])',
    '    foundation_type: field(arg: ["foundation_type"])',
    '    stories: field(arg: ["stories"])',
    '    building_age: field(arg: ["building_age"])',
    '    manhole: field(arg: ["manhole"])',
    '    bedrooms: field(arg: ["bedrooms"])',
    '    building_features: field(arg: ["building_features_options_as_text"])',
    '    quadrant: field(arg: ["quadrant"])',
    '    last_rodent_job: field(arg: ["last_rodent_job"]) @dateFormat(value: "YYYY-MM-DD")',
    '    last_rodent_job_rate: field(arg: ["last_rodent_job_rate"])',
    '    last_gutter_job: field(arg: ["last_gutter_job"]) @dateFormat(value: "YYYY-MM-DD")',
    '    last_gutter_job_price: field(arg: ["last_gutter_job_price"])',
    '  }',
    '}',
  ].join('\n');

  // ── Service Provider Detail ──────────────────────────────────────────────

  var SP_DETAIL_QUERY = [
    'query calcServiceProviders($id: PeterpmServiceProviderID!) {',
    '  calcServiceProviders(query: [{ where: { id: $id } }]) {',
    '    id: field(arg: ["id"])',
    '    first_name: field(arg: ["Contact_Information", "first_name"])',
    '    last_name_raw: field(arg: ["Contact_Information", "last_name"])',
    '    name: field(arg: ["Contact_Information", "first_name"])',
    '    last_name: field(arg: ["Contact_Information", "last_name"])',
    '    mobile_number: field(arg: ["mobile_number"])',
    '    work_email: field(arg: ["work_email"])',
    '    status: field(arg: ["status"])',
    '    workload_capacity: field(arg: ["workload_capacity"])',
    '    job_rate_percentage: field(arg: ["job_rate_percentage"])',
    '    gst_registered: field(arg: ["gst_registered"])',
    '    license_number: field(arg: ["license_number"])',
    '    jobs_in_progress: field(arg: ["jobs_in_progress"])',
    '    completed_jobs_last_30_days: field(arg: ["completed_jobs_last_30_days"])',
    '    new_jobs_last_30_days: field(arg: ["new_jobs_last_30_days"])',
    '    call_backs_last_30_days: field(arg: ["call_backs_last_30_days"])',
    '  }',
    '}',
  ].join('\n');

  // ── Service Record ───────────────────────────────────────────────────────

  var SERVICE_DETAIL_QUERY = [
    'query calcServices($id: PeterpmServiceID!) {',
    '  calcServices(query: [{ where: { id: $id } }]) {',
    '    id: field(arg: ["id"])',
    '    service_name: field(arg: ["service_name"])',
    '    service_type: field(arg: ["service_type"])',
    '    service_price: field(arg: ["service_price"])',
    '    service_description: field(arg: ["service_description"])',
    '    standard_warranty: field(arg: ["standard_warranty"])',
    '  }',
    '}',
  ].join('\n');

  // ── Activities (by job ID) ───────────────────────────────────────────────

  var ACTIVITIES_QUERY = [
    'query calcActivities($job_id: PeterpmJobID!) {',
    '  calcActivities(query: [{ where: { Job_id: $job_id } }], orderBy: [{ path: ["task"], type: asc }]) {',
    '    id: field(arg: ["id"])',
    '    task: field(arg: ["task"])',
    '    option: field(arg: ["option"])',
    '    activity_text: field(arg: ["activity_text"])',
    '    quoted_text: field(arg: ["quoted_text"])',
    '    quantity: field(arg: ["quantity"])',
    '    activity_price: field(arg: ["activity_price"])',
    '    quoted_price: field(arg: ["quoted_price"])',
    '    activity_status: field(arg: ["activity_status"])',
    '    quote_accepted: field(arg: ["quote_accepted"])',
    '    include_in_quote: field(arg: ["include_in_quote"])',
    '    include_in_quote_subtotal: field(arg: ["include_in_quote_subtotal"])',
    '    invoice_to_client: field(arg: ["invoice_to_client"])',
    '    warranty: field(arg: ["warranty"])',
    '    note: field(arg: ["note"])',
    '    mark_complete: field(arg: ["mark_complete"])',
    '    date_completed: field(arg: ["date_completed"]) @dateFormat(value: "YYYY-MM-DD")',
    '    service_name: field(arg: ["Service", "service_name"])',
    '    service_id: field(arg: ["service_id"])',
    '  }',
    '}',
  ].join('\n');

  // ── Materials (by job ID) ────────────────────────────────────────────────

  var MATERIALS_QUERY = [
    'query calcMaterials($job_id: PeterpmJobID!) {',
    '  calcMaterials(query: [{ where: { Job_id: $job_id } }]) {',
    '    id: field(arg: ["id"])',
    '    material_name: field(arg: ["material_name"])',
    '    description: field(arg: ["description"])',
    '    total: field(arg: ["total"])',
    '    status: field(arg: ["status"])',
    '    transaction_type: field(arg: ["transaction_type"])',
    '    receipt: field(arg: ["receipt"])',
    '    service_provider_id: field(arg: ["service_provider_id"])',
    '  }',
    '}',
  ].join('\n');

  // ── Tasks (by job or deal ID) ────────────────────────────────────────────

  var TASKS_BY_JOB_QUERY = [
    'query calcTasks($Job_id: PeterpmJobID!) {',
    '  calcTasks(query: [{ where: { Job_id: $Job_id } }]) {',
    '    id: field(arg: ["id"])',
    '    subject: field(arg: ["subject"])',
    '    details: field(arg: ["details"])',
    '    status: field(arg: ["status"])',
    '    date_due: field(arg: ["date_due"])',
    '    date_complete: field(arg: ["date_complete"])',
    '    assignee_name: field(arg: ["Assignee", "first_name"])',
    '  }',
    '}',
  ].join('\n');

  var TASKS_BY_DEAL_QUERY = [
    'query calcTasks($Deal_id: PeterpmDealID!) {',
    '  calcTasks(query: [{ where: { Deal_id: $Deal_id } }]) {',
    '    id: field(arg: ["id"])',
    '    subject: field(arg: ["subject"])',
    '    details: field(arg: ["details"])',
    '    status: field(arg: ["status"])',
    '    date_due: field(arg: ["date_due"])',
    '    date_complete: field(arg: ["date_complete"])',
    '    assignee_name: field(arg: ["Assignee", "first_name"])',
    '  }',
    '}',
  ].join('\n');

  var TASK_OUTCOMES_QUERY = [
    'query calcTaskOutcomes {',
    '  calcTaskOutcomes {',
    '    id: field(arg: ["id"])',
    '    name: field(arg: ["name"])',
    '  }',
    '}',
  ].join('\n');

  // ── Notes (polymorphic) ──────────────────────────────────────────────────

  var NOTES_BY_JOB_QUERY = [
    'query calcNotes($Job_id: PeterpmJobID!) {',
    '  calcNotes(query: [{ where: { Job_id: $Job_id } }], orderBy: [{ path: ["created_at"], type: desc }]) {',
    '    id: field(arg: ["id"])',
    '    note: field(arg: ["note"])',
    '    type: field(arg: ["type"])',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY HH:mm")',
    '    author: field(arg: ["Author", "first_name"])',
    '  }',
    '}',
  ].join('\n');

  var NOTES_BY_DEAL_QUERY = [
    'query calcNotes($Deal_id: PeterpmDealID!) {',
    '  calcNotes(query: [{ where: { Deal_id: $Deal_id } }], orderBy: [{ path: ["created_at"], type: desc }]) {',
    '    id: field(arg: ["id"])',
    '    note: field(arg: ["note"])',
    '    type: field(arg: ["type"])',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY HH:mm")',
    '    author: field(arg: ["Author", "first_name"])',
    '  }',
    '}',
  ].join('\n');

  // ── Uploads ──────────────────────────────────────────────────────────────

  var UPLOADS_BY_JOB_QUERY = [
    'query calcUploads($job_id: PeterpmJobID!) {',
    '  calcUploads(query: [{ where: { Job_id: $job_id } }], orderBy: [{ path: ["created_at"], type: desc }]) {',
    '    id: field(arg: ["id"])',
    '    type: field(arg: ["type"])',
    '    file_name: field(arg: ["file_name"])',
    '    photo_name: field(arg: ["photo_name"])',
    '    form_name: field(arg: ["form_name"])',
    '    file_upload: field(arg: ["file_upload"])',
    '    photo_upload: field(arg: ["photo_upload"])',
    '    customer_can_view: field(arg: ["customer_can_view"])',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY")',
    '  }',
    '}',
  ].join('\n');

  var UPLOADS_BY_DEAL_QUERY = [
    'query calcUploads($inquiry_id: PeterpmDealID!) {',
    '  calcUploads(query: [{ where: { Inquiry_id: $inquiry_id } }], orderBy: [{ path: ["created_at"], type: desc }]) {',
    '    id: field(arg: ["id"])',
    '    type: field(arg: ["type"])',
    '    file_name: field(arg: ["file_name"])',
    '    photo_name: field(arg: ["photo_name"])',
    '    form_name: field(arg: ["form_name"])',
    '    file_upload: field(arg: ["file_upload"])',
    '    photo_upload: field(arg: ["photo_upload"])',
    '    customer_can_view: field(arg: ["customer_can_view"])',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY")',
    '  }',
    '}',
  ].join('\n');

  // ── Appointments ─────────────────────────────────────────────────────────

  var APPOINTMENTS_BY_JOB_QUERY = [
    'query calcAppointments($job_id: PeterpmJobID!) {',
    '  calcAppointments(query: [{ where: { Job_id: $job_id } }], orderBy: [{ path: ["start_time"], type: desc }]) {',
    '    id: field(arg: ["id"])',
    '    title: field(arg: ["title"])',
    '    status: field(arg: ["status"])',
    '    type: field(arg: ["type"])',
    '    start_time: field(arg: ["start_time"]) @dateFormat(value: "YYYY-MM-DD HH:mm")',
    '    end_time: field(arg: ["end_time"]) @dateFormat(value: "YYYY-MM-DD HH:mm")',
    '    duration_hours: field(arg: ["duration_hours"])',
    '    host: field(arg: ["Host", "first_name"])',
    '  }',
    '}',
  ].join('\n');

  var APPOINTMENTS_BY_DEAL_QUERY = [
    'query calcAppointments($inquiry_id: PeterpmDealID!) {',
    '  calcAppointments(query: [{ where: { Inquiry_id: $inquiry_id } }], orderBy: [{ path: ["start_time"], type: desc }]) {',
    '    id: field(arg: ["id"])',
    '    title: field(arg: ["title"])',
    '    status: field(arg: ["status"])',
    '    type: field(arg: ["type"])',
    '    start_time: field(arg: ["start_time"]) @dateFormat(value: "YYYY-MM-DD HH:mm")',
    '    end_time: field(arg: ["end_time"]) @dateFormat(value: "YYYY-MM-DD HH:mm")',
    '    duration_hours: field(arg: ["duration_hours"])',
    '    host: field(arg: ["Host", "first_name"])',
    '  }',
    '}',
  ].join('\n');

  // ── Affiliations (Property Contacts) ─────────────────────────────────────

  var AFFILIATIONS_BY_PROPERTY_QUERY = [
    'query calcAffiliations($property_id: PeterpmPropertyID!) {',
    '  calcAffiliations(query: [{ where: { Property_id: $property_id } }]) {',
    '    id: field(arg: ["id"])',
    '    role: field(arg: ["role"])',
    '    contact_name: field(arg: ["Contact", "first_name"])',
    '    contact_last_name: field(arg: ["Contact", "last_name"])',
    '    contact_phone: field(arg: ["Contact", "sms_number"])',
    '    contact_email: field(arg: ["Contact", "email"])',
    '    primary_owner_contact: field(arg: ["primary_owner_contact"])',
    '    primary_resident_contact: field(arg: ["primary_resident_contact"])',
    '    primary_property_manager_contact: field(arg: ["primary_property_manager_contact"])',
    '  }',
    '}',
  ].join('\n');

  // ── SP Views ─────────────────────────────────────────────────────────────

  var SP_VIEWS_QUERY = [
    'query calcSPViews($deal_id: PeterpmDealID!) {',
    '  calcOServiceProviderWhoViewedThisDeals(query: [{ where: { Deal_Viewed_By_This_Service_Provider_id: $deal_id } }]) {',
    '    id: field(arg: ["id"])',
    '    sp_name: field(arg: ["Service_Provider_Who_Viewed_Deal", "Contact_Information", "first_name"])',
    '    sp_last_name: field(arg: ["Service_Provider_Who_Viewed_Deal", "Contact_Information", "last_name"])',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY HH:mm")',
    '  }',
    '}',
  ].join('\n');

  // ── Ontraport list options (ID -> label) ─────────────────────────────────

  function listFieldOptionsQuery(objectId, fieldId) {
    return [
      'query calcOntraportListFieldOptions {',
      '  calcOntraportListFieldOptions(',
      '    query: [',
      '      { where: { objectId: "' + escGQL(objectId) + '" } }',
      '      { andWhere: { fieldId: "' + escGQL(fieldId) + '" } }',
      '    ]',
      '  ) {',
      '    id: field(arg: ["id"])',
      '    name: field(arg: ["name"])',
      '    option_object_id: field(arg: ["objectId"])',
      '    option_field_id: field(arg: ["fieldId"])',
      '  }',
      '}',
    ].join('\n');
  }

  // ── Forum Posts (Memos) — subscription-based ─────────────────────────────

  var FORUM_POSTS_QUERY = [
    'query calcForumPosts($inquiry_id: PeterpmDealID, $job_id: PeterpmJobID) {',
    '  calcForumPosts(',
    '    query: [',
    '      { where: { related_inquiry_id: $inquiry_id } }',
    '      { orWhere: { related_job_id: $job_id } }',
    '    ]',
    '    orderBy: [{ path: ["created_at"], type: asc }]',
    '  ) {',
    '    id: field(arg: ["id"])',
    '    post_copy: field(arg: ["post_copy"])',
    '    post_status: field(arg: ["post_status"])',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY HH:mm")',
    '    author_first: field(arg: ["Author", "first_name"])',
    '    author_last: field(arg: ["Author", "last_name"])',
    '    author_display: field(arg: ["Author", "display_name"])',
    '  }',
    '}',
  ].join('\n');

  // ── Related Inquiries (by job inquiry_record_id) ─────────────────────────

  var INQUIRIES_FOR_JOB_QUERY = [
    'query calcDeals($job_id: PeterpmJobID!) {',
    '  calcDeals(query: [{ where: { quote_record_id: $job_id } }]) {',
    '    id: field(arg: ["id"])',
    '    unique_id: field(arg: ["unique_id"])',
    '    deal_name: field(arg: ["deal_name"])',
    '    inquiry_status: field(arg: ["inquiry_status"])',
    '    type: field(arg: ["type"])',
    '    created_at: field(arg: ["created_at"]) @dateFormat(value: "DD/MM/YYYY")',
    '  }',
    '}',
  ].join('\n');

  // ── Linked Job (by ID) ───────────────────────────────────────────────────

  var JOB_SUMMARY_QUERY = [
    'query calcJobs($id: PeterpmJobID!) {',
    '  calcJobs(query: [{ where: { id: $id } }]) {',
    '    id: field(arg: ["id"])',
    '    unique_id: field(arg: ["unique_id"])',
    '    property_id: field(arg: ["property_id"])',
    '    quote_status: field(arg: ["quote_status"])',
    '    job_status: field(arg: ["job_status"])',
    '    payment_status: field(arg: ["payment_status"])',
    '    quote_total: field(arg: ["quote_total"])',
    '    job_total: field(arg: ["job_total"])',
    '    invoice_number: field(arg: ["invoice_number"])',
    '  }',
    '}',
  ].join('\n');

  // ── Callback Jobs (jobs where past_job_id = current job) ─────────────────

  var CALLBACK_JOBS_QUERY = [
    'query calcJobs($past_job_id: PeterpmJobID!) {',
    '  calcJobs(query: [{ where: { past_job_id: $past_job_id } }]) {',
    '    id: field(arg: ["id"])',
    '    unique_id: field(arg: ["unique_id"])',
    '    job_status: field(arg: ["job_status"])',
    '    payment_status: field(arg: ["payment_status"])',
    '    job_total: field(arg: ["job_total"])',
    '    date_scheduled: field(arg: ["date_scheduled"]) @dateFormat(value: "YYYY-MM-DD")',
    '    date_completed: field(arg: ["date_completed"]) @dateFormat(value: "YYYY-MM-DD")',
    '  }',
    '}',
  ].join('\n');

  // ── Mutations ────────────────────────────────────────────────────────────

  var MUTATIONS = {
    updateDeal: 'mutation updateDeal($id: PeterpmDealID!, $payload: DealUpdateInput = null) { updateDeal(query: [{ where: { id: $id } }], payload: $payload) { id inquiry_status sales_stage } }',
    updateJob: 'mutation updateJob($id: PeterpmJobID!, $payload: JobUpdateInput = null) { updateJob(query: [{ where: { id: $id } }], payload: $payload) { id job_status quote_status payment_status } }',
    updateTask: 'mutation updateTask($id: PeterpmTaskID!, $payload: TaskUpdateInput = null) { updateTask(query: [{ where: { id: $id } }], payload: $payload) { id subject details status date_due date_complete } }',
    createForumPost: 'mutation createForumPost($payload: ForumPostCreateInput = null) { createForumPost(payload: $payload) { id post_copy author_id } }',
    createForumComment: 'mutation createForumComment($payload: ForumCommentCreateInput = null) { createForumComment(payload: $payload) { id comment author_id } }',
    createTask: 'mutation createTask($payload: TaskCreateInput = null) { createTask(payload: $payload) { id subject details status date_due date_complete } }',
    createNote: 'mutation createNote($payload: NoteCreateInput = null) { createNote(payload: $payload) { id note } }',
    createUpload: 'mutation createUpload($payload: UploadCreateInput = null) { createUpload(payload: $payload) { id } }',
    createActivity: 'mutation createActivity($payload: ActivityCreateInput = null) { createActivity(payload: $payload) { id task activity_price } }',
    updateActivity: 'mutation updateActivity($id: PeterpmActivityID!, $payload: ActivityUpdateInput = null) { updateActivity(query: [{ where: { id: $id } }], payload: $payload) { id } }',
    deleteActivity: 'mutation deleteActivity($id: PeterpmActivityID!) { deleteActivity(query: [{ where: { id: $id } }]) { id } }',
    createMaterial: 'mutation createMaterial($payload: MaterialCreateInput = null) { createMaterial(payload: $payload) { id material_name } }',
    updateMaterial: 'mutation updateMaterial($id: PeterpmMaterialID!, $payload: MaterialUpdateInput = null) { updateMaterial(query: [{ where: { id: $id } }], payload: $payload) { id } }',
    createAppointment: 'mutation createAppointment($payload: AppointmentCreateInput = null) { createAppointment(payload: $payload) { id title } }',
  };

  // ── High-level fetch functions ───────────────────────────────────────────

  function fetchInquiryDetail(id) { return gqlFetch(INQUIRY_DETAIL_QUERY, { id: Number(id) }).then(firstRecord); }
  function fetchJobDetail(id) { return gqlFetch(JOB_DETAIL_QUERY, { id: Number(id) }).then(firstRecord); }
  function fetchContact(id) { return gqlFetch(CONTACT_DETAIL_QUERY, { id: Number(id) }).then(firstRecord); }
  function fetchCompany(id) { return gqlFetch(COMPANY_DETAIL_QUERY, { id: Number(id) }).then(firstRecord); }
  function fetchProperty(id) { return gqlFetch(PROPERTY_DETAIL_QUERY, { id: Number(id) }).then(firstRecord); }
  function fetchServiceProvider(id) { return gqlFetch(SP_DETAIL_QUERY, { id: Number(id) }).then(firstRecord); }
  function fetchService(id) { return gqlFetch(SERVICE_DETAIL_QUERY, { id: Number(id) }).then(firstRecord); }
  function fetchActivities(jobId) { return gqlFetch(ACTIVITIES_QUERY, { job_id: Number(jobId) }).then(allRecords); }
  function fetchMaterials(jobId) { return gqlFetch(MATERIALS_QUERY, { job_id: Number(jobId) }).then(allRecords); }
  function fetchTasksByJob(jobId) { return gqlFetch(TASKS_BY_JOB_QUERY, { Job_id: Number(jobId) }).then(allRecords); }
  function fetchTasksByDeal(dealId) { return gqlFetch(TASKS_BY_DEAL_QUERY, { Deal_id: Number(dealId) }).then(allRecords); }
  function fetchTaskOutcomes() { return gqlFetch(TASK_OUTCOMES_QUERY, {}).then(allRecords); }
  function fetchNotesByJob(jobId) { return gqlFetch(NOTES_BY_JOB_QUERY, { Job_id: Number(jobId) }).then(allRecords); }
  function fetchNotesByDeal(dealId) { return gqlFetch(NOTES_BY_DEAL_QUERY, { Deal_id: Number(dealId) }).then(allRecords); }
  function fetchUploadsByJob(jobId) { return gqlFetch(UPLOADS_BY_JOB_QUERY, { job_id: Number(jobId) }).then(allRecords); }
  function fetchUploadsByDeal(dealId) { return gqlFetch(UPLOADS_BY_DEAL_QUERY, { inquiry_id: Number(dealId) }).then(allRecords); }
  function fetchAppointmentsByJob(jobId) { return gqlFetch(APPOINTMENTS_BY_JOB_QUERY, { job_id: Number(jobId) }).then(allRecords); }
  function fetchAppointmentsByDeal(dealId) { return gqlFetch(APPOINTMENTS_BY_DEAL_QUERY, { inquiry_id: Number(dealId) }).then(allRecords); }
  function fetchAffiliations(propertyId) { return gqlFetch(AFFILIATIONS_BY_PROPERTY_QUERY, { property_id: Number(propertyId) }).then(allRecords); }
  function fetchSPViews(dealId) { return gqlFetch(SP_VIEWS_QUERY, { deal_id: Number(dealId) }).then(allRecords); }
  function fetchOntraportListFieldOptions(objectId, fieldId) { return gqlFetch(listFieldOptionsQuery(objectId, fieldId), {}).then(allRecords); }
  function fetchForumPosts(inquiryId, jobId) { return gqlFetch(FORUM_POSTS_QUERY, { inquiry_id: inquiryId ? Number(inquiryId) : null, job_id: jobId ? Number(jobId) : null }).then(allRecords); }
  function fetchInquiriesForJob(jobId) { return gqlFetch(INQUIRIES_FOR_JOB_QUERY, { job_id: Number(jobId) }).then(allRecords); }
  function fetchJobSummary(jobId) { return gqlFetch(JOB_SUMMARY_QUERY, { id: Number(jobId) }).then(firstRecord); }
  function fetchCallbackJobs(jobId) { return gqlFetch(CALLBACK_JOBS_QUERY, { past_job_id: Number(jobId) }).then(allRecords); }

  /** Run a mutation */
  function mutate(name, variables) {
    var q = MUTATIONS[name];
    if (!q) return Promise.reject(new Error('Unknown mutation: ' + name));
    return gqlFetch(q, variables);
  }

  // ── Export ────────────────────────────────────────────────────────────────

  window.PtpmQueries = {
    gqlFetch: gqlFetch,
    mutate: mutate,
    // Primary records
    fetchInquiryDetail: fetchInquiryDetail,
    fetchJobDetail: fetchJobDetail,
    fetchContact: fetchContact,
    fetchCompany: fetchCompany,
    fetchProperty: fetchProperty,
    fetchServiceProvider: fetchServiceProvider,
    fetchService: fetchService,
    // Child collections
    fetchActivities: fetchActivities,
    fetchMaterials: fetchMaterials,
    fetchTasksByJob: fetchTasksByJob,
    fetchTasksByDeal: fetchTasksByDeal,
    fetchTaskOutcomes: fetchTaskOutcomes,
    fetchNotesByJob: fetchNotesByJob,
    fetchNotesByDeal: fetchNotesByDeal,
    fetchUploadsByJob: fetchUploadsByJob,
    fetchUploadsByDeal: fetchUploadsByDeal,
    fetchAppointmentsByJob: fetchAppointmentsByJob,
    fetchAppointmentsByDeal: fetchAppointmentsByDeal,
    fetchAffiliations: fetchAffiliations,
    fetchSPViews: fetchSPViews,
    fetchOntraportListFieldOptions: fetchOntraportListFieldOptions,
    fetchForumPosts: fetchForumPosts,
    fetchInquiriesForJob: fetchInquiriesForJob,
    fetchJobSummary: fetchJobSummary,
    fetchCallbackJobs: fetchCallbackJobs,
  };
})();
