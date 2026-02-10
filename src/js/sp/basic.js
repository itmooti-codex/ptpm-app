window.addEventListener("load", function () {
  const loader = document.getElementById("loader");
  setTimeout(() => {
    loader.classList.add("fade-out");
  }, 500);
});
function toggleModal() {
  const modal = document.getElementById("announcements-modal");
  modal.style.display = modal.style.display === "block" ? "none" : "block";
}

const body = document.body;
const sliders = document.querySelectorAll(".side");
body.setAttribute(
  "x-data",
  JSON.stringify({
    deleteQuoteId: {},
    deleting: false,
    isSidebarExpanded: true,
    jobData: {},
    deleteQuoteModal: false,
    createQuoteModal: false,
    paymentsData: {
      PeterpmService_Service_Name: [],
      activityData: [],
      Xero_Bill_Status: [],
    },
    modalIsOpen: false,
    modalIsOpen2: false,
    modalIsOpen3: false,
    isChecked: false,
    isExpandedClientSection: false,
    isExpandedMaterialsSection: false,
    accordianPropertyAndOwnerInformationExpoanded: window.innerWidth >= 1100,
    accordianHelpExpoanded: window.innerWidth >= 1100,
    accordianPropertyDescriptionExpoanded: window.innerWidth >= 1100,
    accordianPropertyInformationExpoanded: window.innerWidth >= 1100,
    accordianResidentExpoanded: window.innerWidth >= 1100,
    accordianExpanded: window.innerWidth >= 1100,
    appointmentData: {},
    scheduledData: {},
    openScheduledInquiryModal: false,
    returnInquiryModal: false,
    scheduleSiteVisitModal: false,
    scheduledRreturnInquiryModal: false,
    rescheduleVisitOpenModal: false,
    selectedTab: "overview",
    newClientModal: false,
    addnewCompanyModal: false,
    editPropertyInfoModal: false,
    propertyOwnerAndResidentModal: false,
    propertyDescriptionModal: false,
    combinedPropertyEditModal: false,
    deleteMaterialMoodal: false,
    deleteMaterialId: {},
    editMaterialModal: false,
    viewMaterialModal: false,
    actionIconModal: false,
  }),
);
window.addEventListener("resize", () => {
  const xData = JSON.parse(document.body.getAttribute("x-data"));
  xData.accordianExpanded = window.innerWidth >= 1100;
  document.body.setAttribute("x-data", JSON.stringify(xData));
});

window.addEventListener("resize", () => {
  const xDatas = JSON.parse(document.body.getAttribute("x-data"));
  xDatas.accordianResidentExpoanded = window.innerWidth >= 1100;
  document.body.setAttribute("x-data", JSON.stringify(xDatas));
});
sliders.forEach((slider) => {
  slider.setAttribute(":class", "isSidebarExpanded ? 'pl-64px' : 'pl-20px'");
});
const navItems = [
  {
    selector: ".bgDashboard",
    match: (path, url) =>
      /\/dashboard\/home/.test(path) || /\/components/.test(url),
  },
  {
    selector: ".bgInquiries",
    match: (path) => /\/list\/inquiries/.test(path),
  },
  {
    selector: ".bgQuotes",
    match: (path) => /\/list\/quotes/.test(path),
  },
  {
    selector: ".bgJob",
    match: (path) => /\/list\/jobs/.test(path) || /\/job\b/.test(path),
  },
  {
    selector: ".bgPayments",
    match: (path) => /\/list\/payments/.test(path),
  },
  {
    selector: ".bgCalendar",
    match: (path) => /\/calender/.test(path) || /\/calendar/.test(path),
  },
  {
    selector: ".bgAppointments",
    match: (path) => /\/list\/appointments/.test(path),
  },
  {
    selector: ".bgMaterial",
    match: (path) => /\/list\/materials/.test(path),
  },
];

const currentPath = window.location.pathname;
const currentUrl = window.location.href;

navItems.forEach(({ selector }) => {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.remove("bg-secondary");
  }
});

const activeItem = navItems.find(({ match }) => match(currentPath, currentUrl));
if (activeItem) {
  const targetElement = document.querySelector(activeItem.selector);
  if (targetElement) {
    targetElement.classList.add("bg-secondary");
  }
}

//Hide sandbox banner
window.addEventListener("load", function () {
  setTimeout(function () {
    document.querySelector("body > div:nth-child(1)").style.display = "none";
  }, 2000);
});

function addSidebarOverlay() {
  const sidebarOverlay = document.querySelector(".sidebarOverlay");
  if (sidebarOverlay) {
    if (window.innerWidth < 1100) {
      if (sidebarOverlay.classList.contains("block")) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    } else {
      document.body.style.overflow = "auto";
    }
  }
}
setInterval(addSidebarOverlay, 100);

const urlParamsSelectedTab = new URL(window.location.href);
const selectedTabFromUrl = urlParamsSelectedTab.searchParams.get("selectedTab");
let selectedTab = selectedTabFromUrl;
try {
  const xData = JSON.parse(document.body.getAttribute("x-data") || "{}");
  if (!selectedTab) {
    selectedTab = xData.selectedTab || "activities";
  }
  xData.selectedTab = selectedTab;
  document.body.setAttribute("x-data", JSON.stringify(xData));
} catch (error) {
  if (!selectedTab) {
    selectedTab = "activities";
  }
  console.error("Failed to sync selected tab:", error);
}
console.log("Selected tab", selectedTab);
if (selectedTab === "memo" && typeof initializePosts === "function") {
  initializePosts();
}

function setAttributesForElements(selector, attributes) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element) => {
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setAttributesForElements(".memoBlock", {
    "x-show": "selectedTab === 'memo'",
    id: "tabpanelMemo",
    role: "tabpanel",
    "aria-label": "memo",
  });

  setAttributesForElements(".overviewBlock", {
    "x-show": "selectedTab === 'overview'",
    id: "tabpanelOverview",
    role: "tabpanel",
    "aria-label": "overview",
  });

  setAttributesForElements(".notesBlock", {
    "x-show": "selectedTab === 'notes'",
    id: "tabpanelNotes",
    role: "tabpanel",
    "aria-label": "notes",
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const tabContainers = document.querySelectorAll(".tab-container");

  function filterAnnouncements(container, filter) {
    const announcementSection = document.querySelector(
      `.announcement-section[data-container="${container}"]`,
    );

    if (!announcementSection) return;

    const unreadDivs = announcementSection.querySelectorAll(".unread");
    const readDivs = announcementSection.querySelectorAll(".read");

    if (filter === "all") {
      unreadDivs.forEach((div) => div.classList.remove("hidden"));
      readDivs.forEach((div) => div.classList.remove("hidden"));
    } else if (filter === "unread") {
      unreadDivs.forEach((div) => div.classList.remove("hidden"));
      readDivs.forEach((div) => div.classList.add("hidden"));
    }
  }

  tabContainers.forEach((tabContainer) => {
    const tabs = tabContainer.querySelectorAll(".selectorTab");
    const containerType = tabContainer.dataset.container;

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Update selected tab UI
        tabs.forEach((t) => t.classList.remove("selectedTab"));
        tab.classList.add("selectedTab");

        // Filter announcements
        const filter = tab.dataset.filter;
        filterAnnouncements(containerType, filter);
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const statusDiv = document.querySelector("#optonSelect");
  const statusValue = statusDiv.getAttribute("value");
  const profileStatusSelect = document.getElementById("profileStatus");

  Array.from(profileStatusSelect.options).forEach((option) => {
    if (option.value === statusValue) {
      option.selected = true;
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const removeStatusAfter = REMOVE_STATUS_AFTER_OP_VALUE;
  const durationSelect = document.getElementById("durationSelect");
  for (let option of durationSelect.options) {
    if (option.value === removeStatusAfter) {
      option.selected = true;
      break;
    }
  }
});

// Select Elements
const profileModal = document.getElementById("profileStatusModal");
const openProfileModalButton = document.getElementById(
  "openProfileStatusButton",
);
const closeProfileModalButtons = [
  document.getElementById("closeProfileStatusModal"),
  document.getElementById("cancelProfileStatus"),
];
const saveStatusButton = document.getElementById("saveProfileStatusButton");

// Open Modal
openProfileModalButton.addEventListener("click", () => {
  profileModal.classList.remove("hidden");
  profileModal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
});

// Close Modal
closeProfileModalButtons.forEach((button) =>
  button.addEventListener("click", () => {
    profileModal.classList.add("hidden");
    profileModal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }),
);

// Close Modal on Outside Click
profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) {
    profileModal.classList.add("hidden");
    profileModal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }
});

// Close Modal on Escape Key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    profileModal.classList.add("hidden");
    profileModal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }
});

// Save Status Button Action
saveStatusButton.addEventListener("click", () => {
  // alert('Profile status updated successfully!');
  var stat = document.getElementById("profileStatus").value;
  var optonSelect = document.getElementById("optonSelect");
  optonSelect.textContent = stat;
  profileModal.classList.add("hidden");
  profileModal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
});

tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        secondary: "var(--secondary-color)",
        accent: "var(--accent-color)",
        complementary: "var(--complementary-color)",
        dark: "var(--dark-color)",
        light: "var(--light-color)",
        white: "var(--white-color)",
        line: "var(--line-color)",
        danger: "var(--danger-color)",
        warning: "var(--warning-color)",
        cool: "var(--cool-color)",
        success: "var(--success-color)",
      },
      screens: {
        xlg: "1100px",
      },
      fontSize: {
        h1: [
          "var(--headline-fs)",
          {
            lineHeight: "var(--headline-lh)",
            fontWeight: "var(--headline-fw)",
          },
        ],
        h2: [
          "var(--subheadline-fs)",
          {
            lineHeight: "var(--subheadline-lh)",
            fontWeight: "var(--subheadline-fw)",
          },
        ],
        h3: [
          "var(--subheadline2-fs)",
          {
            lineHeight: "var(--subheadline2-lh)",
            fontWeight: "var(--subheadline2-fw)",
          },
        ],
        largeBodyText: [
          "var(--largebodytext-fs)",
          {
            lineHeight: "var(--largebodytext-lh)",
            fontWeight: "var(--largebodytext-fw)",
          },
        ],
        bodyText: [
          "var(--bodytext-fs)",
          {
            lineHeight: "var(--bodytext-lh)",
            fontWeight: "var(--bodytext-fw)",
          },
        ],
        button: [
          "var(--button-fs)",
          { lineHeight: "var(--button-lh)", fontWeight: "var(--button-fw)" },
        ],
        label: [
          "var(--label-fs)",
          { lineHeight: "var(--label-lh)", fontWeight: "var(--label-fw)" },
        ],
        blockquote: [
          "var(--blockquote-fs)",
          {
            lineHeight: "var(--blockquote-lh)",
            fontWeight: "var(--blockquote-fw)",
          },
        ],
      },
    },
  },
};

function checkUrlForParam(url, paramKey, paramValue) {
  const [baseUrl, queryString] = url.split("?");
  if (!queryString) return false;
  const queryParams = queryString.split("&");
  for (let param of queryParams) {
    const [key, value] = param.split("=");
    if (key === paramKey && value === paramValue) {
      return true;
    }
  }
  return false;
}

window.addEventListener("load", () => {
  const currentUrl = window.location.href;
  const paramKey = "ns";
  const paramValue = "true";
  console.log(
    "current Url, paramKey, paramValue",
    currentUrl,
    paramKey,
    paramValue,
  );
  if (checkUrlForParam(currentUrl, paramKey, paramValue)) {
    const notificationTab = document.querySelectorAll(".myProfileTab");
    notificationTab[3].click();
  } else {
    console.log(
      `The URL does NOT contain the parameter ${paramKey}=${paramValue}.`,
    );
  }
});
