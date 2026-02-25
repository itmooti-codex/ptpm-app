import { useState, useEffect, useCallback, useRef } from "react";

// ─── EXPANDED MOCK DATA ─────────────────────────────────────────────────────
const MOCK = {
  inquiry: {
    id: 4821, unique_id: "INQ-4821",
    deal_name: "Vernon — Ceiling Vacuum, Newmarket",
    inquiry_status: "Quote Created", sales_stage: "Qualified Prospect",
    type: "Service Request or Quote", inquiry_source: "Phone Call",
    how_did_you_hear: "Google", service_type: "Ceiling Vacuum",
    deal_size: "Medium", expected_close_timeframe: "14 - 30 days",
    call_back: false,
    inquiry_for_job_id: null, // null = fresh inquiry, set = inquiry related to existing job
    service_inquiry_id: 2, // links to Service record
    how_can_we_help: "Customer reports hearing scratching and thumping in the ceiling at night. Has been going on for about 2 weeks. Needs someone to come out and inspect. Stephen to meet onsite, call to arrange.",
    admin_notes: "##ACCESS TO GARAGE BEST BETWEEN 19 & 25 BADGER ST##\n*Susans sisters house across road from office* Stephen to meet onsite, call Stephen to arrange.\n28/8 Changed to 09/09.\n28/8 Booked Fri 06/09 (Pending Stephens reply).\n22/8 Emailed ACCEPTANCE, pls goahead.\n14/8 Please arrange to remove old insulation batts and ceiling vacuum converted into freestanding single garage.",
    client_notes: "Returning customer — last job was possum proofing in 2022. Prefers morning appointments.",
    date_job_required_by: "2024-09-15", created_at: "2024-08-14",
    expected_close_date: "2024-09-30", account_type: "Contact",
    noise_signs: ["Scratching", "Thumping", "Heavy", "Can hear coming & going"],
    pest_location: ["Upper Ceiling", "Between floors"],
    pest_active_times: ["Night", "Dusk & Dawn"],
    renovations: "None",
    resident_availability: "Stephen to meet onsite — call to arrange. Best mornings.",
    quote_record_id: 9034, service_provider_id: 12, open_tasks: 2,
    return_inquiry_to_admin: false, inquiry_return_reason: "",
  },
  property: {
    id: 2201, address_1: "66 Edmondstone Street", address_2: "",
    suburb_town: "NEWMARKET", state: "QLD", postal_code: "4051",
    unit_number: "", lot_number: "", property_name: "",
    property_type: "Residential", building_type: "House",
    owner_type: "Owner Occupier", stories: 1, building_age: "1960s",
    foundation_type: "Highset", manhole: true, bedrooms: "3",
    building_features: ["Queenslander", "Wood", "Iron Roof", "Highset"],
    quadrant: "North", building_complex_id: null,
    last_gutter_job: null, last_gutter_job_price: null,
    last_rodent_job: "2022-03-15", last_rodent_job_rate: 450.00,
    owner_company_id: null, individual_owner_id: 3301,
    primary_owner_contact_for_property_id: 101,
    primary_resident_contact_for_property_id: 102,
    primary_property_manager_contact_for_property_id: null,
  },
  propertyContacts: [
    { id: 101, role: "Primary Owner", contact_name: "Kim Vernon", phone: "0412 629 685", email: "kim@email.com", is_primary: true },
    { id: 102, role: "Primary Resident", contact_name: "Stephen Vernon", phone: "0412 629 685", email: "stephen@email.com", is_primary: true },
  ],
  contact: {
    id: 3301, first_name: "Kim", last_name: "Vernon",
    email: "info@possumman.com.au", sms_number: "0412 629 685",
    office_phone: "", address: "66 Edmondstone St", city: "Newmarket",
    state: "QLD", zip_code: "4051",
    popup_comment: "**REFER TO SK**SV WROTE OFF INVOICE.",
    how_referred: "Google", xero_contact_id: "xero_abc123",
    inquiring_as: "Individual",
  },
  // Company scenario mock (used when account_type = "Company")
  company: {
    id: 501, name: "Northside Body Corp Management",
    phone: "07 3123 4567", address: "100 Eagle St", city: "Brisbane",
    state: "QLD", postal_code: "4000", account_type: "Body Corp Company",
    body_corporate_company_id: 500, // parent BC
    popup_comment: "",
    primary_person_id: 3301, // primary contact
    accounts_contact_id: 201, // affiliation for billing
    xero_contact_id: "xero_corp_456",
    industry: "Real Estate",
  },
  bodyCorpParent: {
    id: 500, name: "Northside Body Corporate",
    account_type: "Body Corp",
    child_companies: [
      { id: 501, name: "Northside Body Corp Management", account_type: "Body Corp Company" },
      { id: 502, name: "Southside Property Services", account_type: "Body Corp Company" },
      { id: 503, name: "CBD Strata Management", account_type: "Body Corp Company" },
    ],
  },
  serviceProvider: {
    id: 12, name: "Shane L", mobile_number: "0499 123 456",
    work_email: "shane@ptpm.com.au", status: "Active",
    workload_capacity: "OKAY", job_rate_percentage: 55,
    type: "Service Provider", gst_registered: true,
    license_number: "PMT-2019-0423",
    jobs_in_progress: "3", completed_jobs_last_30_days: "12",
    new_jobs_last_30_days: "5", call_backs_last_30_days: "1",
  },
  serviceRecord: {
    id: 2, service_name: "Ceiling Vacuum", service_type: "Primary",
    service_price: 450.00, service_description: "Full ceiling vacuum including removal of old insulation and debris.",
    standard_warranty: "12 months workmanship warranty",
  },
  job: {
    id: 9034, unique_id: "JOB-9034",
    job_type: "Inspection", priority: "Medium",
    quote_status: "Accepted", job_status: "Completed", payment_status: "Paid",
    quote_date: "2024-08-22", follow_up_date: "2024-08-20",
    date_quote_sent: "2024-10-29", date_quoted_accepted: "2024-08-22",
    quote_valid_until: "2024-09-22",
    quote_total: 1150.00, quote_gst: 104.55,
    quoted_activities_subtotal: "1150.00",
    quote_variation_type: null, quote_variation_price: 0, quote_variation_text: "",
    job_total: 1150.00, job_gst: 104.55,
    job_variation_type: null, job_variation_price: 0, job_variation_text: "",
    invoice_number: "20094", invoice_total: 1150.00, invoice_date: "2024-09-09",
    due_date: "2024-09-23", payment_method: "Invoice",
    xero_invoice_status: "Paid", invoice_url_admin: "#", invoice_url_client: "#",
    Part_Payment_Made: 0, send_to_contact: true,
    date_completed: "2024-09-09", date_booked: "2024-08-22",
    date_scheduled: "2024-09-09", date_started: "2024-09-09",
    date_cancelled: null,
    bill_total: 632.50, bill_gst: 57.50,
    bill_batch_id: "BATCH-2024-W37", bill_batch_week: 37, bill_batch_date: "2024-09-13",
    bill_date: "2024-09-13", bill_due_date: "2024-09-27",
    xero_bill_status: "Paid", bill_approved_admin: true, bill_approved_service_provider: true,
    return_job_to_admin: false,
    prestart_done: true, pca_done: true, mark_complete: true,
    signature: "signature_url_placeholder",
    terms_and_conditions_accepted: true,
    possum_number: 0, turkey_number: 0, possum_comment: "", turkey_comment: "", turkey_release_site: "",
    admin_recommendation: "##ACCESS TO GARAGE BEST BETWEEN 19 & 25 BADGER ST##",
    follow_up_comment: "All clear, customer happy with result.",
    location_name: "Upper Ceiling",
    noise_signs: ["Scratching", "Thumping"],
    feedback_status: "Completed", rating: "5", feedback_text: "Excellent job, very professional.",
    account_type: "Contact", property_id: 2201, client_individual_id: 3301,
    client_entity_id: null, accounts_contact_id: null,
    primary_service_provider_id: 12, inquiry_record_id: 4821,
    past_job_id: 8901, duplicate_job: false, job_call_backs: "1",
    create_a_callback: false,
    materials_total: "180.00", deduct_total: "180.00", reimburse_total: "0.00",
  },
  pastJob: {
    id: 8901, unique_id: "JOB-8901", job_status: "Completed", payment_status: "Paid",
    job_total: 450.00, date_completed: "2022-03-15",
    description: "Possum proofing — original job",
  },
  callbackJobs: [
    { id: 9120, unique_id: "JOB-9120", job_status: "Scheduled", payment_status: "Invoice Required", job_total: 0, date_scheduled: "2024-12-10", description: "42 day possum check — callback from JOB-9034" },
  ],
  // Real quote data parsed from actual PDFs — 7 quote examples
  realQuotes: {
    Q6729: {
      quote_number: "Q6729", quote_date: "2024-09-02", serviceman: "Stephen",
      customer: "Test It Mooti", job_address: "tba tba, Red Hill 4059",
      has_options: false, has_sections: false,
      total_inc_gst: 594.00, gst: 54.00,
      service_periods: [{ type: "Proofing", months: 12, applies_to: "Possum proofing" }],
      items: [
        { id: 1, task: "Job 1", option: null, section: null, description: "Possum proofing to roof area to prevent re-entry and removal of any trapped possums", price: 594, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: "12 months free service period", invoice: false },
      ]
    },
    Q6925: {
      quote_number: "Q6925", quote_date: "2024-09-30", serviceman: "Craig & Sabine",
      customer: "Mandeep Singh / Ray White Aspley", attention: "Siobhan Kerin", reference: "2409056108",
      job_address: "24 Dubarda Drive, Strathpine",
      has_options: false, has_sections: false,
      total_inc_gst: 1045.00, gst: 95.00,
      service_periods: [{ type: "Proofing", months: 12, applies_to: "Possum proofing" }, { type: "Treatment", months: 3, applies_to: "Rodent control" }],
      notes: ["##NOTE: Stored items under stairs area will need to be moved for work to be carried out to this area."],
      items: [
        { id: 1, task: "Job 1", option: null, section: null, description: "Possum proofing to roof overhang at rear and to areas between floors to prevent re-entry. One way doors to remove any trapped possums.", price: 693, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: "12 months free service period", invoice: false },
        { id: 2, task: "Job 2", option: null, section: null, description: "Supply and install 4 lockable rodent bait stations with Racumin due to dog on site", price: 352, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: "3 months free service period", invoice: false },
      ]
    },
    Q6833: {
      quote_number: "Q6833", quote_date: "2024-09-17", serviceman: "Glen C",
      customer: "The Owner / Ray White Commercial", attention: "Gabby Goodwin",
      job_address: "176 Glebe Street, Booval",
      has_options: false, has_sections: true,
      total_inc_gst: null, gst: null,
      total_note: "Two separate sections priced independently",
      service_periods: [{ type: "Proofing", months: 12, applies_to: "Solar panel bird proofing" }],
      sections: [
        { id: "quote_a", label: "Quote A — Café half of building", total: 1620 },
        { id: "quote_b", label: "Quote B — Shops end of building", total: 1854 },
      ],
      items: [
        { id: 1, task: "Job 1", option: null, section: "quote_a", description: "Install UV coated stainless steel mesh proofing to perimeter of all Café solar panels. O to get roof and under panels cleaned before work.", price: null, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: "12 months free service period", invoice: false },
        { id: 2, task: "Job 2", option: null, section: "quote_a", description: "Graining treatment over 3 days to REDUCE pigeon population and collect dead birds. *If pigeons persist further control may be required at additional cost.", price: null, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 3, task: "Job 1", option: null, section: "quote_b", description: "Install UV coated stainless steel mesh proofing to perimeter of solar panels at Shops end. O to clean roof and under panels before work.", price: null, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: "12 months free service period", invoice: false },
        { id: 4, task: "Job 2", option: null, section: "quote_b", description: "Graining treatment over 3 days to REDUCE pigeon population and collect dead birds. *If pigeons persist further control may be required at additional cost.", price: null, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
      ]
    },
    Q6725: {
      quote_number: "Q6725", quote_date: "2024-08-30", serviceman: "Shane L",
      customer: "Tony Scanlan",
      job_address: "28/12 Bellevue Parade, Taringa 4068",
      has_options: true, has_sections: false,
      total_inc_gst: null, gst: null,
      total_note: "Quote not totalled due to options",
      service_periods: [],
      items: [
        { id: 1, task: "Job 1", option: null, section: null, description: "Remove app. 80m2 of old foil insulation and vacuum app. 120m2 of ceiling", price: 1720, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 2, task: "Job 2", option: "Option 1", section: null, description: "Supply and install app. 120m2 of R4.1 ECOWOOL to ceiling", price: 2660, is_optional: false, option_group: "insulation_type", status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 3, task: "Job 2", option: "Option 2", section: null, description: "Supply and install app. 120m2 of R3.5 POLYESTER batts to ceiling", price: 4240, is_optional: false, option_group: "insulation_type", status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 4, task: "Job 3", option: null, section: null, description: "Supply and install 1x SAV-20 Solar Ark solar roof vent", price: 1100, is_optional: true, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 5, task: "Job 4", option: null, section: null, description: "Install app. 120m2 of customer supplied rockwool insulation to ceiling, each batt laid over 2x trusses minimum", price: 1800, is_optional: true, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
      ]
    },
    Q6874: {
      quote_number: "Q6874", quote_date: "2024-09-23", serviceman: "Shane L",
      customer: "Allan Wesley",
      job_address: "6 Kay Street, Samford Valley 4520",
      has_options: true, has_sections: false,
      total_inc_gst: null, gst: null,
      total_note: "Quote not totalled due to options",
      service_periods: [],
      notes: ["Slightly higher labour rate charge for insulation install due to incorrect truss sizes"],
      items: [
        { id: 1, task: "Job 1", option: null, section: null, description: "Vacuum, remove and dispose all dust and debris from approx 375m2 of ceiling cavity space", price: 4100, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 2, task: "Job 2", option: "Option 1", section: null, description: "Supply and install approx 375m2 of R4.1 ECOWOOL to ceiling cavity", price: 8660, is_optional: false, option_group: "insulation_type", status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 3, task: "Job 2", option: "Option 2", section: null, description: "Supply and install approx 375m2 of R3.5 POLYESTER to ceiling cavity", price: 13720, is_optional: false, option_group: "insulation_type", status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 4, task: "Job 3", option: "Option 1", section: null, description: "Supply and install 2x Solar Ark SAV-20 solar roof vents to roof & 1x SAV-10 to garage", price: 2900, is_optional: true, option_group: "ventilation", status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 5, task: "Job 3", option: "Option 2", section: null, description: "Supply and install 1x Solar Ark SAV-30 solar roof vent to roof & 1x SAV-10 to garage", price: 2200, is_optional: true, option_group: "ventilation", status: "Quoted", accepted: null, warranty: null, invoice: false },
      ]
    },
    Q6855: {
      quote_number: "Q6855", quote_date: "2024-09-19", serviceman: "Shane L",
      customer: "Amanda Berry",
      job_address: "5/43 Bowen Avenue, Albany Creek 4035",
      has_options: true, has_sections: true,
      total_inc_gst: null, gst: null,
      total_note: "Quote not totalled due to options",
      service_periods: [],
      sections: [
        { id: "option_a", label: "Option A — No garage included", total: 5300 },
        { id: "option_b", label: "Option B — Garage included", total: 6140, note: "**Assuming has cool n cosy" },
      ],
      items: [
        { id: 1, task: "Job 1", option: null, section: "option_a", description: "Remove and vacuum app. 96m2 of cool n cosy from ceiling (2 story), dump", price: 2550, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 2, task: "Job 2", option: null, section: "option_a", description: "Supply and install app. 96m2 of R4.1 ECOWOOL to ceiling", price: 2050, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 3, task: "Job 3", option: null, section: "option_a", description: "Supply and install 1x Solar Ark SAV-10 Solar roof vent", price: 700, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 4, task: "Job 1", option: null, section: "option_b", description: "Remove and vacuum app. 114m2 of cool n cosy from ceiling (2 story), dump", price: 3000, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 5, task: "Job 2", option: null, section: "option_b", description: "Supply and install app. 114m2 of R4.1 ECOWOOL to ceiling", price: 2440, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 6, task: "Job 3", option: null, section: "option_b", description: "Supply and install 1x Solar Ark SAV-10 Solar roof vent", price: 700, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
      ]
    },
    Q6828: {
      quote_number: "Q6828", quote_date: "2024-09-16", serviceman: "Shane L",
      customer: "Charlotte Nash-Stewart",
      job_address: "15 Crawford Road, Chelmer 4068",
      has_options: true, has_sections: true,
      total_inc_gst: null, gst: null,
      total_note: "Quote not totalled due to options",
      service_periods: [],
      sections: [
        { id: "part_a", label: "Part A — Standard Ceiling" },
        { id: "part_b", label: "Part B — Gable Ceiling" },
      ],
      items: [
        { id: 1, task: "Job 1", option: "Option 1", section: "part_a", description: "Vacuum, remove and dispose approx 108m2 of old foil insulation from ceiling cavity", price: 1980, is_optional: false, option_group: "removal_method", status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 2, task: "Job 1", option: "Option 2", section: "part_a", description: "Remove and dispose approx 108m2 of old foil insulation from ceiling cavity (no vacuum)", price: 910, is_optional: false, option_group: "removal_method", status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 3, task: "Job 2", option: null, section: "part_a", description: "Supply and install approx 108m2 of R4.1 ECOWOOL to ceiling space", price: 2370, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 4, task: "Job 1", option: null, section: "part_b", description: "Remove and relay minimum 9x roof sheets for access. *New screws provided if required.", price: 800, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 5, task: "Job 2", option: null, section: "part_b", description: "Vacuum, remove and dispose approx 32m2 of old foil insulation (if present)", price: 600, is_optional: true, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
        { id: 6, task: "Job 3", option: null, section: "part_b", description: "Supply and install approx 32m2 of R2.0 ECOWOOL to ceiling space", price: 600, is_optional: false, option_group: null, status: "Quoted", accepted: null, warranty: null, invoice: false },
      ]
    },
  },
  activities: [
    // Default activities for the main Job view (legacy format for compatibility)
    { id: 1, task: "Job 1", option: null, service_id: 2, service_name: "Ceiling Vacuum — Insulation Removal", quoted_text: "Remove app. 25m2 of old insulation batts and vacuum ceiling", quoted_price: 620, activity_price: 620, activity_status: "Completed", quote_accepted: true, include_in_quote: true, include_in_quote_subtotal: true, invoice_to_client: true, warranty: "12 month warranty on workmanship", mark_complete: true, note: "", date_completed: "2024-09-09", quantity: 1 },
    { id: 2, task: "Job 2", option: null, service_id: 3, service_name: "Insulation Install — R4.1 ECOWOOL", quoted_text: "Supply and install app. 25m2 of R4.1 ECOWOOL to ceiling", quoted_price: 530, activity_price: 530, activity_status: "Completed", quote_accepted: true, include_in_quote: true, include_in_quote_subtotal: true, invoice_to_client: true, warranty: "Lifetime product warranty", mark_complete: true, note: "Customer chose ECOWOOL over Knauf", date_completed: "2024-09-09", quantity: 1 },
  ],
  materials: [
    { id: 1, material_name: "R4.1 ECOWOOL 12kg bags x3", total: 180, transaction_type: "Deduct", status: "Paid", description: "Insulation material supplied by PTPM warehouse", receipt: null, service_provider_id: 12, job_id: 9034 },
    { id: 2, material_name: "Extra vacuum bags x2", total: 24, transaction_type: "Reimburse", status: "Paid", description: "SP purchased from Bunnings", receipt: "receipt_url", service_provider_id: 12, job_id: 9034 },
  ],
  inquiries_for_job: [
    { id: 4821, unique_id: "INQ-4821", deal_name: "Vernon — Ceiling Vacuum", inquiry_status: "Quote Created", created_at: "2024-08-14", type: "Service Request or Quote" },
    { id: 4955, unique_id: "INQ-4955", deal_name: "Vernon — Follow Up Inspection", inquiry_status: "Completed", created_at: "2024-11-02", type: "Customer Support or Technical Assistance" },
  ],
  memos: [
    { id: 1, author: "Susan", author_type: "Admin", content: "Shane, please confirm you can do Friday 06/09 morning. Stephen will meet you onsite.", created_at: "2024-08-28 09:15", type: "post" },
    { id: 2, author: "Shane L", author_type: "SP", content: "Confirmed for Friday morning. Will be there 8am. Do I need to bring extra vacuum bags?", created_at: "2024-08-28 11:30", type: "comment" },
    { id: 3, author: "Susan", author_type: "Admin", content: "Yes please bring extra bags. Also check if the garage access is clear between 19 & 25 Badger St.", created_at: "2024-08-28 14:00", type: "comment" },
    { id: 4, author: "Shane L", author_type: "SP", content: "Job done. Removed all old batts, vacuumed thoroughly. Installed new ECOWOOL. Ceiling was in rough shape but all sorted now. Photos uploaded.", created_at: "2024-09-09 15:30", type: "comment" },
  ],
  notes: [
    { id: 1, note: "Customer called to confirm access through side gate. Code is 4521#.", author: "Susan", type: "Manual", date_created: "2024-08-20 10:30" },
    { id: 2, note: "Automation: Quote email sent to customer", author: "System", type: "API", date_created: "2024-08-22 10:01" },
    { id: 3, note: "Customer called back to ask about insulation R-value options.", author: "Susan", type: "Incoming", date_created: "2024-08-23 14:15" },
  ],
  tasks: [
    { id: 1, subject: "Follow up with Kim re: quote acceptance", status: "Completed", date_due: "2024-08-25", assignee: "Susan", date_complete: "2024-08-22", details: "Kim accepted via email same day." },
    { id: 2, subject: "Confirm Stephen availability for site visit", status: "Completed", date_due: "2024-08-18", assignee: "Susan", date_complete: "2024-08-16", details: "" },
    { id: 3, subject: "Schedule 42-day possum check callback", status: "Open", date_due: "2024-10-21", assignee: "Susan", date_complete: null, details: "Standard 42 day follow up after possum/rodent work" },
  ],
  communications: [
    { id: 1, type: "Email", template: "Electronic Quote", recipient: "info@possumman.com.au", sent_at: "2024-08-22 10:00", status: "Delivered", opened: true },
    { id: 2, type: "Email", template: "Quote Follow Up", recipient: "info@possumman.com.au", sent_at: "2024-08-27 09:00", status: "Delivered", opened: true },
    { id: 3, type: "Email", template: "Job Booking Confirmation", recipient: "info@possumman.com.au", sent_at: "2024-09-06 14:00", status: "Delivered", opened: true },
    { id: 4, type: "SMS", template: "Day Before Reminder", recipient: "0412 629 685", sent_at: "2024-09-08 09:00", status: "Delivered", opened: false },
    { id: 5, type: "Email", template: "Invoice #20094", recipient: "info@possumman.com.au", sent_at: "2024-09-09 16:00", status: "Delivered", opened: true },
    { id: 6, type: "Email", template: "Feedback Request", recipient: "info@possumman.com.au", sent_at: "2024-09-16 09:00", status: "Opened", opened: true },
  ],
  uploads: [
    { id: 1, type: "Photo", name: "Before — Ceiling cavity", uploaded_by: "Shane L", created_at: "2024-09-09", customer_can_view: true },
    { id: 2, type: "Photo", name: "During — Old batts removal", uploaded_by: "Shane L", created_at: "2024-09-09", customer_can_view: true },
    { id: 3, type: "Photo", name: "After — New ECOWOOL installed", uploaded_by: "Shane L", created_at: "2024-09-09", customer_can_view: true },
    { id: 4, type: "Form", name: "Prestart Checklist", uploaded_by: "Shane L", created_at: "2024-09-09", customer_can_view: false },
    { id: 5, type: "Form", name: "PCA Report", uploaded_by: "Shane L", created_at: "2024-09-09", customer_can_view: false },
    { id: 6, type: "File", name: "Quote PDF — Q9034", uploaded_by: "System", created_at: "2024-08-22", customer_can_view: true },
    { id: 7, type: "File", name: "Invoice PDF — #20094", uploaded_by: "System", created_at: "2024-09-09", customer_can_view: true },
  ],
  propertyUploads: [
    { id: 10, type: "Photo", name: "Property — Street view", uploaded_by: "Shane L", created_at: "2024-08-19" },
    { id: 11, type: "File", name: "Body Corp approval letter", uploaded_by: "Susan", created_at: "2024-08-16" },
  ],
  appointments: [
    { id: 1, title: "Site Visit — Vernon, Newmarket", status: "Completed", start_time: "2024-08-19 09:00", end_time: "2024-08-19 10:00", host: "Shane L", type: "Inquiry", duration: "1hr" },
    { id: 2, title: "Job — Ceiling Vacuum & Insulation", status: "Completed", start_time: "2024-09-09 08:00", end_time: "2024-09-09 14:00", host: "Shane L", type: "Job", duration: "6hr" },
  ],
  spViewedDeal: [
    { id: 1, service_provider_name: "Shane L", viewed_at: "2024-08-15 08:20" },
    { id: 2, service_provider_name: "Tony M", viewed_at: "2024-08-15 09:45" },
  ],
};

const ENUM = {
  inquiry_status: ["New Inquiry","Not Allocated","Contact Client","Contact For Site Visit","Site Visit Scheduled","Site Visit to be Re-Scheduled","Generate Quote","Quote Created","Completed","Cancelled","Expired"],
  sales_stage: ["New Lead","Qualified Prospect","Consideration","Committed","Visit Scheduled","Closed - Won","Closed - Lost"],
  quote_status: ["New","Requested","Sent","Accepted","Declined","Expired","Cancelled"],
  job_status: ["Quote","Booked","Scheduled","In Progress","Completed","Call Back","Reschedule","On Hold","Cancelled","Waiting For Payment"],
  payment_status: ["Invoice Required","Invoice Sent","Paid","Overdue","Written Off","Cancelled"],
  priority: ["Low","Medium","High"],
  account_type_deal: ["Contact","Company"],
  xero_invoice_status: ["Create Invoice","Update Invoice","Awaiting payment","Paid","Failed"],
  xero_bill_status: ["Create Bill Line Item","Update Bill Line Item","Scheduled","Waiting Approval","Awaiting Payment","Paid","Cancelled"],
  activity_status: ["Quoted","Scheduled","To Be Scheduled","Completed","Reschedule","Cancelled"],
};

// ─── UTILITY COMPONENTS ─────────────────────────────────────────────────────

const statusColors = {
  "New Inquiry":"bg-blue-100 text-blue-800 border-blue-200","Quote Created":"bg-violet-100 text-violet-800 border-violet-200","Completed":"bg-emerald-100 text-emerald-800 border-emerald-200","Cancelled":"bg-gray-100 text-gray-500 border-gray-200","Expired":"bg-orange-100 text-orange-700 border-orange-200","Contact Client":"bg-amber-100 text-amber-800 border-amber-200","Site Visit Scheduled":"bg-cyan-100 text-cyan-800 border-cyan-200","Generate Quote":"bg-indigo-100 text-indigo-800 border-indigo-200","Not Allocated":"bg-red-100 text-red-700 border-red-200","Accepted":"bg-emerald-100 text-emerald-800 border-emerald-200","Sent":"bg-blue-100 text-blue-800 border-blue-200","Declined":"bg-red-100 text-red-700 border-red-200","New":"bg-blue-100 text-blue-800 border-blue-200","Requested":"bg-amber-100 text-amber-800 border-amber-200","Booked":"bg-cyan-100 text-cyan-800 border-cyan-200","In Progress":"bg-blue-100 text-blue-800 border-blue-200","Scheduled":"bg-cyan-100 text-cyan-800 border-cyan-200","On Hold":"bg-amber-100 text-amber-800 border-amber-200","Quote":"bg-violet-100 text-violet-800 border-violet-200","Call Back":"bg-orange-100 text-orange-700 border-orange-200","Waiting For Payment":"bg-amber-100 text-amber-800 border-amber-200","Paid":"bg-emerald-100 text-emerald-800 border-emerald-200","Invoice Sent":"bg-blue-100 text-blue-800 border-blue-200","Invoice Required":"bg-amber-100 text-amber-800 border-amber-200","Overdue":"bg-red-100 text-red-700 border-red-200","Written Off":"bg-gray-100 text-gray-500 border-gray-200","Awaiting payment":"bg-amber-100 text-amber-800 border-amber-200","Awaiting Payment":"bg-amber-100 text-amber-800 border-amber-200","Create Invoice":"bg-indigo-100 text-indigo-800 border-indigo-200","Active":"bg-emerald-100 text-emerald-800 border-emerald-200","Delivered":"bg-emerald-100 text-emerald-800 border-emerald-200","Opened":"bg-blue-100 text-blue-800 border-blue-200","Deduct":"bg-red-50 text-red-700 border-red-200","Reimburse":"bg-emerald-50 text-emerald-700 border-emerald-200","Quoted":"bg-violet-100 text-violet-800 border-violet-200","To Be Scheduled":"bg-amber-100 text-amber-800 border-amber-200","Open":"bg-blue-100 text-blue-800 border-blue-200","High":"bg-red-100 text-red-700 border-red-200","Medium":"bg-amber-100 text-amber-700 border-amber-200","Low":"bg-gray-100 text-gray-600 border-gray-200","Manual":"bg-gray-100 text-gray-600 border-gray-200","API":"bg-indigo-50 text-indigo-600 border-indigo-200","Incoming":"bg-blue-50 text-blue-600 border-blue-200","Outgoing":"bg-cyan-50 text-cyan-600 border-cyan-200","Primary":"bg-gray-900 text-white border-gray-900","Add On":"bg-gray-100 text-gray-700 border-gray-300","Option":"bg-gray-50 text-gray-500 border-gray-200","Body Corp":"bg-purple-100 text-purple-700 border-purple-200","Body Corp Company":"bg-purple-50 text-purple-600 border-purple-200",
};

const Badge = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${statusColors[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{status}</span>
);

const Card = ({ title, children, className = "", actions, collapsible = false, defaultOpen = true, warning = false, icon, noPad = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`bg-white rounded-lg border ${warning ? "border-amber-300 ring-1 ring-amber-100" : "border-gray-200"} ${className}`}>
      {title && (
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${warning ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50/50"} rounded-t-lg ${collapsible ? "cursor-pointer select-none" : ""}`} onClick={collapsible ? () => setOpen(!open) : undefined}>
          <div className="flex items-center gap-2">
            {icon && <span className="text-sm">{icon}</span>}
            <h3 className={`text-xs font-bold uppercase tracking-wider ${warning ? "text-amber-800" : "text-gray-500"}`}>{title}</h3>
            {collapsible && <span className="text-gray-400 text-xs ml-1">{open ? "▾" : "▸"}</span>}
          </div>
          {actions && <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>{actions}</div>}
        </div>
      )}
      {(!collapsible || open) && <div className={noPad ? "" : "p-4"}>{children}</div>}
    </div>
  );
};

const Field = ({ label, value, mono = false, className = "" }) => (
  <div className={`min-w-0 ${className}`}>
    <dt className="text-xs text-gray-400 font-medium mb-0.5 truncate">{label}</dt>
    <dd className={`text-sm text-gray-900 ${mono ? "font-mono text-xs" : ""} break-words`}>{value || <span className="text-gray-300">—</span>}</dd>
  </div>
);

const Btn = ({ children, onClick, variant = "default", size = "sm", className = "", disabled = false }) => {
  const base = "inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 whitespace-nowrap";
  const sizes = { xs: "px-2 py-1 text-xs gap-1", sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-sm gap-2" };
  const variants = {
    default: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300",
    primary: "bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500 border border-gray-900",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400 border border-emerald-600",
    danger: "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 focus:ring-red-300",
    warning: "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 focus:ring-amber-300",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-300",
    blue: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400 border border-blue-600",
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>{children}</button>;
};

const TagPill = ({ label }) => <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full border border-gray-200">{label}</span>;

const TabBar = ({ tabs, active, onChange }) => (
  <div className="flex border-b border-gray-200 bg-white px-1 gap-0.5 overflow-x-auto">
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${active === t.id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"}`}>
        {t.label}{t.count != null && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${active === t.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>}
      </button>
    ))}
  </div>
);

const PopupWarning = ({ message, source }) => {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
      <span className="text-amber-500 text-sm flex-shrink-0 mt-px">⚠</span>
      <div><span className="font-bold">{source}:</span> <span className="font-medium leading-relaxed">{message}</span></div>
    </div>
  );
};

const Select = ({ value, options, onChange, className = "" }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className={`text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 ${className}`}>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-lg shadow-xl text-xs font-medium animate-bounce">
    <span className="text-emerald-400">✓</span>{message}
    <button onClick={onClose} className="text-gray-400 hover:text-white ml-2">✕</button>
  </div>
);

// ─── INQUIRY DETAIL PAGE ────────────────────────────────────────────────────

const InquiryPage = ({ onNavigateToJob }) => {
  const d = MOCK.inquiry;
  const p = MOCK.property;
  const c = MOCK.contact;
  const sp = MOCK.serviceProvider;
  const svc = MOCK.serviceRecord;
  const [activeTab, setActiveTab] = useState("memos");
  const [showEmailMenu, setShowEmailMenu] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [toast, setToast] = useState(null);
  const [inquiryStatus, setInquiryStatus] = useState(d.inquiry_status);
  const [salesStage, setSalesStage] = useState(d.sales_stage);

  const sendEmail = (template) => { setShowEmailMenu(false); setToast(`✉ "${template}" email queued`); setTimeout(() => setToast(null), 3000); };

  return (
    <div className="min-h-screen flex flex-col">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">📋</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-gray-900">{d.unique_id}</h1>
                  <Select value={inquiryStatus} options={ENUM.inquiry_status} onChange={setInquiryStatus} />
                  <Select value={salesStage} options={ENUM.sales_stage} onChange={setSalesStage} />
                  {d.call_back && <Badge status="Call Back" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{d.deal_name} · Created {d.created_at} · Source: {d.inquiry_source}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {d.quote_record_id ? (
              <Btn variant="blue" size="sm" onClick={onNavigateToJob}>↗ Quote/Job #{d.quote_record_id}</Btn>
            ) : (
              <Btn variant="success" size="sm">+ Create Quote</Btn>
            )}
            <div className="relative">
              <Btn variant="default" size="sm" onClick={() => setShowEmailMenu(!showEmailMenu)}>✉ Send Email ▾</Btn>
              {showEmailMenu && <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                {["Email Customer","Email Service Provider","Quote Follow Up","Invoice Follow Up","Email Tenant"].map(t => (
                  <button key={t} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700" onClick={() => sendEmail(t)}>{t}</button>
                ))}
              </div>}
            </div>
            <div className="relative">
              <Btn variant="default" size="sm" onClick={() => setShowMoreActions(!showMoreActions)}>⋮</Btn>
              {showMoreActions && <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                {["Return to Admin","Schedule Site Visit","Duplicate Inquiry","Cancel Inquiry","Delete Inquiry"].map(t => (
                  <button key={t} className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${t.includes("Delete") ? "text-red-600" : "text-gray-700"}`} onClick={() => setShowMoreActions(false)}>{t}</button>
                ))}
              </div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── WARNINGS ── */}
      <div className="px-6 pt-3 space-y-2">
        {c.popup_comment && <PopupWarning message={c.popup_comment} source="Contact Alert" />}
        {d.return_inquiry_to_admin && <PopupWarning message={`Returned by SP: ${d.inquiry_return_reason}`} source="SP Return" />}
        {d.inquiry_for_job_id && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <span className="text-blue-500 text-sm">🔗</span>
            <span>This inquiry relates to existing <strong>JOB-{d.inquiry_for_job_id}</strong></span>
            <Btn size="xs" variant="ghost">View Job →</Btn>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 bg-gray-50 p-6">
        <div className="grid grid-cols-12 gap-5">
          {/* LEFT — 8 cols */}
          <div className="col-span-8 space-y-5">
            {/* Inquiry Details */}
            <Card title="Inquiry Details" icon="📝" actions={<Btn size="xs" variant="ghost">Edit</Btn>}>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Field label="Type" value={d.type} />
                <Field label="Source" value={d.inquiry_source} />
                <Field label="How Did You Hear" value={d.how_did_you_hear} />
                <Field label="Service Type" value={d.service_type} />
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Field label="Account Type" value={d.account_type} />
                <Field label="Date Required By" value={d.date_job_required_by} />
                <Field label="Deal Size" value={d.deal_size} />
                <Field label="Close Timeframe" value={d.expected_close_timeframe} />
              </div>
              {/* Linked Service */}
              {svc && (
                <div className="border-t border-gray-100 pt-3 mb-3">
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-md border border-gray-100">
                    <Badge status={svc.service_type} />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{svc.service_name}</p>
                      <p className="text-xs text-gray-500">Base price: ${svc.service_price.toFixed(2)} · {svc.standard_warranty}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3">
                <Field label="How Can We Help" value={d.how_can_we_help} />
              </div>
            </Card>

            {/* Site Visit Details */}
            <Card title="Site Visit Details" icon="🔍" collapsible defaultOpen={true}>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div><dt className="text-xs text-gray-400 font-medium mb-1.5">Noise / Signs</dt><div className="flex flex-wrap gap-1">{d.noise_signs.map(n => <TagPill key={n} label={n} />)}</div></div>
                <div><dt className="text-xs text-gray-400 font-medium mb-1.5">Pest Location</dt><div className="flex flex-wrap gap-1">{d.pest_location.map(n => <TagPill key={n} label={n} />)}</div></div>
                <div><dt className="text-xs text-gray-400 font-medium mb-1.5">Active Times</dt><div className="flex flex-wrap gap-1">{d.pest_active_times.map(n => <TagPill key={n} label={n} />)}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Renovations" value={d.renovations} />
                <Field label="Resident Availability" value={d.resident_availability} />
              </div>
            </Card>

            {/* Admin Notes + Client Notes side by side */}
            <div className="grid grid-cols-2 gap-5">
              <Card title="Admin Notes" icon="📌" actions={<Btn size="xs" variant="ghost">Edit</Btn>}>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-md p-3 border border-gray-100 max-h-40 overflow-y-auto">{d.admin_notes}</pre>
              </Card>
              <Card title="Client Notes" icon="💬" actions={<Btn size="xs" variant="ghost">Edit</Btn>}>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-md p-3 border border-gray-100 max-h-40 overflow-y-auto">{d.client_notes}</pre>
              </Card>
            </div>

            {/* Lower Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <TabBar tabs={[
                { id: "memos", label: "Memos", count: MOCK.memos.length },
                { id: "tasks", label: "Tasks", count: MOCK.tasks.filter(t => t.status === "Open").length },
                { id: "notes", label: "Notes", count: MOCK.notes.length },
                { id: "appointments", label: "Appointments", count: MOCK.appointments.filter(a => a.type === "Inquiry").length },
                { id: "uploads", label: "Uploads", count: MOCK.uploads.length },
                { id: "comms", label: "Communications", count: MOCK.communications.length },
                { id: "spviews", label: "SP Views", count: MOCK.spViewedDeal.length },
              ]} active={activeTab} onChange={setActiveTab} />
              <div className="p-4 max-h-96 overflow-y-auto">
                {activeTab === "memos" && <MemoPanel />}
                {activeTab === "tasks" && <TaskPanel />}
                {activeTab === "notes" && <NotePanel />}
                {activeTab === "appointments" && <AppointmentPanel filter="Inquiry" />}
                {activeTab === "uploads" && <UploadPanel />}
                {activeTab === "comms" && <CommsPanel />}
                {activeTab === "spviews" && <SPViewPanel />}
              </div>
            </div>
          </div>

          {/* RIGHT — 4 cols */}
          <div className="col-span-4 space-y-5">
            {/* Contact */}
            <Card title={d.account_type === "Contact" ? "Client — Contact" : "Client — Company"} icon="👤" actions={<Btn size="xs" variant="ghost">View Record</Btn>}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">{c.first_name[0]}{c.last_name[0]}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-gray-500">{c.inquiring_as} · {c.how_referred}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2"><span className="text-gray-400 w-4">✉</span><a href={`mailto:${c.email}`} className="text-blue-600 hover:underline truncate">{c.email}</a></div>
                <div className="flex items-center gap-2"><span className="text-gray-400 w-4">📱</span><span className="text-gray-700">{c.sms_number}</span></div>
                {c.office_phone && <div className="flex items-center gap-2"><span className="text-gray-400 w-4">📞</span><span className="text-gray-700">{c.office_phone}</span></div>}
                <div className="flex items-center gap-2"><span className="text-gray-400 w-4">📍</span><span className="text-gray-700">{c.address}, {c.city} {c.state} {c.zip_code}</span></div>
                {c.xero_contact_id && <div className="flex items-center gap-2"><span className="text-gray-400 w-4 text-xs">X</span><span className="text-gray-400 font-mono text-xs">{c.xero_contact_id}</span></div>}
              </div>
            </Card>

            {/* Property */}
            <Card title="Property" icon="🏠" actions={<Btn size="xs" variant="ghost">View Record</Btn>}>
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">{p.unit_number ? `${p.unit_number}/` : ""}{p.address_1}</p>
                <p className="text-xs text-gray-500">{p.suburb_town}, {p.state} {p.postal_code}</p>
                {p.quadrant && <p className="text-xs text-gray-400 mt-0.5">Quadrant: {p.quadrant}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type" value={p.property_type} />
                <Field label="Building" value={p.building_type} />
                <Field label="Owner Type" value={p.owner_type} />
                <Field label="Foundation" value={p.foundation_type} />
                <Field label="Stories" value={p.stories} />
                <Field label="Age" value={p.building_age} />
                <Field label="Manhole" value={p.manhole ? "✓ Yes" : "✗ No"} />
                <Field label="Bedrooms" value={p.bedrooms} />
              </div>
              <div className="mt-2"><dt className="text-xs text-gray-400 font-medium mb-1">Features</dt><div className="flex flex-wrap gap-1">{p.building_features.map(f => <TagPill key={f} label={f} />)}</div></div>
              {/* Past job at property */}
              {p.last_rodent_job && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <dt className="text-xs text-gray-400 font-medium mb-1">Last Job at Property</dt>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Rodent — {p.last_rodent_job}</span>
                    <span className="font-mono text-gray-700">${p.last_rodent_job_rate?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Property Contacts (Affiliations) */}
            <Card title="Property Contacts" icon="👥" collapsible defaultOpen={true} actions={<Btn size="xs" variant="ghost">Manage</Btn>}>
              <div className="space-y-2.5">
                {MOCK.propertyContacts.map(pc => (
                  <div key={pc.id} className="flex items-center justify-between p-2 rounded-md bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{pc.contact_name}</p>
                      <p className="text-xs text-gray-400">{pc.role}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-gray-600">{pc.phone}</p>
                      <p className="text-gray-400">{pc.email}</p>
                    </div>
                  </div>
                ))}
                {!p.primary_property_manager_contact_for_property_id && (
                  <div className="flex items-center justify-between p-2 rounded-md border border-dashed border-gray-300 text-gray-400">
                    <span className="text-xs">No Property Manager assigned</span>
                    <Btn size="xs" variant="ghost">+ Add</Btn>
                  </div>
                )}
              </div>
            </Card>

            {/* Property Documents */}
            <Card title="Property Documents" icon="📁" collapsible defaultOpen={false}>
              <div className="space-y-2">
                {MOCK.propertyUploads.map(u => (
                  <div key={u.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-gray-50 border border-gray-100">
                    <span className="text-gray-700">{u.type === "Photo" ? "🖼" : "📎"} {u.name}</span>
                    <span className="text-gray-400">{u.created_at}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Service Provider */}
            <Card title="Service Provider" icon="🔧" actions={<Btn size="xs" variant="ghost">Change</Btn>}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600">{sp.name[0]}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{sp.name}</p>
                    <Badge status={sp.status} />
                  </div>
                  <p className="text-xs text-gray-500">{sp.mobile_number} · {sp.job_rate_percentage}% rate</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-1.5 bg-gray-50 rounded"><span className="text-gray-400">Capacity</span><span className={`font-semibold ${sp.workload_capacity === "OKAY" ? "text-emerald-600" : sp.workload_capacity === "BUSY" ? "text-amber-600" : "text-red-600"}`}>{sp.workload_capacity}</span></div>
                <div className="flex justify-between p-1.5 bg-gray-50 rounded"><span className="text-gray-400">In Progress</span><span className="font-semibold text-gray-700">{sp.jobs_in_progress}</span></div>
                <div className="flex justify-between p-1.5 bg-gray-50 rounded"><span className="text-gray-400">Done (30d)</span><span className="font-semibold text-gray-700">{sp.completed_jobs_last_30_days}</span></div>
                <div className="flex justify-between p-1.5 bg-gray-50 rounded"><span className="text-gray-400">Callbacks</span><span className="font-semibold text-gray-700">{sp.call_backs_last_30_days}</span></div>
              </div>
            </Card>

            {/* Linked Quote/Job */}
            {d.quote_record_id && (
              <Card title="Linked Quote / Job" icon="📄" warning>
                <button onClick={onNavigateToJob} className="w-full text-left group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">JOB-{d.quote_record_id}</p>
                      <div className="flex items-center gap-1.5 mt-1"><Badge status={MOCK.job.quote_status} /><Badge status={MOCK.job.job_status} /><Badge status={MOCK.job.payment_status} /></div>
                    </div>
                    <span className="text-gray-300 group-hover:text-blue-400 text-lg">→</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Field label="Quote" value={`$${MOCK.job.quote_total.toFixed(2)}`} />
                    <Field label="Job" value={`$${MOCK.job.job_total.toFixed(2)}`} />
                    <Field label="Invoice" value={`#${MOCK.job.invoice_number}`} />
                  </div>
                </button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── JOB / QUOTE DETAIL PAGE ────────────────────────────────────────────────

const JobPage = ({ onNavigateToInquiry }) => {
  const j = MOCK.job;
  const p = MOCK.property;
  const c = MOCK.contact;
  const sp = MOCK.serviceProvider;
  const [activeTab, setActiveTab] = useState("activities");
  const [showEmailMenu, setShowEmailMenu] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [toast, setToast] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState(j.quote_status);
  const [jobStatus, setJobStatus] = useState(j.job_status);
  const [paymentStatus, setPaymentStatus] = useState(j.payment_status);

  const sendEmail = (t) => { setShowEmailMenu(false); setToast(`✉ "${t}" queued`); setTimeout(() => setToast(null), 3000); };
  const doAction = (t) => { setShowMoreActions(false); setToast(`Action: ${t}`); setTimeout(() => setToast(null), 3000); };

  return (
    <div className="min-h-screen flex flex-col">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">📄</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-gray-900">{j.unique_id}</h1>
                  <Select value={quoteStatus} options={ENUM.quote_status} onChange={setQuoteStatus} />
                  <Select value={jobStatus} options={ENUM.job_status} onChange={setJobStatus} />
                  <Select value={paymentStatus} options={ENUM.payment_status} onChange={setPaymentStatus} />
                  <Badge status={j.priority} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{c.first_name} {c.last_name} · {p.address_1}, {p.suburb_town} · Type: {j.job_type}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Btn variant="default" size="sm" onClick={() => setShowEmailMenu(!showEmailMenu)}>✉ Send ▾</Btn>
              {showEmailMenu && <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                {["Email Customer","Email Electronic Quote","Email Manual Quote","Email BC Quote FU","Email RE Quote FU","Email O Quote FU","Email Invoice FU","Email RE INV FU","Email Tenant","Email Rat Station","Request Review","Display Prestart","Print Prestart"].map(t => (
                  <button key={t} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700" onClick={() => sendEmail(t)}>{t}</button>
                ))}
              </div>}
            </div>
            <Btn variant="default" size="sm" onClick={() => doAction("Print Job Sheet")}>🖨 Print</Btn>
            <div className="relative">
              <Btn variant="default" size="sm" onClick={() => setShowMoreActions(!showMoreActions)}>⋮ More</Btn>
              {showMoreActions && <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                {["Create Callback","Copy as New Job","Return to Admin","Update Future Booking","Monitor Job","Review Quote","Review Invoice","Review Receipt","Mark Complete","Cancel Job","Delete Job"].map(t => (
                  <button key={t} className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${t.includes("Delete") ? "text-red-600" : t.includes("Cancel") ? "text-amber-700" : "text-gray-700"}`} onClick={() => doAction(t)}>{t}</button>
                ))}
              </div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── WARNINGS ── */}
      <div className="px-6 pt-3 space-y-2">
        {c.popup_comment && <PopupWarning message={c.popup_comment} source="Contact Alert" />}
        {j.return_job_to_admin && <PopupWarning message="This job was returned to admin by the service provider." source="SP Return" />}
        {!j.prestart_done && j.job_status !== "Quote" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            <span className="text-red-500 text-sm">🚨</span><span className="font-semibold">Compliance: Prestart checklist not completed — work cannot proceed</span>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 bg-gray-50 p-6">
        <div className="grid grid-cols-12 gap-5">
          {/* LEFT — 8 cols */}
          <div className="col-span-8 space-y-5">
            {/* Financial Summary */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Quote Total", value: `$${j.quote_total.toFixed(2)}`, sub: `GST $${j.quote_gst.toFixed(2)}`, extra: j.quote_variation_price ? `Variation: ${j.quote_variation_type} $${j.quote_variation_price.toFixed(2)}` : null },
                { label: "Job Total", value: `$${j.job_total.toFixed(2)}`, sub: `GST $${j.job_gst.toFixed(2)}`, extra: j.job_variation_price ? `Variation: ${j.job_variation_type} $${j.job_variation_price.toFixed(2)}` : null },
                { label: "Invoice", value: `#${j.invoice_number}`, sub: j.xero_invoice_status, extra: `Due: ${j.due_date}` },
                { label: "SP Bill", value: `$${j.bill_total.toFixed(2)}`, sub: j.xero_bill_status, extra: `Batch: W${j.bill_batch_week}` },
                { label: "Materials", value: `$${MOCK.materials.reduce((s, m) => s + m.total, 0).toFixed(2)}`, sub: `${MOCK.materials.length} item(s)`, extra: `D: $${j.deduct_total} / R: $${j.reimburse_total}` },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.sub}</p>
                  {card.extra && <p className="text-xs text-gray-400 mt-0.5">{card.extra}</p>}
                </div>
              ))}
            </div>

            {/* Admin Recommendation */}
            {j.admin_recommendation && (
              <Card title="Admin Recommendation" icon="📌" actions={<Btn size="xs" variant="ghost">Edit</Btn>}>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-md p-3 border border-gray-100">{j.admin_recommendation}</pre>
                {j.follow_up_comment && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <Field label="Follow Up Comment" value={j.follow_up_comment} />
                  </div>
                )}
              </Card>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <TabBar tabs={[
                { id: "activities", label: "Activities", count: MOCK.activities.length },
                { id: "materials", label: "Materials", count: MOCK.materials.length },
                { id: "memos", label: "Memos", count: MOCK.memos.length },
                { id: "tasks", label: "Tasks", count: MOCK.tasks.filter(t => t.status === "Open").length },
                { id: "notes", label: "Notes", count: MOCK.notes.length },
                { id: "uploads", label: "Uploads", count: MOCK.uploads.length },
                { id: "comms", label: "Comms", count: MOCK.communications.length },
                { id: "appointments", label: "Schedule", count: MOCK.appointments.length },
                { id: "wildlife", label: "Wildlife" },
                { id: "compliance", label: "Compliance" },
              ]} active={activeTab} onChange={setActiveTab} />
              <div className="p-4">
                {activeTab === "activities" && <ActivityPanel />}
                {activeTab === "materials" && <MaterialPanel />}
                {activeTab === "memos" && <MemoPanel />}
                {activeTab === "tasks" && <TaskPanel />}
                {activeTab === "notes" && <NotePanel />}
                {activeTab === "uploads" && <UploadPanel />}
                {activeTab === "comms" && <CommsPanel />}
                {activeTab === "appointments" && <AppointmentPanel />}
                {activeTab === "wildlife" && <WildlifePanel />}
                {activeTab === "compliance" && <CompliancePanel />}
              </div>
            </div>

            {/* Related Inquiries */}
            <Card title="Related Inquiries" icon="📋" collapsible defaultOpen={true}>
              <div className="space-y-2">
                {MOCK.inquiries_for_job.map(inq => (
                  <button key={inq.id} onClick={onNavigateToInquiry} className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-gray-50 border border-gray-100 group transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-gray-500">{inq.unique_id}</span>
                      <span className="text-xs text-gray-700">{inq.deal_name}</span>
                      <Badge status={inq.inquiry_status} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{inq.created_at}</span>
                      <span className="text-gray-300 group-hover:text-blue-400">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Callback Chain */}
            <Card title="Job History / Callback Chain" icon="🔗" collapsible defaultOpen={true}>
              <div className="space-y-1">
                {/* Past job (parent) */}
                {MOCK.pastJob && (
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-md border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">↑</div>
                    <div className="flex-1">
                      <span className="text-xs font-mono font-bold text-gray-500">{MOCK.pastJob.unique_id}</span>
                      <span className="text-xs text-gray-600 ml-2">{MOCK.pastJob.description}</span>
                    </div>
                    <div className="text-right">
                      <Badge status={MOCK.pastJob.job_status} />
                      <p className="text-xs text-gray-400 mt-0.5">${MOCK.pastJob.job_total.toFixed(2)} · {MOCK.pastJob.date_completed}</p>
                    </div>
                  </div>
                )}
                {/* Current job */}
                <div className="flex items-center gap-3 p-2.5 bg-blue-50 rounded-md border border-blue-200">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">●</div>
                  <div className="flex-1">
                    <span className="text-xs font-mono font-bold text-blue-800">{j.unique_id}</span>
                    <span className="text-xs text-blue-700 ml-2">Current job</span>
                  </div>
                  <Badge status={j.job_status} />
                </div>
                {/* Callback children */}
                {MOCK.callbackJobs.map(cb => (
                  <div key={cb.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-md border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">↓</div>
                    <div className="flex-1">
                      <span className="text-xs font-mono font-bold text-gray-500">{cb.unique_id}</span>
                      <span className="text-xs text-gray-600 ml-2">{cb.description}</span>
                    </div>
                    <div className="text-right">
                      <Badge status={cb.job_status} />
                      <p className="text-xs text-gray-400 mt-0.5">{cb.date_scheduled}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT — 4 cols */}
          <div className="col-span-4 space-y-5">
            {/* Client */}
            <Card title={`Client — ${j.account_type}`} icon="👤" actions={<Btn size="xs" variant="ghost">View</Btn>}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">{c.first_name[0]}{c.last_name[0]}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-gray-500">{j.account_type}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2"><span className="text-gray-400 w-4">✉</span><span className="text-blue-600">{c.email}</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-400 w-4">📱</span><span className="text-gray-700">{c.sms_number}</span></div>
              </div>
              {/* Accounts contact (if different from primary) */}
              {j.accounts_contact_id && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-medium mb-1">Accounts / Billing Contact</p>
                  <p className="text-xs text-gray-700">Via Affiliation #{j.accounts_contact_id}</p>
                </div>
              )}
            </Card>

            {/* Company Card (shown when relevant) */}
            {j.account_type === "Company" || MOCK.company ? (
              <Card title="Company" icon="🏢" collapsible defaultOpen={false}>
                <div className="mb-2">
                  <p className="text-sm font-semibold text-gray-900">{MOCK.company.name}</p>
                  <div className="flex items-center gap-1.5 mt-1"><Badge status={MOCK.company.account_type} /><span className="text-xs text-gray-400">{MOCK.company.industry}</span></div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2"><span className="text-gray-400 w-4">📞</span><span className="text-gray-700">{MOCK.company.phone}</span></div>
                  <div className="flex items-center gap-2"><span className="text-gray-400 w-4">📍</span><span className="text-gray-700">{MOCK.company.address}, {MOCK.company.city} {MOCK.company.state}</span></div>
                </div>
                {/* Body Corp Hierarchy */}
                {MOCK.company.body_corporate_company_id && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-medium mb-1.5">Body Corporate Hierarchy</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
                        <span className="text-xs">🏛</span>
                        <span className="text-xs font-semibold text-purple-800">{MOCK.bodyCorpParent.name}</span>
                        <Badge status="Body Corp" />
                      </div>
                      {MOCK.bodyCorpParent.child_companies.map(cc => (
                        <div key={cc.id} className={`flex items-center gap-2 p-2 rounded border ml-4 ${cc.id === MOCK.company.id ? "bg-purple-50 border-purple-300 ring-1 ring-purple-200" : "bg-gray-50 border-gray-100"}`}>
                          <span className="text-xs">{cc.id === MOCK.company.id ? "→" : " "}</span>
                          <span className={`text-xs ${cc.id === MOCK.company.id ? "font-semibold text-purple-700" : "text-gray-600"}`}>{cc.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : null}

            {/* Property */}
            <Card title="Property" icon="🏠" actions={<Btn size="xs" variant="ghost">View</Btn>}>
              <p className="text-sm font-semibold text-gray-900">{p.address_1}</p>
              <p className="text-xs text-gray-500 mb-2">{p.suburb_town}, {p.state} {p.postal_code}</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type" value={p.property_type} /><Field label="Building" value={p.building_type} />
                <Field label="Foundation" value={p.foundation_type} /><Field label="Manhole" value={p.manhole ? "✓ Yes" : "✗ No"} />
              </div>
            </Card>

            {/* SP */}
            <Card title="Service Provider" icon="🔧" actions={<Btn size="xs" variant="ghost">Change</Btn>}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600">{sp.name[0]}</div>
                <div>
                  <div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-900">{sp.name}</p><Badge status={sp.status} /></div>
                  <p className="text-xs text-gray-500">{sp.mobile_number} · {sp.job_rate_percentage}% · Lic: {sp.license_number}</p>
                </div>
              </div>
            </Card>

            {/* Client Payment */}
            <Card title="Client Payment" icon="💳" actions={<Btn size="xs" variant="default">Xero ↗</Btn>}>
              <div className="flex items-center justify-between mb-2">
                <Field label="Invoice #" value={j.invoice_number} mono /><Badge status={j.xero_invoice_status} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Field label="Total" value={`$${j.invoice_total.toFixed(2)}`} />
                <Field label="Due Date" value={j.due_date} />
                <Field label="Method" value={j.payment_method} />
                <Field label="Part Payment" value={j.Part_Payment_Made > 0 ? `$${j.Part_Payment_Made.toFixed(2)}` : "—"} />
              </div>
              {j.xero_invoice_status !== "Paid" && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Btn size="xs" variant="success" onClick={() => setToast("Invoice creation triggered")}>Generate Invoice</Btn>
                  <Btn size="xs" variant="default">Print</Btn>
                </div>
              )}
            </Card>

            {/* SP Payment */}
            <Card title="SP Payment" icon="💰" actions={<Btn size="xs" variant="default">Xero ↗</Btn>}>
              <div className="flex items-center justify-between mb-2">
                <Field label="Bill Total" value={`$${j.bill_total.toFixed(2)}`} /><Badge status={j.xero_bill_status} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Field label="GST" value={`$${j.bill_gst.toFixed(2)}`} />
                <Field label="Batch" value={j.bill_batch_id} mono />
                <Field label="Admin ✓" value={j.bill_approved_admin ? "Approved" : "Pending"} />
                <Field label="SP ✓" value={j.bill_approved_service_provider ? "Approved" : "Pending"} />
              </div>
              <div className="text-xs bg-gray-50 rounded-md p-2 border border-gray-100">
                <div className="flex justify-between"><span className="text-gray-400">Deductions</span><span className="text-red-600 font-mono">-${j.deduct_total}</span></div>
                <div className="flex justify-between mt-1"><span className="text-gray-400">Reimbursements</span><span className="text-emerald-600 font-mono">+${j.reimburse_total}</span></div>
              </div>
              {!j.bill_approved_admin && (
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <Btn size="xs" variant="success" onClick={() => setToast("Bill approved")}>Approve Bill</Btn>
                </div>
              )}
            </Card>

            {/* Quote/Job Variation */}
            <Card title="Price Variations" icon="±" collapsible defaultOpen={false}>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Quote Variation</p>
                  {j.quote_variation_price ? (
                    <div className="text-xs"><span className={j.quote_variation_type === "Plus" ? "text-emerald-600" : "text-red-600"}>{j.quote_variation_type} ${j.quote_variation_price.toFixed(2)}</span> <span className="text-gray-400">— {j.quote_variation_text}</span></div>
                  ) : <p className="text-xs text-gray-400">No variation applied</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Job Variation</p>
                  {j.job_variation_price ? (
                    <div className="text-xs"><span className={j.job_variation_type === "Plus" ? "text-emerald-600" : "text-red-600"}>{j.job_variation_type} ${j.job_variation_price.toFixed(2)}</span> <span className="text-gray-400">— {j.job_variation_text}</span></div>
                  ) : <p className="text-xs text-gray-400">No variation applied</p>}
                </div>
                <Btn size="xs" variant="default">Edit Variations</Btn>
              </div>
            </Card>

            {/* Feedback */}
            {j.feedback_status && (
              <Card title="Customer Feedback" icon="⭐">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{"★".repeat(parseInt(j.rating))}{"☆".repeat(5 - parseInt(j.rating))}</span>
                  <span className="text-xs font-semibold text-gray-700">{j.rating}/5</span>
                  <Badge status={j.feedback_status} />
                </div>
                {j.feedback_text && <p className="text-xs text-gray-600 italic">"{j.feedback_text}"</p>}
              </Card>
            )}

            {/* Key Dates */}
            <Card title="Key Dates" icon="📅" collapsible defaultOpen={false}>
              <div className="space-y-1.5">
                {[["Quote Date",j.quote_date],["Quote Sent",j.date_quote_sent],["Quote Valid Until",j.quote_valid_until],["Accepted",j.date_quoted_accepted],["Booked",j.date_booked],["Scheduled",j.date_scheduled],["Started",j.date_started],["Completed",j.date_completed],["Invoice Date",j.invoice_date],["Due Date",j.due_date],["Bill Date",j.bill_date],["Bill Due",j.bill_due_date],["Follow Up",j.follow_up_date]].map(([l,v]) => (
                  <div key={l} className="flex items-center justify-between text-xs"><span className="text-gray-400">{l}</span><span className={`font-medium ${v ? "text-gray-700" : "text-gray-300"}`}>{v || "—"}</span></div>
                ))}
              </div>
            </Card>

            {/* T&C / Signature */}
            <Card title="Agreement" icon="✍" collapsible defaultOpen={false}>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">T&C Accepted</span><span className={j.terms_and_conditions_accepted ? "text-emerald-600 font-semibold" : "text-red-600"}>{j.terms_and_conditions_accepted ? "✓ Yes" : "✗ No"}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Signature</span><span className={j.signature ? "text-emerald-600" : "text-gray-400"}>{j.signature ? "✓ On file" : "—"}</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TAB PANELS ─────────────────────────────────────────────────────────────

const ActivityPanel = () => {
  const [selectedQuote, setSelectedQuote] = useState("Q6828");
  const q = MOCK.realQuotes[selectedQuote];
  const quoteKeys = Object.keys(MOCK.realQuotes);

  // Group items: if sections exist, group by section then by task; otherwise group by task
  const renderItems = (items, showSection = false) => {
    const byTask = {};
    items.forEach(item => {
      if (!byTask[item.task]) byTask[item.task] = [];
      byTask[item.task].push(item);
    });
    return Object.entries(byTask).map(([task, acts]) => {
      const hasOptionGroup = acts.some(a => a.option_group);
      const allOptional = acts.every(a => a.is_optional);
      return (
        <div key={`${showSection}-${task}`} className="mb-3 last:mb-0">
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded font-mono">{task}</span>
            {hasOptionGroup && <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">⚡ Client selects one</span>}
            {allOptional && !hasOptionGroup && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Optional</span>}
            {!allOptional && !hasOptionGroup && acts.length === 1 && <span className="text-xs text-gray-400">Required</span>}
          </div>
          {acts.map(a => (
            <div key={a.id} className={`flex items-start gap-3 p-2.5 rounded-lg border mb-1.5 transition-all ${
              a.accepted === true ? "bg-emerald-50/50 border-emerald-200" :
              a.accepted === false ? "bg-gray-50 border-gray-100 opacity-50" :
              "bg-white border-gray-200 hover:border-gray-300"
            }`}>
              {/* Selection indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {hasOptionGroup ? (
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${a.accepted === true ? "border-emerald-500 bg-emerald-500" : a.accepted === false ? "border-gray-300" : "border-gray-300"}`}>
                    {a.accepted === true && <span className="text-white text-xs">●</span>}
                  </div>
                ) : a.is_optional ? (
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${a.accepted === true ? "border-emerald-500 bg-emerald-500" : a.accepted === false ? "border-gray-300" : "border-gray-300"}`}>
                    {a.accepted === true && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded bg-gray-900 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {a.option && <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{a.option}</span>}
                  <Badge status={a.status} />
                  {a.warranty && <span className="text-xs text-gray-400">🛡 {a.warranty}</span>}
                </div>
                <p className="text-xs text-gray-800 leading-relaxed">{a.description}</p>
              </div>
              {/* Price */}
              <div className="flex-shrink-0 text-right">
                {a.price != null ? (
                  <p className="text-sm font-bold font-mono text-gray-900">${a.price.toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">incl. in section</p>
                )}
                <p className="text-xs text-gray-400">inc GST</p>
              </div>
              {/* Actions */}
              <div className="flex-shrink-0"><Btn size="xs" variant="ghost">⋮</Btn></div>
            </div>
          ))}
        </div>
      );
    });
  };

  return (
    <div>
      {/* Quote selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Viewing quote:</span>
          <select value={selectedQuote} onChange={e => setSelectedQuote(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white font-mono font-bold focus:ring-2 focus:ring-gray-300">
            {quoteKeys.map(k => <option key={k} value={k}>{k} — {MOCK.realQuotes[k].customer}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-2">{q.job_address}</span>
        </div>
        <Btn size="xs" variant="default">+ Add Activity</Btn>
      </div>

      {/* Quote metadata bar */}
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 mb-4 text-xs">
        <span className="text-gray-400">SP: <strong className="text-gray-700">{q.serviceman}</strong></span>
        <span className="text-gray-400">Date: <strong className="text-gray-700">{q.quote_date}</strong></span>
        {q.has_options && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">Contains Options</span>}
        {q.has_sections && <span className="text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-200 font-semibold">Multiple Sections</span>}
        {q.attention && <span className="text-gray-400">Attn: <strong className="text-gray-700">{q.attention}</strong></span>}
        {q.reference && <span className="text-gray-400">Ref: <strong className="text-gray-700 font-mono">{q.reference}</strong></span>}
      </div>

      {/* Quote-level notes */}
      {q.notes && q.notes.map((n, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-3">
          <span className="text-amber-500 flex-shrink-0">⚠</span>
          <span className="font-medium">{n}</span>
        </div>
      ))}

      {/* Activities — sectioned or flat */}
      {q.has_sections && q.sections ? (
        <div className="space-y-4">
          {q.sections.map(sec => {
            const sectionItems = q.items.filter(i => i.section === sec.id);
            return (
              <div key={sec.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">{sec.label}</span>
                    {sec.note && <span className="text-amber-300 text-xs">· {sec.note}</span>}
                  </div>
                  {sec.total != null && (
                    <span className="text-white text-xs font-mono font-bold">Section Total: ${sec.total.toLocaleString()} inc GST</span>
                  )}
                </div>
                <div className="p-3">
                  {renderItems(sectionItems, sec.id)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>{renderItems(q.items)}</div>
      )}

      {/* Service Periods / Warranties */}
      {q.service_periods && q.service_periods.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Service Free Periods</p>
          <div className="flex gap-3">
            {q.service_periods.map((sp, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                <span className="text-emerald-600">🛡</span>
                <span className="text-emerald-800 font-medium">{sp.months} months</span>
                <span className="text-emerald-600">{sp.type} — {sp.applies_to}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="mt-4 pt-3 border-t-2 border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase">Quote Total</span>
          {q.total_inc_gst != null ? (
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-gray-900">${q.total_inc_gst.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              <p className="text-xs text-gray-400">GST: ${q.gst?.toFixed(2) || "0.00"}</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                ⚠ {q.total_note || "Not totalled — contains options"}
              </p>
              {q.sections && (
                <div className="mt-1.5 flex gap-3 justify-end">
                  {q.sections.filter(s => s.total).map(s => (
                    <span key={s.id} className="text-xs text-gray-500">{s.label.split("—")[0].trim()}: <strong className="font-mono text-gray-700">${s.total.toLocaleString()}</strong></span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MaterialPanel = () => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-gray-500">Materials: <span className="text-red-600 font-semibold">Deduct</span> = from SP pay · <span className="text-emerald-600 font-semibold">Reimburse</span> = add to SP pay</p>
      <Btn size="xs" variant="default">+ Add Material</Btn>
    </div>
    <table className="w-full text-xs">
      <thead><tr className="border-b border-gray-200">
        {["Material","Description","Type","Amount","Status","Receipt",""].map(h => <th key={h} className="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider">{h}</th>)}
      </tr></thead>
      <tbody>
        {MOCK.materials.map(m => (
          <tr key={m.id} className="border-b border-gray-50">
            <td className="py-2.5 px-2 font-medium text-gray-800">{m.material_name}</td>
            <td className="py-2.5 px-2 text-gray-500 max-w-[200px] truncate">{m.description}</td>
            <td className="py-2.5 px-2"><Badge status={m.transaction_type} /></td>
            <td className="py-2.5 px-2 font-mono">${m.total.toFixed(2)}</td>
            <td className="py-2.5 px-2"><Badge status={m.status} /></td>
            <td className="py-2.5 px-2">{m.receipt ? <span className="text-blue-600 cursor-pointer hover:underline">View</span> : <span className="text-gray-300">—</span>}</td>
            <td className="py-2.5 px-2"><Btn size="xs" variant="ghost">Edit</Btn></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MemoPanel = () => {
  const [newMemo, setNewMemo] = useState("");
  return (
    <div>
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {MOCK.memos.map(m => (
          <div key={m.id} className={`flex gap-3 ${m.type === "comment" ? "pl-6" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.author_type === "Admin" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>{m.author[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-800">{m.author}</span>
                <Badge status={m.author_type === "Admin" ? "Admin" : "SP"} />
                <span className="text-xs text-gray-400">{m.created_at}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="Write a memo..." className="flex-1 text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />
        <Btn variant="primary" size="sm">Send</Btn>
      </div>
    </div>
  );
};

const TaskPanel = () => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-gray-500">{MOCK.tasks.filter(t => t.status === "Open").length} open, {MOCK.tasks.filter(t => t.status === "Completed").length} completed</p>
      <Btn size="xs" variant="default">+ Add Task</Btn>
    </div>
    <div className="space-y-2">
      {MOCK.tasks.map(t => (
        <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border ${t.status === "Open" ? "border-blue-200 bg-blue-50/50" : "border-gray-100 bg-white"}`}>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${t.status === "Completed" ? "border-emerald-400 bg-emerald-100 text-emerald-600" : "border-gray-300"}`}>
            {t.status === "Completed" && <span className="text-xs">✓</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${t.status === "Completed" ? "text-gray-400 line-through" : "text-gray-800"}`}>{t.subject}</p>
            {t.details && <p className="text-xs text-gray-500 mt-0.5">{t.details}</p>}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span>Assigned: {t.assignee}</span>
              <span>Due: {t.date_due}</span>
              {t.date_complete && <span className="text-emerald-600">Done: {t.date_complete}</span>}
            </div>
          </div>
          <Badge status={t.status} />
        </div>
      ))}
    </div>
  </div>
);

const NotePanel = () => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-gray-500">System and manual notes log</p>
      <Btn size="xs" variant="default">+ Add Note</Btn>
    </div>
    <div className="space-y-2">
      {MOCK.notes.map(n => (
        <div key={n.id} className="flex items-start gap-3 p-2.5 border border-gray-100 rounded-lg">
          <Badge status={n.type} />
          <div className="flex-1">
            <p className="text-xs text-gray-700">{n.note}</p>
            <p className="text-xs text-gray-400 mt-0.5">By {n.author} · {n.date_created}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AppointmentPanel = ({ filter }) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-gray-500">{MOCK.appointments.filter(a => !filter || a.type === filter).length} appointment(s)</p>
      <Btn size="xs" variant="default">+ Schedule</Btn>
    </div>
    <div className="space-y-2">
      {MOCK.appointments.filter(a => !filter || a.type === filter).map(a => (
        <div key={a.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-gray-700">{a.start_time.split(" ")[0].split("-")[2]}</span>
              <span className="text-xs text-gray-400">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(a.start_time.split(" ")[0].split("-")[1]) - 1]}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">{a.title}</p>
              <p className="text-xs text-gray-500">{a.start_time.split(" ")[1]} · {a.duration} · Host: {a.host}</p>
            </div>
          </div>
          <Badge status={a.status} />
        </div>
      ))}
    </div>
  </div>
);

const UploadPanel = () => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <div className="flex gap-3 text-xs text-gray-400">
        <span>📷 {MOCK.uploads.filter(u => u.type === "Photo").length} Photos</span>
        <span>📝 {MOCK.uploads.filter(u => u.type === "Form").length} Forms</span>
        <span>📎 {MOCK.uploads.filter(u => u.type === "File").length} Files</span>
      </div>
      <Btn size="xs" variant="default">+ Upload</Btn>
    </div>
    <div className="space-y-2">
      {MOCK.uploads.map(u => (
        <div key={u.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-base">{u.type === "Photo" ? "🖼" : u.type === "Form" ? "📝" : "📎"}</span>
            <div>
              <p className="text-xs font-semibold text-gray-800">{u.name}</p>
              <p className="text-xs text-gray-400">{u.type} · {u.uploaded_by} · {u.created_at}{u.customer_can_view ? " · 👁 Client visible" : ""}</p>
            </div>
          </div>
          <Btn size="xs" variant="ghost">View</Btn>
        </div>
      ))}
    </div>
  </div>
);

const CommsPanel = () => (
  <div>
    <p className="text-xs text-gray-500 mb-3">All communications sent via Ontraport automation triggers</p>
    <table className="w-full text-xs">
      <thead><tr className="border-b border-gray-200">
        {["","Template","Recipient","Sent","Status"].map(h => <th key={h} className="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider">{h}</th>)}
      </tr></thead>
      <tbody>
        {MOCK.communications.map(cm => (
          <tr key={cm.id} className="border-b border-gray-50 hover:bg-gray-50">
            <td className="py-2 px-2">{cm.type === "Email" ? "✉" : "📱"}</td>
            <td className="py-2 px-2 font-medium text-gray-800">{cm.template}</td>
            <td className="py-2 px-2 text-gray-600 font-mono">{cm.recipient}</td>
            <td className="py-2 px-2 text-gray-500">{cm.sent_at}</td>
            <td className="py-2 px-2"><div className="flex items-center gap-1.5"><Badge status={cm.status} />{cm.opened && <span className="text-xs text-blue-500" title="Email opened">👁</span>}</div></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SPViewPanel = () => (
  <div>
    <p className="text-xs text-gray-500 mb-3">Service providers who have viewed this inquiry</p>
    <div className="space-y-2">
      {MOCK.spViewedDeal.map(sv => (
        <div key={sv.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg">
          <span className="text-xs font-semibold text-gray-700">{sv.service_provider_name}</span>
          <span className="text-xs text-gray-400">{sv.viewed_at}</span>
        </div>
      ))}
    </div>
  </div>
);

const WildlifePanel = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-500">Wildlife capture and release reporting</p>
      <Btn size="xs" variant="default">Edit Report</Btn>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[["Possums", MOCK.job.possum_number, MOCK.job.possum_comment], ["Turkeys", MOCK.job.turkey_number, MOCK.job.turkey_comment]].map(([label, num, comment]) => (
        <div key={label} className="border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{num}</p>
          {comment && <p className="text-xs text-gray-500 mt-1">{comment}</p>}
        </div>
      ))}
      <div className="border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-400 font-medium mb-1">Release Site</p>
        <p className="text-sm font-semibold text-gray-900">{MOCK.job.turkey_release_site || "N/A"}</p>
      </div>
    </div>
    {/* Noise signs on Job */}
    {MOCK.job.noise_signs?.length > 0 && (
      <div className="pt-3 border-t border-gray-100">
        <dt className="text-xs text-gray-400 font-medium mb-1.5">Noise / Signs Observed (Job)</dt>
        <div className="flex flex-wrap gap-1">{MOCK.job.noise_signs.map(n => <TagPill key={n} label={n} />)}</div>
      </div>
    )}
    {MOCK.job.location_name && <Field label="Location on Property" value={MOCK.job.location_name} />}
  </div>
);

const CompliancePanel = () => (
  <div className="space-y-3">
    <p className="text-xs text-gray-500 mb-2">Pre-work compliance — must be completed before work commences</p>
    <div className="grid grid-cols-2 gap-4">
      {[
        { done: MOCK.job.prestart_done, label: "Prestart Checklist", desc_done: "Completed before work commenced", desc_not: "NOT completed — work cannot proceed" },
        { done: MOCK.job.pca_done, label: "Pest Control Advice (PCA)", desc_done: "PCA form completed and filed", desc_not: "PCA form outstanding" },
      ].map(f => (
        <div key={f.label} className={`border rounded-lg p-4 ${f.done ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-lg ${f.done ? "text-emerald-500" : "text-red-400"}`}>{f.done ? "✓" : "✗"}</span>
            <p className="text-sm font-semibold text-gray-900">{f.label}</p>
          </div>
          <p className="text-xs text-gray-500">{f.done ? f.desc_done : f.desc_not}</p>
          <Btn size="xs" variant="default" className="mt-2">View Form</Btn>
        </div>
      ))}
    </div>
    {/* Signature & T&C */}
    <div className="grid grid-cols-2 gap-4 pt-2">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
        <span className="text-gray-500">Terms & Conditions</span>
        <span className={MOCK.job.terms_and_conditions_accepted ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{MOCK.job.terms_and_conditions_accepted ? "✓ Accepted" : "✗ Not accepted"}</span>
      </div>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
        <span className="text-gray-500">Signature</span>
        <span className={MOCK.job.signature ? "text-emerald-600 font-semibold" : "text-gray-400"}>{MOCK.job.signature ? "✓ On file" : "Not provided"}</span>
      </div>
    </div>
  </div>
);

// ─── MAIN APP ───────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("inquiry");

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif" }} className="min-h-screen bg-gray-50 text-gray-900">
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      
      {/* ── GLOBAL NAV ── */}
      <div className="bg-gray-900 text-white px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="font-bold text-sm tracking-tight">🐾 Peter the Possum Man</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">Admin Portal — Prototype v2</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setView("inquiry")} className={`px-3 py-1.5 rounded-md font-medium transition-colors ${view === "inquiry" ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}>📋 Inquiry</button>
          <button onClick={() => setView("job")} className={`px-3 py-1.5 rounded-md font-medium transition-colors ${view === "job" ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}>📄 Job / Quote</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400">Susan — Admin</span>
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">S</div>
        </div>
      </div>

      {view === "inquiry" ? <InquiryPage onNavigateToJob={() => setView("job")} /> : <JobPage onNavigateToInquiry={() => setView("inquiry")} />}
    </div>
  );
}
