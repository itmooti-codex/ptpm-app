let toastTimer = null;

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
  const styles = {
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    info: "bg-gray-900 text-white",
  };
  toast.className = `pointer-events-none fixed right-4 top-4 z-50 max-w-xs rounded-md px-4 py-3 text-sm shadow-lg ${
    styles[type] || styles.info
  }`;
  toast.textContent = message;
  toast.classList.remove("hidden");
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
};

const normalizeServiceProviderId = (value) => {
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

const getServiceProviderModel = (plugin) => {
  if (!plugin || typeof plugin.switchTo !== "function") {
    return null;
  }
  try {
    return plugin.switchTo("PeterpmServiceProvider");
  } catch (error) {
    return plugin.switchTo("ServiceProvider");
  }
};

const updateServiceProvider = async (id, payload) => {
  const providerId = normalizeServiceProviderId(id);
  if (!providerId) {
    throw new Error("Service provider id is missing.");
  }
  if (typeof window.getVitalStatsPlugin !== "function") {
    throw new Error("SDK not initialized. Ensure sdk.js is loaded first.");
  }
  const plugin = await window.getVitalStatsPlugin();
  const model = getServiceProviderModel(plugin);
  if (!model) {
    throw new Error("Service provider model not available.");
  }
  const mutation = model.mutation();
  mutation.update((q) => q.where("id", providerId).set(payload));
  await mutation.execute(true).toPromise();
};

document.addEventListener("DOMContentLoaded", () => {
  const IDServi = SERVICE_PROVIDER_ID;

  // Listen for clicks on buttons with class 'setStatus'
  document.querySelectorAll(".setStatus").forEach((button) => {
    button.addEventListener("click", async () => {
      // Get the desired workload capacity from the button's data attribute
      document.getElementById("optonSelect").textContent = "Updating Status...";
      document.getElementById("statusChangeBottom").textContent =
        "Updating Status...";
      const workloadCapacity = button.dataset.status;

      // Update UI immediately
      const optonSelect = document.getElementById("optonSelect");
      optonSelect.style.display = "hidden";

      try {
        await updateServiceProvider(IDServi, {
          workload_capacity: workloadCapacity,
        });
        const statusText = workloadCapacity || "Updated";
        document.getElementById("optonSelect").textContent = statusText;
        document.getElementById("statusChangeBottom").textContent = statusText;
        showToast("Status updated successfully.", "success");
      } catch (error) {
        console.error("Error updating profile status:", error);
        showToast("Failed to update status.", "error");
      }
    });
  });
});

document.getElementById("profileStatus").addEventListener("change", () => {
  const status = document.getElementById("profileStatus").value;
  const durationWrapper = document.getElementById("durationWrapper");
  if (status === "LOOKING") {
    durationWrapper.classList.add("hidden");
    durationSelect.value = "";
  } else {
    durationWrapper.classList.remove("hidden");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("profileStatus").value;
  const durationWrapper = document.getElementById("durationWrapper");
  if (status === "LOOKING") {
    durationWrapper.classList.add("hidden");
    const durationSelect = document.getElementById("durationSelect");
    durationSelect.value = "";
  } else {
    durationWrapper.classList.remove("hidden");
  }
});

document
  .getElementById("saveProfileStatusButton")
  .addEventListener("click", async () => {
    document.getElementById("optonSelect").textContent = "Updating Status...";
    document.getElementById("statusChangeBottom").textContent =
      "Updating Status...";
    const selectStatus = document.getElementById("profileStatus");
    const selectedStatus = selectStatus.value;
    const durationWrapper = document.getElementById("durationWrapper");
    const selectDuration = document.getElementById("durationSelect");
    const IDService = SERVICE_PROVIDER_ID;

    if (!selectedStatus || selectedStatus === "") {
      showToast("Please select a valid status.", "error");
      return;
    }

    let selectedDuration = null;
    if (!durationWrapper.classList.contains("hidden")) {
      selectedDuration = selectDuration.value;
      if (!selectedDuration || selectedDuration === "Select Duration") {
        showToast("Please select a valid duration.", "error");
        return;
      }
    }

    try {
      await updateServiceProvider(IDService, {
        workload_capacity: selectedStatus,
        ...(selectedDuration && { remove_status_after: selectedDuration }),
      });
      const statusText = selectedStatus || "Updated";
      document.getElementById("optonSelect").textContent = statusText;
      document.getElementById("statusChangeBottom").textContent = statusText;
      showToast("Status updated successfully.", "success");
    } catch (error) {
      console.error("Error updating profile status:", error);
      showToast("Failed to update status.", "error");
    }
  });
