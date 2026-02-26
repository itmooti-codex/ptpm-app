// PTPM — New Inquiry Page
// Consolidated IIFE: model (SDK queries/mutations) + view (DOM) + controller (orchestration).
// Depends on: config.js, utils.js, vitalsync.js, domain.js
(function () {
  'use strict';

  var config = window.AppConfig || {};
  var utils = window.PtpmUtils || {};

  // ─── Option Data ──────────────────────────────────────────────────────────────

  var NOISES = [
    { value: 768, text: 'Fighting' }, { value: 767, text: 'Walking' }, { value: 766, text: 'Heavy' },
    { value: 765, text: 'Footsteps' }, { value: 764, text: 'Running' }, { value: 763, text: 'Scurrying' },
    { value: 762, text: 'Thumping' }, { value: 761, text: 'Hissing' }, { value: 760, text: 'Shuffle' },
    { value: 759, text: 'Scratching' }, { value: 758, text: 'Can hear coming & going' },
    { value: 757, text: 'Movement' }, { value: 756, text: 'Gnawing' }, { value: 755, text: 'Rolling' },
    { value: 754, text: 'Dragging' }, { value: 753, text: 'Squeaking' }, { value: 752, text: 'Galloping' },
    { value: 751, text: 'Poss Pee' }, { value: 750, text: 'Fast' }, { value: 749, text: 'Slow' },
    { value: 748, text: 'Bad Smell' },
  ];

  var PEST_LOCATIONS = [
    { value: 735, text: 'Upper Ceiling' }, { value: 734, text: 'Between floors' },
    { value: 733, text: 'In Walls' }, { value: 732, text: 'In House' }, { value: 731, text: 'Chimney' },
    { value: 730, text: 'Garage' }, { value: 729, text: 'Kitchen' }, { value: 728, text: 'Hand Catch' },
    { value: 727, text: 'On roof' }, { value: 726, text: 'Underneath House' },
    { value: 725, text: 'Under Solar Panels' },
  ];

  var TIMES = [
    { value: '747', text: 'Dawn' }, { value: '746', text: 'Dusk' },
    { value: '745', text: 'Dusk & Dawn' }, { value: '744', text: 'During Day' },
    { value: '743', text: 'Middle of night' }, { value: '742', text: 'Night' },
    { value: '741', text: 'Early morning' }, { value: '740', text: 'Evening' },
    { value: '739', text: '1-2 am' }, { value: '738', text: '3-4 am' },
    { value: '737', text: '7 - 8 pm' }, { value: '736', text: '7.30-10 pm' },
  ];

  var BUILDING_FEATURES = [
    { value: '713', text: 'Brick' }, { value: '712', text: 'Concrete' },
    { value: '711', text: 'Flat Roof' }, { value: '710', text: 'Highset' },
    { value: '709', text: 'Iron Roof' }, { value: '708', text: 'Lowset' },
    { value: '707', text: 'PostWar' }, { value: '706', text: 'Queenslander' },
    { value: '705', text: 'Raked Ceiling' }, { value: '704', text: 'Sloping Block' },
    { value: '703', text: 'Super 6 / Fibro roof' }, { value: '702', text: 'Tile Roof' },
    { value: '701', text: 'Town house' }, { value: '700', text: 'Unit Block' },
    { value: '699', text: 'Warehouse' }, { value: '698', text: 'Wood' },
    { value: '697', text: 'Wood & Brick' },
  ];

  var STATE_OPTIONS = [
    { value: 'NSW', label: 'New South Wales' }, { value: 'QLD', label: 'Queensland' },
    { value: 'VIC', label: 'Victoria' }, { value: 'TAS', label: 'Tasmania' },
    { value: 'SA', label: 'South Australia' }, { value: 'ACT', label: 'Australian Capital Territory' },
    { value: 'NT', label: 'Northern Territory' }, { value: 'WA', label: 'Western Australia' },
  ];

  var INQUIRY_CONFIGS = [
    {
      id: 'service-inquiry',
      placeholder: 'Select',
      options: [
        'Pool Cleaning', 'Pigeon Removal', 'Lawn Maintenance', 'Insulation Installation',
        'Vacuum, remove and dispose all dust and debris', 'Wasp Removal', 'Window Cleaning',
        'Possum Roof', 'Rat Roof',
      ],
    },
    { id: 'inquiry-source', placeholder: 'Select', options: ['Web Form', 'Phone Call', 'Email', 'SMS'] },
    {
      id: 'inquiry-type',
      placeholder: 'Select',
      options: [
        'General Inquiry', 'Service Request or Quote', 'Product or Service Information',
        'Customer Support or Technical Assistance', 'Billing and Payment',
        'Appointment Scheduling or Rescheduling', 'Feedback or Suggestions',
        'Complaint or Issue Reporting', 'Partnership or Collaboration Inquiry',
        'Job Application or Career Opportunities', 'Media or Press Inquiry',
      ],
    },
    {
      id: 'referral-source',
      placeholder: 'Select Referral Source',
      options: ['Google', 'Bing', 'Facebook', 'Yellow Pages', 'Referral', 'Car Signage', 'Returning Customers', 'Other'],
    },
  ];

  var PROPERTY_TYPES = ['Residential', 'Commercial', 'Industrial', 'Rural'];
  var BUILDING_TYPES = ['House', 'Unit', 'Townhouse', 'Duplex', 'Apartment', 'Villa', 'Other'];
  var FOUNDATION_TYPES = ['Slab on Ground', 'Stumps', 'Piers', 'Strip Footing', 'Raft', 'Other'];

  var FIELD_GROUPS = [
    'related_data',
    'property_section',
    'property_contacts',
    'service_field',
    'service_name_field',
    'admin_notes_field',
    'referral_field',
    'resident_feedback_section',
    'noise_signs_field',
    'pest_active_field',
    'pest_location_field',
    'renovations_field',
    'date_required_field',
    'resident_availability_field',
    'customer_media_field',
    'internal_media_field',
  ];

  var INQUIRY_TYPE_RULES = {
    'General Inquiry': {
      required: ['inquiry_source', 'help'],
      visibleGroups: ['related_data', 'admin_notes_field', 'referral_field'],
      visibleRelatedTabs: ['properties', 'jobs', 'inquiries'],
    },
    'Service Request or Quote': {
      required: ['inquiry_source', 'help', 'service', 'property'],
      visibleGroups: FIELD_GROUPS.slice(),
      visibleRelatedTabs: ['properties', 'jobs', 'inquiries'],
    },
    'Product or Service Information': {
      required: ['inquiry_source', 'help'],
      visibleGroups: ['related_data', 'service_field', 'service_name_field', 'admin_notes_field', 'referral_field'],
      visibleRelatedTabs: ['inquiries'],
    },
    'Customer Support or Technical Assistance': {
      required: ['inquiry_source', 'help'],
      visibleGroups: ['related_data', 'service_field', 'admin_notes_field', 'referral_field'],
      visibleRelatedTabs: ['properties', 'jobs', 'inquiries'],
    },
    'Billing and Payment': {
      required: ['inquiry_source', 'help'],
      visibleGroups: ['related_data', 'admin_notes_field', 'referral_field'],
      visibleRelatedTabs: ['jobs', 'inquiries'],
    },
    'Appointment Scheduling or Rescheduling': {
      required: ['inquiry_source', 'help', 'property', 'date_required'],
      visibleGroups: ['related_data', 'property_section', 'property_contacts', 'service_field', 'admin_notes_field', 'date_required_field', 'resident_availability_field', 'referral_field'],
      visibleRelatedTabs: ['properties', 'jobs', 'inquiries'],
    },
    'Feedback or Suggestions': {
      required: ['inquiry_source', 'help'],
      visibleGroups: ['related_data', 'admin_notes_field', 'referral_field'],
      visibleRelatedTabs: ['properties', 'jobs', 'inquiries'],
    },
    'Complaint or Issue Reporting': {
      required: ['inquiry_source', 'help', 'property'],
      visibleGroups: ['related_data', 'property_section', 'property_contacts', 'service_field', 'admin_notes_field', 'resident_feedback_section', 'noise_signs_field', 'pest_active_field', 'pest_location_field', 'customer_media_field', 'internal_media_field'],
      visibleRelatedTabs: ['properties', 'jobs', 'inquiries'],
    },
    'Partnership or Collaboration Inquiry': {
      required: ['inquiry_source', 'help'],
      visibleGroups: ['related_data', 'admin_notes_field', 'referral_field'],
      visibleRelatedTabs: ['inquiries'],
    },
    'Job Application or Career Opportunities': {
      required: ['inquiry_source', 'help'],
      visibleGroups: ['admin_notes_field'],
      visibleRelatedTabs: [],
    },
    'Media or Press Inquiry': {
      required: ['inquiry_source', 'help'],
      visibleGroups: ['admin_notes_field', 'referral_field'],
      visibleRelatedTabs: [],
    },
  };

  // ─── State ────────────────────────────────────────────────────────────────────

  var state = {
    contacts: [],
    filteredContacts: [],
    contactId: null,
    propertyId: null,
    companyId: null,
    entityContactId: null,
    affiliationId: null,
    relatedData: { properties: [], jobs: [], inquiries: [] },
    relatedHasContact: false,
    relatedLoading: false,
    activeRelatedTab: 'properties',
    activeContactTab: 'individual',
    selectedPropertyCard: null,
    relatedRequestId: 0,
    entityRelatedRequestId: 0,
    plugin: null,
    models: {},
    urlPrefillApplied: false,
  };

  // ─── Model (SDK) ──────────────────────────────────────────────────────────────

  var MODEL_NAMES = {
    contact: 'PeterpmContact',
    company: 'PeterpmCompany',
    property: 'PeterpmProperty',
    deal: 'PeterpmDeal',
    job: 'PeterpmJob',
    service: 'PeterpmService',
    affiliation: 'PeterpmAffiliation',
    upload: 'PeterpmUpload',
  };

  function getModel(name) {
    if (!state.plugin) return Promise.reject(new Error('Plugin not available'));
    if (!state.models[name]) {
      var result = state.plugin.switchTo(MODEL_NAMES[name] || name);
      state.models[name] = result && typeof result.then === 'function' ? result : Promise.resolve(result);
    }
    var modelOrPromise = state.models[name];
    return typeof modelOrPromise.then === 'function' ? modelOrPromise : Promise.resolve(modelOrPromise);
  }

  function unwrapRecord(record) {
    if (!record || typeof record !== 'object') return record;
    if (typeof record.getState === 'function') {
      try {
        var s = record.getState();
        if (s && typeof s === 'object') return Object.assign({}, s);
      } catch (_) { /* ignore */ }
    }
    if (record.state && typeof record.state === 'object') {
      return Object.assign({}, record.state);
    }
    return record;
  }

  function fetchAllFromModel(modelName, queryFn) {
    return getModel(modelName).then(function (model) {
      var q = model.query();
      if (queryFn) q = queryFn(q);
      if (q.getOrInitQueryCalc) q.getOrInitQueryCalc();
      var stream = q.fetchDirect();
      if (stream && stream.pipe && typeof window.toMainInstance === 'function') {
        stream = stream.pipe(window.toMainInstance(true));
      }
      return stream && typeof stream.toPromise === 'function' ? stream.toPromise() : Promise.resolve(stream);
    });
  }

  function extractRecordsFromResult(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.resp)) return result.resp;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      var keys = Object.keys(result.data);
      for (var i = 0; i < keys.length; i++) {
        var val = result.data[keys[i]];
        if (Array.isArray(val)) return val;
      }
    }
    return [];
  }

  function loadMockContacts() {
    var list = (window.__MOCK_CONTACTS__ || []);
    state.contacts = list.map(function (r, i) { return formatContact(r, i); });
    renderContactList('');
  }

  function loadContacts() {
    return fetchAllFromModel('contact', function (q) {
      return q.deSelectAll()
        .select(['id', 'first_name', 'last_name', 'email', 'sms_number', 'office_phone'])
        .limit(500)
        .noDestroy();
    }).then(function (result) {
      var records = extractRecordsFromResult(result);
      state.contacts = (Array.isArray(records) ? records : []).map(function (r, i) { return formatContact(unwrapRecord(r), i); });
      if (state.contacts.length === 0 && (config.DEBUG || window.__ONTRAPORT_MOCK__)) loadMockContacts();
      else renderContactList('');
      return state.contacts;
    }).catch(function (err) {
      console.error('[NewInquiry] Failed to load contacts:', err);
      state.contacts = [];
      if (config.DEBUG || window.__ONTRAPORT_MOCK__) loadMockContacts();
      else renderContactList('');
    });
  }

  function formatContact(source, index) {
    var s = source || {};
    // VitalSync/Ontraport may return snake_case, camelCase, or PascalCase
    var firstName = str(s.first_name || s.firstName || s.First_Name);
    var lastName = str(s.last_name || s.lastName || s.Last_Name);
    var email = str(s.email || s.Email);
    var sms = str(s.sms_number || s.smsNumber || s.SMS_Number);
    var office = str(s.office_phone || s.officePhone || s.Office_Phone);
    var fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    var label = fullName || email || sms || office;
    if (!label && s.id != null) label = 'Contact #' + s.id;
    if (!label) label = 'Unknown Contact';
    var meta = email || sms || office || '';
    var contactId = s.contact_id || s.id || s.ID || (email ? 'contact-' + email : 'contact-' + Date.now() + '-' + index);
    return {
      id: contactId,
      label: label,
      meta: meta,
      fields: { contact_id: str(contactId), first_name: firstName, last_name: lastName, email: email, sms_number: sms, office_phone: office },
    };
  }

  function str(v) { return v == null ? '' : String(v).trim(); }

  function createContact(data) {
    return getModel('contact').then(function (model) {
      var mut = model.mutation();
      mut.createOne(data);
      return mut.execute(true).toPromise();
    });
  }

  function updateContact(id, data) {
    return getModel('contact').then(function (model) {
      var mut = model.mutation();
      mut.updateOne(id, data);
      return mut.execute(true).toPromise();
    });
  }

  function createInquiry(payload) {
    return getModel('deal').then(function (model) {
      var mut = model.mutation();
      mut.createOne(payload);
      return mut.execute(true).toPromise();
    });
  }

  function updateInquiry(id, payload) {
    return getModel('deal').then(function (model) {
      var mut = model.mutation();
      mut.updateOne(id, payload);
      return mut.execute(true).toPromise();
    });
  }

  function createProperty(data) {
    return getModel('property').then(function (model) {
      var mut = model.mutation();
      mut.createOne(data);
      return mut.execute(true).toPromise();
    });
  }

  function createAffiliation(data) {
    return getModel('affiliation').then(function (model) {
      var mut = model.mutation();
      var payload = {
        Contact_ID: { id: data.contact_id },
        Property_ID: { id: data.property_id },
        Role: data.role || '',
        Primary_Owner_Contact: data.isPrimary || false,
      };
      mut.createOne(payload);
      return mut.execute(true).toPromise();
    });
  }

  function updateAffiliation(id, data) {
    return getModel('affiliation').then(function (model) {
      var mut = model.mutation();
      mut.updateOne(id, data);
      return mut.execute(true).toPromise();
    });
  }

  function deleteAffiliation(id) {
    return getModel('affiliation').then(function (model) {
      var mut = model.mutation();
      mut.deleteOne(id);
      return mut.execute(true).toPromise();
    });
  }

  function fetchContactById(id) {
    var normalizedId = /^\d+$/.test(String(id)) ? parseInt(String(id), 10) : id;
    return fetchAllFromModel('contact', function (q) {
      return q
        .deSelectAll()
        .select(['id', 'first_name', 'last_name', 'email', 'sms_number', 'office_phone'])
        .where({ id: normalizedId })
        .limit(1)
        .noDestroy();
    }).then(function (r) {
      var raw = (r && (r.data !== undefined ? r.data : r.resp)) || [];
      var list = (Array.isArray(raw) ? raw : []).map(unwrapRecord);
      return { resp: list };
    });
  }

  function fetchContactByIdGraphQL(id) {
    var apiKey = (config.API_KEY && String(config.API_KEY).trim()) || (window.__MOCK_API_KEY__ && String(window.__MOCK_API_KEY__).trim()) || '';
    if (!apiKey) return Promise.resolve(null);
    var endpoint = (config.API_BASE || 'https://' + (config.SLUG || 'peterpm') + '.vitalstats.app') + '/api/v1/graphql';
    var query = 'query calcContacts($id: PeterpmContactID!) { calcContacts(query: [{ where: { id: $id } }], limit: 1, offset: 0) { id: field(arg: ["id"]) first_name: field(arg: ["first_name"]) last_name: field(arg: ["last_name"]) email: field(arg: ["email"]) sms_number: field(arg: ["sms_number"]) office_phone: field(arg: ["office_phone"]) } }';
    var variables = { id: /^\d+$/.test(String(id)) ? parseInt(String(id), 10) : id };
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Api-Key': apiKey },
      body: JSON.stringify({ query: query, variables: variables }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'GraphQL error');
        var rows = (json.data && json.data.calcContacts) || [];
        return rows && rows[0] ? rows[0] : null;
      })
      .catch(function () { return null; });
  }

  function fetchCompanyById(id) {
    if (!id) {
      return fetchAllFromModel('company', function (q) { return q.limit(200); })
        .then(function (r) { return { resp: (r && r.data || []).map(unwrapRecord) }; });
    }
    return fetchAllFromModel('company', function (q) {
      return q.where({ id: id }).limit(1);
    }).then(function (r) { return { resp: (r && r.data || []).map(unwrapRecord) }; });
  }

  function uniqueById(rows) {
    var byId = {};
    (rows || []).forEach(function (row) {
      var id = row && (row.id || row.ID);
      if (!id) return;
      byId[String(id)] = row;
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  function fetchPropertiesByContactId(contactId) {
    if (!contactId) return Promise.resolve([]);
    return fetchAllFromModel('affiliation', function (q) {
      return q.deSelectAll()
        .select(['id', 'contact_id', 'property_id'])
        .where({ Contact_ID: contactId })
        .include('Property', function (pq) {
          pq.deSelectAll().select(['id', 'property_name', 'address_1', 'address_2', 'suburb_town', 'state', 'postal_code']);
        })
        .limit(200)
        .noDestroy();
    }).then(function (r) {
      var rows = extractRecordsFromResult(r).map(unwrapRecord);
      var props = rows.map(function (row) { return row.Property || row.property || null; }).filter(Boolean).map(unwrapRecord);
      return uniqueById(props);
    }).catch(function () { return []; });
  }

  function fetchJobsByContactId(contactId) {
    if (!contactId) return Promise.resolve([]);
    return fetchAllFromModel('job', function (q) {
      return q.deSelectAll()
        .select(['id', 'unique_id', 'status', 'created_at', 'date_completed'])
        .where({ client_individual_id: contactId })
        .include('Primary_Service_Provider', function (spq) {
          spq.deSelectAll().select(['id']).include('Contact_Information', function (cq) {
            cq.deSelectAll().select(['first_name', 'last_name']);
          });
        })
        .include('Property', function (pq) {
          pq.deSelectAll().select(['property_name']);
        })
        .limit(200)
        .noDestroy();
    }).then(function (r) {
      return extractRecordsFromResult(r).map(unwrapRecord).map(function (row) {
        var provider = row.Primary_Service_Provider || row.primary_service_provider || {};
        var contact = provider.Contact_Information || provider.contact_information || {};
        var providerName = [contact.first_name || contact.First_Name, contact.last_name || contact.Last_Name].filter(Boolean).join(' ').trim();
        var property = row.Property || row.property || {};
        return Object.assign({}, row, {
          provider_name: providerName,
          property_name: row.property_name || row.Property_Property_Name || property.property_name || property.Property_Name || '',
        });
      });
    }).catch(function () { return []; });
  }

  function fetchJobsByCompanyId(companyId) {
    if (!companyId) return Promise.resolve([]);
    return fetchAllFromModel('job', function (q) {
      return q.deSelectAll()
        .select(['id', 'unique_id', 'status', 'created_at', 'date_completed'])
        .where({ client_entity_id: companyId })
        .include('Primary_Service_Provider', function (spq) {
          spq.deSelectAll().select(['id']).include('Contact_Information', function (cq) {
            cq.deSelectAll().select(['first_name', 'last_name']);
          });
        })
        .include('Property', function (pq) {
          pq.deSelectAll().select(['property_name']);
        })
        .limit(200)
        .noDestroy();
    }).then(function (r) {
      return extractRecordsFromResult(r).map(unwrapRecord).map(function (row) {
        var provider = row.Primary_Service_Provider || row.primary_service_provider || {};
        var contact = provider.Contact_Information || provider.contact_information || {};
        var providerName = [contact.first_name || contact.First_Name, contact.last_name || contact.Last_Name].filter(Boolean).join(' ').trim();
        var property = row.Property || row.property || {};
        return Object.assign({}, row, {
          provider_name: providerName,
          property_name: row.property_name || row.Property_Property_Name || property.property_name || property.Property_Name || '',
        });
      });
    }).catch(function () { return []; });
  }

  function fetchInquiriesByContactId(contactId) {
    if (!contactId) return Promise.resolve([]);
    return fetchAllFromModel('deal', function (q) {
      return q.deSelectAll()
        .select(['id', 'unique_id', 'inquiry_status', 'service_type', 'created_at'])
        .where({ primary_contact_id: contactId })
        .limit(200)
        .noDestroy();
    }).then(function (r) {
      return extractRecordsFromResult(r).map(unwrapRecord).map(function (row) {
        return Object.assign({}, row, {
          status: row.status || row.inquiry_status || row.Inquiry_Status || '',
          service_name: row.service_name || row.service_type || row.Service_Type || '',
        });
      });
    }).catch(function () { return []; });
  }

  function fetchInquiriesByCompanyId(companyId) {
    if (!companyId) return Promise.resolve([]);
    return fetchAllFromModel('deal', function (q) {
      return q.deSelectAll()
        .select(['id', 'unique_id', 'inquiry_status', 'service_type', 'created_at'])
        .where({ company_id: companyId })
        .limit(200)
        .noDestroy();
    }).then(function (r) {
      return extractRecordsFromResult(r).map(unwrapRecord).map(function (row) {
        return Object.assign({}, row, {
          status: row.status || row.inquiry_status || row.Inquiry_Status || '',
          service_name: row.service_name || row.service_type || row.Service_Type || '',
        });
      });
    }).catch(function () { return []; });
  }

  function fetchRelated(context) {
    var contactId = context && context.contactId;
    var companyId = context && context.companyId;
    if (!contactId && !companyId) return Promise.resolve({ properties: [], jobs: [], inquiries: [] });
    return Promise.all([
      fetchPropertiesByContactId(contactId),
      Promise.all([fetchJobsByContactId(contactId), fetchJobsByCompanyId(companyId)]).then(function (r) { return uniqueById((r[0] || []).concat(r[1] || [])); }),
      Promise.all([fetchInquiriesByContactId(contactId), fetchInquiriesByCompanyId(companyId)]).then(function (r) { return uniqueById((r[0] || []).concat(r[1] || [])); }),
    ]).then(function (results) {
      return { properties: results[0], jobs: results[1], inquiries: results[2] };
    });
  }

  // Same property fields as inquiryDetails.js fetchCalcProperties / getPropertyInfoPayload / editBuindingDesc
  var PROPERTY_SELECT_FIELDS = [
    'id', 'address_1', 'address_2', 'suburb_town', 'state', 'postal_code', 'property_name',
    'lot_number', 'unit_number', 'property_type', 'building_type', 'building_type_other',
    'foundation_type', 'building_features_options_as_text', 'bedrooms', 'stories', 'manhole',
    'building_age'
  ];

  function fetchPropertyById(id) {
    return fetchAllFromModel('property', function (q) {
      return q.where({ id: id }).limit(1).deSelectAll().select(PROPERTY_SELECT_FIELDS);
    }).then(function (r) {
      var raw = (r && (r.resp !== undefined ? r.resp : r.data)) || [];
      var list = (Array.isArray(raw) ? raw : []).map(unwrapRecord);
      return { resp: list };
    });
  }

  /** Normalize string for address matching (trim, lowercase, collapse spaces) */
  function normalizeForMatch(s) {
    if (s == null) return '';
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Fetch properties that might match the given address (for "use existing" after Google pick).
   * Fetches a bounded set then filters client-side by address, suburb, state, postcode.
   */
  function fetchMatchingProperties(addr1, suburb, state, postcode) {
    var normalizedAddr = normalizeForMatch(addr1);
    var normalizedSuburb = normalizeForMatch(suburb);
    var normPost = normalizeForMatch(postcode);
    var normState = state ? String(state).trim().toUpperCase() : '';

    return fetchAllFromModel('property', function (q) {
      return q.deSelectAll()
        .select(['id', 'address_1', 'address_2', 'suburb_town', 'state', 'postal_code', 'property_name'])
        .limit(300);
    }).then(function (r) {
      var raw = (r && (r.data !== undefined ? r.data : r.resp)) || [];
      var list = (Array.isArray(raw) ? raw : []).map(unwrapRecord);
      return list.filter(function (p) {
        var pAddr = normalizeForMatch(getPropertyValue(p, 'address_1'));
        var pSuburb = normalizeForMatch(getPropertyValue(p, 'suburb_town'));
        var pState = (getPropertyValue(p, 'state') || '').toString().trim().toUpperCase();
        var pPost = normalizeForMatch(getPropertyValue(p, 'postal_code'));
        if (normState && pState !== normState) return false;
        if (normPost && pPost !== normPost) return false;
        if (normalizedSuburb && pSuburb && pSuburb !== normalizedSuburb && pSuburb.indexOf(normalizedSuburb) === -1 && normalizedSuburb.indexOf(pSuburb) === -1) return false;
        if (normalizedAddr && pAddr && pAddr !== normalizedAddr && pAddr.indexOf(normalizedAddr) === -1 && normalizedAddr.indexOf(pAddr) === -1) return false;
        return true;
      });
    }).catch(function () { return []; });
  }

  /**
   * Normalize API property record the same way as inquiryDetails.js mapPropertyRecord:
   * snake_case ?? PascalCase so form always gets a consistent shape. Also merges in any
   * other record keys (normalized to snake_case) so API variants are not missed.
   */
  function mapPropertyRecordToForm(record) {
    if (!record || typeof record !== 'object') return record;
    var r = record;
    var out = {
      address_1: r.address_1 ?? r.Address_1 ?? '',
      address_2: r.address_2 ?? r.Address_2 ?? '',
      suburb_town: r.suburb_town ?? r.Suburb_Town ?? '',
      state: r.state ?? r.State ?? '',
      postal_code: r.postal_code ?? r.Postal_Code ?? '',
      property_name: r.property_name ?? r.Property_Name ?? '',
      lot_number: r.lot_number ?? r.Lot_Number ?? '',
      unit_number: r.unit_number ?? r.Unit_Number ?? '',
      property_type: r.property_type ?? r.Property_Type ?? '',
      building_type: r.building_type ?? r.Building_Type ?? '',
      building_type_other: r.building_type_other ?? r.Building_Type_Other ?? '',
      foundation_type: r.foundation_type ?? r.Foundation_Type ?? '',
      building_features_options_as_text: (r.building_features_options_as_text ?? r.Building_Features_Options_As_Text ?? r.building_features ?? r.Building_Features ?? ''),
      bedrooms: r.bedrooms ?? r.Bedrooms ?? '',
      stories: r.stories ?? r.Stories ?? '',
      manhole: r.manhole ?? r.Manhole ?? '',
      building_age: r.building_age ?? r.Building_Age ?? '',
      id: r.id ?? r.ID
    };
    for (var k in r) {
      if (!r.hasOwnProperty(k)) continue;
      var norm = k.replace(/-/g, '_').toLowerCase();
      if (out[norm] === undefined || out[norm] === '') {
        var v = r[k];
        if (v !== undefined && v !== null) out[norm] = v;
      }
    }
    return out;
  }

  /** Get a property field value trying common API key variants (snake_case, PascalCase, etc.) */
  function getPropertyValue(data, normalizedKey) {
    if (!data || typeof data !== 'object') return undefined;
    var keys = [normalizedKey];
    var parts = normalizedKey.split('_');
    var pascal = parts.map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); }).join('_');
    keys.push(pascal);
    if (normalizedKey === 'building_features_options_as_text') {
      keys.push('building_features', 'Building_Features');
    }
    if (normalizedKey === 'property_type') keys.push('Property_Type');
    if (normalizedKey === 'building_type') keys.push('Building_Type');
    if (normalizedKey === 'foundation_type') keys.push('Foundation_Type');
    for (var k in data) {
      if (data.hasOwnProperty(k) && k.toLowerCase().replace(/-/g, '_') === normalizedKey) keys.push(k);
    }
    for (var i = 0; i < keys.length; i++) {
      var v = data[keys[i]];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }

  function fetchAffiliationByPropertyId(propertyId, callback) {
    return fetchAllFromModel('affiliation', function (q) {
      return q.where({ Property_ID: propertyId }).limit(50);
    }).then(function (r) {
      var data = (r && r.data || []).map(unwrapRecord);
      if (callback) callback(data);
      return data;
    });
  }

  function createUpload(data) {
    return getModel('upload').then(function (model) {
      var mut = model.mutation();
      mut.createOne(data);
      return mut.execute(true).toPromise();
    });
  }

  function createAlert(data) {
    // Uses the notification/alert model (PeterpmDeal or custom)
    // In the original, this creates an alert record via the SDK
    console.log('[NewInquiry] Alert created:', data);
  }

  // ─── HTML Helpers ─────────────────────────────────────────────────────────────

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      var d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
      return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) { return '—'; }
  }

  function $(id) { return document.getElementById(id); }
  function $q(sel) { return document.querySelector(sel); }
  function $qa(sel) { return Array.from(document.querySelectorAll(sel)); }

  // ─── View: Contact Search ─────────────────────────────────────────────────────

  function renderContactList(query) {
    var root = $q('[data-search-root="contact-individual"]');
    if (!root) return;
    var results = root.querySelector('[data-search-results]');
    var empty = root.querySelector('[data-search-empty]');
    if (!results) return;

    var term = (query || '').trim().toLowerCase();
    var items = term
      ? state.contacts.filter(function (c) {
          return [c.label, c.meta].filter(Boolean).some(function (v) { return v.toLowerCase().indexOf(term) >= 0; });
        })
      : state.contacts.slice();

    state.filteredContacts = items;
    results.innerHTML = '';

    if (!items.length) {
      results.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      return;
    }
    results.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');

    items.forEach(function (item, idx) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.optionIndex = String(idx);
      btn.className = 'w-full flex flex-col gap-1 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50';
      var label = document.createElement('span');
      label.className = 'font-normal text-xs text-neutral-700';
      label.textContent = item.label || 'Unnamed Contact';
      btn.appendChild(label);
      if (item.meta) {
        var meta = document.createElement('span');
        meta.className = 'text-xs text-neutral-500';
        meta.textContent = item.meta;
        btn.appendChild(meta);
      }
      li.appendChild(btn);
      results.appendChild(li);
    });
  }

  function bindContactSearch() {
    var root = $q('[data-search-root="contact-individual"]');
    if (!root) return;
    var input = root.querySelector('[data-search-input]');
    var panel = root.querySelector('[data-search-panel]');
    var results = root.querySelector('[data-search-results]');
    var addBtn = root.querySelector('[data-search-add]');

    if (input) {
      input.addEventListener('focus', function () {
        if (panel) panel.classList.remove('hidden');
        renderContactList(input.value);
      });
      input.addEventListener('input', function (e) {
        renderContactList(e.target.value);
        if (panel) panel.classList.remove('hidden');
      });
    }

    if (results) {
      results.addEventListener('mousedown', function (e) {
        var btn = e.target.closest('button[data-option-index]');
        if (!btn) return;
        e.preventDefault();
        var idx = Number(btn.dataset.optionIndex);
        var contact = state.filteredContacts[idx];
        if (contact) {
          if (panel) panel.classList.add('hidden');
          handleContactSelected(contact);
        }
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', function (e) {
        e.preventDefault();
        enterManualMode();
      });
    }

    document.addEventListener('click', function (e) {
      if (root && !root.contains(e.target) && panel) {
        panel.classList.add('hidden');
      }
    });
  }

  function handleContactSelected(contact) {
    if (!contact) return;
    state.contactId = contact.id;
    state.companyId = null;
    populateContactFields(contact);
    clearPropertyFields();
    showRelatedLoading();
    loadRelatedData({ contactId: state.contactId });
  }

  function populateContactFields(contact) {
    var section = $q('[data-contact-section="individual"]');
    if (!section || !contact || !contact.fields) return;

    var viewBtn = $('view-contact-detail');
    if (viewBtn && contact.id) viewBtn.classList.remove('hidden');

    Object.keys(contact.fields).forEach(function (field) {
      var input = section.querySelector('[data-contact-field="' + field + '"]');
      if (input) {
        input.value = contact.fields[field] || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    var searchInput = $q('[data-search-root="contact-individual"] [data-search-input]');
    if (searchInput && contact.label) {
      searchInput.value = contact.label;
    }

    hideContactFooter();
    clearFeedback();
    state.relatedHasContact = true;
    syncWorkRequested();
  }

  function enterManualMode() {
    clearFeedback();
    var panel = $q('[data-search-root="contact-individual"] [data-search-panel]');
    if (panel) panel.classList.add('hidden');
    showContactFooter();

    var section = $q('[data-contact-section="individual"]');
    if (section) {
      var contactIdInput = section.querySelector('[data-contact-field="contact_id"]');
      if (contactIdInput) contactIdInput.value = '';
      var inputs = $qa('[data-contact-section="individual"] [data-contact-field]');
      inputs.forEach(function (input) {
        if (input.dataset.contactField !== 'contact_id') {
          input.value = '';
        }
      });
    }

    showFeedback('Enter contact details and click Add New Contact.', 'info');
  }

  function showContactFooter() {
    var footer = $('contact-add-new-footer');
    if (footer) footer.classList.remove('hidden');
  }

  function hideContactFooter() {
    var footer = $('contact-add-new-footer');
    if (footer) footer.classList.add('hidden');
  }

  function showFeedback(msg, tone) {
    var el = $q('[data-contact-feedback]');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden', 'text-rose-600', 'text-emerald-600', 'text-slate-600');
    el.classList.add(tone === 'success' ? 'text-emerald-600' : tone === 'info' ? 'text-slate-600' : 'text-rose-600');
  }

  function clearFeedback() {
    var el = $q('[data-contact-feedback]');
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
  }

  function syncWorkRequested() {
    var section = $q('[data-contact-section="' + state.activeContactTab + '"]');
    if (!section) return;
    var cb = section.querySelector('[data-same-as-contact]');
    if (!cb || !cb.checked) return;
    var first = section.querySelector('[data-contact-field="first_name"]');
    var last = section.querySelector('[data-contact-field="last_name"]');
    var work = section.querySelector('[data-contact-field="work_requested_by"]');
    if (!work) return;
    var name = [first && first.value, last && last.value].filter(Boolean).join(' ').trim();
    work.value = name;
  }

  // ─── View: Contact Tabs (Individual / Entity) ─────────────────────────────────

  function bindContactTabs() {
    var indBtn = $('individual');
    var entBtn = $('entity');
    if (!indBtn || !entBtn) return;

    indBtn.addEventListener('click', function (e) {
      e.preventDefault();
      switchContactSection('individual');
    });

    entBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showSwitchAccountTypeModal();
    });

    switchContactSection('individual');
  }

  function switchContactSection(type) {
    var target = type === 'entity' ? 'entity' : 'individual';
    state.activeContactTab = target;

    ['individual', 'entity'].forEach(function (key) {
      var section = $q('[data-contact-section="' + key + '"]');
      var btn = $(key);
      var active = key === target;
      if (section) section.classList.toggle('hidden', !active);
      if (btn) {
        var span = btn.querySelector('span');
        btn.classList.toggle('bg-blue-700', active);
        btn.classList.toggle('bg-white', !active);
        btn.classList.toggle('shadow-sm', active);
        btn.classList.toggle('outline', !active);
        btn.classList.toggle('outline-1', !active);
        btn.classList.toggle('outline-slate-500', !active);
        if (span) {
          span.classList.toggle('text-white', active);
          span.classList.toggle('text-slate-500', !active);
        }
      }
    });

    var companySection = $('company-name-section');
    if (companySection) companySection.classList.toggle('hidden', target === 'individual');
  }

  // ─── View: Related Data ───────────────────────────────────────────────────────

  function bindRelatedTabs() {
    var tabs = $qa('[data-related-tab]');
    tabs.forEach(function (btn) {
      var tab = btn.dataset.relatedTab;
      if (!tab) return;
      btn.dataset.baseLabel = btn.textContent.trim().replace(/\s*\(.*?\)$/, '');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        setActiveRelatedTab(tab);
      });
    });
  }

  function setActiveRelatedTab(tab) {
    var target = ['properties', 'jobs', 'inquiries'].indexOf(tab) >= 0 ? tab : 'properties';
    state.activeRelatedTab = target;

    $qa('[data-related-tab]').forEach(function (btn) {
      var isActive = btn.dataset.relatedTab === target;
      btn.classList.toggle('bg-blue-50', isActive);
      btn.classList.toggle('text-blue-700', isActive);
      btn.classList.toggle('text-slate-500', !isActive);
    });

    $qa('[data-related-panel]').forEach(function (panel) {
      panel.classList.toggle('hidden', panel.dataset.relatedPanel !== target);
    });

    updateRelatedUI();
  }

  function getInquiryTypeRule() {
    var typeEl = $('inquiry-type');
    var type = typeEl ? String(typeEl.value || '').trim() : '';
    return INQUIRY_TYPE_RULES[type] || null;
  }

  function setFieldGroupVisible(group, visible) {
    $qa('[data-field-group="' + group + '"]').forEach(function (el) {
      el.classList.toggle('hidden', !visible);
    });
  }

  function applyRelatedTabVisibility(visibleTabs) {
    var tabs = ['properties', 'jobs', 'inquiries'];
    var visibleSet = {};
    (visibleTabs || tabs).forEach(function (t) { visibleSet[t] = true; });
    tabs.forEach(function (tab) {
      var tabEl = $q('[data-related-tab="' + tab + '"]');
      var panelEl = $q('[data-related-panel="' + tab + '"]');
      var isVisible = !!visibleSet[tab];
      if (tabEl) tabEl.classList.toggle('hidden', !isVisible);
      if (panelEl && !isVisible) panelEl.classList.add('hidden');
    });
    var currentStillVisible = !!visibleSet[state.activeRelatedTab];
    if (!currentStillVisible) {
      state.activeRelatedTab = tabs.find(function (t) { return !!visibleSet[t]; }) || 'properties';
    }
    if (Object.keys(visibleSet).length === 0) {
      setFieldGroupVisible('related_data', false);
    } else {
      setFieldGroupVisible('related_data', true);
      setActiveRelatedTab(state.activeRelatedTab);
    }
  }

  function applyInquiryTypeVisibility() {
    var rule = getInquiryTypeRule();
    var alwaysVisible = ['related_data', 'property_section', 'property_contacts', 'service_field', 'service_name_field', 'admin_notes_field', 'referral_field', 'resident_feedback_section', 'noise_signs_field', 'pest_active_field', 'pest_location_field', 'renovations_field', 'date_required_field', 'resident_availability_field', 'customer_media_field', 'internal_media_field'];
    if (!rule) {
      alwaysVisible.forEach(function (group) { setFieldGroupVisible(group, false); });
      setFieldGroupVisible('service_field', true);
      setFieldGroupVisible('help_field', true);
      setFieldGroupVisible('inquiry_source_field', true);
      setFieldGroupVisible('inquiry_type_field', true);
      applyRelatedTabVisibility([]);
      return;
    }
    alwaysVisible.forEach(function (group) { setFieldGroupVisible(group, false); });
    setFieldGroupVisible('inquiry_type_field', true);
    setFieldGroupVisible('inquiry_source_field', true);
    setFieldGroupVisible('help_field', true);
    (rule.visibleGroups || []).forEach(function (group) { setFieldGroupVisible(group, true); });
    applyRelatedTabVisibility(rule.visibleRelatedTabs || ['properties', 'jobs', 'inquiries']);
  }

  function bindInquiryTypeChange() {
    var typeEl = $('inquiry-type');
    if (!typeEl) return;
    typeEl.addEventListener('change', function () {
      applyInquiryTypeVisibility();
    });
  }

  function updateRelatedUI() {
    var counts = {
      properties: state.relatedData.properties.length,
      jobs: state.relatedData.jobs.length,
      inquiries: state.relatedData.inquiries.length,
    };

    $qa('[data-related-tab]').forEach(function (btn) {
      var tab = btn.dataset.relatedTab;
      var base = btn.dataset.baseLabel || tab;
      btn.textContent = base + ' (' + (counts[tab] || 0) + ')';
    });

    $qa('[data-related-panel]').forEach(function (panel) {
      var key = panel.dataset.relatedPanel;
      var items = state.relatedData[key] || [];
      if (state.relatedLoading) { panel.innerHTML = '<div class="text-center py-4 text-sm text-slate-400">Loading...</div>'; return; }
      if (!items.length) {
        panel.innerHTML = state.relatedHasContact
          ? '<div class="text-center py-4 text-sm text-slate-400">No ' + key + ' found.</div>'
          : '';
        return;
      }
      panel.innerHTML = items.map(function (item) { return renderRelatedCard(key, item); }).join('');

      // Bind property card clicks
      if (key === 'properties') {
        panel.querySelectorAll('article').forEach(function (article) {
          article.addEventListener('click', function () {
            selectPropertyFromRelated(article.id, article);
          });
        });
      }
    });

    var banner = $q('[data-related-banner-text]');
    if (banner) {
      if (!state.relatedHasContact) banner.textContent = 'Select a contact to view related details.';
      else if (state.relatedLoading) banner.textContent = 'Loading related data...';
      else banner.textContent = 'Select a property to populate details.';
    }
  }

  function showRelatedLoading() {
    state.relatedHasContact = true;
    state.relatedLoading = true;
    state.relatedData = { properties: [], jobs: [], inquiries: [] };
    updateRelatedUI();
  }

  function renderRelatedData(related) {
    state.relatedHasContact = true;
    state.relatedLoading = false;
    state.relatedData = {
      properties: Array.isArray(related.properties) ? related.properties : [],
      jobs: Array.isArray(related.jobs) ? related.jobs : [],
      inquiries: Array.isArray(related.inquiries) ? related.inquiries : [],
    };
    setActiveRelatedTab(state.activeRelatedTab);
  }

  function loadRelatedData(context) {
    var contactId = context && context.contactId;
    var companyId = context && context.companyId;
    if (!contactId && !companyId) { state.relatedData = { properties: [], jobs: [], inquiries: [] }; updateRelatedUI(); return; }
    var reqId = ++state.relatedRequestId;
    showRelatedLoading();
    fetchRelated({ contactId: contactId, companyId: companyId }).then(function (data) {
      if (state.relatedRequestId !== reqId) return;
      renderRelatedData(data);
    }).catch(function () {
      if (state.relatedRequestId !== reqId) return;
      renderRelatedData({ properties: [], jobs: [], inquiries: [] });
    });
  }

  function renderRelatedCard(type, item) {
    if (type === 'jobs') return renderJobCard(item);
    if (type === 'inquiries') return renderInquiryCard(item);
    return renderPropertyCard(item);
  }

  function renderPropertyCard(item) {
    var title = escapeHtml(item.property_name || item.unique_id || item.id || 'Property');
    var address = escapeHtml(item.address_1 || item.address || 'Address unavailable');
    var owner = escapeHtml(item.owner_name || '');
    return '<article id="' + (item.id || '') + '" class="flex gap-2 items-center rounded border border-slate-200 p-3 cursor-pointer hover:bg-blue-50 transition">' +
      '<div class="flex-1 space-y-1">' +
        '<p class="text-sm font-medium text-neutral-700">' + title + '</p>' +
        '<p class="text-xs text-slate-500">' + address + '</p>' +
        (owner ? '<p class="text-xs text-slate-400">Owner: <span class="font-medium text-slate-600">' + owner + '</span></p>' : '') +
      '</div>' +
      (item.map_url ? '<a href="' + escapeHtml(item.map_url) + '" target="_blank" rel="noopener" class="text-blue-700 text-xs" onclick="event.stopPropagation()">View on Map</a>' : '') +
    '</article>';
  }

  function renderJobCard(item) {
    return '<article class="rounded border border-slate-200 p-3">' +
      '<div class="flex items-start justify-between gap-3"><div class="space-y-1">' +
        '<p class="text-sm font-semibold text-sky-900">#' + escapeHtml(item.unique_id || item.id) + '</p>' +
        '<p class="text-xs text-slate-500">Created: ' + formatDate(item.created_at) + '</p>' +
        '<p class="text-xs text-slate-500">' + escapeHtml(item.provider_name || '') + '</p>' +
      '</div>' +
      '<span class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">' + escapeHtml(item.status || '') + '</span>' +
      '</div></article>';
  }

  function renderInquiryCard(item) {
    return '<article class="rounded border border-slate-200 p-3">' +
      '<div class="flex items-start justify-between gap-3"><div class="space-y-1">' +
        '<p class="text-sm font-semibold text-sky-900">#' + escapeHtml(item.unique_id || item.id) + '</p>' +
        '<p class="text-xs text-slate-500">' + escapeHtml(item.service_name || '') + '</p>' +
        '<p class="text-xs text-slate-500">Created: ' + formatDate(item.created_at) + '</p>' +
      '</div>' +
      '<span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">' + escapeHtml(item.status || '') + '</span>' +
      '</div></article>';
  }

  function selectPropertyFromRelated(propertyId, card) {
    // Clear previous selection
    if (state.selectedPropertyCard) {
      state.selectedPropertyCard.classList.remove('bg-blue-50', 'border-blue-300');
    }
    state.propertyId = propertyId;
    state.selectedPropertyCard = card;
    if (card) {
      card.classList.add('bg-blue-50', 'border-blue-300');
    }
    var input = $('selected-property-id');
    if (input) input.value = propertyId || '';

    // Load property details into form (same pattern as inquiryDetails: fetch then applyPropertyToForms)
    if (propertyId) {
      fetchPropertyById(propertyId).then(function (result) {
        if (result.resp && result.resp[0]) {
          var normalized = mapPropertyRecordToForm(result.resp[0]);
          populatePropertyFields(normalized);
        }
        fetchAffiliationByPropertyId(propertyId, function (rows) {
          renderPropertyContactTable(rows);
        });
      });
    }
  }

  // ─── View: Property Information ───────────────────────────────────────────────

  function clearPropertyFields() {
    $qa('#property-information input, #property-information select').forEach(function (el) {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    });
  }

  function populatePropertyFields(data) {
    if (!data || typeof data !== 'object') return;
    var normalizedKey, value, strVal;
    // Use direct key first (data from mapPropertyRecordToForm has snake_case keys), then getPropertyValue fallback
    function getVal(key) {
      if (data[key] !== undefined) return data[key];
      return getPropertyValue(data, key);
    }

    $qa('#property-information [data-property-id]').forEach(function (el) {
      var key = el.dataset.propertyId;
      if (!key || key === 'search-properties') return;
      normalizedKey = key.replace(/-/g, '_').toLowerCase();
      value = getVal(normalizedKey);
      if (value === undefined || value === null) return;

      strVal = (value === true || value === false || typeof value === 'number') ? String(value) : String(value).trim();
      if (normalizedKey === 'manhole' && (value === true || value === false || value === 1 || value === 0)) {
        strVal = value === true || value === 1 ? 'Yes' : 'No';
      }
      if (el.tagName === 'UL') {
        var parts = strVal.split(/\*\/\*|\s*,\s*/).map(function (p) { return p.trim(); }).filter(Boolean);
        el.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          var match = parts.indexOf(cb.value) !== -1;
          if (!match && cb.value && parts.some(function (p) { return p.toLowerCase() === (cb.value || '').toLowerCase(); })) match = true;
          cb.checked = match;
        });
        return;
      }
      if (el.type === 'checkbox') {
        el.checked = Boolean(value);
        return;
      }
      if (el.tagName === 'SELECT') {
        var opts = el.options;
        var strValLower = strVal.toLowerCase();
        for (var i = 0; i < opts.length; i++) {
          if (opts[i].value == value || opts[i].value === strVal) {
            el.value = opts[i].value;
            return;
          }
          if (opts[i].text && opts[i].text.trim().toLowerCase() === strValLower) {
            el.value = opts[i].value;
            return;
          }
        }
        return;
      }
      el.value = strVal;
    });

    var searchInput = $('search-properties') || $q('[data-property-id="search-properties"]');
    if (searchInput) {
      var display = getVal('property_name') || getVal('address_1') ||
        [getVal('address_1'), getVal('suburb_town'), getVal('state')].filter(Boolean).join(', ');
      if (display) searchInput.value = String(display).trim();
    }
  }

  function collectPropertyFields() {
    var obj = {};
    $qa('#property-information [data-property-id]').forEach(function (el) {
      var key = el.dataset.propertyId;
      if (!key || key === 'search-properties') return;
      var normalizedKey = key.replace(/-/g, '_').toLowerCase();

      if (el.tagName === 'UL') {
        var checked = Array.from(el.querySelectorAll('input:checked')).map(function (cb) { return cb.value; });
        if (checked.length) obj[normalizedKey] = checked.map(function (v) { return '*/*' + v + '*/*'; }).join('');
      } else if (el.type === 'checkbox') {
        if (!obj[normalizedKey]) obj[normalizedKey] = [];
        if (el.checked) obj[normalizedKey].push(el.value || true);
      } else {
        obj[normalizedKey] = (el.value || '').trim();
      }
    });
    return obj;
  }

  // ─── View: Property Contact Table ─────────────────────────────────────────────

  function renderPropertyContactTable(rows) {
    var container = $q('[data-property-contact-id="table"]');
    var svg = $('property-contact-svg');
    var addBtn = $('add-contact-btn');
    if (!container) return;
    container.innerHTML = '';

    if (!rows || !rows.length) {
      if (svg) svg.style.display = 'flex';
      if (addBtn) addBtn.classList.add('hidden');
      return;
    }
    if (svg) svg.style.display = 'none';
    if (addBtn) addBtn.classList.remove('hidden');

    var table = document.createElement('table');
    table.className = 'min-w-full table-auto border-collapse text-sm text-slate-700';

    var thead = document.createElement('thead');
    thead.className = 'bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200';
    thead.innerHTML = '<tr><th class="w-7 px-4 py-2"></th><th class="p-4 text-left">Role</th><th class="p-4 text-left">Contact</th><th class="p-4 text-left">SMS Number</th><th class="p-4 text-left">Company</th><th class="w-20 px-4 py-2 text-right">Action</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    tbody.className = 'divide-y divide-slate-200';

    rows.forEach(function (row, idx) {
      var tr = document.createElement('tr');
      tr.className = idx % 2 === 1 ? 'bg-slate-50/50' : '';
      tr.dataset.affiliationId = row.ID || row.id || '';
      tr.dataset.contactId = row.Contact_ID || row.contact_id || '';
      tr.dataset.propertyId = row.Property_ID || row.property_id || '';

      var name = [row.Contact_First_Name, row.Contact_Last_Name].filter(Boolean).join(' ') || '—';
      var email = row.ContactEmail || '';
      var sms = row.Contact_SMS_Number || '';
      var company = typeof row.CompanyName === 'object' ? (row.CompanyName && row.CompanyName.name) || '' : row.CompanyName || '';
      var role = row.Role || '';
      var primary = Boolean(row.Primary_Owner_Contact);

      tr.innerHTML =
        '<td class="px-4 py-2">' + (role === 'Owner' ? '<span class="text-amber-500" title="Primary">&#9733;</span>' : '') + '</td>' +
        '<td class="px-4 py-2">' + escapeHtml(role) + '</td>' +
        '<td class="px-4 py-2"><div>' + escapeHtml(name) + '</div><div class="text-xs text-slate-500">' + escapeHtml(email) + '</div></td>' +
        '<td class="px-4 py-2">' + escapeHtml(sms) + '</td>' +
        '<td class="px-4 py-2">' + escapeHtml(company) + '</td>' +
        '<td class="px-4 py-2 text-right"><button class="edit-btn text-blue-700 text-xs mr-2">Edit</button><button class="delete-btn text-rose-600 text-xs">Delete</button></td>';
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Bind edit/delete
    tbody.querySelectorAll('.delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var tr = e.target.closest('tr');
        if (!tr) return;
        var affId = tr.dataset.affiliationId;
        if (!affId) return;
        if (!confirm('Delete this affiliation?')) return;
        deleteAffiliation(affId).then(function () {
          tr.remove();
          showFeedback('Affiliation deleted.', 'success');
        }).catch(function (err) {
          console.error('[NewInquiry] Delete affiliation failed:', err);
          showFeedback('Failed to delete affiliation.');
        });
      });
    });
  }

  // ─── View: Dropdowns & Checkboxes ─────────────────────────────────────────────

  function populateDropdowns() {
    // Inquiry detail dropdowns
    INQUIRY_CONFIGS.forEach(function (cfg) {
      var el = $(cfg.id);
      if (!el) return;
      el.innerHTML = '';
      if (cfg.placeholder) {
        var opt = document.createElement('option');
        opt.text = cfg.placeholder;
        opt.value = '';
        opt.disabled = true;
        opt.selected = true;
        el.add(opt);
      }
      cfg.options.forEach(function (text) {
        var opt = document.createElement('option');
        opt.text = text;
        opt.value = text;
        el.add(opt);
      });
    });

    // State dropdown (property)
    var stateEl = $q('[data-property-id="state"]');
    if (stateEl) {
      stateEl.innerHTML = '<option value="" disabled selected>Select</option>';
      STATE_OPTIONS.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s.value;
        opt.text = s.label;
        stateEl.add(opt);
      });
    }

    // Property type, building type, foundation type
    populateSelect('[data-property-id="property-type"]', PROPERTY_TYPES);
    populateSelect('[data-property-id="building-type"]', BUILDING_TYPES);
    populateSelect('[data-property-id="foundation-type"]', FOUNDATION_TYPES);

    // Building features checkboxes
    renderCheckboxList('building_features_options_as_text', BUILDING_FEATURES, 'data-property-id');

    // Resident feedback checkboxes
    renderCheckboxList('noise-signs-options-as-text', NOISES, 'data-feedback-id');
    renderCheckboxList('pest-active-times-options-as-text', TIMES, 'data-feedback-id');
    renderCheckboxList('pest-location-options-as-text', PEST_LOCATIONS, 'data-feedback-id');

    // Smart default: restore last-used service
    try {
      var lastService = sessionStorage.getItem('ptpm_last_service');
      var serviceSelect = $q('#service-inquiry');
      if (lastService && serviceSelect && Array.from(serviceSelect.options).some(function (o) { return o.value === lastService; })) {
        serviceSelect.value = lastService;
      }
    } catch (_) { /* ignore */ }
  }

  function populateSelect(selector, options) {
    var el = $q(selector);
    if (!el) return;
    el.innerHTML = '<option value="" disabled selected>Select</option>';
    options.forEach(function (text) {
      var opt = document.createElement('option');
      opt.value = text;
      opt.text = text;
      el.add(opt);
    });
  }

  function renderCheckboxList(feedbackId, items, attrName) {
    var ul = $q('[' + attrName + '="' + feedbackId + '"]');
    if (!ul || ul.tagName !== 'UL') return;
    ul.innerHTML = '';
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'flex items-center gap-2';
      li.innerHTML = '<input type="checkbox" value="' + escapeHtml(item.text) + '" class="h-4 w-4 accent-[#003882]"><label class="text-sm text-slate-600">' + escapeHtml(item.text) + '</label>';
      ul.appendChild(li);
    });
  }

  // ─── View: Google Places Autocomplete ─────────────────────────────────────────

  window.initAutocomplete = function () {
    var input = $('search-properties') || $q('[data-property-id="search-properties"]');
    if (!input || !window.google || !window.google.maps || !window.google.maps.places) return;
    if (input.getAttribute('data-ptpm-autocomplete-attached') === '1') return;
    input.setAttribute('data-ptpm-autocomplete-attached', '1');

    var autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'au' },
    });

    autocomplete.addListener('place_changed', function () {
      var place = autocomplete.getPlace();
      if (!place || !place.address_components) return;

      var mapping = { street_number: '', route: '', locality: '', administrative_area_level_1: '', postal_code: '' };
      place.address_components.forEach(function (comp) {
        comp.types.forEach(function (type) {
          if (mapping.hasOwnProperty(type)) mapping[type] = comp.long_name || comp.short_name || '';
        });
      });

      var addr1 = [mapping.street_number, mapping.route].filter(Boolean).join(' ');
      setPropertyField('address_1', addr1);
      setPropertyField('suburb_town', mapping.locality);
      setPropertyField('postal_code', mapping.postal_code);

      var stateComp = place.address_components.find(function (c) { return c.types.indexOf('administrative_area_level_1') >= 0; });
      var stateVal = stateComp ? stateComp.short_name : '';
      if (stateComp) setPropertyField('state', stateVal);

      // Check for existing properties matching this address so user can choose "use existing"
      hidePropertyMatchPanel();
      fetchMatchingProperties(addr1, mapping.locality, stateVal, mapping.postal_code)
        .then(function (matches) {
          showPropertyMatchPanel(matches || []);
        })
        .catch(function (err) {
          console.warn('[NewInquiry] Property match lookup failed:', err);
          showPropertyMatchPanel([]);
        });
    });
  };

  function getPropertyMatchPanelRoot() {
    var root = $q('[data-search-root="property"]');
    if (!root) root = $('property-information');
    if (!root) return null;
    var panel = root.querySelector('[data-property-match-panel]');
    if (!panel) {
      panel = document.createElement('div');
      panel.setAttribute('data-property-match-panel', '');
      panel.className = 'mt-2 p-3 rounded-lg border border-slate-200 bg-slate-50 hidden';
      panel.innerHTML = '<p class="text-xs font-medium text-slate-600 mb-2">This address may already exist. Select one or create new:</p><div data-property-match-results class="space-y-1 mb-2"></div><button type="button" data-property-match-create-new class="text-xs text-blue-600 hover:underline">Create new property</button>';
      var createBtn = panel.querySelector('[data-property-match-create-new]');
      if (createBtn) createBtn.addEventListener('click', function () { hidePropertyMatchPanel(); });
      root.appendChild(panel);
    }
    return panel;
  }

  function showPropertyMatchPanel(matches) {
    var panel = getPropertyMatchPanelRoot();
    if (!panel) {
      if (config.DEBUG) console.warn('[NewInquiry] Property match panel: no container found');
      return;
    }
    var resultsEl = panel.querySelector('[data-property-match-results]');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    if (matches && matches.length > 0) {
      matches.forEach(function (p) {
        var addr = [getPropertyValue(p, 'address_1'), getPropertyValue(p, 'suburb_town'), getPropertyValue(p, 'state')].filter(Boolean).join(', ');
        if (!addr) addr = getPropertyValue(p, 'property_name') || 'Property #' + p.id;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full text-left text-sm text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded block';
        btn.textContent = 'Use existing: ' + addr;
        btn.dataset.propertyId = String(p.id);
        btn.addEventListener('click', function () {
          selectPropertyFromRelated(p.id, null);
          hidePropertyMatchPanel();
        });
        resultsEl.appendChild(btn);
      });
    } else {
      var msg = document.createElement('p');
      msg.className = 'text-xs text-slate-500';
      msg.textContent = 'No existing property found. Use the form below as a new property.';
      resultsEl.appendChild(msg);
    }
    panel.classList.remove('hidden');
  }

  function hidePropertyMatchPanel() {
    var root = $q('[data-search-root="property"]') || $('property-information');
    if (!root) return;
    var panel = root.querySelector('[data-property-match-panel]');
    if (panel) panel.classList.add('hidden');
  }

  function setPropertyField(key, value) {
    var el = $q('[data-property-id="' + key + '"]');
    if (el) {
      el.value = value || '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ─── View: Same as Contact Address ────────────────────────────────────────────

  function bindSameAsContactAddress() {
    var cb = $('same-as-contact-address');
    if (!cb) return;
    cb.addEventListener('change', function () {
      if (!cb.checked) return;
      // Copy contact address modal values or main section values into property fields
      var section = $q('[data-contact-section="' + state.activeContactTab + '"]');
      if (!section) return;
      // Try to get address from the contact details modal if available
      var addr1 = ($('adTopLine1') && $('adTopLine1').value) || '';
      var addr2 = ($('adTopLine2') && $('adTopLine2').value) || '';
      var city = ($('adTopCity') && $('adTopCity').value) || '';
      var stateVal = ($('adTopState') && $('adTopState').value) || '';
      var postal = ($('adTopPostal') && $('adTopPostal').value) || '';

      setPropertyField('address_1', addr1);
      setPropertyField('address_2', addr2);
      setPropertyField('suburb_town', city);
      setPropertyField('state', stateVal);
      setPropertyField('postal_code', postal);
    });
  }

  // ─── View: File Uploads ───────────────────────────────────────────────────────

  function initFileUploads() {
    var uploads = $qa('[data-feedback-upload]');
    uploads.forEach(function (input) {
      var key = input.dataset.feedbackUpload;
      var list = $q('[data-feedback-upload-list="' + key + '"]');
      if (!list) return;

      if (typeof utils.initFileUploadArea === 'function') {
        var label = input.closest('label');
        var dropZone = label && label.parentElement ? label.parentElement : (label || input.parentElement);
        utils.initFileUploadArea({
          triggerEl: dropZone,
          inputEl: input,
          listEl: list,
          uploadPath: 'inquiries/resident-feedback',
          acceptRegex: /^(image\/|application\/pdf)/,
          multiple: true,
          replaceExisting: false,
          renderItem: function (meta) {
            if (typeof utils.buildUploadCard === 'function') {
              var card = utils.buildUploadCard(meta, {
                onDelete: function () { card.remove(); },
              });
              card.setAttribute('data-upload-url', meta.url);
              card.setAttribute('data-file-name', meta.name || 'Upload');
              card.setAttribute('file-type', meta.type || '');
              return card;
            }
            var div = document.createElement('div');
            div.className = 'text-sm text-slate-600';
            div.textContent = meta.name || 'Uploaded file';
            return div;
          },
        });
      }
    });
  }

  function getUploadedImageUrls() {
    var nodes = $qa('[data-feedback-upload-list] [data-upload-url][file-type^="image/"]');
    return Array.from(nodes).map(function (n) { return n.getAttribute('data-upload-url'); }).filter(Boolean);
  }

  // ─── View: Switch Account Type Modal ──────────────────────────────────────────

  function showSwitchAccountTypeModal() {
    if (typeof utils.showAlertModal === 'function') {
      utils.showAlertModal({
        title: 'Switch Account Type',
        message: 'Switching to Company will reset all filled data. Do you want to continue?',
        buttonLabel: 'Continue',
        onConfirm: function () {
          switchContactSection('entity');
          fetchCompanyById().then(function (result) {
            createEntityList(result.resp || []);
          });
        },
      });
      return;
    }
    if (confirm('Switch to Entity/Company? This will reset filled data.')) {
      switchContactSection('entity');
      fetchCompanyById().then(function (result) {
        createEntityList(result.resp || []);
      });
    }
  }

  // ─── View: Entity List ────────────────────────────────────────────────────────

  function createEntityList(entities) {
    var root = $q('[data-search-root="contact-entity"]');
    if (!root) return;
    var input = root.querySelector('[data-search-input]');
    var panel = root.querySelector('[data-search-panel]');
    var results = root.querySelector('[data-search-results]');
    if (!input || !panel || !results) return;

    function filter(q) {
      var term = (q || '').trim().toLowerCase();
      if (!term) return entities;
      return entities.filter(function (p) {
        var name = String(p.Name || p.name || '').toLowerCase();
        return name.indexOf(term) >= 0;
      });
    }

    function render(q) {
      var list = filter(q);
      results.innerHTML = '';
      if (!list || !list.length) {
        results.innerHTML = '<div class="px-4 py-6 text-sm text-slate-500 text-center">No matching entities.</div>';
      } else {
        list.forEach(function (p) {
          var li = document.createElement('li');
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'w-full px-4 py-3 text-left text-sm hover:bg-slate-50';
          btn.innerHTML = '<p class="font-medium text-slate-700">' + escapeHtml(p.Name || p.name) + '</p>';
          btn.addEventListener('mousedown', function (e) {
            e.preventDefault();
            applyEntitySelection(p, input);
            panel.classList.add('hidden');
          });
          li.appendChild(btn);
          results.appendChild(li);
        });
      }
      panel.classList.remove('hidden');
    }

    input.addEventListener('input', function (e) { render(e.target.value); });
    input.addEventListener('focus', function () { render(input.value); });
    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) panel.classList.add('hidden');
    });
  }

  function setEntityField(section, fieldName, value) {
    var el = section.querySelector('[data-contact-field="' + fieldName + '"]');
    if (el) el.value = value || '';
  }

  function applyEntitySelection(entity, inputEl) {
    if (!entity) return;
    state.companyId = entity.ID || entity.id || '';
    state.entityContactId = entity.Primary_Person_Contact_ID || entity.primary_person_contact_id || '';
    if (inputEl) inputEl.value = entity.Name || entity.name || '';
    var entityInput = $q('[data-contact-field="entity-id"]');
    if (entityInput) entityInput.value = state.companyId;

    var section = $q('[data-contact-section="entity"]');
    if (section) {
      var contactIdInput = section.querySelector('[data-contact-field="contact_id"]');
      if (contactIdInput) contactIdInput.value = state.entityContactId || '';
      setEntityField(section, 'first_name', entity.Primary_Person_First_Name || entity.primary_person_first_name);
      setEntityField(section, 'last_name', entity.Primary_Person_Last_Name || entity.primary_person_last_name);
      setEntityField(section, 'email', entity.Primary_Person_Email || entity.primary_person_email);
      setEntityField(section, 'sms_number', entity.Primary_Person_SMS_Number || entity.primary_person_sms_number);
    }

    var viewBtn = $('view-contact-detail');
    if (viewBtn) viewBtn.classList.remove('hidden');

    var reqId = ++state.entityRelatedRequestId;
    showRelatedLoading();
    fetchRelated({ contactId: state.entityContactId, companyId: state.companyId }).then(function (data) {
      if (state.entityRelatedRequestId !== reqId) return;
      renderRelatedData(data);
    });
  }

  function prefillFromUrlParams() {
    if (state.urlPrefillApplied) return;
    var params = new URLSearchParams(window.location.search || '');
    function getParamSafe(key) {
      var value = params.get(key);
      if (value == null) return '';
      try {
        return String(value);
      } catch (_) {
        return '';
      }
    }

    var requestedTab = getParamSafe('accountType').toLowerCase();
    var contactId = getParamSafe('contact');
    var companyId = getParamSafe('company');
    var contactPrefill = {
      id: contactId || '',
      first_name: getParamSafe('first_name'),
      last_name: getParamSafe('last_name'),
      email: getParamSafe('email'),
      sms_number: getParamSafe('sms_number'),
      office_phone: getParamSafe('office_phone')
    };
    var hasDirectContactParams = !!(contactPrefill.first_name || contactPrefill.last_name || contactPrefill.email || contactPrefill.sms_number || contactPrefill.office_phone);

    if (requestedTab === 'entity' || companyId) {
      switchContactSection('entity');
    } else {
      switchContactSection('individual');
    }

    if (companyId) {
      state.urlPrefillApplied = true;
      fetchCompanyById(companyId).then(function (result) {
        var row = result && result.resp && result.resp[0];
        if (!row) return;
        var entityInput = $q('[data-search-root="contact-entity"] [data-search-input]');
        applyEntitySelection(row, entityInput);
      }).catch(function (err) {
        console.warn('[NewInquiry] Company prefill failed:', err);
      });
      return;
    }

    if (!contactId) return;
    if (hasDirectContactParams) {
      var direct = formatContact(contactPrefill, 0);
      if (direct && direct.id) {
        state.urlPrefillApplied = true;
        state.contacts.unshift(direct);
        handleContactSelected(direct);
        return;
      }
    }
    var match = (state.contacts || []).find(function (c) {
      return String(c.id || '') === String(contactId);
    });
    if (match) {
      state.urlPrefillApplied = true;
      handleContactSelected(match);
      return;
    }
    fetchContactById(contactId).then(function (result) {
      var row = result && result.resp && result.resp[0];
      if (row) return row;
      return fetchContactByIdGraphQL(contactId);
    }).then(function (row) {
      if (!row) return;
      var contact = formatContact(row, 0);
      if (!contact || !contact.id) return;
      state.urlPrefillApplied = true;
      state.contacts.unshift(contact);
      handleContactSelected(contact);
    }).catch(function (err) {
      console.warn('[NewInquiry] Contact prefill failed:', err);
    });
  }

  // ─── View: Flatpickr Init ─────────────────────────────────────────────────────

  function initFlatpickr() {
    if (!window.flatpickr) return;
    var dateInput = $q('[data-feedback-id="date-job-required-by"]');
    if (dateInput) {
      flatpickr(dateInput, { dateFormat: 'd/m/Y', allowInput: true });
    }
  }

  // ─── Controller: Header Buttons ───────────────────────────────────────────────

  function bindHeaderButtons() {
    var cancelBtn = $('cancel-btn');
    var resetBtn = $('reset-btn');
    var submitBtn = $('submit-btn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        if (typeof utils.showUnsavedChangesModal === 'function') {
          utils.showUnsavedChangesModal({
            onDiscard: function () { window.history.back(); },
          });
        } else if (confirm('Discard unsaved changes?')) {
          window.history.back();
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (typeof utils.showResetConfirmModal === 'function') {
          utils.showResetConfirmModal({
            onConfirm: function () {
              if (typeof utils.resetFormFields === 'function') utils.resetFormFields(document);
              else location.reload();
            },
          });
        } else if (confirm('Reset all form fields?')) {
          location.reload();
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function () { onSubmit(); });
    }

    var headerSaveBtn = $q('#save-btn') || $('save-btn');
    if (headerSaveBtn) {
      headerSaveBtn.addEventListener('click', function () { onSaveDraft(); });
    }

    // Save (contact add) button
    var saveBtn = $q('[data-contact-save]');
    if (saveBtn) {
      saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        onSaveContact();
      });
    }
  }

  // ─── Controller: Save New Contact ─────────────────────────────────────────────

  function onSaveContact() {
    var section = $q('[data-contact-section="individual"]');
    if (!section) return;

    var payload = {};
    ['first_name', 'last_name', 'email', 'sms_number', 'office_phone'].forEach(function (field) {
      var input = section.querySelector('[data-contact-field="' + field + '"]');
      if (input && input.value) payload[field] = input.value.trim();
    });

    if (!payload.first_name) { showFeedback('First name is required.'); return; }
    if (!payload.email) { showFeedback('Email is required.'); return; }

    // Check for duplicates
    var existing = state.contacts.find(function (c) {
      return c.fields.email && c.fields.email.toLowerCase() === (payload.email || '').toLowerCase();
    });
    if (existing) {
      showFeedback('A contact with this email already exists.', 'info');
      handleContactSelected(existing);
      return;
    }

    if (typeof utils.setButtonLoading === 'function') {
      var contactSaveBtn = $q('[data-contact-save]');
      if (contactSaveBtn) utils.setButtonLoading(contactSaveBtn, true, { label: contactSaveBtn.dataset.loadingLabel || 'Adding...' });
    }
    createContact(payload).then(function (result) {
      var managedData = result && result.mutations && result.mutations.PeterpmContact && result.mutations.PeterpmContact.managedData;
      var newId = managedData ? Object.keys(managedData)[0] : null;
      if (newId) {
        var contact = formatContact(Object.assign({ id: newId }, payload), 0);
        state.contacts.unshift(contact);
        handleContactSelected(contact);
        showFeedback('Contact created successfully.', 'success');
      }
    }).catch(function (err) {
      console.error('[NewInquiry] Create contact failed:', err);
      showFeedback('Failed to create contact.');
    }).finally(function () {
      var contactSaveBtn = $q('[data-contact-save]');
      if (contactSaveBtn && typeof utils.setButtonLoading === 'function') utils.setButtonLoading(contactSaveBtn, false);
    });
  }

  // ─── Validation ───────────────────────────────────────────────────────────────

  var validationBanner = null;
  function ensureValidationBanner() {
    if (validationBanner) return validationBanner;
    var section = document.querySelector('main section');
    if (!section) return null;
    validationBanner = document.createElement('div');
    validationBanner.id = 'ptpm-validation-banner';
    validationBanner.className = 'hidden mx-4 mb-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm';
    validationBanner.setAttribute('role', 'alert');
    section.insertBefore(validationBanner, section.firstChild);
    return validationBanner;
  }
  function showValidationBanner(count) {
    var el = ensureValidationBanner();
    if (!el) return;
    el.textContent = 'Please fix the ' + count + ' field' + (count === 1 ? '' : 's') + ' below.';
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideValidationBanner() {
    if (validationBanner) validationBanner.classList.add('hidden');
  }
  function showFieldError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add('!outline-rose-500', '!outline-1');
    inputEl.setAttribute('aria-invalid', 'true');
    var wrap = inputEl.closest('div');
    if (!wrap) return;
    var err = wrap.querySelector('.ptpm-field-error');
    if (err) {
      err.textContent = message;
      err.classList.remove('hidden');
    } else {
      err = document.createElement('p');
      err.className = 'ptpm-field-error text-rose-600 text-xs mt-0.5';
      err.textContent = message;
      wrap.appendChild(err);
    }
  }
  function clearFieldError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('!outline-rose-500', '!outline-1');
    inputEl.removeAttribute('aria-invalid');
    var wrap = inputEl.closest('div');
    if (wrap) {
      var err = wrap.querySelector('.ptpm-field-error');
      if (err) err.classList.add('hidden');
    }
  }
  function clearAllValidationErrors() {
    hideValidationBanner();
    $qa('.ptpm-field-error').forEach(function (el) { el.classList.add('hidden'); });
    $qa('[data-contact-field], [data-inquiry-id], [data-feedback-id]').forEach(function (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        el.classList.remove('!outline-rose-500', '!outline-1');
        el.removeAttribute('aria-invalid');
      }
    });
  }
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function collectValidationErrors() {
    var errors = [];
    var rule = getInquiryTypeRule();
    var required = (rule && rule.required) || ['inquiry_source', 'help', 'service', 'property'];
    var contactId = '';
    var entityId = '';
    if (state.activeContactTab === 'individual') {
      var cidInput = $q('[data-contact-section="individual"] [data-contact-field="contact_id"]');
      contactId = cidInput ? cidInput.value : '';
    } else {
      var eidInput = $q('[data-contact-field="entity-id"]');
      entityId = eidInput ? eidInput.value : '';
    }
    if (!contactId && !entityId) {
      var contactSection = $q('[data-contact-section="' + state.activeContactTab + '"]');
      var firstInput = contactSection ? contactSection.querySelector('[data-contact-field="first_name"], [data-contact-field="email"]') : null;
      errors.push({ el: firstInput || $q('[data-search-root="contact-individual"] input') || document.body, message: 'Please select or add a contact.' });
    }
    var section = $q('[data-contact-section="' + state.activeContactTab + '"]');
    if (section) {
      var fn = section.querySelector('[data-contact-field="first_name"]');
      if (fn && !(fn.value || '').trim()) errors.push({ el: fn, message: 'First name is required.' });
      var em = section.querySelector('[data-contact-field="email"]');
      if (em) {
        var v = (em.value || '').trim();
        if (!v) errors.push({ el: em, message: 'Email is required.' });
        else if (!emailRegex.test(v)) errors.push({ el: em, message: 'Enter a valid email address.' });
      }
    }
    if (required.indexOf('inquiry_source') >= 0) {
      var sourceEl = $q('#inquiry-source');
      if (sourceEl && !(sourceEl.value || '').trim()) errors.push({ el: sourceEl, message: 'Inquiry source is required.' });
    }
    if (required.indexOf('help') >= 0) {
      var helpEl = $q('[data-inquiry-id="how-can-we-help"]');
      if (helpEl && !(helpEl.value || '').trim()) errors.push({ el: helpEl, message: 'How can we help? is required.' });
    }
    if (required.indexOf('service') >= 0) {
      var serviceEl = $q('#service-inquiry');
      if (serviceEl && !(serviceEl.value || '').trim()) errors.push({ el: serviceEl, message: 'Service is required.' });
    }
    if (required.indexOf('property') >= 0) {
      var propertyId = $('selected-property-id') ? $('selected-property-id').value : state.propertyId;
      var propertyInput = $q('[data-property-id="search-properties"]');
      if (!propertyId && (!propertyInput || !(propertyInput.value || '').trim())) {
        errors.push({ el: propertyInput || document.body, message: 'Select or enter a property for this inquiry type.' });
      }
    }
    if (required.indexOf('date_required') >= 0) {
      var dateEl = $q('[data-feedback-id="date-job-required-by"]');
      if (dateEl && !(dateEl.value || '').trim()) {
        errors.push({ el: dateEl, message: 'Date job required by is required.' });
      }
    }
    return { valid: errors.length === 0, errors: errors };
  }
  function initValidation() {
    function validateOne(input, validate) {
      if (!input) return;
      input.addEventListener('blur', function () {
        var msg = validate(input);
        if (msg) showFieldError(input, msg);
        else clearFieldError(input);
      });
      input.addEventListener('input', function () {
        var msg = validate(input);
        if (!msg) clearFieldError(input);
      });
    }
    $qa('[data-contact-section="individual"] [data-contact-field="first_name"]').forEach(function (el) {
      validateOne(el, function (inp) { return (inp.value || '').trim() ? '' : 'First name is required.'; });
    });
    $qa('[data-contact-section="individual"] [data-contact-field="email"]').forEach(function (el) {
      validateOne(el, function (inp) {
        var v = (inp.value || '').trim();
        if (!v) return 'Email is required.';
        if (!emailRegex.test(v)) return 'Enter a valid email address.';
        return '';
      });
    });
    $qa('[data-contact-section="entity"] [data-contact-field="first_name"]').forEach(function (el) {
      validateOne(el, function (inp) { return (inp.value || '').trim() ? '' : 'First name is required.'; });
    });
    $qa('[data-contact-section="entity"] [data-contact-field="email"]').forEach(function (el) {
      validateOne(el, function (inp) {
        var v = (inp.value || '').trim();
        if (!v) return 'Email is required.';
        if (!emailRegex.test(v)) return 'Enter a valid email address.';
        return '';
      });
    });
  }

  // ─── Controller: Submit Inquiry ───────────────────────────────────────────────

  function onSubmit() {
    clearAllValidationErrors();
    var validation = collectValidationErrors();
    if (!validation.valid) {
      showValidationBanner(validation.errors.length);
      validation.errors.forEach(function (err) { showFieldError(err.el, err.message); });
      if (validation.errors[0] && validation.errors[0].el && validation.errors[0].el.scrollIntoView) {
        validation.errors[0].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    var contactId = '';
    var entityId = '';
    if (state.activeContactTab === 'individual') {
      var cidInput = $q('[data-contact-section="individual"] [data-contact-field="contact_id"]');
      contactId = cidInput ? cidInput.value : '';
    } else {
      var eidInput = $q('[data-contact-field="entity-id"]');
      entityId = eidInput ? eidInput.value : '';
    }

    // Collect inquiry detail values
    var inquiryPayload = {};
    $qa('#inquiry-detail [data-inquiry-id]').forEach(function (el) {
      if (el.id === 'inquiry-detail') return; // Skip container
      var key = el.dataset.inquiryId;
      if (!key) return;
      var normalizedKey = key.replace(/-/g, '_').toLowerCase();
      inquiryPayload[normalizedKey] = (el.value || '').trim();
    });

    // Collect resident feedback values
    $qa('#resident-feedback [data-feedback-id]').forEach(function (el) {
      if (el.id === 'resident-feedback') return;
      var key = el.dataset.feedbackId;
      if (!key) return;
      var normalizedKey = key.replace(/-/g, '_').toLowerCase();

      if (el.tagName === 'UL') {
        var checked = Array.from(el.querySelectorAll('input:checked')).map(function (cb) { return cb.value; });
        if (checked.length) inquiryPayload[normalizedKey] = checked.map(function (v) { return '*/*' + v + '*/*'; }).join('');
      } else if (normalizedKey === 'date_job_required_by') {
        var dateVal = (el.value || '').trim();
        if (dateVal) {
          var parts = dateVal.split('/');
          if (parts.length === 3) {
            var epoch = Math.floor(new Date(parts[2], parts[1] - 1, parts[0]).getTime() / 1000);
            if (!isNaN(epoch)) inquiryPayload[normalizedKey] = epoch;
          }
        }
        // When empty, omit so SDK does not receive "" (expects number or omit)
      } else {
        inquiryPayload[normalizedKey] = (el.value || '').trim();
      }
    });

    // Add contact/entity references
    if (contactId) {
      inquiryPayload.Primary_Contact = { id: contactId };
    }
    if (entityId) {
      inquiryPayload.Company_ID = { id: entityId };
    }
    if (state.propertyId) {
      inquiryPayload.Property_ID = { id: state.propertyId };
    }

    // Property details
    var propertyData = collectPropertyFields();
    Object.assign(inquiryPayload, propertyData);

    // Save last-used service for smart default next time
    try {
      var svc = (inquiryPayload.services || '').trim();
      if (svc) sessionStorage.setItem('ptpm_last_service', svc);
    } catch (_) { /* ignore */ }

    // Submit
    var submitBtn = $q('#submit-btn') || $('submit-btn');
    if (submitBtn && typeof utils.setButtonLoading === 'function') utils.setButtonLoading(submitBtn, true, { label: 'Submitting...' });
    if (typeof utils.showLoader === 'function') utils.showLoader(null, null, null, 'Submitting inquiry...');

    var inquiryIdFromUrl = new URLSearchParams(window.location.search).get('inquiry');
    var mutation = inquiryIdFromUrl ? updateInquiry(inquiryIdFromUrl, inquiryPayload) : createInquiry(inquiryPayload);

    mutation.then(function (result) {
      if (result && result.isCancelling) return;

      var newId = null;
      if (!inquiryIdFromUrl && result && result.mutations && result.mutations.PeterpmDeal) {
        var managedData = result.mutations.PeterpmDeal.managedData;
        if (managedData) newId = Object.keys(managedData)[0];
      }

      // Upload images if any
      var images = getUploadedImageUrls();
      if (images.length && (newId || inquiryIdFromUrl)) {
        var targetId = newId || inquiryIdFromUrl;
        return Promise.all(images.map(function (url) {
          return createUpload({
            Deal_ID: { id: targetId },
            file_url: url,
            upload_type: 'resident_feedback',
          }).catch(function (err) { console.warn('[NewInquiry] Upload failed:', err); });
        })).then(function () {
          showSubmitSuccess(inquiryIdFromUrl ? 'Inquiry updated.' : 'Inquiry submitted.', targetId);
        });
      }

      showSubmitSuccess(inquiryIdFromUrl ? 'Inquiry updated.' : 'Inquiry submitted.', newId || inquiryIdFromUrl);
    }).then(function () {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) { /* ignore */ }
    }).catch(function (err) {
      console.error('[NewInquiry] Submit failed:', err);
      if (typeof utils.showAlertModal === 'function') {
        utils.showAlertModal({ title: 'Error', message: 'Failed to submit inquiry. Please try again.', buttonLabel: 'OK' });
      } else {
        alert('Failed to submit inquiry.');
      }
    }).finally(function () {
      if (typeof utils.hideLoader === 'function') utils.hideLoader(null, null, true);
      if (submitBtn && typeof utils.setButtonLoading === 'function') utils.setButtonLoading(submitBtn, false);
    });
  }

  function showSubmitSuccess(message, inquiryId) {
    var goToDashboard = function () {
      if (config.DASHBOARD_URL) {
        window.location.href = config.DASHBOARD_URL;
      } else {
        window.history.back();
      }
    };
    var viewInquiryUrl = inquiryId && config.INQUIRY_DETAIL_URL_TEMPLATE
      ? (config.INQUIRY_DETAIL_URL_TEMPLATE.replace(/\{id\}/g, String(inquiryId)))
      : '';
    if (typeof utils.showAlertModal === 'function') {
      utils.showAlertModal({
        title: 'Success',
        message: message,
        buttonLabel: viewInquiryUrl ? 'Back to dashboard' : 'OK',
        onConfirm: goToDashboard,
        secondaryButtonLabel: viewInquiryUrl ? 'View inquiry' : '',
        onSecondary: viewInquiryUrl ? function () { window.location.href = viewInquiryUrl; } : undefined,
      });
    } else {
      alert(message);
      goToDashboard();
    }
  }

  // ─── Draft (sessionStorage) ───────────────────────────────────────────────────

  var DRAFT_KEY = 'ptpm_inquiry_draft';
  function getDraftState() {
    var out = { tab: state.activeContactTab, propertyId: state.propertyId || '' };
    out.contactIndividual = {};
    out.contactEntity = {};
    var ind = $q('[data-contact-section="individual"]');
    if (ind) {
      $qa('[data-contact-field]', ind).forEach(function (el) {
        var k = el.dataset.contactField;
        if (k) out.contactIndividual[k] = (el.value || '').trim();
      });
    }
    var ent = $q('[data-contact-section="entity"]');
    if (ent) {
      $qa('[data-contact-field]', ent).forEach(function (el) {
        var k = el.dataset.contactField;
        if (k) out.contactEntity[k] = (el.value || '').trim();
      });
    }
    out.inquiry = {};
    $qa('#inquiry-detail [data-inquiry-id]').forEach(function (el) {
      if (el.id === 'inquiry-detail') return;
      var k = (el.dataset.inquiryId || '').replace(/-/g, '_').toLowerCase();
      if (k) out.inquiry[k] = (el.value || '').trim();
    });
    out.feedback = {};
    $qa('#resident-feedback [data-feedback-id]').forEach(function (el) {
      if (el.id === 'resident-feedback') return;
      var k = (el.dataset.feedbackId || '').replace(/-/g, '_').toLowerCase();
      if (!k) return;
      if (el.tagName === 'UL') {
        var checked = Array.from(el.querySelectorAll('input:checked')).map(function (c) { return c.value; });
        if (checked.length) out.feedback[k] = checked.map(function (v) { return '*/*' + v + '*/*'; }).join('');
      } else {
        out.feedback[k] = (el.value || '').trim();
      }
    });
    out.property = collectPropertyFields();
    return out;
  }
  function applyDraftState(data) {
    if (!data) return;
    if (data.tab) {
      state.activeContactTab = data.tab;
      switchContactSection(data.tab);
    }
    if (data.propertyId) state.propertyId = data.propertyId;
    if (data.contactIndividual) {
      var ind = $q('[data-contact-section="individual"]');
      if (ind) Object.keys(data.contactIndividual).forEach(function (k) {
        var el = ind.querySelector('[data-contact-field="' + k + '"]');
        if (el && el.value !== undefined) el.value = data.contactIndividual[k] || '';
      });
    }
    if (data.contactEntity) {
      var ent = $q('[data-contact-section="entity"]');
      if (ent) Object.keys(data.contactEntity).forEach(function (k) {
        var el = ent.querySelector('[data-contact-field="' + k + '"]');
        if (el && el.value !== undefined) el.value = data.contactEntity[k] || '';
      });
    }
    if (data.inquiry) {
      $qa('#inquiry-detail [data-inquiry-id]').forEach(function (el) {
        if (el.id === 'inquiry-detail') return;
        var key = el.dataset.inquiryId;
        if (!key) return;
        var nk = key.replace(/-/g, '_').toLowerCase();
        var val = data.inquiry[nk];
        if (val != null) el.value = val;
      });
    }
    if (data.feedback) {
      $qa('#resident-feedback [data-feedback-id]').forEach(function (el) {
        if (el.id === 'resident-feedback') return;
        var key = el.dataset.feedbackId;
        if (!key) return;
        var nk = key.replace(/-/g, '_').toLowerCase();
        var val = data.feedback[nk];
        if (el.tagName === 'UL' && val) {
          var selected = val.split('*/*').filter(Boolean);
          el.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
            cb.checked = selected.indexOf(cb.value) >= 0;
          });
        } else if (val != null) {
          el.value = val;
        }
      });
    }
    if (data.property) {
      Object.keys(data.property).forEach(function (nk) {
        var el = $q('[data-property-id="' + nk.replace(/_/g, '-') + '"]');
        if (!el) return;
        if (el.tagName === 'UL') {
          var selected = (data.property[nk] || '').split('*/*').filter(Boolean);
          el.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
            cb.checked = selected.indexOf(cb.value) >= 0;
          });
        } else if (el.type !== 'checkbox') {
          el.value = data.property[nk] || '';
        }
      });
    }
  }
  function onSaveDraft() {
    try {
      var draft = getDraftState();
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      if (typeof utils.showAlertModal === 'function') {
        utils.showAlertModal({
          title: 'Draft saved',
          message: 'Your progress has been saved locally. You can leave and come back to finish later.',
          buttonLabel: 'OK',
        });
      } else {
        alert('Draft saved. You can leave and come back to finish later.');
      }
    } catch (e) {
      console.warn('[NewInquiry] Save draft failed:', e);
      if (typeof utils.showAlertModal === 'function') {
        utils.showAlertModal({ title: 'Draft save failed', message: 'Could not save draft. Try again.', buttonLabel: 'OK' });
      } else {
        alert('Could not save draft.');
      }
    }
  }
  function offerRestoreDraft() {
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft = JSON.parse(raw);
      if (!draft) return;
      if (typeof utils.showAlertModal === 'function') {
        utils.showAlertModal({
          title: 'Saved draft',
          message: 'You have a saved draft. Restore it?',
          buttonLabel: 'Discard',
          secondaryButtonLabel: 'Restore',
          onConfirm: function () { sessionStorage.removeItem(DRAFT_KEY); },
          onSecondary: function () {
            applyDraftState(draft);
            sessionStorage.removeItem(DRAFT_KEY);
          },
        });
      } else if (confirm('You have a saved draft. Restore it?')) {
        applyDraftState(draft);
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch (_) { /* ignore */ }
  }

  // ─── Controller: Edit Mode (load existing inquiry from URL) ───────────────────

  function checkEditMode() {
    var url = new URL(window.location.href);
    var inquiryId = url.searchParams.get('inquiry');
    if (!inquiryId) return;

    if (typeof utils.showLoader === 'function') utils.showLoader(null, null, null, 'Loading inquiry...');

    fetchAllFromModel('deal', function (q) {
      return q.where({ id: inquiryId }).limit(1);
    }).then(function (result) {
      var data = result && result.data && result.data[0];
      if (!data) {
        if (typeof utils.showAlertModal === 'function') {
          utils.showAlertModal({ title: 'Not Found', message: 'No inquiry found with this ID.', buttonLabel: 'OK' });
        }
        return;
      }
      var inquiry = unwrapRecord(data);
      hydrateFormFromInquiry(inquiry);
    }).catch(function (err) {
      console.error('[NewInquiry] Load inquiry failed:', err);
    }).finally(function () {
      if (typeof utils.hideLoader === 'function') utils.hideLoader(null, null, true);
    });
  }

  function hydrateFormFromInquiry(data) {
    if (!data) return;

    // Set contact
    if (data.Primary_Contact_ID) {
      var cidInput = $q('[data-contact-section="individual"] [data-contact-field="contact_id"]');
      if (cidInput) cidInput.value = data.Primary_Contact_ID;
      state.contactId = data.Primary_Contact_ID;

      fetchContactById(data.Primary_Contact_ID).then(function (result) {
        if (result.resp && result.resp[0]) {
          var c = result.resp[0];
          var searchInput = $q('[data-search-root="contact-individual"] [data-search-input]');
          if (searchInput) searchInput.value = [c.First_Name, c.Last_Name].filter(Boolean).join(' ');

          var viewBtn = $('view-contact-detail');
          if (viewBtn) viewBtn.classList.remove('hidden');

          loadRelatedData({ contactId: data.Primary_Contact_ID });
        }
      });
    }

    // Set property and load its details + contacts
    if (data.Property_ID) {
      state.propertyId = data.Property_ID;
      var propInput = $('selected-property-id');
      if (propInput) propInput.value = data.Property_ID;
      fetchPropertyById(data.Property_ID).then(function (result) {
        if (result.resp && result.resp[0]) populatePropertyFields(result.resp[0]);
      });
      fetchAffiliationByPropertyId(data.Property_ID, function (rows) {
        renderPropertyContactTable(rows);
      });
      var addContactBtn = $('add-contact-btn');
      if (addContactBtn) addContactBtn.classList.remove('hidden');
    }

    // Set inquiry detail fields
    var normalized = normalizeObjectKeys(data);
    $qa('#inquiry-detail [data-inquiry-id]').forEach(function (el) {
      if (el.id === 'inquiry-detail') return;
      var key = el.dataset.inquiryId;
      if (!key) return;
      var nk = key.replace(/-/g, '_').toLowerCase();
      // Special case: service_name is stored as service_inquiry_service_name
      var val = nk === 'service_name' ? (normalized.service_inquiry_service_name || normalized[nk]) : normalized[nk];
      if (val != null) el.value = val;
    });

    // Set resident feedback fields
    $qa('#resident-feedback [data-feedback-id]').forEach(function (el) {
      if (el.id === 'resident-feedback') return;
      var key = el.dataset.feedbackId;
      if (!key) return;
      var nk = key.replace(/-/g, '_').toLowerCase();
      var val = normalized[nk];

      if (el.tagName === 'UL' && val) {
        var selected = val.split('*/*').filter(Boolean);
        el.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          cb.checked = selected.indexOf(cb.value) >= 0;
        });
      } else if (nk === 'date_job_required_by' && val) {
        try {
          var d = new Date(val * 1000);
          var dd = String(d.getDate()).padStart(2, '0');
          var mm = String(d.getMonth() + 1).padStart(2, '0');
          el.value = dd + '/' + mm + '/' + d.getFullYear();
        } catch (_) { /* ignore */ }
      } else if (val != null) {
        el.value = val;
      }
    });
  }

  function normalizeObjectKeys(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      out[k.replace(/[-\s]+/g, '_').replace(/[A-Z]/g, function (m) { return '_' + m.toLowerCase(); }).replace(/__+/g, '_').replace(/^_/, '').toLowerCase()] = obj[k];
    });
    return out;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    // Connect to VitalSync
    if (window.VitalSync) {
      window.VitalSync.connect().then(function (plugin) {
        state.plugin = plugin;
        console.log('[NewInquiry] VitalSync connected');
        loadContacts().then(function () {
          prefillFromUrlParams();
          checkEditMode();
        });
      }).catch(function (err) {
        console.error('[NewInquiry] VitalSync connection failed:', err);
        if (config.DEBUG || window.__ONTRAPORT_MOCK__) loadMockContacts();
        prefillFromUrlParams();
        checkEditMode();
      });
    } else {
      if (config.DEBUG || window.__ONTRAPORT_MOCK__) loadMockContacts();
      prefillFromUrlParams();
      checkEditMode();
    }

    // Populate dropdowns and checkbox groups
    populateDropdowns();

    // Bind UI
    bindContactSearch();
    bindContactTabs();
    bindRelatedTabs();
    bindInquiryTypeChange();
    bindHeaderButtons();
    bindSameAsContactAddress();
    initFlatpickr();
    initFileUploads();
    initValidation();
    applyInquiryTypeVisibility();

    // Bind same-as-contact checkbox for each section
    $qa('[data-same-as-contact]').forEach(function (cb) {
      cb.addEventListener('change', function () { syncWorkRequested(); });
    });

    // Bind name input changes for work requested sync
    $qa('[data-contact-field="first_name"], [data-contact-field="last_name"]').forEach(function (input) {
      input.addEventListener('input', function () { syncWorkRequested(); });
    });

    // Offer to restore saved draft when not editing an existing inquiry
    var url = new URL(window.location.href);
    if (!url.searchParams.get('inquiry')) {
      setTimeout(offerRestoreDraft, 400);
    }

    // Attach Google Places autocomplete when ready (in case callback ran before our script, or script loads late)
    if (window.google && window.google.maps && window.google.maps.places && typeof window.initAutocomplete === 'function') {
      window.initAutocomplete();
    }
    setTimeout(function () {
      if (typeof window.initAutocomplete === 'function') window.initAutocomplete();
    }, 1500);
  }

  // ─── Expose ───────────────────────────────────────────────────────────────────

  window.PtpmNewInquiry = {
    init: init,
    getState: function () { return state; },
  };
})();
