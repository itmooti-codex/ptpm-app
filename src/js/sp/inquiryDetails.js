(() => {
  const DUMMY_INQUIRY_ID = jobId;
  const PROPERTY_MODEL = "PeterpmProperty";
  const CONTACT_MODEL = "PeterpmContact";
  const COMPANY_MODEL = "PeterpmCompany";

  const getVitalStatsPlugin = async () => {
    if (typeof window.getVitalStatsPlugin !== "function") {
      throw new Error("SDK not initialized. Ensure sdk.js is loaded first.");
    }
    return window.getVitalStatsPlugin();
  };

  const getInquiryId = () => {
    if (typeof window.INQUIRY_ID !== "undefined") {
      const asNumber = Number(window.INQUIRY_ID);
      if (Number.isFinite(asNumber)) {
        return asNumber;
      }
    }
    return DUMMY_INQUIRY_ID;
  };

  const getPropertyId = () => {
    const placeholder = propertyID;
    const raw = typeof window.PROPERTY_ID !== "undefined"
      ? window.PROPERTY_ID
      : placeholder;
    const parsed = Number(String(raw).trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return null;
  };

  const getInputValue = (selector, fallback = "") => {
    const el = document.querySelector(selector);
    if (!el) {
      return fallback;
    }
    return (el.value || "").trim();
  };

  const extractRecords = (payload) => {
    if (!payload) {
      return [];
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    const candidates = [
      payload?.resp,
      payload?.records,
      payload?.data,
      payload?.resp?.data,
      payload?.resp?.records,
      payload?.data?.records,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
    return [];
  };

  const setAlpineFlag = (key, value) => {
    const body = document.body;
    if (!body) {
      return;
    }
    const raw = body.getAttribute("x-data");
    if (!raw) {
      return;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      return;
    }
    data[key] = value;
    body.setAttribute("x-data", JSON.stringify(data));
  };

  window.propertyModalReturnTarget = "owner";
  window.setPropertyModalReturnTarget = (target) => {
    window.propertyModalReturnTarget = target === "combined" ? "combined" : "owner";
  };
  window.closePropertySubModal = () => {
    setAlpineFlag("newClientModal", false);
    setAlpineFlag("addnewCompanyModal", false);
    setAlpineFlag("propertyOwnerAndResidentModal", false);
    setAlpineFlag("combinedPropertyEditModal", false);
    if (window.propertyModalReturnTarget === "combined") {
      setAlpineFlag("combinedPropertyEditModal", true);
    } else {
      setAlpineFlag("propertyOwnerAndResidentModal", true);
    }
  };

  const mapPropertyRecord = (record) => {
    const owner = record?.Individual_Owner || {};
    const ownerCompany = record?.Owner_Company || {};
    const residentLink = record?.Primary_Resident_Contact_for_Property || {};
    const residentContact = residentLink?.Contact || {};
    return {
      Address_1: record?.address_1 ?? record?.Address_1 ?? "",
      Address_2: record?.address_2 ?? record?.Address_2 ?? "",
      Bedrooms: record?.bedrooms ?? record?.Bedrooms ?? "",
      Building_Age: record?.building_age ?? record?.Building_Age ?? "",
      Building_Complex_ID:
        record?.building_complex_id ?? record?.Building_Complex_ID ?? "",
      Building_Features_Options_As_Text:
        record?.building_features_options_as_text ??
        record?.Building_Features_Options_As_Text ??
        "",
      Building_Type: record?.building_type ?? record?.Building_Type ?? "",
      Building_Type_Other:
        record?.building_type_other ?? record?.Building_Type_Other ?? "",
      Building_Type_SQL_DB:
        record?.building_type_sql_db ?? record?.Building_Type_SQL_DB ?? "",
      Country: record?.country ?? record?.Country ?? "",
      Date_Added: record?.created_at ?? record?.Date_Added ?? "",
      externalRawDataErrors:
        record?.externalRawDataErrors ?? record?.externalRawDataErrors ?? "",
      externalRawDataStatus:
        record?.externalRawDataStatus ?? record?.externalRawDataStatus ?? "",
      Foundation_Type:
        record?.foundation_type ?? record?.Foundation_Type ?? "",
      ID: record?.id ?? record?.ID ?? "",
      Individual_Owner_ID:
        record?.individual_owner_id ?? record?.Individual_Owner_ID ?? "",
      IP_Address: record?.ip_address ?? record?.IP_Address ?? "",
      Last_Activity: record?.last_activity ?? record?.Last_Activity ?? "",
      Last_Call_Logged:
        record?.last_call_logged ?? record?.Last_Call_Logged ?? "",
      Last_Email_Received:
        record?.last_email_received ?? record?.Last_Email_Received ?? "",
      Last_Email_Sent:
        record?.last_email_sent ?? record?.Last_Email_Sent ?? "",
      Last_Gutter_Job:
        record?.last_gutter_job ?? record?.Last_Gutter_Job ?? "",
      Last_Gutter_Job_Price:
        record?.last_gutter_job_price ??
        record?.Last_Gutter_Job_Price ??
        "",
      Date_Modified:
        record?.last_modified_at ?? record?.Date_Modified ?? "",
      Last_Note: record?.last_note ?? record?.Last_Note ?? "",
      Last_Rodent_Job:
        record?.last_rodent_job ?? record?.Last_Rodent_Job ?? "",
      Last_Rodent_Job_Rate:
        record?.last_rodent_job_rate ??
        record?.Last_Rodent_Job_Rate ??
        "",
      Last_SMS_Received:
        record?.last_sms_received ?? record?.Last_SMS_Received ?? "",
      Last_SMS_Sent: record?.last_sms_sent ?? record?.Last_SMS_Sent ?? "",
      Lot_Number: record?.lot_number ?? record?.Lot_Number ?? "",
      Manhole: record?.manhole ?? record?.Manhole ?? "",
      Owner_Company_ID:
        record?.owner_company_id ?? record?.Owner_Company_ID ?? "",
      Owner_ID: record?.owner_id ?? record?.Owner_ID ?? "",
      Owner_Type: record?.owner_type ?? record?.Owner_Type ?? "",
      Postal_Code: record?.postal_code ?? record?.Postal_Code ?? "",
      Primary_Owner_Contact_for_Property_ID:
        record?.primary_owner_contact_for_property_id ??
        record?.Primary_Owner_Contact_for_Property_ID ??
        "",
      Primary_Property_Manager_Contact_for_Property_ID:
        record?.primary_property_manager_contact_for_property_id ??
        record?.Primary_Property_Manager_Contact_for_Property_ID ??
        "",
      Primary_Resident_Contact_for_Property_ID:
        record?.primary_resident_contact_for_property_id ??
        record?.Primary_Resident_Contact_for_Property_ID ??
        "",
      Profile_Image: record?.profile_image ?? record?.Profile_Image ?? "",
      Property_Name: record?.property_name ?? record?.Property_Name ?? "",
      Property_Type: record?.property_type ?? record?.Property_Type ?? "",
      Quadrant: record?.quadrant ?? record?.Quadrant ?? "",
      State: record?.state ?? record?.State ?? "",
      Stories: record?.stories ?? record?.Stories ?? "",
      Suburb_Town: record?.suburb_town ?? record?.Suburb_Town ?? "",
      Unique_ID: record?.unique_id ?? record?.Unique_ID ?? "",
      Unit_Number: record?.unit_number ?? record?.Unit_Number ?? "",
      ts: record?._ts_ ?? record?.ts ?? "",
      tsAction: record?._tsAction_ ?? record?.tsAction ?? "",
      tsCreate: record?._tsCreate_ ?? record?.tsCreate ?? "",
      tsSessionId: record?._tsSessionId_ ?? record?.tsSessionId ?? "",
      tsUpdateCount: record?._tsUpdateCount_ ?? record?.tsUpdateCount ?? "",
      Individual_Owner_First_Name:
        owner?.first_name ?? record?.Individual_Owner_First_Name ?? "",
      Individual_Owner_Last_Name:
        owner?.last_name ?? record?.Individual_Owner_Last_Name ?? "",
      Resident_Contact_First_Name:
        residentContact?.first_name ??
        record?.Resident_Contact_First_Name ??
        "",
      Resident_Contact_Last_Name:
        residentContact?.last_name ??
        record?.Resident_Contact_Last_Name ??
        "",
      Resident_Contact_SMS_Number:
        residentContact?.sms_number ??
        record?.Resident_Contact_SMS_Number ??
        "",
      Resident_ContactEmail:
        residentContact?.email ?? record?.Resident_ContactEmail ?? "",
      Owner_CompanyName: ownerCompany?.name ?? record?.Owner_CompanyName ?? "",
    };
  };

  const fetchCalcProperties = async () => {
    try {
      const plugin = await getVitalStatsPlugin();
      const model = plugin.switchTo(PROPERTY_MODEL);
      const inquiryId = getInquiryId();
      let query = model.query();
      if (typeof query.where === "function") {
        query = query.where("Deals", (q) => q.where("id", inquiryId));
      }
      query = query.deSelectAll().select([
        "address_1",
        "address_2",
        "bedrooms",
        "building_age",
        "building_complex_id",
        "building_features_options_as_text",
        "building_type",
        "building_type_other",
        "building_type_sql_db",
        "country",
        "created_at",
        "externalRawDataErrors",
        "externalRawDataStatus",
        "foundation_type",
        "id",
        "individual_owner_id",
        "ip_address",
        "last_activity",
        "last_call_logged",
        "last_email_received",
        "last_email_sent",
        "last_gutter_job",
        "last_gutter_job_price",
        "last_modified_at",
        "last_note",
        "last_rodent_job",
        "last_rodent_job_rate",
        "last_sms_received",
        "last_sms_sent",
        "lot_number",
        "manhole",
        "owner_company_id",
        "owner_id",
        "owner_type",
        "postal_code",
        "primary_owner_contact_for_property_id",
        "primary_property_manager_contact_for_property_id",
        "primary_resident_contact_for_property_id",
        "profile_image",
        "property_name",
        "property_type",
        "quadrant",
        "state",
        "stories",
        "suburb_town",
        "unique_id",
        "unit_number",
        "_ts_",
        "_tsAction_",
        "_tsCreate_",
        "_tsSessionId_",
        "_tsUpdateCount_",
      ]);
      if (typeof query.include === "function") {
        query.include("Individual_Owner", (q) => {
          q?.select?.(["first_name", "last_name"]);
        });
        query.include("Owner_Company", (q) => {
          q?.select?.(["name"]);
        });
        query.include("Primary_Resident_Contact_for_Property", (q) => {
          if (typeof q?.include === "function") {
            q.include("Contact", (c) => {
              c?.select?.(["first_name", "last_name", "sms_number", "email"]);
            });
          }
        });
      }
      query.getOrInitQueryCalc?.();
      const result = await query.fetchDirect().toPromise();
      const records = extractRecords(result);
      const mapped = records.map(mapPropertyRecord);
      const hasProperty = mapped.length > 0;
      if (hasProperty && mapped[0]?.ID) {
        window.PROPERTY_ID = mapped[0].ID;
      }
      const titleEl = document.getElementById("editPropertyInfoModalTitle");
      const editBtn = document.getElementById("editPropertyInfosss");
      const addBtn = document.getElementById("addPropertyInfosss");
      if (titleEl) {
        titleEl.textContent = hasProperty
          ? "Edit Property Information"
          : "Add Property Information";
      }
      if (editBtn) {
        editBtn.classList.toggle("hidden", !hasProperty);
      }
      if (addBtn) {
        addBtn.classList.toggle("hidden", hasProperty);
      }
      if (typeof window.renderData === "function") {
        window.renderData({ calcProperties: mapped });
      }
      window.propertyDetails = mapped;
      togglePropertySections(hasProperty);
      if (hasProperty) {
        applyPropertyToForms(mapped[0]);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    }
  };

  const getPropertyInfoPayload = () => ({
    property_name: document.getElementById("autocompleteSingle")?.value?.trim() || "",
    lot_number: document.getElementById("lotNumber")?.value?.trim() || "",
    unit_number: document.getElementById("unitNumber")?.value?.trim() || "",
    address_1: document.getElementById("address")?.value?.trim() || "",
    suburb_town: document.getElementById("suburbTown")?.value?.trim() || "",
    state: document.getElementById("state")?.value || "",
    postal_code: document.getElementById("postalCode")?.value?.trim() || "",
  });

  const getFirstValue = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const value = el?.value;
      if (typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
    }
    return "";
  };

  const getFirstRawValue = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.value !== undefined && el.value !== null && `${el.value}`.trim() !== "") {
        return el.value;
      }
    }
    return "";
  };

  const createProperty = async () => {
    setAlpineFlag("editPropertyInfoModal", false);
    try {
      const propId = getPropertyId();
      if (!propId) {
        return;
      }
      const plugin = await getVitalStatsPlugin();
      const model = plugin.switchTo(PROPERTY_MODEL);
      const mutation = model.mutation();
      mutation.update((q) => q.where("id", propId).set(getPropertyInfoPayload()));
      await mutation.execute(true).toPromise();
      fetchCalcProperties();
    } catch (error) {
      console.error("Failed to update property info:", error);
    }
  };

  const createNewProperty = async () => {
    setAlpineFlag("editPropertyInfoModal", false);
    try {
      const payload = {
        ...getPropertyInfoPayload(),
        Deals: {
          id: getInquiryId(),
        },
      };
      const plugin = await getVitalStatsPlugin();
      const model = plugin.switchTo(PROPERTY_MODEL);
      const mutation = model.mutation();
      mutation.createOne(payload);
      await mutation.execute(true).toPromise();
      fetchCalcProperties();
    } catch (error) {
      console.error("Failed to create property:", error);
    }
  };

  const createContact = async () => {
    setAlpineFlag("propertyOwnerAndResidentModal", false);
    setAlpineFlag("combinedPropertyEditModal", false);
    try {
      const propId = getPropertyId();
      if (!propId) {
        return;
      }
      const payload = {
        owner_type: getFirstRawValue(["#ownerTypeCombined", "#ownerType"]),
        resident_s_name: getFirstValue([
          "#residentNameCombined",
          "#residentName",
        ]),
        resident_s_mobile: getFirstValue([
          "#residentMobileCombined",
          "#residentMobile",
        ]),
        resident_s_email: getFirstValue([
          "#residentEmailCombined",
          "#residentEmail",
        ]),
        individual_owner_id: getFirstValue([
          ".hiddenIndOwnerIdCombined",
          ".hiddenIndOwnerId",
        ]),
      };
      const plugin = await getVitalStatsPlugin();
      const model = plugin.switchTo(PROPERTY_MODEL);
      const mutation = model.mutation();
      mutation.update((q) => q.where("id", propId).set(payload));
      await mutation.execute(true).toPromise();
      fetchCalcProperties();
    } catch (error) {
      console.error("Failed to update property contact:", error);
    }
  };

  const createCompany = async () => {
    setAlpineFlag("propertyOwnerAndResidentModal", false);
    setAlpineFlag("combinedPropertyEditModal", false);
    try {
      const propId = getPropertyId();
      if (!propId) {
        return;
      }
      const payload = {
        owner_type: getFirstRawValue(["#ownerTypeCombined", "#ownerType"]),
        resident_s_name: getFirstValue([
          "#residentNameCombined",
          "#residentName",
        ]),
        resident_s_mobile: getFirstValue([
          "#residentMobileCombined",
          "#residentMobile",
        ]),
        resident_s_email: getFirstValue([
          "#residentEmailCombined",
          "#residentEmail",
        ]),
        owner_company_id: getFirstValue([
          ".hiddenCompanyIdCombined",
          ".hiddenCompanyId",
        ]),
      };
      const plugin = await getVitalStatsPlugin();
      const model = plugin.switchTo(PROPERTY_MODEL);
      const mutation = model.mutation();
      mutation.update((q) => q.where("id", propId).set(payload));
      await mutation.execute(true).toPromise();
      fetchCalcProperties();
    } catch (error) {
      console.error("Failed to update property company:", error);
    }
  };

  const editBuindingDesc = async () => {
    setAlpineFlag("propertyDescriptionModal", false);
    try {
      const propId = getPropertyId();
      if (!propId) {
        return;
      }
      const manholeElement = document.getElementById("manholeUnchecked");
      const manhole = manholeElement
        ? manholeElement.classList.contains("hidden")
        : false;
      const payload = {
        building_features:
          document.getElementById("buildingFeatures")?.value?.trim() || "",
        property_type:
          document.getElementById("propertyType")?.value?.trim() || "",
        foundation_type:
          document.getElementById("foundationType")?.value?.trim() || "",
        building_type:
          document.getElementById("buildingType")?.value?.trim() || "",
        building_type_other:
          document.getElementById("otherBuildingType")?.value?.trim() || "",
        bedrooms: document.getElementById("bedrooms")?.value?.trim() || "",
        stories: document.getElementById("Stories")?.value?.trim() || "",
        manhole,
      };
      const plugin = await getVitalStatsPlugin();
      const model = plugin.switchTo(PROPERTY_MODEL);
      const mutation = model.mutation();
      mutation.update((q) => q.where("id", propId).set(payload));
      await mutation.execute(true).toPromise();
      fetchCalcProperties();
    } catch (error) {
      console.error("Failed to update property description:", error);
    }
  };

  window.fetchCalcProperties = fetchCalcProperties;
  window.createProperty = createProperty;
  window.createNewProperty = createNewProperty;
  window.createContact = createContact;
  window.createCompany = createCompany;
  window.editBuindingDesc = editBuindingDesc;

  const addNewIndividual = async () => {
    setAlpineFlag("newClientModal", false);
    try {
      const payload = {
        sms_number: getInputValue("#newClientSms"),
        first_name: getInputValue("#newClientFirstName"),
        last_name: getInputValue("#newClientLastName"),
        email: getInputValue("#newClientEmail"),
        Properties: {
          id: getPropertyId(),
          owner_type: getInputValue("#newClietOwnerType"),
        },
      };
      const plugin = await getVitalStatsPlugin();
      const model = plugin.switchTo(CONTACT_MODEL);
      const mutation = model.mutation();
      mutation.createOne(payload);
      await mutation.execute(true).toPromise();
      fetchCalcProperties();
      window.closePropertySubModal?.();
    } catch (error) {
      console.error("Failed to add contact:", error);
    }
  };

  const addNewCompany = async () => {
    setAlpineFlag("addnewCompanyModal", false);
    try {
      const payload = {
        name: getInputValue("#addNewCompanyName"),
        Properties: {
          id: getPropertyId(),
          owner_type: "Business",
        },
      };
      const plugin = await getVitalStatsPlugin();
      const model = plugin.switchTo(COMPANY_MODEL);
      const mutation = model.mutation();
      mutation.createOne(payload);
      await mutation.execute(true).toPromise();
      fetchCalcProperties();
      window.closePropertySubModal?.();
    } catch (error) {
      console.error("Failed to add company:", error);
    }
  };

  window.addNewIndividual = addNewIndividual;
  window.addNewCompany = addNewCompany;

  const setInputValue = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) {
      el.value = value || "";
    }
  };

  const setSelectValue = (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) {
      return;
    }
    el.value = value || "";
    el.dispatchEvent(new Event("change"));
  };

  const toBool = (value) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value === 1;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return ["true", "yes", "1"].includes(normalized);
    }
    return false;
  };

  const applyManholeToggle = (isEnabled, uncheckedId, checkedId) => {
    const unchecked = document.getElementById(uncheckedId);
    const checked = document.getElementById(checkedId);
    if (!unchecked || !checked) {
      return;
    }
    unchecked.classList.toggle("hidden", isEnabled);
    checked.classList.toggle("hidden", !isEnabled);
  };

  const applyPropertyToForms = (property) => {
    if (!property) {
      return;
    }

    const propertyName =
      property.Property_Name || property.Address_1 || "";

    setInputValue("#autocomplete", propertyName);
    setInputValue(".propertyname", propertyName);
    setInputValue("#addressUniqueID", property.Unique_ID || "");
    setInputValue("#propertyuniqueid", property.Unique_ID || "");
    setInputValue("#country", property.Country || "");
    setInputValue("#lotNumberCombined", property.Lot_Number);
    setInputValue(".lotno", property.Lot_Number);
    setInputValue("#unitNumberCombined", property.Unit_Number);
    setInputValue(".unitno", property.Unit_Number);
    setInputValue("#addressCombined", property.Address_1);
    setInputValue(".address1", property.Address_1);
    setInputValue("#suburbTownCombined", property.Suburb_Town);
    setInputValue(".suburb", property.Suburb_Town);
    setInputValue("#postalCodeCombined", property.Postal_Code);
    setInputValue(".postcode", property.Postal_Code);
    setSelectValue("#stateCombined", property.State);

    setSelectValue("#ownerTypeCombined", property.Owner_Type);
    setInputValue("#ownerCompanyCombined", property.Owner_CompanyName);
    setInputValue(
      "#indOwner",
      `${property.Individual_Owner_First_Name || ""} ${property.Individual_Owner_Last_Name || ""}`.trim(),
    );
    setInputValue(
      "#residentNameCombined",
      `${property.Resident_Contact_First_Name || ""} ${property.Resident_Contact_Last_Name || ""}`.trim(),
    );
    setInputValue("#residentMobileCombined", property.Resident_Contact_SMS_Number);
    setInputValue("#residentEmailCombined", property.Resident_ContactEmail);

    setSelectValue("#propertyTypeCombined", property.Property_Type);
    setSelectValue("#buildingTypeCombined", property.Building_Type);
    setInputValue("#otherBuildingTypeCombined", property.Building_Type_Other);
    setSelectValue("#foundationTypeCombined", property.Foundation_Type);
    setInputValue("#bedroomsCombined", property.Bedrooms);
    setInputValue("#StoriesCombined", property.Stories);
    applyManholeToggle(
      toBool(property.Manhole),
      "buildingIsTwoStoreyUncheckedCombined",
      "buildingIsTwoStoreyCheckedCombined",
    );

    setInputValue("#autocompleteSingle", propertyName);
    setInputValue(".propertynameSingle", propertyName);
    setInputValue("#propertyuniqueidSingle", property.Unique_ID || "");
    setInputValue("#address", property.Address_1);
    setInputValue("#suburbTown", property.Suburb_Town);
    setInputValue("#postalCode", property.Postal_Code);
    setSelectValue("#state", property.State);
    setInputValue("#unitNumber", property.Unit_Number);
    setInputValue("#lotNumber", property.Lot_Number);
    setInputValue("#country", property.Country || "");

    setSelectValue("#ownerType", property.Owner_Type);
    setInputValue(
      "#residentName",
      `${property.Resident_Contact_First_Name || ""} ${property.Resident_Contact_Last_Name || ""}`.trim(),
    );
    setInputValue("#residentMobile", property.Resident_Contact_SMS_Number);
    setInputValue("#residentEmail", property.Resident_ContactEmail);

    setSelectValue("#propertyType", property.Property_Type);
    setSelectValue("#buildingType", property.Building_Type);
    setInputValue("#otherBuildingType", property.Building_Type_Other);
    setSelectValue("#foundationType", property.Foundation_Type);
    setInputValue("#bedrooms", property.Bedrooms);
    setInputValue("#Stories", property.Stories);
    applyManholeToggle(toBool(property.Manhole), "manholeUnchecked", "manholeChecked");

    const buildingFeatures = document.getElementById("buildingFeatures");
    if (buildingFeatures) {
      buildingFeatures.value = property.Building_Features_Options_As_Text || "";
      if (typeof window.updateHiddenInputAndTrigger === "function") {
        window.updateHiddenInputAndTrigger();
      }
    }
  };

  const togglePropertySections = (hasProperty) => {
    const propertySections = document.querySelectorAll(
      ".properties-list-duplicate, [data-property-section]",
    );
    propertySections.forEach((section) => {
      section.classList.toggle("hidden", !hasProperty);
    });

    const container =
      document.getElementById("data-container") ||
      document.querySelector("[data-property-container]");
    let addButton = document.getElementById("addPropertyOnlyButton");
    if (!hasProperty) {
      if (!addButton && container) {
        addButton = document.createElement("button");
        addButton.type = "button";
        addButton.id = "addPropertyOnlyButton";
        addButton.className =
          "button-primary text-h3 cursor-pointer w-max";
        addButton.textContent = "Add Property";
        addButton.addEventListener("click", () => {
          setAlpineFlag("combinedPropertyEditModal", true);
        });
        container.prepend(addButton);
      }
    } else if (addButton) {
      addButton.remove();
    }
  };

  const clearFields = () => {
    setInputValue("#propertyuniqueid", "");
    setInputValue(".propertyname", "");
    setInputValue(".address1", "");
    setInputValue(".suburb", "");
    setInputValue(".postcode", "");
    const stateSelect = document.getElementById("stateCombined");
    if (stateSelect) {
      stateSelect.value = "";
      stateSelect.dispatchEvent(new Event("change"));
    }
    setInputValue(".unitno", "");
    setInputValue(".lotno", "");
  };

  const clearFieldsSingle = () => {
    setInputValue("#propertyuniqueidSingle", "");
    setInputValue(".propertynameSingle", "");
    setInputValue("#address", "");
    setInputValue("#suburbTown", "");
    setInputValue("#postalCode", "");
    const stateSelect = document.getElementById("state");
    if (stateSelect) {
      stateSelect.value = "";
      stateSelect.dispatchEvent(new Event("change"));
    }
    setInputValue("#unitNumber", "");
    setInputValue("#lotNumber", "");
    setInputValue("#country", "");
  };

  window.initAutocomplete = function initAutocomplete() {
    if (!window.google?.maps?.places?.Autocomplete) {
      return;
    }
    const autocomplete = new google.maps.places.Autocomplete(
      document.getElementById("autocomplete"),
      {
        types: ["geocode"],
        componentRestrictions: { country: "au" },
      },
    );
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) {
        return;
      }
      clearFields();
      let address1 = "";
      let address2 = "";
      let city = "";
      let state = "";
      let postcode = "";
      let lotno = "";
      let country = "";
      place.address_components.forEach((component) => {
        const types = component.types;
        if (types.includes("street_number")) {
          address1 = component.long_name;
        }
        if (types.includes("route")) {
          address1 += ` ${component.long_name}`;
        }
        if (types.includes("subpremise")) {
          address2 = component.long_name;
        } else if (types.includes("neighborhood") && !address2) {
          address2 = component.long_name;
        } else if (types.includes("sublocality_level_1") && !address2) {
          address2 = component.long_name;
        }
        if (types.includes("locality")) {
          city = component.long_name;
        }
        if (types.includes("administrative_area_level_1")) {
          state = component.short_name;
        }
        if (types.includes("postal_code")) {
          postcode = component.long_name;
        }
        if (types.includes("country")) {
          country = component.long_name;
        }
        if (types.includes("lot_number")) {
          lotno = component.long_name;
        }
      });
      const fullAddress = `${state}, ${postcode} ${city}, ${address1}, ${country}`;
      setInputValue(".propertyname", fullAddress);
      setInputValue(".address1", address1);
      setInputValue(".suburb", city);
      setInputValue(".postcode", postcode);
      const stateSelect = document.getElementById("stateCombined");
      if (stateSelect) {
        const stateOption = Array.from(stateSelect.options).find(
          (option) => option.text.toLowerCase() === state.toLowerCase(),
        );
        if (stateOption) {
          stateSelect.value = stateOption.value;
          stateSelect.dispatchEvent(new Event("change"));
        } else {
          stateSelect.value = "";
        }
      }
      setInputValue(".unitno", address2 || "");
      setInputValue(".lotno", lotno || "");
      let addressFound = false;
      const normalizedFullAddress = fullAddress.trim().toLowerCase();
      document
        .querySelectorAll(".property-list-wrapper .property-item")
        .forEach((property) => {
          const propertyName = property
            .getAttribute("data-name")
            .trim()
            .toLowerCase();
          if (propertyName === normalizedFullAddress) {
            addressFound = true;
            const uniqueId = property.getAttribute("data-id") || "";
            setInputValue("#propertyuniqueid", uniqueId);
          }
        });
      if (!addressFound) {
        setInputValue("#propertyuniqueid", "");
      }
    });
  };

  window.initAutocompleteSingle = function initAutocompleteSingle() {
    if (!window.google?.maps?.places?.Autocomplete) {
      return;
    }
    const autocompleteSingle = new google.maps.places.Autocomplete(
      document.getElementById("autocompleteSingle"),
      {
        types: ["geocode"],
        componentRestrictions: { country: "au" },
      },
    );
    autocompleteSingle.addListener("place_changed", () => {
      const place = autocompleteSingle.getPlace();
      if (!place.geometry) {
        return;
      }
      clearFieldsSingle();
      let address1 = "";
      let address2 = "";
      let city = "";
      let state = "";
      let postcode = "";
      let lotno = "";
      let country = "";
      let unitno = "";
      place.address_components.forEach((component) => {
        const types = component.types;
        if (types.includes("street_number")) {
          address1 = component.long_name;
        }
        if (types.includes("route")) {
          address1 += ` ${component.long_name}`;
        }
        if (types.includes("subpremise")) {
          address2 = component.long_name;
        } else if (types.includes("neighborhood") && !address2) {
          address2 = component.long_name;
        } else if (types.includes("sublocality_level_1") && !address2) {
          address2 = component.long_name;
        }
        if (types.includes("locality")) {
          city = component.long_name;
        }
        if (types.includes("administrative_area_level_1")) {
          state = component.short_name;
        }
        if (types.includes("postal_code")) {
          postcode = component.long_name;
        }
        if (types.includes("country")) {
          country = component.long_name;
        }
        if (types.includes("unit_number")) {
          unitno = component.long_name;
        }
        if (types.includes("lot_number")) {
          lotno = component.long_name;
        }
      });
      const fullAddress = `${lotno} ${unitno} ${state} ${postcode} ${city}, ${address1} ${address2}`;
      setInputValue(".propertynameSingle", fullAddress);
      setInputValue("#address", address1);
      setInputValue("#suburbTown", city);
      setInputValue("#postalCode", postcode);
      const stateSelectSingle = document.getElementById("state");
      if (stateSelectSingle) {
        const stateOption = Array.from(stateSelectSingle.options).find(
          (option) => option.text.toLowerCase() === state.toLowerCase(),
        );
        if (stateOption) {
          stateSelectSingle.value = stateOption.value;
          stateSelectSingle.dispatchEvent(new Event("change"));
        } else {
          stateSelectSingle.value = "";
        }
      }
      setInputValue("#unitNumber", address2 || "");
      setInputValue("#lotNumber", lotno || "");
      setInputValue("#country", country || "");
      let addressFound = false;
      const normalizedFullAddressSingle = fullAddress.trim().toLowerCase();
      document
        .querySelectorAll(".property-list-wrapperSingle div[data-name]")
        .forEach((property) => {
          const propertyName = property
            .getAttribute("data-name")
            .trim()
            .toLowerCase();
          if (propertyName === normalizedFullAddressSingle) {
            addressFound = true;
            const uniqueId = property.getAttribute("data-id") || "";
            setInputValue("#propertyuniqueidSingle", uniqueId);
          }
        });
      if (!addressFound) {
        setInputValue("#propertyuniqueidSingle", "");
      }
    });
  };

  const setupOwnerTypeToggles = () => {
    const ownerTypeCombinedSelect =
      document.getElementById("ownerTypeCombined");
    const ownerCompanyCombinedWrapper = document.querySelector(
      "#ownerCompanyCombinedWrapper",
    );
    const indOwnerCombinedWrapper = document.querySelector("#indOwnerWrapper");
    if (ownerTypeCombinedSelect && ownerCompanyCombinedWrapper && indOwnerCombinedWrapper) {
      const toggleCombinedOwnerFields = () => {
        const selectedValue = ownerTypeCombinedSelect.value;
        if (selectedValue === "Business") {
          ownerCompanyCombinedWrapper.classList.remove("hidden");
          indOwnerCombinedWrapper.classList.add("hidden");
        } else if (
          selectedValue === "Investor" ||
          selectedValue === "Owner Occupier"
        ) {
          ownerCompanyCombinedWrapper.classList.add("hidden");
          indOwnerCombinedWrapper.classList.remove("hidden");
        } else {
          ownerTypeCombinedSelect.value = "";
          ownerCompanyCombinedWrapper.classList.add("hidden");
          indOwnerCombinedWrapper.classList.add("hidden");
        }
      };
      toggleCombinedOwnerFields();
      ownerTypeCombinedSelect.addEventListener("change", toggleCombinedOwnerFields);
    }

    const ownerTypeSelect = document.getElementById("ownerType");
    const ownerCompany = document.querySelector(".ownerCompanyss");
    const individualOwners = document.querySelector(".individualOwnerss");
    const createContactBtn = document.querySelector(".createContactBtn");
    const createCompanyBtn = document.querySelector(".createCompanyBtn");
    if (ownerTypeSelect && ownerCompany && individualOwners) {
      const toggleOwnerFields = () => {
        const selectedValue = ownerTypeSelect.value;
        if (selectedValue === "Business") {
          ownerCompany.classList.remove("hidden");
          individualOwners.classList.add("hidden");
          createContactBtn?.classList.add("hidden");
          createCompanyBtn?.classList.remove("hidden");
        } else if (
          selectedValue === "Investor" ||
          selectedValue === "Owner Occupier"
        ) {
          ownerCompany.classList.add("hidden");
          individualOwners.classList.remove("hidden");
          createContactBtn?.classList.remove("hidden");
          createCompanyBtn?.classList.add("hidden");
        } else {
          ownerTypeSelect.value = "";
          ownerCompany.classList.add("hidden");
          individualOwners.classList.add("hidden");
        }
      };
      toggleOwnerFields();
      ownerTypeSelect.addEventListener("change", toggleOwnerFields);
    }
  };

  const fetchCompanies = async () => {
    const plugin = await getVitalStatsPlugin();
    const model = plugin.switchTo(COMPANY_MODEL);
    let query = model.query();
    query = query.deSelectAll().select(["id", "unique_id", "name"]);
    if (typeof query.include === "function") {
      query.include("Primary_Person", (q) => {
        q?.select?.(["email", "sms_number", "first_name", "last_name"]);
      });
    }
    query.getOrInitQueryCalc?.();
    const result = await query.fetchDirect().toPromise();
    return extractRecords(result);
  };

  const fetchContacts = async () => {
    const plugin = await getVitalStatsPlugin();
    const model = plugin.switchTo(CONTACT_MODEL);
    let query = model.query();
    query = query.deSelectAll().select([
      "id",
      "unique_id",
      "first_name",
      "last_name",
      "sms_number",
      "email",
    ]);
    query.getOrInitQueryCalc?.();
    const result = await query.fetchDirect().toPromise();
    return extractRecords(result);
  };

  const buildDropdownElement = ({
    input,
    dropdownId,
    createLabel,
    onCreate,
  }) => {
    if (!input || !input.parentElement) {
      return null;
    }
    let dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      return dropdown;
    }
    dropdown = document.createElement("ul");
    dropdown.id = dropdownId;
    dropdown.className =
      "absolute z-10 mt-1 hidden max-h-60 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-md";
    const createItem = document.createElement("li");
    createItem.className =
      "text-primary mx-auto flex w-full cursor-pointer items-center justify-center gap-3 text-nowrap p-3 text-center bg-primary text-white hover:bg-secondary";
    createItem.innerHTML =
      '<svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 1C6.07452 1 5.73077 1.34375 5.73077 1.76923V5.23077H1.76923C1.34375 5.23077 1 5.57452 1 6C1 6.42548 1.34375 6.76923 1.76923 6.76923H5.73077V10.2308C5.73077 10.6562 6.07452 11 6.5 11C6.92548 11 7.26923 10.6562 7.26923 10.2308V6.76923H11.2308C11.6562 6.76923 12 6.42548 12 6C12 5.57452 11.6562 5.23077 11.2308 5.23077H7.26923V1.76923C7.26923 1.34375 6.92548 1 6.5 1Z" fill="#FFFFFF"/></svg>';
    const label = document.createElement("div");
    label.textContent = createLabel;
    createItem.appendChild(label);
    createItem.addEventListener("click", (event) => {
      event.stopPropagation();
      onCreate?.();
    });
    dropdown.appendChild(createItem);
    input.parentElement.appendChild(dropdown);
    return dropdown;
  };

  const setupCompanySearchForElements = ({
    companySearchInput,
    companyDropdown,
    createButtonSelector,
    excludeSelector,
    companyPrimaryEmail,
    companyPrimaryMobile,
    companyPrimaryFirstName,
    companyPrimaryLastName,
    hiddenCompanyId,
    hiddenCompanyUId,
  }) => {
    if (!companySearchInput || !companyDropdown) {
      return;
    }
    let companyDebounceTimeout = null;
    let companyActiveIndex = -1;

    const clearCompanySearchResults = () => {
      while (companyDropdown.children.length > 1) {
        companyDropdown.removeChild(companyDropdown.lastChild);
      }
    };

    const renderCompanyDropdown = (companies, query) => {
      clearCompanySearchResults();
      const filteredCompanies = companies.filter((company) => {
        const name = company?.name ? company.name.toLowerCase() : "";
        return query ? name.includes(query.toLowerCase()) : false;
      });
      if (!filteredCompanies.length) {
        const noResult = document.createElement("li");
        noResult.classList.add(
          "text-gray-500",
          "px-4",
          "py-2",
          "cursor-default",
        );
        noResult.textContent = "No results found.";
        companyDropdown.appendChild(noResult);
        return;
      }
      filteredCompanies.forEach((company) => {
        const item = document.createElement("li");
        item.classList.add(
          "text-dark",
          "cursor-pointer",
          "hover:bg-gray-100",
          "px-4",
          "py-2",
        );
        const regex = new RegExp(`(${query})`, "gi");
        const highlightedName = (company.name || "").replace(
          regex,
          "<span class=\"font-semibold\">$1</span>",
        );
        const smsNumber = company?.Primary_Person?.sms_number || "N/A";
        item.innerHTML = `${highlightedName} (${smsNumber})`;
        item.addEventListener("click", () => {
          companySearchInput.value = company.name || "";
          if (companyPrimaryEmail) {
            companyPrimaryEmail.value = company?.Primary_Person?.email || "";
          }
          if (companyPrimaryMobile) {
            companyPrimaryMobile.value = company?.Primary_Person?.sms_number || "";
          }
          if (companyPrimaryFirstName) {
            companyPrimaryFirstName.value =
              company?.Primary_Person?.first_name || "";
          }
          if (companyPrimaryLastName) {
            companyPrimaryLastName.value =
              company?.Primary_Person?.last_name || "";
          }
          if (hiddenCompanyId) {
            hiddenCompanyId.value = company.id || "";
          }
          if (hiddenCompanyUId) {
            hiddenCompanyUId.value = company.unique_id || "";
          }
          companyDropdown.classList.add("hidden");
          companyActiveIndex = -1;
        });
        companyDropdown.appendChild(item);
      });
    };

    const updateCompanyActiveItem = (items) => {
      items.forEach((item, index) => {
        if (index === companyActiveIndex) {
          item.classList.add("bg-gray-100");
          item.scrollIntoView({ block: "nearest" });
        } else {
          item.classList.remove("bg-gray-100");
        }
      });
    };

    const handleCompanyInput = () => {
      const query = companySearchInput.value.trim();
      if (query === "") {
        companyDropdown.classList.add("hidden");
        clearCompanySearchResults();
        companyActiveIndex = -1;
        return;
      }
      clearTimeout(companyDebounceTimeout);
      companyDebounceTimeout = setTimeout(async () => {
        clearCompanySearchResults();
        const loadingItem = document.createElement("li");
        loadingItem.classList.add(
          "text-gray-500",
          "px-4",
          "py-2",
          "cursor-default",
        );
        loadingItem.textContent = "Loading...";
        companyDropdown.appendChild(loadingItem);
        companyDropdown.classList.remove("hidden");
        const companies = await fetchCompanies();
        renderCompanyDropdown(companies, query);
      }, 300);
    };

    companySearchInput.addEventListener("input", handleCompanyInput);
    document.addEventListener("click", (event) => {
      if (!companyDropdown.contains(event.target) && event.target !== companySearchInput) {
        companyDropdown.classList.add("hidden");
        companyActiveIndex = -1;
      }
    });
    const createNewCompanyBtn = createButtonSelector
      ? document.querySelector(createButtonSelector)
      : null;
    createNewCompanyBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      window.setPropertyModalReturnTarget?.("owner");
    });
    companySearchInput.addEventListener("keydown", (event) => {
      const items = companyDropdown.querySelectorAll(
        excludeSelector ? `li:not(${excludeSelector})` : "li",
      );
      if (companyDropdown.classList.contains("hidden") || !items.length) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        companyActiveIndex = (companyActiveIndex + 1) % items.length;
        updateCompanyActiveItem(items);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        companyActiveIndex =
          (companyActiveIndex - 1 + items.length) % items.length;
        updateCompanyActiveItem(items);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (companyActiveIndex >= 0 && companyActiveIndex < items.length) {
          items[companyActiveIndex].click();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        companyDropdown.classList.add("hidden");
        companyActiveIndex = -1;
      }
    });
    companySearchInput.addEventListener("blur", () => {
      setTimeout(() => {
        companyActiveIndex = -1;
      }, 100);
    });
  };

  const setupCompanySearch = () => {
    setupCompanySearchForElements({
      companySearchInput: document.getElementById("ownerCompany"),
      companyDropdown: document.getElementById("companyDropdown"),
      createButtonSelector: "#createNewCompanyButton",
      excludeSelector: "#createNewCompanyButton",
      companyPrimaryEmail: document.getElementById("residentEmail"),
      companyPrimaryMobile: document.getElementById("residentMobile"),
      companyPrimaryFirstName: document.getElementById("residentName"),
      companyPrimaryLastName: document.getElementById("residentName"),
      hiddenCompanyId: document.querySelector(".hiddenCompanyId"),
      hiddenCompanyUId: document.querySelector(".hiddenCompanyUId"),
    });

    const combinedInput = document.getElementById("ownerCompanyCombined");
    if (!combinedInput) {
      return;
    }
    let hiddenCompanyIdCombined =
      document.querySelector(".hiddenCompanyIdCombined");
    if (!hiddenCompanyIdCombined) {
      hiddenCompanyIdCombined = document.createElement("input");
      hiddenCompanyIdCombined.type = "text";
      hiddenCompanyIdCombined.className = "hidden hiddenCompanyIdCombined";
      combinedInput.parentElement?.prepend(hiddenCompanyIdCombined);
    }
    let hiddenCompanyUIdCombined =
      document.querySelector(".hiddenCompanyUIdCombined");
    if (!hiddenCompanyUIdCombined) {
      hiddenCompanyUIdCombined = document.createElement("input");
      hiddenCompanyUIdCombined.type = "text";
      hiddenCompanyUIdCombined.className = "hidden hiddenCompanyUIdCombined";
      combinedInput.parentElement?.prepend(hiddenCompanyUIdCombined);
    }
    const combinedDropdown = buildDropdownElement({
      input: combinedInput,
      dropdownId: "companyDropdownCombined",
      createLabel: "Create New Company",
      onCreate: () => {
        window.setPropertyModalReturnTarget?.("combined");
        setAlpineFlag("combinedPropertyEditModal", false);
        setAlpineFlag("addnewCompanyModal", true);
      },
    });
    setupCompanySearchForElements({
      companySearchInput: combinedInput,
      companyDropdown: combinedDropdown,
      createButtonSelector: null,
      excludeSelector: ":first-child",
      companyPrimaryEmail: document.getElementById("residentEmailCombined"),
      companyPrimaryMobile: document.getElementById("residentMobileCombined"),
      companyPrimaryFirstName: document.getElementById("residentNameCombined"),
      companyPrimaryLastName: document.getElementById("residentNameCombined"),
      hiddenCompanyId: hiddenCompanyIdCombined,
      hiddenCompanyUId: hiddenCompanyUIdCombined,
    });
  };

  const setupContactSearchForElements = ({
    searchInput,
    dropdown,
    residentName,
    residentMobile,
    residentEmail,
    hiddenIndOwnerId,
    hiddenIndOwnerUId,
    createButtonSelector,
  }) => {
    if (!searchInput || !dropdown) {
      return;
    }
    let debounceTimeout = null;

    const clearSearchResults = () => {
      while (dropdown.children.length > 1) {
        dropdown.removeChild(dropdown.lastChild);
      }
    };

    const renderDropdown = (contacts, query) => {
      clearSearchResults();
      const filteredContacts = contacts.filter((contact) => {
        const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`
          .toLowerCase();
        return fullName.includes(query.toLowerCase());
      });
      if (!filteredContacts.length) {
        const noResult = document.createElement("li");
        noResult.classList.add(
          "text-gray-500",
          "px-4",
          "py-2",
          "cursor-default",
        );
        noResult.textContent = "No results found.";
        dropdown.appendChild(noResult);
        return;
      }
      filteredContacts.forEach((contact) => {
        const item = document.createElement("li");
        item.classList.add(
          "text-dark",
          "cursor-pointer",
          "hover:bg-gray-100",
          "px-4",
          "py-2",
        );
        item.textContent = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
        item.addEventListener("click", () => {
          searchInput.value = item.textContent;
          if (residentName) {
            residentName.value = item.textContent;
          }
          if (residentMobile) {
            residentMobile.value = contact.sms_number || "";
          }
          if (residentEmail) {
            residentEmail.value = contact.email || "";
          }
          if (hiddenIndOwnerId) {
            hiddenIndOwnerId.value = contact.id || "";
          }
          if (hiddenIndOwnerUId) {
            hiddenIndOwnerUId.value = contact.unique_id || "";
          }
          dropdown.classList.add("hidden");
        });
        dropdown.appendChild(item);
      });
    };

    const handleInput = () => {
      const query = searchInput.value.trim();
      if (query === "") {
        dropdown.classList.add("hidden");
        clearSearchResults();
        return;
      }
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(async () => {
        const contacts = await fetchContacts();
        renderDropdown(contacts, query);
        dropdown.classList.remove("hidden");
      }, 300);
    };

    searchInput.addEventListener("input", handleInput);
    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target) && event.target !== searchInput) {
        dropdown.classList.add("hidden");
      }
    });
    const createBtn = createButtonSelector
      ? document.querySelector(createButtonSelector)
      : null;
    createBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      window.setPropertyModalReturnTarget?.("owner");
    });
  };

  const setupContactSearch = () => {
    setupContactSearchForElements({
      searchInput: document.getElementById("individualOwners"),
      dropdown: document.getElementById("clientIndDropdown"),
      residentName: document.getElementById("residentName"),
      residentMobile: document.getElementById("residentMobile"),
      residentEmail: document.getElementById("residentEmail"),
      hiddenIndOwnerId: document.querySelector(".hiddenIndOwnerId"),
      hiddenIndOwnerUId: document.querySelector(".hiddenIndOwnerUId"),
      createButtonSelector: "#createIndButton",
    });

    const combinedInput = document.getElementById("indOwner");
    if (!combinedInput) {
      return;
    }
    let hiddenIndOwnerIdCombined =
      document.querySelector(".hiddenIndOwnerIdCombined");
    if (!hiddenIndOwnerIdCombined) {
      hiddenIndOwnerIdCombined = document.createElement("input");
      hiddenIndOwnerIdCombined.type = "text";
      hiddenIndOwnerIdCombined.className = "hidden hiddenIndOwnerIdCombined";
      combinedInput.parentElement?.prepend(hiddenIndOwnerIdCombined);
    }
    let hiddenIndOwnerUIdCombined =
      document.querySelector(".hiddenIndOwnerUIdCombined");
    if (!hiddenIndOwnerUIdCombined) {
      hiddenIndOwnerUIdCombined = document.createElement("input");
      hiddenIndOwnerUIdCombined.type = "text";
      hiddenIndOwnerUIdCombined.className = "hidden hiddenIndOwnerUIdCombined";
      combinedInput.parentElement?.prepend(hiddenIndOwnerUIdCombined);
    }
    const combinedDropdown = buildDropdownElement({
      input: combinedInput,
      dropdownId: "clientIndDropdownCombined",
      createLabel: "Create New Contact",
      onCreate: () => {
        window.setPropertyModalReturnTarget?.("combined");
        setAlpineFlag("combinedPropertyEditModal", false);
        setAlpineFlag("newClientModal", true);
      },
    });
    setupContactSearchForElements({
      searchInput: combinedInput,
      dropdown: combinedDropdown,
      residentName: document.getElementById("residentNameCombined"),
      residentMobile: document.getElementById("residentMobileCombined"),
      residentEmail: document.getElementById("residentEmailCombined"),
      hiddenIndOwnerId: hiddenIndOwnerIdCombined,
      hiddenIndOwnerUId: hiddenIndOwnerUIdCombined,
      createButtonSelector: null,
    });
  };

  const setupBuildingFeatures = () => {
    const buildingFeatures = {
      697: "Wood & Brick",
      698: "Wood",
      699: "Warehouse",
      700: "Unit Block",
      701: "Town house",
      702: "Tile Roof",
      703: "Super 6 / Fibro roof",
      704: "Sloping Block",
      705: "Raked Ceiling",
      706: "Queenslander",
      707: "PostWar",
      708: "Lowset",
      709: "Iron Roof",
      710: "Highset",
      711: "Flat Roof",
      712: "Concrete",
      713: "Brick",
    };
    const comboboxButton = document.getElementById("comboboxButton");
    const featuresList = document.getElementById("featuresList");
    const comboboxLabel = document.getElementById("comboboxLabel");
    const hiddenInput = document.getElementById("buildingFeatures");
    if (!comboboxButton || !featuresList || !comboboxLabel || !hiddenInput) {
      return;
    }
    let isOpen = false;
    let selectedOptions = [];
    let isProgrammaticChange = false;

    const toggleDropdown = () => {
      isOpen = !isOpen;
      featuresList.classList.toggle("hidden", !isOpen);
      comboboxButton.setAttribute("aria-expanded", String(isOpen));
    };
    const closeDropdown = () => {
      isOpen = false;
      featuresList.classList.add("hidden");
      comboboxButton.setAttribute("aria-expanded", "false");
    };
    const updateSelectedFeaturesDisplay = () => {
      if (selectedOptions.length > 0) {
        comboboxLabel.textContent = selectedOptions
          .map((value) => `${buildingFeatures[value]}`)
          .join(", ");
        hiddenInput.value = `*/${selectedOptions.map((value) => `*${value}*`).join("/") }/*`;
      } else {
        comboboxLabel.textContent = "Please Select";
        hiddenInput.value = "";
      }
    };
    const handleOptionToggle = (event) => {
      if (isProgrammaticChange) {
        return;
      }
      const checkbox = event.target;
      const value = checkbox.value;
      if (checkbox.checked) {
        if (!selectedOptions.includes(value)) {
          selectedOptions.push(value);
        }
      } else {
        selectedOptions = selectedOptions.filter((opt) => opt !== value);
      }
      updateSelectedFeaturesDisplay();
    };
    const createCheckboxOption = (value, label) => {
      const li = document.createElement("li");
      li.className =
        "px-4 py-2 cursor-pointer hover:bg-gray-300 flex items-center gap-2";
      li.setAttribute("role", "option");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `checkboxOption${value}`;
      checkbox.value = value;
      checkbox.className =
        "!size-[16px] !opacity-100 !pointer-events-auto !relative text-primary focus:ring-primary border-[#D3D7E2] !rounded cursor-pointer";
      checkbox.addEventListener("change", handleOptionToggle);
      const labelElem = document.createElement("label");
      labelElem.setAttribute("for", `checkboxOption${value}`);
      labelElem.className = "text-bodyText text-dark size-full";
      labelElem.textContent = `${label}`;
      li.appendChild(checkbox);
      li.appendChild(labelElem);
      li.setAttribute("tabindex", "0");
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          checkbox.checked = !checkbox.checked;
          handleOptionToggle({ target: checkbox });
        }
      });
      return li;
    };
    const populateDropdown = () => {
      Object.entries(buildingFeatures).forEach(([value, label]) => {
        const optionElem = createCheckboxOption(value, label);
        featuresList.appendChild(optionElem);
      });
    };

    comboboxButton.addEventListener("click", toggleDropdown);
    comboboxButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleDropdown();
        const firstCheckbox = featuresList.querySelector("input[type=\"checkbox\"]");
        if (firstCheckbox) {
          firstCheckbox.focus();
        }
      }
    });
    document.addEventListener("click", (event) => {
      const isClickInside =
        comboboxButton.contains(event.target) || featuresList.contains(event.target);
      if (!isClickInside) {
        closeDropdown();
      }
    });
    featuresList.addEventListener("keydown", (e) => {
      const focusableItems = Array.from(featuresList.querySelectorAll("li"));
      const currentIndex = focusableItems.findIndex((li) =>
        li.contains(document.activeElement),
      );
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % focusableItems.length;
        focusableItems[nextIndex].querySelector("input[type=\"checkbox\"]").focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + focusableItems.length) % focusableItems.length;
        focusableItems[prevIndex].querySelector("input[type=\"checkbox\"]").focus();
      } else if (e.key === "Escape") {
        closeDropdown();
        comboboxButton.focus();
      }
    });
    hiddenInput.addEventListener("change", () => {
      let value = hiddenInput.value;
      if (!value.startsWith("*/") || !value.endsWith("/*")) {
        return;
      }
      value = value.slice(2, -2);
      const parts = value.split("/");
      const newSelectedValues = parts
        .map((part) => (part.startsWith("*") && part.endsWith("*") ? part.slice(1, -1) : null))
        .filter((val) => val !== null);
      isProgrammaticChange = true;
      selectedOptions = newSelectedValues;
      featuresList.querySelectorAll("input[type=\"checkbox\"]").forEach((checkbox) => {
        checkbox.checked = selectedOptions.includes(checkbox.value);
      });
      isProgrammaticChange = false;
      updateSelectedFeaturesDisplay();
    });
    populateDropdown();
  };

  window.toggleBuildingIsTwoStoreyCombined = () => {
    const unchecked = document.getElementById("buildingIsTwoStoreyUncheckedCombined");
    const checked = document.getElementById("buildingIsTwoStoreyCheckedCombined");
    if (!unchecked || !checked) {
      return;
    }
    const isChecked = unchecked.classList.contains("hidden");
    unchecked.classList.toggle("hidden", !isChecked);
    checked.classList.toggle("hidden", isChecked);
  };

  window.toggleBuildingIsTwoStorey = () => {
    const unchecked = document.getElementById("manholeUnchecked");
    const checked = document.getElementById("manholeChecked");
    if (!unchecked || !checked) {
      return;
    }
    const isChecked = unchecked.classList.contains("hidden");
    unchecked.classList.toggle("hidden", !isChecked);
    checked.classList.toggle("hidden", isChecked);
  };

  window.updateHiddenInputAndTrigger = () => {
    const hiddenInput2 = document.getElementById("buildingFeatures");
    if (hiddenInput2) {
      hiddenInput2.dispatchEvent(new Event("change"));
    }
  };

  // Memo section (moved from memos.html)
  const toEpochSeconds = (value) => {
    if (!value && value !== 0) {
      return null;
    }
    if (typeof value === "number") {
      return value > 1e12 ? Math.floor(value / 1000) : value;
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
    return null;
  };

  const formatTime = (timestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const timeValue = toEpochSeconds(timestamp);
    if (!timeValue) {
      return "Just now";
    }
    const diffInSeconds = now - timeValue;
    const intervals = [
      { label: "second", seconds: 1 },
      { label: "minute", seconds: 60 },
      { label: "hour", seconds: 3600 },
      { label: "day", seconds: 86400 },
      { label: "month", seconds: 2592000 },
      { label: "year", seconds: 31536000 },
    ];
    for (let i = intervals.length - 1; i >= 0; i--) {
      const interval = intervals[i];
      const intervalCount = Math.floor(diffInSeconds / interval.seconds);
      if (intervalCount >= 1) {
        const plural = intervalCount > 1 ? "s" : "";
        return `${intervalCount} ${interval.label}${plural} ago`;
      }
    }
    return "Just now";
  };

  const formatRelativeTime = (timestamp) => {
    const now = Date.now();
    const timeValue = toEpochSeconds(timestamp);
    const past = timeValue ? timeValue * 1000 : now;
    const diffMs = now - past;
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) return `${seconds} sec ago`;
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${days} days ago`;
  };

  const memoAuthorId = authorId;
  const memoAuthorFirstName = authorFirstName;
  const memoAuthorLastName = authorLastName;
  const memoAuthorProfileImage = authorProfileImage;
  let memoJobId = jobId;
  let commentQueue = [];
  let isProcessingCommentQueue = false;
  const DEFAULT_AUTHOR_PHOTO =
    "https://file.ontraport.com/media/41ca85f5cdde4c12bf72c2c73747633f.phpkeya0n?Expires=4884400377&Signature=SnfrlziQIcYSbZ98OrH2guVWpO4BRcxatgk3lM~-mKaAencWy7e1yIuxDT4hQjz0hFn-fJ118InfvymhaoqgGxn63rJXeqJKB4JTkYauub5Jh5UO3z6S0o~RVMj8AMzoiImsvQoPuRK7KnuOAsGiVEmSsMHEiM69IWzi4dW~6pryIMSHQ9lztg1powm8b~iXUNG8gajRaQWxlTiSyhh-CV-7zkF-MCP5hf-3FAKtGEo79TySr5SsZApLjfOo-8W~F8aeXK8BGD3bX6T0U16HsVeu~y9gDCZ1lBbLZFh8ezPL~4gktRbgP59Us8XLyV2EKn6rVcQCsVVUk5tUVnaCJw__&Key-Pair-Id=APKAJVAAMVW6XQYWSTNA";

  const fetchPosts = async () => {
    if (!memoJobId) {
      console.error("Job ID is not set.");
      return [];
    }
    try {
      const plugin = await window.getVitalStatsPlugin();
      const model = plugin.switchTo("PeterpmForumPost");
      let query = model.query();
      query = query.where("related_inquiry_id", memoJobId);
      query = query.deSelectAll().select([
        "id",
        "post_title",
        "post_copy",
        "created_at",
        "number_of_replies",
        "post_image",
      ]);
      if (typeof query.include === "function") {
        query.include("Author", (q) => {
          q?.select?.(["first_name", "last_name", "profile_image"]);
        });
      }
      query.getOrInitQueryCalc?.();
      const data = await query.fetchDirect().toPromise();
      const posts = extractRecords(data);
      posts.sort((a, b) => b.created_at - a.created_at);
      return posts.map((post) => {
        const postId = post.id ?? post.ID ?? post.unique_id ?? post.Unique_ID;
        const postCopy =
          post.post_copy ??
          post.Post_Copy ??
          (post.post_copy === "" ? "" : null);
        const author =
          post.Author ||
          post.author ||
          {
            first_name: post.Author_First_Name,
            last_name: post.Author_Last_Name,
            profile_image: post.Author_Profile_Image,
          };
        return {
          id: postId,
          post_title: post.post_title || post.Post_Title || "Untitled Post",
          description:
            postCopy !== null && postCopy !== undefined
              ? postCopy
              : "No description available.",
          authorName: `${author?.first_name || "Unknown"} ${author?.last_name || "Author"}`,
          image: author?.profile_image || DEFAULT_AUTHOR_PHOTO,
          createdDate:
            formatTime(post.created_at ?? post.Date_Added) || "Unknown Date",
          number_of_replies:
            post.number_of_replies ??
            post.Number_of_Replies ??
            0,
        };
      });
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const buttonFunctionalityInitialization = async (postsContainer) => {
    postsContainer.querySelectorAll(".commentBtn").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const postId = event.currentTarget.dataset.postid;
        const commentsContainer = document.querySelector(
          `[data-comments-container="${postId}"]`,
        );
        const commentTitle = commentsContainer?.querySelector(".commentTitle");
        const commentForm = commentsContainer?.querySelector(
          `[data-comment-form="${postId}"]`,
        );
        if (!commentsContainer) {
          return;
        }
        if (!commentsContainer.classList.contains("hidden")) {
          commentsContainer.classList.add("hidden");
          if (commentTitle) commentTitle.classList.add("hidden");
          if (commentForm) commentForm.classList.add("hidden");
          return;
        }
        commentsContainer.classList.remove("hidden");
        if (commentTitle) commentTitle.classList.remove("hidden");
        if (commentForm) commentForm.classList.remove("hidden");
        const comments = await fetchComments(postId);
        renderComments(comments, postId);
      });
    });
  };

  const createCommentsContainer = (postId) => {
    const container = document.createElement("div");
    container.className = "comments-container mb-4 mt-4 hidden w-full";
    container.setAttribute("data-comments-container", postId);

    const title = document.createElement("span");
    title.className = "text-h2 text-complementary commentTitle hidden";
    title.textContent = "Comments";
    container.appendChild(title);

    const form = document.createElement("form");
    form.className = "comment-form mt-4 flex flex-col gap-4 hidden rounded";
    form.setAttribute("data-comment-form", postId);
    const textarea = document.createElement("textarea");
    textarea.className =
      "mention-textarea w-full rounded border border-[#d3d7e2] p-2";
    textarea.placeholder = "Submit your comment...";
    textarea.required = true;
    const btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "button-primary mr-auto w-min text-nowrap";
    btn.textContent = "Post Comment";
    form.appendChild(textarea);
    form.appendChild(btn);
    container.appendChild(form);

    return container;
  };

  const createPostElement = (post) => {
    const postEl = document.createElement("div");
    postEl.className =
      "post post-container flex gap-6 rounded-lg border border-[#d3d7e2] bg-white p-6";
    postEl.setAttribute("data-post-id", post.id);

    const avatar = document.createElement("img");
    avatar.src = post.image || DEFAULT_AUTHOR_PHOTO;
    avatar.alt = "Post Image";
    avatar.className = "h-[40px] w-[40px] rounded-full";
    postEl.appendChild(avatar);

    const content = document.createElement("div");
    content.className = "flex w-full flex-col items-start gap-[8px]";

    const header = document.createElement("div");
    header.className = "flex flex-col items-start gap-[10px]";
    const authorRow = document.createElement("div");
    authorRow.className = "flex items-center gap-2";
    const authorName = document.createElement("div");
    authorName.className =
      "font-['Inter'] text-sm font-medium leading-[14px] text-[#414042]";
    authorName.textContent = post.authorName || "Unknown Author";
    const createdDate = document.createElement("div");
    createdDate.className =
      "font-['Inter'] text-xs font-normal leading-3 text-[#626c87]";
    createdDate.textContent = post.createdDate || "Unknown Date";
    authorRow.appendChild(authorName);
    authorRow.appendChild(createdDate);

    const description = document.createElement("div");
    description.className =
      "font-['Inter'] text-sm font-normal leading-tight text-[#626c87]";
    description.textContent = post.description || "";

    header.appendChild(authorRow);
    header.appendChild(description);
    content.appendChild(header);

    const commentBtn = document.createElement("div");
    commentBtn.className =
      "commentBtn commentCount cursor-pointer font-['Inter'] text-xs font-normal leading-3 text-[#003882]";
    commentBtn.dataset.postid = post.id;
    const countWrap = document.createElement("span");
    const count = document.createElement("span");
    count.setAttribute("data-comments-count", post.id);
    count.textContent = "0";
    countWrap.appendChild(count);
    countWrap.appendChild(document.createTextNode(" Comments"));
    commentBtn.appendChild(countWrap);
    content.appendChild(commentBtn);

    content.appendChild(createCommentsContainer(post.id));
    postEl.appendChild(content);
    return postEl;
  };

  const renderPosts = async (posts) => {
    const postsContainer = document.getElementById("postsContainer");
    if (!postsContainer) {
      return;
    }
    postsContainer.innerHTML = "";
    posts.forEach((post) => {
      postsContainer.appendChild(createPostElement(post));
    });
    await buttonFunctionalityInitialization(postsContainer);
    posts.forEach(async (post) => {
      const comments = await fetchComments(post.id);
      const commentsCountDiv = document.querySelector(
        `[data-comments-count="${post.id}"]`,
      );
      if (commentsCountDiv) {
        commentsCountDiv.textContent = comments.length;
      }
    });
  };

  const displayErrorMessage = (message) => {
    const postsContainer = document.getElementById("postsContainer");
    if (postsContainer) {
      postsContainer.innerHTML = "";
    }
  };

  const toggleLoadingSpinner = (isLoading) => {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.classList.toggle("hidden", !isLoading);
    }
  };

  const initializePosts = async () => {
    toggleLoadingSpinner(true);
    try {
      const posts = await fetchPosts();
      const postCount = posts.length || 0;
      if (posts.length) {
        await renderPosts(posts);
        const postNumbers = document.getElementById("postNumbers");
        if (postNumbers) {
          postNumbers.textContent = `(${postCount})`;
        }
      } else {
        displayErrorMessage("No posts found.");
      }
    } finally {
      toggleLoadingSpinner(false);
    }
  };
  window.initializePosts = initializePosts;

  const fetchComments = async (postId) => {
    try {
      const plugin = await window.getVitalStatsPlugin();
      const model = plugin.switchTo("PeterpmForumComment");
      let query = model.query();
      query = query.where("forum_post_id", postId);
      query = query.deSelectAll().select([
        "id",
        "comment",
        "created_at",
        "forum_post_id",
        "reply_to_comment_id",
      ]);
      if (typeof query.include === "function") {
        query.include("Author", (q) => {
          q?.select?.(["first_name", "last_name", "profile_image"]);
        });
      }
      query.getOrInitQueryCalc?.();
      const data = await query.fetchDirect().toPromise();
      let comments = extractRecords(data);
      comments.sort((a, b) => b.created_at - a.created_at);
      const commentsCountDiv = document.querySelector(
        `[data-comments-count="${postId}"]`,
      );
      if (commentsCountDiv) {
        commentsCountDiv.textContent = comments.length || 0;
      }
      return comments;
    } catch (error) {
      return {};
    }
  };

  const createCommentElement = (comment) => {
    const row = document.createElement("div");
    row.className = "comment mb-8 mt-4 flex gap-6";
    row.setAttribute("data-comment-id", comment.id);

    const avatar = document.createElement("img");
    avatar.className = "authorImage h-[30px] w-[30px] rounded-full";
    avatar.alt = "Post Image";
    avatar.src = comment.authorProfileImage || DEFAULT_AUTHOR_PHOTO;
    row.appendChild(avatar);

    const content = document.createElement("div");
    content.className = "flex flex-col items-start gap-[10px]";

    const header = document.createElement("div");
    header.className = "flex items-center gap-2";
    const name = document.createElement("div");
    name.className =
      "authorName font-['Inter'] text-sm font-medium leading-[14px] text-[#414042]";
    name.textContent = comment.authorName || "Unknown Author";
    const created = document.createElement("div");
    created.className =
      "font-['Inter'] text-xs font-normal leading-3 text-[#626c87]";
    created.textContent = comment.createdAt || "Unknown Date";
    const processing = document.createElement("div");
    processing.className = "processingText mr-auto";
    header.appendChild(name);
    header.appendChild(created);
    header.appendChild(processing);

    const body = document.createElement("div");
    body.className =
      "font-['Inter'] text-sm font-normal leading-tight text-[#626c87]";
    body.textContent = comment.comment || "";

    content.appendChild(header);
    content.appendChild(body);
    row.appendChild(content);
    return row;
  };

  const renderComments = (comments, postId) => {
    const commentsContainer = document.querySelector(
      `[data-comments-container="${postId}"]`,
    );
    if (!commentsContainer) return;
    commentsContainer.innerHTML = "";
    const title = document.createElement("span");
    title.className = "text-h2 text-complementary commentTitle";
    title.textContent = "Comments";
    commentsContainer.appendChild(title);
    const form = createCommentsContainer(postId).querySelector("form");
    if (form) {
      form.classList.remove("hidden");
      commentsContainer.appendChild(form);
    }
    comments.forEach((comment) => {
      const author =
        comment.Author ||
        comment.author ||
        {
          first_name: comment.Author_First_Name,
          last_name: comment.Author_Last_Name,
          profile_image: comment.Author_Profile_Image,
        };
      const commentText = comment.comment ?? comment.Comment ?? "";
      commentsContainer.appendChild(
        createCommentElement({
          id: comment.id ?? comment.ID ?? comment.unique_id ?? comment.Unique_ID,
          comment: commentText,
          authorName:
            `${author?.first_name || ""} ${author?.last_name || ""}`.trim() ||
            "Unknown Author",
          authorProfileImage: author?.profile_image || DEFAULT_AUTHOR_PHOTO,
          createdAt:
            formatTime(comment.created_at ?? comment.Date_Added) ||
            "Unknown Date",
        }),
      );
    });
    commentsContainer.classList.remove("hidden");
  };

  const addCommentToDOM = (comment, postId) => {
    const commentsContainer = document.querySelector(
      `[data-comments-container="${postId}"]`,
    );
    if (!commentsContainer) {
      return;
    }
    const el = createCommentElement({
      id: comment.id,
      comment: comment.comment,
      authorName: `${memoAuthorFirstName} ${memoAuthorLastName}`,
      authorProfileImage: memoAuthorProfileImage || DEFAULT_AUTHOR_PHOTO,
      createdAt: comment.createdAt,
    });
    const processing = el.querySelector(".processingText");
    if (processing) {
      processing.innerText = "Posting...";
    }
    const thirdChild = commentsContainer.children[2];
    if (thirdChild) {
      commentsContainer.insertBefore(el, thirdChild);
    } else {
      commentsContainer.appendChild(el);
    }
    commentsContainer.classList.remove("hidden");
    return el;
  };

  const processCommentQueue = async () => {
    if (isProcessingCommentQueue) return;
    isProcessingCommentQueue = true;
    while (commentQueue.length > 0) {
      const { postId, commentText, target } = commentQueue.shift();
      try {
        const payload = {
          comment: commentText,
          author_id: memoAuthorId,
          forum_post_id: postId,
        };
        const plugin = await window.getVitalStatsPlugin();
        const model = plugin.switchTo("PeterpmForumComment");
        const mutation = model.mutation();
        mutation.createOne(payload);
        await mutation.execute(true).toPromise();
        target.querySelector(".processingText").innerText = "";
      } catch (error) {
        target.querySelector(".processingText").innerText = "Failed";
      }
    }
    isProcessingCommentQueue = false;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const submitMemo = document.getElementById("submitMemo");
    if (submitMemo) {
      submitMemo.addEventListener("click", async () => {
        const submitButton = submitMemo;
        const memoInput = document.querySelector("#memoInput");
        if (!memoInput) {
          return;
        }
        const postCopy = memoInput.value;
        memoInput.setAttribute("disabled", true);
        memoInput.classList.add("opacity-50", "cursor-not-allowed");
        if (!postCopy || postCopy === "Write a memo...") {
          memoInput.removeAttribute("disabled");
          memoInput.classList.remove("opacity-50", "cursor-not-allowed");
          return;
        }
        const payload = {
          author_id: memoAuthorId,
          post_copy: postCopy,
          created_at: new Date().toISOString(),
          related_inquiry_id: memoJobId,
        };
        try {
          submitButton.innerHTML = "Posting...";
          submitButton.classList.add("opacity-50", "cursor-not-allowed");
          const plugin = await window.getVitalStatsPlugin();
          const model = plugin.switchTo("PeterpmForumPost");
          const mutation = model.mutation();
          mutation.createOne(payload);
          await mutation.execute(true).toPromise();
          memoInput.value = "";
          memoInput.removeAttribute("disabled");
          memoInput.classList.remove("opacity-50", "cursor-not-allowed");
          await initializePosts();
        } catch (error) {
          console.error(error);
        } finally {
          submitButton.innerHTML = "Post New Memo";
          submitButton.style.pointerEvents = "auto";
        }
      });
    }

    document.addEventListener("submit", async (event) => {
      if (event.target.classList.contains("comment-form")) {
        event.preventDefault();
        const form = event.target;
        const postId = form.dataset.commentForm;
        const textarea = form.querySelector(".mention-textarea");
        const commentText = textarea.value.trim();
        if (!commentText) {
          return;
        }
        const comment = {
          id: `temp_${Date.now()}`,
          comment: commentText,
          author_id: memoAuthorId,
          profilePhoto: memoAuthorProfileImage,
          forum_post_id: postId,
          createdAt: formatRelativeTime(new Date()),
        };
        const commentEl = addCommentToDOM(comment, postId);
        textarea.value = "";
        commentQueue.push({ postId, commentText, target: commentEl });
        processCommentQueue();
      }
    });

    const callMemo = document.getElementById("callMemo");
    if (callMemo) {
      callMemo.addEventListener("click", () => {
        initializePosts();
      });
    }

    const inputs = document.querySelectorAll(".addUIDOnLoad");
    inputs.forEach((input) => {
      input.value = propertyUniqueID;
    });
    if (typeof window.initAutocompleteSingle === "function") {
      window.initAutocompleteSingle();
    }
    if (typeof window.initAutocomplete === "function") {
      window.initAutocomplete();
    }
    fetchCalcProperties();
    setupOwnerTypeToggles();
    setupCompanySearch();
    setupContactSearch();
    setupBuildingFeatures();
  });
})();
