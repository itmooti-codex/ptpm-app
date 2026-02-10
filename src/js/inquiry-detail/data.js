// PTPM — Inquiry Detail Static Data
// Services catalog and email options data for the inquiry detail page.
// In production, SERVICES_DATA could be fetched from VitalSync instead.

var SERVICES_DATA = [
  { serviceid: 5, service_name: "Rat Roof", service_type: "Primary", primary_service_id: null },
  { serviceid: 6, service_name: "Possum Roof", service_type: "Primary", primary_service_id: null },
  { serviceid: 8, service_name: "Materials", service_type: "Add On", primary_service_id: null },
  { serviceid: 9, service_name: "Window Cleaning", service_type: "Primary", primary_service_id: null },
  { serviceid: 10, service_name: "Wasp Removal", service_type: "Primary", primary_service_id: null },
  { serviceid: 13, service_name: "Vacuum, remove and dispose all dust and debris", service_type: "Primary", primary_service_id: null },
  { serviceid: 14, service_name: "Insulation Installation", service_type: "Primary", primary_service_id: null },
  { serviceid: 15, service_name: "R4.1 ECOWOOL to ceiling cavity.", service_type: "Option", primary_service_id: 14 },
  { serviceid: 16, service_name: "R3.5 POLYESTER to ceiling cavity", service_type: "Option", primary_service_id: 14 },
  { serviceid: 18, service_name: "Lawn Maintenance", service_type: "Primary", primary_service_id: null },
  { serviceid: 22, service_name: "Pigeon Removal - Option 1", service_type: "Option", primary_service_id: 26 },
  { serviceid: 23, service_name: "Pigeon Removal - Option 2", service_type: "Option", primary_service_id: 26 },
  { serviceid: 26, service_name: "Pigeon Removal", service_type: "Primary", primary_service_id: null },
  { serviceid: 27, service_name: "Pool Cleaning", service_type: "Primary", primary_service_id: null },
];

var EMAIL_OPTIONS_DATA = {
  general: {
    label: "General Emails",
    buttons: [
      { button_name: "Email Customer", template_link_button: "Job Email", message_id: "35", field_id: "email_customer_job_email" },
      { button_name: "Email Tenant", template_link_button: "Job Email", message_id: "msg_gen_2", field_id: "email_tenant_job_email" },
      { button_name: "Request Review", template_link_button: "Job Email", message_id: "msg_gen_3", field_id: "request_review" },
    ],
  },
  quote: {
    label: "Quote Emails",
    buttons: [
      { button_name: "Email Manual Quote", template_link_button: "Job Email", message_id: "msg_quote_1", field_id: "email_manual_quote" },
      { button_name: "Email Electronic Quote", template_link_button: "Job Email", message_id: "msg_quote_2", field_id: "email_electronic_quote" },
      { button_name: "Email RE Quote FU", template_link_button: "Job Email", message_id: "msg_quote_3", field_id: "email_re_quote_fu" },
      { button_name: "Email BC Quote FU", template_link_button: "Job Email", message_id: "msg_quote_4", field_id: "email_bc_quote_fu" },
      { button_name: "Email O Quote FU", template_link_button: "Job Email", message_id: "msg_quote_5", field_id: "email_o_quote_fu" },
      { button_name: "Email 2nd Quote FU", template_link_button: "Job Email", message_id: "msg_quote_6", field_id: "field_quote_6" },
    ],
  },
  invoice: {
    label: "Invoice Emails",
    buttons: [
      { button_name: "Email Invoice", template_link_button: "Account Email", message_id: "msg_inv_1", field_id: "field_inv_1" },
      { button_name: "Email Invoice FU", template_link_button: "Account Email", message_id: "msg_inv_2", field_id: "field_inv_2" },
      { button_name: "Email RE INV FU", template_link_button: "Account Email", message_id: "msg_inv_3", field_id: "field_inv_3" },
    ],
  },
};
