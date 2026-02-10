function Checkbox(elem) {
  this.elem = elem;
  this.checked = elem.dataset.checked;
  elem.addEventListener("click", (e) => {
    this.checked = !this.checked;
    this.render();
  });
}
Checkbox.prototype.render = function () {
  this.elem.setAttribute("data-checked", this.checked);
};
function initCheckboxes(elems) {
  for (let i = 0; i < elems.length; i++) {
    new Checkbox(elems[i]);
  }
}
initCheckboxes(document.querySelectorAll(".checkbox"));
document.addEventListener("DOMContentLoaded", function () {
  const desktopNavTabs = document.querySelectorAll(".myProfileTab");
  const desktopContentBlocks = [
    document.querySelector(".myProfileContainer"),
    document.querySelector(".bankDetailsContainer"),
    document.getElementById("changePasswordChildContainer"),
    document.getElementById("notificationChildContainer"),
  ];
  const mobileNavTabs = document.querySelectorAll(".navbar-mobile");
  const parentFlex = document.getElementById(
    "parentFlexContaierNavbarActualContents",
  );
  const mobileContentBlocks = parentFlex ? Array.from(parentFlex.children) : [];
  let activeTabIndex = 0;
  function isMobileLayout() {
    return window.innerWidth <= 1100;
  }
  const notificationContainerMobile = document.querySelector(
    "#notificationContainerMobile",
  );
  if (notificationContainerMobile) {
    notificationContainerMobile.addEventListener("click", () => {
      activeTabIndex = 3;
      refreshUI();
    });
  }
  const parentContainer_ServiceTexts_Desktop = document.getElementById(
    "parentContainer_ServiceTexts_Desktop",
  );
  const parentContainer_BankDetails_Desktop = document.getElementById(
    "parentContainer_BankDetails_Desktop",
  );
  const changePasswordChildContainer = document.getElementById(
    "changePasswordChildContainer",
  );
  const notificationChildContainer = document.getElementById(
    "notificationChildContainer",
  );
  let serviceTextsOrigParent = null,
    serviceTextsOrigNext = null;
  let bankDetailsOrigParent = null,
    bankDetailsOrigNext = null;
  let pwdOrigParent = null,
    pwdOrigNext = null;
  let notificationOrigParent = null,
    notificationOrigNext = null;
  if (parentContainer_ServiceTexts_Desktop) {
    serviceTextsOrigParent = parentContainer_ServiceTexts_Desktop.parentNode;
    serviceTextsOrigNext = parentContainer_ServiceTexts_Desktop.nextSibling;
  }
  if (parentContainer_BankDetails_Desktop) {
    bankDetailsOrigParent = parentContainer_BankDetails_Desktop.parentNode;
    bankDetailsOrigNext = parentContainer_BankDetails_Desktop.nextSibling;
  }
  if (changePasswordChildContainer) {
    pwdOrigParent = changePasswordChildContainer.parentNode;
    pwdOrigNext = changePasswordChildContainer.nextSibling;
  }
  if (notificationChildContainer) {
    notificationOrigParent = notificationChildContainer.parentNode;
    notificationOrigNext = notificationChildContainer.nextSibling;
  }
  const parentContainer_ServiceTexts_Mobile = document.getElementById(
    "parentContainer_ServiceTexts",
  );
  const parentContainerBankDetails_Mobile = document.getElementById(
    "parentContainerBankDetails_Mobile",
  );
  const parentContainerPassword_Mobile = document.getElementById(
    "parentContainerPassword_Mobile",
  );
  const parentContainerNotification_Mobile = document.getElementById(
    "parentContainerNotification_Mobile",
  );
  function moveBlocksToMobile() {
    if (
      parentContainer_ServiceTexts_Mobile &&
      parentContainer_ServiceTexts_Desktop &&
      !parentContainer_ServiceTexts_Mobile.contains(
        parentContainer_ServiceTexts_Desktop,
      )
    ) {
      parentContainer_ServiceTexts_Mobile.appendChild(
        parentContainer_ServiceTexts_Desktop,
      );
    }
    if (
      parentContainerBankDetails_Mobile &&
      parentContainer_BankDetails_Desktop &&
      !parentContainerBankDetails_Mobile.contains(
        parentContainer_BankDetails_Desktop,
      )
    ) {
      parentContainerBankDetails_Mobile.appendChild(
        parentContainer_BankDetails_Desktop,
      );
    }
    if (
      parentContainerPassword_Mobile &&
      changePasswordChildContainer &&
      !parentContainerPassword_Mobile.contains(changePasswordChildContainer)
    ) {
      parentContainerPassword_Mobile.appendChild(changePasswordChildContainer);
    }
    if (
      parentContainerNotification_Mobile &&
      notificationChildContainer &&
      !parentContainerNotification_Mobile.contains(notificationChildContainer)
    ) {
      parentContainerNotification_Mobile.appendChild(
        notificationChildContainer,
      );
    }
  }
  function moveBlocksToDesktop() {
    if (parentContainer_ServiceTexts_Desktop && serviceTextsOrigParent) {
      if (
        parentContainer_ServiceTexts_Desktop.parentNode !==
        serviceTextsOrigParent
      ) {
        serviceTextsOrigParent.insertBefore(
          parentContainer_ServiceTexts_Desktop,
          serviceTextsOrigNext,
        );
      }
    }
    if (parentContainer_BankDetails_Desktop && bankDetailsOrigParent) {
      if (
        parentContainer_BankDetails_Desktop.parentNode !== bankDetailsOrigParent
      ) {
        bankDetailsOrigParent.insertBefore(
          parentContainer_BankDetails_Desktop,
          bankDetailsOrigNext,
        );
      }
    }
    if (changePasswordChildContainer && pwdOrigParent) {
      if (changePasswordChildContainer.parentNode !== pwdOrigParent) {
        pwdOrigParent.insertBefore(changePasswordChildContainer, pwdOrigNext);
      }
    }
    if (notificationChildContainer && notificationOrigParent) {
      if (notificationChildContainer.parentNode !== notificationOrigParent) {
        notificationOrigParent.insertBefore(
          notificationChildContainer,
          notificationOrigNext,
        );
      }
    }
  }
  function hideAllDesktopBlocks() {
    desktopContentBlocks.forEach((block) => {
      if (block) block.classList.add("hidden");
    });
  }
  function hideAllMobileBlocks() {
    mobileContentBlocks.forEach((block) => {
      if (block) block.classList.add("hidden");
    });
  }
  function refreshUI() {
    if (isMobileLayout()) {
      moveBlocksToMobile();
    } else {
      moveBlocksToDesktop();
    }
    hideAllDesktopBlocks();
    hideAllMobileBlocks();
    if (isMobileLayout()) {
      mobileNavTabs.forEach((tab) => {
        tab.classList.remove("border-b-[#003882]", "text-[#003882]");
        tab.classList.add("text-dark");
        const svgPath = tab.querySelector("svg path");
        if (svgPath) {
          svgPath.setAttribute("fill", "#414042");
        } else {
          const svg = tab.querySelector("svg");
          if (svg) svg.setAttribute("fill", "#414042");
        }
      });
      if (mobileNavTabs[activeTabIndex]) {
        mobileNavTabs[activeTabIndex].classList.remove("text-dark");
        mobileNavTabs[activeTabIndex].classList.add(
          "border-b-[#003882]",
          "text-[#003882]",
        );
        const svgPath = mobileNavTabs[activeTabIndex].querySelector("svg path");
        if (svgPath) {
          svgPath.setAttribute("fill", "#003882");
        } else {
          const svg = mobileNavTabs[activeTabIndex].querySelector("svg");
          if (svg) svg.setAttribute("fill", "#003882");
        }
      }
      if (mobileContentBlocks[activeTabIndex]) {
        mobileContentBlocks[activeTabIndex].classList.remove("hidden");
      }
      if (activeTabIndex === 3 && notificationChildContainer) {
        notificationChildContainer.classList.remove("hidden");
      }
      if (activeTabIndex === 2 && changePasswordChildContainer) {
        changePasswordChildContainer.classList.remove("hidden");
      }
    } else {
      desktopNavTabs.forEach((tab) => {
        tab.classList.remove("bg-[#003882]", "text-[#fff]");
        const svgPath = tab.querySelector("svg path");
        if (svgPath) {
          svgPath.setAttribute("fill", "#414042");
        } else {
          const svg = tab.querySelector("svg");
          if (svg) svg.setAttribute("fill", "#414042");
        }
      });
      if (desktopNavTabs[activeTabIndex]) {
        desktopNavTabs[activeTabIndex].classList.add(
          "bg-[#003882]",
          "text-[#fff]",
        );
        const svgPath =
          desktopNavTabs[activeTabIndex].querySelector("svg path");
        if (svgPath) {
          svgPath.setAttribute("fill", "#fff");
        } else {
          const svg = desktopNavTabs[activeTabIndex].querySelector("svg");
          if (svg) svg.setAttribute("fill", "#fff");
        }
      }
      if (desktopContentBlocks[activeTabIndex]) {
        desktopContentBlocks[activeTabIndex].classList.remove("hidden");
      }
    }
  }
  function findActiveTabIndexDesktop() {
    for (let i = 0; i < desktopContentBlocks.length; i++) {
      if (
        desktopContentBlocks[i] &&
        !desktopContentBlocks[i].classList.contains("hidden")
      ) {
        return i;
      }
    }
    return 0;
  }
  function findActiveTabIndexMobile() {
    for (let i = 0; i < mobileContentBlocks.length; i++) {
      if (
        mobileContentBlocks[i] &&
        !mobileContentBlocks[i].classList.contains("hidden")
      ) {
        return i;
      }
    }
    return 0;
  }
  function detectInitialActiveTabIndex() {
    if (isMobileLayout()) {
      return findActiveTabIndexMobile();
    } else {
      return findActiveTabIndexDesktop();
    }
  }
  desktopNavTabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      activeTabIndex = i;
      refreshUI();
    });
  });
  mobileNavTabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      activeTabIndex = i;
      refreshUI();
    });
  });
  window.addEventListener("resize", refreshUI);
  activeTabIndex = detectInitialActiveTabIndex();
  if (typeof activeTabIndex !== "number" || isNaN(activeTabIndex)) {
    activeTabIndex = 0;
  }
  refreshUI();
  const queryCurrentlyProvided = `
query calcOServiceProvidedServiceProviderofServices($id: PeterpmServiceProviderID) {
calcOServiceProvidedServiceProviderofServices(
query: [
{
where: {
Service_Provider_of_Service: [
{ where: { id: $id } }
]
}
}
]
){
ID: field(arg: ["id"])
Service_Provided_Service_Name: field(arg: ["Service_Provided", "service_name"])
Service_Provided_ID: field(arg: ["service_provided_id"])
}
}
`;
  const queryAllServices = `
query calcServices {
calcServices(query: [{ where: { service_type: "Primary" } }]) {
Service_Name: field(arg: ["service_name"])
ID: field(arg: ["id"])
}
}
`;
  const mutationCreateServicesOffered = `
mutation createServicesOffered($payload: ServicesOfferedCreateInput = null) {
createServicesOffered(payload: $payload) {
id
service_provided_id
service_provider_of_service_id
}
}
`;
  const mutationDeleteServicesOffered = `
mutation deleteServicesOffered($id: PeterpmServicesOfferedID) {
deleteServicesOffered(query: [{ where: { id: $id } }]) {
id
}
}
`;
  const serviceDivsMap = {};
  async function fetchCurrentlyProvidedServices() {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Api-Key": apiKey },
        body: JSON.stringify({
          query: queryCurrentlyProvided,
          variables: { id: providedById },
        }),
      });
      const result = await response.json();
      console.log(result);
      return result.data?.calcOServiceProvidedServiceProviderofServices || [];
    } catch (err) {
      console.error("Error fetching currently provided services:", err);
      return [];
    }
  }
  async function fetchAllServices() {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Api-Key": apiKey },
        body: JSON.stringify({ query: queryAllServices }),
      });
      const result = await response.json();
      console.log(result);
      return result.data?.calcServices || [];
    } catch (err) {
      console.warn("Error fetching all services:", err);
      return [];
    }
  }
  async function createServiceOffered(serviceId, serviceDiv) {
    const serviceName =
      serviceDiv.getAttribute("data-original-text") || "Service";
    const payload = {
      service_provider_of_service_id: providedById,
      service_provided_id: serviceId,
    };
    let interval = null;
    try {
      serviceDiv.style.pointerEvents = "none";
      let dotCount = 0;
      serviceDiv.classList.add("adding-animation");
      const textSpan = serviceDiv.querySelector(".serviceNameText");
      if (textSpan) {
        textSpan.textContent = `${serviceName} Adding`;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Api-Key": apiKey },
        body: JSON.stringify({
          query: mutationCreateServicesOffered,
          variables: { payload },
        }),
      });
      const json = await response.json();
      clearInterval(interval);
      serviceDiv.classList.remove("adding-animation");
      serviceDiv.style.pointerEvents = "auto";
      const newRecordId = json.data?.createServicesOffered?.id || null; // bug fix here
      if (newRecordId) {
        markItemAsSelected(serviceDiv, serviceName);
        if (textSpan) {
          textSpan.textContent = serviceName + "Added ✔️";
          setTimeout(() => {
            markItemAsSelected(serviceDiv, serviceName);
          }, 1299);
        }
        return String(newRecordId);
      } else {
        throw new Error("No ID returned from creation mutation");
      }
    } catch (error) {
      if (interval) clearInterval(interval);
      serviceDiv.classList.remove("adding-animation");
      serviceDiv.style.pointerEvents = "auto";
      console.error("Error creating service:", error);
      const textSpan = serviceDiv.querySelector(".serviceNameText");
      if (textSpan) {
        textSpan.textContent = `${serviceName} (Addition Failed) ❌`;
        setTimeout(() => {
          textSpan.textContent = serviceName;
        }, 1299);
      }
      return null;
    }
  }
  async function deleteService(recordId, container) {
    try {
      container.style.opacity = "0.5";
      container.classList.add("cursor-not-allowed", "select-none");
      container.style.pointerEvents = "none";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Api-Key": apiKey },
        body: JSON.stringify({
          query: mutationDeleteServicesOffered,
          variables: { id: Number(recordId) },
        }),
      });
      const result = await response.json();
      container.style.opacity = "1";
      container.classList.remove("cursor-not-allowed", "select-none");
      container.style.pointerEvents = "auto";
      const deletedId = result.data?.deleteServicesOffered?.id;
      if (deletedId != null && String(deletedId) === String(recordId)) {
        return true;
      } else {
        console.warn("Deletion result mismatch or no ID returned:", result);
        return false;
      }
    } catch (err) {
      container.style.opacity = "1";
      container.classList.remove("cursor-not-allowed", "select-none");
      container.style.pointerEvents = "auto";
      console.error("Error deleting service:", err);
      return false;
    }
  }
  function markItemAsSelected(serviceDiv, serviceName) {
    const checkboxSpan = serviceDiv.querySelector(".checkbox");
    if (checkboxSpan) {
      checkboxSpan.setAttribute("data-checked", "true");
    }
    serviceDiv.setAttribute("data-selected", "true");
    serviceDiv.classList.add("added-status");
    const textSpan = serviceDiv.querySelector(".serviceNameText");
    if (textSpan) {
      textSpan.textContent = serviceName;
    }
  }
  function unmarkItemAsSelected(serviceDiv) {
    const checkboxSpan = serviceDiv.querySelector(".checkbox");
    if (checkboxSpan) {
      checkboxSpan.setAttribute("data-checked", "false");
    }
    serviceDiv.removeAttribute("data-selected");
    serviceDiv.classList.remove("added-status");
    const originalText =
      serviceDiv.getAttribute("data-original-text") || "Service";
    const textSpan = serviceDiv.querySelector(".serviceNameText");
    if (textSpan) {
      textSpan.textContent = originalText;
    }
  }
  function displayChosenService(serviceName, serviceId, recordId) {
    const displayContainer = document.querySelector(
      ".displayContainerChosenServices",
    );
    const template = document.querySelector(".cloneNodeForSelectOptions");
    if (!displayContainer || !template) return;
    const clone = template.cloneNode(true);
    clone.classList.remove("hidden");
    const ratRoofTxt = clone.querySelector(".ratRoofTxt");
    if (ratRoofTxt) {
      ratRoofTxt.textContent = serviceName;
    }
    const deleteButton = clone.querySelector(".deleteButtonOptions");
    if (deleteButton) {
      deleteButton.setAttribute("data-id", recordId);
      deleteButton.addEventListener("click", async () => {
        deleteButton.classList.add("stroke-red-500");
        const isDeleted = await deleteService(recordId, clone);
        if (isDeleted) {
          const mainDivOption = serviceDivsMap[serviceId];
          if (mainDivOption) {
            unmarkItemAsSelected(mainDivOption);
            mainDivOption.removeAttribute("data-record-id");
          }
          clone.remove();
        } else {
          deleteButton.classList.remove("stroke-red-500");
        }
      });
    }
    displayContainer.appendChild(clone);
  }
  async function deleteServiceOfferedWithAnimation(serviceDiv) {
    const recordId = serviceDiv.getAttribute("data-record-id");
    if (!recordId) {
      console.warn("No recordId found on this serviceDiv. Cannot delete.");
      return false;
    }
    serviceDiv.style.pointerEvents = "none";
    serviceDiv.classList.add("deleting-animation");
    const serviceName =
      serviceDiv.getAttribute("data-original-text") || "Service";
    const textSpan = serviceDiv.querySelector(".serviceNameText");
    let interval = null;
    let dotCount = 0;
    if (textSpan) {
      interval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        textSpan.textContent = `${serviceName} Deleting${" . ".repeat(dotCount)}`;
      }, 399);
    }
    const isDeleted = await deleteService(recordId, serviceDiv);
    clearInterval(interval);
    serviceDiv.classList.remove("deleting-animation");
    serviceDiv.style.pointerEvents = "auto";
    if (isDeleted) {
      unmarkItemAsSelected(serviceDiv);
      serviceDiv.removeAttribute("data-record-id");
      if (textSpan) {
        textSpan.textContent = `${serviceName} Deleted ✔️`;
        setTimeout(() => {
          textSpan.textContent = serviceName;
        }, 1299);
      }
      const chosenItemDeleteBtn = document.querySelector(
        `.deleteButtonOptions[data-id="${recordId}"]`,
      );
      if (chosenItemDeleteBtn) {
        const parentChosenRow = chosenItemDeleteBtn.closest(
          ".cloneNodeForSelectOptions",
        );
        if (parentChosenRow) {
          parentChosenRow.remove();
        }
      }
      return true;
    } else {
      if (textSpan) {
        textSpan.textContent = `${serviceName} (Deletion Failed) ❌`;
        setTimeout(() => {
          textSpan.textContent = serviceName;
        }, 1999);
      }
      return false;
    }
  }
  function populateServicesInContainer(services, providedServices) {
    const container = document.getElementById("serviceFormID");
    if (!container) return;
    const providedIds = providedServices.map((s) =>
      String(s.Service_Provided_ID),
    );
    services.forEach((service) => {
      const serviceId = String(service.ID);
      const serviceName = service.Service_Name;
      const isProvided = providedIds.includes(serviceId);
      const serviceDiv = document.createElement("div");
      serviceDiv.innerHTML = `
          <span  class="checkbox"  data-checked="${isProvided ? "true" : "false"}"></span>
          <span class="serviceNameText">${serviceName}</span>
          `;
      serviceDiv.setAttribute("data-service-id", serviceId);
      serviceDiv.setAttribute("data-original-text", serviceName);
      serviceDiv.classList.add(
        "text-[#003882]",
        "border-[#dee7f6]",
        "p-2",
        "hover:bg-[#dee7f6]",
        "flex",
        "items-center",
        "gap-x-2",
        "px-4",
      );
      if (isProvided) {
        markItemAsSelected(serviceDiv, serviceName);
      }
      serviceDivsMap[serviceId] = serviceDiv;
      const checkboxSpan = serviceDiv.querySelector(".checkbox");
      if (checkboxSpan) {
        checkboxSpan.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (serviceDiv.getAttribute("data-selected") === "true") {
            const existingRecordId = serviceDiv.getAttribute("data-record-id");
            if (existingRecordId) {
              await deleteServiceOfferedWithAnimation(serviceDiv);
            } else {
              console.warn(
                "Already selected, but no record ID found to delete!",
              );
            }
          } else {
            const newRecordId = await createServiceOffered(
              serviceId,
              serviceDiv,
            );
            if (newRecordId) {
              serviceDiv.setAttribute("data-record-id", newRecordId);
              displayChosenService(serviceName, serviceId, newRecordId);
            }
          }
        });
      }
      container.appendChild(serviceDiv);
    });
  }
  async function initializeServices() {
    try {
      const [providedServices, allServices] = await Promise.all([
        fetchCurrentlyProvidedServices(),
        fetchAllServices(),
      ]);
      populateServicesInContainer(allServices, providedServices);
      providedServices.forEach((ps) => {
        const sName = ps.Service_Provided_Service_Name;
        const sId = String(ps.Service_Provided_ID);
        const rId = String(ps.ID);
        const mainDivOption = serviceDivsMap[sId];
        if (mainDivOption) {
          mainDivOption.setAttribute("data-record-id", rId);
        }
        displayChosenService(sName, sId, rId);
      });
    } catch (err) {
      console.error("Error in initializeServices:", err);
    }
  }
  initializeServices();
  const formModal_Edit_Payment_Info = document.querySelector(
    ".formModal_Edit_Payment_Info",
  );
  const formModalEditProfileInfo = document.querySelector(
    ".formModalEditProfileInfo",
  );
  function updateModalWidths() {
    if (formModal_Edit_Payment_Info) {
      formModal_Edit_Payment_Info.classList.remove("w-screen", "w-[500px]");
      if (window.innerWidth <= 1100) {
        formModal_Edit_Payment_Info.classList.add("w-screen");
      } else {
        formModal_Edit_Payment_Info.classList.add("w-[500px]");
      }
    }
    if (formModalEditProfileInfo) {
      formModalEditProfileInfo.classList.remove("w-screen", "w-[500px]");
      if (window.innerWidth <= 1100) {
        formModalEditProfileInfo.classList.add("w-screen");
      } else {
        formModalEditProfileInfo.classList.add("w-[500px]");
      }
    }
  }
  window.addEventListener("resize", updateModalWidths);
  updateModalWidths();
  if (formModal_Edit_Payment_Info && formModalEditProfileInfo) {
    formModal_Edit_Payment_Info.classList.add("scale-100");
    formModal_Edit_Payment_Info.classList.remove("scale-0");
    formModalEditProfileInfo.classList.add("scale-100");
    formModalEditProfileInfo.classList.remove("scale-0");
  }
  const editButtonOpenFormModal = document.querySelector(
    ".editButtonOpenFormModal",
  );
  const customPswdChangeBtns = document.querySelectorAll(
    ".customPasswordChangeBtn",
  );
  const realPasswordChangeBtn = document.querySelector(".changePwdBtn");
  if (customPswdChangeBtns.length > 0) {
    customPswdChangeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (realPasswordChangeBtn) {
          console.log("Real password change triggered from custom button.");
          realPasswordChangeBtn.click();
        } else {
          console.error("Real password change button not found!");
        }
      });
    });
  } else {
    console.log(
      "No custom password change buttons found. Possibly not ONTRAPORT environment?",
    );
  }
  const parentContainerForAllServiceTxts = document.getElementById(
    "parentContainerForAllServiceTxts",
  );
  const serviceFormDropdown = document.getElementById("serviceFormID");
  let isServiceDropdownOpen = false;
  if (parentContainerForAllServiceTxts && serviceFormDropdown) {
    parentContainerForAllServiceTxts.addEventListener("click", (e) => {
      e.stopPropagation();
      isServiceDropdownOpen = !isServiceDropdownOpen;
      serviceFormDropdown.style.height = isServiceDropdownOpen
        ? "250px"
        : "0px";
    });
    document.addEventListener("click", (e) => {
      if (
        isServiceDropdownOpen &&
        !parentContainerForAllServiceTxts.contains(e.target) &&
        !serviceFormDropdown.contains(e.target)
      ) {
        isServiceDropdownOpen = false;
        serviceFormDropdown.style.height = "0px";
      }
    });
  }
});

let intervalID = null;
const ProfileModalTriggerer = document.querySelector("#profileTriggerMODAL");
const profileModall = document.querySelector(".formModalEditProfileInfo");
const crossMarkProfileModal = document.querySelector(
  ".crossMarkCloseProfileModall",
);
const updateBtnProfileModal = document.querySelector(".updateButtonProfile");
const cancelBtnProfileModal = document.querySelector(".cancelButtonProfile");
const realSubmitBtnProfile = document.querySelector(".realSubmitBtnProfile");
const formModalEditProfileInfo = document.querySelector(
  ".formModalEditProfileInfo",
);

function adjustModalWidths() {
  // Adjust width for profileModall
  if (profileModall) {
    if (window.innerWidth <= 1100) {
      profileModall.classList.add("w-max");
      profileModall.classList.remove("w-[500px]");
    } else {
      profileModall.classList.add("w-[500px]");
      profileModall.classList.remove("w-max");
    }
  } else {
    console.error("Profile modal element not found");
  }

  // Adjust width for formModalEditProfileInfo
  if (formModalEditProfileInfo) {
    if (window.innerWidth <= 1100) {
      formModalEditProfileInfo.classList.add("w-max");
      formModalEditProfileInfo.classList.remove("w-[500px]");
    } else {
      formModalEditProfileInfo.classList.add("w-[500px]");
      formModalEditProfileInfo.classList.remove("w-max");
    }
  } else {
    console.error("Edit profile info modal element not found");
  }
}

// Add listener for window resize
window.addEventListener("resize", adjustModalWidths);

// Adjust modal widths on page load
adjustModalWidths();
/*added above */

const firstNameInput = document.querySelector(".firstName input");
const lastNameInput = document.querySelector(".lastName input");
const profilePic = document.querySelector(".profilePic input");

const jobRatePercentage2 = document.querySelector(".jobRatePercentage2 input");
const workEmail2 = document.querySelector(".workEmail2 input");

const addressProfile = document.querySelector(".addressProfile input");
const address2Profile = document.querySelector(".address2Profile input");
const cityProfile = document.querySelector(".cityProfile input");
const zipcodeProfile = document.querySelector(".zipcodeProfile input");

const firstNameCustomvalue = document.querySelector("#firstNameProfile");
const lastNameCustomvalue = document.querySelector("#lastNameProfile");
const profilePicCustomValue = document.querySelector("#profilePicProfile");
const jobRatePercentageCustomvalue = document.querySelector(
  "#jobRatePercentageProfile",
);
const workEmailCustomvalue = document.querySelector("#workEmailProfile");

const addressCustomValue = document.querySelector("#AddressProfile");
const address2CustomValue = document.querySelector("#address2Profile");
const cityCustomValue = document.querySelector("#cityProfile");
const zipCodeCustom = document.querySelector("#zipProfile");

const profilePicPath = document.querySelector("#profilePicProfile");
const fileInput = document.querySelector(".profilePic input");
const chosenProfilePicPathDisplayDiv = document.querySelector(
  ".chosenProfilePicPathDisplayDiv",
);

profilePicPath.addEventListener("click", (e) => {
  fileInput.click();
  if (intervalID) {
    clearInterval(intervalID);
  }
  intervalID = setInterval(() => {
    chosenProfilePicPathDisplayDiv.innerText =
      fileInput.value || "No file chosen";
  }, 999);
});

updateBtnProfileModal.addEventListener("click", (e) => {
  console.log("update button has been clicked");

  firstNameInput.value = firstNameCustomvalue.value;
  lastNameInput.value = lastNameCustomvalue.value;
  workEmail2.value = workEmailCustomvalue.value;
  console.log(profilePicCustomValue.value);
  addressProfile.value = addressCustomValue.value;
  address2Profile.value = address2CustomValue.value;
  cityProfile.value = cityCustomValue.value;
  zipcodeProfile.value = zipCodeCustom.value;
  realSubmitBtnProfile.click();
});

const buttons = document.querySelectorAll(".notificationButton");
const switches = document.querySelectorAll(".insiderSwitch");
const resetNotificationSettings = document.querySelector(
  ".resetNotificationSettings",
);

const PauseAllNotificationsval = PauseAllNotificationsvalOP;
const NewInquiryBtnVal = NewInquiryBtnValOP;
const quotesJobsval = quotesJobsvalOP;
const memosOrCommentsval = memosOrCommentsvalOP;
const approvalByAdminsval = approvalByAdminsvalOP;

const realSubmitBtnNotification = document.querySelector(
  ".realSubmitBtnNotificationBoxes",
);
const customSUbmitBtnNotification = document.querySelector(
  "#customSubmitBtnNotification",
);

const pauseAllNotification = document.querySelector(
  'input[name="f3203"][type="hidden"]',
);
const inquiries = document.querySelector('input[name="f3195"][type="hidden"]');
const quotesJObs = document.querySelector('input[name="f3197"][type="hidden"]');
const memosOrComments = document.querySelector(
  'input[name="f3206"][type="hidden"]',
);
const approvalByAdmin = document.querySelector(
  'input[name="f3202"][type="hidden"]',
);

const resolvedArray = [
  PauseAllNotificationsval === "Yes",
  NewInquiryBtnVal === "Yes",
  quotesJobsval === "Yes",
  memosOrCommentsval === "Yes",
  approvalByAdminsval === "Yes",
];

function setButtonState(index, isOn) {
  const button = buttons[index];
  const switchInsider = switches[index];

  if (isOn) {
    switchInsider.classList.add(
      "transform",
      "translate-x-full",
      "duration-300",
    );
    button.classList.add("bg-[#003882]", "duration-300");
    button.classList.remove("bg-[#b7b7b7]");

    switch (index) {
      case 0:
        pauseAllNotification.value = "on";
        buttons.forEach((btn, i) => {
          if (i !== 0) {
            btn.classList.add(
              "opacity-50",
              "cursor-not-allowed-here",
              "pointer-events-none",
            );
          }
        });
        break;
      case 1:
        inquiries.value = "on";
        break;
      case 2:
        quotesJObs.value = "on";
        break;
      case 3:
        memosOrComments.value = "on";
        break;
      case 4:
        approvalByAdmin.value = "on";
        break;

      default:
        console.error("Fatal Error Occurred");
    }
  } else {
    switchInsider.classList.remove("transform", "translate-x-full");
    button.classList.remove("bg-[#003882]");
    button.classList.add("bg-[#b7b7b7]");

    switch (index) {
      case 0:
        pauseAllNotification.value = "off";
        buttons.forEach((btn, i) => {
          if (i !== 0) {
            btn.classList.remove(
              "opacity-50",
              "cursor-not-allowed-here",
              "pointer-events-none",
            );
          }
        });
        break;
      case 1:
        inquiries.value = "off";
        break;
      case 2:
        quotesJObs.value = "off";
        break;
      case 3:
        memosOrComments.value = "off";
        break;
      case 4:
        approvalByAdmin.value = "off";
        break;

      default:
        console.error("Fatal Error Occurred");
    }
  }
}

const buttonStates = [...resolvedArray];

buttons.forEach((button, index) => {
  setButtonState(index, buttonStates[index]);

  button.addEventListener("click", () => {
    buttonStates[index] = !buttonStates[index];
    setButtonState(index, buttonStates[index]);
  });
});

customSUbmitBtnNotification.addEventListener("click", (e) => {
  realSubmitBtnNotification.click();
  console.log("Real submit Button has been clicked");
});

const input = document.querySelector("input");

input.addEventListener("focus", (event) => {
  event.target.style.outline = "none";
  event.target.style.boxShadow = "none";
  event.target.style.border = "1px solid #d3d7e2";
});

input.addEventListener("blur", (event) => {
  event.target.style.border = "1px solid #d3d7e2";
});

/*script to submit the real form field with click of custom form fields submit button. */

const updateButton = document.querySelector(".updateButton");
const actualFormSubmitBtn = document.querySelector(
  ".submitBtnClicksOnUpdateClick",
);

/* Custom Form Fields. */
const jobRatePercentageCustom = document.querySelector(
  ".jobRatePercentageCustom",
);
const workEmailCustom = document.querySelector(".workEmailCustom");
const accountNumberCustom = document.querySelector(".accountNumberCustom");
const accountNameCustom = document.querySelector(".accountNameCustom");
const bsbCustom = document.querySelector(".bsbCustom");

/* Actual Form Fields */
const jobRatePercentage = document.querySelector(".jobRatePercentage input");
const workEmail = document.querySelector(".workEmail input");
const accountNumber = document.querySelector(".accountNumber input");
const accountName = document.querySelector(".accountName input");
const bsb = document.querySelector(".bsb input");

updateButton.addEventListener("click", (e) => {
  console.log("Update button has been clicked");

  jobRatePercentage.value = jobRatePercentageCustom.value || "";
  workEmail.value = workEmailCustom.value || "";
  accountNumber.value = accountNumberCustom.value || "";
  accountName.value = accountNameCustom.value || "";
  bsb.value = bsbCustom.value || "";

  actualFormSubmitBtn.click();
});
