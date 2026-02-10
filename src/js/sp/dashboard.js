(() => {
  const ENTITY = "peterpm";
  const ENTITY_KEY = "1rBR-jpR3yE3HE1VhFD0j";
  const JOB_LIST_ID =allJobs;
  const APPOINTMENTS_LIST_ID =allAppointments;

  const getServiceProviderId = () => {
    if (typeof loggedInUserIdOp !== "undefined") {
      return loggedInUserIdOp;
    }
    return "";
  };

  const toUnixSeconds = (date) => Math.floor(date.getTime() / 1000);

  const isNullValue = (value) => {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === "string") {
      return /^null$/i.test(value.trim());
    }
    return false;
  };

  const STATUS_STYLES = {
    New: "bg-[#E8D3EE] text-[#8E24AA]",
    "To Be Scheduled": "bg-[#FEE8CC] text-[#FB8C00]",
    Scheduled: "bg-[#CCE7F6] text-[#0288D1]",
    Completed: "bg-[#D9ECDA] text-[#43A047]",
    Cancelled: "bg-[#ECECEC] text-[#9E9E9E]",
  };
  const STATUS_FALLBACK = "bg-gray-200 text-gray-500";

  const getJobsRoot = () =>
    document.getElementById("inquiry-table-root") ||
    document.getElementById("dashboard-jobs-root");

  const createJobsList = () => {
    const root = getJobsRoot();
    if (!root) {
      return null;
    }
    const existing = root.querySelector("[data-dynamic-list]");
    if (existing) {
      const spId = getServiceProviderId();
      if (spId && !existing.dataset.varServiceproviderid) {
        existing.dataset.varServiceproviderid = spId;
      }
      if (!existing.dataset.initCbName) {
        existing.dataset.initCbName = "initInquiryTable";
      }
      return existing;
    }
    if (!JOB_LIST_ID) {
      return null;
    }
    const elem = document.createElement("div");
    elem.dataset.dynamicList = JOB_LIST_ID;
    elem.dataset.entity = ENTITY;
    elem.dataset.entityKey = ENTITY_KEY;
    elem.dataset.varServiceproviderid = getServiceProviderId();
    elem.dataset.table = "true";
    elem.dataset.op = "subscribe";
    elem.dataset.initCbName = "initInquiryTable";
    root.appendChild(elem);
    return elem;
  };

  const getDayRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
    );
    return {
      startSec: toUnixSeconds(start),
      endSec: toUnixSeconds(end),
    };
  };

  const createAppointmentsList = (startSec, endSec) => {
    const root = document.getElementById("dashboard-appointments-root");
    if (!root || !APPOINTMENTS_LIST_ID) {
      return null;
    }
    const range =
      typeof startSec === "number" && typeof endSec === "number"
        ? { startSec, endSec }
        : getDayRange(new Date());
    const elem = document.createElement("div");
    elem.dataset.dynamicList = APPOINTMENTS_LIST_ID;
    elem.dataset.entity = ENTITY;
    elem.dataset.entityKey = ENTITY_KEY;
    const spId = getServiceProviderId();
    if (spId) {
      elem.dataset.varServiceproviderid = spId;
    }
    elem.dataset.table = "false";
    elem.dataset.op = "subscribe";
    elem.dataset.varSttime = String(range.startSec);
    elem.dataset.varEndtime = String(range.endSec);
    elem.innerHTML = `
      <div class="flex flex-col gap-3 rounded-[8px] border border-[#d3d7e2] bg-white p-4">
        <div class="flex items-center justify-between">
          <div class="text-h3 text-dark">[Title]</div>
          <span
            class="dashboard-appointment-status"
            data-appointment-status="[Status]"
          >[Status]</span>
        </div>
        <div class="text-label text-dark">[Start] - [End]</div>
        <div class="text-label text-[#636d88]">[Type]</div>
      </div>
    `;
    root.appendChild(elem);
    return elem;
  };

  const replaceAppointmentsList = (startSec, endSec) => {
    const root = document.getElementById("dashboard-appointments-root");
    const mgr = window.vitalStatsDynamicListsMgr;
    if (!root || !mgr || typeof mgr.renderNew !== "function") {
      return null;
    }
    const oldElem = root.querySelector("[data-dynamic-list]");
    if (oldElem) {
      const instance = mgr.get ? mgr.get(oldElem) : null;
      if (instance && typeof instance.destroy === "function") {
        instance.destroy();
      }
      oldElem.remove();
    }
    const nextElem = createAppointmentsList(startSec, endSec);
    if (!nextElem) {
      return null;
    }
    mgr.renderNew().subscribe(() => {});
    return nextElem;
  };

  const applyAppointmentStatusStyles = (root) => {
    if (!root) {
      return;
    }
    const nodes = root.querySelectorAll("[data-appointment-status]");
    nodes.forEach((node) => {
      const raw =
        node.dataset.appointmentStatus ||
        node.textContent ||
        node.getAttribute("data-appointment-status") ||
        "";
      const statusText = String(raw).trim();
      const displayText = isNullValue(statusText) ? "-" : statusText;
      const statusClass = STATUS_STYLES[displayText] || STATUS_FALLBACK;
      node.textContent = displayText;
      node.className = `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`;
    });
  };

  const observeAppointmentStatuses = (root) => {
    if (!root || typeof MutationObserver === "undefined") {
      return null;
    }
    let isApplying = false;
    const observer = new MutationObserver(() => {
      if (isApplying) {
        return;
      }
      isApplying = true;
      requestAnimationFrame(() => {
        observer.disconnect();
        applyAppointmentStatusStyles(root);
        observer.observe(root, { childList: true, subtree: true });
        isApplying = false;
      });
    });
    observer.observe(root, { childList: true, subtree: true });
    applyAppointmentStatusStyles(root);
    return observer;
  };

  const refreshDynamicList = (elem) => {
    if (!elem || !window.vitalStatsDynamicListsMgr) {
      return;
    }
    const mgr = window.vitalStatsDynamicListsMgr;
    if (typeof mgr.get !== "function") {
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

  const setupCalendar = (appointmentsElem) => {
    const monthLabel = document.querySelector(".monthNYearContainer");
    const daysContainer = document.querySelector(".parentContainer__dateDays");
    const template = daysContainer?.querySelector(".templateContainer_dateDays");
    if (!monthLabel || !daysContainer || !template) {
      return;
    }

    let selectedDate = new Date();
    let monthCursor = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1,
    );

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let activeElem = appointmentsElem;

    const updateRange = () => {
      if (!activeElem) {
        return;
      }
      const { startSec, endSec } = getDayRange(selectedDate);
      const nextElem = replaceAppointmentsList(startSec, endSec);
      if (nextElem) {
        activeElem = nextElem;
        applyAppointmentStatusStyles(activeElem);
      } else {
        activeElem.dataset.varSttime = String(startSec);
        activeElem.dataset.varEndtime = String(endSec);
        refreshDynamicList(activeElem);
        applyAppointmentStatusStyles(activeElem);
      }
    };

    const setActiveDay = (targetDate) => {
      selectedDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
      );
      updateRange();
      renderDays();
    };

    const setDayStyles = (dayEl, isActive) => {
      if (!dayEl) {
        return;
      }
      const parts = dayEl.querySelectorAll("div");
      const dayLabel = parts[0];
      const dayNumber = parts[1];
      if (isActive) {
        dayEl.style.backgroundColor = "#003882";
        if (dayLabel) dayLabel.style.color = "#ffffff";
        if (dayNumber) dayNumber.style.color = "#ffffff";
        return;
      }
      dayEl.style.backgroundColor = "#ffffff";
      if (dayLabel) dayLabel.style.color = "#636d88";
      if (dayNumber) dayNumber.style.color = "#414042";
    };

    const clampDateToMonth = (date) => {
      const daysInMonth = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() + 1,
        0,
      ).getDate();
      const day = Math.min(date.getDate(), daysInMonth);
      return new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
    };

    const renderDays = () => {
      monthLabel.textContent = `${monthNames[monthCursor.getMonth()]}, ${monthCursor.getFullYear()}`;
      daysContainer.innerHTML = "";
      const daysInMonth = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() + 1,
        0,
      ).getDate();
      let activeNode = null;

      for (let day = 1; day <= daysInMonth; day += 1) {
        const current = new Date(
          monthCursor.getFullYear(),
          monthCursor.getMonth(),
          day,
        );
        const dayEl = template.cloneNode(true);
        dayEl.classList.add("whitespace-nowrap");
        const parts = dayEl.querySelectorAll("div");
        const dayLabel = parts[0];
        const dayNumber = parts[1];
        if (dayLabel) {
          dayLabel.textContent = dayNames[current.getDay()];
        }
        if (dayNumber) {
          dayNumber.textContent = String(day).padStart(2, "0");
        }
        const isActive =
          current.getFullYear() === selectedDate.getFullYear() &&
          current.getMonth() === selectedDate.getMonth() &&
          current.getDate() === selectedDate.getDate();
        setDayStyles(dayEl, isActive);
        if (isActive) {
          activeNode = dayEl;
        }
        dayEl.addEventListener("click", () => setActiveDay(current));
        daysContainer.appendChild(dayEl);
      }

      if (activeNode) {
        activeNode.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    };

    renderDays();
    updateRange();

    const prevMonthBtn = document.querySelector(".prevBtnYear");
    const nextMonthBtn = document.querySelector(".nextBtnYear");
    const prevDayBtn = document.querySelector(".prevvBtn");
    const nextDayBtn = document.querySelector(".nexxtBtn");

    prevMonthBtn?.addEventListener("click", () => {
      monthCursor = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() - 1,
        1,
      );
      selectedDate = clampDateToMonth(selectedDate);
      setActiveDay(selectedDate);
    });

    nextMonthBtn?.addEventListener("click", () => {
      monthCursor = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() + 1,
        1,
      );
      selectedDate = clampDateToMonth(selectedDate);
      setActiveDay(selectedDate);
    });

    prevDayBtn?.addEventListener("click", () => {
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 1);
      monthCursor = new Date(prev.getFullYear(), prev.getMonth(), 1);
      setActiveDay(prev);
    });

    nextDayBtn?.addEventListener("click", () => {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + 1);
      monthCursor = new Date(next.getFullYear(), next.getMonth(), 1);
      setActiveDay(next);
    });
  };

  window.initDashboardJobsTable = (dynamicList) => {
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

    dynamicList.tableCtx.setFinalizeColumns((cols) =>
      cols.map((col) => {
        const baseRender = col.renderCell;
        return {
          ...col,
          renderCell: (params) => {
            const rawValue = params.value;
            if (isNullValue(rawValue)) {
              return "-";
            }
            if (baseRender) {
              const rendered = baseRender(params);
              if (
                typeof rendered === "string" &&
                /^null$/i.test(rendered.trim())
              ) {
                return "-";
              }
              return rendered;
            }
            return rawValue;
          },
        };
      }),
    );
  };

  if (typeof window.initInquiryTable !== "function") {
    window.initInquiryTable = window.initDashboardJobsTable;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const jobsElem = createJobsList();
    const todayRange = getDayRange(new Date());
    const appointmentsElem = createAppointmentsList(
      todayRange.startSec,
      todayRange.endSec,
    );
    if (window.vitalStatsDynamicListsMgr?.renderNew) {
      window.vitalStatsDynamicListsMgr.renderNew().subscribe(() => {});
    }
    observeAppointmentStatuses(
      document.getElementById("dashboard-appointments-root"),
    );
    setupCalendar(appointmentsElem);
    if (jobsElem) {
      refreshDynamicList(jobsElem);
    }
  });
})();
