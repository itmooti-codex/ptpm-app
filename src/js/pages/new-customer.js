// PTPM — Add New Customer Page
// Form to create a contact via VitalSync SDK; redirects to customer detail or list on success.
// Depends on: config.js, utils.js, vitalsync.js
(function () {
  'use strict';

  var config = window.AppConfig || {};
  var utils = window.PtpmUtils || window.AppUtils || {};

  var CONTACT_MODEL = 'PeterpmContact';
  var plugin = null;

  function byId(id) { return document.getElementById(id); }

  function str(v) { return v == null ? '' : String(v).trim(); }

  function getModel() {
    if (!plugin) return Promise.reject(new Error('VitalSync not connected'));
    var result = plugin.switchTo(CONTACT_MODEL);
    return result && typeof result.then === 'function' ? result : Promise.resolve(result);
  }

  function createContact(data) {
    return getModel().then(function (model) {
      var mut = model.mutation();
      mut.createOne(data);
      return mut.execute(true).toPromise();
    });
  }

  function showValidation(message) {
    var el = byId('new-customer-validation');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('hidden', !message);
  }

  function getFormPayload() {
    var form = document.getElementById('new-customer-form');
    if (!form) return {};
    var fd = new FormData(form);
    var payload = {};
    var map = {
      first_name: 'first_name',
      last_name: 'last_name',
      email: 'email',
      sms_number: 'sms_number',
      office_phone: 'office_phone',
      address1: 'address1',
      address2: 'address2',
      suburb: 'suburb',
      postcode: 'postcode',
      state: 'state',
      country: 'country',
    };
    fd.forEach(function (value, key) {
      var v = str(value);
      if (map[key]) payload[map[key]] = v;
      else if (key && v) payload[key] = v;
    });
    if (payload.email === '' && fd.get('contact_email')) payload.email = str(fd.get('contact_email'));
    if (payload.office_phone === '' && fd.get('phone')) payload.office_phone = str(fd.get('phone'));
    return payload;
  }

  function handleSubmit(e) {
    e.preventDefault();
    showValidation('');
    var payload = getFormPayload();
    if (!str(payload.first_name)) {
      showValidation('Principal First Name is required.');
      var first = byId('nc-first-name');
      if (first) first.focus();
      return;
    }
    var saveBtn = byId('new-customer-save');
    if (saveBtn && typeof utils.setButtonLoading === 'function') {
      utils.setButtonLoading(saveBtn, true, { label: 'Saving…' });
    }
    createContact(payload)
      .then(function (result) {
        var managed = result && result.mutations && result.mutations[CONTACT_MODEL] && result.mutations[CONTACT_MODEL].managedData;
        var newId = managed && typeof managed === 'object' ? Object.keys(managed)[0] : null;
        if (newId) {
          var detailUrl = (config.CUSTOMER_DETAIL_URL_TEMPLATE || './customer-detail.html?contact={id}').replace(/\{id\}/g, String(newId));
          window.location.href = detailUrl;
        } else {
          window.location.href = config.CUSTOMERS_LIST_URL || './customers-list.html';
        }
      })
      .catch(function (err) {
        if (config.DEBUG) console.error('[NewCustomer] Create failed:', err);
        showValidation(err && err.message ? err.message : 'Failed to create customer. Please try again.');
      })
      .finally(function () {
        if (saveBtn && typeof utils.setButtonLoading === 'function') utils.setButtonLoading(saveBtn, false);
      });
  }

  function init() {
    var form = byId('new-customer-form');
    var backLink = byId('new-customer-back');
    if (backLink && (!backLink.getAttribute('href') || backLink.getAttribute('href') === '#')) {
      backLink.href = config.CUSTOMERS_LIST_URL || './customers-list.html';
    }
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }
    var saveBtn = byId('new-customer-save');
    if (saveBtn && saveBtn.form !== form) {
      saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (form) form.requestSubmit();
      });
    }
    if (!window.VitalSync || typeof window.VitalSync.connect !== 'function') {
      showValidation('VitalSync is not available. Connect to create customers.');
      return;
    }
    window.VitalSync.connect()
      .then(function (p) {
        plugin = p;
        if (config.DEBUG) console.log('[NewCustomer] VitalSync connected');
      })
      .catch(function (err) {
        if (config.DEBUG) console.warn('[NewCustomer] VitalSync connect failed:', err);
        showValidation('Could not connect to VitalSync. Check your API key and try again.');
      });
  }

  window.initNewCustomerAutocomplete = function () {
    var input = byId('nc-address-search');
    if (!input || !window.google || !window.google.maps || !window.google.maps.places) return;
    var autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'au' },
    });
    autocomplete.addListener('place_changed', function () {
      var place = autocomplete.getPlace();
      if (!place || !place.address_components) return;
      var mapping = { street_number: '', route: '', subpremise: '', locality: '', administrative_area_level_1: '', postal_code: '', country: '' };
      place.address_components.forEach(function (comp) {
        comp.types.forEach(function (type) {
          if (mapping.hasOwnProperty(type)) mapping[type] = comp.long_name || comp.short_name || '';
        });
      });
      var addr1 = [mapping.street_number, mapping.route].filter(Boolean).join(' ');
      var addr2 = mapping.subpremise || '';
      var stateComp = place.address_components.find(function (c) { return c.types.indexOf('administrative_area_level_1') >= 0; });
      var stateVal = stateComp ? stateComp.short_name : '';
      var countryComp = place.address_components.find(function (c) { return c.types.indexOf('country') >= 0; });
      var countryVal = countryComp ? countryComp.long_name : mapping.country;
      setFieldValue('nc-address1', addr1);
      setFieldValue('nc-address2', addr2);
      setFieldValue('nc-suburb', mapping.locality);
      setFieldValue('nc-postcode', mapping.postal_code);
      setFieldValue('nc-state', stateVal);
      setFieldValue('nc-country', countryVal);
    });
  };

  function setFieldValue(id, value) {
    var el = byId(id);
    if (!el) return;
    var v = value == null || value === undefined ? '' : String(value).trim();
    if (el.tagName === 'SELECT') {
      var opt = Array.prototype.find.call(el.options, function (o) { return o.value === v; });
      if (opt) el.value = v;
      else el.value = v || '';
    } else {
      el.value = v;
    }
  }

  window.PtpmNewCustomer = { init: init };
})();
