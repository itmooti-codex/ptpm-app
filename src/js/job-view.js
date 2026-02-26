/**
 * Job View — Alpine.js component.
 * Usage: <body x-data="jobDetail">
 */
document.addEventListener('alpine:init', function () {
  Alpine.data('jobDetail', function () {
    var Q = window.PtpmQueries;
    var UI = window.PtpmUI;
    var Panels = window.PtpmPanels;
    var Utils = window.PtpmUtils || window.AppUtils || {};
    var Interaction = window.PtpmInteraction || {};
    var Config = window.AppConfig || {};

    return {
      loading: true,
      error: null,

      job: null,
      jobId: null,

      contact: null,
      company: null,
      property: null,
      serviceProvider: null,
      linkedInquiry: null,
      callbackJobs: [],
      propertyContacts: [],

      activities: [],
      materials: [],

      memos: null,
      tasks: null,
      notes: null,
      appointments: null,
      uploadsData: null,
      comms: null,
      materialsTab: null,

      activeTab: 'memos',
      showEmailMenu: false,
      showMoreActions: false,
      toastMessage: null,
      toastTimer: null,
      taskActionLoading: {},
      taskOutcomeOptions: [],
      taskOutcomeOptionsLoaded: false,

      jobStatus: '',
      quoteStatus: '',
      paymentStatus: '',

      _loadedTabs: {},

      async init() {
        var params = new URLSearchParams(window.location.search || '');
        this.jobId = params.get('job') || params.get('quote') || params.get('payment');
        if (!this.jobId) {
          this.error = 'No job ID provided. Add ?job=ID to the URL.';
          this.loading = false;
          return;
        }

        try {
          await this.loadPrimaryData();
          this.loading = false;
          this.loadTabData(this.activeTab);
        } catch (err) {
          console.error('Failed to load job detail:', err);
          this.error = err && err.message ? err.message : 'Failed to load job';
          this.loading = false;
        }
      },

      async loadPrimaryData() {
        this.job = await Q.fetchJobDetail(this.jobId);
        if (!this.job) throw new Error('Job not found');

        this.jobStatus = this.job.job_status || '';
        this.quoteStatus = this.job.quote_status || '';
        this.paymentStatus = this.job.payment_status || '';

        var promises = [
          Q.fetchActivities(this.jobId).then(function (rows) { return { key: 'activities', data: rows || [] }; }),
          Q.fetchMaterials(this.jobId).then(function (rows) { return { key: 'materials', data: rows || [] }; }),
          Q.fetchCallbackJobs(this.jobId).then(function (rows) { return { key: 'callbackJobs', data: rows || [] }; }),
          Q.fetchInquiriesForJob(this.jobId).then(function (rows) { return { key: 'linkedInquiry', data: rows && rows[0] ? rows[0] : null }; }),
        ];

        if (this.job.property_id) {
          promises.push(Q.fetchProperty(this.job.property_id).then(function (rec) { return { key: 'property', data: rec }; }));
          promises.push(Q.fetchAffiliations(this.job.property_id).then(function (rows) { return { key: 'propertyContacts', data: rows || [] }; }));
        }
        if (this.job.primary_service_provider_id) {
          promises.push(Q.fetchServiceProvider(this.job.primary_service_provider_id).then(function (rec) { return { key: 'serviceProvider', data: rec }; }));
        }
        if (this.job.client_individual_id) {
          promises.push(Q.fetchContact(this.job.client_individual_id).then(function (rec) { return { key: 'contact', data: rec }; }));
        }
        if (this.job.client_entity_id) {
          promises.push(Q.fetchCompany(this.job.client_entity_id).then(function (rec) { return { key: 'company', data: rec }; }));
        }

        var results = await Promise.allSettled(promises);
        var self = this;
        results.forEach(function (r) {
          if (r.status === 'fulfilled' && r.value) self[r.value.key] = r.value.data;
        });
      },

      async loadTabData(tab) {
        if (this._loadedTabs[tab]) return;
        this._loadedTabs[tab] = true;
        var self = this;

        try {
          switch (tab) {
            case 'memos':
              self.memos = await Q.fetchForumPosts(self.linkedInquiry ? self.linkedInquiry.id : null, Number(self.jobId));
              break;
            case 'tasks':
              self.tasks = await Q.fetchTasksByJob(Number(self.jobId));
              break;
            case 'notes':
              self.notes = await Q.fetchNotesByJob(Number(self.jobId));
              break;
            case 'appointments':
              self.appointments = await Q.fetchAppointmentsByJob(Number(self.jobId));
              break;
            case 'uploads':
              self.uploadsData = await Q.fetchUploadsByJob(Number(self.jobId));
              break;
            case 'materials':
              self.materialsTab = await Q.fetchMaterials(Number(self.jobId));
              break;
            case 'comms': {
              var allNotes = self.notes || await Q.fetchNotesByJob(Number(self.jobId));
              self.comms = (allNotes || []).filter(function (n) {
                return n.type === 'API' || n.type === 'Outgoing';
              });
              break;
            }
          }
        } catch (err) {
          console.warn('Failed loading tab', tab, err);
        }
      },

      switchTab(tab) {
        this.activeTab = tab;
        this.loadTabData(tab);
      },

      get panelHtml() {
        switch (this.activeTab) {
          case 'memos': return Panels.memos(this.memos);
          case 'tasks': return Panels.tasks(this.tasks);
          case 'notes': return Panels.notes(this.notes);
          case 'appointments': return Panels.appointments(this.appointments, { filter: 'Job' });
          case 'uploads': return Panels.uploads(this.uploadsData);
          case 'materials': return Panels.materials(this.materialsTab || this.materials);
          case 'comms': return Panels.comms(this.comms);
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
          { id: 'materials', label: 'Materials', count: this.materialsTab ? this.materialsTab.length : (this.materials ? this.materials.length : null) },
          { id: 'comms', label: 'Communications', count: this.comms ? this.comms.length : null },
        ];
      },

      get jobDisplayId() {
        if (!this.job) return '';
        return this.job.unique_id ? ('JOB-' + this.job.unique_id) : ('JOB-' + this.jobId);
      },

      get clientDisplayName() {
        if (this.contact) return [this.contact.first_name || '', this.contact.last_name || ''].join(' ').trim() || 'Contact';
        if (this.company) return this.company.name || 'Company';
        return 'No client linked';
      },

      get propertyAddress() {
        if (!this.property) return '';
        return [this.property.address_1, this.property.address_2, this.property.suburb_town, this.property.state, this.property.postal_code]
          .filter(Boolean)
          .join(', ');
      },

      get spName() {
        if (!this.serviceProvider) return '';
        return [this.serviceProvider.first_name || this.serviceProvider.name || '', this.serviceProvider.last_name || ''].join(' ').trim();
      },

      get spInitial() {
        var n = this.spName || '?';
        return n.charAt(0).toUpperCase();
      },

      get spCapacityColor() {
        var cap = String((this.serviceProvider && this.serviceProvider.workload_capacity) || '').toUpperCase();
        if (cap === 'LOOKING') return 'text-emerald-600';
        if (cap === 'BUSY') return 'text-amber-600';
        if (cap === 'ABSENT') return 'text-rose-600';
        return 'text-gray-700';
      },

      get jobActivitySubtotal() {
        var total = (this.activities || []).reduce(function (sum, a) {
          var val = Number(a.activity_price || a.quoted_price || 0);
          return sum + (Number.isFinite(val) ? val : 0);
        }, 0);
        return total;
      },

      async updateJobStatus() {
        await this.updateJobStatuses({ job_status: this.jobStatus }, 'Job status updated');
      },

      async updateQuoteStatus() {
        await this.updateJobStatuses({ quote_status: this.quoteStatus }, 'Quote status updated');
      },

      async updatePaymentStatus() {
        await this.updateJobStatuses({ payment_status: this.paymentStatus }, 'Payment status updated');
      },

      async updateJobStatuses(payload, successMsg) {
        try {
          await Q.mutate('updateJob', { id: Number(this.jobId), payload: payload });
          if (this.job) {
            Object.keys(payload).forEach(function (k) { this.job[k] = payload[k]; }, this);
          }
          this.showToast(successMsg);
        } catch (err) {
          console.error('Status update failed', err);
          this.showToast('Failed to update status');
        }
      },

      handlePanelClick(event) {
        var self = this;
        var actionHandlers = {
          'memo-send': function () { self.sendMemo(); },
          'task-complete': function (target) { self.completeTask(target.getAttribute('data-task-id')); },
          'task-reopen': function (target) { self.reopenTask(target.getAttribute('data-task-id')); },
          'task-add': function () { self.addTask(); },
          'note-add': function () { self.addNote(); },
          'upload-add': function () { self.addUpload(); },
          'upload-view': function (target) { self.viewUpload(target.getAttribute('data-upload-id')); },
          'appointment-add': function () { self.addAppointment(); },
          'material-add': function () { self.addMaterial(); },
          'material-edit': function (target) { self.editMaterial(target.getAttribute('data-material-id')); },
        };
        if (Interaction.dispatchPanelAction) {
          Interaction.dispatchPanelAction(event, actionHandlers, function (action) {
            self.showToast('Action "' + action + '" coming soon');
          });
          return;
        }
        // Fallback if shared helper isn't loaded.
        var target = event.target.closest('[data-panel-action]');
        if (!target) return;
        var action = target.getAttribute('data-panel-action');
        if (actionHandlers[action]) actionHandlers[action](target, action, event);
        else self.showToast('Action "' + action + '" coming soon');
      },

      async refreshTasksTab() {
        this._loadedTabs.tasks = false;
        await this.loadTabData('tasks');
      },

      isTaskActionBusy(taskId) {
        return !!this.taskActionLoading[String(taskId || '')];
      },

      setTaskActionBusy(taskId, busy) {
        var key = String(taskId || '');
        if (!key) return;
        this.taskActionLoading[key] = !!busy;
        this.taskActionLoading = Object.assign({}, this.taskActionLoading);
      },

      normalizeTaskOutcomeOptions(rows) {
        return (rows || []).map(function (row) {
          var id = row && (row.id != null ? row.id : row.ID);
          var name = row && (row.name || row.Name || row.label || row.Label);
          if (id == null || !name) return null;
          return { value: String(id), label: String(name) };
        }).filter(Boolean);
      },

      async getTaskOutcomeOptions() {
        if (this.taskOutcomeOptionsLoaded) return this.taskOutcomeOptions || [];
        try {
          var rows = await Q.fetchTaskOutcomes();
          this.taskOutcomeOptions = this.normalizeTaskOutcomeOptions(rows);
        } catch (err) {
          console.warn('Failed to load task outcomes:', err);
          this.taskOutcomeOptions = [];
        } finally {
          this.taskOutcomeOptionsLoaded = true;
        }
        return this.taskOutcomeOptions;
      },

      async completeTask(taskId) {
        if (!taskId || this.isTaskActionBusy(taskId)) return;
        var task = (this.tasks || []).find(function (t) { return String(t.id) === String(taskId); });
        if (!task || task.status === 'Completed') return;
        var FM = window.PtpmFormModal;
        if (!FM) return;

        this.setTaskActionBusy(taskId, true);
        try {
          var outcomeOptions = await this.getTaskOutcomeOptions();
          var completionFields = (FM.FORM_DEFS.taskComplete || []).map(function (field) {
            if (field.name === 'outcome_id') return Object.assign({}, field, { options: outcomeOptions });
            return field;
          });
          var data = await FM.open({
            title: 'Complete Task',
            fields: completionFields,
            values: { outcome_id: '', completion_notes: '' },
            submitLabel: 'Complete Task',
          });
          await this.dispatchWorkflowAction('task.complete', {
            taskId: Number(taskId),
            taskSubject: task.subject || task.Subject || null,
            outcomeId: data.outcome_id ? Number(data.outcome_id) : null,
            notes: data.completion_notes || '',
            jobId: Number(this.jobId),
          });
          await this.refreshTasksTab();
          this.showToast('Task completed');
        } catch (err) {
          if (err && err.message === 'cancelled') return;
          console.error('Complete task failed:', err);
          this.showToast((err && err.message) || 'Failed to complete task');
        } finally {
          this.setTaskActionBusy(taskId, false);
        }
      },

      async reopenTask(taskId) {
        if (!taskId || this.isTaskActionBusy(taskId)) return;
        var task = (this.tasks || []).find(function (t) { return String(t.id) === String(taskId); });
        if (!task || task.status !== 'Completed') return;
        this.setTaskActionBusy(taskId, true);
        try {
          await Q.mutate('updateTask', {
            id: Number(taskId),
            payload: { status: 'Open', date_complete: null },
          });
          await this.refreshTasksTab();
          this.showToast('Task reopened');
        } catch (err) {
          console.error('Reopen task failed:', err);
          this.showToast('Failed to reopen task');
        } finally {
          this.setTaskActionBusy(taskId, false);
        }
      },

      async addTask() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Add Task', fields: FM.FORM_DEFS.task, submitLabel: 'Create Task' });
          var dueEpoch = data.date_due != null && !isNaN(Number(data.date_due)) ? Number(data.date_due) : undefined;
          await Q.mutate('createTask', {
            payload: {
              subject: data.subject,
              details: data.details || undefined,
              date_due: dueEpoch,
              status: 'Open',
              Job_id: Number(this.jobId),
            },
          });
          this._loadedTabs.tasks = false;
          await this.loadTabData('tasks');
          this.showToast('Task created');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to create task');
          }
        }
      },

      async addNote() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Add Note', fields: FM.FORM_DEFS.note, submitLabel: 'Add Note' });
          await Q.mutate('createNote', { payload: { note: data.note, type: 'Manual', Job_id: Number(this.jobId) } });
          this._loadedTabs.notes = false;
          await this.loadTabData('notes');
          this.showToast('Note added');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to add note');
          }
        }
      },

      async addUpload() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Upload File', fields: FM.FORM_DEFS.upload, submitLabel: 'Upload' });
          var payload = { type: data.type, job_id: Number(this.jobId), customer_can_view: data.customer_can_view || false };
          var fileName = data.file_name || 'Upload';
          if (data.type === 'Photo') payload.photo_name = fileName;
          else if (data.type === 'Form') payload.form_name = fileName;
          else payload.file_name = fileName;
          await Q.mutate('createUpload', { payload: payload });
          this._loadedTabs.uploads = false;
          await this.loadTabData('uploads');
          this.showToast('File uploaded');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to upload');
          }
        }
      },

      async addAppointment() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Schedule Appointment', fields: FM.FORM_DEFS.appointment, submitLabel: 'Create' });
          await Q.mutate('createAppointment', {
            payload: {
              title: data.title,
              start_time: data.start_time || undefined,
              status: data.status || 'Scheduled',
              job_id: Number(this.jobId),
              type: 'Job',
            },
          });
          this._loadedTabs.appointments = false;
          await this.loadTabData('appointments');
          this.showToast('Appointment created');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to create appointment');
          }
        }
      },

      async addMaterial() {
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({ title: 'Add Material', fields: FM.FORM_DEFS.material, submitLabel: 'Add Material' });
          await Q.mutate('createMaterial', {
            payload: {
              material_name: data.material_name,
              description: data.description || undefined,
              total: data.total ? Number(data.total) : undefined,
              transaction_type: data.transaction_type || 'Deduct',
              status: data.status || 'New',
              job_id: Number(this.jobId),
            },
          });
          this._loadedTabs.materials = false;
          await this.loadTabData('materials');
          this.materials = await Q.fetchMaterials(Number(this.jobId));
          this.showToast('Material added');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to add material');
          }
        }
      },

      async editMaterial(materialId) {
        var item = (this.materialsTab || this.materials || []).find(function (m) { return String(m.id) === String(materialId); });
        if (!item) return;
        var FM = window.PtpmFormModal; if (!FM) return;
        try {
          var data = await FM.open({
            title: 'Edit Material',
            fields: FM.FORM_DEFS.material,
            values: {
              material_name: item.material_name || '',
              description: item.description || '',
              total: item.total || '',
              transaction_type: item.transaction_type || 'Deduct',
              status: item.status || 'New',
            },
            submitLabel: 'Save',
          });
          await Q.mutate('updateMaterial', {
            id: Number(materialId),
            payload: {
              material_name: data.material_name,
              description: data.description || undefined,
              total: data.total ? Number(data.total) : undefined,
              transaction_type: data.transaction_type || 'Deduct',
              status: data.status || 'New',
            },
          });
          this._loadedTabs.materials = false;
          await this.loadTabData('materials');
          this.materials = await Q.fetchMaterials(Number(this.jobId));
          this.showToast('Material updated');
        } catch (e) {
          if (e && e.message !== 'cancelled') {
            console.error(e);
            this.showToast('Failed to update material');
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
              related_job_id: Number(this.jobId),
              related_inquiry_id: this.linkedInquiry ? Number(this.linkedInquiry.id) : undefined,
              author_id: Number(Config.CONTACT_ID || Config.LOGGED_IN_USER_ID),
            },
          });
          if (input) input.value = '';
          this._loadedTabs.memos = false;
          await this.loadTabData('memos');
          this.showToast('Memo posted');
        } catch (err) {
          console.error('Failed to post memo:', err);
          this.showToast('Failed to post memo');
        }
      },

      viewUpload(uploadId) {
        if (!uploadId) return;
        var upload = (this.uploadsData || []).find(function (u) { return String(u.id) === String(uploadId); });
        if (!upload) return;
        var src = upload.file_upload || upload.photo_upload || upload.form_upload || '';
        var name = upload.file_name || upload.photo_name || upload.form_name || 'File';
        if (!src) {
          this.showToast('No file URL available');
          return;
        }
        if (Utils.ensureFilePreviewModal) {
          var preview = Utils.ensureFilePreviewModal();
          preview.show({ src: src, name: name });
        } else {
          window.open(src, '_blank');
        }
      },

      normalizeJobDetailTemplate(tpl) {
        var raw = String(tpl || '');
        if (!raw) return 'job-view.html?job={id}';
        return raw.replace(/inquiry-detail\.html\?(?:deal|inquiry|id)=\{id\}/g, 'job-view.html?job={id}');
      },

      navigateToDashboard() {
        window.location.href = Config.DASHBOARD_URL || 'dashboard.html';
      },

      navigateToCustomer() {
        if (!this.contact) return;
        var tpl = Config.CUSTOMER_DETAIL_URL_TEMPLATE || 'customer-detail.html?contact={id}';
        window.location.href = tpl.replace('{id}', this.contact.id);
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

      navigateToLinkedInquiry() {
        if (!this.linkedInquiry || !this.linkedInquiry.id) return;
        var tpl = Config.INQUIRY_DETAIL_URL_TEMPLATE || 'inquiry-detail.html?inquiry={id}';
        window.location.href = tpl.replace('{id}', this.linkedInquiry.id);
      },

      openCallbackJob(jobId) {
        if (!jobId) return;
        var tpl = this.normalizeJobDetailTemplate(Config.JOB_DETAIL_URL_TEMPLATE || 'job-view.html?job={id}');
        window.location.href = tpl.replace('{id}', jobId);
      },

      printJob() {
        window.print();
      },

      async sendEmail(template) {
        this.showEmailMenu = false;
        try {
          await this.dispatchWorkflowAction('job.email', {
            template: template,
            jobId: Number(this.jobId),
            jobUniqueId: this.job && this.job.unique_id ? this.job.unique_id : null,
          });
          this.showToast('Email action "' + template + '" dispatched');
        } catch (err) {
          console.error('Email action failed:', err);
          this.showToast('Failed to dispatch email action');
        }
      },

      async moreAction(action) {
        this.showMoreActions = false;
        try {
          if (action === 'Mark Complete') {
            await Q.mutate('updateJob', {
              id: Number(this.jobId),
              payload: { job_status: 'Completed', date_completed: Math.floor(Date.now() / 1000) },
            });
            this.jobStatus = 'Completed';
            if (this.job) this.job.job_status = 'Completed';
            this.showToast('Job marked complete');
            return;
          }
          if (action === 'Cancel Job') {
            await Q.mutate('updateJob', {
              id: Number(this.jobId),
              payload: { job_status: 'Cancelled' },
            });
            this.jobStatus = 'Cancelled';
            if (this.job) this.job.job_status = 'Cancelled';
            this.showToast('Job cancelled');
            return;
          }
          this.showToast('Action "' + action + '" is queued for next implementation phase');
        } catch (err) {
          console.error('More action failed:', err);
          this.showToast('Failed to run action: ' + action);
        }
      },

      newActionRequestId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
        return 'ptpm-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
      },

      async dispatchWorkflowAction(actionType, payload) {
        var webhook = Config.N8N_ACTION_WEBHOOK_URL || '';
        var timeoutMs = Number(Config.N8N_ACTION_WEBHOOK_TIMEOUT_MS || 20000);
        var contractVersion = Config.N8N_ACTION_CONTRACT_VERSION || 'ptpm.action.v1';
        var requestId = this.newActionRequestId();

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
            Accept: 'application/json',
            'X-PTPM-Request-Id': requestId,
            'X-PTPM-Contract-Version': contractVersion,
          };
          if (Config.N8N_ACTION_WEBHOOK_TOKEN) headers.Authorization = 'Bearer ' + Config.N8N_ACTION_WEBHOOK_TOKEN;

          var res = await fetch(webhook, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              requestId: requestId,
              contractVersion: contractVersion,
              source: 'job-view',
              actionType: actionType,
              jobId: Number(this.jobId),
              jobUniqueId: this.job && this.job.unique_id ? this.job.unique_id : null,
              inquiryId: this.linkedInquiry && this.linkedInquiry.id ? Number(this.linkedInquiry.id) : null,
              actorContactId: Config.CONTACT_ID ? Number(Config.CONTACT_ID) : null,
              actorUserId: Config.LOGGED_IN_USER_ID ? Number(Config.LOGGED_IN_USER_ID) : null,
              payload: payload || {},
              sentAt: new Date().toISOString(),
            }),
            signal: controller ? controller.signal : undefined,
          });

          var body = null;
          try { body = await res.json(); } catch (_) {}
          if (!res.ok) throw new Error((body && body.message) || ('Webhook HTTP ' + res.status));
          if (body && body.ok === false) throw new Error(body.message || 'Webhook rejected action');
          return body || { ok: true, status: 'dispatched', requestId: requestId, contractVersion: contractVersion };
        } catch (err) {
          if (err && err.name === 'AbortError') throw new Error('Action webhook timed out after ' + timeoutMs + 'ms');
          throw err;
        } finally {
          clearTimeout(timer);
        }
      },

      showToast(msg) {
        if (Interaction.showVmToast) {
          Interaction.showVmToast(this, msg, 3000);
          return;
        }
        var self = this;
        if (self.toastTimer) clearTimeout(self.toastTimer);
        self.toastMessage = msg;
        self.toastTimer = setTimeout(function () { self.toastMessage = null; }, 3000);
      },

      badge: function (s) { return UI.badge(s); },
      money: function (n) { return UI.money(n); },
      tagPills: function (arr) { return UI.tagPills(arr); },
    };
  });
});
