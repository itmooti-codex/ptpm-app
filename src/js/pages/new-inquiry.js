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
    if (state.models[name]) return state.models[name];
    if (!state.plugin) return Promise.reject(new Error('Plugin not available'));
    state.models[name] = state.plugin.switchTo(MODEL_NAMES[name] || name);
    return Promise.resolve(state.models[name]);
  }

  function unwrapRecord(record) {
    if (!record || typeof record !== 'object') return record;
    if (typeof record.getState === 'function') {
      try {
        var s = record.getState();
        if (s && typeof s === 'object') return Object.assign({}, record, s);
      } catch (_) { /* ignore */ }
    }
    if (record.state && typeof record.state === 'object') {
      return Object.assign({}, record, record.state);
    }
    return record;
  }

  function fetchAllFromModel(modelName, queryFn) {
    return getModel(modelName).then(function (model) {
      var q = model.query();
      if (queryFn) q = queryFn(q);
      return q.fetchAllRecords().pipe(window.toMainInstance(true)).toPromise();
    });
  }

  function loadContacts() {
    return fetchAllFromModel('contact', function (q) {
      return q.field('id', 'id')
        .field('first_name', 'first_name')
        .field('last_name', 'last_name')
        .field('email', 'email')
        .field('sms_number', 'sms_number')
        .field('office_phone', 'office_phone')
        .limit(500);
    }).then(function (result) {
      var records = (result && result.data) || [];
      state.contacts = records.map(function (r, i) { return formatContact(unwrapRecord(r), i); });
      renderContactList('');
      return state.contacts;
    }).catch(function (err) {
      console.error('[NewInquiry] Failed to load contacts:', err);
      state.contacts = [];
    });
  }

  function formatContact(source, index) {
    var s = source || {};
    var firstName = str(s.first_name || s.firstName);
    var lastName = str(s.last_name || s.lastName);
    var email = str(s.email);
    var sms = str(s.sms_number || s.smsNumber);
    var office = str(s.office_phone || s.officePhone);
    var fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    var label = fullName || email || sms || office || 'Unknown Contact';
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
      return model.mutation().createOne(data).execute(true).toPromise();
    });
  }

  function updateContact(id, data) {
    return getModel('contact').then(function (model) {
      return model.mutation().updateOne(id, data).execute(true).toPromise();
    });
  }

  function createInquiry(payload) {
    return getModel('deal').then(function (model) {
      return model.mutation().createOne(payload).execute(true).toPromise();
    });
  }

  function updateInquiry(id, payload) {
    return getModel('deal').then(function (model) {
      return model.mutation().updateOne(id, payload).execute(true).toPromise();
    });
  }

  function createProperty(data) {
    return getModel('property').then(function (model) {
      return model.mutation().createOne(data).execute(true).toPromise();
    });
  }

  function createAffiliation(data) {
    return getModel('affiliation').then(function (model) {
      var payload = {
        Contact_ID: { id: data.contact_id },
        Property_ID: { id: data.property_id },
        Role: data.role || '',
        Primary_Owner_Contact: data.isPrimary || false,
      };
      return model.mutation().createOne(payload).execute(true).toPromise();
    });
  }

  function updateAffiliation(id, data) {
    return getModel('affiliation').then(function (model) {
      return model.mutation().updateOne(id, data).execute(true).toPromise();
    });
  }

  function deleteAffiliation(id) {
    return getModel('affiliation').then(function (model) {
      return model.mutation().deleteOne(id).execute(true).toPromise();
    });
  }

  function fetchContactById(id) {
    return fetchAllFromModel('contact', function (q) {
      return q.where({ id: id }).limit(1);
    }).then(function (r) { return { resp: (r && r.data || []).map(unwrapRecord) }; });
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

  function fetchPropertiesByEmail(email) {
    return fetchAllFromModel('property', function (q) {
      return q.field('id', 'id').field('property_name', 'property_name')
        .field('address_1', 'address_1').field('address_2', 'address_2')
        .field('suburb_town', 'suburb_town').field('state', 'state')
        .field('postal_code', 'postal_code').field('map_url', 'map_url')
        .field('owner_name', 'owner_name').field('status', 'status')
        .field('unique_id', 'unique_id')
        .limit(100);
    }).then(function (r) { return (r && r.data || []).map(unwrapRecord); })
    .catch(function () { return []; });
  }

  function fetchJobsByEmail(email) {
    return fetchAllFromModel('job', function (q) {
      return q.field('id', 'id').field('unique_id', 'unique_id')
        .field('status', 'status').field('created_at', 'created_at')
        .field('date_completed', 'date_completed')
        .field('provider_name', 'provider_name')
        .field('property_name', 'property_name')
        .limit(100);
    }).then(function (r) { return (r && r.data || []).map(unwrapRecord); })
    .catch(function () { return []; });
  }

  function fetchInquiriesByEmail(email) {
    return fetchAllFromModel('deal', function (q) {
      return q.field('id', 'id').field('unique_id', 'unique_id')
        .field('status', 'status').field('service_name', 'service_name')
        .field('created_at', 'created_at')
        .limit(100);
    }).then(function (r) { return (r && r.data || []).map(unwrapRecord); })
    .catch(function () { return []; });
  }

  function fetchRelated(email) {
    if (!email) return Promise.resolve({ properties: [], jobs: [], inquiries: [] });
    return Promise.all([
      fetchPropertiesByEmail(email),
      fetchJobsByEmail(email),
      fetchInquiriesByEmail(email),
    ]).then(function (results) {
      return { properties: results[0], jobs: results[1], inquiries: results[2] };
    });
  }

  function fetchPropertyById(id) {
    return fetchAllFromModel('property', function (q) {
      return q.where({ id: id }).limit(1);
    }).then(function (r) { return { resp: (r && r.data || []).map(unwrapRecord) }; });
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
      return model.mutation().createOne(data).execute(true).toPromise();
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
    populateContactFields(contact);
    clearPropertyFields();
    showRelatedLoading();
    loadRelatedData(contact.fields && contact.fields.email);
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

  function loadRelatedData(email) {
    if (!email) { state.relatedData = { properties: [], jobs: [], inquiries: [] }; updateRelatedUI(); return; }
    var reqId = ++state.relatedRequestId;
    showRelatedLoading();
    fetchRelated(email.trim()).then(function (data) {
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

    // Load property details into form
    if (propertyId) {
      fetchPropertyById(propertyId).then(function (result) {
        if (result.resp && result.resp[0]) {
          populatePropertyFields(result.resp[0]);
        }
        // Load affiliations
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
    if (!data) return;
    $qa('#property-information [data-property-id]').forEach(function (el) {
      var key = el.dataset.propertyId;
      if (!key) return;
      var normalizedKey = key.replace(/-/g, '_');
      var value = data[normalizedKey];
      if (value == null) return;
      if (el.type === 'checkbox') el.checked = Boolean(value);
      else if (el.tagName === 'SELECT') {
        var exists = Array.from(el.options).some(function (o) { return o.value == value; });
        if (exists) el.value = value;
      } else {
        el.value = value;
      }
    });
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
    var input = $('search-properties');
    if (!input || !window.google || !window.google.maps) return;

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

      // State — use short_name for state dropdown
      var stateComp = place.address_components.find(function (c) { return c.types.indexOf('administrative_area_level_1') >= 0; });
      if (stateComp) setPropertyField('state', stateComp.short_name);
    });
  };

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
        utils.initFileUploadArea({
          triggerEl: input.closest('label') || input.parentElement,
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
            state.companyId = p.ID || p.id;
            state.entityContactId = p.Primary_Person_Contact_ID;
            input.value = p.Name || p.name || '';
            var entityInput = $q('[data-contact-field="entity-id"]');
            if (entityInput) entityInput.value = state.companyId;
            panel.classList.add('hidden');

            // Populate entity contact fields
            var section = $q('[data-contact-section="entity"]');
            if (section) {
              var contactIdInput = section.querySelector('[data-contact-field="contact_id"]');
              if (contactIdInput) contactIdInput.value = p.Primary_Person_Contact_ID || '';
              setEntityField(section, 'first_name', p.Primary_Person_First_Name);
              setEntityField(section, 'last_name', p.Primary_Person_Last_Name);
              setEntityField(section, 'email', p.Primary_Person_Email);
              setEntityField(section, 'sms_number', p.Primary_Person_SMS_Number);
            }

            var viewBtn = $('view-contact-detail');
            if (viewBtn) viewBtn.classList.remove('hidden');

            // Load entity related data
            var reqId = ++state.entityRelatedRequestId;
            showRelatedLoading();
            fetchRelated(p.Primary_Person_Email || '').then(function (data) {
              if (state.entityRelatedRequestId !== reqId) return;
              renderRelatedData(data);
            });
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

    setSaveButtonLoading(true);
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
      setSaveButtonLoading(false);
    });
  }

  function setSaveButtonLoading(loading) {
    var btn = $q('[data-contact-save]');
    var label = $q('[data-contact-save-label]');
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('opacity-70', loading);
    if (label) {
      label.textContent = loading ? (btn.dataset.loadingLabel || 'Adding...') : (btn.dataset.baseLabel || 'Add New Contact');
    }
  }

  // ─── Controller: Submit Inquiry ───────────────────────────────────────────────

  function onSubmit() {
    // Validate contact
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
      if (typeof utils.showAlertModal === 'function') {
        utils.showAlertModal({ title: 'Contact Required', message: 'Please select a contact first.', buttonLabel: 'OK' });
      } else {
        alert('Please select a contact first.');
      }
      return;
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
      } else if (normalizedKey === 'date_job_required_by' && el.value) {
        var parts = el.value.split('/');
        if (parts.length === 3) {
          var epoch = Math.floor(new Date(parts[2], parts[1] - 1, parts[0]).getTime() / 1000);
          inquiryPayload[normalizedKey] = epoch || '';
        }
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

    // Submit
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
          showSubmitSuccess(inquiryIdFromUrl ? 'Inquiry updated.' : 'Inquiry submitted.');
        });
      }

      showSubmitSuccess(inquiryIdFromUrl ? 'Inquiry updated.' : 'Inquiry submitted.');
    }).catch(function (err) {
      console.error('[NewInquiry] Submit failed:', err);
      if (typeof utils.showAlertModal === 'function') {
        utils.showAlertModal({ title: 'Error', message: 'Failed to submit inquiry. Please try again.', buttonLabel: 'OK' });
      } else {
        alert('Failed to submit inquiry.');
      }
    }).finally(function () {
      if (typeof utils.hideLoader === 'function') utils.hideLoader(null, null, true);
    });
  }

  function showSubmitSuccess(message) {
    if (typeof utils.showAlertModal === 'function') {
      utils.showAlertModal({
        title: 'Success',
        message: message,
        buttonLabel: 'OK',
        onConfirm: function () { window.history.back(); },
      });
    } else {
      alert(message);
      window.history.back();
    }
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

          if (c.Email) {
            loadRelatedData(c.Email);
          }
        }
      });
    }

    // Set property
    if (data.Property_ID) {
      state.propertyId = data.Property_ID;
      var propInput = $('selected-property-id');
      if (propInput) propInput.value = data.Property_ID;
      fetchPropertyById(data.Property_ID).then(function (result) {
        if (result.resp && result.resp[0]) populatePropertyFields(result.resp[0]);
      });
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
        loadContacts();
        checkEditMode();
      }).catch(function (err) {
        console.error('[NewInquiry] VitalSync connection failed:', err);
      });
    }

    // Populate dropdowns and checkbox groups
    populateDropdowns();

    // Bind UI
    bindContactSearch();
    bindContactTabs();
    bindRelatedTabs();
    bindHeaderButtons();
    bindSameAsContactAddress();
    initFlatpickr();
    initFileUploads();

    // Bind same-as-contact checkbox for each section
    $qa('[data-same-as-contact]').forEach(function (cb) {
      cb.addEventListener('change', function () { syncWorkRequested(); });
    });

    // Bind name input changes for work requested sync
    $qa('[data-contact-field="first_name"], [data-contact-field="last_name"]').forEach(function (input) {
      input.addEventListener('input', function () { syncWorkRequested(); });
    });
  }

  // ─── Expose ───────────────────────────────────────────────────────────────────

  window.PtpmNewInquiry = {
    init: init,
    getState: function () { return state; },
  };
})();
