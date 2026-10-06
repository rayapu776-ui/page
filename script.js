// Standalone vanilla script backup synchronized with React app architecture
const calls = [
  { id: 1, name: "Anita Sharma", status: "answered", duration_secs: 137, summary: "Booked a follow-up for Friday." },
  { id: 2, name: "Rahul Shah", status: "failed", duration_secs: 0, summary: "" },
  { id: 3, name: null, status: "answered", duration_secs: 64, summary: "Asked about clinic timings." },
  { id: 4, name: "Mohammed Irfan Abdul Rahman Siddiqui", status: "answered", duration_secs: 3725, summary: "Called about his mother's knee surgery. Wanted to know the cost, how many days she would stay, whether insurance is accepted, what to bring on the day, and if the doctor could call him back personally before he decides. Asked the same questions again for his father." },
  { id: 5, name: "priya nair", status: "no_answer", duration_secs: 0, summary: "" },
  { id: 6, name: "Deepak Verma", status: "answered", duration_secs: 212, summary: "Said the doctor was <b>very</b> helpful." },
  { id: 7, name: "Sunita Rao", status: "answered", duration_secs: 59, summary: "Rescheduled to Monday." },
  { id: 8, name: "Sunita Rao", status: "answered", duration_secs: 59, summary: "Rescheduled to Monday." }
];

const state = {
  q: "",
  status: "all",
  duration: "all",
  sort: "newest",
  reviewed: new Set()
};

const $ = (s) => document.querySelector(s);
const labels = { answered: "Answered", failed: "Failed", no_answer: "No answer" };

const icons = {
  bell: '<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M6.7 3.5 4.5 4.6c-1 5.7 4.3 11 10 10l1.1-2.2-2.4-1.5-1.2 1.1a10.8 10.8 0 0 1-2.9-2.9l1.1-1.2-1.5-2.4Z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4.2 4.2L19 6.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/></svg>'
};

function duration(x) {
  const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = x % 60;
  return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
}

function name(c) {
  return c.name === null ? "Unknown" : c.name;
}

function initials(c) {
  return c.name === null ? "?" : c.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
}

function summary(s) {
  if (!s) return '<span class="summary empty">No summary available</span>';
  const x = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<span class="summary">${x.replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, "<strong>$1</strong>")}</span>`;
}

function date() {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

function brand() {
  return `<a class="brand" href="javascript:void(0)" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Clinic Call List"><svg class="brand-mark" viewBox="0 0 44 44"><rect width="44" height="44" rx="12" fill="#eaf3ff"/><path d="M22 10v10.2M17 15h10M16.4 20.2a7.2 7.2 0 1 0 11.2 0" fill="none" stroke="#2878dc" stroke-width="2.3" stroke-linecap="round"/><circle cx="22" cy="29" r="2.7" fill="#2878dc"/></svg><span><span class="brand-name">Clinic</span><span class="brand-sub">Call List</span></span></a>`;
}

function actions(i, mobile = false) {
  const r = state.reviewed.has(i);
  return `<div class="${mobile ? "card-actions" : "action-set"}"><button class="icon-button" data-action="details" data-index="${i}" title="View details" aria-label="View details">${icons.eye}<span>Details</span></button><button class="icon-button" data-action="callback" data-index="${i}" title="Call back" aria-label="Call back">${icons.phone}<span>Call back</span></button><button class="icon-button ${r ? "reviewed" : ""}" data-action="review" data-index="${i}" title="Mark as reviewed" aria-label="Mark as reviewed">${icons.check}<span>${r ? "Reviewed" : "Review"}</span></button></div>`;
}

// STRICT PREFIX SEARCH IN VANILLA SCRIPT (NO SUBSTRING INCLUDES)
function filtered() {
  const q = state.q.trim().toLowerCase();
  let a = calls.map((call, index) => ({ call, index }));

  if (q !== "") {
    a = a.filter((x) => {
      const patientName = String(x.call.name || "").trim().toLowerCase();
      return patientName.startsWith(q);
    });
  }

  if (state.status !== "all") {
    a = a.filter((x) => x.call.status === state.status);
  }

  if (state.duration !== "all") {
    a = a.filter((x) =>
      state.duration === "short"
        ? x.call.duration_secs < 60
        : state.duration === "medium"
          ? x.call.duration_secs >= 60 && x.call.duration_secs < 300
          : x.call.duration_secs >= 300
    );
  }

  const fn = {
    newest: (a, b) => b.index - a.index,
    oldest: (a, b) => a.index - b.index,
    longest: (a, b) => b.call.duration_secs - a.call.duration_secs,
    shortest: (a, b) => a.call.duration_secs - b.call.duration_secs,
    name: (a, b) => name(a.call).localeCompare(name(b.call))
  };

  return a.sort(fn[state.sort] || fn.newest);
}

function row(x, displayIdx) {
  const c = x.call;
  return `<tr><td class="call-number">${displayIdx + 1}</td><td><div class="patient"><div class="avatar ${c.name === null ? "unknown" : ""}">${initials(c)}</div><div class="patient-name">${name(c)}<span class="patient-sub">Patient call</span></div></div></td><td><span class="badge ${c.status}">${labels[c.status]}</span></td><td><span class="duration">${duration(c.duration_secs)}</span></td><td>${summary(c.summary)}</td><td>${actions(x.index)}</td></tr>`;
}

function card(x) {
  const c = x.call;
  const txt = c.summary ? summary(c.summary).replace(/<span[^>]*>|<\/span>/g, "") : "No summary available";
  return `<article class="call-card"><div class="card-top"><div class="patient"><div class="avatar ${c.name === null ? "unknown" : ""}">${initials(c)}</div><div class="patient-name">${name(c)}</div></div><span class="badge ${c.status}">${labels[c.status]}</span></div><div class="card-info"><span>${icons.clock} ${duration(c.duration_secs)}</span><span>${c.summary ? "Call summary available" : "No summary available"}</span></div><p class="card-summary ${c.summary ? "" : "empty"}">${txt}</p>${actions(x.index, true)}</article>`;
}

function render() {
  const visibleCalls = filtered();
  const callContent = $("#call-content");
  if (!callContent) return;

  if (visibleCalls.length === 0) {
    const q = state.q.trim();
    callContent.innerHTML = `<div class="empty"><div class="empty-icon">${icons.search}</div><h2>No results found</h2><p>${q ? `No patients match "${q}".<br>Try searching for another patient name.` : "No calls match the selected filter criteria."}</p>${q ? `<button class="clear-filter-btn" onclick="clearSearch()">Clear search</button>` : ""}</div>`;
    return;
  }

  callContent.innerHTML = `<div class="table-scroll"><table class="call-table"><thead><tr><th class="col-number">#</th><th class="col-patient">Patient name</th><th class="col-status">Status</th><th class="col-duration">Duration</th><th class="col-summary">Summary</th><th class="col-actions">Actions</th></tr></thead><tbody>${visibleCalls.map((x, idx) => row(x, idx)).join("")}</tbody></table></div><div class="mobile-list">${visibleCalls.map(card).join("")}</div>`;
}

window.clearSearch = function () {
  state.q = "";
  const input = $("#search");
  if (input) input.value = "";
  render();
};

document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    state.q = e.target.value;
    render();
  }
});
