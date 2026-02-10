const CALC_DEALS_QUERY = `
          query calcDeals($id: PeterpmDealID!) {
            calcDeals(query: [{ where: { id: $id } }]) {
              Service_Provider_ID: field(arg: ["service_provider_id"])
              Popup_Comment: field(arg: ["Primary_Contact", "popup_comment"])
              Deal_Name: field(arg: ["deal_name"])
              Deal_Value: field(arg: ["deal_value"])
              Sales_Stage: field(arg: ["sales_stage"])
              Expected_Win: field(arg: ["expected_win"])
              Expected_Close_Date: field(arg: ["expected_close_date"])
                @dateFormat(value: "DD-MM-YYYY")
              Actual_Close_Date: field(arg: ["actual_close_date"])
                @dateFormat(value: "DD-MM-YYYY")
              Weighted_Value: field(arg: ["weighted_value"])
              Recent_Activity: field(arg: ["recent_activity"])
            }
          }
        `;

const UPDATE_DEAL_MUTATION = `
          mutation updateDeal($id: PeterpmDealID!, $payload: DealUpdateInput = null) {
            updateDeal(query: [{ where: { id: $id } }], payload: $payload) {
              service_provider_id

            }
          }
        `;

const UPDATE_CONTACT_MUTATION = `
          mutation updateContact($id: PeterpmContactID!, $payload: ContactUpdateInput = null) {
            updateContact(query: [{ where: { id: $id } }], payload: $payload) {
              popup_comment
            }
          }
        `;

const UPDATE_COMPANY_MUTATION = `
          mutation updateCompany(
            $id: PeterpmCompanyID!
            $payload: CompanyUpdateInput = null
          ) {
            updateCompany(
              query: [{ where: { id: $id } }]
              payload: $payload
            ) {
              popup_comment
            }
          }
        `;

const UPDATE_JOB_MUTATION = `
          mutation updateJob($id: PeterpmJobID!, $payload: JobUpdateInput = null) {
            updateJob(query: [{ where: { id: $id } }], payload: $payload) {
              admin_recommendation
              quote_date
              follow_up_date
              quote_status
              date_quote_sent
              date_quoted_accepted
              create_a_callback
              client_individual_id
              accounts_contact_id
            }
          }
        `;

const CREATE_UPLOAD_MUTATION = `
          mutation createUpload($payload: UploadCreateInput = null) {
            createUpload(payload: $payload) {
              photo_upload
              file_upload
              job_id
            }
          }
        `;

const CREATE_JOB_MUTATION = `
          mutation createJob($payload: JobCreateInput = null) {
            createJob(payload: $payload) {
              inquiry_record_id
              quote_date
              quote_status
              primary_service_provider_id
              property_id
              account_type
              client_individual_id
              client_entity_id
              accounts_contact_id
              id
            }
          }
        `;

const UPDATE_DEAL_AFTER_QUOTE_MUTATION = `
          mutation updateDeal(
            $id: PeterpmDealID!
            $payload: DealUpdateInput = null
          ) {
            updateDeal(
              query: [{ where: { id: $id } }]
              payload: $payload
            ) {
              inquiry_status
              quote_record_id
              inquiry_for_job_id
            }
          }
        `;

const CALC_JOBS_QUERY = `
          query calcJobs($inquiry_record_id: PeterpmDealID!) {
            calcJobs(query: [{ where: { inquiry_record_id: $inquiry_record_id } }]) {
              Inquiry_Record_ID: field(arg: ["Inquiry_Record", "id"])
              ID: field(arg: ["id"])
              Unique_ID: field(arg: ["unique_id"])
              Account_Type: field(arg: ["account_type"])
              Client_Entity_Name: field(arg: ["Client_Entity", "name"])
              Client_Entity_Phone: field(arg: ["Client_Entity", "phone"])
              Client_Individual_First_Name: field(arg: ["Client_Individual", "first_name"])
              Client_Individual_Last_Name: field(arg: ["Client_Individual", "last_name"])
              Client_Individual_SMS_Number: field(arg: ["Client_Individual", "sms_number"])
              Client_Individual_ID: field(arg: ["client_individual_id"])
              Accounts_Contact_ID: field(arg: ["accounts_contact_id"])
              Quote_Date: field(arg: ["quote_date"])
                @dateFormat(value: "DD/MM/YYYY")
              Quote_Total: field(arg: ["quote_total"])
              Quote_Status: field(arg: ["quote_status"])
              Follow_Up_Date: field(arg: ["follow_up_date"])
                @dateFormat(value: "DD/MM/YYYY")
              Date_Quote_Sent: field(arg: ["date_quote_sent"])
                @dateFormat(value: "DD/MM/YYYY")
              Date_Quoted_Accepted: field(arg: ["date_quoted_accepted"])
                @dateFormat(value: "DD/MM/YYYY")
                Bill_Approved_Admin: field(arg: ["bill_approved_admin"])
            }
          }
        `;

const CALC_JOB_BY_ID_QUERY = `
          query calcJobs($id: PeterpmJobID!) {
            calcJobs(query: [{ where: { id: $id } }]) {
              Inquiry_Record_ID: field(arg: ["Inquiry_Record", "id"])
              ID: field(arg: ["id"])
              Unique_ID: field(arg: ["unique_id"])
              Account_Type: field(arg: ["account_type"])
              Client_Entity_Name: field(arg: ["Client_Entity", "name"])
              Client_Entity_Phone: field(arg: ["Client_Entity", "phone"])
              Client_Individual_First_Name: field(arg: ["Client_Individual", "first_name"])
              Client_Individual_Last_Name: field(arg: ["Client_Individual", "last_name"])
              Client_Individual_SMS_Number: field(arg: ["Client_Individual", "sms_number"])
              Client_Individual_ID: field(arg: ["client_individual_id"])
              Accounts_Contact_ID: field(arg: ["accounts_contact_id"])
              Quote_Date: field(arg: ["quote_date"])
                @dateFormat(value: "DD/MM/YYYY")
              Quote_Total: field(arg: ["quote_total"])
              Quote_Status: field(arg: ["quote_status"])
              Follow_Up_Date: field(arg: ["follow_up_date"])
                @dateFormat(value: "DD/MM/YYYY")
              Date_Quote_Sent: field(arg: ["date_quote_sent"])
                @dateFormat(value: "DD/MM/YYYY")
              Date_Quoted_Accepted: field(arg: ["date_quoted_accepted"])
                @dateFormat(value: "DD/MM/YYYY")
                Bill_Approved_Admin: field(arg: ["bill_approved_admin"])
            }
          }
        `;

const CREATE_ACTIVITY_MUTATION = `
          mutation createActivity($payload: ActivityCreateInput = null) {
            createActivity(payload: $payload) {
              task
              option
              activity_price
              activity_text
              warranty
              note
              invoice_to_client
              job_id
              Service {
                id
              }
            }
          }
        `;

const UPDATE_ACTIVITY_MUTATION = `
          mutation updateActivity($id: PeterpmActivityID!, $payload: ActivityUpdateInput = null) {
            updateActivity(query: [{ where: { id: $id } }], payload: $payload) {
              id
            }
          }
        `;

const DELETE_ACTIVITY_MUTATION = `
          mutation deleteActivity($id: PeterpmActivityID!) {
            deleteActivity(query: [{ where: { id: $id } }]) {
              id
            }
          }
        `;

const DELETE_JOB_QUERY = `
  mutation deleteJob($id: PeterpmJobID!) {
    deleteJob(query: [{ where: { id: $id } }]) {
      id
    }
  }
`;

const CREATE_JOB_TASK = `
  mutation createTask($payload: TaskCreateInput = null) {
    createTask(payload: $payload) {
      Job_id 
      subject 
      date_due 
      details 
      assignee_id
    }
  }
`;

const JOB_TASKS_QUERY = `query calcTasks($Job_id: PeterpmJobID!) {
  calcTasks(query: [{ where: { Job_id: $Job_id } }]) {
    Subject: field(arg: ["subject"])
    Assignee_ID: field(arg: ["assignee_id"])
    Date_Due: field(arg: ["date_due"])
    Details: field(arg: ["details"])
    Assignee_First_Name: field(
      arg: ["Assignee", "first_name"]
    )
    Assignee_Last_Name: field(
      arg: ["Assignee", "last_name"]
    )
    AssigneeEmail: field(arg: ["Assignee", "email"])
    ID: field(arg: ["id"])
    Status: field(arg: ["status"])
  }
}
`;

const UPDATE_TASK_MUTATION = `
  mutation updateTask($id: PeterpmTaskID!, $payload: TaskUpdateInput = null) {
    updateTask(query: [{ where: { id: $id } }], payload: $payload) {
      assignee_id
      date_due
      status
    }
  }
`;

const CREATE_PROPERTY_CONTACT_MUTATION = `
    mutation upsertPropertyContact($payload: PropertyContactCreateInput!) {
      createPropertyContact(payload: $payload) {
        id
      }
    }
  `;

const CALC_COMPANIES_QUERY = `
  query calcCompanies(
    $limit: IntScalar
    $offset: IntScalar
    $searchExpression: String!
  ) {
    calcCompanies(
      query: [
        {
          where: {
            name: null
            _OPERATOR_: like
            _VALUE_EXPRESSION_: $searchExpression
          }
        }
      ]
      limit: $limit
      offset: $offset
    ) {
      ID: field(arg: ["id"])
      Name: field(arg: ["name"])
      Phone: field(arg: ["phone"])
      Address: field(arg: ["address"])
      City: field(arg: ["city"])
      State: field(arg: ["state"])
      Postal_Code: field(arg: ["postal_code"])
    }
  }
`;

const CALC_CONTACTS_QUERY = `
  query calcContacts(
    $limit: IntScalar
    $offset: IntScalar
    $searchExpression: String!
  ) {
    calcContacts(
      query: [
        {
          where: {
            first_name: null
            _OPERATOR_: like
            _VALUE_EXPRESSION_: $searchExpression
          }
        }
        {
          orWhere: {
            last_name: null
            _OPERATOR_: like
            _VALUE_EXPRESSION_: $searchExpression
          }
        }
        {
          orWhere: {
            email: null
            _OPERATOR_: like
            _VALUE_EXPRESSION_: $searchExpression
          }
        }
      ]
      limit: $limit
      offset: $offset
      orderBy: [{ path: ["first_name"], type: asc }]
    ) {
      Contact_ID: field(arg: ["id"])
      First_Name: field(arg: ["first_name"])
      Last_Name: field(arg: ["last_name"])
      Email: field(arg: ["email"])
      SMS_Number: field(arg: ["sms_number"])
    }
  }
`;

const CONTACT_BY_ID_QUERY = `
  query calcContacts($id: PeterpmContactID!) {
    calcContacts(query: [{ where: { id: $id } }]) {
      Contact_ID: field(arg: ["id"])
      First_Name: field(arg: ["first_name"])
      Last_Name: field(arg: ["last_name"])
      Email: field(arg: ["email"])
      SMS_Number: field(arg: ["sms_number"])
    }
  }
`;

const CREATE_CONTACT_MUTAION = `
  mutation createContact(
    $payload: ContactCreateInput = null
  ) {
    createContact(payload: $payload) {
      id
      first_name
      last_name
      email
      sms_number
    }
  }
`;

const CREATE_COMPANY_MUTATION = `
  mutation createCompany(
    $payload: CompanyCreateInput = null
  ) {
    createCompany(payload: $payload) {
      id
      name
      phone
      address
      city
      state
      postal_code
    }
  }
`;

const CREATE_AFFILIATION_MUTATION = `mutation createAffiliation(
  $payload: AffiliationCreateInput = null
) {
  createAffiliation(payload: $payload) {
    contact_id
    role
    property_id
    primary_owner_contact
    primary_resident_contact
    primary_property_manager_contact
  }
}
`;

const UPDATE_AFFILIATION_MUTATION = `mutation updateAffiliation(
  $id: PeterpmAffiliationID!,
  $payload: AffiliationUpdateInput = null
) {
  updateAffiliation(query: [{ where: { id: $id } }], payload: $payload) {
    id
    role
    contact_id
    property_id
    primary_owner_contact
    primary_resident_contact
    primary_property_manager_contact
  }
}
`;

const DELETE_AFFILIATION_QUERY =`mutation deleteAffiliation($id: PeterpmAffiliationID!) {
  deleteAffiliation(query: [{ where: { id: $id } }]) {
    id
  }
}`
;

const SUBSCRIBE_FORUM_POSTS = `
  subscription subscribeToForumPosts(
    $relatedinquiryid: PeterpmDealID!
    $relatedjobid: PeterpmJobID!
    $limit: IntScalar
    $offset: IntScalar
  ) {
    subscribeToForumPosts(
      query: [
        { where: { related_inquiry_id: $relatedinquiryid } }
        { orWhere: { related_job_id: $relatedjobid } }
      ]
      limit: $limit
      offset: $offset
      orderBy: [{ path: ["created_at"], type: asc }]
    ) {
      Author_ID: author_id
      Date_Added: created_at
      File: file
      ID: id
      Post_Copy: post_copy
      Post_Image: post_image
      Post_Status: post_status
      Unique_ID: unique_id
      Author {
        id
        first_name
        last_name
        display_name
        profile_image
      }
      ForumComments {
        created_at
        comment
        comment_status
        Author {
          id
          first_name
          last_name
          display_name
          profile_image
        }
      }
    }
  }
`;

const CREATE_FORUM_POST_MUTATION = `
  mutation createForumPost($payload: ForumPostCreateInput = null) {
    createForumPost(payload: $payload) {
      Author_ID: author_id
      File: file
      Post_Copy: post_copy
      Post_Image: post_image
    }
  }
`;

const CREATE_FORUM_COMMENT_MUTATION = `
  mutation createForumComment($payload: ForumCommentCreateInput = null) {
    createForumComment(payload: $payload) {
      forum_post_id
      comment
      author_id
    }
  }
`;

const DELETE_FORUM_COMMENT_MUTATION = `
  mutation deleteForumComment($id: PeterpmForumCommentID!) {
    deleteForumComment(query: [{ where: { id: $id } }]) {
      id
    }
  }
`;

const DELETE_FORUM_POST_MUTATION = `
  mutation deleteForumPost($id: PeterpmForumPostID!) {
    deleteForumPost(query: [{ where: { id: $id } }]) {
      id
    }
  }
`;
