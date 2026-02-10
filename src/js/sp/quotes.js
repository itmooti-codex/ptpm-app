function resetForm() {
  const form = document.querySelector("#createQuote");
  const contactFields = document.querySelector("#contactFields");
  const companyFields = document.querySelector("#companyFields");

  form.reset();
  contactFields.classList.add("hidden");
  companyFields.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.querySelector(".dateTimeScheduleInquiry");
  if (dateInput) {
    const today = new Date();
    const formattedDate = today.toISOString().slice(0, 10);
    dateInput.value = formattedDate;
  }
});

const accountType = document.getElementById("accountType");
const contactFields = document.getElementById("contactFields");
const companyFields = document.getElementById("companyFields");
const newContactFields = document.getElementById("newContactFields");
const newCompanyFields = document.getElementById("newCompanyFields");
const addNewContact = document.getElementById("addNewContact");
const addNewCompany = document.getElementById("addNewCompany");

accountType.addEventListener("change", (e) => {
  contactFields.classList.add("hidden");
  companyFields.classList.add("hidden");
  if (e.target.value === "Contact") {
    contactFields.classList.remove("hidden");
  } else if (e.target.value === "Company") {
    companyFields.classList.remove("hidden");
  }
});

addNewContact.addEventListener("click", () => {
  newContactFields.classList.remove("hidden");
});

addNewCompany.addEventListener("click", () => {
  newCompanyFields.classList.remove("hidden");
});

// Client contact inputs
const clientContactFirstNameInput = document.querySelector(
  ".clientContactFirstName input"
);
const clientContactLastNameInput = document.querySelector(
  ".clientContactLastName input"
);
const clientContactEmailInput = document.querySelector(
  ".clientContactEmail input"
);
const clientContactSMSInput = document.querySelector(".clientContactSMS input");
const clientContactUniqueIDInput = document.querySelector(
  ".clientContactUniqueID input"
);
const clientQuoteDateInput = document.querySelector(
  '#o070b64683805-f3151_fulldate[type="hidden"]'
);

// Company inputs
const companyNameInput = document.querySelector(".companyName input");
const companyUniqueIDInput = document.querySelector(".companyUniqueID input");
const companyQuoteDateInput = document.querySelector(
  '#obc37ec5c9425-f3151_fulldate[type="hidden"]'
);

let searchTimeout;
let cachedData = { contacts: [], companies: [] };

// Debounce function for search
const debounceSearch = (query, type) => {
  clearTimeout(searchTimeout);
  if (query.trim() === "") {
    hideSuggestions(type);
    return;
  }
  searchTimeout = setTimeout(() => fetchData(query, type), 300);
};

// Fetch data based on type
const fetchData = async (query, type) => {
  const queries = {
    contacts: `
        query calcContacts {
          calcContacts(limit: 5000, offset: 0) {
            First_Name: field(arg: ["first_name"])
            Last_Name: field(arg: ["last_name"])
            Unique_ID: field(arg: ["unique_id"])
			Email: field(arg: ["email"])
    		SMS_Number: field(arg: ["sms_number"])
          }
        }
      `,
    companies: `
        query calcCompanies {
          calcCompanies(limit: 5000, offset: 0) {
            Name: field(arg: ["name"])
            Unique_ID: field(arg: ["unique_id"])
          }
        }
      `,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": API_KEY,
      },
      body: JSON.stringify({ query: queries[type] }),
    });

    const result = await response.json();
    if (response.ok && result.data) {
      cachedData[type] =
        type === "contacts"
          ? result.data.calcContacts
          : result.data.calcCompanies;
      filterAndDisplay(query, type);
    } else {
      console.error("Error fetching data:", result.errors || result);
    }
  } catch (error) {
    console.error("Fetch failed:", error);
  }
};

// Filter and display suggestions
const filterAndDisplay = (query, type) => {
  const data = cachedData[type];
  const filtered = data.filter((item) => {
    const name =
      type === "contacts"
        ? `${item.First_Name || ""} ${item.Last_Name || ""}`
        : item.Name || "";
    return name.toLowerCase().includes(query.toLowerCase());
  });

  displaySuggestions(filtered, type);
};

// Display suggestions
const displaySuggestions = (items, type) => {
  const suggestionBoxId =
    type === "contacts" ? "contactSuggestions" : "companySuggestions";
  const suggestionBox = document.getElementById(suggestionBoxId);
  if (!suggestionBox) {
    console.error(`${type} suggestion box not found.`);
    return;
  }

  suggestionBox.innerHTML = "";
  if (items.length === 0) {
    suggestionBox.classList.add("hidden");
    return;
  }

  items.slice(0, 5).forEach((item) => {
    const suggestion = document.createElement("div");
    suggestion.className = "p-2 hover:bg-neutral-200 cursor-pointer rounded-md";
    const name =
      type === "contacts" ? `${item.First_Name} ${item.Last_Name}` : item.Name;
    suggestion.textContent = name;
    suggestion.dataset.uniqueId = item.Unique_ID;
    suggestion.dataset.fName = item.First_Name;
    suggestion.dataset.lName = item.Last_Name;
    suggestion.dataset.sms = item.SMS_Number;
    suggestion.dataset.email = item.Email;
    suggestion.dataset.name = item.Name;
    suggestion.addEventListener("click", () => selectItem(item, type));
    suggestionBox.appendChild(suggestion);
  });

  suggestionBox.classList.remove("hidden");
};

// Hide suggestions
const hideSuggestions = (type) => {
  const suggestionBoxId =
    type === "contacts" ? "contactSuggestions" : "companySuggestions";
  const suggestionBox = document.getElementById(suggestionBoxId);
  suggestionBox.classList.add("hidden");
};

// Handle selection from suggestions
const selectItem = (item, type) => {
  if (type === "contacts") {
    clientContactUniqueIDInput.value = item.Unique_ID;
    clientQuoteDateInput.value = convertToUnixTimestamp(getSelectedDate());
    clientContactFirstNameInput.value = item.First_Name;
    clientContactLastNameInput.value = item.Last_Name;
    clientContactEmailInput.value = item.Email;
    clientContactSMSInput.value = item.SMS_Number;
    document.querySelector(".customFirstName").value = item.First_Name;
    document.querySelector(".customLastName").value = item.Last_Name;
    document.querySelector(".customEmail").value = item.Email;
    document.querySelector(".customSms").value = item.SMS_Number;
  } else if (type === "companies") {
    companyNameInput.value = item.Name;
    companyUniqueIDInput.value = item.Unique_ID;
    companyQuoteDateInput.value = convertToUnixTimestamp(getSelectedDate());
    document.querySelector(".customCompanyName").value = item.Name;
  }

  const inputId =
    type === "contacts" ? "searchContactInput" : "searchCompanyInput";
  const inputField = document.getElementById(inputId);
  const name =
    type === "contacts" ? `${item.First_Name} ${item.Last_Name}` : item.Name;
  inputField.value = name;
  hideSuggestions(type);
};

// Handle "Add New" button actions (just show fields)
document.getElementById("addNewContact").addEventListener("click", () => {
  clientContactUniqueIDInput.value = "";
});

document.getElementById("addNewCompany").addEventListener("click", () => {
  companyUniqueIDInput.value = "";
});

// Convert date to Unix timestamp
const convertToUnixTimestamp = (date) => {
  return Math.floor(new Date(date).getTime() / 1000);
};

// Get selected date from the input field
const getSelectedDate = () => {
  const dateInput = document.querySelector(".dateTimeScheduleInquiry");
  return dateInput ? dateInput.value : null;
};

// Handle "Create Quote" button click
document.getElementById("createQuoteBtn").addEventListener("click", () => {
  const accountType = document.getElementById("accountType").value;
  const selectedDate = getSelectedDate();
  const unixDate = convertToUnixTimestamp(selectedDate);

  if (accountType === "Contact") {
    clientContactFirstNameInput.value =
      document.querySelector(".customFirstName")?.value || "";
    clientContactLastNameInput.value =
      document.querySelector(".customLastName")?.value || "";
    clientContactEmailInput.value =
      document.querySelector(".customEmail")?.value || "";
    clientContactSMSInput.value =
      document.querySelector(".customSms")?.value || "";
    clientQuoteDateInput.value = unixDate || "";
    clientContactUniqueIDInput.value = "";
    document.querySelector(".submitCreateNewQuoteContact").click();
  } else if (accountType === "Company") {
    companyNameInput.value =
      document.querySelector(".customCompanyName")?.value || "";
    companyQuoteDateInput.value = unixDate || "";
    companyUniqueIDInput.value || "";
    document.querySelector(".submitCreateNewQuoteCompany").click();
  } else {
    console.error("Invalid account type selected.");
  }
});

const tabs = document.querySelectorAll(".tab");
const NULL_TEXT_RE = /^null$/i;
const ID_FIELD_RE = /^id$/i;
const STATUS_FIELD_RE = /^status$/i;
const ACTIONS_FIELD = "__actions";
const LIST_CONFIG = {
  all: allQuotes,
  new: newQuotes,
  sent: sentQuotes,
  accepted: acceptedQuotes,
  cancelled: cancelledQuotes,
};
const TABLE_ATTRS = {
  entity: "peterpm",
  entityKey: "1rBR-jpR3yE3HE1VhFD0j",
  varServiceproviderid: loggedInUserIdOp,
  table: "true",
  op: "subscribe",
  initCbName: "initInquiryTable",
};
const getVitalStatsPlugin = async () => {
  if (typeof window.getVitalStatsPlugin !== "function") {
    throw new Error("SDK not initialized. Ensure sdk.js is loaded first.");
  }
  return window.getVitalStatsPlugin();
};
const STATUS_STYLES = {
  Requested: "bg-[#e8d3ee] text-[#8e24aa]",
  Sent: "bg-[#d7dbee] text-[#3949ab]",
  Accepted: "bg-[#d9ecda] text-[#43a047]",
  Declined: "bg-[#fddcd2] text-[#f4511e]",
  Expired: "bg-[#cccccc] text-[#000000]",
  Cancelled: "bg-[#cccccc] text-[#000000]",
  New: "bg-[#fbd2e0] text-[#e91e63]",
};
const STATUS_FALLBACK = "bg-gray-200 text-gray-500";

const makeInquiryLink = (id) =>
  `https://my.awesomate.pro/inquiry/${encodeURIComponent(id)}`;

const isNullValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return NULL_TEXT_RE.test(value.trim());
  }
  return false;
};

const tableRoot = document.getElementById("inquiry-table-root");

const createDynamicListElement = (type) => {
  const listId = LIST_CONFIG[type];
  if (!listId) {
    return null;
  }
  const elem = document.createElement("div");
  elem.dataset.inquiryType = type;
  elem.dataset.dynamicList = listId;
  elem.dataset.entity = TABLE_ATTRS.entity;
  elem.dataset.entityKey = TABLE_ATTRS.entityKey;
  elem.dataset.varServiceproviderid = TABLE_ATTRS.varServiceproviderid;
  elem.dataset.table = TABLE_ATTRS.table;
  elem.dataset.op = TABLE_ATTRS.op;
  elem.dataset.initCbName = TABLE_ATTRS.initCbName;
  return elem;
};

const replaceDynamicList = (type) => {
  if (!tableRoot) {
    return;
  }
  const oldElem = tableRoot.querySelector("[data-dynamic-list]");
  const mgr = window.vitalStatsDynamicListsMgr;
  if (!mgr || typeof mgr.renderNew !== "function") {
    return;
  }
  if (oldElem) {
    const instance = mgr && mgr.get ? mgr.get(oldElem) : null;
    if (instance && typeof instance.destroy === "function") {
      instance.destroy();
    }
    oldElem.remove();
  }
  const nextElem = createDynamicListElement(type);
  if (!nextElem) {
    return;
  }
  tableRoot.appendChild(nextElem);
  mgr.renderNew().subscribe(() => {});
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const type = tab.dataset.status;

    // tab active state
    tabs.forEach((t) => t.classList.remove("activeTab"));
    tab.classList.add("activeTab");

    replaceDynamicList(type);
  });
});

const deleteModal = document.getElementById("delete-modal");
const deleteModalTitle = document.getElementById("delete-modal-title");
const deleteModalMessage = document.getElementById("delete-modal-message");
const deleteModalClose = document.getElementById("delete-modal-close");
const deleteModalCancel = document.getElementById("delete-modal-cancel");
const deleteModalConfirm = document.getElementById("delete-modal-confirm");
const toast = document.getElementById("toast");
let pendingDeleteId = "";
let isDeleting = false;
let toastTimer = null;

const showToast = (message, type = "info") => {
  if (!toast) {
    return;
  }
  const classes = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-gray-900 text-white",
  };
  toast.className = `pointer-events-none fixed right-4 top-4 z-50 max-w-xs rounded-md px-4 py-3 text-sm shadow-lg ${
    classes[type] || classes.info
  }`;
  toast.textContent = message;
  toast.classList.remove("hidden");
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
};

const openDeleteModal = (id) => {
  if (!deleteModal) {
    return;
  }
  pendingDeleteId = id || "";
  if (deleteModalTitle) {
    deleteModalTitle.textContent = "Delete inquiry";
  }
  if (deleteModalMessage) {
    deleteModalMessage.textContent = pendingDeleteId
      ? `Are you sure you want to delete inquiry ${pendingDeleteId}?`
      : "Are you sure you want to delete this inquiry?";
  }
  deleteModal.classList.remove("hidden");
  deleteModal.classList.add("flex");
  deleteModal.setAttribute("aria-hidden", "false");
};

const closeDeleteModal = () => {
  if (!deleteModal) {
    return;
  }
  pendingDeleteId = "";
  deleteModal.classList.add("hidden");
  deleteModal.classList.remove("flex");
  deleteModal.setAttribute("aria-hidden", "true");
};

const refreshCurrentList = () => {
  if (!tableRoot) {
    return;
  }
  const mgr = window.vitalStatsDynamicListsMgr;
  if (!mgr || typeof mgr.get !== "function") {
    return;
  }
  const elem = tableRoot.querySelector("[data-dynamic-list]");
  if (!elem) {
    return;
  }
  const instance = mgr.get(elem);
  if (!instance) {
    return;
  }
  if (typeof instance.render === "function") {
    instance.render();
    return;
  }
  if (typeof instance.refresh === "function") {
    instance.refresh();
  }
};

const confirmDeleteModal = async () => {
  if (!pendingDeleteId || isDeleting) {
    return;
  }
  isDeleting = true;
  if (deleteModalConfirm) {
    deleteModalConfirm.disabled = true;
    deleteModalConfirm.textContent = "Deleting...";
  }
  try {
    const plugin = await getVitalStatsPlugin();
    const jobModel = plugin.switchTo("PeterpmJob");
    const mutation = jobModel.mutation();
    mutation.delete((q) => q.where("unique_id", pendingDeleteId));
    await mutation.execute(true).toPromise();
    closeDeleteModal();
    refreshCurrentList();
    showToast(`Deleted inquiry ${pendingDeleteId}`, "success");
  } catch (error) {
    console.error(error);
    showToast(error?.message || "Delete failed", "error");
  } finally {
    isDeleting = false;
    if (deleteModalConfirm) {
      deleteModalConfirm.disabled = false;
      deleteModalConfirm.textContent = "Delete";
    }
  }
};

if (deleteModalClose) {
  deleteModalClose.addEventListener("click", closeDeleteModal);
}
if (deleteModalCancel) {
  deleteModalCancel.addEventListener("click", closeDeleteModal);
}
if (deleteModalConfirm) {
  deleteModalConfirm.addEventListener("click", confirmDeleteModal);
}
if (deleteModal) {
  deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

window.initInquiryTable = (dynamicList) => {
  const React = window.vitalStatsReact || window.React;
  if (!dynamicList || !dynamicList.tableCtx || !React) {
    return;
  }

  dynamicList.tableCtx.setFinalizeDataGridProps((props) => {
    const wrapStyles = {
      "& .MuiDataGrid-cell": {
        whiteSpace: "normal",
        lineHeight: "1.4",
        alignItems: "flex-start",
        paddingTop: 2,
        paddingBottom: 2,
      },
      "& .MuiDataGrid-columnHeaderTitle": {
        whiteSpace: "normal",
        lineHeight: "1.2",
      },
    };
    const sx = Array.isArray(props.sx)
      ? [...props.sx, wrapStyles]
      : props.sx
      ? [props.sx, wrapStyles]
      : wrapStyles;
    return {
      ...props,
      getRowHeight: () => "auto",
      sx,
    };
  });

  dynamicList.tableCtx.setFinalizeColumns((cols) => {
    const mapped = cols.map((col) => {
      const isId = ID_FIELD_RE.test(col.field || "");
      const isStatus = STATUS_FIELD_RE.test(col.field || "");
      if (col.field === ACTIONS_FIELD) {
        return col;
      }
      const baseRender = col.renderCell;
      return {
        ...col,
        minWidth: isId ? 100 : 160,
        width: isId ? 120 : col.width,
        flex: isId ? 0 : col.flex,
        renderCell: (params) => {
          const rawValue = params.value;
          if (isNullValue(rawValue)) {
            return "-";
          }
          if (isId) {
            if (rawValue === "-") {
              return "-";
            }
            return React.createElement(
              "a",
              {
                href: makeInquiryLink(rawValue),
                className: "text-blue-600 underline",
              },
              String(rawValue)
            );
          }
          if (isStatus) {
            const statusText = String(rawValue || "");
            const statusClass = STATUS_STYLES[statusText] || STATUS_FALLBACK;
            return React.createElement(
              "span",
              {
                className: `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`,
              },
              statusText || "-"
            );
          }
          if (baseRender) {
            const rendered = baseRender(params);
            if (
              typeof rendered === "string" &&
              NULL_TEXT_RE.test(rendered.trim())
            ) {
              return "-";
            }
            return rendered;
          }
          return rawValue;
        },
      };
    });

    if (mapped.some((col) => col.field === ACTIONS_FIELD)) {
      return mapped;
    }

    return [
      ...mapped,
      {
        field: ACTIONS_FIELD,
        headerName: "Actions",
        sortable: false,
        filterable: false,
        flex: 0,
        width: 80,
        renderCell: (params) => {
          const id = params.row?.ID || params.value || "";
          return React.createElement(
            "button",
            {
              type: "button",
              onClick: (event) => {
                event.stopPropagation();
                openDeleteModal(id);
              },
              className: "text-red-600 hover:text-red-700",
              "aria-label": id ? `Delete inquiry ${id}` : "Delete inquiry",
            },
            React.createElement("svg", {
              viewBox: "0 0 24 24",
              width: 18,
              height: 18,
              "aria-hidden": "true",
              children: React.createElement("path", {
                fill: "currentColor",
                d: "M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM6 9h2v9H6V9z",
              }),
            })
          );
        },
      },
    ];
  });
};
