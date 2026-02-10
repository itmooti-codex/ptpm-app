const tabs = document.querySelectorAll(".tab");
const tableRoot = document.getElementById("materials-table-root");
const NULL_TEXT_RE = /^null$/i;
const ID_FIELD_RE = /(^id$|_id$)/i;
const STATUS_FIELD_RE = /^status$/i;
const RECEIPT_FIELD_RE = /receipt/i;
const SERVICE_PROVIDER_FIELD_RE = /service[_\s]*provider[_\s]*id/i;
const ACTIONS_FIELD = "__actions";

const LIST_CONFIG = {
  all:
    typeof allMaterials !== "undefined"
      ? allMaterials
      : "MATERIALS_ALL_LIST_ID",
  new:
    typeof newMaterials !== "undefined"
      ? newMaterials
      : "MATERIALS_NEW_LIST_ID",
  inProgress:
    typeof inProgressMaterials !== "undefined"
      ? inProgressMaterials
      : "MATERIALS_IN_PROGRESS_LIST_ID",
  assignedToJob:
    typeof assignedToJobMaterials !== "undefined"
      ? assignedToJobMaterials
      : "MATERIALS_ASSIGNED_TO_JOB_LIST_ID",
  paid:
    typeof paidMaterials !== "undefined"
      ? paidMaterials
      : "MATERIALS_PAID_LIST_ID",
};

const TABLE_ATTRS = {
  entity: "peterpm",
  entityKey: "1rBR-jpR3yE3HE1VhFD0j",
  varServiceproviderid:
    typeof loggedInUserIdOp !== "undefined"
      ? loggedInUserIdOp
      : typeof SERVICE_PROVIDER_ID !== "undefined"
        ? SERVICE_PROVIDER_ID
        : "",
  table: "true",
  op: "subscribe",
  initCbName: "initMaterialsTable",
};

const STATUS_STYLES = {
  "Pending Payment": "bg-[#FEE8CC] text-[#757575]",
  Paid: "bg-[#E3E3E3] text-[#f57c00]",
  "Assigned to Job": "bg-[#D9ECDA] text-[#43A047]",
  New: "bg-[#CDEBFA] text-[#039BE5]",
  "In Progress": "bg-[#CCEEF3] text-[#00ACC1]",
};
const STATUS_FALLBACK = "bg-gray-200 text-gray-500";

let currentTab = "all";
let currentMaterialId = "";
let isCreating = false;
let isUpdating = false;
let isDeleting = false;
let toastTimer = null;
let pendingDeleteId = "";

const getToastElement = () => {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className =
      "pointer-events-none fixed right-4 top-4 z-50 hidden max-w-xs rounded-md px-4 py-3 text-sm shadow-lg";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  return toast;
};

const showToast = (message, type = "info") => {
  const toast = getToastElement();
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

const setButtonLoading = (button, isLoading, label = "Saving...") => {
  if (!button) {
    return;
  }
  if (isLoading) {
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }
    button.disabled = true;
    button.classList.add("opacity-60", "cursor-not-allowed");
    button.setAttribute("aria-busy", "true");
    if (label !== null && label !== undefined && label !== "") {
      button.innerHTML = label;
    }
    return;
  }
  button.disabled = false;
  button.classList.remove("opacity-60", "cursor-not-allowed");
  button.removeAttribute("aria-busy");
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
  }
};

const deleteModal = document.getElementById("delete-modal");
const deleteModalTitle = document.getElementById("delete-modal-title");
const deleteModalMessage = document.getElementById("delete-modal-message");
const deleteModalClose = document.getElementById("delete-modal-close");
const deleteModalCancel = document.getElementById("delete-modal-cancel");
const deleteModalConfirm = document.getElementById("delete-modal-confirm");

const isNullValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return NULL_TEXT_RE.test(value.trim());
  }
  return false;
};

const getAlpineData = () => {
  const root = document.body;
  if (root && root.__x && root.__x.$data) {
    return root.__x.$data;
  }
  return null;
};

const setAlpineFlag = (key, value) => {
  const alpineData = getAlpineData();
  if (!alpineData) {
    return;
  }
  alpineData[key] = value;
};

const getVitalStatsPlugin = async () => {
  if (typeof window.getVitalStatsPlugin !== "function") {
    throw new Error("SDK not initialized. Ensure sdk.js is loaded first.");
  }
  return window.getVitalStatsPlugin();
};

const pickValue = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

const normalizeMaterialRow = (row = {}) => {
  const id = pickValue(
    row.ID,
    row.Id,
    row.id,
    row.Material_ID,
    row.material_id,
    row.Unique_ID,
    row.unique_id,
  );

  return {
    id: id || "",
    material_name: pickValue(
      row.Material_Name,
      row.material_name,
      row.MaterialName,
    ) || "",
    description: pickValue(row.Description, row.description) || "",
    total: pickValue(row.Total, row.total, row.Price, row.price, 0),
    transaction_type: pickValue(
      row.Transaction_Type,
      row.transaction_type,
      row.TransactionType,
    ) || "",
    tax: pickValue(row.Tax, row.tax) || "",
    status: pickValue(row.Status, row.status) || "",
  };
};

const setInputValue = (selector, value) => {
  const input = document.querySelector(selector);
  if (!input) {
    return;
  }
  input.value = value ?? "";
};

const getReceiptLink = (row = {}) =>
  pickValue(
    row.Receipt,
    row.receipt,
    row.receipt_url,
    row.Receipt_URL,
    row.receipt_link,
    row.Receipt_Link,
  );

const openEditMaterialModal = (row) => {
  const material = normalizeMaterialRow(row);
  if (!material.id) {
    console.warn("Material id missing.");
    return;
  }
  currentMaterialId = material.id;
  setInputValue("#material", material.material_name);
  setInputValue("#description", material.description);
  setInputValue("#price", material.total);
  setInputValue("#transaction", material.transaction_type || "Reimburse");
  setInputValue("#tax", material.tax || "EXEMPTEXPENSES");
  setAlpineFlag("modalIsOpen", false);
  setAlpineFlag("editMaterialModal", true);
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

const createDynamicListElement = (type) => {
  const listId = LIST_CONFIG[type];
  if (!listId) {
    return null;
  }
  const elem = document.createElement("div");
  elem.dataset.materialType = type;
  elem.dataset.dynamicList = listId;
  elem.dataset.entity = TABLE_ATTRS.entity;
  elem.dataset.entityKey = TABLE_ATTRS.entityKey;
  if (TABLE_ATTRS.varServiceproviderid) {
    elem.dataset.varServiceproviderid = TABLE_ATTRS.varServiceproviderid;
  }
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
    tabs.forEach((t) => t.classList.remove("activeTab"));
    tab.classList.add("activeTab");
    currentTab = type || "all";
    replaceDynamicList(currentTab);
  });
});

const getCreateMaterialPayload = () => {
  const materialName = document.querySelector("#addmaterial")?.value?.trim();
  const description = document.querySelector("#adddescription")?.value?.trim();
  const totalValue = document.querySelector("#addprice")?.value?.trim();
  const transactionType = document.querySelector("#addtransaction")?.value;
  const tax = document.querySelector("#addtax")?.value;

  const payload = {
    material_name: materialName || "",
    description: description || "",
    total: parseFloat(totalValue) || 0,
    status: "New",
    transaction_type: transactionType || "Reimburse",
    tax: tax || "EXEMPTEXPENSES",
  };

  if (TABLE_ATTRS.varServiceproviderid) {
    payload.service_provider_id = TABLE_ATTRS.varServiceproviderid;
  }

  return payload;
};

const getUpdateMaterialPayload = () => {
  const materialName = document.querySelector("#material")?.value?.trim();
  const description = document.querySelector("#description")?.value?.trim();
  const totalValue = document.querySelector("#price")?.value?.trim();
  const transactionType = document.querySelector("#transaction")?.value;
  const tax = document.querySelector("#tax")?.value;

  return {
    material_name: materialName || "",
    description: description || "",
    total: parseFloat(totalValue) || 0,
    transaction_type: transactionType || "Reimburse",
    tax: tax || "EXEMPTEXPENSES",
  };
};

const createMaterial = async (triggerButton) => {
  if (isCreating) {
    return;
  }
  isCreating = true;
  const activeButton =
    triggerButton || document.querySelector('[data-material-action="create"]');
  setButtonLoading(activeButton, true, "Adding...");
  try {
    const payload = getCreateMaterialPayload();
    const plugin = await getVitalStatsPlugin();
    const materialModel = plugin.switchTo("PeterpmMaterial");
    const mutation = materialModel.mutation();
    mutation.createOne(payload);
    await mutation.execute(true).toPromise();
    document.querySelector('[data-material-form="create"]')?.reset();
    setAlpineFlag("modalIsOpen", false);
    refreshCurrentList();
    showToast("Material added successfully.", "success");
  } catch (error) {
    console.error("Failed to create material:", error);
    showToast("Failed to add material.", "error");
  } finally {
    isCreating = false;
    setButtonLoading(activeButton, false);
  }
};

const updateMaterial = async (triggerButton) => {
  if (isUpdating || !currentMaterialId) {
    if (!currentMaterialId) {
      showToast("Missing material id.", "error");
    }
    return;
  }
  isUpdating = true;
  const activeButton =
    triggerButton || document.querySelector('[data-material-action="update"]');
  setButtonLoading(activeButton, true, "Saving...");
  try {
    const payload = getUpdateMaterialPayload();
    const plugin = await getVitalStatsPlugin();
    const materialModel = plugin.switchTo("PeterpmMaterial");
    const mutation = materialModel.mutation();
    mutation.update((q) => q.where("unique_id", currentMaterialId).set(payload));
    await mutation.execute(true).toPromise();
    setAlpineFlag("editMaterialModal", false);
    refreshCurrentList();
    showToast("Material updated successfully.", "success");
  } catch (error) {
    console.error("Failed to update material:", error);
    showToast("Failed to update material.", "error");
  } finally {
    isUpdating = false;
    setButtonLoading(activeButton, false);
  }
};

const openDeleteModal = (row) => {
  const material = normalizeMaterialRow(row);
  const materialId = material.id;
  if (!materialId) {
    console.warn("Material id missing.");
    showToast("Missing material id.", "error");
    return;
  }
  if (!deleteModal) {
    showToast("Delete modal not found.", "error");
    return;
  }
  pendingDeleteId = materialId;
  if (deleteModalTitle) {
    deleteModalTitle.textContent = "Delete material";
  }
  if (deleteModalMessage) {
    deleteModalMessage.textContent = pendingDeleteId
      ? `Are you sure you want to delete material ${pendingDeleteId}?`
      : "Are you sure you want to delete this material?";
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
    const materialModel = plugin.switchTo("PeterpmMaterial");
    const mutation = materialModel.mutation();
    mutation.delete((q) => q.where("unique_id", pendingDeleteId));
    await mutation.execute(true).toPromise();
    closeDeleteModal();
    refreshCurrentList();
    showToast("Material deleted.", "success");
  } catch (error) {
    console.error("Failed to delete material:", error);
    showToast("Failed to delete material.", "error");
  } finally {
    isDeleting = false;
    if (deleteModalConfirm) {
      deleteModalConfirm.disabled = false;
      deleteModalConfirm.textContent = "Delete";
    }
  }
};

window.initMaterialsTable = (dynamicList) => {
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
    let hasActionsColumn = false;
    const renderActionsCell = (params) => {
      const receiptLink = getReceiptLink(params.row);
      return React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement(
          "a",
          {
            href: receiptLink || undefined,
            target: receiptLink ? "_blank" : undefined,
            rel: receiptLink ? "noopener noreferrer" : undefined,
            onClick: (event) => {
              if (!receiptLink) {
                event.preventDefault();
                event.stopPropagation();
              }
            },
            className: receiptLink
              ? "text-[#0052CC] hover:text-[#003882]"
              : "text-gray-300 cursor-not-allowed",
            "aria-label": "Open receipt",
            title: receiptLink ? "Open receipt" : "No receipt available",
          },
          React.createElement("svg", {
            viewBox: "0 0 24 24",
            width: 18,
            height: 18,
            "aria-hidden": "true",
            fill: "currentColor",
            children: React.createElement("path", {
              d: "M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM7 11h10v2H7v-2zm0 4h10v2H7v-2z",
            }),
          }),
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: (event) => {
              event.stopPropagation();
              openEditMaterialModal(params.row);
            },
            className: "text-[#0052CC] hover:text-[#003882]",
            "aria-label": "Edit material",
            title: "Edit material",
          },
          React.createElement("svg", {
            viewBox: "0 0 24 24",
            width: 18,
            height: 18,
            "aria-hidden": "true",
            fill: "currentColor",
            children: React.createElement("path", {
              d: "M3 17.25V21h3.75l11-11.03-3.75-3.75L3 17.25zm18-10.5a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75L21 6.75z",
            }),
          }),
        ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: (event) => {
                  event.stopPropagation();
                  openDeleteModal(params.row);
                },
                className: "text-red-600 hover:text-red-700",
                "aria-label": "Delete material",
                title: "Delete material",
              },
              React.createElement("svg", {
                viewBox: "0 0 24 24",
                width: 18,
                height: 18,
                "aria-hidden": "true",
                fill: "currentColor",
                children: React.createElement("path", {
                  d: "M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM6 9h2v9H6V9z",
                }),
              }),
            ),
      );
    };

    const mapped = cols.flatMap((col) => {
      const field = col.field || "";
      const header = col.headerName || "";
      const isAction = field === ACTIONS_FIELD || /^action$/i.test(header);
      const isReceipt =
        RECEIPT_FIELD_RE.test(field) || RECEIPT_FIELD_RE.test(header);
      const isServiceProvider =
        SERVICE_PROVIDER_FIELD_RE.test(field) ||
        SERVICE_PROVIDER_FIELD_RE.test(header);

      if (isAction) {
        hasActionsColumn = true;
        return [
          {
          ...col,
          field: ACTIONS_FIELD,
          headerName: "Action",
          sortable: false,
          filterable: false,
          width: 120,
          renderCell: renderActionsCell,
          },
        ];
      }

      if (isReceipt || isServiceProvider) {
        return [];
      }

      const isId = ID_FIELD_RE.test(field);
      const isStatus = STATUS_FIELD_RE.test(field);
      const baseRender = col.renderCell;
      return [
        {
          ...col,
          minWidth: isId ? 100 : 160,
          width: isId ? 120 : col.width,
          flex: isId ? 0 : col.flex,
          renderCell: (params) => {
            const rawValue = params.value;
            if (isNullValue(rawValue)) {
              return "-";
            }
            if (isStatus) {
              const statusText = String(rawValue || "");
              const statusClass = STATUS_STYLES[statusText] || STATUS_FALLBACK;
              return React.createElement(
                "span",
                {
                  className: `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`,
                },
                statusText || "-",
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
        },
      ];
    });

    if (hasActionsColumn) {
      return mapped;
    }

    return [
      ...mapped,
      {
        field: ACTIONS_FIELD,
        headerName: "Action",
        sortable: false,
        filterable: false,
        flex: 0,
        width: 120,
        renderCell: renderActionsCell,
      },
    ];
  });
};

document.addEventListener("click", (event) => {
  const button = event.target.closest('[data-material-action="create"]');
  if (!button) {
    return;
  }
  event.preventDefault();
  createMaterial(button);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest('[data-material-action="update"]');
  if (!button) {
    return;
  }
  event.preventDefault();
  updateMaterial(button);
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }
  if (form.matches('[data-material-form="create"]')) {
    event.preventDefault();
    createMaterial(event.submitter);
  }
  if (form.matches('[data-material-form="edit"]')) {
    event.preventDefault();
    updateMaterial(event.submitter);
  }
});

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
