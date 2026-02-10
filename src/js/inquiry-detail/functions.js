function fetchServicesCatalog() {
  return Promise.resolve(SERVICES_DATA);
}

function openTemplateLink(messageId) {
  if (!messageId) return;
  const url = `https://app.ontraport.com/#!/message/edit&id=${messageId}`;
  window.open(url, "_blank");
}

function pageActions() {
  return {
    currentJobId: JOB_ID,
    isDuplicating: false,

    inquiryCollapsed: false, // controls layout + memo state
    openmemos: false, // controls memo open/close

    // prevent memo from closing when collapsed
    handleMemoClose() {
      if (this.inquiryCollapsed) return;
      this.openmemos = false;
    },

    // auto-open memos when collapsed
    init() {
      this.$watch("inquiryCollapsed", (value) => {
        if (value === true) {
          this.openmemos = true; // stay open when collapsed
        }
      });
    },

    // ...rest of your methods
    async printJobSheet() {
      // intentionally left blank; button retained for future use
    },

    async duplicateJob(jobId) {
      if (!jobId || this.isDuplicating) return;
      this.isDuplicating = true;

      try {
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: jobId,
          payload: { duplicate_job: true },
        });
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "success",
              message: "Job duplicated successfully.",
            },
          })
        );
      } catch (err) {
        console.error(err);
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "error",
              message: err?.message || "Failed to duplicate job.",
            },
          })
        );
      } finally {
        this.isDuplicating = false;
      }
    },
  };
}

async function updateJobEmailCheckbox(fieldId) {
  if (!fieldId) return;

  const mutation = `
        mutation updateJob($id: PeterpmJobID!, $payload: JobUpdateInput = null) {
          updateJob(
            query: [{ where: { id: $id } }]
            payload: $payload
          ) {
            ${fieldId}
          }
        }
      `;

  const variables = {
    id: JOB_ID,
    payload: {
      [fieldId]: true, // checkbox field set to true
    },
  };

  try {
    await graphqlRequest(mutation, variables);
    // optional: toast or console log
    // console.log(\`Updated job field \${fieldId} to true\`);
  } catch (error) {
    console.error("Failed to update job email checkbox:", error);
  }
}

async function createCallback(jobId) {
  if (!jobId) return;
  //for this job id, need to send true to create_a_callback checkbox field and show proper toast message
  try {
    await graphqlRequest(UPDATE_JOB_MUTATION, {
      id: jobId,
      payload: { create_a_callback: true },
    });
    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: {
          type: "success",
          message: "Callback request created successfully.",
        },
      })
    );
  } catch (error) {
    console.error("Failed to create callback request", error);
    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: {
          type: "error",
          message: "Failed to create callback request.",
        },
      })
    );
  }
}

async function deleteJob(jobId) {
  if (!jobId) return;
  //for this job id, need to send true to create_a_callback checkbox field and show proper toast message
  try {
    await graphqlRequest(DELETE_JOB_QUERY, {
      id: jobId,
    });
    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: {
          type: "success",
          message: "Job Delete Successfully.",
        },
      })
    );
  } catch (error) {
    console.error("Failed to delete job", error);
    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: {
          type: "error",
          message: "Failed to delete job.",
        },
      })
    );
  }
}

window.taskRowPopovers = function (task, assignees) {
  return {
    // UI state
    reassignOpen: false,
    reschedOpen: false,
    tempAssigneeId: task.assigneeId ?? assignees?.[0]?.id ?? null,
    tempDue: task.dueISO ? task.dueISO.slice(0, 10) : "", // yyyy-mm-dd
    savingReassign: false,
    savingResched: false,

    // --- utils ---
    convertDateToUnix(v) {
      if (!v) return null;
      // accept yyyy-mm-dd, ISO, or unix already
      if (/^\d{10}$/.test(v)) return Number(v); // seconds
      if (/^\d{13}$/.test(v)) return Math.floor(v / 1000); // ms -> s
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d = new Date(`${v}T00:00:00`);
        return Math.floor(d.getTime() / 1000);
      }
      const d = new Date(v);
      return isNaN(d) ? null : Math.floor(d.getTime() / 1000);
    },
    toast(type, message) {
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { type, message } })
      );
    },

    // --- actions ---
    async confirmReassign() {
      if (!task?.id) {
        this.toast("error", "Missing task ID.");
        return;
      }
      if (!this.tempAssigneeId) {
        this.toast("error", "Select an assignee.");
        return;
      }

      this.savingReassign = true;
      try {
        await graphqlRequest(UPDATE_TASK_MUTATION, {
          id: task.id,
          payload: { assignee_id: this.tempAssigneeId },
        });

        // reflect in UI
        const a = (assignees || []).find((u) => u.id === this.tempAssigneeId);
        if (a) {
          task.assigneeId = a.id;
          task.assigneeName = a.name;
          task.assigneeEmail = a.email || "";
        }
        this.reassignOpen = false;
        this.toast("success", "Assignee updated.");
      } catch (e) {
        console.error(e);
        this.toast("error", e?.message || "Failed to update assignee.");
      } finally {
        this.savingReassign = false;
      }
    },

    async confirmReschedule() {
      if (!task?.id) {
        this.toast("error", "Missing task ID.");
        return;
      }
      if (!this.tempDue) {
        this.toast("error", "Pick a due date.");
        return;
      }

      this.savingResched = true;
      try {
        // backend usually wants unix seconds; adjust if your API expects a string
        const ts = this.convertDateToUnix(this.tempDue);
        await graphqlRequest(UPDATE_TASK_MUTATION, {
          id: task.id,
          payload: { date_due: ts },
        });

        // reflect in UI — keep row field as yyyy-mm-dd for readability
        task.dueISO = this.tempDue; // your humanDue() already handles yyyy-mm-dd
        this.reschedOpen = false;
        this.toast("success", "Due date updated.");
      } catch (e) {
        console.error(e);
        this.toast("error", e?.message || "Failed to update due date.");
      } finally {
        this.savingResched = false;
      }
    },
  };
};
