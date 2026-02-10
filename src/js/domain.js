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
      modelCache[modelName] = plugin.switchTo(modelName);
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

  function formatUnixToDisplay(unix) {
    return unix ? formatDisplayDate(formatUnixDate(unix)) : null;
  }


  // ═══════════════════════════════════════════════════════════
  // INQUIRY DOMAIN (PeterpmDeal model)
  // ═══════════════════════════════════════════════════════════

  var INQUIRY_MAPPER = {
    unique_id: 'id',
    contact_first_name: 'serviceman_firstName',
    contact_last_name: 'serviceman_lastName',
    date_added: 'created_at',
    inquiry_status: 'status',
    companyname: 'company',
    company_account_type: 'companyType',
    how_did_you_hear: 'referral',
    // FIX: z-new-version had duplicate key 'property_address_1' mapped to both
    // 'address' and 'client_address'. Keeping 'client_address' as the correct mapping.
    property_address_1: 'client_address',
    service_inquiry_service_name: 'service',
    type: 'type',
    primary_contact_first_name: 'client_firstName',
    primary_contact_last_name: 'client_lastName',
    primary_contact_email: 'client_email',
    primary_contact_sms_number: 'client_phone',
  };

  function mapInquiry(obj) {
    var mapped = {};
    for (var key in INQUIRY_MAPPER) {
      if (key === 'date_added') {
        mapped[INQUIRY_MAPPER[key]] = formatUnixToDisplay(obj[key]);
        continue;
      }
      mapped[INQUIRY_MAPPER[key]] = (obj[key] != null) ? obj[key] : null;
    }
    return mapped;
  }

  function mapInquiryArray(list) {
    var flat = (list || []).map(function (item) { return mapInquiry(item); });
    return flat.map(function (item) {
      item = item || {};
      return {
        id: item.id != null ? '#' + item.id : '-',
        client: [item.client_firstName, item.client_lastName].filter(Boolean).join(' ') || '-',
        created: item.created_at || '-',
        serviceman: [item.serviceman_firstName, item.serviceman_lastName].filter(Boolean).join(' ') || '-',
        followUp: item.created_at || '-',
        source: item.referral || '-',
        service: item.service || '-',
        type: item.type || '-',
        status: item.status || '-',
        meta: {
          address: item.client_address || '-',
          email: item.client_email || '-',
          sms: item.client_phone || '-',
        },
      };
    });
  }

  // ── Inquiry Repository ──

  function createInquiryRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);

      return getModel('PeterpmDeal').then(function (model) {
        var q = model.query();

        if (f.global && f.global.trim()) {
          var likeVal = like(f.global.trim());
          q = q.andWhere('Primary_Contact', function (sub) {
            sub.andWhere(function (g) {
              g.where('first_name', 'like', likeVal)
                .orWhere('last_name', 'like', likeVal)
                .orWhere('email', 'like', likeVal)
                .orWhere('sms_number', 'like', likeVal);
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

        q = q.orderBy('id', 'desc')
          .deSelectAll()
          .select(['id', 'unique_id', 'created_at', 'type', 'inquiry_status', 'how_did_you_hear'])
          .include('Company', function (sub) { sub.deSelectAll().select(['name', 'account_type']); })
          .include('Service_Inquiry', function (sub) { sub.select(['service_name']); })
          .include('Primary_Contact', function (sub) { sub.select(['first_name', 'last_name', 'email', 'sms_number', 'address_1']); })
          .include('Property', function (sub) { sub.deSelectAll().select(['address_1']); })
          .include('Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(['first_name', 'last_name']);
            });
          })
          .noDestroy();

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
            var normalized = normalizeKeysArray(rows);
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
    date_quoted_accepted: 'dateQuotedAccepted',
    date_started: 'dateStarted',
    inquiry_record_how_did_you_hear: 'referral',
    inquiry_record_inquiry_status: 'status',
    inquiry_record_type: 'type',
    invoice_number: 'invoiceNumber',
    job_status: 'jobStatus',
    job_total: 'jobTotal',
    payment_status: 'paymentStatus',
    property_property_name: 'address',
    service_service_name: 'service',
  };

  var JOB_DATE_FIELDS = { date_booked: true, date_quoted_accepted: true, date_started: true };

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
        client: (firstName + ' ' + lastName).trim() || null,
        startDate: item.dateStarted || null,
        service: item.service || null,
        paymentStatus: item.paymentStatus || null,
        jobRequiredBy: item.dateJobRequiredBy || null,
        bookedDate: item.dateBooked || null,
        jobTotal: item.jobTotal || null,
        jobStatus: item.jobStatus || 'Unknown',
        meta: {
          email: item.client_email || null,
          sms: item.client_phone || null,
          address: item.address || null,
        },
      };
    });
  }

  // ── Job Repository ──

  function createJobRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var minPrice = f.minPrice;
      var maxPrice = f.maxPrice;

      return getModel('PeterpmJob').then(function (model) {
        var q = model.query();

        if (Array.isArray(f.statuses) && f.statuses.length) {
          q = q.andWhere('job_status', 'in', f.statuses);
        }
        if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
          q = q.andWhere('Primary_Service_Provider', function (sub) {
            sub.where('account_name', 'in', f.serviceProviders);
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

        q = q.andWhereNot('job_status', 'isNull')
          .deSelectAll()
          .select(['unique_id', 'date_started', 'payment_status', 'date_job_required_by', 'date_booked', 'job_status', 'job_total', 'date_quoted_accepted', 'invoice_number'])
          .include('Client_Individual', function (sub) { sub.select(['first_name', 'last_name', 'email', 'sms_number', 'address_1']); })
          .include('Property', function (sub) { sub.deSelectAll().select(['property_name']); })
          .include('Primary_Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(['first_name', 'last_name']);
            });
          })
          .include('Client_Entity', function (sub) { sub.deSelectAll().select(['name', 'type']); })
          .include('Inquiry_Record', function (sub) { sub.deSelectAll().select(['inquiry_status', 'type', 'how_did_you_hear']); })
          .include('Inquiry_Record', function (sub) {
            sub.include('Service_Inquiry', function (d) { d.deSelectAll().select(['service_name']); });
          })
          .noDestroy();

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

  // ── Quote Repository ──

  function createQuoteRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var minPrice = f.minPrice;
      var maxPrice = f.maxPrice;

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

        q = q.andWhereNot('quote_status', 'isNull')
          .deSelectAll()
          .select(['unique_id', 'quote_status', 'quote_total', 'date_quoted_accepted', 'quote_valid_until', 'invoice_number', 'created_at'])
          .include('Client_Individual', function (sub) { sub.select(['first_name', 'last_name', 'email', 'sms_number', 'address_1']); })
          .include('Property', function (sub) { sub.deSelectAll().select(['property_name']); })
          .include('Primary_Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(['first_name', 'last_name']);
            });
          })
          .include('Client_Entity', function (sub) { sub.deSelectAll().select(['name', 'type']); })
          .include('Inquiry_Record', function (sub) { sub.deSelectAll().select(['type', 'how_did_you_hear']); })
          .include('Inquiry_Record', function (sub) {
            sub.include('Service_Inquiry', function (d) { d.deSelectAll().select(['service_name']); });
          })
          .noDestroy();

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

  // ── Payment Repository ──

  function createPaymentRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var minPrice = f.minAmount;
      var maxPrice = f.maxAmount;

      return getModel('PeterpmJob').then(function (model) {
        var q = model.query();

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

        q = q.andWhereNot('xero_invoice_status', 'isNull')
          .deSelectAll()
          .select(['unique_id', 'invoice_number', 'invoice_date', 'due_date', 'invoice_total', 'bill_time_paid', 'bill_approved_admin', 'bill_approved_service_provider2', 'xero_invoice_status'])
          .include('Client_Individual', function (sub) { sub.select(['first_name', 'last_name', 'email', 'sms_number', 'address_1']); })
          .include('Property', function (sub) { sub.deSelectAll().select(['property_name']); })
          .include('Primary_Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(['first_name', 'last_name']);
            });
          })
          .include('Client_Entity', function (sub) { sub.deSelectAll().select(['name', 'type']); })
          .include('Inquiry_Record', function (sub) { sub.deSelectAll().select(['inquiry_status', 'type', 'how_did_you_hear']); })
          .include('Inquiry_Record', function (sub) {
            sub.include('Service_Inquiry', function (d) { d.deSelectAll().select(['service_name']); });
          })
          .noDestroy();

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

  // ── Active Job Repository ──

  function createActiveJobRepo() {
    var lastQuery = null;

    function buildQuery(filters) {
      var f = filters || {};
      var startEpoch = toEpoch(f.dateFrom, false);
      var endEpoch = toEpoch(f.dateTo, true);
      var minPrice = f.minPrice;
      var maxPrice = f.maxPrice;

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
          .andWhereNot('job_status', 'cancelled')
          .deSelectAll()
          .select(['unique_id', 'active_job_status', 'active_job_total', 'date_active_job_accepted', 'active_job_valid_until', 'invoice_number', 'created_at'])
          .include('Client_Individual', function (sub) { sub.select(['first_name', 'last_name', 'email', 'sms_number', 'address_1']); })
          .include('Property', function (sub) { sub.deSelectAll().select(['property_name']); })
          .include('Primary_Service_Provider', function (sub) {
            sub.deSelectAll().include('Contact_Information', function (r) {
              r.deSelectAll().select(['first_name', 'last_name']);
            });
          })
          .include('Client_Entity', function (sub) { sub.deSelectAll().select(['name', 'type']); })
          .include('Inquiry_Record', function (sub) { sub.deSelectAll().select(['type', 'how_did_you_hear']); })
          .include('Inquiry_Record', function (sub) {
            sub.include('Service_Inquiry', function (d) { d.deSelectAll().select(['service_name']); });
          })
          .noDestroy();

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
