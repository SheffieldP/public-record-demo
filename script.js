// The only place the working name lives. Change it here and the page follows.
// Also change the <title> in index.html if the script is blocked.
const BRAND_NAME = "Public Record";

document.title = BRAND_NAME;
document.querySelectorAll("[data-brand]").forEach((element) => {
  element.textContent = BRAND_NAME;
});

const form = document.getElementById("contact-form");
if (form) {
const sentMessage = document.getElementById("sent");
const messages = {
  name: "We need your name so we know who to write back to.",
  organization: "Tell us the name of your organization.",
  email: "We need an email to reply to you.",
  emailShape: "That email address looks incomplete. Check for a missing @ or dot.",
  city: "Pick your city, or choose Somewhere else.",
};

function showError(field, text) {
  const error = document.getElementById(field.id + "-error");
  error.textContent = text;
  error.hidden = false;
  field.setAttribute("aria-invalid", "true");
}

function clearError(field) {
  document.getElementById(field.id + "-error").hidden = true;
  field.removeAttribute("aria-invalid");
}

function problemWith(field) {
  if (field.value.trim() === "") return messages[field.id];
  if (field.type === "email" && !/^\S+@\S+\.\S+$/.test(field.value.trim())) return messages.emailShape;
  return "";
}

// Turn off the browser's own bubbles so the messages above are the ones people see.
form.noValidate = true;
form.addEventListener("submit", (event) => {
  event.preventDefault();
  let firstBad = null;
  form.querySelectorAll("input, select").forEach((field) => {
    const problem = problemWith(field);
    if (problem) {
      showError(field, problem);
      firstBad = firstBad || field;
    } else {
      clearError(field);
    }
  });
  if (firstBad) {
    firstBad.focus();
    return;
  }
  form.hidden = true;
  sentMessage.hidden = false;
  sentMessage.focus();
});
form.addEventListener("input", (event) => {
  if (event.target.hasAttribute("aria-invalid") && !problemWith(event.target)) clearError(event.target);
});
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.noValidate = true;
  loginForm.addEventListener("submit", (event) => {
    const emailField = document.getElementById("login-email");
    const emailError = document.getElementById("login-email-error");
    const value = emailField.value.trim();
    let problem = "";
    if (value === "") problem = "We need an email to send the link to.";
    else if (!/^\S+@\S+\.\S+$/.test(value)) problem = "That email address looks incomplete. Check for a missing @ or dot.";
    if (!problem) return;
    event.preventDefault();
    emailError.textContent = problem;
    emailError.hidden = false;
    emailField.setAttribute("aria-invalid", "true");
    emailField.focus();
  });
}

const sampleNote = document.getElementById("sample-note");
if (sampleNote && window.self === window.top) {
  let dismissed = false;
  try {
    dismissed = localStorage.getItem("sampleNoteClosed") === "yes";
  } catch (error) {
    dismissed = false;
  }
  sampleNote.hidden = dismissed;
  document.getElementById("sample-note-close").addEventListener("click", () => {
    sampleNote.hidden = true;
    try {
      localStorage.setItem("sampleNoteClosed", "yes");
    } catch (error) {
      return;
    }
  });
}

const app = document.getElementById("app");
if (app) {
  const viewNames = ["overview", "grants", "record", "drafts", "activity"];
  const navLinks = app.querySelectorAll(".nav a");
  const drawer = document.getElementById("drawer");
  const grantRows = app.querySelectorAll("tr.grant");
  const draftList = document.getElementById("draft-list");
  const draftDocs = document.getElementById("draft-docs");
  let started = false;

  function route() {
    const [requested, id = ""] = location.hash.slice(1).split("/");
    const name = viewNames.includes(requested) ? requested : "overview";

    viewNames.forEach((view) => {
      document.getElementById("view-" + view).hidden = view !== name;
    });
    navLinks.forEach((link) => {
      if (link.dataset.view === name) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    const detail = name === "grants" && id ? document.getElementById("g-" + id) : null;
    drawer.querySelectorAll(".drawer-item").forEach((item) => {
      item.hidden = item !== detail;
    });
    drawer.classList.toggle("open", Boolean(detail));
    drawer.setAttribute("aria-hidden", String(!detail));
    app.dataset.drawer = detail ? "open" : "closed";
    grantRows.forEach((row) => {
      if (detail && row.dataset.id === id) row.setAttribute("aria-current", "true");
      else row.removeAttribute("aria-current");
    });

    const draft = name === "drafts" && id ? document.getElementById("draft-" + id) : null;
    draftList.hidden = Boolean(draft);
    draftDocs.hidden = !draft;
    draftDocs.querySelectorAll(".doc").forEach((doc) => {
      doc.hidden = doc !== draft;
    });

    if (started) {
      const heading = detail
        ? detail.querySelector("h2")
        : draft
          ? draft.querySelector("h2")
          : document.querySelector("#view-" + name + " h1");
      heading.focus({ preventScroll: true });
      if (!detail) window.scrollTo(0, 0);
    }
    started = true;
  }

  window.addEventListener("hashchange", route);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("open")) location.hash = "#grants";
  });
  route();

  grantRows.forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      location.hash = "#grants/" + row.dataset.id;
    });
  });

  const filterButtons = app.querySelectorAll(".tabs button");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      grantRows.forEach((row) => {
        row.hidden = button.dataset.filter !== "all" && row.dataset.group !== button.dataset.filter;
      });
    });
  });

  const replayButton = document.getElementById("replay");
  const replayStatus = document.getElementById("replay-status");
  const replayDone = document.getElementById("replay-done");
  const entries = document.querySelectorAll("#timeline .entry");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timer = null;

  function showAllEntries() {
    entries.forEach((entry) => entry.classList.remove("pending", "arriving"));
    replayButton.disabled = false;
    replayStatus.textContent = "";
  }

  if (replayButton) replayButton.addEventListener("click", () => {
    clearTimeout(timer);
    if (reduceMotion.matches) {
      showAllEntries();
      return;
    }
    replayButton.disabled = true;
    replayDone.textContent = "";
    entries.forEach((entry) => {
      entry.classList.add("pending");
      entry.classList.remove("arriving");
    });
    let step = 0;
    function next() {
      if (step === entries.length) {
        showAllEntries();
        replayDone.textContent = document.getElementById("timeline").dataset.summary;
        return;
      }
      entries[step].classList.remove("pending");
      entries[step].classList.add("arriving");
      replayStatus.textContent = "Entry " + (step + 1) + " of " + entries.length;
      step += 1;
      timer = setTimeout(next, 400);
    }
    next();
  });
}
