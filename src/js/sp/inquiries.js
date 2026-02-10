const tabs = document.querySelectorAll(".tab");
const NULL_TEXT_RE = /^null$/i;
const ID_FIELD_RE = /^id$/i;
const STATUS_FIELD_RE = /^status$/i;
const ACTIONS_FIELD = "__actions";
const LIST_CONFIG = {
  all: allInquiries,
  new: newInquiries,
  contact: contactInquiries,
  quote: quoteInquiries,
  completed: completedInquiries,
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
  "New Inquiry": "bg-[#f7d1df] text-[#d81b60]",
  "Contact Client": "bg-[#eedaf2] text-[#ab47bc]",
  "Contact For Site Visit": "bg-[#e8d3ee] text-[#8e24aa]",
  "Site Visit Scheduled": "bg-[#fff0cc] text-[#ffb300]",
  "Site Visit to be Re-Scheduled": "bg-[#fee8cc] text-[#fb8c00]",
  "Generate Quote": "bg-[#cceef3] text-[#00acc1]",
  "Quote Created": "bg-[#d9ecda] text-[#43a047]",
  Completed: "bg-[#d9ecda] text-[#43a047]",
  Cancelled: "bg-[#cccccc] text-[#000000]",
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
    const dealModel = plugin.switchTo("PeterpmDeal");
    const mutation = dealModel.mutation();
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
