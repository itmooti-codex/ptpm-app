// PTPM — Domain Layer
// Repositories, services, and mappers for all domain entities.
// Adapted from z-new-version's Repository + Service + Mapper pattern (IIFE format).
// Exposes window.PtpmDomain with inquiry, job, quote, payment, activeJob services.
(function () {
  'use strict';

  var utils = window.PtpmUtils;

  // ─── Model Cache ───────────────────────────────────────────
  // Each model is fetched once via switchTo() and cached as a promise.
  // Models are resolved lazily — only when a service method is first called
  // (after VitalSync is connected).

  var modelCache = {};

  function getModel(modelName) {
    if (!modelCache[modelName]) {
      var plugin = window.VitalSync.getPlugin();
      if (!plugin) throw new Error('VitalSync not connected — cannot switch to model: ' + modelName);
      var result = plugin.switchTo(modelName);
      // SDK may return model directly or a Promise; normalize to Promise
      modelCache[modelName] = result && typeof result.then === 'function' ? result : Promise.resolve(result);
    }
    return modelCache[modelName];
  }

  // ─── Shared Helpers ────────────────────────────────────────

  function like(s) { return '%' + s + '%'; }

  function getPipe() {
    return window.toMainInstance ? window.toMainInstance(true) : function (x) { return x; };
  }

  var toEpoch = utils.toEpoch;
  var normalizeKeysArray = utils.normalizeKeysArray;
  var formatUnixDate = utils.formatUnixDate;
  var formatDisplayDate = utils.formatDisplayDate;
  function normalizeSortDir(direction) {
    return String(direction || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  }

  function formatUnixToDisplay(unix) {
    return unix ? formatDisplayDate(formatUnixDate(unix)) : null;
  }


  // ═══════════════════════════════════════════════════════════
  // INQUIRY DOMAIN (PeterpmDeal model)
  // ═══════════════════════════════════════════════════════════

  var INQUIRY_MAPPER = {
    id: 'recordId',
    unique_id: 'uniqueId',
    deal_name: 'dealName',
    sales_stage: 'salesStage',
    deal_value: 'dealValue',
    date_added: 'dateAdded',
    created_at: 'dateAdded',
    inquiry_status: 'status',
    type: 'type',
    how_did_you_hear: 'referral',
    how_can_we_help: 'howCanWeHelp',
    admin_notes: 'adminNotes',
    company_name: 'company',
    companyname: 'company',
    company_id: 'companyId',
    company_account_type: 'companyType',
    account_type: 'accountType',
    primary_contact_id: 'contactId',
    primary_contact_first_name: 'clientFirstName',
    primary_contact_last_name: 'clientLastName',
    primary_contact_email: 'clientEmail',
    primary_contact_sms_number: 'clientPhone',
    property_property_name: 'propertyName',
    property_address_1: 'propertyAddress1',
    property_suburb_town: 'propertySuburbTown',
    property_postal_code: 'propertyPostalCode',
    property_state: 'propertyState',
  };

  function mapInquiry(obj) {
    function toDisplayFromUnknown(raw) {
      if (raw == null || raw === '') return null;
      var asNum = Number(raw);
      if (Number.isFinite(asNum)) {
        // Handle milliseconds timestamps too.
        var unix = asNum > 9999999999 ? Math.floor(asNum / 1000) : asNum;
        return formatUnixToDisplay(unix);
      }
      return String(raw);
    }

    var mapped = {};
    for (var key in INQUIRY_MAPPER) {
      if (key === 'created_at' || key === 'date_added') {
        mapped[INQUIRY_MAPPER[key]] = toDisplayFromUnknown(obj[key]);
        continue;
      } else if (key === 'deal_value') {
        mapped[INQUIRY_MAPPER[key]] = obj[key] != null ? Number(obj[key]) : null;
        continue;
      }
      mapped[INQUIRY_MAPPER[key]] = (obj[key] != null) ? obj[key] : null;
    }
    if (!mapped.dateAdded) {
      mapped.dateAdded = toDisplayFromUnknown(
        obj.created_at != null ? obj.created_at :
        (obj.date_added != null ? obj.date_added :
        (obj.createdAt != null ? obj.createdAt :
        (obj.dateAdded != null ? obj.dateAdded : null)))
      );
    }
    return mapped;
  }

  function mapInquiryArray(list) {
    var flat = (list || []).map(function (item) { return mapInquiry(item); });
    return flat.map(function (item) {
      item = item || {};
      var cfg = window.AppConfig || {};
      var clientName = [item.clientFirstName, item.clientLastName].filter(Boolean).join(' ') || '-';
      var contactId = item.contactId != null ? String(item.contactId) : (item.primary_contact_id != null ? String(item.primary_contact_id) : '');
      var companyId = item.companyId != null ? String(item.companyId) : (item.company_id != null ? String(item.company_id) : '');
      var accountType = (item.accountType || item.companyType || '').toString().trim().toLowerCase();
      var companyName = item.company || item.company_name || item.companyname || '';
      var preferCompanyByType = accountType === 'company';
      if (!companyName && companyId && preferCompanyByType) companyName = 'Company #' + companyId;
      var useCompany = !!companyName;
      var customerTpl = cfg.CUSTOMER_DETAIL_URL_TEMPLATE || './customer-detail.html?contact={id}';
      var companyTpl = cfg.COMPANY_DETAIL_URL_TEMPLATE || './company-detail.html?company={id}';
      var contactUrl = contactId ? customerTpl.replace(/\{id\}/g, contactId) : '';
      var companyUrl = companyId ? companyTpl.replace(/\{id\}/g, companyId) : '';
      var propertyLine = [item.propertyAddress1, item.propertySuburbTown, item.propertyState, item.propertyPostalCode]
        .filter(Boolean)
        .join(', ');
      var primaryContact = [item.clientFirstName, item.clientLastName].filter(Boolean).join(' ') || '-';
      return {
        id: item.recordId != null ? '#' + item.recordId : (item.uniqueId ? String(item.uniqueId) : '-'),
        recordId: item.recordId != null ? String(item.recordId) : null,
        uniqueId: item.uniqueId || '-',
        dealName: item.dealName || '-',
        client: useCompany ? companyName : clientName,
        clientSubtext: useCompany ? clientName : '',
        accountType: item.accountType || item.companyType || '-',
        company: companyName || '-',
        companyType: item.companyType || item.accountType || '-',
        primaryContact: primaryContact,
        contactEmail: item.clientEmail || '-',
        contactPhone: item.clientPhone || '-',
        salesStage: item.salesStage || '-',
        dealValue: item.dealValue != null ? item.dealValue : null,
        dateAdded: item.dateAdded || item.created_at || item.date_added || '-',
        type: item.type || '-',
        inquiryStatus: item.status || '-',
        referral: item.referral || '-',
        howCanWeHelp: item.howCanWeHelp || '-',
        adminNotes: item.adminNotes || '-',
        propertyName: item.propertyName || '-',
        propertyAddress: item.propertyAddress1 || '-',
        propertySuburbTown: item.propertySuburbTown || '-',
        propertyState: item.propertyState || '-',
        propertyPostalCode: item.propertyPostalCode || '-',
        meta: {
          address: propertyLine || item.propertyAddress1 || '-',
          email: item.clientEmail || '-',
          sms: item.clientPhone || '-',
          contactId: item.contactId != null ? String(item.contactId) : '',
          companyId: item.companyId != null ? String(item.companyId) : '',
          clientUrl: useCompany ? companyUrl : contactUrl,
          clientSubtextUrl: useCompany ? contactUrl : '',
        },
      };
    });
  }

  var DEFAULT_INQUIRY_PROJECTION = {
    select: ['id', 'unique_id', 'deal_name', 'sales_stage', 'deal_value', 'created_at', 'type', 'account_type', 'inquiry_status', 'how_did_you_hear', 'how_can_we_help', 'admin_notes', 'company_id', 'primary_contact_id'],
    includes: {
      Company: ['id', 'name', 'account_type'],
      Primary_Contact: ['id', 'first_name', 'last_name', 'email', 'sms_number', 'address_1'],
      Property: ['property_name', 'address_1', 'suburb_town', 'postal_code', 'state'],
    },
  };

  function normalizeInquiryProjection(rawProjection) {
    var projection = rawProjection || {};
    var selectSet = { id: true };
    var includeMap = {};
    (Array.isArray(projection.select) ? projection.select : DEFAULT_INQUIRY_PROJECTION.select).forEach(function (f) {
      if (f) selectSet[f] = true;
    });
    var sourceIncludes = projection.includes && typeof projection.includes === 'object'
      ? projection.includes
      : DEFAULT_INQUIRY_PROJECTION.includes;
    Object.keys(sourceIncludes || {}).forEach(function (relation) {
      includeMap[relation] = {};
      var fields = sourceIncludes[relation] || [];
      fields.forEach(function (f) { if (f) includeMap[relation][f] = true; });
    });
    return {
      select: Object.keys(selectSet),
      includes: includeMap,
    };
  }

  // ── Inquiry Repository ──

  function createInquiryRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var calStart = Number.isFinite(Number(f.calendarDateStartEpoch)) ? Number(f.calendarDateStartEpoch) : null;
      var calEnd = Number.isFinite(Number(f.calendarDateEndEpoch)) ? Number(f.calendarDateEndEpoch) : null;
      var inquirySortable = { created_at: true, date_added: true, id: true };
      var sortBy = inquirySortable[f.sortBy] ? f.sortBy : 'id';
      var sortDir = normalizeSortDir(f.sortDirection || 'desc');
      var projection = normalizeInquiryProjection(f.inquiryProjection);

      return getModel('PeterpmDeal').then(function (model) {
        var q = model.query();

        if (f.global && f.global.trim()) {
          var likeVal = like(f.global.trim());
          q = q.andWhere(function (root) {
            root.where('id', 'like', likeVal)
              .orWhere('unique_id', 'like', likeVal)
              .orWhere('deal_name', 'like', likeVal)
              .orWhere('how_can_we_help', 'like', likeVal)
              .orWhere('admin_notes', 'like', likeVal)
              .orWhere('Primary_Contact', function (sub) {
                sub.andWhere(function (g) {
                  g.where('first_name', 'like', likeVal)
                    .orWhere('last_name', 'like', likeVal)
                    .orWhere('email', 'like', likeVal)
                    .orWhere('sms_number', 'like', likeVal);
                });
              })
              .orWhere('Property', function (sub) {
                sub.andWhere(function (g) {
                  g.where('property_name', 'like', likeVal)
                    .orWhere('address_1', 'like', likeVal)
                    .orWhere('suburb_town', 'like', likeVal)
                    .orWhere('postal_code', 'like', likeVal)
                    .orWhere('state', 'like', likeVal);
                });
              })
              .orWhere('Company', function (sub) {
                sub.andWhere(function (g) {
                  g.where('name', 'like', likeVal);
                });
              });
            });
        }

        if (f.source && Array.isArray(f.source) && f.source.length) {
          q = q.where('how_did_you_hear', 'in', f.source);
        }
        if (Array.isArray(f.statuses) && f.statuses.length) {
          q = q.andWhere('inquiry_status', 'in', f.statuses);
        }
        if ((f.accountName && f.accountName.trim()) || (Array.isArray(f.accountTypes) && f.accountTypes.length)) {
          q = q.andWhere('Company', function (sub) {
            if (f.accountName && f.accountName.trim()) sub.where('name', 'like', like(f.accountName));
            if (Array.isArray(f.accountTypes) && f.accountTypes.length) sub.andWhere('account_type', 'in', f.accountTypes);
          });
        }
        if (Array.isArray(f.serviceProviderIds) && f.serviceProviderIds.length) {
          q = q.andWhere('Service_Provider', function (sub) {
            sub.where('id', 'in', f.serviceProviderIds);
          });
        }
        if (f.resident && f.resident.trim()) {
          var likeResident = like(f.resident);
          q = q.andWhere('Primary_Contact', function (sub) {
            sub.where('first_name', 'like', likeResident).orWhere('last_name', 'like', likeResident);
          });
        }
        if (f.address && f.address.trim()) {
          q = q.andWhere('Property', function (sub) {
            sub.where('address_1', 'like', like(f.address));
          });
        }
        if (startEpoch != null || endEpoch != null) {
          q = q.andWhere(function (sub) {
            if (startEpoch != null) sub.andWhere('date_quoted_accepted', '>=', startEpoch);
            if (endEpoch != null) sub.andWhere('quote_valid_until', '<=', endEpoch);
          });
        }
        if (calStart != null || calEnd != null) {
          q = q.andWhere(function (sub) {
            if (calStart != null) sub.andWhere('created_at', '>=', calStart);
            if (calEnd != null) sub.andWhere('created_at', '<=', calEnd);
          });
        }

        q = q.orderBy(sortBy, sortDir)
          .deSelectAll()
          .select(projection.select)
          .noDestroy();

        if (projection.includes.Company && Object.keys(projection.includes.Company).length) {
          q = q.include('Company', function (sub) { sub.deSelectAll().select(Object.keys(projection.includes.Company)); });
        }
        if (projection.includes.Primary_Contact && Object.keys(projection.includes.Primary_Contact).length) {
          q = q.include('Primary_Contact', function (sub) { sub.deSelectAll().select(Object.keys(projection.includes.Primary_Contact)); });
        }
        if (projection.includes.Property && Object.keys(projection.includes.Property).length) {
          q = q.include('Property', function (sub) { sub.deSelectAll().select(Object.keys(projection.includes.Property)); });
        }

        lastQuery = q;
        return q;
      });
    }

    return {
      fetchInquiries: function (opts) {
        var filters = opts.filters;
        var limit = opts.limit;
        var offset = opts.offset;
        return buildQuery(filters).then(function (q) {
          q.getOrInitQueryCalc();
          return q.fetchDirect({ variables: { limit: limit, offset: offset } })
            .pipe(getPipe())
            .toPromise()
            .then(function (rows) { return (rows && rows.resp) || []; });
        });
      },
      countInquiries: function (filters) {
        var p = lastQuery ? Promise.resolve(lastQuery) : buildQuery(filters);
        return p.then(function (q) {
          var countQ = q.deSelectAll().noDestroy();
          return countQ.fetchDirect().toPromise()
            .then(function (res) { return (res && res.resp && res.resp.length) || 0; });
        });
      },
    };
  }

  // ── Inquiry Service ──

  function createInquiryService() {
    var repo = null;
    function ensureRepo() {
      if (!repo) repo = createInquiryRepo();
      return repo;
    }

    return {
      fetchInquiries: function (opts) {
        var r = ensureRepo();
        return r.fetchInquiries(opts).then(function (rows) {
          return r.countInquiries(opts.filters).then(function (totalCount) {
            var prepared = (rows || []).map(function (row) {
              if (row && typeof row.getState === 'function') {
                try { return row.getState(); } catch (_) { return row; }
              }
              return row;
            });
            var normalized = normalizeKeysArray(prepared);
            var mapped = mapInquiryArray(normalized);
            return { rows: mapped, totalCount: totalCount, totalPages: Math.ceil(totalCount / opts.limit) };
          });
        });
      },
    };
  }


  // ═══════════════════════════════════════════════════════════
  // JOB DOMAIN (PeterpmJob model)
  // ═══════════════════════════════════════════════════════════

  var JOB_MAPPER = {
    id: 'recordId',
    admin_recommendation: 'recommendation',
    created_at: 'dateAdded',
    unique_id: 'id',
    client_entity_name: 'companyName',
    client_entity_type: 'companyType',
    client_individual_email: 'client_email',
    client_individual_first_name: 'client_firstName',
    client_individual_last_name: 'client_lastName',
    client_individual_sms_number: 'client_phone',
    contact_first_name: 'serviceman_firstName',
    contact_last_name: 'serviceman_lastName',
    date_booked: 'dateBooked',
    date_scheduled: 'dateScheduled',
    quote_date: 'quoteDate',
    date_quoted_accepted: 'dateQuotedAccepted',
    date_started: 'dateStarted',
    inquiry_record_how_did_you_hear: 'referral',
    inquiry_record_inquiry_status: 'status',
    inquiry_record_type: 'type',
    invoice_date: 'invoiceDate',
    invoice_total: 'invoiceTotal',
    invoice_number: 'invoiceNumber',
    job_status: 'jobStatus',
    job_total: 'jobTotal',
    payment_status: 'paymentStatus',
    priority: 'priority',
    quote_status: 'quoteStatus',
    quote_total: 'quoteTotal',
    property_address_1: 'streetSuburb',
    property_property_name: 'address',
    service_service_name: 'service',
  };

  var JOB_DATE_FIELDS = {
    created_at: true,
    date_booked: true,
    date_scheduled: true,
    quote_date: true,
    date_quoted_accepted: true,
    date_started: true,
    invoice_date: true,
  };

  function mapJob(obj) {
    obj = obj || {};
    var mapped = {};
    for (var key in JOB_MAPPER) {
      if (JOB_DATE_FIELDS[key]) {
        mapped[JOB_MAPPER[key]] = formatUnixToDisplay(obj[key]);
        continue;
      }
      mapped[JOB_MAPPER[key]] = (obj[key] != null) ? obj[key] : null;
    }
    return mapped;
  }

  function mapJobArray(list) {
    var flat = (list || []).map(function (item) { return mapJob(item); });
    return flat.map(function (item) {
      item = item || {};
      var firstName = item.client_firstName || '';
      var lastName = item.client_lastName || '';
      return {
        id: item.id ? '#' + item.id : null,
        recordId: item.recordId != null ? String(item.recordId) : null,
        client: (firstName + ' ' + lastName).trim() || null,
        startDate: item.dateStarted || null,
        scheduledDate: item.dateScheduled || null,
        dateAdded: item.dateAdded || null,
        priority: item.priority || null,
        quoteDate: item.quoteDate || null,
        quoteAmount: item.quoteTotal || null,
        quoteStatus: item.quoteStatus || null,
        invoiceNumber: item.invoiceNumber || null,
        invoiceDate: item.invoiceDate || null,
        invoiceAmount: item.invoiceTotal || null,
        recommendation: item.recommendation || null,
        service: item.service || null,
        paymentStatus: item.paymentStatus || null,
        jobRequiredBy: item.dateJobRequiredBy || null,
        bookedDate: item.dateBooked || null,
        jobTotal: item.jobTotal || null,
        jobStatus: item.jobStatus || 'Unknown',
        meta: {
          email: item.client_email || null,
          sms: item.client_phone || null,
          address: item.streetSuburb || item.address || null,
          accountName: item.companyName || null,
          servicemanFirstName: item.serviceman_firstName || null,
          servicemanLastName: item.serviceman_lastName || null,
        },
      };
    });
  }

  var DEFAULT_JOB_PROJECTION = {
    select: [
      'id', 'unique_id', 'priority', 'created_at', 'date_started', 'date_scheduled', 'date_job_required_by',
      'date_booked', 'quote_date', 'quote_total', 'quote_status', 'payment_status', 'job_status',
      'job_total', 'invoice_number', 'invoice_date', 'invoice_total', 'admin_recommendation',
      'date_quoted_accepted',
    ],
    includes: {
      Client_Individual: ['first_name', 'last_name', 'email', 'sms_number', 'address_1'],
      Property: ['property_name', 'address_1'],
      Primary_Service_Provider: ['first_name', 'last_name'],
      Client_Entity: ['name', 'type'],
      Inquiry_Record: ['inquiry_status', 'type', 'how_did_you_hear', 'service_name'],
    },
  };

  function normalizeJobProjection(rawProjection) {
    var projection = rawProjection || {};
    var selectSet = {};
    var includeMap = {};
    (Array.isArray(projection.select) ? projection.select : DEFAULT_JOB_PROJECTION.select).forEach(function (f) {
      if (f) selectSet[f] = true;
    });
    var sourceIncludes = projection.includes && typeof projection.includes === 'object'
      ? projection.includes
      : DEFAULT_JOB_PROJECTION.includes;
    Object.keys(sourceIncludes || {}).forEach(function (relation) {
      includeMap[relation] = {};
      (sourceIncludes[relation] || []).forEach(function (f) {
        if (f) includeMap[relation][f] = true;
      });
    });
    return { select: Object.keys(selectSet), includes: includeMap };
  }

  // ── Job Repository ──

  function createJobRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var calStart = Number.isFinite(Number(f.calendarDateStartEpoch)) ? Number(f.calendarDateStartEpoch) : null;
      var calEnd = Number.isFinite(Number(f.calendarDateEndEpoch)) ? Number(f.calendarDateEndEpoch) : null;
      var minPrice = f.minPrice;
      var maxPrice = f.maxPrice;
      var jobSortable = {
        created_at: true, date_started: true, date_booked: true, date_scheduled: true,
        quote_date: true, date_quoted_accepted: true, invoice_date: true,
      };
      var sortBy = jobSortable[f.sortBy] ? f.sortBy : null;
      var sortDir = normalizeSortDir(f.sortDirection || 'desc');
      var projection = normalizeJobProjection(f.jobProjection);

      return getModel('PeterpmJob').then(function (model) {
        var q = model.query();
        var urgentCallsField = (window.AppConfig && window.AppConfig.JOBS_TO_CHECK_URGENT_FIELD) || 'Urgent_Calls';

        if (f.jobPreset === 'jobs-to-check') {
          q = q.andWhere(function (group) {
            group.where('job_status', '=', 'Call Back')
              .orWhere('priority', '=', 'High')
              .orWhere(urgentCallsField, '>', 0);
          });
        }
        if (f.jobPreset === 'show-active-jobs') {
          q = q.andWhereNot('job_status', 'completed')
            .andWhereNot('job_status', 'cancelled');
        }
        if (f.urgentOnly) {
          q = q.andWhere(urgentCallsField, '>', 0);
        }

        if (Array.isArray(f.statuses) && f.statuses.length) {
          q = q.andWhere('job_status', 'in', f.statuses);
        }
        if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('account_name', 'in', f.serviceProviders);
          });
        }
        if (Array.isArray(f.serviceProviderIds) && f.serviceProviderIds.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('id', 'in', f.serviceProviderIds);
          });
        }
        if (f.serviceman && String(f.serviceman).trim()) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.andWhere('account_name', 'like', like(String(f.serviceman).trim()));
          });
        }
        if (minPrice != null) q = q.andWhere('quote_total', '>=', minPrice);
        if (maxPrice != null) q = q.andWhere('quote_total', '<=', maxPrice);
        if (f.quoteNumber) q = q.andWhere('unique_id', 'like', like(f.quoteNumber));
        if (f.invoiceNumber) q = q.andWhere('invoice_number', 'like', like(f.invoiceNumber));
        if (f.recommendation) q = q.andWhere('admin_recommendation', 'like', like(f.recommendation));

        if (startEpoch != null || endEpoch != null) {
          q = q.andWhere(function (sub) {
            if (startEpoch != null) sub.andWhere('date_scheduled', '>=', startEpoch);
            if (endEpoch != null) sub.andWhere('date_scheduled', '<=', endEpoch);
          });
        }
        if (calStart != null || calEnd != null) {
          q = q.andWhere(function (sub) {
            if (calStart != null) sub.andWhere('date_booked', '>=', calStart);
            if (calEnd != null) sub.andWhere('date_booked', '<=', calEnd);
          });
        }
        if (f.resident) {
          var likeResident = like(f.resident);
          q = q.andWhere('Client_Individual', function (sub) {
            sub.where('first_name', 'like', likeResident).orWhere('last_name', 'like', likeResident);
          });
        }
        if (f.address) {
          q = q.andWhere('Property', function (sub) {
            sub.andWhere('property_name', 'like', like(f.address));
          });
        }
        if (f.global && f.global.trim()) {
          var likeVal = like(f.global.trim());
          q = q.andWhere('Client_Individual', function (sub) {
            sub.andWhere(function (g) {
              g.where('first_name', 'like', likeVal)
                .orWhere('last_name', 'like', likeVal)
                .orWhere('email', 'like', likeVal)
                .orWhere('sms_number', 'like', likeVal);
            });
          });
        }
        if (f.accountName || (Array.isArray(f.accountTypes) && f.accountTypes.length)) {
          q = q.andWhere('Client_Entity', function (sub) {
            if (f.accountName) sub.andWhere('name', 'like', like(f.accountName));
            if (Array.isArray(f.accountTypes) && f.accountTypes.length) sub.andWhere('type', 'in', f.accountTypes);
          });
        }
        // FIX: z-new-version had `this.quoteQuery` here — should be job query (q)
        if (f.source && f.source.length) {
          q = q.andWhere('Inquiry_Record', function (sub) {
            sub.andWhere('how_did_you_hear', 'in', f.source);
          });
        }

        q = q.andWhereNot('job_status', 'isNull');
        if (sortBy) q = q.orderBy(sortBy, sortDir);
        q = q
          .deSelectAll()
          .select(projection.select)
          .noDestroy();

        if (projection.includes.Client_Individual && Object.keys(projection.includes.Client_Individual).length) {
          q = q.include('Client_Individual', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Client_Individual));
          });
        }
        if (projection.includes.Property && Object.keys(projection.includes.Property).length) {
          q = q.include('Property', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Property));
          });
        }
        if (projection.includes.Primary_Service_Provider && Object.keys(projection.includes.Primary_Service_Provider).length) {
          q = q.include('Primary_Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(Object.keys(projection.includes.Primary_Service_Provider));
            });
          });
        }
        if (projection.includes.Client_Entity && Object.keys(projection.includes.Client_Entity).length) {
          q = q.include('Client_Entity', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Client_Entity));
          });
        }
        if (projection.includes.Inquiry_Record && Object.keys(projection.includes.Inquiry_Record).length) {
          var inquiryFields = Object.keys(projection.includes.Inquiry_Record).filter(function (fName) {
            return fName !== 'service_name';
          });
          q = q.include('Inquiry_Record', function (sub) {
            sub.deSelectAll();
            if (inquiryFields.length) sub.select(inquiryFields);
            if (projection.includes.Inquiry_Record.service_name) {
              sub.include('Service_Inquiry', function (d) { d.deSelectAll().select(['service_name']); });
            }
          });
        }

        lastQuery = q;
        return q;
      });
    }

    return {
      fetchJobs: function (filters, limit, offset) {
        return buildQuery(filters).then(function (q) {
          q.getOrInitQueryCalc();
          return q.fetchDirect({ variables: { limit: limit, offset: offset } })
            .pipe(getPipe())
            .toPromise()
            .then(function (rows) { return (rows && rows.resp) || []; });
        });
      },
      countJobs: function (filters) {
        var p = lastQuery ? Promise.resolve(lastQuery) : buildQuery(filters);
        return p.then(function (q) {
          var countQ = q.deSelectAll().noDestroy();
          return countQ.fetchDirect().toPromise()
            .then(function (res) { return (res && res.resp && res.resp.length) || 0; });
        });
      },
    };
  }

  // ── Job Service ──

  function createJobService() {
    var repo = null;
    function ensureRepo() {
      if (!repo) repo = createJobRepo();
      return repo;
    }

    return {
      fetchJobs: function (filters, limit, offset) {
        var r = ensureRepo();
        return r.fetchJobs(filters, limit, offset).then(function (rows) {
          return r.countJobs(filters).then(function (totalCount) {
            var normalized = normalizeKeysArray(rows);
            var mapped = mapJobArray(normalized);
            return { rows: mapped, totalCount: totalCount, totalPages: Math.ceil(totalCount / limit) };
          });
        });
      },
    };
  }


  // ═══════════════════════════════════════════════════════════
  // QUOTE DOMAIN (PeterpmJob model — quotes live on Job)
  // ═══════════════════════════════════════════════════════════

  var QUOTE_MAPPER = {
    id: 'recordId',
    unique_id: 'id',
    client_individual_first_name: 'client_firstName',
    client_individual_last_name: 'client_lastName',
    client_individual_email: 'client_email',
    client_individual_sms_number: 'client_phone',
    date_quoted_accepted: 'dateQuotedAccepted',
    quote_date: 'quoteDate',
    service_service_name: 'service',
    quote_total: 'quoteTotal',
    quote_status: 'quoteStatus',
    property_property_name: 'address',
  };

  var QUOTE_DATE_FIELDS = { date_quoted_accepted: true, quote_date: true };

  function mapQuote(obj) {
    obj = obj || {};
    var mapped = {};
    for (var key in QUOTE_MAPPER) {
      if (QUOTE_DATE_FIELDS[key]) {
        mapped[QUOTE_MAPPER[key]] = formatUnixToDisplay(obj[key]);
        continue;
      }
      if (key === 'quote_total') {
        mapped[QUOTE_MAPPER[key]] = obj[key] != null ? Number(obj[key]) : 0;
        continue;
      }
      mapped[QUOTE_MAPPER[key]] = (obj[key] != null) ? obj[key] : null;
    }
    return mapped;
  }

  function mapQuoteArray(list) {
    var flat = (list || []).map(function (item) { return mapQuote(item); });
    return flat.map(function (item) {
      item = item || {};
      var firstName = item.client_firstName || '';
      var lastName = item.client_lastName || '';
      return {
        id: item.id ? '#' + item.id : null,
        recordId: item.recordId != null ? String(item.recordId) : null,
        client: (firstName + ' ' + lastName).trim() || null,
        dateQuotedAccepted: item.dateQuotedAccepted || null,
        service: item.service || null,
        quoteDate: item.quoteDate || null,
        quoteTotal: item.quoteTotal || 0,
        quoteStatus: item.quoteStatus || 'Unknown',
        meta: {
          email: item.client_email || null,
          sms: item.client_phone || null,
          address: item.address || null,
        },
      };
    });
  }

  var DEFAULT_QUOTE_PROJECTION = {
    select: ['id', 'unique_id', 'quote_status', 'quote_total', 'date_quoted_accepted', 'quote_valid_until', 'invoice_number', 'created_at', 'quote_date'],
    includes: {
      Client_Individual: ['first_name', 'last_name', 'email', 'sms_number', 'address_1'],
      Property: ['property_name'],
      Primary_Service_Provider: ['first_name', 'last_name'],
      Client_Entity: ['name', 'type'],
      Inquiry_Record: ['type', 'how_did_you_hear', 'service_name'],
    },
  };

  function normalizeQuoteProjection(rawProjection) {
    var projection = rawProjection || {};
    var selectSet = {};
    var includeMap = {};
    (Array.isArray(projection.select) ? projection.select : DEFAULT_QUOTE_PROJECTION.select).forEach(function (f) {
      if (f) selectSet[f] = true;
    });
    var sourceIncludes = projection.includes && typeof projection.includes === 'object'
      ? projection.includes
      : DEFAULT_QUOTE_PROJECTION.includes;
    Object.keys(sourceIncludes || {}).forEach(function (relation) {
      includeMap[relation] = {};
      (sourceIncludes[relation] || []).forEach(function (f) { if (f) includeMap[relation][f] = true; });
    });
    return { select: Object.keys(selectSet), includes: includeMap };
  }

  // ── Quote Repository ──

  function createQuoteRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var calStart = Number.isFinite(Number(f.calendarDateStartEpoch)) ? Number(f.calendarDateStartEpoch) : null;
      var calEnd = Number.isFinite(Number(f.calendarDateEndEpoch)) ? Number(f.calendarDateEndEpoch) : null;
      var minPrice = f.minPrice;
      var maxPrice = f.maxPrice;
      var quoteSortable = { date_quoted_accepted: true, quote_date: true, created_at: true };
      var sortBy = quoteSortable[f.sortBy] ? f.sortBy : null;
      var sortDir = normalizeSortDir(f.sortDirection || 'desc');
      var projection = normalizeQuoteProjection(f.quoteProjection);

      return getModel('PeterpmJob').then(function (model) {
        var q = model.query();

        if (Array.isArray(f.statuses) && f.statuses.length) {
          q = q.andWhere('quote_status', 'in', f.statuses);
        }
        if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('account_name', 'in', f.serviceProviders);
          });
        }
        if (Array.isArray(f.serviceProviderIds) && f.serviceProviderIds.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('id', 'in', f.serviceProviderIds);
          });
        }
        if (f.serviceman && String(f.serviceman).trim()) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.andWhere('account_name', 'like', like(String(f.serviceman).trim()));
          });
        }
        if (minPrice != null) q = q.andWhere('quote_total', '>=', minPrice);
        if (maxPrice != null) q = q.andWhere('quote_total', '<=', maxPrice);
        if (f.quoteNumber) q = q.andWhere('unique_id', 'like', like(f.quoteNumber));
        if (f.invoiceNumber) q = q.andWhere('invoice_number', 'like', like(f.invoiceNumber));
        if (f.recommendation) q = q.andWhere('admin_recommendation', 'like', like(f.recommendation));

        if (startEpoch != null || endEpoch != null) {
          q = q.andWhere(function (sub) {
            if (startEpoch != null) sub.andWhere('date_quoted_accepted', '>=', startEpoch);
            if (endEpoch != null) sub.andWhere('date_quoted_accepted', '<=', endEpoch);
          });
        }
        if (calStart != null || calEnd != null) {
          q = q.andWhere(function (sub) {
            if (calStart != null) sub.andWhere('quote_date', '>=', calStart);
            if (calEnd != null) sub.andWhere('quote_date', '<=', calEnd);
          });
        }
        if (f.resident) {
          var likeResident = like(f.resident);
          q = q.andWhere('Client_Individual', function (sub) {
            sub.where('first_name', 'like', likeResident).orWhere('last_name', 'like', likeResident);
          });
        }
        if (f.address) {
          q = q.andWhere('Property', function (sub) {
            sub.andWhere('property_name', 'like', like(f.address));
          });
        }
        if (f.global && f.global.trim()) {
          var likeVal = like(f.global.trim());
          q = q.andWhere('Client_Individual', function (sub) {
            sub.andWhere(function (g) {
              g.where('first_name', 'like', likeVal)
                .orWhere('last_name', 'like', likeVal)
                .orWhere('email', 'like', likeVal)
                .orWhere('sms_number', 'like', likeVal);
            });
          });
        }
        if (f.accountName || (Array.isArray(f.accountTypes) && f.accountTypes.length)) {
          q = q.andWhere('Client_Entity', function (sub) {
            if (f.accountName) sub.andWhere('name', 'like', like(f.accountName));
            if (Array.isArray(f.accountTypes) && f.accountTypes.length) sub.andWhere('type', 'in', f.accountTypes);
          });
        }
        if (Array.isArray(f.source) && f.source.length) {
          q = q.andWhere('Inquiry_Record', function (sub) {
            sub.andWhere('how_did_you_hear', 'in', f.source);
          });
        }

        q = q.andWhereNot('quote_status', 'isNull');
        if (sortBy) q = q.orderBy(sortBy, sortDir);
        q = q
          .deSelectAll()
          .select(projection.select)
          .noDestroy();

        if (projection.includes.Client_Individual && Object.keys(projection.includes.Client_Individual).length) {
          q = q.include('Client_Individual', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Client_Individual));
          });
        }
        if (projection.includes.Property && Object.keys(projection.includes.Property).length) {
          q = q.include('Property', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Property));
          });
        }
        if (projection.includes.Primary_Service_Provider && Object.keys(projection.includes.Primary_Service_Provider).length) {
          q = q.include('Primary_Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(Object.keys(projection.includes.Primary_Service_Provider));
            });
          });
        }
        if (projection.includes.Client_Entity && Object.keys(projection.includes.Client_Entity).length) {
          q = q.include('Client_Entity', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Client_Entity));
          });
        }
        if (projection.includes.Inquiry_Record && Object.keys(projection.includes.Inquiry_Record).length) {
          var inquiryFields = Object.keys(projection.includes.Inquiry_Record).filter(function (fName) {
            return fName !== 'service_name';
          });
          q = q.include('Inquiry_Record', function (sub) {
            sub.deSelectAll();
            if (inquiryFields.length) sub.select(inquiryFields);
            if (projection.includes.Inquiry_Record.service_name) {
              sub.include('Service_Inquiry', function (d) { d.deSelectAll().select(['service_name']); });
            }
          });
        }

        lastQuery = q;
        return q;
      });
    }

    return {
      fetchQuotes: function (filters, limit, offset) {
        return buildQuery(filters).then(function (q) {
          q.getOrInitQueryCalc();
          return q.fetchDirect({ variables: { limit: limit, offset: offset } })
            .pipe(getPipe())
            .toPromise()
            .then(function (rows) { return (rows && rows.resp) || []; });
        });
      },
      countQuotes: function (filters) {
        var p = lastQuery ? Promise.resolve(lastQuery) : buildQuery(filters);
        return p.then(function (q) {
          var countQ = q.deSelectAll().noDestroy();
          return countQ.fetchDirect().toPromise()
            .then(function (res) { return (res && res.resp && res.resp.length) || 0; });
        });
      },
    };
  }

  // ── Quote Service ──

  function createQuoteService() {
    var repo = null;
    function ensureRepo() {
      if (!repo) repo = createQuoteRepo();
      return repo;
    }

    return {
      fetchQuotes: function (filters, limit, offset) {
        var r = ensureRepo();
        return r.fetchQuotes(filters, limit, offset).then(function (rows) {
          return r.countQuotes(filters).then(function (totalCount) {
            var normalized = normalizeKeysArray(rows);
            var mapped = mapQuoteArray(normalized);
            return { rows: mapped, totalCount: totalCount, totalPages: Math.ceil(totalCount / limit) };
          });
        });
      },
    };
  }


  // ═══════════════════════════════════════════════════════════
  // PAYMENT DOMAIN (PeterpmJob model — payments live on Job)
  // ═══════════════════════════════════════════════════════════

  var PAYMENT_MAPPER = {
    id: 'recordId',
    unique_id: 'id',
    client_individual_first_name: 'client_firstName',
    client_individual_last_name: 'client_lastName',
    client_individual_email: 'client_email',
    client_individual_sms_number: 'client_phone',
    invoice_number: 'invoiceNumber',
    payment_status: 'paymentStatus',
    invoice_date: 'invoiceDate',
    due_date: 'dueDate',
    bill_time_paid: 'billPaidDate',
    invoice_total: 'invoiceTotal',
    xero_invoice_status: 'xeroInvoiceStatus',
    bill_approved_service_provider: 'serviceApproved',
    bill_approved_admin: 'adminApproved',
    property_property_name: 'address',
  };

  var PAYMENT_DATE_FIELDS = { invoice_date: true, due_date: true, bill_time_paid: true };

  function mapPayment(obj) {
    obj = obj || {};
    var mapped = {};
    for (var key in PAYMENT_MAPPER) {
      if (PAYMENT_DATE_FIELDS[key]) {
        mapped[PAYMENT_MAPPER[key]] = formatUnixToDisplay(obj[key]);
        continue;
      }
      if (key === 'invoice_total') {
        mapped[PAYMENT_MAPPER[key]] = obj[key] != null ? Number(obj[key]) : 0;
        continue;
      }
      mapped[PAYMENT_MAPPER[key]] = (obj[key] != null) ? obj[key] : null;
    }
    return mapped;
  }

  function mapPaymentArray(list) {
    var flat = (list || []).map(function (item) { return mapPayment(item); });
    return flat.map(function (item) {
      item = item || {};
      var firstName = item.client_firstName || '';
      var lastName = item.client_lastName || '';
      return {
        id: item.id ? '#' + item.id : null,
        recordId: item.recordId != null ? String(item.recordId) : null,
        client: (firstName + ' ' + lastName).trim() || null,
        invoiceNumber: item.invoiceNumber || null,
        paymentStatus: item.paymentStatus || 'Unknown',
        invoiceDate: item.invoiceDate || null,
        dueDate: item.dueDate || null,
        invoiceTotal: item.invoiceTotal || 0,
        billPaidDate: item.billPaidDate || null,
        xeroInvoiceStatus: item.xeroInvoiceStatus || null,
        serviceApproved: item.serviceApproved || null,
        adminApproved: item.adminApproved || null,
        meta: {
          email: item.client_email || null,
          sms: item.client_phone || null,
          address: item.address || null,
        },
      };
    });
  }

  var DEFAULT_PAYMENT_PROJECTION = {
    select: [
      'id', 'unique_id', 'invoice_number', 'payment_status', 'invoice_date', 'due_date', 'invoice_total',
      'bill_time_paid', 'bill_approved_admin', 'bill_approved_service_provider2', 'xero_invoice_status',
    ],
    includes: {
      Client_Individual: ['first_name', 'last_name', 'email', 'sms_number', 'address_1'],
      Property: ['property_name'],
      Primary_Service_Provider: ['first_name', 'last_name'],
      Client_Entity: ['name', 'type'],
      Inquiry_Record: ['inquiry_status', 'type', 'how_did_you_hear', 'service_name'],
    },
  };

  function normalizePaymentProjection(rawProjection) {
    var projection = rawProjection || {};
    var selectSet = {};
    var includeMap = {};
    (Array.isArray(projection.select) ? projection.select : DEFAULT_PAYMENT_PROJECTION.select).forEach(function (f) {
      if (f) selectSet[f] = true;
    });
    var sourceIncludes = projection.includes && typeof projection.includes === 'object'
      ? projection.includes
      : DEFAULT_PAYMENT_PROJECTION.includes;
    Object.keys(sourceIncludes || {}).forEach(function (relation) {
      includeMap[relation] = {};
      (sourceIncludes[relation] || []).forEach(function (f) { if (f) includeMap[relation][f] = true; });
    });
    return { select: Object.keys(selectSet), includes: includeMap };
  }

  // ── Payment Repository ──

  function createPaymentRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var calStart = Number.isFinite(Number(f.calendarDateStartEpoch)) ? Number(f.calendarDateStartEpoch) : null;
      var calEnd = Number.isFinite(Number(f.calendarDateEndEpoch)) ? Number(f.calendarDateEndEpoch) : null;
      var minPrice = f.minAmount;
      var maxPrice = f.maxAmount;
      var paymentSortable = { invoice_date: true, due_date: true, bill_time_paid: true, created_at: true };
      var sortBy = paymentSortable[f.sortBy] ? f.sortBy : null;
      var sortDir = normalizeSortDir(f.sortDirection || 'desc');
      var projection = normalizePaymentProjection(f.paymentProjection);

      return getModel('PeterpmJob').then(function (model) {
        var q = model.query();
        var partPaymentField = (window.AppConfig && window.AppConfig.PART_PAYMENT_FIELD) || 'Part_Payment_Made';

        if (f.paymentPreset === 'list-unpaid-invoices') {
          q = q.andWhere(function (group) {
            group.where('job_status', '=', 'Waiting For Payment')
              .orWhere('payment_status', '=', 'Invoice Sent')
              .orWhere('payment_status', '=', 'Overdue');
          });
        }
        if (f.paymentPreset === 'list-part-payments') {
          q = q.andWhere(partPaymentField, '>', 0)
            .andWhere(function (group) {
              group.where('payment_status', '=', 'Invoice Sent')
                .orWhere('payment_status', '=', 'Overdue');
            });
        }

        if (f.global && f.global.trim()) {
          var likeVal = like(f.global.trim());
          q = q.andWhere('Client_Individual', function (sub) {
            sub.andWhere(function (g) {
              g.where('first_name', 'like', likeVal)
                .orWhere('last_name', 'like', likeVal)
                .orWhere('email', 'like', likeVal)
                .orWhere('sms_number', 'like', likeVal);
            });
          });
        }
        if (Array.isArray(f.statuses) && f.statuses.length) {
          q = q.andWhere('payment_status', 'in', f.statuses);
        }
        if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('account_name', 'in', f.serviceProviders);
          });
        }
        if (Array.isArray(f.serviceProviderIds) && f.serviceProviderIds.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('id', 'in', f.serviceProviderIds);
          });
        }
        if (f.serviceman && String(f.serviceman).trim()) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.andWhere('account_name', 'like', like(String(f.serviceman).trim()));
          });
        }
        if (minPrice != null) q = q.andWhere('quote_total', '>=', minPrice);
        if (maxPrice != null) q = q.andWhere('quote_total', '<=', maxPrice);
        if (f.quoteNumber) q = q.andWhere('unique_id', 'like', like(f.quoteNumber));
        if (f.invoiceNumber) q = q.andWhere('invoice_number', 'like', like(f.invoiceNumber));
        if (f.recommendation) q = q.andWhere('admin_recommendation', 'like', like(f.recommendation));

        if (startEpoch != null || endEpoch != null) {
          q = q.andWhere(function (sub) {
            if (startEpoch != null) sub.andWhere('invoice_date', '>=', startEpoch);
            if (endEpoch != null) sub.andWhere('invoice_date', '<=', endEpoch);
          });
        }
        if (calStart != null || calEnd != null) {
          q = q.andWhere(function (sub) {
            if (calStart != null) sub.andWhere('invoice_date', '>=', calStart);
            if (calEnd != null) sub.andWhere('invoice_date', '<=', calEnd);
          });
        }
        if (f.resident) {
          var likeResident = like(f.resident);
          q = q.andWhere('Client_Individual', function (sub) {
            sub.where('first_name', 'like', likeResident).orWhere('last_name', 'like', likeResident);
          });
        }
        if (f.address) {
          q = q.andWhere('Property', function (sub) {
            sub.andWhere('property_name', 'like', like(f.address));
          });
        }
        if (f.accountName || (Array.isArray(f.accountTypes) && f.accountTypes.length)) {
          q = q.andWhere('Client_Entity', function (sub) {
            if (f.accountName) sub.andWhere('name', 'like', like(f.accountName));
            if (Array.isArray(f.accountTypes) && f.accountTypes.length) sub.andWhere('type', 'in', f.accountTypes);
          });
        }
        if (f.source && f.source.length) {
          q = q.andWhere('Inquiry_Record', function (sub) {
            sub.andWhere('how_did_you_hear', 'in', f.source);
          });
        }

        q = q.andWhereNot('xero_invoice_status', 'isNull');
        if (sortBy) q = q.orderBy(sortBy, sortDir);
        q = q
          .deSelectAll()
          .select(projection.select)
          .noDestroy();

        if (projection.includes.Client_Individual && Object.keys(projection.includes.Client_Individual).length) {
          q = q.include('Client_Individual', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Client_Individual));
          });
        }
        if (projection.includes.Property && Object.keys(projection.includes.Property).length) {
          q = q.include('Property', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Property));
          });
        }
        if (projection.includes.Primary_Service_Provider && Object.keys(projection.includes.Primary_Service_Provider).length) {
          q = q.include('Primary_Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(Object.keys(projection.includes.Primary_Service_Provider));
            });
          });
        }
        if (projection.includes.Client_Entity && Object.keys(projection.includes.Client_Entity).length) {
          q = q.include('Client_Entity', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Client_Entity));
          });
        }
        if (projection.includes.Inquiry_Record && Object.keys(projection.includes.Inquiry_Record).length) {
          var inquiryFields = Object.keys(projection.includes.Inquiry_Record).filter(function (fName) {
            return fName !== 'service_name';
          });
          q = q.include('Inquiry_Record', function (sub) {
            sub.deSelectAll();
            if (inquiryFields.length) sub.select(inquiryFields);
            if (projection.includes.Inquiry_Record.service_name) {
              sub.include('Service_Inquiry', function (d) { d.deSelectAll().select(['service_name']); });
            }
          });
        }

        lastQuery = q;
        return q;
      });
    }

    return {
      fetchPayments: function (filters, limit, offset) {
        return buildQuery(filters).then(function (q) {
          q.getOrInitQueryCalc();
          return q.fetchDirect({ variables: { limit: limit, offset: offset } })
            .pipe(getPipe())
            .toPromise()
            .then(function (rows) { return (rows && rows.resp) || []; });
        });
      },
      countPayments: function (filters) {
        var p = lastQuery ? Promise.resolve(lastQuery) : buildQuery(filters);
        return p.then(function (q) {
          var countQ = q.deSelectAll().noDestroy();
          return countQ.fetchDirect().toPromise()
            .then(function (res) { return (res && res.resp && res.resp.length) || 0; });
        });
      },
    };
  }

  // ── Payment Service ──

  function createPaymentService() {
    var repo = null;
    function ensureRepo() {
      if (!repo) repo = createPaymentRepo();
      return repo;
    }

    return {
      fetchPayments: function (filters, limit, offset) {
        var r = ensureRepo();
        return r.fetchPayments(filters, limit, offset).then(function (rows) {
          return r.countPayments(filters).then(function (totalCount) {
            var normalized = normalizeKeysArray(rows);
            var mapped = mapPaymentArray(normalized);
            return { rows: mapped, totalCount: totalCount, totalPages: Math.ceil(totalCount / limit) };
          });
        });
      },
    };
  }


  // ═══════════════════════════════════════════════════════════
  // ACTIVE JOB DOMAIN (PeterpmJob model — active/in-progress jobs)
  // ═══════════════════════════════════════════════════════════

  var ACTIVE_JOB_MAPPER = {
    id: 'recordId',
    unique_id: 'id',
    client_individual_first_name: 'client_firstName',
    client_individual_last_name: 'client_lastName',
    client_individual_email: 'client_email',
    client_individual_sms_number: 'client_phone',
    active_job_status: 'activeJobStatus',
    active_job_total: 'activeJobTotal',
    date_active_job_accepted: 'dateAccepted',
    active_job_valid_until: 'validUntil',
    invoice_number: 'invoiceNumber',
    property_property_name: 'address',
    service_service_name: 'service',
    inquiry_record_type: 'type',
    inquiry_record_how_did_you_hear: 'referral',
    client_entity_name: 'companyName',
    client_entity_type: 'companyType',
  };

  var ACTIVE_JOB_DATE_FIELDS = { date_active_job_accepted: true, active_job_valid_until: true };

  function mapActiveJob(obj) {
    obj = obj || {};
    var mapped = {};
    for (var key in ACTIVE_JOB_MAPPER) {
      if (ACTIVE_JOB_DATE_FIELDS[key]) {
        mapped[ACTIVE_JOB_MAPPER[key]] = formatUnixToDisplay(obj[key]);
        continue;
      }
      if (key === 'active_job_total') {
        mapped[ACTIVE_JOB_MAPPER[key]] = obj[key] != null ? Number(obj[key]) : 0;
        continue;
      }
      mapped[ACTIVE_JOB_MAPPER[key]] = (obj[key] != null) ? obj[key] : null;
    }
    return mapped;
  }

  // FIX: z-new-version's activeJobService referenced undefined `mapped` variable
  // because the mapper was commented out. Created proper mapper above.
  function mapActiveJobArray(list) {
    var flat = (list || []).map(function (item) { return mapActiveJob(item); });
    return flat.map(function (item) {
      item = item || {};
      var firstName = item.client_firstName || '';
      var lastName = item.client_lastName || '';
      return {
        id: item.id ? '#' + item.id : null,
        recordId: item.recordId != null ? String(item.recordId) : null,
        client: (firstName + ' ' + lastName).trim() || null,
        activeJobStatus: item.activeJobStatus || 'Unknown',
        activeJobTotal: item.activeJobTotal || 0,
        dateAccepted: item.dateAccepted || null,
        validUntil: item.validUntil || null,
        invoiceNumber: item.invoiceNumber || null,
        service: item.service || null,
        meta: {
          email: item.client_email || null,
          sms: item.client_phone || null,
          address: item.address || null,
        },
      };
    });
  }

  var DEFAULT_ACTIVE_JOB_PROJECTION = {
    select: ['id', 'unique_id', 'active_job_status', 'active_job_total', 'date_active_job_accepted', 'active_job_valid_until', 'invoice_number', 'created_at'],
    includes: {
      Client_Individual: ['first_name', 'last_name', 'email', 'sms_number', 'address_1'],
      Property: ['property_name'],
      Primary_Service_Provider: ['first_name', 'last_name'],
      Client_Entity: ['name', 'type'],
      Inquiry_Record: ['type', 'how_did_you_hear', 'service_name'],
    },
  };

  function normalizeActiveJobProjection(rawProjection) {
    var projection = rawProjection || {};
    var selectSet = {};
    var includeMap = {};
    (Array.isArray(projection.select) ? projection.select : DEFAULT_ACTIVE_JOB_PROJECTION.select).forEach(function (f) {
      if (f) selectSet[f] = true;
    });
    var sourceIncludes = projection.includes && typeof projection.includes === 'object'
      ? projection.includes
      : DEFAULT_ACTIVE_JOB_PROJECTION.includes;
    Object.keys(sourceIncludes || {}).forEach(function (relation) {
      includeMap[relation] = {};
      (sourceIncludes[relation] || []).forEach(function (f) { if (f) includeMap[relation][f] = true; });
    });
    return { select: Object.keys(selectSet), includes: includeMap };
  }

  // ── Active Job Repository ──

  function createActiveJobRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var calStart = Number.isFinite(Number(f.calendarDateStartEpoch)) ? Number(f.calendarDateStartEpoch) : null;
      var calEnd = Number.isFinite(Number(f.calendarDateEndEpoch)) ? Number(f.calendarDateEndEpoch) : null;
      var minPrice = f.minPrice;
      var maxPrice = f.maxPrice;
      var activeSortable = { date_active_job_accepted: true, active_job_valid_until: true, created_at: true };
      var sortBy = activeSortable[f.sortBy] ? f.sortBy : null;
      var sortDir = normalizeSortDir(f.sortDirection || 'desc');
      var projection = normalizeActiveJobProjection(f.activeJobProjection);

      return getModel('PeterpmJob').then(function (model) {
        var q = model.query();

        if (Array.isArray(f.statuses) && f.statuses.length) {
          q = q.andWhere('active_job_status', 'in', f.statuses);
        }
        if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('account_name', 'in', f.serviceProviders);
          });
        }
        if (Array.isArray(f.serviceProviderIds) && f.serviceProviderIds.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('id', 'in', f.serviceProviderIds);
          });
        }
        if (f.serviceman && String(f.serviceman).trim()) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.andWhere('account_name', 'like', like(String(f.serviceman).trim()));
          });
        }
        if (minPrice != null) q = q.andWhere('active_job_total', '>=', minPrice);
        if (maxPrice != null) q = q.andWhere('active_job_total', '<=', maxPrice);
        if (f.activeJobNumber) q = q.andWhere('unique_id', 'like', like(f.activeJobNumber));
        if (f.invoiceNumber) q = q.andWhere('invoice_number', 'like', like(f.invoiceNumber));
        if (f.recommendation) q = q.andWhere('admin_recommendation', 'like', like(f.recommendation));

        if (startEpoch != null || endEpoch != null) {
          q = q.andWhere(function (sub) {
            if (startEpoch != null) sub.andWhere('date_active_job_accepted', '>=', startEpoch);
            if (endEpoch != null) sub.andWhere('date_active_job_accepted', '<=', endEpoch);
          });
        }
        if (calStart != null || calEnd != null) {
          q = q.andWhere(function (sub) {
            if (calStart != null) sub.andWhere('date_active_job_accepted', '>=', calStart);
            if (calEnd != null) sub.andWhere('date_active_job_accepted', '<=', calEnd);
          });
        }
        if (f.resident) {
          var likeResident = like(f.resident);
          q = q.andWhere('Client_Individual', function (sub) {
            sub.where('first_name', 'like', likeResident).orWhere('last_name', 'like', likeResident);
          });
        }
        if (f.address) {
          q = q.andWhere('Property', function (sub) {
            sub.andWhere('property_name', 'like', like(f.address));
          });
        }
        if (f.global && f.global.trim()) {
          var likeVal = like(f.global.trim());
          q = q.andWhere('Client_Individual', function (sub) {
            sub.andWhere(function (g) {
              g.where('first_name', 'like', likeVal)
                .orWhere('last_name', 'like', likeVal)
                .orWhere('email', 'like', likeVal)
                .orWhere('sms_number', 'like', likeVal);
            });
          });
        }
        if (f.accountName || (Array.isArray(f.accountTypes) && f.accountTypes.length)) {
          q = q.andWhere('Client_Entity', function (sub) {
            if (f.accountName) sub.andWhere('name', 'like', like(f.accountName));
            if (Array.isArray(f.accountTypes) && f.accountTypes.length) sub.andWhere('type', 'in', f.accountTypes);
          });
        }
        if (Array.isArray(f.source) && f.source.length) {
          q = q.andWhere('Inquiry_Record', function (sub) {
            sub.andWhere('how_did_you_hear', 'in', f.source);
          });
        }

        q = q.andWhereNot('job_status', 'completed')
          .andWhereNot('job_status', 'cancelled');
        if (sortBy) q = q.orderBy(sortBy, sortDir);
        q = q
          .deSelectAll()
          .select(projection.select)
          .noDestroy();

        if (projection.includes.Client_Individual && Object.keys(projection.includes.Client_Individual).length) {
          q = q.include('Client_Individual', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Client_Individual));
          });
        }
        if (projection.includes.Property && Object.keys(projection.includes.Property).length) {
          q = q.include('Property', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Property));
          });
        }
        if (projection.includes.Primary_Service_Provider && Object.keys(projection.includes.Primary_Service_Provider).length) {
          q = q.include('Primary_Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(Object.keys(projection.includes.Primary_Service_Provider));
            });
          });
        }
        if (projection.includes.Client_Entity && Object.keys(projection.includes.Client_Entity).length) {
          q = q.include('Client_Entity', function (sub) {
            sub.deSelectAll().select(Object.keys(projection.includes.Client_Entity));
          });
        }
        if (projection.includes.Inquiry_Record && Object.keys(projection.includes.Inquiry_Record).length) {
          var inquiryFields = Object.keys(projection.includes.Inquiry_Record).filter(function (fName) {
            return fName !== 'service_name';
          });
          q = q.include('Inquiry_Record', function (sub) {
            sub.deSelectAll();
            if (inquiryFields.length) sub.select(inquiryFields);
            if (projection.includes.Inquiry_Record.service_name) {
              sub.include('Service_Inquiry', function (d) { d.deSelectAll().select(['service_name']); });
            }
          });
        }

        lastQuery = q;
        return q;
      });
    }

    return {
      fetchActiveJobs: function (filters, limit, offset) {
        return buildQuery(filters).then(function (q) {
          q.getOrInitQueryCalc();
          return q.fetchDirect({ variables: { limit: limit, offset: offset } })
            .pipe(getPipe())
            .toPromise()
            .then(function (rows) { return (rows && rows.resp) || []; });
        });
      },
      countActiveJobs: function (filters) {
        var p = lastQuery ? Promise.resolve(lastQuery) : buildQuery(filters);
        return p.then(function (q) {
          var countQ = q.deSelectAll().noDestroy();
          return countQ.fetchDirect().toPromise()
            .then(function (res) { return (res && res.resp && res.resp.length) || 0; });
        });
      },
    };
  }

  // ── Active Job Service ──

  function createActiveJobService() {
    var repo = null;
    function ensureRepo() {
      if (!repo) repo = createActiveJobRepo();
      return repo;
    }

    return {
      fetchActiveJobs: function (filters, limit, offset) {
        var r = ensureRepo();
        return r.fetchActiveJobs(filters, limit, offset).then(function (rows) {
          return r.countActiveJobs(filters).then(function (totalCount) {
            var normalized = normalizeKeysArray(rows);
            var mapped = mapActiveJobArray(normalized);
            return { rows: mapped, totalCount: totalCount, totalPages: Math.ceil(totalCount / limit) };
          });
        });
      },
    };
  }


  // ═══════════════════════════════════════════════════════════
  // EXPOSE ON WINDOW
  // ═══════════════════════════════════════════════════════════

  window.PtpmDomain = {
    // Services (lazy-init repos on first call)
    inquiry: createInquiryService(),
    job: createJobService(),
    quote: createQuoteService(),
    payment: createPaymentService(),
    activeJob: createActiveJobService(),

    // Utility — switch to any VitalSync model
    switchToModel: getModel,

    // Mappers (exposed for custom use in page scripts)
    mappers: {
      mapInquiryArray: mapInquiryArray,
      mapJobArray: mapJobArray,
      mapQuoteArray: mapQuoteArray,
      mapPaymentArray: mapPaymentArray,
      mapActiveJobArray: mapActiveJobArray,
    },
  };
})();
