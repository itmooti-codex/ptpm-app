document.addEventListener("alpine:init", () => {
  Alpine.store("quoteState", {
    status: "",
    accepted: false,
  });

  const ACCOUNT_TYPE =
    typeof accountType === "string" ? accountType.trim() : "";
  const DEFAULT_POPUP_COMMENT_TARGET =
    ACCOUNT_TYPE.toLowerCase() === "company" ? "company" : "contact";

  const PRESET_PROVIDER_ID =
    SERVICE_PROVIDER_ID != null ? String(SERVICE_PROVIDER_ID).trim() : "";

  Alpine.data("emailOptionsDropdown", (groupKey = "") => ({
    open: false,
    groupKey,
    sendingId: null,
    toggle() {
      this.open = !this.open;
    },
    close() {
      this.open = false;
    },
    buttonLabel(button = {}) {
      const id = this.normalizeId(button);
      if (id && this.sendingId === id) return "Sending email...";
      return button.button_name || "Send Email";
    },
    normalizeId(button = {}) {
      return button.message_id || button.field_id || button.button_name || null;
    },
    async handleEmail(button = {}) {
      if (!button?.field_id || this.sendingId) return;
      const id = this.normalizeId(button);
      this.sendingId = id;
      try {
        await updateJobEmailCheckbox(button.field_id);
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: { message: "Email Sent Successfully", variant: "success" },
          })
        );
        this.close();
      } catch (error) {
        console.error("Failed to send email", error);
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              message: error?.message || "Failed to send email.",
              variant: "error",
            },
          })
        );
      } finally {
        this.sendingId = null;
      }
    },
  }));

  Alpine.data("jobActionsDropdown", () => ({
    open: false,
    processing: false,
    current: "",
    toggle() {
      if (this.processing) return;
      this.open = !this.open;
    },
    close() {
      if (this.processing) return;
      this.open = false;
    },
    isProcessing(key) {
      return this.processing && this.current === key;
    },
    actionLabel(key, idleLabel = "", busyLabel = "Processing...") {
      return this.isProcessing(key) ? busyLabel : idleLabel;
    },
    async handleAction(key, actionFn) {
      if (this.processing || typeof actionFn !== "function") return;
      this.processing = true;
      this.current = key;
      try {
        await actionFn();
      } catch (error) {
        console.error("Job action failed", error);
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              message: error?.message || "Failed to complete job action.",
              variant: "error",
            },
          })
        );
      } finally {
        this.processing = false;
        this.current = "";
        this.open = false;
      }
    },
  }));

  Alpine.data("providerAllocationState", () => ({
    hasProvider: false,
    hasJob: false,
    listener: null,
    quoteListener: null,
    init() {
      this.hasProvider = !!this.normalizeId(SERVICE_PROVIDER_ID);
      this.hasJob = this.computeHasJob();
      this.listener = (event) => {
        const providerId =
          event?.detail?.provider?.id ??
          event?.detail?.provider?.providerId ??
          event?.detail?.provider?.provider_id;
        if (this.normalizeId(providerId)) {
          this.hasProvider = true;
          this.hasJob = this.computeHasJob();
        }
      };
      window.addEventListener("provider-selected", this.listener);
      this.quoteListener = (event) => {
        const fromEvent =
          event?.detail?.jobId || event?.detail?.id || event?.detail?.job_id;
        if (this.normalizeId(fromEvent)) {
          this.hasJob = true;
        } else {
          this.hasJob = true; // quote created implies job flow
        }
      };
      window.addEventListener("quote:created", this.quoteListener);
    },
    destroy() {
      if (this.listener) {
        window.removeEventListener("provider-selected", this.listener);
        this.listener = null;
      }
      if (this.quoteListener) {
        window.removeEventListener("quote:created", this.quoteListener);
        this.quoteListener = null;
      }
    },
    normalizeId(value) {
      const raw = (value ?? "").toString().trim();
      if (!raw || raw === "-" || raw === "—") return "";
      if (/^\[[^\]]+\]$/.test(raw)) return "";
      return raw;
    },
    computeHasJob() {
      const jobId =
        JOB_ID ||
        document.body?.dataset?.jobId ||
        document.querySelector("[data-var-jobid]")?.dataset?.varJobid ||
        "";
      if (!this.hasProvider) return false;
      return !!this.normalizeId(jobId);
    },
  }));

  Alpine.data("contactEmailDropdown", (props = {}) => ({
    open: false,
    searchTerm: "",
    searchDebounceId: null,
    isSearching: false,
    hasSearched: false,
    suggestions: [],
    error: "",
    selectedContact: null,
    pendingContact: null,
    initialId: props.initialId || "",
    initialLabel: props.initialLabel || "",
    jobField: props.field || null,
    isUpdating: false,
    updateMessage: "",
    awaitingCreate: false,
    createdListener: null,
    jobUpdateListener: null,
    placeholder: props.placeholder || "Select contact",
    minSearchLength: props.minSearchLength || 2,
    limit: props.limit || 10,
    init() {
      const initId = this.normalizeId(this.initialId);
      if (initId) {
        this.prefillInitialContact(initId);
      }
      this.createdListener = (event) => {
        if (!this.awaitingCreate) return;
        const detail = event?.detail || {};
        const cid = this.normalizeId(detail.contactId || detail.id || "");
        if (cid) {
          const name = [detail.firstName, detail.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          const displayLabel =
            detail.displayLabel ||
            (name && detail.email ? `${name} · ${detail.email}` : "") ||
            name ||
            detail.email ||
            `Contact #${cid}`;
          this.selectContact({
            id: cid,
            displayLabel,
            email: detail.email || "",
            firstName: detail.firstName || "",
            lastName: detail.lastName || "",
          });
        }
        this.awaitingCreate = false;
      };
      window.addEventListener("contact:created", this.createdListener);
      this.jobUpdateListener = (event) => this.handleJobUpdate(event);
      window.addEventListener(
        "job-contact:update-status",
        this.jobUpdateListener
      );
    },
    destroy() {
      if (this.createdListener) {
        window.removeEventListener("contact:created", this.createdListener);
        this.createdListener = null;
      }
      if (this.jobUpdateListener) {
        window.removeEventListener(
          "job-contact:update-status",
          this.jobUpdateListener
        );
        this.jobUpdateListener = null;
      }
    },
    displayLabel() {
      return (
        this.selectedContact?.displayLabel ||
        this.placeholder ||
        "Select contact"
      );
    },
    toggleDropdown() {
      this.open = !this.open;
      if (this.open) this.prepareDropdown();
    },
    closeDropdown() {
      this.open = false;
      this.isSearching = false;
      this.suggestions = [];
      this.error = "";
      this.hasSearched = false;
      if (this.searchDebounceId) {
        clearTimeout(this.searchDebounceId);
        this.searchDebounceId = null;
      }
    },
    prepareDropdown() {
      this.$nextTick(() => {
        this.$refs?.contactSearchInput?.focus?.();
      });
      if ((this.searchTerm || "").trim().length >= this.minSearchLength) {
        this.triggerSearch();
      }
    },
    handleSearchInput() {
      if (this.searchDebounceId) {
        clearTimeout(this.searchDebounceId);
        this.searchDebounceId = null;
      }
      const term = (this.searchTerm || "").trim();
      if (!term || term.length < this.minSearchLength) {
        this.suggestions = [];
        this.hasSearched = false;
        this.isSearching = false;
        this.error = "";
        return;
      }
      this.searchDebounceId = setTimeout(() => this.triggerSearch(), 200);
    },
    triggerSearch() {
      const term = (this.searchTerm || "").trim();
      if (!term || term.length < this.minSearchLength) return;
      this.fetchSuggestions(term);
    },
    async fetchSuggestions(term) {
      const normalized = term.trim();
      if (!normalized) return;
      this.isSearching = true;
      this.error = "";
      try {
        const data = await graphqlRequest(CALC_CONTACTS_QUERY, {
          limit: this.limit,
          offset: 0,
          searchExpression: this.buildSearchExpression(normalized),
        });
        const rows = Array.isArray(data?.calcContacts) ? data.calcContacts : [];
        this.suggestions = rows.map((row) => this.normalizeContact(row));
        this.hasSearched = true;
      } catch (error) {
        console.error(error);
        this.error = error?.message || "Unable to fetch contacts.";
        this.suggestions = [];
        this.hasSearched = false;
      } finally {
        this.isSearching = false;
      }
    },
    buildSearchExpression(term = "") {
      const sanitized = term.replace(/[%_]/g, (ch) => `\\${ch}`);
      return `%${sanitized}%`;
    },
    normalizeContact(row) {
      const firstName = (row?.First_Name || "").trim();
      const lastName = (row?.Last_Name || "").trim();
      const email = (row?.Email || "").trim();
      const displayName = [firstName, lastName].filter(Boolean).join(" ");
      const label =
        displayName && email
          ? `${displayName} · ${email}`
          : displayName || email || "Unnamed Contact";
      return {
        id: row?.Contact_ID || null,
        firstName,
        lastName,
        email,
        sms: (row?.SMS_Number || "").trim(),
        displayLabel: label,
      };
    },
    selectContact(contact) {
      if (!contact) return;
      if (this.jobField) {
        this.pendingContact = contact;
        this.isUpdating = true;
        this.updateMessage =
          contact.displayLabel?.trim() || "Updating contact…";
        window.dispatchEvent(
          new CustomEvent("job-contact:set", {
            detail: { field: this.jobField, contact },
          })
        );
      } else {
        this.selectedContact = contact;
        this.closeDropdown();
      }
      if (props.onSelect) props.onSelect(contact);
    },
    clearSelection() {
      this.selectedContact = null;
      this.searchTerm = "";
      this.suggestions = [];
      this.error = "";
      this.hasSearched = false;
    },
    openAddContact() {
      this.closeDropdown();
      this.awaitingCreate = true;
      const propertyId =
        PROPERTY_ID ||
        document.body?.dataset?.propertyId ||
        document.querySelector("[data-var-propertyid]")?.dataset
          ?.varPropertyid ||
        null;
      window.dispatchEvent(
        new CustomEvent("propertyContact:add:open", {
          detail: {
            propertyId,
            showRoleField: false,
            showPrimaryToggle: false,
          },
        })
      );
    },
    normalizeId(value) {
      const raw = (value ?? "").toString().trim();
      if (!raw || raw === "-" || raw === "—") return "";
      if (/^\[[^\]]+\]$/.test(raw)) return "";
      return raw;
    },
    handleJobUpdate(event = {}) {
      if (!this.jobField) return;
      const detail = event.detail || {};
      if (detail.field !== this.jobField) return;
      this.isUpdating = false;
      this.updateMessage = "";
      this.pendingContact = null;
      if (detail.success) {
        this.applyContactId(detail.contactId || detail.contact?.id, detail);
      } else if (detail.message) {
        this.emitToast(detail.message, "error");
      }
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    async prefillInitialContact(id) {
      const contactId = this.normalizeId(id);
      if (!contactId) return;
      this.isUpdating = true;
      this.updateMessage = "Loading contact…";
      await this.applyContactId(contactId, { from: "prefill" });
      this.isUpdating = false;
      this.updateMessage = "";
    },
    async applyContactId(id, detail = {}) {
      const contactId = this.normalizeId(id);
      if (!contactId) return;
      const incoming = detail.contact || {};
      let contact = null;
      if (incoming.displayLabel || incoming.firstName || incoming.email) {
        contact = {
          id: contactId,
          displayLabel:
            incoming.displayLabel ||
            [incoming.firstName, incoming.lastName]
              .filter(Boolean)
              .join(" ")
              .trim(),
          email: incoming.email || "",
          firstName: incoming.firstName || "",
          lastName: incoming.lastName || "",
        };
      }
      if (!contact || !contact.displayLabel) {
        contact = await this.fetchContactById(contactId);
      }
      if (contact) {
        this.selectedContact = contact;
        this.closeDropdown();
        if (detail.message) {
          this.emitToast(detail.message);
        }
      }
    },
    async fetchContactById(contactId) {
      if (!contactId) return null;
      try {
        const data = await graphqlRequest(CONTACT_BY_ID_QUERY, {
          id: contactId,
        });
        const rows = Array.isArray(data?.calcContacts)
          ? data.calcContacts
          : [];
        const row = rows[0];
        return row ? this.normalizeContact(row) : null;
      } catch (error) {
        console.error("Failed to prefill contact", error);
        return null;
      }
    },
  }));

  Alpine.data("allocateProviderSearch", () => ({
    open: false,
    searchTerm: "",
    filteredCount: 0,
    hasLoaded: false,
    observer: null,
    presetProviderId: PRESET_PROVIDER_ID,
    selectedProviderId: null,
    selectedProvider: null,
    isSubmitting: false,
    feedbackMessage: "",
    feedbackVariant: "success",
    placeholderText: DEFAULT_PROVIDER_PLACEHOLDER,
    pendingPrefillId: null,
    inquiryId: INQUIRY_RECORD_ID,
    toastVisible: false,
    toastMessage: "",
    toastVariant: "success",
    toastTimeout: null,
    filterScheduled: false,
    toastEventHandler: null,
    init() {
      const presetId = this.normalizeProviderId(this.presetProviderId);
      this.pendingPrefillId = presetId || null;
      if (this.pendingPrefillId) {
        this.selectProviderById(this.pendingPrefillId, {
          preserveMessage: true,
        });
      }
      this.$watch("searchTerm", () => this.scheduleFilter());
      this.$nextTick(() => {
        this.observeProviders();
        this.filterProviders();
        this.prefillFromServer();
      });
      this.toastEventHandler = (event) => {
        const detail = event?.detail || {};
        if (!detail.message) return;
        this.showToast(detail.message, detail.variant || "success");
      };
      window.addEventListener("toast:show", this.toastEventHandler);
    },
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
      if (this.toastEventHandler) {
        window.removeEventListener("toast:show", this.toastEventHandler);
        this.toastEventHandler = null;
      }
    },
    handleFocus() {
      this.open = true;
      this.scheduleFilter();
    },
    closeDropdown() {
      this.open = false;
    },
    normalizeProviderId(value) {
      const raw = (value ?? "").toString().trim();
      if (!raw || raw === "-" || raw === "—") return "";
      if (/^\[[^\]]+\]$/.test(raw)) return "";
      return raw;
    },
    async prefillFromServer() {
      if (!this.inquiryId) return;
      try {
        const data = await graphqlRequest(CALC_DEALS_QUERY, {
          id: this.inquiryId,
        });
        const record = Array.isArray(data?.calcDeals)
          ? data.calcDeals[0]
          : data?.calcDeals;
        const providerId = record?.Service_Provider_ID ?? null;
        const normalizedProviderId = this.normalizeProviderId(providerId);
        if (!this.pendingPrefillId && normalizedProviderId) {
          this.pendingPrefillId = normalizedProviderId;
          this.selectProviderById(providerId, { preserveMessage: true });
        }
        const popupComment =
          (record?.Popup_Comment ?? "").trim?.() ||
          (typeof record?.Popup_Comment === "string"
            ? record.Popup_Comment.trim()
            : "");
        if (popupComment) {
          window.dispatchEvent(
            new CustomEvent("popup-comment:show", {
              detail: { comment: popupComment, target: "contact" },
            })
          );
        }
        window.dispatchEvent(
          new CustomEvent("dealInfo:prefill", {
            detail: {
              dealName: record.Deal_Name || "",
              dealValue: record.Deal_Value || "",
              salesStage: record.Sales_Stage || "",
              expectedWin: record.Expected_Win || "",
              expectedCloseDate: record.Expected_Close_Date || "",
              actualCloseDate: record.Actual_Close_Date || "",
              weightedValue: record.Weighted_Value || "",
              recentActivity: record.Recent_Activity || "",
            },
          })
        );
      } catch (error) {
        console.error("Failed to fetch allocation", error);
        this.feedbackVariant = "error";
        this.feedbackMessage = "Unable to load current allocation.";
      }
    },
    handleRowSelect(event) {
      event?.preventDefault?.();
      const row = event?.currentTarget;
      if (!row) return;
      const provider = this.extractProviderFromRow(row);
      if (provider?.id) {
        this.setSelectedProvider(provider);
      }
    },
    setSelectedProvider(provider, { preserveMessage = false } = {}) {
      if (!provider?.id) return;
      this.selectedProviderId = this.normalizeProviderId(provider.id);
      this.selectedProvider = provider;
      this.providerDisplayName =
        provider?.name || this.providerDisplayName || "";
      this.updatePlaceholder(provider);
      this.searchTerm = "";
      this.scheduleFilter();
      this.pendingPrefillId = null;
      if (!preserveMessage) this.feedbackMessage = "";
      this.broadcastSelection(provider);
    },
    selectProviderById(providerId, { preserveMessage = true } = {}) {
      const normalizedId = this.normalizeProviderId(providerId);
      if (!normalizedId) return;
      const row = this.findRowById(normalizedId);
      if (row) {
        const provider = this.extractProviderFromRow(row);
        this.setSelectedProvider(provider, { preserveMessage });
      }
    },
    findRowById(providerId) {
      if (!this.$refs.providerList || !providerId) return null;
      const selectorValue = this.escapeForSelector(String(providerId));
      return this.$refs.providerList.querySelector(
        `[data-provider-row][data-provider-id="${selectorValue}"]`
      );
    },
    escapeForSelector(value) {
      if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
      }
      return value.replace(/([\s!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
    },
    observeProviders() {
      if (!this.$refs.providerList || this.observer) return;
      this.observer = new MutationObserver(() => {
        this.scheduleFilter();
      });
      this.observer.observe(this.$refs.providerList, {
        childList: true,
        subtree: true,
      });
    },
    scheduleFilter() {
      if (this.filterScheduled) return;
      this.filterScheduled = true;
      requestAnimationFrame(() => {
        this.filterScheduled = false;
        this.filterProviders();
      });
    },
    filterProviders() {
      const list = this.$refs.providerList;
      if (!list) return;
      const rows = Array.from(list.querySelectorAll("[data-provider-row]"));
      const query = this.searchTerm.trim().toLowerCase();
      let visible = 0;
      let resolvedData = false;
      rows.forEach((row) => {
        const text = (row.textContent || "").trim();
        const hasPlaceholders = /\[[^\]]+\]/.test(text);
        if (text && !hasPlaceholders) {
          resolvedData = true;
        }
        const values = [
          row.dataset.providerId?.toLowerCase(),
          row
            .querySelector("[data-search-name]")
            ?.textContent?.trim()
            ?.toLowerCase(),
          row
            .querySelector("[data-search-phone]")
            ?.textContent?.trim()
            ?.toLowerCase(),
          row
            .querySelector("[data-field='provider-email']")
            ?.textContent?.trim()
            ?.toLowerCase(),
        ].filter(Boolean);
        const haystack = `${values.join(" ")} ${text.toLowerCase()}`.trim();
        const matches = !query || haystack.includes(query);
        row.classList.toggle("hidden", !matches);
        if (matches) visible += 1;
      });
      this.filteredCount = visible;
      this.hasLoaded = resolvedData;
      if (this.pendingPrefillId) {
        this.selectProviderById(this.pendingPrefillId, {
          preserveMessage: true,
        });
      }
    },
    extractProviderFromRow(row) {
      if (!row) return null;
      const grab = (selector) =>
        row.querySelector(selector)?.textContent?.trim() || "";
      const name = grab("[data-search-name]");
      const [firstName = "", ...rest] = name.split(" ");
      const lastName = rest.join(" ").trim();
      return {
        id: row.dataset?.providerId || grab("[data-field='provider-id']"),
        name,
        firstName,
        lastName,
        phone: grab("[data-search-phone]"),
        email: grab("[data-field='provider-email']"),
      };
    },
    broadcastSelection(provider) {
      if (!provider) return;
      window.dispatchEvent(
        new CustomEvent("provider-selected", { detail: { provider } })
      );
    },
    updatePlaceholder(provider) {
      const label = this.getProviderLabel(provider);
      this.placeholderText = label
        ? `Allocated to ${label}`
        : DEFAULT_PROVIDER_PLACEHOLDER;
    },
    getProviderLabel(provider) {
      const raw = provider?.name?.trim();
      if (!raw) return "";
      return raw
        .split(/\s+/)
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join(" ");
    },
    buildAllocationMessage(provider) {
      const label = this.getProviderLabel(provider);
      if (!label) return "Inquiry allocation updated.";
      return `Inquiry Allocated To ${label}.`;
    },
    async confirmAllocation() {
      if (!this.selectedProviderId || this.isSubmitting) {
        if (!this.selectedProviderId) {
          this.feedbackVariant = "error";
          this.feedbackMessage = "Select a service provider first.";
        }
        return;
      }
      if (!this.inquiryId) {
        this.feedbackVariant = "error";
        this.feedbackMessage = "Missing inquiry id.";
        return;
      }
      this.isSubmitting = true;
      this.feedbackMessage = "";
      try {
        const payload = { service_provider_id: this.selectedProviderId };
        const data = await graphqlRequest(UPDATE_DEAL_MUTATION, {
          id: this.inquiryId,
          payload,
        });
        const updatedId =
          data?.updateDeal?.service_provider_id || this.selectedProviderId;
        this.feedbackVariant = "success";
        const successMessage = this.buildAllocationMessage(
          this.selectedProvider
        );
        this.feedbackMessage = successMessage;
        this.pendingPrefillId = updatedId;
        this.selectProviderById(updatedId, { preserveMessage: true });
        this.showToast(successMessage);
      } catch (error) {
        console.error("Failed to update allocation", error);
        this.feedbackVariant = "error";
        this.feedbackMessage =
          error?.message || "Unable to update allocation right now.";
        this.showToast(
          error?.message || "Unable to update allocation right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    showToast(message, variant = "success") {
      if (!message) return;
      this.toastMessage = message;
      this.toastVariant = variant;
      this.toastVisible = true;
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
      }
      this.toastTimeout = setTimeout(() => {
        this.toastVisible = false;
        this.toastTimeout = null;
      }, 4000);
    },
  }));

  Alpine.data("quotePanel", () => ({
    hasQuote: false,
    quoteRecipients: DEFAULT_RECIPIENT_PLACEHOLDER,
    quoteNumber: "",
    quoteDate: "",
    quotePrice: "",
    quoteStatus: "",
    followUpDate: "",
    dateQuoteSent: "",
    dateQuoteAccepted: "",
    jobId: "",
    accountType: "",
    clientEntityName: "",
    clientEntityPhone: "",
    clientIndividualFirst: "",
    clientIndividualLast: "",
    clientIndividualSms: "",
    quoteStatusOptions: [
      { value: "676", label: "New", color: "#e91e63", backgroundColor: "#fbd2e0" },
      { value: "144", label: "Requested", color: "#8e24aa", backgroundColor: "#e8d3ee" },
      { value: "143", label: "Sent", color: "#3949ab", backgroundColor: "#d7dbee" },
      { value: "142", label: "Accepted", color: "#43a047", backgroundColor: "#d9ecda" },
      { value: "141", label: "Declined", color: "#f4511e", backgroundColor: "#fddcd2" },
      { value: "140", label: "Expired", color: "#000000", backgroundColor: "#cccccc" },
      { value: "139", label: "Cancelled", color: "#000000", backgroundColor: "#cccccc" },
    ],
    jobEmailContactId: "",
    accountEmailContactId: "",
    availableRecipients: [],
    selectedRecipientId: "",
    recipientDropdownOpen: false,
    recipientSearchTerm: "",
    isRecipientUpdating: false,
    recipientUpdateMessage: "",
    recipientsLoaded: false,
    recipientLoadPromise: null,
    sendQuoteError: "",
    boundQuoteListener: null,
    boundStatusListener: null,
    boundProviderListener: null,
    boundJobContactListener: null,
    providerDisplayName: "",
    initCheckRan: false,
    init() {
      this.boundQuoteListener = (event) =>
        this.handleQuoteCreated(event?.detail || {});
      window.addEventListener("quote:created", this.boundQuoteListener);
      this.boundStatusListener = (event) =>
        this.handleStatusChange(event?.detail || {});
      window.addEventListener("quote:status-change", this.boundStatusListener);
      this.boundProviderListener = (event) => {
        const providerName = event?.detail?.provider?.name?.trim();
        if (providerName) this.providerDisplayName = providerName;
      };
      window.addEventListener("provider-selected", this.boundProviderListener);
      this.boundJobContactListener = (event) =>
        this.handleJobContactSet(event?.detail || {});
      window.addEventListener(
        "job-contact:set",
        this.boundJobContactListener
      );
      this.checkExistingQuote();
      this.$nextTick(() => this.ensureRecipientsLoaded());
    },

    destroy() {
      if (this.boundQuoteListener) {
        window.removeEventListener("quote:created", this.boundQuoteListener);
        this.boundQuoteListener = null;
      }
      if (this.boundStatusListener) {
        window.removeEventListener(
          "quote:status-change",
          this.boundStatusListener
        );
        this.boundStatusListener = null;
      }
      if (this.boundProviderListener) {
        window.removeEventListener(
          "provider-selected",
          this.boundProviderListener
        );
        this.boundProviderListener = null;
      }
      if (this.boundJobContactListener) {
        window.removeEventListener(
          "job-contact:set",
          this.boundJobContactListener
        );
        this.boundJobContactListener = null;
      }
    },
    handleQuoteCreated(detail = {}) {
      this.hasQuote = true;
      const uniqueId =
        detail.uniqueId ||
        detail.Unique_ID ||
        detail.unique_id ||
        detail.ID ||
        detail.id;
      this.jobId = detail.jobId || detail.ID || detail.id || this.jobId;
      if (this.jobId) {
        document.body.dataset.jobId = this.jobId;
      }
      if (detail.quoteNumber || uniqueId) {
        this.quoteNumber = detail.quoteNumber || uniqueId;
      }
      if (detail.quoteDate || detail.quote_date) {
        this.quoteDate = detail.quoteDate || detail.quote_date || "";
      }
      if (
        detail.quotePrice ||
        detail.quoteTotal ||
        detail.quote_total !== undefined
      ) {
        const raw =
          detail.quotePrice ?? detail.quoteTotal ?? detail.quote_total;
        this.quotePrice = raw === undefined || raw === null ? "" : String(raw);
      }
      if (detail.quoteStatus || detail.quote_status) {
        this.quoteStatus = detail.quoteStatus || detail.quote_status || "";
      }
      if (detail.dateQuoteSent || detail.date_quote_sent) {
        this.dateQuoteSent =
          detail.dateQuoteSent || detail.date_quote_sent || "";
      }
      if (detail.dateQuoteAccepted || detail.date_quoted_accepted) {
        this.dateQuoteAccepted =
          detail.dateQuoteAccepted || detail.date_quoted_accepted || "";
      }
      if (detail.followUpDate || detail.follow_up_date) {
        this.followUpDate = detail.followUpDate || detail.follow_up_date || "";
      }
      if (detail.accountType || detail.account_type) {
        this.accountType = detail.accountType || detail.account_type || "";
      }
      if (detail.clientEntityName || detail.client_entity_name) {
        this.clientEntityName =
          detail.clientEntityName || detail.client_entity_name || "";
      }
      if (detail.clientEntityPhone || detail.client_entity_phone) {
        this.clientEntityPhone =
          detail.clientEntityPhone || detail.client_entity_phone || "";
      }
      if (detail.clientIndividualFirst || detail.client_individual_first_name) {
        this.clientIndividualFirst =
          detail.clientIndividualFirst ||
          detail.client_individual_first_name ||
          "";
      }
      if (detail.clientIndividualLast || detail.client_individual_last_name) {
        this.clientIndividualLast =
          detail.clientIndividualLast ||
          detail.client_individual_last_name ||
          "";
      }
      if (detail.clientIndividualSms || detail.client_individual_sms_number) {
        this.clientIndividualSms =
          detail.clientIndividualSms ||
          detail.client_individual_sms_number ||
          "";
      }
      if (detail.clientIndividualId) {
        this.jobEmailContactId = detail.clientIndividualId;
      }
      if (detail.accountsContactId) {
        this.accountEmailContactId = detail.accountsContactId;
      }
      if (detail.recipients) this.quoteRecipients = detail.recipients;
      this.$nextTick(() =>
        this.ensureRecipientsLoaded().then(() =>
          this.syncRecipientSelectionFromAccount()
        )
      );
      if (this.jobEmailContactId) {
        window.dispatchEvent(
          new CustomEvent("job-contact:update-status", {
            detail: {
              field: "client_individual_id",
              success: true,
              contactId: this.jobEmailContactId,
              from: "prefill",
            },
          })
        );
      }
      if (this.accountEmailContactId) {
        window.dispatchEvent(
          new CustomEvent("job-contact:update-status", {
            detail: {
              field: "accounts_contact_id",
              success: true,
              contactId: this.accountEmailContactId,
              from: "prefill",
            },
          })
        );
      }
      this.syncQuoteState();
    },
    handleStatusChange(detail = {}) {
      if (detail.quoteStatus) {
        this.quoteStatus = detail.quoteStatus || this.quoteStatus;
      }
      if (detail.dateQuoteSent) {
        this.dateQuoteSent = detail.dateQuoteSent;
      }
      if (detail.dateQuoteAccepted) {
        this.dateQuoteAccepted = detail.dateQuoteAccepted;
      }
      this.hasQuote = true;
      this.syncQuoteState();
    },
    get filteredRecipients() {
      const term = this.recipientSearchTerm.trim().toLowerCase();
      if (!term) return this.availableRecipients;
      return this.availableRecipients.filter((recipient) => {
        const haystack = [
          recipient.displayName,
          recipient.role,
          recipient.email,
          recipient.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    },
    toggleRecipientDropdown() {
      this.recipientDropdownOpen = !this.recipientDropdownOpen;
      if (this.recipientDropdownOpen) {
        this.$nextTick(() => this.ensureRecipientsLoaded());
      }
    },
    openAddContact() {
      this.closeRecipientDropdown();
      const propertyId =
        PROPERTY_ID ||
        document.body?.dataset?.propertyId ||
        document.querySelector("[data-var-propertyid]")?.dataset
          ?.varPropertyid ||
        null;
      window.dispatchEvent(
        new CustomEvent("propertyContact:add:open", {
          detail: {
            propertyId,
            showRoleField: false,
            showPrimaryToggle: false,
          },
        })
      );
    },
    closeRecipientDropdown() {
      this.recipientDropdownOpen = false;
      this.recipientSearchTerm = "";
    },
    async toggleRecipient(id) {
      if (this.isRecipientUpdating) return;
      const key = this.sanitizeRecipientId(id);
      if (!key) return;
      if (this.isRecipientSelected(key)) {
        this.selectedRecipientId = "";
        this.refreshRecipientSummary();
        return;
      }
      const match = this.availableRecipients.find(
        (recipient) => recipient.id === key
      );
      this.recipientDropdownOpen = true;
      this.isRecipientUpdating = true;
      this.recipientUpdateMessage =
        (match?.displayName ? `Updating ${match.displayName}...` : "Updating contact...") ||
        "Updating contact...";
      const success = await this.setJobContact("accounts_contact_id", match);
      if (success) {
        this.selectedRecipientId = key;
        this.refreshRecipientSummary();
        this.sendQuoteError = "";
        this.emitToast("Account email updated.", "success");
        this.recipientDropdownOpen = false;
      } else {
        this.emitToast(
          "Unable to update account email. Please try again.",
          "error"
        );
      }
      this.isRecipientUpdating = false;
      this.recipientUpdateMessage = "";
    },
    isRecipientSelected(id) {
      const key = this.sanitizeRecipientId(id);
      if (!key) return false;
      return this.selectedRecipientId === key;
    },
    refreshRecipientSummary() {
      const match = this.availableRecipients.find(
        (recipient) => recipient.id === this.selectedRecipientId
      );
      this.quoteRecipients =
        match?.displayName || DEFAULT_RECIPIENT_PLACEHOLDER;
    },
    get recipientSummaryText() {
      const selected = this.getSelectedRecipients();
      if (selected.length === 0) {
        if (
          this.quoteRecipients &&
          this.quoteRecipients !== DEFAULT_RECIPIENT_PLACEHOLDER
        ) {
          return this.quoteRecipients;
        }
        return "Not specified";
      }
      return selected[0].displayName;
    },
    get shouldShowRecipientSelector() {
      return !this.isQuoteSent && !this.isQuoteAccepted;
    },
    get sentDateDisplay() {
      return this.dateQuoteSent || "—";
    },
    get isQuoteSent() {
      return (this.quoteStatus || "").toLowerCase() === "sent";
    },
    get isQuoteAccepted() {
      return (this.quoteStatus || "").toLowerCase() === "accepted";
    },
    get accountTypeNormalized() {
      return (this.accountType || "").toString().trim().toLowerCase();
    },
    get isContactAccount() {
      return this.accountTypeNormalized === "contact";
    },
    get isCompanyAccount() {
      return this.accountTypeNormalized === "company";
    },
    get isNoneAccount() {
      return !this.accountTypeNormalized || this.accountTypeNormalized === "none";
    },
    get individualName() {
      const full = `${this.clientIndividualFirst || ""} ${this.clientIndividualLast || ""}`.trim();
      return full || "—";
    },
    get entityName() {
      const value = (this.clientEntityName || "").toString().trim();
      return value || "—";
    },
    get entityPhone() {
      const value = (this.clientEntityPhone || "").toString().trim();
      return value || "—";
    },
    get individualSms() {
      const value = (this.clientIndividualSms || "").toString().trim();
      return value || "—";
    },
    get resolvedQuoteStatus() {
      const raw = (this.quoteStatus || "").toString().trim();
      if (!raw) {
        return { label: "", color: "#0f172a", backgroundColor: "#e5e7eb" };
      }
      const byValue = this.quoteStatusOptions.find((item) => item.value === raw);
      if (byValue) return byValue;
      const normalized = raw.toLowerCase();
      const byLabel = this.quoteStatusOptions.find(
        (item) => item.label.toLowerCase() === normalized
      );
      return (
        byLabel || {
          label: raw,
          color: "#0f172a",
          backgroundColor: "#e5e7eb",
        }
      );
    },
    get acceptedDateDisplay() {
      return this.dateQuoteAccepted || "—";
    },
    getSelectedRecipients() {
      if (!this.selectedRecipientId) return [];
      return this.availableRecipients.filter(
        (recipient) => recipient.id === this.selectedRecipientId
      );
    },
    syncQuoteState() {
      const store = Alpine.store("quoteState");
      store.status = this.quoteStatus || "";
      store.accepted = this.isQuoteAccepted;
    },
    handleSendQuoteClick() {
      if (!this.selectedRecipientId) {
        this.sendQuoteError = "Please select at least one contact.";
        return;
      }
      this.sendQuoteError = "";
      window.dispatchEvent(
        new CustomEvent("quote:send-preview", {
          detail: {
            recipients: this.getSelectedRecipients(),
            contactId: this.selectedRecipientId,
          },
        })
      );
    },
    handleAcceptQuote() {
      window.dispatchEvent(
        new CustomEvent("quote:accept-preview", {
          detail: {
            recipients: this.getSelectedRecipients(),
            clientName: this.getClientName(),
            providerName: this.getProviderDisplayName(),
          },
        })
      );
    },
    getClientName() {
      const selected = this.getSelectedRecipients();
      return selected[0]?.displayName || "Client";
    },
    getProviderDisplayName() {
      if (this.providerDisplayName) return this.providerDisplayName;
      return "Service Provider";
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    async handleJobContactSet(detail = {}) {
      const field = detail.field;
      if (
        field !== "client_individual_id" &&
        field !== "accounts_contact_id"
      ) {
        return;
      }
      await this.setJobContact(field, detail.contact || {});
    },
    async setJobContact(field, contact) {
      const jobId = this.normalizeId(
        this.jobId ||
          JOB_ID ||
          document.body?.dataset?.jobId ||
          document.querySelector("[data-var-jobid]")?.dataset?.varJobid ||
          ""
      );
      const contactId = this.normalizeId(contact?.id || contact);
      if (!jobId || !contactId) return false;
      try {
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: jobId,
          payload: { [field]: contactId },
        });
        if (field === "client_individual_id") this.jobEmailContactId = contactId;
        if (field === "accounts_contact_id") {
          this.accountEmailContactId = contactId;
          this.syncRecipientSelectionFromAccount();
        }
        window.dispatchEvent(
          new CustomEvent("job-contact:update-status", {
            detail: {
              field,
              success: true,
              contactId,
              contact,
              message:
                field === "client_individual_id"
                  ? "Job email updated."
                  : "Account email updated.",
            },
          })
        );
        return true;
      } catch (error) {
        console.error(`Failed to update ${field}`, error);
        window.dispatchEvent(
          new CustomEvent("job-contact:update-status", {
            detail: {
              field,
              success: false,
              contactId,
              contact,
              message:
                error?.message ||
                (field === "client_individual_id"
                  ? "Failed to update job email."
                  : "Failed to update account email."),
            },
          })
        );
        return false;
      }
    },
    normalizeId(value) {
      const raw = (value ?? "").toString().trim();
      if (!raw || raw === "-" || raw === "—") return "";
      if (/^\[[^\]]+\]$/.test(raw)) return "";
      return raw;
    },
    handleAddContact() {
      this.openAddContact();
    },
    syncRecipientSelectionFromAccount() {
      const target = this.sanitizeRecipientId(this.accountEmailContactId);
      if (!target) return;
      const match = this.availableRecipients.find(
        (recipient) => recipient.id === target
      );
      if (match) {
        this.selectedRecipientId = target;
        this.refreshRecipientSummary();
      }
    },
    ensureRecipientsLoaded() {
      if (this.recipientsLoaded) return Promise.resolve();
      if (!this.recipientLoadPromise) {
        this.recipientLoadPromise = new Promise((resolve) => {
          const attemptLoad = (attempt = 0) => {
            if (this.loadRecipientsFromSource() || attempt >= 10) {
              resolve();
              this.recipientLoadPromise = null;
              return;
            }
            setTimeout(() => attemptLoad(attempt + 1), 200);
          };
          attemptLoad();
        });
      }
      return this.recipientLoadPromise;
    },
    loadRecipientsFromSource() {
      const source = this.$refs.recipientSource;
      if (!source) return false;
      const nodes = source.querySelectorAll("[data-recipient-option]");
      if (!nodes.length) return false;
      this.availableRecipients = Array.from(nodes)
        .map((node) => this.parseRecipientNode(node))
        .filter(Boolean);
      this.recipientsLoaded = this.availableRecipients.length > 0;
      if (this.recipientsLoaded) {
        const preset = this.sanitizeRecipientId(this.accountEmailContactId);
        if (preset) {
          const match = this.availableRecipients.find(
            (recipient) => recipient.id === preset
          );
          if (match) this.selectedRecipientId = preset;
        }
        this.refreshRecipientSummary();
      }
      return this.recipientsLoaded;
    },
    parseRecipientNode(node) {
      if (!node) return null;
      const id =
        this.sanitizeRecipientId(node.dataset.recipientId) ||
        this.sanitizeRecipientId(node.dataset.recipientEmail) ||
        this.sanitizeRecipientId(node.dataset.recipientPhone) ||
        this.sanitizeRecipientId(node.dataset.recipientName);
      if (!id) return null;
      const displayName =
        this.normalizeRecipientValue(node.dataset.recipientName) ||
        "Unnamed Contact";
      const role = this.normalizeRecipientValue(node.dataset.recipientRole);
      const phone = this.normalizeRecipientValue(node.dataset.recipientPhone);
      const email = this.normalizeRecipientValue(node.dataset.recipientEmail);
      const importantHint = this.normalizeRecipientValue(
        node.dataset.recipientImportant
      );
      const isImportant =
        /owner|manager/i.test(role || "") ||
        /primary|preferred|yes|true|1/i.test(importantHint || "");
      return {
        id,
        displayName,
        role: role || "",
        roleLabel: role ? ` (${role})` : "",
        phone,
        email,
        isImportant,
      };
    },
    normalizeRecipientValue(value) {
      if (value == null) return "";
      const trimmed = String(value).trim();
      if (
        !trimmed ||
        trimmed === "-" ||
        trimmed === "—" ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        return "";
      }
      return trimmed;
    },
    sanitizeRecipientId(value) {
      if (value == null) return "";
      const trimmed = String(value).trim();
      if (
        !trimmed ||
        trimmed === "-" ||
        trimmed === "—" ||
        trimmed.includes("[") ||
        trimmed.includes("]")
      ) {
        return "";
      }
      return trimmed.toLowerCase();
    },
    resolveJobId() {
      return (
        this.sanitizeRecipientId(JOB_ID) ||
        this.sanitizeRecipientId(
          document.body?.dataset?.jobId ||
            document.querySelector("[data-var-jobid]")?.dataset?.varJobid ||
            ""
        )
      );
    },
    resolveInquiryId() {
      return (
        this.sanitizeRecipientId(INQUIRY_RECORD_ID) ||
        this.sanitizeRecipientId(
          document.body?.dataset?.inquiryId ||
            document.querySelector("[data-var-inquiryid]")?.dataset
              ?.varInquiryid ||
            ""
        )
      );
    },
    get hasJobIdentifier() {
      return Boolean(this.resolveJobId());
    },
    get hasInquiryIdentifier() {
      return Boolean(this.resolveInquiryId());
    },
    get showMissingQuoteMessage() {
      return !this.hasQuote && !this.hasJobIdentifier && !this.hasInquiryIdentifier;
    },

    async checkExistingQuote() {
      if (this.initCheckRan) return;
      this.initCheckRan = true;
      const jobId = this.resolveJobId();
      const inquiryId = this.resolveInquiryId();
      try {
        if (jobId) {
          const data = await graphqlRequest(CALC_JOB_BY_ID_QUERY, { id: jobId });
          const record = this.extractJobRecord(data);
          if (record) {
            this.handleQuoteCreated(this.mapQuoteRecord(record));
            return;
          }
        }
        if (inquiryId) {
          const data = await graphqlRequest(CALC_JOBS_QUERY, {
            inquiry_record_id: inquiryId,
          });
          const record = this.extractJobRecord(data);
          if (record) {
            this.handleQuoteCreated(this.mapQuoteRecord(record));
            return;
          }
        }
        this.hasQuote = false;
      } catch (error) {
        console.error("Failed to check existing quote", error);
        this.hasQuote = false;
      }
    },
    extractJobRecord(payload) {
      if (!payload) return null;
      const calcJobs = this.normalizeCalcJobs(payload.calcJobs);
      const candidate = calcJobs?.[0] ?? payload.calcJobs ?? payload?.createJob;
      if (!candidate) return null;
      return candidate;
    },
    mapQuoteRecord(record = {}) {
      const uniqueId =
        record.Unique_ID ||
        record.unique_id ||
        record.UniqueId ||
        record.UniqueID ||
        record.ID ||
        record.id ||
        "";
      return {
        uniqueId,
        quoteNumber: uniqueId || "",
        quoteDate: record.Quote_Date || record.quote_date || "",
        quotePrice: record.Quote_Total ?? record.quote_total ?? "",
        quoteStatus: record.Quote_Status || record.quote_status || "",
        followUpDate: record.Follow_Up_Date || record.follow_up_date || "",
        dateQuoteSent:
          record.Date_Quote_Sent ||
          record.date_quote_sent ||
          record.Quote_Sent_Date ||
          "",
        dateQuoteAccepted:
          record.Date_Quoted_Accepted || record.date_quoted_accepted || "",
        jobId: record.ID || record.id || "",
        accountType: record.Account_Type || record.account_type || "",
        clientEntityName:
          record.Client_Entity_Name || record.client_entity_name || "",
        clientEntityPhone:
          record.Client_Entity_Phone || record.client_entity_phone || "",
        clientIndividualFirst:
          record.Client_Individual_First_Name ||
          record.client_individual_first_name ||
          "",
        clientIndividualLast:
          record.Client_Individual_Last_Name ||
          record.client_individual_last_name ||
          "",
        clientIndividualSms:
          record.Client_Individual_SMS_Number ||
          record.client_individual_sms_number ||
          "",
        clientIndividualId:
          record.Client_Individual_ID || record.client_individual_id || "",
        accountsContactId:
          record.Accounts_Contact_ID || record.accounts_contact_id || "",
      };
    },
    normalizeCalcJobs(value) {
      if (Array.isArray(value)) return value;
      if (Array.isArray(value?.data)) return value.data;
      if (Array.isArray(value?.nodes)) return value.nodes;
      return null;
    },
  }));

  Alpine.data("quoteModal", () => ({
    open: false,
    provider: null,
    isSubmitting: false,
    boundOpenListener: null,
    boundProviderListener: null,
    jobCreatedId: null,
    init() {
      this.boundOpenListener = () => this.handleOpen();
      this.boundProviderListener = (event) =>
        this.updateProvider(event?.detail?.provider);
      window.addEventListener("quote:create-click", this.boundOpenListener);
      window.addEventListener("provider-selected", this.boundProviderListener);
    },
    destroy() {
      if (this.boundOpenListener) {
        window.removeEventListener(
          "quote:create-click",
          this.boundOpenListener
        );
        this.boundOpenListener = null;
      }
      if (this.boundProviderListener) {
        window.removeEventListener(
          "provider-selected",
          this.boundProviderListener
        );
        this.boundProviderListener = null;
      }
    },
    handleOpen() {
      this.open = true;
    },
    handleClose() {
      this.open = false;
      this.cleanupTempOptions();
    },
    updateProvider(provider) {
      if (provider) this.provider = provider;
    },
    async confirmAction() {
      if (this.isSubmitting) return;
      if (!INQUIRY_RECORD_ID)
        return this.dispatchToast("Missing inquiry record id.", "error");
      if (!this.hasProvider)
        return this.dispatchToast(
          "Allocate a service provider first.",
          "error"
        );
      this.isSubmitting = true;
      try {
        const nowISO = new Date().toISOString();
        const payload = {
          inquiry_record_id: INQUIRY_RECORD_ID,
          quote_date: nowISO,
          quote_status: "New",
          primary_service_provider_id: this.provider?.id || null,
          property_id: PROPERTY_ID || null,
          account_type: accountType || null,
          client_individual_id: CONTACT_ID || null,
          client_entity_id: COMPANY_ID || null,
        };
        const data = await graphqlRequest(CREATE_JOB_MUTATION, {
          payload,
        });
        const createdJobId =
          data?.createJob?.id ||
          data?.createJob?.job_id ||
          data?.createJob?.Job_ID ||
          null;
        this.jobCreatedId = createdJobId;
        if (createdJobId) {
          await graphqlRequest(UPDATE_DEAL_AFTER_QUOTE_MUTATION, {
            id: INQUIRY_RECORD_ID,
            payload: {
              inquiry_status: "Quote Created",
              quote_record_id: createdJobId,
              inquiry_for_job_id: createdJobId,
            },
          });
        }
        this.dispatchToast(
          `Quote created & notified for ${this.providerName}.`,
          "success"
        );
        const quoteNumber = createdJobId
          ? `#Q${String(createdJobId).padStart(4, "0")}`
          : "#Q0000";
        const quoteDate = new Date().toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        window.dispatchEvent(
          new CustomEvent("quote:created", {
            detail: {
              quoteNumber,
              quoteDate,
              quotePrice: "$0.00",
              recipients: this.providerName,
              jobId: createdJobId,
            },
          })
        );
        this.open = false;
      } catch (error) {
        console.error("Failed to create job", error);
        this.dispatchToast(
          error?.message || "Unable to create quote right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    get providerName() {
      return this.provider?.name || "No service provider allocated";
    },
    get providerIdDisplay() {
      if (!this.provider?.id) return "N/A";
      return `#${this.provider.id}`;
    },
    get hasProvider() {
      return Boolean(this.provider?.id);
    },
    dispatchToast(message, variant = "success") {
      window.dispatchEvent(
        new CustomEvent("toast:show", {
          detail: { message, variant },
        })
      );
    },
  }));

  Alpine.data("editQuoteModal", () => ({
    open: false,
    form: {
      quoteDate: "",
      followUpDate: "",
    },
    allowDateEditing: true,
    attachments: [],
    nextAttachmentId: 1,
    boundListener: null,
    isSubmitting: false,
    init() {
      this.boundListener = (event) => this.openModal(event?.detail || {});
      window.addEventListener("quote:edit", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("quote:edit", this.boundListener);
        this.boundListener = null;
      }
    },
    openModal(detail = {}) {
      this.allowDateEditing = detail.allowDateEditing !== false;
      this.prefillForm(detail);
      this.nextAttachmentId = 1;
      this.attachments = this.collectExistingAttachments();
      if (!this.attachments.length) {
        this.$nextTick(() => {
          this.nextAttachmentId = 1;
          const refreshed = this.collectExistingAttachments();
          if (refreshed.length) {
            this.attachments = refreshed;
          }
        });
      }
      this.open = true;
    },
    prefillForm(detail = {}) {
      if (detail.quoteDate) {
        this.form.quoteDate = this.normalizeDateInput(detail.quoteDate);
      }
      if (detail.followUpDate) {
        this.form.followUpDate = this.normalizeDateInput(detail.followUpDate);
      }
    },
    closeModal() {
      this.open = false;
    },
    triggerFileInput() {
      this.$refs.fileInput?.click();
    },
    handleFiles(event) {
      const files = Array.from(event?.target?.files || []);
      if (!files.length) return;
      files.forEach((file) => {
        const isPhoto = file.type?.startsWith("image/");
        this.attachments.push(
          this.createAttachment({
            name: file.name,
            url: "",
            kind: isPhoto ? "Photo" : "File",
            existing: false,
            fileObject: file,
          })
        );
      });
      if (event?.target) {
        event.target.value = "";
      }
    },
    removeAttachment(id) {
      const target = this.attachments.find((file) => file.id === id);
      if (target?.existing) return;
      this.attachments = this.attachments.filter((file) => file.id !== id);
    },
    async handleSave() {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      try {
        await this.ensureUploadsProcessed();
        const uploadPayloads = this.collectUploadPayloads();
        for (const payload of uploadPayloads) {
          await graphqlRequest(CREATE_UPLOAD_MUTATION, { payload });
        }
        if (uploadPayloads.length) {
          this.markAttachmentsUploaded(uploadPayloads);
        }
        const payload = this.buildPayload();
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: JOB_ID,
          payload,
        });
        this.emitToast("Quote updated.");
        this.closeModal();
      } catch (error) {
        console.error("Failed to update quote", error);
        this.emitToast(
          error?.message || "Unable to update quote right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    collectExistingAttachments() {
      const host = document.querySelector('[data-upload-source="edit-quote"]');
      if (!host) return [];
      const attachments = [];
      const sources = host.querySelectorAll("[data-upload-sources]");
      const roots = sources.length ? sources : [host];
      roots.forEach((root) => {
        root.querySelectorAll("[data-photo-uploads-slot]").forEach((slot) => {
          const url = slot.textContent?.trim();
          if (!url) return;
          attachments.push(
            this.createAttachment({
              name: this.extractName(url),
              url,
              kind: this.normalizeKind(slot.dataset.type) || "Photo",
              existing: true,
            })
          );
        });
        root.querySelectorAll("[data-file-uploads-slot]").forEach((slot) => {
          const raw = slot.textContent?.trim() || "";
          const entries = this.parseFileSlot(
            raw,
            this.normalizeKind(slot.dataset.type) || "File"
          );
          entries.forEach((entry) =>
            attachments.push(
              this.createAttachment({
                ...entry,
                existing: true,
                fileMeta: entry.fileMeta || null,
              })
            )
          );
        });
      });
      return attachments;
    },
    parseFileSlot(raw, kind = "File") {
      if (!raw) return [];
      const parsed = this.tryParseJson(raw);
      if (parsed !== null) {
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => this.normalizeFileObject(item, kind))
            .filter(Boolean);
        }
        const normalized = this.normalizeFileObject(parsed, kind);
        return normalized ? [normalized] : [];
      }
      const lines = raw
        .split(/\n+/)
        .map((line) => line.trim().replace(/,$/, ""))
        .filter(Boolean);
      const entries = [];
      if (!lines.length && this.looksLikeUrl(raw)) {
        lines.push(raw.trim());
      }
      lines.forEach((line) => {
        const lineJson = this.tryParseJson(line);
        if (lineJson) {
          const normalized = this.normalizeFileObject(lineJson, kind);
          if (normalized) entries.push(normalized);
        } else if (this.looksLikeUrl(line)) {
          entries.push({
            name: this.extractName(line),
            url: line,
            kind,
          });
        }
      });
      return entries;
    },
    normalizeFileObject(entry, kind = "File") {
      if (!entry) return null;
      if (typeof entry === "string") {
        const parsed = this.tryParseJson(entry);
        if (parsed) return this.normalizeFileObject(parsed, kind);
        if (this.looksLikeUrl(entry)) {
          return {
            name: this.extractName(entry),
            url: entry,
            kind,
            fileMeta: { link: entry, name: this.extractName(entry) },
          };
        }
        return null;
      }
      if (entry.File) {
        const nested = this.tryParseJson(entry.File);
        if (nested) return this.normalizeFileObject(nested, kind);
      }
      const url = entry.link || entry.url || entry.path || entry.src || "";
      if (!url) return null;
      return {
        name: entry.name || this.extractName(url),
        url,
        kind: entry.kind || kind,
        fileMeta: {
          link: url,
          name: entry.name || this.extractName(url),
          size: entry.size || entry.filesize || entry.length || null,
          type: entry.mime || entry.type || "",
        },
      };
    },
    createAttachment({
      name = "Attachment",
      url = "",
      kind = "File",
      existing = false,
      fileObject = null,
      fileMeta = null,
    } = {}) {
      return {
        id: this.nextAttachmentId++,
        name,
        url,
        kind: kind || "File",
        existing,
        fileObject,
        fileMeta,
      };
    },
    async ensureUploadsProcessed() {
      const pending = this.attachments.filter(
        (attachment) =>
          !attachment.existing && attachment.fileObject && !attachment.url
      );
      for (const attachment of pending) {
        await this.uploadAttachment(attachment);
      }
    },
    async uploadAttachment(attachment) {
      if (!attachment?.fileObject) return;
      const file = attachment.fileObject;
      const signed = await this.requestSignedUpload(file);
      const uploadResp = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      if (!uploadResp.ok) {
        throw new Error("Failed to upload file.");
      }
      attachment.url = signed.url;
      if (this.isPhotoAttachment({ ...attachment, fileObject: file })) {
        attachment.fileMeta = null;
      } else {
        attachment.fileMeta = {
          link: signed.url,
          name: attachment.name || file.name,
          size: file.size,
          type: file.type,
        };
      }
      attachment.fileObject = null;
    },
    async requestSignedUpload(file) {
      const response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": GRAPHQL_API_KEY,
        },
        body: JSON.stringify([
          {
            type: file.type || "application/octet-stream",
            name: file.name || "upload",
            generateName: true,
          },
        ]),
      });
      if (!response.ok) {
        throw new Error("Unable to request upload URL.");
      }
      const payload = await response.json();
      const result = Array.isArray(payload) ? payload[0] : payload;
      if (result?.statusCode && result.statusCode !== 200) {
        throw new Error("Upload endpoint rejected the request.");
      }
      const data = result?.data || result || {};
      if (!data?.uploadUrl || !data?.url) {
        throw new Error("Invalid upload response.");
      }
      return data;
    },
    collectUploadPayloads() {
      const jobId = this.getJobId();
      if (!jobId) {
        this.emitToast("Missing job id for uploads.", "error");
        return [];
      }
      return this.attachments
        .filter((attachment) => !attachment.existing && attachment.url)
        .map((attachment) => {
          const payload = { job_id: jobId };
          if (this.isPhotoAttachment(attachment)) {
            payload.photo_upload = attachment.url;
          } else {
            payload.file_upload = attachment.fileMeta || {
              link: attachment.url,
              name: attachment.name,
            };
          }
          return payload.photo_upload || payload.file_upload ? payload : null;
        })
        .filter(Boolean);
    },
    markAttachmentsUploaded(payloads = []) {
      if (!payloads.length) return;
      const urls = payloads.flatMap((payload) => {
        const list = [];
        if (payload.photo_upload) list.push(payload.photo_upload);
        const fileLink = payload.file_upload?.link || payload.file_upload?.url;
        if (fileLink) list.push(fileLink);
        return list;
      });
      if (!urls.length) return;
      this.attachments = this.attachments.map((attachment) => {
        if (urls.includes(attachment.url)) {
          return { ...attachment, existing: true };
        }
        return attachment;
      });
    },
    normalizeDateInput(value) {
      if (!value) return "";
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      const timestamp = this.convertDateToUnix(value);
      if (timestamp === null) return "";
      const date = new Date(timestamp * 1000);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },
    getJobId() {
      return (
        JOB_ID ||
        document.body?.dataset?.jobId ||
        this.attachments.find((att) => att.jobId)?.jobId ||
        ""
      );
    },
    buildPayload() {
      const payload = {};
      if (this.allowDateEditing) {
        const quoteTs = this.convertDateToUnix(this.form.quoteDate);
        if (quoteTs !== null) payload.quote_date = String(quoteTs);
        const followTs = this.convertDateToUnix(this.form.followUpDate);
        if (followTs !== null) payload.follow_up_date = String(followTs);
      }
      return payload;
    },
    convertDateToUnix(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.floor(value);
      }
      const str = String(value).trim();
      if (!str) return null;
      if (/^\d+$/.test(str)) {
        const num = Number(str);
        if (Number.isFinite(num)) {
          return num > 4102444800 ? Math.floor(num / 1000) : num;
        }
      }
      let parsed = null;
      const slashMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const dashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (slashMatch) {
        const [, day, month, year] = slashMatch.map(Number);
        parsed = new Date(year, month - 1, day);
      } else if (dashMatch) {
        const [, day, month, year] = dashMatch.map(Number);
        parsed = new Date(year, month - 1, day);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        parsed = new Date(str);
      } else {
        parsed = new Date(str);
      }
      if (!parsed || isNaN(parsed)) return null;
      return Math.floor(parsed.getTime() / 1000);
    },
    isPhotoAttachment(attachment = {}) {
      const label = (attachment.kind || "").toLowerCase();
      if (label.includes("photo") || label.includes("image")) return true;
      if (attachment.url) {
        const ext = attachment.url.split(".").pop()?.toLowerCase();
        if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) {
          return true;
        }
      }
      return attachment.fileObject?.type?.startsWith("image/") || false;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    extractName(url = "") {
      if (!url) return "Attachment";
      try {
        return decodeURIComponent(
          url.split("/").filter(Boolean).pop() || "Attachment"
        );
      } catch {
        return "Attachment";
      }
    },
    tryParseJson(raw = "") {
      if (raw && typeof raw === "object") return raw;
      const trimmed = raw.trim();
      if (!trimmed || trimmed === "{}") return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    },
    looksLikeUrl(value = "") {
      return /^https?:\/\//i.test(value.trim());
    },
    normalizeKind(raw = "") {
      if (!raw) return "";
      if (raw.includes("[") && raw.includes("]")) return "";
      return raw;
    },
  }));

  Alpine.data("sendQuoteModal", () => ({
    open: false,
    recipients: [],
    selectedContactId: "",
    isSending: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const list = this.normalizeRecipients(event?.detail?.recipients || []);
        if (!list.length) {
          this.emitToast("Select at least one contact.", "error");
          return;
        }
        this.recipients = list;
        this.selectedContactId = this.normalizeId(
          event?.detail?.contactId || ""
        );
        this.open = true;
      };
      window.addEventListener("quote:send-preview", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("quote:send-preview", this.boundListener);
        this.boundListener = null;
      }
    },
    close() {
      if (this.isSending) return;
      this.open = false;
      this.recipients = [];
    },
    normalizeRecipients(list = []) {
      if (!Array.isArray(list)) return [];
      return list
        .map((item) => {
          const id = item.id;
          return {
            id,
            displayName:
              item.displayName || item.name || item.email || "Recipient",
            roleLabel: item.role ? ` (${item.role})` : "",
            email: item.email || "",
            phone: item.phone || "",
            isImportant: Boolean(item.isImportant),
          };
        })
        .filter(Boolean);
    },
    normalizeId(value) {
      const raw = (value ?? "").toString().trim();
      if (!raw || raw === "-" || raw === "—") return "";
      if (/^\[[^\]]+\]$/.test(raw)) return "";
      return raw;
    },
    getJobId() {
      return (
        this.normalizeId(JOB_ID) ||
        this.normalizeId(document.body?.dataset?.jobId) ||
        this.normalizeId(
          document.querySelector("[data-var-jobid]")?.dataset?.varJobid
        )
      );
    },
    async handleSend() {
      if (!this.recipients.length) {
        this.emitToast("No recipients selected.", "error");
        return;
      }
      const jobId = this.getJobId();
      if (!jobId) {
        this.emitToast("Missing job id.", "error");
        return;
      }
      if (this.isSending) return;
      this.isSending = true;
      try {
        const nowTs = Math.floor(Date.now() / 1000);
        const formatted = this.formatDateDDMMYYYY(new Date());
        const contactId =
          this.selectedContactId ||
          this.normalizeId(this.recipients[0]?.id || "");
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: jobId,
          payload: {
            quote_status: "Sent",
            date_quote_sent: String(nowTs),
            accounts_contact_id: contactId || null,
          },
        });
        window.dispatchEvent(
          new CustomEvent("quote:status-change", {
            detail: {
              quoteStatus: "Sent",
              dateQuoteSent: formatted,
            },
          })
        );
        if (contactId) {
          window.dispatchEvent(
            new CustomEvent("job-contact:update-status", {
              detail: {
                field: "accounts_contact_id",
                contactId,
                success: true,
                message: "Account email updated.",
              },
            })
          );
        }
        this.emitToast("Quote marked as sent.");
        this.close();
      } catch (error) {
        console.error("Failed to send quote", error);
        this.emitToast(
          error?.message || "Unable to send quote right now.",
          "error"
        );
      } finally {
        this.isSending = false;
      }
    },
    formatDateDDMMYYYY(date) {
      const d = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(d)) return "";
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("acceptQuoteModal", () => ({
    open: false,
    clientName: "",
    providerName: "",
    isSubmitting: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const detail = event?.detail || {};
        this.clientName =
          detail.clientName ||
          this.extractClientName(detail.recipients) ||
          "Client";
        this.providerName =
          detail.providerName ||
          this.extractProviderName() ||
          "Service Provider";
        this.open = true;
      };
      window.addEventListener("quote:accept-preview", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("quote:accept-preview", this.boundListener);
        this.boundListener = null;
      }
    },
    close() {
      if (this.isSubmitting) return;
      this.open = false;
    },
    extractClientName(recipients = []) {
      if (!Array.isArray(recipients) || !recipients.length) return "";
      return recipients[0]?.displayName || "";
    },
    extractProviderName() {
      const field = document.getElementById("allocate-provider-input");
      const placeholder = field?.getAttribute("placeholder") || "";
      if (placeholder.toLowerCase().startsWith("allocated to ")) {
        return (
          placeholder.replace(/^Allocated to\s*/i, "").trim() ||
          "Service Provider"
        );
      }
      return "Service Provider";
    },
    async handleAccept() {
      if (this.isSubmitting) return;
      if (!JOB_ID) {
        this.emitToast("Missing job id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        const nowTs = Math.floor(Date.now() / 1000);
        const formatted = this.formatDateDDMMYYYY(new Date());
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: JOB_ID,
          payload: {
            quote_status: "Accepted",
            date_quoted_accepted: String(nowTs),
          },
        });
        window.dispatchEvent(
          new CustomEvent("quote:status-change", {
            detail: {
              quoteStatus: "Accepted",
              dateQuoteAccepted: formatted,
            },
          })
        );
        this.emitToast("Quote marked as accepted.");
        this.close();
      } catch (error) {
        console.error("Failed to accept quote", error);
        this.emitToast(
          error?.message || "Unable to accept quote right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    formatDateDDMMYYYY(date) {
      const d = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(d)) return "";
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("viewActivitiesModal", () => ({
    open: false,
    activities: [
      {
        id: "a-1",
        task: "Task 1",
        option: "1",
        service: "Possum",
        price: "$129.99",
        note: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis.",
        status: "Quoted",
      },
      {
        id: "a-2",
        task: "Task 1",
        option: "2",
        service: "Possum",
        price: "$119.99",
        note: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis.",
        status: "To Be Scheduled",
      },
      {
        id: "a-3",
        task: "Task 2",
        option: "1",
        service: "Rat removal",
        price: "$89.99",
        note: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis.",
        status: "Scheduled",
      },
      {
        id: "a-4",
        task: "Task 2",
        option: "2",
        service: "Rat removal",
        price: "$109.99",
        note: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis.",
        status: "Completed",
      },
    ],
    boundListener: null,
    init() {
      this.boundListener = () => {
        this.open = true;
      };
      window.addEventListener("activities:view-all", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("activities:view-all", this.boundListener);
        this.boundListener = null;
      }
    },
    statusBadgeClass(status) {
      const palette = {
        Quoted: "bg-violet-100 text-violet-700",
        "To Be Scheduled": "bg-amber-100 text-amber-800",
        Scheduled: "bg-blue-100 text-blue-700",
        Completed: "bg-emerald-100 text-emerald-700",
      };
      return palette[status] || "bg-slate-100 text-slate-600";
    },
    close() {
      this.open = false;
    },
  }));

  Alpine.data("billingSummaryModal", () => ({
    open: false,
    confirm: false,
    confirmBusy: false,
    billObserver: null,
    summary: {
      businessName: "The Business Pty Ltd",
      jobId: "#1231543",
      jobLink: "#",
      completedOn: "3 Dec 2024, 7:00 pm",
      billStatusLabel: "Create Bill Line Item",
      billXeroId: "f649a1be-7d4f-4194-966c-f26c3457db8c",
      from: {
        accountName: "Dipesh Adhikari",
        accountNumber: "123456",
        bsb: "001-123",
        jobRate: "50%",
        abn: "56 1234 1233",
        gstRegistered: "Yes",
      },
      to: {
        businessName: "Awesomate",
        clientName: "Nick Jonas",
        abn: "1234567890",
        address: "13 Parakeet Pl",
      },
      invoiceTotal: "$900.00",
      materialsTotal: "$900.00",
      batch: {
        id: "51",
        billDate: "12 Dec 2024, 12:00 pm",
        billDueDate: "12 Dec 2024, 12:00 pm",
      },
      totals: {
        commissionRate: "50%",
        billTotal: "$343.00",
        billGst: "$240.00",
        grandTotal: "$1000.00",
      },
    },
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        this.mergeSummary(event?.detail || {});
        this.open = true;
        this.$nextTick(() => this.syncBillApproval());
      };
      window.addEventListener("billingSummary:open", this.boundListener);
      this.$nextTick(() => this.setupBillApprovalObserver());
      this.$watch("open", (value) => {
        if (value) {
          this.$nextTick(() => this.syncBillApproval());
          setTimeout(() => this.syncBillApproval(), 50);
        }
      });
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("billingSummary:open", this.boundListener);
        this.boundListener = null;
      }
      if (this.billObserver) {
        this.billObserver.disconnect();
        this.billObserver = null;
      }
    },
    mergeSummary(detail = {}) {
      if (!detail || typeof detail !== "object") return;
      const mergeSection = (target = {}, source = {}) => ({
        ...target,
        ...(typeof source === "object" && source ? source : {}),
      });
      this.summary = {
        ...this.summary,
        ...detail,
        from: mergeSection(this.summary.from, detail.from),
        to: mergeSection(this.summary.to, detail.to),
        batch: mergeSection(this.summary.batch, detail.batch),
        totals: mergeSection(this.summary.totals, detail.totals),
      };
    },
    get statusPillClass() {
      return "bg-emerald-100 text-emerald-700";
    },
    notify(message, variant = "info") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    setupBillApprovalObserver() {
      const target = this.$root;
      if (!target || this.billObserver) return;
      this.billObserver = new MutationObserver(() => this.syncBillApproval());
      this.billObserver.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
      this.syncBillApproval();
    },
    setBillApprovalValue(value) {
      const target = this.$root || document;
      const node = target.querySelector("[data-bill-approved-value]");
      if (node) {
        node.textContent = value ? "true" : "false";
      }
      const card = this.$refs?.billingSummaryCard;
      if (card) {
        card.dataset.billApproved = value ? "true" : "false";
      }
    },
    syncBillApproval() {
      if (this.confirmBusy) return;
      const container = this.$root || document;
      const raw =
        container.querySelector("[data-bill-approved-value]")?.textContent ||
        container.querySelector("[data-bill-approved]")?.dataset
          ?.billApproved ||
        "";
      const normalized = this.normalizeBoolean(raw);
      this.confirm = normalized ?? false;
    },
    async handleConfirmChange(event) {
      const checked = Boolean(event?.target?.checked);
      if (!JOB_ID) {
        this.notify("Missing job ID.", "error");
        this.confirm = !checked;
        return;
      }
      if (this.confirmBusy) return;
      this.confirmBusy = true;
      this.confirm = checked;
      this.setBillApprovalValue(checked);
      try {
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: JOB_ID,
          payload: { bill_approved_admin: checked },
        });
        this.notify(
          checked ? "Billing approval saved." : "Billing approval removed.",
          "success"
        );
      } catch (error) {
        console.error(error);
        this.notify(
          error?.message || "Failed to save billing approval.",
          "error"
        );
        this.confirm = !checked;
        this.setBillApprovalValue(!checked);
      } finally {
        this.confirmBusy = false;
      }
    },
    handleEdit() {
      this.notify("Edit billing flow coming soon.");
    },
    handleDownload() {
      this.notify("Preparing download…");
    },
    handlePrint() {
      const source = this.$refs?.billingSummaryCard;
      if (!source) {
        this.notify("Unable to open the billing summary.", "error");
        return;
      }
      const clone = source.cloneNode(true);
      clone.querySelectorAll("[data-print-exclude]").forEach((node) => {
        node.remove();
      });
      const styles = Array.from(
        document.querySelectorAll("style, link[rel='stylesheet']")
      )
        .map((node) => node.outerHTML)
        .join("\n");
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        this.notify("Popup blocked. Please allow popups.", "error");
        return;
      }
      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Billing Summary</title>
    ${styles}
    <style>
      body {
        margin: 24px;
        background: #ffffff;
        color: #0f172a;
      }
      .print-wrapper {
        max-width: 960px;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <div class="print-wrapper">
      ${clone.outerHTML}
    </div>
  </body>
</html>`);
      printWindow.document.close();
      printWindow.focus();
    },
    close() {
      this.open = false;
      this.confirm = false;
    },
    formatBoolean(value) {
      const bool = this.normalizeBoolean(value);
      if (bool === null) return "—";
      return bool ? "Yes" : "No";
    },
    normalizeBoolean(value = "") {
      if (value === null || value === undefined) return null;
      const raw = value.toString().trim();
      if (!raw || /^\[[^\]]+\]$/.test(raw)) return null;
      const normalized = raw.toLowerCase();
      if (["yes", "true", "1", "y", "t"].includes(normalized)) return true;
      if (["no", "false", "0", "n", "f"].includes(normalized)) return false;
      return null;
    },
  }));

  Alpine.data("clientJobInvoiceCard", () => ({
    jobStatus: "",
    jobNotes: "",
    datasetObserver: null,
    recipientObserver: null,
    recipients: [],
    selectedRecipientEmails: [],
    dropdownOpen: false,
    invoiceSent: false,
    invoiceSentRecipients: [],
    boundStatusUpdated: null,
    boundContactsChanged: null,
    boundInvoiceSent: null,
    init() {
      this.syncFromDataset();
      this.setupDatasetObserver();
      this.collectRecipients();
      this.setupRecipientObserver();
      this.boundStatusUpdated = (event) => {
        const next = event?.detail?.status;
        if (next) this.jobStatus = this.normalize(next);
      };
      this.boundContactsChanged = () => this.collectRecipients();
      window.addEventListener("job-status:updated", this.boundStatusUpdated);
      window.addEventListener(
        "propertyContacts:changed",
        this.boundContactsChanged
      );
      this.boundInvoiceSent = (event) => {
        const list = Array.isArray(event?.detail?.recipients)
          ? event.detail.recipients
          : [];
        if (list.length) {
          this.invoiceSent = true;
          this.invoiceSentRecipients = list;
          this.selectedRecipientEmails = list
            .map((item) => item.email)
            .filter(Boolean);
        } else {
          this.invoiceSent = true;
        }
      };
      window.addEventListener("invoice:sent", this.boundInvoiceSent);
    },
    destroy() {
      if (this.datasetObserver) {
        this.datasetObserver.disconnect();
        this.datasetObserver = null;
      }
      if (this.recipientObserver) {
        this.recipientObserver.disconnect();
        this.recipientObserver = null;
      }
      if (this.boundStatusUpdated) {
        window.removeEventListener(
          "job-status:updated",
          this.boundStatusUpdated
        );
        this.boundStatusUpdated = null;
      }
      if (this.boundContactsChanged) {
        window.removeEventListener(
          "propertyContacts:changed",
          this.boundContactsChanged
        );
        this.boundContactsChanged = null;
      }
      if (this.boundInvoiceSent) {
        window.removeEventListener("invoice:sent", this.boundInvoiceSent);
        this.boundInvoiceSent = null;
      }
    },
    setupDatasetObserver() {
      if (this.datasetObserver || !this.$el) return;
      this.datasetObserver = new MutationObserver(() => this.syncFromDataset());
      this.datasetObserver.observe(this.$el, {
        childList: true,
        subtree: true,
      });
    },
    setupRecipientObserver() {
      if (this.recipientObserver) return;
      const host = document.querySelector("[data-recipient-source]");
      if (!host) return;
      this.recipientObserver = new MutationObserver(() =>
        this.collectRecipients()
      );
      this.recipientObserver.observe(host, { childList: true, subtree: true });
    },
    syncFromDataset() {
      if (!this.$el) return;
      const data = this.$el.dataset || {};
      let status = data.jobStatus || "";
      let notes = data.jobNotes || "";
      if (!status || this.looksLikePlaceholder(status)) {
        status =
          this.$el
            .querySelector("[data-job-status-source]")
            ?.textContent?.trim() || "";
      }
      if (!notes || this.looksLikePlaceholder(notes)) {
        notes =
          this.$el
            .querySelector("[data-job-notes-source]")
            ?.textContent?.trim() || "";
      }
      this.setJobDetails({ status, notes });
    },
    collectRecipients() {
      const nodes = document.querySelectorAll("[data-recipient-option]");
      const next = [];
      nodes.forEach((node) => {
        const email = (node.dataset.recipientEmail || "").trim();
        if (!email) return;
        const name = (node.dataset.recipientName || "").trim();
        const role = (node.dataset.recipientRole || "").trim();
        const phone = (node.dataset.recipientPhone || "").trim();
        next.push({
          email,
          name,
          role,
          phone,
          label: name ? `${name}${role ? ` (${role})` : ""}` : email,
        });
      });
      this.recipients = next;
      const existing = this.selectedRecipientEmails.filter((email) =>
        next.some((option) => option.email === email)
      );
      if (!existing.length && next.length) {
        this.selectedRecipientEmails = [next[0].email];
      } else {
        this.selectedRecipientEmails = existing;
      }
    },
    setJobDetails({ status = "", notes = "" } = {}) {
      this.jobStatus = this.normalize(status);
      this.jobNotes = this.normalize(notes);
      if ((this.jobStatus || "").toLowerCase() === "completed") {
        this.invoiceSent = true;
      }
      this.broadcastStatus();
    },
    normalize(value = "") {
      const text = (value ?? "").toString().trim();
      if (this.looksLikePlaceholder(text)) return "";
      return text;
    },
    looksLikePlaceholder(value = "") {
      return /^\[[^\]]+\]$/.test((value || "").trim());
    },
    get isWaitingForPayment() {
      return (this.jobStatus || "").toLowerCase() === "waiting for payment";
    },
    get jobStatusLabel() {
      return this.isWaitingForPayment
        ? "Awaiting Payment"
        : this.jobStatus || "—";
    },
    get invoiceAlreadySent() {
      return (
        this.invoiceSent || (this.jobStatus || "").toLowerCase() === "completed"
      );
    },
    get shouldShowRecipientPicker() {
      return this.isWaitingForPayment && !this.invoiceAlreadySent;
    },
    get shouldShowSendButton() {
      return this.isWaitingForPayment && !this.invoiceAlreadySent;
    },
    get paymentStatusLabel() {
      if (this.invoiceAlreadySent) return "Invoice Sent";
      if (this.isWaitingForPayment) return "Invoice Required";
      return "";
    },
    get sentToSummary() {
      const list = this.invoiceSentRecipients.length
        ? this.invoiceSentRecipients
        : this.selectedRecipients;
      if (!list.length) return "Not specified";
      if (list.length === 1) {
        return list[0].label || list[0].email;
      }
      const first = list[0].label || list[0].email;
      return `${first} (+${list.length - 1} others)`;
    },
    toggleRecipientDropdown() {
      if (!this.recipients.length) this.collectRecipients();
      this.dropdownOpen = !this.dropdownOpen;
    },
    closeRecipientDropdown() {
      this.dropdownOpen = false;
    },
    toggleRecipient(email) {
      if (!email) return;
      if (this.isRecipientSelected(email)) {
        this.selectedRecipientEmails = this.selectedRecipientEmails.filter(
          (value) => value !== email
        );
      } else {
        this.selectedRecipientEmails = [...this.selectedRecipientEmails, email];
      }
    },
    isRecipientSelected(email) {
      return this.selectedRecipientEmails.includes(email);
    },
    get selectedRecipients() {
      return this.recipients.filter((recipient) =>
        this.selectedRecipientEmails.includes(recipient.email)
      );
    },
    get selectedSummary() {
      const list = this.selectedRecipients;
      if (!list.length) return "Select recipients";
      if (list.length === 1) return list[0].label;
      return `${list[0].label} (+${list.length - 1})`;
    },
    openSendInvoiceModal() {
      if (!this.selectedRecipientEmails.length) {
        this.toast("Select at least one contact before sending.", "error");
        return;
      }
      this.closeRecipientDropdown();
      window.dispatchEvent(
        new CustomEvent("invoice:send:confirm", {
          detail: { recipients: this.selectedRecipients },
        })
      );
    },
    handleAddContact() {
      window.dispatchEvent(
        new CustomEvent("propertyContact:add:open", {
          detail: { propertyId: PROPERTY_ID },
        })
      );
    },
    toast(message, variant = "error") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    broadcastStatus() {
      window.dispatchEvent(
        new CustomEvent("job-status:updated", {
          detail: { status: this.jobStatus },
        })
      );
    },
  }));

  Alpine.data("sendInvoiceModal", () => ({
    open: false,
    recipients: [],
    isSubmitting: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const list = Array.isArray(event?.detail?.recipients)
          ? event.detail.recipients
          : [];
        if (!list.length) {
          this.emitToast(
            "Select at least one contact before sending.",
            "error"
          );
          return;
        }
        this.recipients = list;
        this.open = true;
      };
      window.addEventListener("invoice:send:confirm", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("invoice:send:confirm", this.boundListener);
        this.boundListener = null;
      }
    },
    get jobId() {
      return (
        JOB_ID ||
        document.body?.dataset?.jobId ||
        this.$el?.dataset?.jobId ||
        ""
      );
    },
    async handleSend() {
      if (this.isSubmitting) return;
      const jobId = this.jobId;
      if (!jobId) {
        this.emitToast("Missing job id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: jobId,
          payload: { job_status: "Completed" },
        });
        this.emitToast("Invoice sent.");
        this.open = false;
        window.dispatchEvent(
          new CustomEvent("job-status:updated", {
            detail: { status: "Completed" },
          })
        );
        window.dispatchEvent(
          new CustomEvent("invoice:sent", {
            detail: { recipients: this.recipients },
          })
        );
      } catch (error) {
        console.error(error);
        this.emitToast(
          error?.message || "Failed to send invoice right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    close() {
      if (this.isSubmitting) return;
      this.open = false;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("serviceProviderPaymentCard", () => ({
    invoiceSent: false,
    jobStatus: "",
    jobUniqueId: JOB_UNIQUE_ID,
    prestartDone: null,
    pcaDone: null,
    boundStatus: null,
    boundInvoice: null,
    fieldObserver: null,
    init() {
      this.syncJobStatus();
      this.setupFieldObserver();
      this.boundStatus = (event) => {
        const next = event?.detail?.status;
        if (next) this.jobStatus = next.toLowerCase();
      };
      this.boundInvoice = () => {
        this.invoiceSent = true;
      };
      window.addEventListener("job-status:updated", this.boundStatus);
      window.addEventListener("invoice:sent", this.boundInvoice);
    },
    destroy() {
      if (this.boundStatus) {
        window.removeEventListener("job-status:updated", this.boundStatus);
        this.boundStatus = null;
      }
      if (this.boundInvoice) {
        window.removeEventListener("invoice:sent", this.boundInvoice);
        this.boundInvoice = null;
      }
      if (this.fieldObserver) {
        this.fieldObserver.disconnect();
        this.fieldObserver = null;
      }
    },
    syncJobStatus() {
      const statusText =
        document
          .querySelector("[data-job-status-source]")
          ?.textContent?.trim()
          ?.toLowerCase() || "";
      this.jobStatus = statusText;
      this.jobUniqueId = this.readJobUniqueId();
      this.syncBooleanFields();
    },
    syncBooleanFields() {
      this.prestartDone = this.extractBooleanValue("[data-prestart-value]");
      this.pcaDone = this.extractBooleanValue("[data-pca-value]");
    },
    setupFieldObserver() {
      if (this.fieldObserver || !this.$el) return;
      this.fieldObserver = new MutationObserver(() => this.syncBooleanFields());
      this.fieldObserver.observe(this.$el, {
        childList: true,
        subtree: true,
      });
    },
    readJobUniqueId() {
      const raw =
        document
          .querySelector("[data-job-unique-source]")
          ?.textContent?.trim() || "";
      return this.cleanPlaceholder(raw);
    },
    cleanPlaceholder(value = "") {
      const text = (value || "").trim();
      return /^\[[^\]]+\]$/.test(text) ? "" : text;
    },
    get canShowDetails() {
      return this.invoiceSent || this.jobStatus === "completed";
    },
    get baseFormUrl() {
      return "https://my.awesomate.pro";
    },
    get pcaLink() {
      return this.jobUniqueId
        ? `${this.baseFormUrl}/${this.jobUniqueId}/forms/pest-control-advice`
        : "";
    },
    get prestartLink() {
      return this.jobUniqueId
        ? `${this.baseFormUrl}/${this.jobUniqueId}/forms/prestart`
        : "";
    },
    openPca() {
      if (!this.pcaLink) return this.toast("PCA link not available yet.");
      window.open(this.pcaLink, "_blank", "noopener");
    },
    openPrestart() {
      if (!this.prestartLink)
        return this.toast("Prestart link not available yet.");
      window.open(this.prestartLink, "_blank", "noopener");
    },
    formatBoolean(value) {
      if (value === null || value === undefined) return "—";
      return value ? "Yes" : "No";
    },
    extractBooleanValue(selector) {
      const text = this.$el?.querySelector(selector)?.textContent?.trim() || "";
      return this.toBoolean(text);
    },
    toBoolean(value = "") {
      const raw = (value || "").toString().trim();
      if (!raw || /^\[[^\]]+\]$/.test(raw)) return null;
      const normalized = raw.toLowerCase();
      if (["yes", "true", "1", "y", "t"].includes(normalized)) return true;
      if (["no", "false", "0", "n", "f"].includes(normalized)) return false;
      return null;
    },
    toast(message, variant = "info") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("followUpCommentModal", () => ({
    open: false,
    comment: "",
    isSubmitting: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const detail = event?.detail || {};
        const provided =
          typeof detail.comment === "string" ? detail.comment : "";
        const fallback =
          document
            .querySelector("[data-follow-up-comment-source]")
            ?.textContent?.trim() || "";
        this.comment = provided.trim() ? provided : fallback;
        this.open = true;
      };
      window.addEventListener("followUpComment:open", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("followUpComment:open", this.boundListener);
        this.boundListener = null;
      }
    },
    async handleSave() {
      if (this.isSubmitting) return;
      const jobId =
        JOB_ID ||
        document.body?.dataset?.jobId ||
        document
          .querySelector("[data-follow-up-comment]")
          ?.closest("[data-var-jobid]")?.dataset?.varJobid ||
        "";
      if (!jobId) {
        this.emitToast("Missing job id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: jobId,
          payload: {
            follow_up_comment: this.comment?.trim() || null,
          },
        });
        this.emitToast("Follow up comment updated.");
        const source = document.querySelector(
          "[data-follow-up-comment-source]"
        );
        if (source) source.textContent = this.comment || "";
        else {
          const target = document.querySelector("[data-follow-up-comment]");
          if (target) target.textContent = this.comment || "";
        }
        this.open = false;
      } catch (error) {
        console.error(error);
        this.emitToast(
          error?.message || "Unable to save follow up comment.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    close() {
      this.open = false;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("popupCommentCard", () => ({
    defaultTarget: DEFAULT_POPUP_COMMENT_TARGET,
    observer: null,
    hasAnyComment: false,
    showContact: false,
    showCompany: false,
    activeComment: "",
    init() {
      this.refreshState();
      this.initObserver();
    },
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    },
    initObserver() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      const target = this.$root;
      if (!target) return;
      this.observer = new MutationObserver(() => this.refreshState());
      this.observer.observe(target, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    },
    sanitize(text = "") {
      const value = (text || "").trim();
      if (!value) return "";
      return /^\[[^\]]+\]$/.test(value) ? "" : value;
    },
    getCommentValue(type) {
      return this.sanitize(
        this.$root?.querySelector(`[data-popup-comment="${type}"]`)
          ?.textContent || ""
      );
    },
    refreshState() {
      const contactText = this.getCommentValue("contact");
      const companyText = this.getCommentValue("company");
      const isCompany = this.defaultTarget === "company";
      const activeText = isCompany ? companyText : contactText;
      this.activeComment = activeText;
      this.showContact = !isCompany && Boolean(contactText);
      this.showCompany = isCompany && Boolean(companyText);
      this.hasAnyComment = Boolean(activeText);
    },
    handleClick() {
      if (!this.hasAnyComment) return;
      window.dispatchEvent(
        new CustomEvent("popup-comment:show", {
          detail: {
            comment: this.activeComment,
            force: true,
            target: this.defaultTarget,
          },
        })
      );
    },
  }));

  Alpine.data("popupCommentModal", () => ({
    open: false,
    comment: "",
    inquiryId: document.body?.dataset?.inquiryId || "",
    contactId: document.body?.dataset?.contactId || "",
    targetType: DEFAULT_POPUP_COMMENT_TARGET,
    defaultTargetType: DEFAULT_POPUP_COMMENT_TARGET,
    isSubmitting: false,
    boundShowListener: null,
    autoOpened: false,
    autoOpenObserver: null,
    init() {
      this.boundShowListener = (event) => {
        const detail = event?.detail || {};
        const text = typeof detail.comment === "string" ? detail.comment : "";
        const providedTarget = this.normalizeTarget(detail.target);
        const shouldOpen = detail.force || text.trim().length > 0;
        if (shouldOpen) {
          this.comment = text;
          this.targetType = providedTarget || this.defaultTargetType;
          this.open = true;
        }
      };
      window.addEventListener("popup-comment:show", this.boundShowListener);
      this.$nextTick(() => this.tryAutoOpen());
    },
    destroy() {
      if (this.boundShowListener) {
        window.removeEventListener(
          "popup-comment:show",
          this.boundShowListener
        );
        this.boundShowListener = null;
      }
      this.cleanupAutoOpenObserver();
    },
    tryAutoOpen() {
      if (this.autoOpened || this.open) return;
      const existing = this.getExistingComment();
      if (existing) {
        this.comment = existing.comment;
        this.targetType = existing.target;
        this.open = true;
        this.autoOpened = true;
        this.cleanupAutoOpenObserver();
        return;
      }
      if (this.autoOpenObserver) return;
      const root =
        document.querySelector("[data-popup-comment-card]") || document.body;
      if (!root) return;
      this.autoOpenObserver = new MutationObserver(() => {
        const found = this.getExistingComment();
        if (!found) return;
        this.comment = found.comment;
        this.targetType = found.target;
        this.open = true;
        this.autoOpened = true;
        this.cleanupAutoOpenObserver();
      });
      this.autoOpenObserver.observe(root, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    },
    cleanupAutoOpenObserver() {
      if (!this.autoOpenObserver) return;
      this.autoOpenObserver.disconnect();
      this.autoOpenObserver = null;
    },
    getExistingComment() {
      const target = this.defaultTargetType;
      const active = this.readComment(target);
      if (active) {
        return { comment: active, target };
      }
      return null;
    },
    readComment(target) {
      if (!target) return "";
      const text =
        document.querySelector(`[data-popup-comment="${target}"]`)
          ?.textContent || "";
      return this.sanitizeComment(text);
    },
    sanitizeComment(text = "") {
      const value = (text || "").trim();
      if (!value) return "";
      return /^\[[^\]]+\]$/.test(value) ? "" : value;
    },
    handleClose() {
      if (this.isSubmitting) return;
      this.open = false;
      this.targetType = this.defaultTargetType;
    },
    async handleUpdate() {
      if (this.isSubmitting) return;
      const target =
        this.normalizeTarget(this.targetType) || this.defaultTargetType;
      const mutation =
        target === "company"
          ? UPDATE_COMPANY_MUTATION
          : UPDATE_CONTACT_MUTATION;
      const targetId = target === "company" ? COMPANY_ID : CONTACT_ID;
      if (!targetId) {
        this.emitToast("Missing target id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        await graphqlRequest(mutation, {
          id: targetId,
          payload: {
            popup_comment: this.comment,
          },
        });
        this.emitToast("Popup note updated.");
        const targetNode = document.querySelector(
          `[data-popup-comment="${target}"]`
        );
        if (targetNode) {
          targetNode.textContent = this.comment || "";
        }
        this.open = false;
        this.targetType = this.defaultTargetType;
      } catch (error) {
        console.error("Failed to update popup comment", error);
        this.emitToast(
          error?.message || "Unable to update popup note right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    normalizeTarget(value) {
      if (typeof value !== "string") return null;
      const normalized = value.toLowerCase();
      if (normalized === "company") return "company";
      if (normalized === "contact") return "contact";
      return null;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("uploadsModal", () => ({
    open: false,
    attachments: [],
    activeIndex: 0,
    boundShowListener: null,
    init() {
      this.boundShowListener = (event) => {
        const detail = event?.detail || {};
        const payload = detail.attachments;
        let parsed = this.parseAttachments(payload);
        if (!parsed.length) {
          parsed = this.collectFromDom(detail.target);
        }
        this.attachments = parsed;
        this.activeIndex = 0;
        this.open = true;
      };
      window.addEventListener("uploads:show", this.boundShowListener);
    },
    destroy() {
      if (this.boundShowListener) {
        window.removeEventListener("uploads:show", this.boundShowListener);
        this.boundShowListener = null;
      }
    },
    parseAttachments(raw) {
      if (!raw) return [];
      let data = raw;
      if (typeof raw === "string") {
        try {
          data = JSON.parse(raw);
        } catch {
          data = [];
        }
      }
      if (!Array.isArray(data)) data = [data];
      return data
        .map((item) => this.normalizeAttachment(item))
        .flat()
        .filter(Boolean);
    },
    normalizeAttachment(entry, kind = "") {
      const results = [];
      if (!entry) return results;
      if (Array.isArray(entry)) {
        entry.forEach((item) =>
          results.push(...this.normalizeAttachment(item, kind))
        );
        return results;
      }
      if (entry.File) {
        const nested = this.tryParseJson(entry.File);
        if (nested) {
          results.push(...this.normalizeAttachment(nested, "File"));
        }
        return results;
      }
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        const parsed = this.tryParseJson(trimmed);
        if (parsed) {
          results.push(...this.normalizeAttachment(parsed, kind));
        } else if (this.looksLikeUrl(trimmed)) {
          results.push({
            name: this.extractName(trimmed),
            url: trimmed,
            type: this.inferMimeFromUrl(trimmed),
            isImage: this.isImageType("", trimmed),
            kind,
            typeLabel: this.describeType("", trimmed, kind),
          });
        }
        return results;
      }
      const url = entry.url || entry.path || entry.src || entry.link || "";
      if (!url) return results;
      const name = entry.name || entry.filename || this.extractName(url);
      const effectiveKind = kind || entry.kind || "";
      const mime = (entry.mime || entry.type || "").toLowerCase();
      const type = mime || this.inferMimeFromUrl(url);
      const isImage = entry.isImage ?? this.isImageType(type, url) ?? false;
      results.push({
        name,
        url,
        type,
        isImage,
        kind: effectiveKind,
        typeLabel:
          entry.typeLabel || this.describeType(type, url, effectiveKind),
      });
      return results;
    },
    extractName(url = "") {
      try {
        const parts = url.split("/");
        return decodeURIComponent(parts[parts.length - 1] || "Attachment");
      } catch {
        return "Attachment";
      }
    },
    inferMimeFromUrl(url = "") {
      const ext = url.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "jpg":
        case "jpeg":
          return "image/jpeg";
        case "png":
          return "image/png";
        case "gif":
          return "image/gif";
        case "webp":
          return "image/webp";
        case "pdf":
          return "application/pdf";
        case "doc":
        case "docx":
          return "application/msword";
        case "txt":
          return "text/plain";
        default:
          return "";
      }
    },
    isImageType(type = "", url = "") {
      if (type.startsWith("image/")) return true;
      const ext = url.split(".").pop()?.toLowerCase();
      return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
    },
    describeType(type = "", url = "", kind = "") {
      if (kind) {
        if (/photo/i.test(kind)) return "Photo";
        if (/file/i.test(kind)) return "File";
      }
      if (type.startsWith("image/")) return "Image";
      if (type.includes("pdf")) return "PDF Document";
      if (type.includes("word") || /\.docx?$/i.test(url)) {
        return "Word Document";
      }
      if (type.includes("text") || /\.txt$/i.test(url)) {
        return "Text File";
      }
      if (/\.xls[x]?$/i.test(url)) return "Spreadsheet";
      return "File Attachment";
    },
    close() {
      this.open = false;
    },
    collectFromDom(target = "") {
      const sources = [];
      const hostList = target
        ? Array.from(
          document.querySelectorAll(`[data-upload-source="${target}"]`)
        )
        : Array.from(document.querySelectorAll("[data-upload-source]"));
      if (!hostList.length) return sources;

      hostList.forEach((host) => {
        if (!host) return;
        const containers = host.querySelectorAll("[data-upload-sources]");
        const targets = containers.length ? containers : [host];

        targets.forEach((root) => {
          if (!root) return;
          const photoSlots = root.querySelectorAll("[data-photo-uploads-slot]");
          photoSlots.forEach((slot) => {
            sources.push(
              ...this.extractFromSlot(
                slot,
                this.normalizeKind(slot.dataset.type) || "Photo"
              )
            );
          });

          const fileSlots = root.querySelectorAll("[data-file-uploads-slot]");
          fileSlots.forEach((slot) => {
            sources.push(
              ...this.extractFromSlot(
                slot,
                this.normalizeKind(slot.dataset.type) || "File"
              )
            );
          });
        });
      });

      return this.parseAttachments(sources);
    },
    extractFromSlot(slot, kind = "") {
      if (!slot) return [];
      const items = [];
      const effectiveKind = this.normalizeKind(kind);
      slot.querySelectorAll("img").forEach((img) => {
        if (!img.src) return;
        items.push({
          url: img.currentSrc || img.src,
          name: img.alt || img.dataset.name || this.extractName(img.src),
          mime: img.dataset.mime || "",
          kind: effectiveKind,
          typeLabel: this.describeType(
            img.dataset.mime || "",
            img.src,
            effectiveKind
          ),
          isImage: true,
        });
      });
      slot.querySelectorAll("a[href]").forEach((anchor) => {
        if (anchor.querySelector("img")) return;
        const url = anchor.href;
        if (!url) return;
        items.push({
          url,
          name:
            anchor.dataset.name ||
            anchor.textContent.trim() ||
            this.extractName(url),
          mime: anchor.dataset.mime || "",
          kind: effectiveKind,
          typeLabel: this.describeType(
            anchor.dataset.mime || "",
            url,
            effectiveKind
          ),
        });
      });
      const raw = slot.textContent?.trim();
      if (raw) {
        const parsed = this.tryParseJson(raw);
        if (parsed) {
          items.push(...this.normalizeAttachment(parsed, effectiveKind));
        } else {
          raw
            .split(/\n+/)
            .map((line) => line.trim().replace(/,$/, ""))
            .filter(Boolean)
            .forEach((line) => {
              const json = this.tryParseJson(line);
              if (json) {
                items.push(...this.normalizeAttachment(json, effectiveKind));
              } else if (this.looksLikeUrl(line)) {
                items.push({
                  url: line,
                  name: this.extractName(line),
                  mime: "",
                  kind: effectiveKind,
                  typeLabel: this.describeType("", line, effectiveKind),
                });
              }
            });
        }
      }
      return items;
    },
    tryParseJson(raw = "") {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    },
    normalizeKind(raw = "") {
      if (!raw) return "";
      if (raw.includes("[") && raw.includes("]")) return "";
      return raw;
    },
    looksLikeUrl(value = "") {
      return /^https?:\/\//i.test(value);
    },
    prev() {
      if (this.hasPrev) {
        this.activeIndex -= 1;
      }
    },
    next() {
      if (this.hasNext) {
        this.activeIndex += 1;
      }
    },
    get hasPrev() {
      return this.activeIndex > 0;
    },
    get hasNext() {
      return this.activeIndex < this.attachments.length - 1;
    },
    get currentAttachment() {
      return this.attachments[this.activeIndex] || {};
    },
    get attachmentLabel() {
      if (!this.attachments.length) return "";
      return `Attachment ${this.activeIndex + 1} of ${this.attachments.length}`;
    },
  }));

  Alpine.data("recommendationModal", () => ({
    open: false,
    value: "",
    jobId: null,
    isSubmitting: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const detail = event?.detail || {};
        this.value =
          typeof detail.recommendation === "string"
            ? detail.recommendation
            : "";
        this.jobId = detail.jobId || JOB_ID;
        this.open = true;
      };
      window.addEventListener("recommendation:edit", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("recommendation:edit", this.boundListener);
        this.boundListener = null;
      }
    },
    close() {
      if (this.isSubmitting) return;
      this.open = false;
    },
    async submit() {
      if (this.isSubmitting) return;
      const targetJobId = this.jobId || JOB_ID;
      if (!targetJobId) {
        this.emitToast("Missing job id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: targetJobId,
          payload: { admin_recommendation: this.value },
        });
        this.emitToast("Recommendation updated.");
        this.open = false;
      } catch (error) {
        console.error("Failed to update recommendation", error);
        this.emitToast(
          error?.message || "Unable to update recommendation right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("activityModal", () => ({
    open: false,
    form: {
      job: "Job 1",
      option: "Option 1",
      service: "Possum",
      activityPrice: "0.00",
      serviceOption: "R4.1 ECOWOOL to ceiling cavity.",
      activityText: "",
      warranty: "",
      note: "",
      invoiceClient: true,
      includeDocuments: true,
    },
    mode: "create",
    activityId: null,
    boundAddListener: null,
    boundEditListener: null,
    isSubmitting: false,
    notify(message, variant = "success") {
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    normalizePrice(value) {
      if (typeof value === "number") return value.toFixed(2);
      const numeric = parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(numeric)) {
        return numeric.toFixed(2);
      }
      return "0.00";
    },
    normalizeBoolean(value) {
      if (typeof value === "boolean") return value;
      const str = String(value ?? "")
        .trim()
        .toLowerCase();
      return ["1", "true", "yes", "y"].includes(str);
    },
    services: [],
    serviceOptions: [],
    filteredServiceOptions: [],
    tempSelectOptions: {},
    serviceCatalog: [],
    servicesById: new Map(),
    servicesCatalogLoaded: false,
    init() {
      this.boundAddListener = () => {
        this.openModal("create", {});
      };
      this.boundEditListener = (event) => {
        const detail = event?.detail || {};
        this.openModal("edit", detail);
      };
      window.addEventListener("activity:add", this.boundAddListener);
      window.addEventListener("activity:edit", this.boundEditListener);
    },
    destroy() {
      if (this.boundAddListener) {
        window.removeEventListener("activity:add", this.boundAddListener);
        this.boundAddListener = null;
      }
      if (this.boundEditListener) {
        window.removeEventListener("activity:edit", this.boundEditListener);
        this.boundEditListener = null;
      }
      this.cleanupTempOptions();
    },
    handleClose() {
      this.open = false;
      this.cleanupTempOptions();
    },
    openModal(mode, detail = {}) {
      this.mode = mode;
      this.activityId = detail.activityId || null;
      this.resetForm();
      this.open = true;
      this.$nextTick(async () => {
        await Promise.all([
          this.ensureServiceData(),
          this.ensureServicesCatalog(),
        ]);
        this.prefillFromDetail(detail);
      });
    },
    resetForm() {
      this.cleanupTempOptions();
      this.form = {
        job: "",
        option: "",
        service: "",
        activityPrice: "0.00",
        serviceOption: "",
        activityText: "",
        warranty: "",
        note: "",
        invoiceClient: true,
        includeDocuments: true,
      };
      this.pendingServiceId = "";
      this.pendingServiceOptionId = "";
    },
    prefillFromDetail(detail = {}) {
      if (!detail) return;
      this.form.job = detail.task || "";
      this.form.option = detail.option || "";
      this.ensureTempSelectOption("job", this.$refs.jobSelect, this.form.job);
      this.ensureTempSelectOption(
        "option",
        this.$refs.optionSelect,
        this.form.option
      );
      this.form.activityPrice = this.normalizePrice(detail.activityPrice);
      this.form.activityText = detail.activityText || "";
      this.form.warranty = detail.warranty || "";
      this.form.note = detail.note || "";
      this.form.invoiceClient =
        detail.invoiceToClient !== undefined
          ? this.normalizeBoolean(detail.invoiceToClient)
          : true;
      const fallbackParentId = this.sanitizeId(detail.serviceParentId);
      const fallbackOptionId = this.sanitizeId(detail.serviceOptionId);
      const recordId =
        this.sanitizeId(detail.serviceRecordId) ||
        this.sanitizeId(detail.serviceId) ||
        fallbackOptionId ||
        fallbackParentId;
      const { primaryId, optionId } = this.resolveServicePrefill(
        recordId,
        fallbackParentId,
        fallbackOptionId
      );
      this.form.service = primaryId || "";
      this.form.serviceOption = optionId || "";
      this.pendingServiceId = this.form.service;
      this.pendingServiceOptionId = optionId || "";
      this.ensureTempSelectOption(
        "service",
        this.$refs.serviceSelect,
        this.form.service
      );
      if (this.form.serviceOption) {
        this.ensureTempSelectOption(
          "service-option",
          this.$refs.serviceOptionSelect,
          this.form.serviceOption
        );
      }
      this.$nextTick(() => {
        this.handleServiceChange();
        if (
          this.pendingServiceOptionId &&
          this.form.serviceOption !== this.pendingServiceOptionId
        ) {
          this.form.serviceOption = this.pendingServiceOptionId;
          this.ensureTempSelectOption(
            "service-option",
            this.$refs.serviceOptionSelect,
            this.pendingServiceOptionId
          );
        }
      });
    },
    async handleSubmit() {
      if (this.isSubmitting) return;
      const serviceId = this.getServiceIdForPayload();
      if (!serviceId) {
        this.notify("Select a service first.", "error");
        return;
      }
      const payload = {
        job_id: JOB_ID,
        service_id: serviceId,
        task: this.form.job,
        option: this.form.option,
        activity_price: parseFloat(
          this.normalizePrice(this.form.activityPrice)
        ),
        activity_text: this.form.activityText,
        warranty: this.form.warranty,
        note: this.form.note,
        invoice_to_client: Boolean(this.form.invoiceClient),
      };
      const isEdit = this.mode === "edit" && this.activityId;
      const mutation = isEdit
        ? UPDATE_ACTIVITY_MUTATION
        : CREATE_ACTIVITY_MUTATION;
      const variables = isEdit ? { id: this.activityId, payload } : { payload };
      this.isSubmitting = true;
      try {
        await graphqlRequest(mutation, variables);
        this.notify(isEdit ? "Activity updated." : "Activity created.");
        this.open = false;
      } catch (error) {
        console.error("Failed to submit activity", error);
        this.notify(
          error?.message || "Unable to save activity right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    getServiceIdForPayload() {
      if (this.filteredServiceOptions.length && this.form.serviceOption) {
        return this.form.serviceOption;
      }
      return this.form.service || null;
    },
    ensureServicesCatalog() {
      if (this.servicesCatalogLoaded) {
        return Promise.resolve();
      }
      if (!this.servicesCatalogLoaded) {
        return fetchServicesCatalog().then((catalog) => {
          const list = Array.isArray(catalog) ? catalog : [];
          this.serviceCatalog = list;
          this.servicesById = new Map();
          list.forEach((entry) => {
            if (!entry) return;
            const id = this.sanitizeId(
              entry.serviceid ?? entry.serviceId ?? entry.id
            );
            if (!id) return;
            const parentId = this.sanitizeId(
              entry.primary_service_id ?? entry.Primary_Service_ID ?? ""
            );
            this.servicesById.set(id, {
              id,
              name:
                entry.service_name || entry.Service_Name || entry.name || "",
              type:
                entry.service_type || entry.Service_Type || entry.type || "",
              parentId,
            });
          });
          this.servicesCatalogLoaded = true;
        });
      }
      return Promise.resolve();
    },
    getServiceMetaById(id) {
      const key = this.sanitizeId(id);
      if (!key) return null;
      return this.servicesById.get(key) || null;
    },
    resolveServicePrefill(recordId, fallbackParentId, fallbackOptionId) {
      const meta = this.getServiceMetaById(recordId);
      if (meta) {
        const type = (meta.type || "").toLowerCase();
        if (type.includes("option") && meta.parentId) {
          return { primaryId: meta.parentId, optionId: meta.id };
        }
        return { primaryId: meta.id, optionId: "" };
      }
      if (fallbackParentId) {
        return {
          primaryId: fallbackParentId,
          optionId: fallbackOptionId || recordId || "",
        };
      }
      if (recordId) {
        return { primaryId: recordId, optionId: "" };
      }
      return { primaryId: "", optionId: "" };
    },
    ensureServiceData() {
      if (this.tryLoadServiceData()) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const maxAttempts = 10;
        const attemptLoad = (attempt = 0) => {
          if (this.tryLoadServiceData() || attempt >= maxAttempts) {
            resolve();
          } else {
            setTimeout(() => attemptLoad(attempt + 1), 100);
          }
        };
        attemptLoad();
      });
    },
    tryLoadServiceData() {
      let hasServices = false;
      if (this.$refs.serviceSource) {
        const parsedServices = this.parseOptions(
          this.$refs.serviceSource,
          false
        );
        if (parsedServices.length) {
          this.services = parsedServices;
          hasServices = true;
          const hasCurrentSelection = parsedServices.some(
            (service) => service.id === this.form.service
          );
          if (!this.form.service || !hasCurrentSelection) {
            this.form.service = parsedServices[0].id;
          }
        }
      }
      if (this.$refs.serviceOptionSource) {
        const parsedOptions = this.parseOptions(
          this.$refs.serviceOptionSource,
          true
        );
        if (parsedOptions.length) {
          this.serviceOptions = parsedOptions;
        }
      }
      this.handleServiceChange();
      return hasServices;
    },
    parseOptions(container, withParent = false) {
      if (!container) return [];
      const options = Array.from(container.querySelectorAll("option"));
      return options
        .map((option) => {
          const id = this.sanitizeId(
            option.value ?? option.getAttribute("value") ?? option.textContent
          );
          const name =
            option.dataset.serviceName?.trim() ||
            option.textContent?.trim() ||
            "";
          if (!id || (name && name.includes("["))) return null;
          const type = option.dataset.serviceType?.trim() || "";
          if (!withParent && type && /option/i.test(type)) return null;
          const parentId = this.sanitizeId(option.dataset.parentService);
          return {
            id,
            name: name || id,
            type,
            parentId: withParent ? parentId : "",
          };
        })
        .filter(Boolean);
    },
    handleServiceChange() {
      const targetServiceId = this.pendingServiceId || this.form.service;
      if (targetServiceId && targetServiceId !== this.form.service) {
        this.form.service = targetServiceId;
      }
      if (this.form.service) {
        this.pendingServiceId = "";
      }
      this.ensureTempSelectOption(
        "service",
        this.$refs.serviceSelect,
        this.form.service
      );
      if (!this.form.service) {
        this.filteredServiceOptions = [];
        if (!this.pendingServiceOptionId) {
          this.form.serviceOption = "";
        }
        return;
      }
      this.filteredServiceOptions = this.serviceOptions.filter(
        (option) => option.parentId === this.form.service
      );
      if (!this.filteredServiceOptions.length) {
        if (!this.pendingServiceOptionId) {
          this.form.serviceOption = "";
        }
        return;
      }
      const desiredOptionId =
        this.pendingServiceOptionId || this.form.serviceOption;
      const hasDesired =
        desiredOptionId &&
        this.filteredServiceOptions.some(
          (option) => option.id === desiredOptionId
        );
      if (hasDesired) {
        this.form.serviceOption = desiredOptionId;
        this.pendingServiceOptionId = "";
      } else {
        const hasSelected = this.filteredServiceOptions.some(
          (option) => option.id === this.form.serviceOption
        );
        if (!hasSelected) {
          this.form.serviceOption = this.filteredServiceOptions[0].id;
        }
      }
      this.ensureTempSelectOption(
        "service-option",
        this.$refs.serviceOptionSelect,
        this.form.serviceOption
      );
    },
    cleanupTempOptions() {
      Object.values(this.tempSelectOptions || {}).forEach((option) => {
        if (option && typeof option.remove === "function") {
          option.remove();
        }
      });
      this.tempSelectOptions = {};
    },
    ensureTempSelectOption(key, selectEl, value) {
      if (!selectEl || value === undefined || value === null || value === "")
        return;
      const normalizedValue = String(value);
      const options = Array.from(selectEl.options);
      const hasRealOption = options.some(
        (option) =>
          option.value === normalizedValue && option.dataset.tempOption !== key
      );
      if (hasRealOption) {
        if (this.tempSelectOptions[key]) {
          this.tempSelectOptions[key].remove();
          delete this.tempSelectOptions[key];
        }
        return;
      }
      if (
        this.tempSelectOptions[key] &&
        this.tempSelectOptions[key].value === normalizedValue
      ) {
        return;
      }
      if (this.tempSelectOptions[key]) {
        this.tempSelectOptions[key].remove();
      }
      const option = document.createElement("option");
      option.value = normalizedValue;
      option.textContent = normalizedValue;
      option.dataset.tempOption = key;
      selectEl.appendChild(option);
      this.tempSelectOptions[key] = option;
    },
    sanitizeId(value) {
      if (value === null || value === undefined) return "";
      const trimmed = String(value).trim();
      if (!trimmed) return "";
      const lower = trimmed.toLowerCase();
      if (
        lower === "null" ||
        lower === "undefined" ||
        trimmed.includes("[") ||
        trimmed.includes("]")
      ) {
        return "";
      }
      return trimmed;
    },
  }));

  Alpine.data("deleteActivityModal", () => ({
    open: false,
    activityId: null,
    isSubmitting: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const id = event?.detail?.activityId;
        if (!id) return;
        this.activityId = id;
        this.open = true;
      };
      window.addEventListener("activity:confirm-delete", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener(
          "activity:confirm-delete",
          this.boundListener
        );
        this.boundListener = null;
      }
    },
    close() {
      if (this.isSubmitting) return;
      this.open = false;
    },
    async confirm() {
      if (!this.activityId || this.isSubmitting) return;
      this.isSubmitting = true;
      try {
        await graphqlRequest(DELETE_ACTIVITY_MUTATION, {
          id: this.activityId,
        });
        this.emitToast("Activity deleted.");
        this.open = false;
      } catch (error) {
        console.error("Failed to delete activity", error);
        this.emitToast(
          error?.message || "Unable to delete activity right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("dealInfoModal", () => ({
    open: false,
    isSubmitting: false,
    form: {
      dealName: "Possum Roof Service Request - Baldivis 11/7/24",
      dealValue: "0.00",
      salesStage: "",
      expectedWinPercentage: "",
      expectedCloseDate: "",
      actualCloseDate: "",
      weightedValue: "0.00",
      recentActivity: "",
    },
    salesStageOptions: [
      "New Lead",
      "Qualified Prospect",
      "Visit Scheduled",
      "Consideration",
      "Committed",
      "Closed - Won",
      "Closed - Lost",
    ],
    recentActivityOptions: [
      "Active more than a month ago",
      "Active in the last month",
      "Active in the last week",
    ],

    init() {
      this.boundOpenListener = (event) => {
        const detail = event?.detail || {};
        // later we can hydrate from detail or server
        if (detail.dealName) {
          this.form.dealName = detail.dealName;
        }
        this.open = true;
      };

      window.addEventListener("dealInfo:open", this.boundOpenListener);
      window.addEventListener("dealInfo:prefill", (event) => {
        const data = event.detail || {};
        console.log("Prefilling deal info modal with data:", data);
        this.form.dealName = data.dealName ?? "";
        this.form.dealValue = data.dealValue ?? "";
        this.form.salesStage = data.salesStage ?? "";
        this.form.expectedWinPercentage = data.expectedWin ?? "";

        // 👇 IMPORTANT: normalize the DD/MM/YYYY or DD-MM-YYYY
        this.form.expectedCloseDate = this.normalizeDateInput(
          data.expectedCloseDate
        );
        this.form.actualCloseDate = this.normalizeDateInput(
          data.actualCloseDate
        );

        this.form.weightedValue = data.weightedValue ?? "";
        this.form.recentActivity = data.recentActivity ?? "";
      });
    },

    normalizeDateInput(value) {
      if (!value) return "";
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value; // already correct
      }
      const timestamp = this.convertDateToUnix(value);
      if (timestamp === null) return "";
      const date = new Date(timestamp * 1000);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },

    convertDateToUnix(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.floor(value);
      }
      const str = String(value).trim();
      if (!str) return null;

      // pure digits (timestamp)
      if (/^\d+$/.test(str)) {
        const num = Number(str);
        if (!Number.isFinite(num)) return null;
        return num > 4102444800 ? Math.floor(num / 1000) : num; // seconds vs ms
      }

      let parsed = null;
      const slashMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const dashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);

      if (slashMatch) {
        const [, day, month, year] = slashMatch.map(Number);
        parsed = new Date(year, month - 1, day);
      } else if (dashMatch) {
        const [, day, month, year] = dashMatch.map(Number);
        parsed = new Date(year, month - 1, day);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        parsed = new Date(str);
      } else {
        parsed = new Date(str);
      }

      if (!parsed || isNaN(parsed)) return null;
      return Math.floor(parsed.getTime() / 1000);
    },

    handleClose() {
      this.open = false;
    },

    handleSave: async function () {
      if (this.isSubmitting) return;

      this.isSubmitting = true;
      this.error = "";

      try {
        const dealId = document.body.dataset.inquiryId;
        if (!dealId) throw new Error("Missing deal ID");

        // Build payload – tweak field names to what your API expects
        const payload = {
          deal_value: this.form.dealValue || null,
          sales_stage: this.form.salesStage || null,
          expected_win: this.form.expectedWinPercentage || null,
          expected_close_date: this.convertDateToUnix(
            this.form.expectedCloseDate
          ),
          actual_close_date: this.convertDateToUnix(this.form.actualCloseDate),
          weighted_value: this.form.weightedValue || null,
          recent_activity: this.form.recentActivity || null,
        };

        // 🔹 Wait for the API call to finish
        await graphqlRequest(UPDATE_DEAL_MUTATION, {
          id: dealId,
          payload,
        });

        // Only after success:
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "success",
              message: "Deal updated successfully.",
            },
          })
        );

        this.handleClose();
      } catch (error) {
        console.error(error);
        this.error = "Failed to save deal information. Please try again.";

        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "error",
              message: this.error,
            },
          })
        );
      } finally {
        this.isSubmitting = false;
      }
    },
  }));

  Alpine.data("clientJobTasksModal", () => ({
    open: false,
    tasks: [
      {
        id: "t1",
        title: "Brush Turkeys Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet.",
        status: "Completed",
      },
      {
        id: "t2",
        title: "Brush Turkeys Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet.",
        status: "Completed",
      },
      {
        id: "t3",
        title: "Brush Turkeys Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet.",
        status: "Completed",
      },
      {
        id: "t4",
        title: "Brush Turkeys Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet.",
        status: "Completed",
      },
      {
        id: "t5",
        title: "Brush Turkeys Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet.",
        status: "Completed",
      },
    ],
    boundListener: null,
    init() {
      this.boundListener = () => {
        this.open = true;
      };
      window.addEventListener("clientJobTasks:open", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("clientJobTasks:open", this.boundListener);
        this.boundListener = null;
      }
    },
    close() {
      this.open = false;
    },
  }));

  Alpine.data("addTaskModal", () => ({
    open: false,
    isSubmitting: false,
    error: "",
    jobId: null,
    titleSuffix: "",

    form: {
      subject: "",
      assigneeId: null,
      assigneeName: "",
      dueDate: "", // store as YYYY-MM-DD (normalized)
      notes: "",
    },

    init() {
      // Open modal (optionally pass jobId + jobLabel)
      this.boundOpenListener = (event) => {
        const d = event?.detail || {};
        this.jobId =
          d.jobId ??
          JOB_ID ??
          document.body?.dataset?.jobId ??
          document.querySelector("[data-var-jobid]")?.dataset?.varJobid ??
          null;
        this.titleSuffix = d.jobLabel ?? "";
        if (d.prefill) this.prefill(d.prefill);
        this.open = true;
      };

      window.addEventListener("addTask:open", this.boundOpenListener);
    },

    // === date helpers (same approach/semantics as your dealInfoModal) ===
    normalizeDateInput(value) {
      if (!value) return "";
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
        return value;
      const ts = this.convertDateToUnix(value);
      if (ts === null) return "";
      const date = new Date(ts * 1000);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },

    convertDateToUnix(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === "number" && Number.isFinite(value))
        return Math.floor(value);
      const str = String(value).trim();
      if (!str) return null;

      if (/^\d+$/.test(str)) {
        const num = Number(str);
        if (!Number.isFinite(num)) return null;
        return num > 4102444800 ? Math.floor(num / 1000) : num; // seconds vs ms
      }

      let parsed = null;
      const slash = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const dash = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);

      if (slash) {
        const [, d, m, y] = slash.map(Number);
        parsed = new Date(y, m - 1, d);
      } else if (dash) {
        const [, d, m, y] = dash.map(Number);
        parsed = new Date(y, m - 1, d);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        parsed = new Date(str);
      } else {
        parsed = new Date(str);
      }

      if (!parsed || isNaN(parsed)) return null;
      return Math.floor(parsed.getTime() / 1000);
    },

    handleClose() {
      this.open = false;
    },

    // Calendar overlay pick -> store yyyy-mm-dd
    handlePickDate(e) {
      const iso = e.target.value; // yyyy-mm-dd
      this.form.dueDate = iso || "";
    },

    assignToMe() {
      const me = window?.CURRENT_USER || { id: null, name: "Me" };
      this.form.assigneeId = me.id;
      this.form.assigneeName = me.name;
    },

    // === SAVE (keeps modal open & shows "Saving…" until success) ===
    handleSave: async function () {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      this.error = "";

      try {
        const jobId =
          this.jobId ||
          JOB_ID ||
          document.body?.dataset?.jobId ||
          document.querySelector("[data-var-jobid]")?.dataset?.varJobid;
        if (!jobId) throw new Error("Missing job ID");

        const payload = {
          Job_id: jobId,
          subject: this.form.subject || null,
          assignee_id: 1,
          date_due: this.form.dueDate
            ? this.convertDateToUnix(this.form.dueDate)
            : null,
          details: this.form.notes || null,
        };

        await graphqlRequest(CREATE_JOB_TASK, {
          payload,
        });

        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "success",
              message: "Task added and notification sent.",
            },
          })
        );
        this.handleClose();
      } catch (error) {
        console.error(error);
        this.error = error?.message || "Failed to add task.";
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: { type: "error", message: this.error },
          })
        );
      } finally {
        this.isSubmitting = false;
      }
    },
  }));

  Alpine.data("taskListModal", () => ({
    open: false,
    isLoading: false,
    error: "",
    jobId: null,
    titleSuffix: "",

    tasks: [],
    actionLoading: {},

    // demo assignees — replace with real list
    assignees: [
      {
        id: "1",
        name: "Andrew Wadsworth",
        email: "andrew+inspect@itmooti.com",
      },
    ],

    init() {
      this.boundOpenListener = (e) => {
        const d = e?.detail || {};
        this.jobId = JOB_ID;
        this.titleSuffix = d.jobLabel ?? "";
        this.fetchTasks();
        this.open = true;
      };
      window.addEventListener("taskList:open", this.boundOpenListener);
    },

    async fetchTasks() {
      if (!this.jobId) {
        this.error = "Missing job ID.";
        return;
      }
      this.isLoading = true;
      this.error = "";
      try {
        const data = await graphqlRequest(JOB_TASKS_QUERY, {
          Job_id: this.jobId,
        });
        const rows = Array.isArray(data?.calcTasks) ? data.calcTasks : [];
        this.tasks = rows.map((row, idx) => this.normalizeTask(row, idx));
        this.tasks.sort(
          (a, b) => (a.dueTs ?? Infinity) - (b.dueTs ?? Infinity)
        );
        this.actionLoading = {};
        for (const t of this.tasks) this.actionLoading[t.uid] = false;
        // nudge reactivity
        this.actionLoading = { ...this.actionLoading };
      } catch (err) {
        console.error(err);
        this.error = err?.message || "Failed to load tasks.";
        this.tasks = [];
      } finally {
        this.isLoading = false;
      }
    },

    normalizeTask(row, idx = 0) {
      const subject = row?.Subject ?? "";
      const notes = row?.Details ?? "";
      const assigneeName = [
        row?.Assignee_First_Name ?? "",
        row?.Assignee_Last_Name ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const assigneeEmail = row?.AssigneeEmail ?? "";
      const dueRaw = row?.Date_Due ?? "";
      const dueDate = this.parseDate(dueRaw);
      const dueISO = dueDate
        ? new Date(
          dueDate.getTime() - dueDate.getTimezoneOffset() * 60000
        ).toISOString()
        : "";
      const dueTs = dueDate ? Math.floor(dueDate.getTime() / 1000) : null;

      const id = row?.ID ?? null; // might not be present in your current query
      const uid = id ?? `${this.jobId}::${idx}::${subject.slice(0, 16)}`;
      const status = (row?.Status ?? "open").toLowerCase();

      return {
        id,
        uid,
        status,
        subject,
        notes,
        bullets: [],
        assigneeName,
        assigneeEmail,
        dueISO,
        dueTs,
      };
    },

    // UI helpers
    pillClass(s) {
      return s === "completed"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700";
    },
    pillText(s) {
      return s === "completed" ? "Completed" : "Open";
    },

    humanDue(iso) {
      if (!iso) return "No due date";
      const d = this.parseDate(iso);
      if (!d) return "No due date";
      const now = new Date(),
        tmr = new Date(now);
      tmr.setDate(now.getDate() + 1);
      const same = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
      const hh = String(d.getHours()).padStart(2, "0"),
        mm = String(d.getMinutes()).padStart(2, "0");
      const hasTime = d.getHours() + d.getMinutes() !== 0;
      if (same(d, now) && hasTime) return `Today ${this.to12h(hh, mm)}`;
      if (same(d, tmr) && hasTime) return `Tomorrow ${this.to12h(hh, mm)}`;
      const day = d.getDate(),
        month = d.toLocaleString(undefined, { month: "long" }),
        year = d.getFullYear();
      return hasTime
        ? `${day} ${month}, ${year} ${this.to12h(hh, mm)}`
        : `${day} ${month}, ${year}`;
    },
    to12h(hh, mm) {
      let h = parseInt(hh, 10),
        ap = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h}${mm !== "00" ? `:${mm}` : ""}${ap}`;
    },
    parseDate(v) {
      if (!v) return null;
      if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000);
      if (/^\d{13}$/.test(v)) return new Date(Number(v));
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00`);
      const d = new Date(v);
      return isNaN(d) ? null : d;
    },

    mailtoLink(task) {
      if (!task?.assigneeEmail) return null;
      const addr = task.assigneeEmail.trim();
      const qs = new URLSearchParams({
        subject: `Job task: ${task.subject || ""}`,
        // body: `Hi ${task.assigneeName || ''},\n\nRe: ${task.subject || ''}\n\nThanks,\n`
      }).toString();
      return qs ? `mailto:${addr}?${qs}` : `mailto:${addr}`;
    },

    // Actions (kept — guarded if no real id yet)
    async markComplete(task) {
      const key = task.uid;
      if (this.actionLoading[key]) return;

      this.actionLoading[key] = true;
      this.actionLoading = { ...this.actionLoading };

      try {
        if (!task.id) throw new Error("Missing task ID for update.");
        await graphqlRequest(UPDATE_TASK_MUTATION, {
          id: task.id,
          payload: { status: "completed" },
        });
        task.status = "completed";
        this.toast("success", "Task marked as complete.");
      } catch (e) {
        console.error(e);
        this.toast("error", e?.message || "Failed to complete task.");
      } finally {
        this.actionLoading[key] = false;
        this.actionLoading = { ...this.actionLoading };
      }
    },

    async reopen(task) {
      const key = task.uid;
      if (this.actionLoading[key]) return;

      this.actionLoading[key] = true;
      this.actionLoading = { ...this.actionLoading };

      try {
        if (!task.id) throw new Error("Missing task ID for update.");
        await graphqlRequest(UPDATE_TASK_MUTATION, {
          id: task.id,
          payload: { status: "open" },
        });
        task.status = "open";
        this.toast("success", "Task reopened.");
      } catch (e) {
        console.error(e);
        this.toast("error", e?.message || "Failed to reopen task.");
      } finally {
        this.actionLoading[key] = false;
        this.actionLoading = { ...this.actionLoading };
      }
    },

    isBusy(task) {
      return !!this.actionLoading[task.uid];
    },

    handleMarkComplete(task) {
      console.log("clicked mark complete for", task);
      this.markComplete(task);
    },

    toast(type, message) {
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { type, message } })
      );
    },
    handleClose() {
      this.open = false;
    },
  }));

  Alpine.data("propertyContactModal", () => ({
    open: false,
    isSubmitting: false,
    error: "",
    propertyId: null,
    isEdit: false,
    contactType: "contact",
    showRoleField: true,
    showPrimaryToggle: true,

    // live search dropdown state
    suggestions: [],
    searchDropdownOpen: false,
    searchLoading: false,
    searchError: "",
    searchTerm: "",
    searchDebounceId: null,
    hasSearched: false,
    searchLimit: 10,
    latestSearchTerm: "",
    companySuggestions: [],
    companySearchOpen: false,
    companySearchLoading: false,
    companySearchError: "",
    companySearchDebounceId: null,
    companyHasSearched: false,
    companySearchLimit: 10,
    companyLatestSearchTerm: "",

    form: {
      search: "",
      role: "",
      firstName: "",
      lastName: "",
      email: "",
      sms: "",
      isPrimary: false,
      // if picked from suggestions:
      existingContactId: null,
      contactId: null,
      affiliationId: null,
    },
    companyForm: {
      search: "",
      companyId: null,
      name: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      role: "",
      isPrimary: false,
    },

    init() {
      // open with: window.dispatchEvent(new CustomEvent('propertyContact:add:open', { detail: { propertyId, prefill } }))
      window.addEventListener("propertyContact:add:open", (e) => {
        const d = e?.detail || {};
        this.reset();
        this.propertyId = d.propertyId ?? null;
        this.showRoleField =
          typeof d.showRoleField === "boolean"
            ? d.showRoleField
            : typeof d.hideRoleField === "boolean"
              ? !d.hideRoleField
              : true;
        this.showPrimaryToggle =
          typeof d.showPrimaryToggle === "boolean"
            ? d.showPrimaryToggle
            : typeof d.hidePrimaryToggle === "boolean"
              ? !d.hidePrimaryToggle
              : true;
        const prefill = { ...(d.prefill || {}) };
        if (d.contactId && !prefill.contactId) prefill.contactId = d.contactId;
        if (d.affiliationId && !prefill.affiliationId)
          prefill.affiliationId = d.affiliationId;
        const mode = typeof d.mode === "string" ? d.mode.toLowerCase() : "";
        this.isEdit =
          mode === "edit" ||
          Boolean(prefill.contactId || prefill.affiliationId);
        const companyPrefill = { ...(d.companyPrefill || {}) };
        const hintedType =
          typeof d.contactType === "string" && d.contactType.trim()
            ? d.contactType.trim().toLowerCase()
            : "";
        if (hintedType) {
          this.contactType = hintedType;
        } else if (prefill.contactId || prefill.existingContactId) {
          this.contactType = "contact";
        } else if (companyPrefill.companyId) {
          this.contactType = "company";
        } else {
          this.contactType = "contact";
        }
        if (Object.keys(prefill).length) Object.assign(this.form, prefill);
        if (Object.keys(companyPrefill).length)
          Object.assign(this.companyForm, companyPrefill);
        if (!this.showRoleField) this.form.role = "";
        if (!this.showPrimaryToggle) this.form.isPrimary = false;
        if (!this.form.search) {
          const derivedName = [this.form.firstName, this.form.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          this.form.search = derivedName || this.form.email || "";
        }
        if (!this.companyForm.search) {
          this.companyForm.search = this.companyForm.name || "";
        }
        this.open = true;
      });
    },

    reset() {
      this.error = "";
      this.isSubmitting = false;
      this.contactType = "contact";
      this.showRoleField = true;
      this.showPrimaryToggle = true;
      this.suggestions = [];
      this.searchDropdownOpen = false;
      this.searchLoading = false;
      this.searchError = "";
      this.searchTerm = "";
      this.hasSearched = false;
      this.latestSearchTerm = "";
      if (this.searchDebounceId) {
        clearTimeout(this.searchDebounceId);
        this.searchDebounceId = null;
      }
      this.companySuggestions = [];
      this.companySearchOpen = false;
      this.companySearchLoading = false;
      this.companySearchError = "";
      this.companyHasSearched = false;
      this.companyLatestSearchTerm = "";
      if (this.companySearchDebounceId) {
        clearTimeout(this.companySearchDebounceId);
        this.companySearchDebounceId = null;
      }
      this.isEdit = false;
      this.form = {
        search: "",
        role: "",
        firstName: "",
        lastName: "",
        email: "",
        sms: "",
        isPrimary: false,
        existingContactId: null,
        contactId: null,
        affiliationId: null,
      };
      this.companyForm = {
        search: "",
        companyId: null,
        name: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        role: "",
        isPrimary: false,
      };
    },

    toggleSearchDropdown() {
      this.searchDropdownOpen = !this.searchDropdownOpen;
      if (this.searchDropdownOpen) {
        this.prepareSearchDropdown();
      }
    },

    prepareSearchDropdown() {
      this.hasSearched = false;
      this.searchError = "";
      this.suggestions = [];
      this.searchTerm = this.form.search || "";
      this.$nextTick(() => {
        this.$refs?.contactSearchInput?.focus?.();
      });
    },

    closeSearchDropdown() {
      this.searchDropdownOpen = false;
      this.suggestions = [];
      this.searchLoading = false;
      this.searchError = "";
      this.hasSearched = false;
      this.latestSearchTerm = "";
      this.searchTerm = "";
      if (this.searchDebounceId) {
        clearTimeout(this.searchDebounceId);
        this.searchDebounceId = null;
      }
    },

    onSearchChange() {
      const q = (this.searchTerm || "").trim();
      this.form.search = this.searchTerm || "";
      this.form.contactId = null;
      this.form.existingContactId = null;
      this.searchError = "";
      this.hasSearched = false;
      if (this.searchDebounceId) {
        clearTimeout(this.searchDebounceId);
        this.searchDebounceId = null;
      }
      if (q.length < 2) {
        this.suggestions = [];
        return;
      }
      this.searchDebounceId = setTimeout(() => {
        this.fetchContactSuggestions(q);
      }, 200);
    },

    async fetchContactSuggestions(term) {
      const normalized = (term || "").trim();
      if (!normalized) {
        this.suggestions = [];
        return;
      }
      this.searchLoading = true;
      this.latestSearchTerm = normalized;
      try {
        const data = await graphqlRequest(CALC_CONTACTS_QUERY, {
          limit: this.searchLimit,
          offset: 0,
          searchExpression: this.buildSearchExpression(normalized),
        });
        if (this.latestSearchTerm !== normalized) return;
        const rows = Array.isArray(data?.calcContacts) ? data.calcContacts : [];
        this.suggestions = rows.map((row) => this.normalizeContact(row));
        this.hasSearched = true;
        this.searchError = "";
      } catch (error) {
        console.error(error);
        if (this.latestSearchTerm === normalized) {
          this.suggestions = [];
          this.searchError = error?.message || "Failed to search contacts.";
          this.hasSearched = false;
        }
      } finally {
        if (this.latestSearchTerm === normalized) {
          this.searchLoading = false;
        }
      }
    },

    buildSearchExpression(term = "") {
      const sanitized = term.replace(/[%_]/g, (ch) => `\\${ch}`);
      return `%${sanitized}%`;
    },

    normalizeContact(row) {
      const firstName = (row?.First_Name || "").trim();
      const lastName = (row?.Last_Name || "").trim();
      const email = (row?.Email || "").trim();
      const sms = (row?.SMS_Number || "").trim();
      const displayName = [firstName, lastName].filter(Boolean).join(" ");
      const labelBase = displayName || email || "Unnamed Contact";
      const label =
        displayName && email ? `${displayName} · ${email}` : labelBase;
      return {
        id: row?.Contact_ID || null,
        firstName,
        lastName,
        email,
        sms,
        displayLabel: label,
      };
    },

    pickSuggestion(contact) {
      if (!contact) return;
      this.form.search = contact.displayLabel;
      this.form.existingContactId = contact.id || null;
      this.form.contactId = contact.id || null;
      this.form.firstName = contact.firstName || "";
      this.form.lastName = contact.lastName || "";
      this.form.email = contact.email || "";
      this.form.sms = contact.sms || "";
      this.closeSearchDropdown();
    },

    clearSelectedContact() {
      this.form.search = "";
      this.form.contactId = null;
      this.form.existingContactId = null;
      this.searchTerm = "";
      this.hasSearched = false;
      this.suggestions = [];
      this.searchError = "";
    },

    openCompanySearch() {
      this.companySearchOpen = true;
      this.companyHasSearched = false;
      this.companySearchError = "";
      this.companySuggestions = [];
    },

    closeCompanySearch() {
      this.companySearchOpen = false;
      this.companySuggestions = [];
      this.companySearchLoading = false;
      this.companySearchError = "";
      this.companyHasSearched = false;
      this.companyLatestSearchTerm = "";
      if (this.companySearchDebounceId) {
        clearTimeout(this.companySearchDebounceId);
        this.companySearchDebounceId = null;
      }
    },

    onCompanySearchChange() {
      const q = (this.companyForm.search || "").trim();
      this.companyForm.companyId = null;
      this.companySearchError = "";
      this.companyHasSearched = false;
      if (this.companySearchDebounceId) {
        clearTimeout(this.companySearchDebounceId);
        this.companySearchDebounceId = null;
      }
      if (q.length < 2) {
        this.companySuggestions = [];
        return;
      }
      this.companySearchOpen = true;
      this.companySearchDebounceId = setTimeout(() => {
        this.fetchCompanySuggestions(q);
      }, 200);
    },

    async fetchCompanySuggestions(term) {
      const normalized = (term || "").trim();
      if (!normalized) {
        this.companySuggestions = [];
        return;
      }
      this.companySearchLoading = true;
      this.companyLatestSearchTerm = normalized;
      try {
        const data = await graphqlRequest(CALC_COMPANIES_QUERY, {
          limit: this.companySearchLimit,
          offset: 0,
          searchExpression: this.buildSearchExpression(normalized),
        });
        if (this.companyLatestSearchTerm !== normalized) return;
        const rows = Array.isArray(data?.calcCompanies)
          ? data.calcCompanies
          : [];
        this.companySuggestions = rows.map((row) =>
          this.normalizeCompany(row)
        );
        this.companyHasSearched = true;
        this.companySearchError = "";
      } catch (error) {
        console.error(error);
        if (this.companyLatestSearchTerm === normalized) {
          this.companySuggestions = [];
          this.companySearchError =
            error?.message || "Failed to search companies.";
          this.companyHasSearched = false;
        }
      } finally {
        if (this.companyLatestSearchTerm === normalized) {
          this.companySearchLoading = false;
        }
      }
    },

    normalizeCompany(row) {
      const name = (row?.Name || "").trim();
      const phone = (row?.Phone || "").trim();
      const address = (row?.Address || "").trim();
      const city = (row?.City || "").trim();
      const state = (row?.State || "").trim();
      const postalCode = (row?.Postal_Code || "").trim();
      const location = [city, state].filter(Boolean).join(", ");
      const labelBase = name || "Unnamed Company";
      const label = location ? `${labelBase} · ${location}` : labelBase;
      return {
        id: row?.ID || null,
        name,
        phone,
        address,
        city,
        state,
        postalCode,
        displayLabel: label,
      };
    },

    pickCompanySuggestion(company) {
      if (!company) return;
      this.companyForm.companyId = company.id || null;
      this.companyForm.search = company.displayLabel || "";
      this.companyForm.name = company.name || "";
      this.companyForm.phone = company.phone || "";
      this.companyForm.address = company.address || "";
      this.companyForm.city = company.city || "";
      this.companyForm.state = company.state || "";
      this.companyForm.postalCode = company.postalCode || "";
      this.closeCompanySearch();
    },

    clearSelectedCompany() {
      this.companyForm.search = "";
      this.companyForm.companyId = null;
      this.companySuggestions = [];
      this.companySearchError = "";
      this.companyHasSearched = false;
    },

    getPrimaryRoleConfig(roleValue = "") {
      const normalized = String(roleValue || "").toLowerCase();
      if (!normalized) return null;
      if (normalized.includes("owner")) {
        return {
          flagField: "primary_owner_contact",
        };
      }
      if (normalized.includes("resident")) {
        return {
          flagField: "primary_resident_contact",
        };
      }
      if (normalized.includes("manager")) {
        return {
          flagField: "primary_property_manager_contact",
        };
      }
      return null;
    },

    validate() {
      if (!this.form.firstName.trim()) return "First name is required.";
      if (!this.form.email.trim()) return "Email is required.";
      // basic email format
      if (!/^\S+@\S+\.\S+$/.test(this.form.email.trim()))
        return "Enter a valid email.";
      return "";
    },

    validateCompany() {
      if (!this.companyForm.name.trim()) return "Company name is required.";
      return "";
    },

    async handleSave() {
      if (this.isSubmitting) return;
      const isCompany = this.contactType === "company";
      const v = isCompany ? this.validateCompany() : this.validate();
      if (v) {
        this.error = v;
        this.toast("error", v);
        return;
      }
      if (!this.propertyId) {
        this.error = "Missing property ID.";
        this.toast("error", this.error);
        return;
      }
      const wasNewContact = !isCompany && !this.form.contactId;
      let createdContactId = null;
      let createdContactPayload = null;

      this.isSubmitting = true;
      this.error = "";

      try {
        if (isCompany) {
          const companyPayload = {
            name: this.companyForm.name.trim(),
            phone: this.companyForm.phone.trim() || null,
            address: this.companyForm.address.trim() || null,
            city: this.companyForm.city.trim() || null,
            state: this.companyForm.state.trim() || null,
            postal_code: this.companyForm.postalCode.trim() || null,
          };

          let companyId = this.companyForm.companyId || null;

          if (companyId) {
            await graphqlRequest(UPDATE_COMPANY_MUTATION, {
              id: companyId,
              payload: companyPayload,
            });
          } else {
            const companyRes = await graphqlRequest(CREATE_COMPANY_MUTATION, {
              payload: companyPayload,
            });
            companyId = companyRes?.createCompany?.id;
            if (!companyId) {
              throw new Error("Failed to create company (no id returned)");
            }
          }

          const normalizedRole = (this.companyForm.role || "").trim() || null;
          const primaryConfig = this.getPrimaryRoleConfig(normalizedRole || "");
          const isPrimary = Boolean(this.companyForm.isPrimary);
          const applyPrimary = Boolean(primaryConfig && isPrimary);

          if (this.form.affiliationId) {
            const affiliationPayload = {
              role: normalizedRole,
              company_id: companyId,
            };
            if (applyPrimary) {
              affiliationPayload[primaryConfig.flagField] = true;
            }
            await graphqlRequest(UPDATE_AFFILIATION_MUTATION, {
              id: this.form.affiliationId,
              payload: affiliationPayload,
            });
          } else {
            const affiliationPayload = {
              company_id: companyId,
              property_id: this.propertyId,
              role: normalizedRole,
            };
            if (applyPrimary) {
              affiliationPayload[primaryConfig.flagField] = true;
            }
            await graphqlRequest(CREATE_AFFILIATION_MUTATION, {
              payload: affiliationPayload,
            });
          }
        } else {
          const payload = {
            first_name: this.form.firstName.trim(),
            last_name: this.form.lastName.trim() || null,
            email: this.form.email.trim(),
            sms_number: this.form.sms.trim() || null,
          };

          let contactId = this.form.contactId || null;

          if (contactId) {
            await graphqlRequest(UPDATE_CONTACT_MUTATION, {
              id: contactId,
              payload,
            });
          } else {
            const contactRes = await graphqlRequest(CREATE_CONTACT_MUTAION, {
              payload,
            });
            contactId = contactRes?.createContact?.id;
            if (!contactId) {
              throw new Error("Failed to create contact (no id returned)");
            }
            if (wasNewContact) {
              createdContactId = contactId;
              createdContactPayload = payload;
            }
          }

          const normalizedRole = (this.form.role || "").trim() || null;
          const primaryConfig = this.getPrimaryRoleConfig(normalizedRole || "");
          const isPrimary = Boolean(this.form.isPrimary);
          const applyPrimary = Boolean(primaryConfig && isPrimary);

          if (this.form.affiliationId) {
            const affiliationPayload = {
              role: normalizedRole,
            };
            if (applyPrimary) {
              affiliationPayload[primaryConfig.flagField] = true;
            }
            await graphqlRequest(UPDATE_AFFILIATION_MUTATION, {
              id: this.form.affiliationId,
              payload: affiliationPayload,
            });
          } else {
            const affiliationPayload = {
              contact_id: contactId,
              property_id: this.propertyId,
              role: normalizedRole,
            };
            if (applyPrimary) {
              affiliationPayload[primaryConfig.flagField] = true;
            }
            await graphqlRequest(CREATE_AFFILIATION_MUTATION, {
              payload: affiliationPayload,
            });
          }
        }

        const successMessage =
          this.form.affiliationId || this.form.contactId
            ? "Property contact updated."
            : "Property contact saved.";

        this.toast("success", successMessage);
        // let the list refresh
        window.dispatchEvent(
          new CustomEvent("propertyContacts:changed", {
            detail: { propertyId: this.propertyId },
          })
        );
        if (wasNewContact && createdContactId) {
          const displayName = [
            createdContactPayload?.first_name,
            createdContactPayload?.last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
          const displayLabel =
            (displayName && createdContactPayload?.email
              ? `${displayName} · ${createdContactPayload.email}`
              : displayName || createdContactPayload?.email) ||
            `Contact #${createdContactId}`;
          window.dispatchEvent(
            new CustomEvent("contact:created", {
              detail: {
                contactId: createdContactId,
                firstName: createdContactPayload?.first_name || "",
                lastName: createdContactPayload?.last_name || "",
                email: createdContactPayload?.email || "",
                displayLabel,
              },
            })
          );
        }
        this.handleClose();
      } catch (e) {
        console.error(e);
        this.error = e?.message || "Failed to save contact.";
        this.toast("error", this.error);
      } finally {
        this.isSubmitting = false;
      }
    },

    handleClose() {
      this.closeSearchDropdown();
      this.open = false;
    },

    toast(type, message) {
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { type, message } })
      );
    },
  }));

  Alpine.data("memosModal", () => ({
    open: false,
    boundOpenListener: null,
    memos: [],
    newMessages: 0,
    lastSeenCount: 0,
    memoText: "",
    memoFile: null,
    isSending: false,
    sendingReplyId: null,
    pendingDelete: null,
    deletingPostId: null,
    deletingCommentId: null,
    socket: null,
    keepAliveTimer: null,
    subscriptionId: `memos-${Date.now()}`,
    init() {
      this.connect();
      this.$watch("open", (value) => {
        if (value) {
          this.lastSeenCount = this.memos.length;
          this.newMessages = 0;
          this.emitBadge();
        }
      });
      this.$watch(
        () => this.memos.length,
        () => this.emitBadge()
      );
      this.$watch("newMessages", () => this.emitBadge());
      this.boundOpenListener = () => {
        this.open = true;
        this.lastSeenCount = this.memos.length;
        this.newMessages = 0;
        this.emitBadge();
      };
      window.addEventListener("memos:open", this.boundOpenListener);
    },
    destroy() {
      this.cleanupSocket();
      if (this.boundOpenListener) {
        window.removeEventListener("memos:open", this.boundOpenListener);
        this.boundOpenListener = null;
      }
    },
    connect() {
      this.cleanupSocket();
      const url = `${GRAPHQL_WS_ENDPOINT}?apiKey=${GRAPHQL_API_KEY}`;
      const ws = new WebSocket(url, "vitalstats");
      ws.onopen = () => {
        this.socket = ws;
        this.sendMessage({ type: "CONNECTION_INIT" });
        this.keepAliveTimer = setInterval(
          () => this.sendMessage({ type: "KEEP_ALIVE" }),
          85000
        );
      };
      ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (e) {
          console.error("Failed to parse websocket message", e);
          return;
        }
        if (!message?.type) return;
        if (message.type === "CONNECTION_ACK") {
          this.startSubscription();
        } else if (message.type === "GQL_DATA") {
          this.handleData(message.payload);
        }
      };
      ws.onclose = () => {
        this.cleanupSocket();
      };
      ws.onerror = (e) => console.error("Websocket error", e);
    },
    cleanupSocket() {
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
      if (this.socket) {
        try {
          this.socket.close();
        } catch (e) {
          // ignore
        }
        this.socket = null;
      }
      this.emitBadge();
    },
    emitBadge() {
      window.dispatchEvent(
        new CustomEvent("memos:badge", {
          detail: { newMessages: this.newMessages },
        })
      );
    },
    sendMessage(message) {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      }
    },
    async uploadFile(file) {
      if (!file) return null;
      const signed = await this.requestSignedUpload(file);
      const uploadResp = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      if (!uploadResp.ok) {
        throw new Error("Failed to upload file.");
      }
      const payload = {
        link: signed.url,
        name: file.name || "Attachment",
        size: file.size ?? null,
        type: file.type || "",
        s3_id: signed.key || "",
      };
      return JSON.stringify(payload);
    },
    async requestSignedUpload(file) {
      const response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": GRAPHQL_API_KEY,
        },
        body: JSON.stringify([
          {
            type: file.type || "application/octet-stream",
            name: file.name || "upload",
            generateName: true,
          },
        ]),
      });
      if (!response.ok) {
        throw new Error("Unable to request upload URL.");
      }
      const payload = await response.json();
      const result = Array.isArray(payload) ? payload[0] : payload;
      if (result?.statusCode && result.statusCode !== 200) {
        throw new Error("Upload endpoint rejected the request.");
      }
      const data = result?.data || result || {};
      if (!data?.uploadUrl || !data?.url) {
        throw new Error("Invalid upload response.");
      }
      return data;
    },
    startSubscription() {
      this.sendMessage({
        id: this.subscriptionId,
        type: "GQL_START",
        payload: {
          query: SUBSCRIBE_FORUM_POSTS,
          variables: {
            relatedinquiryid: INQUIRY_RECORD_ID,
            relatedjobid: JOB_ID,
            limit: 50,
            offset: 0,
          },
        },
      });
    },
    handleData(payload) {
      const data = payload?.data ?? payload;
      const posts = data?.subscribeToForumPosts;
      if (!Array.isArray(posts)) return;
      this.setMemos(posts);
    },
    handleSendReply(detail = {}) {
      const { id, text, onDone } = detail;
      if (!id) return;
      this.sendReply(id, text, onDone);
    },
    handleDeleteComment(detail = {}) {
      const { postId, commentId } = detail || {};
      if (!postId || !commentId) return;
      this.deleteComment(postId, commentId);
    },
    setMemos(posts) {
      const mapped = posts.map((post, idx) => this.mapPost(post, idx));
      const previousSeen = this.lastSeenCount || 0;
      this.memos = mapped;
      if (this.open) {
        this.lastSeenCount = mapped.length;
        this.newMessages = 0;
      } else if (previousSeen === 0 && mapped.length) {
        this.lastSeenCount = mapped.length;
        this.newMessages = 0;
      } else {
        this.newMessages = Math.max(0, mapped.length - previousSeen);
      }
    },
    mapPost(post = {}, idx = 0) {
      const author = post.Author || {};
      const replies = Array.isArray(post.ForumComments)
        ? post.ForumComments
        : [];
      const rawFileValue = post.File || post.file;
      const fileObj = this.parseFileField(rawFileValue);
      const fileLink = fileObj?.link || fileObj?.url || fileObj?.path || null;
      const name =
        author.display_name ||
        [author.first_name, author.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "Unknown";
      return {
        id: post.ID || post.Unique_ID || `memo-${idx}`,
        authorId: author.id != null ? String(author.id) : null,
        isMine: this.isAuthor(author.id),
        text: post.Post_Copy || "",
        timeAgo: this.formatRelativeTime(post.Date_Added),
        file: fileLink || null,
        author: {
          name,
          avatar:
            author.profile_image ||
            "https://placehold.co/40x40?text=User&font=inter",
        },
        replies: replies.map((reply, rIdx) => {
          const rAuthor = reply.Author || {};
          const rName =
            rAuthor.display_name ||
            [rAuthor.first_name, rAuthor.last_name]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            "Unknown";
          return {
            id: reply.id || `${post.ID || idx}-reply-${rIdx}`,
            authorId: rAuthor.id != null ? String(rAuthor.id) : null,
            isMine: this.isAuthor(rAuthor.id),
            text: reply.comment || "",
            timeAgo: this.formatRelativeTime(reply.created_at),
            author: {
              name: rName,
              avatar:
                rAuthor.profile_image ||
                "https://placehold.co/32x32?text=User&font=inter",
            },
          };
        }),
      };
    },
    isAuthor(id) {
      if (id == null) return false;
      return String(id) === String(loggedInUserID);
    },
    parseFileField(value) {
      if (!value) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed || trimmed === "null" || trimmed === "undefined")
          return null;
        try {
          const parsed = JSON.parse(trimmed);
          return this.parseFileField(parsed) || null;
        } catch {
          const link = this.normalizeFileLink(trimmed);
          return link ? { link } : null;
        }
      }
      if (typeof value === "object") {
        const link = this.normalizeFileLink(
          value.link || value.url || value.path || ""
        );
        if (!link) return null;
        return {
          link,
          name: value.name || value.filename || null,
          size: value.size || value.filesize || null,
          type: value.type || value.mime || "",
          s3_id: value.s3_id || value.key || "",
        };
      }
      return null;
    },
    normalizeFileLink(raw = "") {
      if (typeof raw !== "string") return null;
      const trimmed = raw.trim();
      if (!trimmed || trimmed === "null" || trimmed === "undefined")
        return null;
      if (/^\{.*\}$/.test(trimmed)) return null;
      return trimmed;
    },
    requestDeletePost(id) {
      if (!id) return;
      this.pendingDelete = { type: "post", id };
    },
    requestDeleteComment(postId, commentId) {
      if (!postId || !commentId) return;
      this.pendingDelete = { type: "comment", postId, commentId };
    },
    handleDeleteComment(detail = {}) {
      const { postId, commentId } = detail || {};
      if (!postId || !commentId) return;
      this.requestDeleteComment(postId, commentId);
    },
    cancelDelete() {
      this.pendingDelete = null;
    },
    async confirmDelete() {
      const target = this.pendingDelete;
      if (!target) return;
      if (target.type === "post") {
        await this.deletePost(target.id);
      } else if (target.type === "comment") {
        await this.deleteComment(target.postId, target.commentId);
      }
      this.pendingDelete = null;
    },
    formatRelativeTime(value) {
      if (value == null || value === "") return "";
      let ms = null;
      if (typeof value === "number") {
        // supports unix seconds or ms
        ms = value > 1e12 ? value : value * 1000;
      } else {
        const parsed = new Date(value);
        ms = parsed.getTime();
      }
      if (isNaN(ms)) return "";
      const diffMs = Date.now() - ms;
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffMin < 60) return `${diffMin} min ago`;
      if (diffHr < 24) return `${diffHr} hours ago`;
      if (diffDay < 7) return `${diffDay} days ago`;
      return date.toLocaleDateString();
    },
    handleClose() {
      this.open = false;
      this.lastSeenCount = this.memos.length;
      this.newMessages = 0;
    },
    async deletePost(id) {
      if (!id) return;
      this.deletingPostId = id;
      try {
        await graphqlRequest(DELETE_FORUM_POST_MUTATION, { id });
        this.memos = this.memos.filter((m) => m.id !== id);
        this.lastSeenCount = this.memos.length;
        this.emitToast("Memo deleted.");
      } catch (e) {
        console.error("Failed to delete memo", e);
      } finally {
        this.deletingPostId = null;
      }
    },
    async deleteComment(postId, commentId) {
      if (!postId || !commentId) return;
      this.deletingCommentId = commentId;
      try {
        await graphqlRequest(DELETE_FORUM_COMMENT_MUTATION, { id: commentId });
        this.memos = this.memos.map((m) =>
          m.id === postId
            ? {
              ...m,
              replies: (m.replies || []).filter((r) => r.id !== commentId),
            }
            : m
        );
        this.emitToast("Reply deleted.");
      } catch (e) {
        console.error("Failed to delete reply", e);
      } finally {
        this.deletingCommentId = null;
      }
    },
    get isDeleting() {
      return Boolean(this.deletingPostId || this.deletingCommentId);
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    async sendMemo() {
      const text = (this.memoText || "").trim();
      if (!text || this.isSending) return;
      this.isSending = true;
      try {
        let fileData = null;
        if (this.memoFile) {
          try {
            fileData = await this.readFileAsDataUrl(this.memoFile);
          } catch (e) {
            console.error("Failed to read file", e);
          }
        }
        let fileUrl = null;
        if (this.memoFile) {
          try {
            fileUrl = await this.uploadFile(this.memoFile);
          } catch (e) {
            console.error("Failed to upload file", e);
          }
        }
        await graphqlRequest(CREATE_FORUM_POST_MUTATION, {
          payload: {
            author_id: loggedInUserID,
            post_copy: text,
            related_inquiry_id: INQUIRY_RECORD_ID,
            related_job_id: JOB_ID,
            created_at: Math.floor(Date.now() / 1000),
            file: fileUrl,
          },
        });
        this.memoText = "";
        this.memoFile = null;
      } catch (e) {
        console.error("Failed to create memo", e);
      } finally {
        this.isSending = false;
      }
    },
    async sendReply(postId, replyText, onSuccess) {
      const text = (replyText || "").trim();
      if (!text || this.sendingReplyId) return;
      this.sendingReplyId = postId;
      try {
        await graphqlRequest(CREATE_FORUM_COMMENT_MUTATION, {
          payload: {
            forum_post_id: postId,
            author_id: loggedInUserID,
            comment: text,
            created_at: Math.floor(Date.now() / 1000),
          },
        });
        if (typeof onSuccess === "function") onSuccess();
      } catch (e) {
        console.error("Failed to send reply", e);
      } finally {
        this.sendingReplyId = null;
      }
    },
  }));

  Alpine.data("deleteAffiliationModal", () => ({
    open: false,
    isSubmitting: false,
    error: "",
    affiliationId: null,

    init() {
      // Open with: window.dispatchEvent(new CustomEvent('affiliation:delete:open', { detail: { id } }))
      window.addEventListener("affiliation:delete:open", (e) => {
        this.error = "";
        this.isSubmitting = false;
        this.affiliationId = e?.detail?.id ?? null;
        this.open = true;
      });
    },

    async handleDelete() {
      if (this.isSubmitting) return;
      if (!this.affiliationId) {
        this.error = "Missing affiliation ID.";
        return;
      }

      this.isSubmitting = true;
      this.error = "";
      try {
        await graphqlRequest(DELETE_AFFILIATION_QUERY, {
          id: this.affiliationId,
        });
        // notify lists/badges to refresh
        window.dispatchEvent(new CustomEvent("affiliations:changed"));
        this.toast("success", "Contact deleted.");
        this.handleClose();
      } catch (e) {
        console.error(e);
        this.error = e?.message || "Failed to delete contact.";
        this.toast("error", this.error);
      } finally {
        this.isSubmitting = false;
      }
    },

    handleClose() {
      this.open = false;
    },

    toast(type, message) {
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { type, message } })
      );
    },
  }));
});
