(() => {
  const getLoggedInUserId = () => {
    if (typeof loggedInUserIdOp !== "undefined") {
      return loggedInUserIdOp;
    }
    if (typeof loggedInUserId !== "undefined") {
      return loggedInUserId;
    }
    return null;
  };

  const normalizeId = (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return null;
    }
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? trimmed : numeric;
  };

  const loggedInUserId = normalizeId(getLoggedInUserId());
  if (!loggedInUserId) {
    return;
  }

  const state = {
    items: [],
    currentTab: "Action Required",
    onlyUnread: false,
  };

  const dom = {
    container: document.getElementById("all-announcements"),
    containerPage: document.getElementById("all-announcements-page"),
    bellIcon: document.getElementById("bell-icon"),
    badge: document.getElementById("notification-count"),
    listEl: document.getElementById("notifList"),
    unreadToggle: document.getElementById("notifUnreadToggle"),
    markAllBtn: document.getElementById("notifMarkAll"),
    tabActionBtn: document.getElementById("notifTabAction"),
    tabGeneralBtn: document.getElementById("notifTabGeneral"),
    viewMoreBtn: document.getElementById("notifViewMore"),
  };

  const hasTabControls = Boolean(dom.tabActionBtn || dom.tabGeneralBtn);

  const normalizeNotificationType = (type) => {
    const t = String(type || "").toLowerCase();
    if (t.includes("action")) {
      return "Action Required";
    }
    return "General Updates";
  };

  const formatNotificationDate = (value) => {
    if (!value) {
      return "";
    }
    const dayjsRef = window.dayjs;
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber) && asNumber > 0 && dayjsRef?.unix) {
      const d = dayjsRef.unix(asNumber);
      if (d?.isValid?.()) {
        return d.format("DD MMM · h:mma");
      }
    }
    if (dayjsRef) {
      const d = dayjsRef(value);
      if (d?.isValid?.()) {
        return d.format("DD MMM · h:mma");
      }
    }
    return String(value);
  };

  const mapNotifications = (list = []) => {
    if (!Array.isArray(list)) {
      list = list ? [list] : [];
    }
    return list
      .map((n) => {
        const tab = normalizeNotificationType(n?.Type || n?.type);
        const label = n?.Unique_ID
          ? `#${n.Unique_ID}`
          : n?.Title || "Notification";
        return {
          id: label,
          text: n?.Title || "Notification",
          when: formatNotificationDate(
            n?.Publish_Date_Time || n?.publish_date_time || n?.created_at,
          ),
          tab,
          read: Boolean(n?.Is_Read ?? n?.is_read),
          origin_url: n?.Origin_Url || n?.origin_url,
          notified_contact_id: n?.Notified_Contact_ID ?? n?.notified_contact_id,
          uniqueId: n?.Unique_ID ?? n?.unique_id ?? n?.id,
        };
      })
      .filter((n) => n.text || n.when || n.id);
  };

  const applyFilters = (list) => {
    let items = list.slice();
    if (state.onlyUnread) {
      items = items.filter((n) => !n.read);
    }
    if (hasTabControls) {
      items = items.filter((n) => n.tab === state.currentTab);
    }
    return items;
  };

  const updateBadge = () => {
    const unreadCount = state.items.filter((n) => !n.read).length;
    if (dom.badge) {
      dom.badge.textContent = String(unreadCount);
      dom.badge.classList.toggle("hidden", unreadCount <= 0);
    }
    if (dom.bellIcon) {
      dom.bellIcon.classList.toggle("unread", unreadCount > 0);
    }
  };

  const renderSimpleContainers = (items) => {
    const containers = [dom.container, dom.containerPage].filter(Boolean);
    if (!containers.length) {
      return;
    }
    containers.forEach((container) => {
      container.innerHTML = "";
      items.forEach((ann) => {
        const announcementEl = document.createElement("div");
        announcementEl.className = `p-4 cursor-pointer justify-between items-center gap-2 flex w-full ${
          ann.read ? "read" : "unread bg-[#dee7f6]"
        }`;
        announcementEl.dataset.announcementId = ann.uniqueId || "";
        announcementEl.innerHTML = `
          <div class="flex-col justify-start items-start gap-2 flex flex-1">
            <span class="text-sm text-dark">${ann.text}</span>
            <div class="text-sm text-dark">${ann.when || ""}</div>
          </div>
          ${
            ann.read
              ? ""
              : `<div class="blueDot w-2.5 h-2.5 bg-[#0052cc] rounded-full"></div>`
          }
        `;
        announcementEl.addEventListener("click", () => onNotificationClick(ann));
        container.appendChild(announcementEl);
      });
    });
  };

  const rowTemplate = (item) => {
    const unreadDot = !item.read
      ? `<span class="ml-2 p-1 w-2.5 h-2.5 rounded-full bg-red-600"></span>`
      : "";
    const baseBg = !item.read ? "bg-slate-200" : "bg-white";
    return `
      <div class="px-4 py-3 ${baseBg} border-b last:border-b-0" data-notif-row data-unique-id="${item.uniqueId || ""}">
        <div class="flex items-start">
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-slate-800">${item.id}
                <span class="font-normal text-slate-600"> - ${item.text}</span>
              </div>
              ${unreadDot}
            </div>
            <div class="mt-1 text-xs text-slate-500">${item.when}</div>
          </div>
        </div>
      </div>`;
  };

  const renderPopoverList = (items) => {
    if (!dom.listEl) {
      return;
    }
    dom.listEl.innerHTML = items.map((item) => rowTemplate(item)).join("");
    Array.from(dom.listEl.children).forEach((el) => {
      const id = el.dataset.uniqueId;
      const target = state.items.find((n) => String(n.uniqueId) === String(id));
      el.addEventListener("click", () => {
        if (target) {
          onNotificationClick(target);
        }
      });
    });
  };

  const renderFilters = () => {
    if (dom.tabActionBtn) {
      dom.tabActionBtn.className =
        state.currentTab === "Action Required"
          ? "px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm"
          : "px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100";
    }
    if (dom.tabGeneralBtn) {
      dom.tabGeneralBtn.className =
        state.currentTab === "General Updates"
          ? "px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm"
          : "px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100";
    }
    if (dom.unreadToggle) {
      dom.unreadToggle.setAttribute("aria-pressed", String(state.onlyUnread));
      dom.unreadToggle.classList.toggle("bg-blue-600", state.onlyUnread);
      dom.unreadToggle.classList.toggle("bg-gray-300", !state.onlyUnread);
      const knob = dom.unreadToggle.querySelector(".knob");
      if (knob) {
        knob.classList.toggle("translate-x-0", !state.onlyUnread);
        knob.classList.toggle("translate-x-5", state.onlyUnread);
      }
    }
  };

  const renderAll = () => {
    const filtered = applyFilters(state.items);
    renderFilters();
    renderSimpleContainers(filtered);
    renderPopoverList(filtered);
    updateBadge();
  };

  const markAsRead = async (ids = []) => {
    const uniqueIds = ids.filter(Boolean);
    if (!uniqueIds.length) {
      return;
    }
    const plugin = await window.getVitalStatsPlugin();
    const model = plugin.switchTo("PeterpmAnnouncement");
    const mutation = model.mutation();
    mutation.update((q) => q.where("unique_id", "in", uniqueIds).set({
      is_read: true,
    }));
    await mutation.execute(true).toPromise();
  };

  const onNotificationClick = async (notification) => {
    if (!notification) {
      return;
    }
    if (!notification.read && notification.uniqueId) {
      notification.read = true;
      try {
        await markAsRead([notification.uniqueId]);
      } catch (error) {
        console.error("[Announcements] Failed to mark read", error);
      }
    }
    renderAll();
    if (notification.origin_url) {
      try {
        window.open(notification.origin_url, "_blank", "noreferrer");
      } catch (error) {
        console.error("[Announcements] Failed to open origin_url", error);
      }
    }
  };

  const markAllAsRead = async () => {
    const unread = state.items.filter((n) => !n.read);
    const ids = unread.map((n) => n.uniqueId).filter(Boolean);
    if (!ids.length) {
      return;
    }
    try {
      await markAsRead(ids);
      unread.forEach((n) => {
        n.read = true;
      });
      renderAll();
    } catch (error) {
      console.error("[Announcements] Failed to mark all read", error);
    }
  };

  const bindControls = () => {
    if (dom.unreadToggle) {
      dom.unreadToggle.addEventListener("click", () => {
        state.onlyUnread = !state.onlyUnread;
        renderAll();
      });
    }
    if (dom.tabActionBtn) {
      dom.tabActionBtn.addEventListener("click", () => {
        state.currentTab = "Action Required";
        renderAll();
      });
    }
    if (dom.tabGeneralBtn) {
      dom.tabGeneralBtn.addEventListener("click", () => {
        state.currentTab = "General Updates";
        renderAll();
      });
    }
    if (dom.markAllBtn) {
      dom.markAllBtn.addEventListener("click", () => {
        markAllAsRead();
      });
    }
    document.querySelectorAll(".markReadBtn").forEach((button) => {
      button.addEventListener("click", () => {
        markAllAsRead();
      });
    });
    if (dom.viewMoreBtn) {
      dom.viewMoreBtn.addEventListener("click", (event) => {
        event.preventDefault();
        if (dom.listEl) {
          dom.listEl.style.maxHeight = "600px";
        }
      });
    }
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

  let announcementQuery = null;
  let announcementSub = null;

  const subscribeToUpdates = () => {
    if (!announcementQuery) {
      return;
    }
    announcementSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof announcementQuery.subscribe === "function") {
        liveObs = announcementQuery.subscribe();
      }
    } catch (error) {
      console.error("[Announcements] subscribe failed", error);
    }
    if (!liveObs && typeof announcementQuery.localSubscribe === "function") {
      try {
        liveObs = announcementQuery.localSubscribe();
      } catch (error) {
        console.error("[Announcements] localSubscribe failed", error);
      }
    }
    if (!liveObs) {
      return;
    }
    announcementSub = liveObs
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .subscribe({
        next: (payload) => {
          const records = extractRecords(payload);
          state.items = mapNotifications(records);
          renderAll();
        },
        error: () => {},
      });
  };

  const fetchNotifications = async () => {
    if (typeof window.getVitalStatsPlugin !== "function") {
      return;
    }
    const plugin = await window.getVitalStatsPlugin();
    const model = plugin.switchTo("PeterpmAnnouncement");
    announcementQuery = model
      .query()
      .where("notified_contact_id", loggedInUserId)
      .deSelectAll()
      .select([
        "id",
        "created_at",
        "title",
        "unique_id",
        "type",
        "is_read",
        "notified_contact_id",
        "origin_url",
      ])
      .noDestroy();
    announcementQuery = announcementQuery.orderBy("created_at", "desc");
    announcementQuery.getOrInitQueryCalc?.();
    let result = null;
    try {
      result = await announcementQuery.fetchDirect().toPromise();
    } catch (error) {
      console.error("[Announcements] Fetch error", error);
    }
    const records = extractRecords(result);
    state.items = mapNotifications(records);
    renderAll();
    subscribeToUpdates();
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindControls();
    fetchNotifications();
  });
})();

