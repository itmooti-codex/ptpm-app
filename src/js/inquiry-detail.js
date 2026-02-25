/**
 * Inquiry Detail — Alpine.js component.
 * Provides data, state, and methods for the inquiry detail page.
 *
 * Usage: <body x-data="inquiryDetail">
 */
document.addEventListener('alpine:init', function () {
  Alpine.data('inquiryDetail', function () {
    var Q = window.PtpmQueries;
    var UI = window.PtpmUI;
    var Panels = window.PtpmPanels;
    var Utils = window.PtpmUtils || window.AppUtils || {};
    var Config = window.AppConfig || {};
    var ACTION_STATUS_POLL_MS = 15000;
    var OPTION_TEXT_BY_ID = {
      noise_signs: {
        '768': 'Fighting', '767': 'Walking', '766': 'Heavy', '765': 'Footsteps', '764': 'Running',
        '763': 'Scurrying', '762': 'Thumping', '761': 'Hissing', '760': 'Shuffle', '759': 'Scratching',
        '758': 'Can hear coming & going', '757': 'Movement', '756': 'Gnawing', '755': 'Rolling',
        '754': 'Dragging', '753': 'Squeaking', '752': 'Galloping', '751': 'Poss Pee', '750': 'Fast',
        '749': 'Slow', '748': 'Bad Smell',
      },
      pest_location: {
        '735': 'Upper Ceiling', '734': 'Between floors', '733': 'In Walls', '732': 'In House',
        '731': 'Chimney', '730': 'Garage', '729': 'Kitchen', '728': 'Hand Catch', '727': 'On roof',
        '726': 'Underneath House', '725': 'Under Solar Panels',
      },
      pest_active_times: {
        '747': 'Dawn', '746': 'Dusk', '745': 'Dusk & Dawn', '744': 'During Day', '743': 'Middle of night',
        '742': 'Night', '741': 'Early morning', '740': 'Evening', '739': '1-2 am', '738': '3-4 am',
        '737': '7 - 8 pm', '736': '7.30-10 pm',
      },
    };

    return {
      // ── State ──────────────────────────────────────────────────────────
      loading: true,
      error: null,

      // Primary record
      inquiry: null,
      inquiryId: null,

      // Related records
      contact: null,
      property: null,
      serviceProvider: null,
      serviceRecord: null,
      linkedJob: null,
      propertyContacts: [],
      propertyUploads: [],

      // Tab panel data (lazy-loaded)
      memos: null,
      tasks: null,
      notes: null,
      appointments: null,
      uploadsData: null,
      comms: null,
      spViews: null,

      // UI state
      activeTab: 'memos',
      showEmailMenu: false,
      showMoreActions: false,
      toastMessage: null,
      toastTimer: null,

      // Editable status fields
      inquiryStatus: '',
      salesStage: '',
      actionStatusPollTimer: null,
      optionMaps: { noise_signs: {}, pest_location: {}, pest_active_times: {} },

      // ── Init ───────────────────────────────────────────────────────────
      async init() {
        // Get inquiry ID from URL
        var params = new URLSearchParams(window.location.search);
        this.inquiryId = params.get('deal') || params.get('inquiry') || params.get('id');
        if (!this.inquiryId) {
          this.error = 'No inquiry ID provided. Add ?deal=ID to the URL.';
          this.loading = false;
          return;
        }

        try {
          await this.loadPrimaryData();
          this.startActionStatusPolling();
          this.loading = false;
          // Load first tab data
          this.loadTabData(this.activeTab);
          var self = this;
          window.addEventListener('beforeunload', function () {
            if (self.actionStatusPollTimer) clearInterval(self.actionStatusPollTimer);
          }, { once: true });
        } catch (err) {
          console.error('Failed to load inquiry detail:', err);
          this.error = err.message || 'Failed to load inquiry';
          this.loading = false;
        }
      },

      // ── Data Loading ───────────────────────────────────────────────────
      async loadPrimaryData() {
        // Load inquiry first
        this.inquiry = await Q.fetchInquiryDetail(this.inquiryId);
        if (!this.inquiry) throw new Error('Inquiry not found');
        await this.loadInquiryOptionMaps();

        this.inquiryStatus = this.inquiry.inquiry_status || '';
        this.salesStage = this.inquiry.sales_stage || '';

        // Load related records in parallel
        var promises = [];

        if (this.inquiry.primary_contact_id) {
          promises.push(Q.fetchContact(this.inquiry.primary_contact_id).then(function (c) { return { key: 'contact', data: c }; }));
        }
        if (this.inquiry.property_id) {
          promises.push(Q.fetchProperty(this.inquiry.property_id).then(function (p) { return { key: 'property', data: p }; }));
          promises.push(Q.fetchAffiliations(this.inquiry.property_id).then(function (a) { return { key: 'propertyContacts', data: a }; }));
        }
        if (this.inquiry.service_provider_id) {
          promises.push(Q.fetchServiceProvider(this.inquiry.service_provider_id).then(function (sp) { return { key: 'serviceProvider', data: sp }; }));
        }
        if (this.inquiry.service_inquiry_id) {
          promises.push(Q.fetchService(this.inquiry.service_inquiry_id).then(function (s) { return { key: 'serviceRecord', data: s }; }));
        }
        if (this.inquiry.quote_record_id) {
          promises.push(Q.fetchJobSummary(this.inquiry.quote_record_id).then(function (j) { return { key: 'linkedJob', data: j }; }));
        }

        var results = await Promise.allSettled(promises);
        var self = this;
        results.forEach(function (r) {
          if (r.status === 'fulfilled' && r.value) {
            self[r.value.key] = r.value.data;
          }
        });
      },

      // Tab data — lazy load on first access
      _loadedTabs: {},
      async loadTabData(tab) {
        if (this._loadedTabs[tab]) return;
        this._loadedTabs[tab] = true;
        var self = this;
        var id = this.inquiryId;
        var jobId = this.inquiry ? this.inquiry.quote_record_id : null;

        try {
          switch (tab) {
            case 'memos':
              self.memos = await Q.fetchForumPosts(id, jobId);
              break;
            case 'tasks':
              self.tasks = await Q.fetchTasksByDeal(id);
              break;
            case 'notes':
              self.notes = await Q.fetchNotesByDeal(id);
              break;
            case 'appointments':
              self.appointments = await Q.fetchAppointmentsByDeal(id);
              break;
            case 'uploads':
              self.uploadsData = await Q.fetchUploadsByDeal(id);
              break;
            case 'spviews':
              self.spViews = await Q.fetchSPViews(id);
              break;
            case 'comms':
              // Communications are notes of type API/system
              var allNotes = self.notes || await Q.fetchNotesByDeal(id);
              self.comms = (allNotes || []).filter(function (n) { return n.type === 'API' || n.type === 'Outgoing'; });
              break;
          }
        } catch (err) {
          console.warn('Failed to load tab data for ' + tab + ':', err);
        }
      },

      // ── Tab Panel Rendering ────────────────────────────────────────────
      get panelHtml() {
        switch (this.activeTab) {
          case 'memos': return Panels.memos(this.memos);
          case 'tasks': return Panels.tasks(this.tasks);
          case 'notes': return Panels.notes(this.notes);
          case 'appointments': return Panels.appointments(this.appointments, { filter: 'Inquiry' });
          case 'uploads': return Panels.uploads(this.uploadsData);
          case 'comms': return Panels.comms(this.comms);
          case 'spviews': return Panels.spViews(this.spViews);
          default: return '';
        }
      },

      get tabItems() {
        return [
          { id: 'memos', label: 'Memos', count: this.memos ? this.memos.length : null },
          { id: 'tasks', label: 'Tasks', count: this.tasks ? this.tasks.filter(function (t) { return t.status === 'Open'; }).length : null },
          { id: 'notes', label: 'Notes', count: this.notes ? this.notes.length : null },
          { id: 'appointments', label: 'Appointments', count: this.appointments ? this.appointments.length : null },
          { id: 'uploads', label: 'Uploads', count: this.uploadsData ? this.uploadsData.length : null },
          { id: 'comms', label: 'Communications', count: this.comms ? this.comms.length : null },
          { id: 'spviews', label: 'SP Views', count: this.spViews ? this.spViews.length : null },
        ];
      },

      switchTab(tab) {
        this.activeTab = tab;
        this.loadTabData(tab);
      },

      // ── Computed HTML helpers ──────────────────────────────────────────

      get contactInitials() {
        if (!this.contact) return '?';
        return ((this.contact.first_name || '').charAt(0) + (this.contact.last_name || '').charAt(0)).toUpperCase();
      },

      get contactName() {
        if (!this.contact) return 'Unknown Contact';
        return ((this.contact.first_name || '') + ' ' + (this.contact.last_name || '')).trim();
      },

      get contactAddress() {
        if (!this.contact) return '';
        return [this.contact.address, this.contact.city, this.contact.state, this.contact.zip_code].filter(Boolean).join(', ');
      },

      get spInitial() {
        if (!this.serviceProvider) return '?';
        return (this.serviceProvider.name || '?').charAt(0).toUpperCase();
      },

      get spName() {
        if (!this.serviceProvider) return 'Unassigned';
        return ((this.serviceProvider.name || '') + ' ' + (this.serviceProvider.last_name || '')).trim();
      },

      get spCapacityColor() {
        if (!this.serviceProvider) return 'text-gray-400';
        var cap = this.serviceProvider.workload_capacity || '';
        if (cap === 'OKAY') return 'text-emerald-600';
        if (cap === 'BUSY') return 'text-amber-600';
        return 'text-red-600';
      },

      get propertyAddress() {
        if (!this.property) return '';
        var prefix = this.property.unit_number ? this.property.unit_number + '/' : '';
        return prefix + (this.property.address_1 || '');
      },

      get propertySuburb() {
        if (!this.property) return '';
        return [this.property.suburb_town, this.property.state, this.property.postal_code].filter(Boolean).join(', ');
      },

      get noiseSigns() {
        return this.parseOptions(this.inquiry ? this.inquiry.noise_signs : '', 'noise_signs');
      },

      get pestLocation() {
        return this.parseOptions(this.inquiry ? this.inquiry.pest_location : '', 'pest_location');
      },

      get pestActiveTimes() {
        return this.parseOptions(this.inquiry ? this.inquiry.pest_active_times : '', 'pest_active_times');
      },

      get buildingFeatures() {
        return this.parseOptions(this.property ? this.property.building_features : '');
      },

      parseOptions(val, fieldName) {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val.map(function (v) { return String(v || '').trim(); }).filter(Boolean);
        }
        var raw = String(val);
        var map = this.optionMaps[fieldName] || OPTION_TEXT_BY_ID[fieldName] || {};
        if (raw.indexOf('*/*') >= 0) {
          return raw.split('*/*')
            .map(function (s) { return s.trim(); })
            .filter(Boolean)
            .map(function (id) { return map[id] || id; });
        }
        return raw.split(/[\n,|]/)
          .map(function (s) { return s.trim(); })
          .filter(Boolean)
          .map(function (token) {
            var numeric = token.replace(/[^\d]/g, '');
            return (numeric && map[numeric]) || map[token] || token;
          });
      },

      async loadInquiryOptionMaps() {
        // Best-effort enrichment: keeps UI readable when values come as serialized option IDs.
        try {
          var bundle = await Promise.all([
            Q.fetchOntraportListFieldOptions(149, 'noise_signs_options_as_text').catch(function () { return []; }),
            Q.fetchOntraportListFieldOptions(149, 'pest_location_options_as_text').catch(function () { return []; }),
            Q.fetchOntraportListFieldOptions(149, 'pest_active_times_options_as_text').catch(function () { return []; }),
          ]);
          function toMap(list) {
            var out = {};
            (list || []).forEach(function (row) {
              var key = row && row.id != null ? String(row.id) : '';
              var name = row && row.name ? String(row.name) : '';
              if (key && name) out[key] = name;
            });
            return out;
          }
          this.optionMaps.noise_signs = Object.assign({}, OPTION_TEXT_BY_ID.noise_signs, toMap(bundle[0]));
          this.optionMaps.pest_location = Object.assign({}, OPTION_TEXT_BY_ID.pest_location, toMap(bundle[1]));
          this.optionMaps.pest_active_times = Object.assign({}, OPTION_TEXT_BY_ID.pest_active_times, toMap(bundle[2]));
        } catch (err) {
          this.optionMaps.noise_signs = Object.assign({}, OPTION_TEXT_BY_ID.noise_signs);
          this.optionMaps.pest_location = Object.assign({}, OPTION_TEXT_BY_ID.pest_location);
          this.optionMaps.pest_active_times = Object.assign({}, OPTION_TEXT_BY_ID.pest_active_times);
        }
      },

      normalizeActionStatus(status) {
        var s = String(status || '').toLowerCase().trim();
        if (!s) return 'processing';
        if (s === 'ok' || s === 'done' || s === 'complete') return 'completed';
        if (s === 'error') return 'failed';
        return s;
      },

      workflowToActionStatus(res) {
        if (!res) return 'processing';
        if (res.ok === false) return 'failed';
        return this.normalizeActionStatus(res.status || (res.ok ? 'completed' : 'processing'));
      },

      startActionStatusPolling() {
        var self = this;
        if (self.actionStatusPollTimer) clearInterval(self.actionStatusPollTimer);
        self.actionStatusPollTimer = setInterval(function () {
          self.refreshActionStatus();
        }, ACTION_STATUS_POLL_MS);
      },

      async refreshActionStatus() {
        if (!this.inquiryId || this.loading) return;
        try {
          var latest = await Q.fetchInquiryDetail(this.inquiryId);
          if (!latest || !this.inquiry) return;
          this.inquiry.last_action_status = latest.last_action_status;
          this.inquiry.last_action_message = latest.last_action_message;
          this.inquiry.last_action_type = latest.last_action_type;
          this.inquiry.last_action_request_id = latest.last_action_request_id;
          this.inquiry.last_action_at = latest.last_action_at;
          this.inquiry.last_action_source = latest.last_action_source;
        } catch (_) {
          // keep page responsive if status refresh fails
        }
      },

      // ── Actions ────────────────────────────────────────────────────────

      async updateInquiryStatus() {
        try {
          await Q.mutate('updateDeal', {
            id: Number(this.inquiryId),
            payload: { inquiry_status: this.inquiryStatus },
          });
          this.showToast('Status updated to ' + this.inquiryStatus);
        } catch (err) {
          console.error('Failed to update status:', err);
          this.showToast('Failed to update status');
        }
      },

      async updateSalesStage() {
        try {
          await Q.mutate('updateDeal', {
            id: Number(this.inquiryId),
            payload: { sales_stage: this.salesStage },
          });
          this.showToast('Sales stage updated to ' + this.salesStage);
        } catch (err) {
          console.error('Failed to update sales stage:', err);
          this.showToast('Failed to update sales stage');
        }
      },

      navigateToJob() {
        if (!this.inquiry || !this.inquiry.quote_record_id) return;
        var tpl = Config.JOB_DETAIL_URL_TEMPLATE || 'job-detail.html?job={id}';
        window.location.href = tpl.replace('{id}', this.inquiry.quote_record_id);
      },

      navigateToCustomer() {
        if (!this.contact) return;
        var tpl = Config.CUSTOMER_DETAIL_URL_TEMPLATE || 'customer-detail.html?contact={id}';
        window.location.href = tpl.replace('{id}', this.contact.id);
      },

      navigateToCreateQuote() {
        var tpl = Config.NEW_JOB_URL || 'job-detail.html?new=1&inquiry=' + this.inquiryId;
        window.location.href = tpl + (tpl.indexOf('?') >= 0 ? '&' : '?') + 'inquiry=' + this.inquiryId;
      },

      navigateToProperty() {
        if (!this.property || !this.property.id) return;
        var tpl = Config.PROPERTY_DETAIL_URL_TEMPLATE || '';
        if (!tpl) {
          this.showToast('Property detail URL is not configured');
          return;
        }
        window.location.href = tpl.replace('{id}', this.property.id);
      },

      navigateToInquiryJobLink() {
        if (!this.inquiry || !this.inquiry.inquiry_for_job_id) return;
        var tpl = Config.JOB_DETAIL_URL_TEMPLATE || 'job-detail.html?job={id}';
        window.location.href = tpl.replace('{id}', this.inquiry.inquiry_for_job_id);
      },

      async editInquiryDetails() {
        var FM = window.PtpmFormModal; if (!FM) return;
        var source = this.inquiry || {};
        try {
          var data = await FM.open({
            title: 'Edit Inquiry Details',
            fields: FM.FORM_DEFS.inquiryDetails,
            values: {
              type: source.type,
              inquiry_source: source.inquiry_source,
              how_did_you_hear: source.how_did_you_hear,
              service_type: source.service_type,
              account_type: source.account_type,
              how_can_we_help: source.how_can_we_help,
              renovations: source.renovations,
              resident_availability: source.resident_availability,
            },
            submitLabel: 'Save',
          });
          await Q.mutate('updateDeal', {
            id: Number(this.inquiryId),
            payload: {
              type: data.type || undefined,
              inquiry_source: data.inquiry_source || undefined,
              how_did_you_hear: data.how_did_you_hear || undefined,
              service_type: data.service_type || undefined,
              account_type: data.account_type || undefined,
              how_can_we_help: data.how_can_we_help || undefined,
              renovations: data.renovations || undefined,
              resident_availability: data.resident_availability || undefined,
            },
          });
          await this.loadPrimaryData();
          this.showToast('Inquiry details updated');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to update inquiry details');
          }
        }
      },

      async editAdminNotes() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({
            title: 'Edit Admin Notes',
            fields: FM.FORM_DEFS.inquiryAdminNotes,
            values: { admin_notes: (this.inquiry && this.inquiry.admin_notes) || '' },
            submitLabel: 'Save',
          });
          await Q.mutate('updateDeal', {
            id: Number(this.inquiryId),
            payload: { admin_notes: data.admin_notes || '' },
          });
          this.inquiry.admin_notes = data.admin_notes || '';
          this.showToast('Admin notes updated');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to update admin notes');
          }
        }
      },

      async editClientNotes() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({
            title: 'Edit Client Notes',
            fields: FM.FORM_DEFS.inquiryClientNotes,
            values: { client_notes: (this.inquiry && this.inquiry.client_notes) || '' },
            submitLabel: 'Save',
          });
          await Q.mutate('updateDeal', {
            id: Number(this.inquiryId),
            payload: { client_notes: data.client_notes || '' },
          });
          this.inquiry.client_notes = data.client_notes || '';
          this.showToast('Client notes updated');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to update client notes');
          }
        }
      },

      async sendMemo() {
        var input = document.querySelector('[data-panel-action="memo-input"]');
        var text = input ? input.value.trim() : '';
        if (!text) return;

        try {
          await Q.mutate('createForumPost', {
            payload: {
              post_copy: text,
              related_inquiry_id: Number(this.inquiryId),
              author_id: Number(Config.CONTACT_ID || Config.LOGGED_IN_USER_ID),
            },
          });
          if (input) input.value = '';
          this._loadedTabs['memos'] = false;
          await this.loadTabData('memos');
          this.showToast('Memo posted');
        } catch (err) {
          console.error('Failed to post memo:', err);
          this.showToast('Failed to post memo');
        }
      },

      // Event delegation for panel actions
      handlePanelClick(event) {
        var target = event.target.closest('[data-panel-action]');
        if (!target) return;
        var action = target.getAttribute('data-panel-action');

        switch (action) {
          case 'memo-send': this.sendMemo(); break;
          case 'task-toggle': this.toggleTask(target.getAttribute('data-task-id')); break;
          case 'task-add': this.addTask(); break;
          case 'note-add': this.addNote(); break;
          case 'upload-add': this.addUpload(); break;
          case 'upload-view': this.viewUpload(target.getAttribute('data-upload-id')); break;
          case 'appointment-add': this.addAppointment(); break;
        }
      },

      async toggleTask(taskId) {
        if (!taskId) return;
        var task = (this.tasks || []).find(function (t) { return String(t.id) === String(taskId); });
        if (!task) return;
        var newStatus = task.status === 'Completed' ? 'Open' : 'Completed';
        try {
          await Q.mutate('updateTask', { id: Number(taskId), payload: { status: newStatus } });
          task.status = newStatus;
          this.showToast('Task ' + (newStatus === 'Completed' ? 'completed' : 'reopened'));
        } catch (err) {
          console.error('Failed to toggle task:', err);
        }
      },

      // ── Panel CRUD actions ──────────────────────────────────────────────

      async addTask() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Add Task', fields: FM.FORM_DEFS.task, submitLabel: 'Create Task' });
          await Q.mutate('createTask', { payload: { subject: data.subject, details: data.details || undefined, date_due: data.date_due || undefined, status: 'Open', Deal_id: Number(this.inquiryId) } });
          this._loadedTabs['tasks'] = false; await this.loadTabData('tasks');
          this.showToast('Task created');
        } catch (e) { if (e && e.message !== 'cancelled') { console.error(e); this.showToast('Failed to create task'); } }
      },

      async addNote() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Add Note', fields: FM.FORM_DEFS.note, submitLabel: 'Add Note' });
          await Q.mutate('createNote', { payload: { note: data.note, type: 'Manual', Deal_id: Number(this.inquiryId) } });
          this._loadedTabs['notes'] = false; await this.loadTabData('notes');
          this.showToast('Note added');
        } catch (e) { if (e && e.message !== 'cancelled') { console.error(e); this.showToast('Failed to add note'); } }
      },

      async addUpload() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Upload File', fields: FM.FORM_DEFS.upload, submitLabel: 'Upload' });
          var payload = { type: data.type, inquiry_id: Number(this.inquiryId), customer_can_view: data.customer_can_view || false };
          var fileName = data.file_name || 'Upload';
          if (data.type === 'Photo') { payload.photo_name = fileName; }
          else if (data.type === 'Form') { payload.form_name = fileName; }
          else { payload.file_name = fileName; }
          await Q.mutate('createUpload', { payload: payload });
          this._loadedTabs['uploads'] = false; await this.loadTabData('uploads');
          this.showToast('File uploaded');
        } catch (e) { if (e && e.message !== 'cancelled') { console.error(e); this.showToast('Failed to upload'); } }
      },

      viewUpload(uploadId) {
        if (!uploadId) return;
        var upload = (this.uploadsData || []).find(function (u) { return String(u.id) === String(uploadId); });
        if (!upload) return;
        var src = upload.file_upload || upload.photo_upload || upload.form_upload || '';
        var name = upload.file_name || upload.photo_name || upload.form_name || 'File';
        if (!src) { this.showToast('No file URL available'); return; }
        var Utils = window.PtpmUtils || window.AppUtils || {};
        if (Utils.ensureFilePreviewModal) {
          var preview = Utils.ensureFilePreviewModal();
          preview.show({ src: src, name: name });
        } else {
          window.open(src, '_blank');
        }
      },

      async addAppointment() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Schedule Appointment', fields: FM.FORM_DEFS.appointment, submitLabel: 'Create' });
          await Q.mutate('createAppointment', { payload: { title: data.title, start_time: data.start_time || undefined, status: data.status || 'Scheduled', inquiry_id: Number(this.inquiryId) } });
          this._loadedTabs['appointments'] = false; await this.loadTabData('appointments');
          this.showToast('Appointment created');
        } catch (e) { if (e && e.message !== 'cancelled') { console.error(e); this.showToast('Failed to create appointment'); } }
      },

      showToast(msg) {
        var self = this;
        if (self.toastTimer) clearTimeout(self.toastTimer);
        self.toastMessage = msg;
        self.toastTimer = setTimeout(function () { self.toastMessage = null; }, 3000);
      },

      newActionRequestId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
          return window.crypto.randomUUID();
        }
        return 'ptpm-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
      },

      async dispatchWorkflowAction(actionType, payload) {
        var webhook = Config.N8N_ACTION_WEBHOOK_URL || '';
        var timeoutMs = Number(Config.N8N_ACTION_WEBHOOK_TIMEOUT_MS || 20000);
        var contractVersion = Config.N8N_ACTION_CONTRACT_VERSION || 'ptpm.action.v1';
        var requestId = this.newActionRequestId();

        // Dev-safe fallback while webhook is being wired.
        if (!webhook) {
          return {
            ok: true,
            status: 'queued',
            mode: 'local-fallback',
            requestId: requestId,
            contractVersion: contractVersion,
            message: 'Webhook not configured yet',
          };
        }

        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = setTimeout(function () {
          if (controller) controller.abort();
        }, timeoutMs);

        try {
          var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-PTPM-Request-Id': requestId,
            'X-PTPM-Contract-Version': contractVersion,
          };
          if (Config.N8N_ACTION_WEBHOOK_TOKEN) {
            headers.Authorization = 'Bearer ' + Config.N8N_ACTION_WEBHOOK_TOKEN;
          }

          var res = await fetch(webhook, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              requestId: requestId,
              contractVersion: contractVersion,
              source: 'inquiry-detail',
              actionType: actionType,
              inquiryId: Number(this.inquiryId),
              inquiryUniqueId: this.inquiry && this.inquiry.unique_id ? this.inquiry.unique_id : null,
              contactId: this.contact && this.contact.id ? Number(this.contact.id) : null,
              serviceProviderId: this.serviceProvider && this.serviceProvider.id ? Number(this.serviceProvider.id) : null,
              actorContactId: Config.CONTACT_ID ? Number(Config.CONTACT_ID) : null,
              actorUserId: Config.LOGGED_IN_USER_ID ? Number(Config.LOGGED_IN_USER_ID) : null,
              payload: payload || {},
              sentAt: new Date().toISOString(),
            }),
            signal: controller ? controller.signal : undefined,
          });

          var body = null;
          try { body = await res.json(); } catch (_) { /* ignore non-json */ }

          if (!res.ok) {
            throw new Error((body && body.message) || ('Webhook HTTP ' + res.status));
          }
          if (body && body.ok === false) {
            throw new Error(body.message || 'Webhook rejected action');
          }

          if (body) return body;
          return {
            ok: true,
            status: 'dispatched',
            requestId: requestId,
            contractVersion: contractVersion,
            message: 'Action dispatched',
          };
        } catch (err) {
          if (err && err.name === 'AbortError') {
            throw new Error('Action webhook timed out after ' + timeoutMs + 'ms');
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }
      },

      confirmAction(opts) {
        var self = this;
        return new Promise(function (resolve) {
          if (!Utils.showAlertModal) {
            resolve(window.confirm(opts && opts.message ? opts.message : 'Are you sure?'));
            return;
          }
          Utils.showAlertModal({
            title: (opts && opts.title) || 'Confirm Action',
            message: (opts && opts.message) || 'Are you sure?',
            buttonLabel: (opts && opts.confirmLabel) || 'Confirm',
            secondaryButtonLabel: (opts && opts.cancelLabel) || 'Cancel',
            onConfirm: function () { resolve(true); },
            onSecondary: function () { resolve(false); },
          });
        });
      },

      // Email action
      async sendEmail(template) {
        this.showEmailMenu = false;
        try {
          var resp = await this.dispatchWorkflowAction('inquiry.email', {
            template: template,
            dealName: this.inquiry ? this.inquiry.deal_name : null,
            quoteRecordId: this.inquiry ? this.inquiry.quote_record_id : null,
          });
          if (this.inquiry) {
            this.inquiry.last_action_status = this.workflowToActionStatus(resp);
            this.inquiry.last_action_message = (resp && resp.message) || ('Email action "' + template + '" dispatched');
            this.inquiry.last_action_type = 'inquiry.email';
            this.inquiry.last_action_request_id = (resp && resp.requestId) || this.newActionRequestId();
            this.inquiry.last_action_source = 'inquiry-detail';
            this.inquiry.last_action_at = new Date().toISOString();
          }
          this.refreshActionStatus();
          this.showToast('Email action "' + template + '" dispatched');
        } catch (err) {
          console.error('Email action failed:', template, err);
          this.showToast('Failed to dispatch email action');
        }
      },

      moreAction(action) {
        this.showMoreActions = false;
        var self = this;
        (async function () {
          try {
            if (action === 'Cancel Inquiry') {
              var yesCancel = await self.confirmAction({
                title: 'Cancel Inquiry',
                message: 'Cancel this inquiry and set its status to Cancelled?',
                confirmLabel: 'Cancel Inquiry',
              });
              if (!yesCancel) return;
              await Q.mutate('updateDeal', {
                id: Number(self.inquiryId),
                payload: { inquiry_status: 'Cancelled' },
              });
              self.inquiryStatus = 'Cancelled';
              if (self.inquiry) self.inquiry.inquiry_status = 'Cancelled';
              self.showToast('Inquiry cancelled');
              return;
            }

            if (action === 'Return to Admin') {
              var yesReturn = await self.confirmAction({
                title: 'Return Inquiry To Admin',
                message: 'Mark this inquiry as returned to admin?',
                confirmLabel: 'Return',
              });
              if (!yesReturn) return;
              await Q.mutate('updateDeal', {
                id: Number(self.inquiryId),
                payload: {
                  return_inquiry_to_admin: true,
                  inquiry_return_reason: 'Returned to admin from Inquiry Detail',
                },
              });
              if (self.inquiry) {
                self.inquiry.return_inquiry_to_admin = true;
                self.inquiry.inquiry_return_reason = 'Returned to admin from Inquiry Detail';
              }
              self.showToast('Inquiry returned to admin');
              return;
            }

            self.showToast('Action "' + action + '" is queued for next implementation phase');
          } catch (err) {
            console.error('More action failed:', action, err);
            self.showToast('Failed to run action: ' + action);
          }
        })();
      },

      // ── UI helpers used in template ────────────────────────────────────
      badge: function (s) { return UI.badge(s); },
      tagPills: function (arr) { return UI.tagPills(arr); },
      money: function (n) { return UI.money(n); },
      field: function (l, v, o) { return UI.field(l, v, o); },
    };
  });
});
