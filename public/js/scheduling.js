// ═══════════════════════════════════════════════════
//  SHAD Scheduling — Calendar View
// ═══════════════════════════════════════════════════

let allSchedule   = [];
let swapRequests  = [];
let coverageAlerts = [];
let currentWeekStart = null;

const tooltip = document.createElement("div");
tooltip.className = "shift-tooltip";
document.body.appendChild(tooltip);

// ── Bootstrap ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    currentWeekStart = getMondayOf(new Date());

    document.getElementById("prevWeekBtn").addEventListener("click", () => shiftWeek(-1));
    document.getElementById("nextWeekBtn").addEventListener("click", () => shiftWeek(1));
    document.getElementById("applyScheduleFilterBtn").addEventListener("click", jumpToDate);
    document.getElementById("scheduleDateFilter").valueAsDate = new Date();

    document.getElementById("openSwapModalBtn").addEventListener("click", () => openModal("swapModal"));
    document.getElementById("closeSwapModal").addEventListener("click",  () => closeModal("swapModal"));
    document.getElementById("submitSwapBtn").addEventListener("click", submitSwap);

    document.getElementById("openAlertModalBtn").addEventListener("click", () => openModal("alertModal"));
    document.getElementById("closeAlertModal").addEventListener("click",  () => closeModal("alertModal"));
    document.getElementById("submitAlertBtn").addEventListener("click", submitAlert);

    document.querySelectorAll(".modal-backdrop").forEach(el =>
        el.addEventListener("click", e => { if (e.target === el) closeModal(el.id); })
    );

    Promise.all([
        fetch("/api/schedule").then(r => r.json()).catch(() => []),
        fetch("/api/swap-requests").then(r => r.json()).catch(() => []),
        fetch("/api/coverage-alerts").then(r => r.json()).catch(() => [])
    ]).then(([sched, swaps, alerts]) => {
        allSchedule    = sched;
        swapRequests   = swaps;
        coverageAlerts = alerts;

        if (sched.length > 0 && sched[0].date) {
            currentWeekStart = getMondayOf(parseDate(sched[0].date));
        }

        renderWeek();
        renderSwapPanel();
        renderAlertPanel();
    });
});

// ── Week navigation ───────────────────────────────────────────────
function shiftWeek(dir) {
    currentWeekStart = addDays(currentWeekStart, dir * 7);
    renderWeek();
}
function jumpToDate() {
    const val = document.getElementById("scheduleDateFilter").value;
    if (val) { currentWeekStart = getMondayOf(parseDate(val)); renderWeek(); }
}

// ── Calendar render ───────────────────────────────────────────────
//
//  Layout:
//    Rows    = TIME BLOCKS  (e.g. "7–8AM Breakfast", "On Call 8–10PM")
//    Columns = DAYS Mon–Sun
//    Each cell can have MULTIPLE staff role pills stacked vertically
//
function renderWeek() {
    const days = weekDays(currentWeekStart);
    const weekSet = new Set(days.map(toISO));
    const entries = allSchedule.filter(e => weekSet.has(e.date));

    document.getElementById("weekLabel").textContent =
        `${fmtShort(days[0])} – ${fmtShort(days[6])}`;

    document.getElementById("entryCount").textContent =
        entries.length > 0
            ? `${entries.length} schedule entries this week`
            : "No schedule entries this week";

    const grid = document.getElementById("calGrid");
    const empty = document.getElementById("calEmpty");

    grid.innerHTML = "";

    if (entries.length === 0) {
        grid.style.display = "none";
        empty.style.display = "block";
        return;
    }

    grid.style.display = "block";
    empty.style.display = "none";

    days.forEach(day => {
        const dateStr = toISO(day);
        const dayEntries = entries.filter(e => e.date === dateStr);

        if (dayEntries.length === 0) return;

        const staffRoles = [...new Set(dayEntries.map(e => e.staffRole))]
            .filter(Boolean)
            .sort(sortStaffRoles);

        const timeBlocks = [...new Set(dayEntries.map(e => e.timeBlock))]
            .filter(Boolean)
            .sort(sortTimeBlocks);

        const section = document.createElement("div");
        section.className = "sheet-day";

        section.innerHTML = `
            <div class="sheet-day-title">
                ${dayEntries[0].dayName || day.toLocaleDateString("en", { weekday: "long" })} ${dateStr}
            </div>

            <div class="sheet-table-wrap">
                <table class="sheet-table">
                    <thead>
                        <tr>
                            <th class="time-col">Time Block</th>
                            <th class="activity-col">Activity</th>
                            ${staffRoles.map(role => `<th>${role}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `;

        const tbody = section.querySelector("tbody");

        timeBlocks.forEach(timeBlock => {
            const rowEntries = dayEntries.filter(e => e.timeBlock === timeBlock);
            const activity = rowEntries.find(e => e.activity)?.activity || "";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td class="time-cell">${timeBlock}</td>
                <td class="activity-cell">${activity}</td>
                ${staffRoles.map(role => {
                    const entry = rowEntries.find(e => e.staffRole === role);
                    const status = entry ? entry.status : "";
                    return `<td class="status-cell ${sheetStatusClass(status)}">${status}</td>`;
                }).join("")}
            `;

            tbody.appendChild(row);
        });

        grid.appendChild(section);
    });
}

// ── Tooltip ───────────────────────────────────────────────────────
function attachTooltip(el, entry) {
    el.addEventListener("mouseenter", () => {
        tooltip.innerHTML = `
            <strong>${entry.activity || "Shift"}</strong>
            ${entry.staffRole}<br>
            ${entry.timeBlock}<br>
            <span style="opacity:.65">${entry.date}</span>
            ${entry.status ? `<br><span style="opacity:.65">Status: ${entry.status}</span>` : ""}
        `;
        tooltip.classList.add("show");
    });
    el.addEventListener("mousemove", e => {
        tooltip.style.left = (e.clientX + 14) + "px";
        tooltip.style.top  = (e.clientY - 10) + "px";
    });
    el.addEventListener("mouseleave", () => tooltip.classList.remove("show"));
}

// ── Swap panel ────────────────────────────────────────────────────
function renderSwapPanel() {
    const pending = swapRequests.filter(r => r.status === "Pending");
    const badge   = document.getElementById("swapBadge");
    const list    = document.getElementById("swapList");

    badge.textContent = pending.length;
    badge.style.display = pending.length > 0 ? "inline-flex" : "none";

    if (pending.length === 0) { list.innerHTML = `<p class="s-empty">No pending swap requests.</p>`; return; }
    list.innerHTML = "";
    pending.forEach(r => {
        const item = mkDiv("s-item");
        item.innerHTML = `
            <div class="s-item-name">${r.requester_name}</div>
            <div class="s-item-meta">${r.requester_role ? r.requester_role + " · " : ""}${r.shift_date} · ${r.shift_time}</div>
            ${r.reason ? `<div class="s-item-reason">"${r.reason}"</div>` : ""}
            <div class="s-item-actions">
                <button class="act-btn act-approve" onclick="resolveSwap(${r.id},'Approved')">✓ Approve</button>
                <button class="act-btn act-deny"    onclick="resolveSwap(${r.id},'Denied')">✕ Deny</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function resolveSwap(id, status) {
    fetch(`/api/swap-requests/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolvedBy: "Admin" })
    }).then(() => {
        const i = swapRequests.findIndex(r => r.id === id);
        if (i !== -1) swapRequests[i].status = status;
        renderSwapPanel();
    });
}

function submitSwap() {
    const name = v("swapName"), role = v("swapRole"), date = v("swapDate"),
          time = v("swapTime"), reason = v("swapReason");
    if (!name || !date || !time) return showFormErr("swapModal", "Please fill in your name, date, and shift time.");

    fetch("/api/swap-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterName: name, requesterRole: role, shiftDate: date, shiftTime: time, reason })
    }).then(r => r.json()).then(row => {
        swapRequests.unshift(row);
        renderSwapPanel();
        closeModal("swapModal");
        ["swapName","swapRole","swapDate","swapTime","swapReason"].forEach(id => document.getElementById(id).value = "");
        showToast("Swap request submitted!");
    });
}

// ── Alert panel ───────────────────────────────────────────────────
function renderAlertPanel() {
    const open  = coverageAlerts.filter(a => a.status === "Open");
    const badge = document.getElementById("alertBadge");
    const list  = document.getElementById("alertList");

    badge.textContent = open.length;
    badge.style.display = open.length > 0 ? "inline-flex" : "none";

    if (open.length === 0) { list.innerHTML = `<p class="s-empty">No open coverage alerts.</p>`; return; }
    list.innerHTML = "";
    open.forEach(a => {
        const item = mkDiv("s-item alert-item");
        item.innerHTML = `
            <div class="s-item-name">${a.role_needed}</div>
            <div class="s-item-meta">${a.alert_date} · ${a.time_block}</div>
            ${a.notes ? `<div class="s-item-reason">${a.notes}</div>` : ""}
            <div class="s-item-actions">
                <button class="act-btn act-resolve" onclick="resolveAlert(${a.id})">✓ Resolved</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function resolveAlert(id) {
    fetch(`/api/coverage-alerts/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved", resolvedBy: "Admin" })
    }).then(() => {
        const i = coverageAlerts.findIndex(a => a.id === id);
        if (i !== -1) coverageAlerts[i].status = "Resolved";
        renderAlertPanel();
    });
}

function submitAlert() {
    const date = v("alertDate"), time = v("alertTime"),
          role = v("alertRole"), notes = v("alertNotes");
    if (!date || !time || !role) return showFormErr("alertModal", "Please fill in the date, time block, and role needed.");

    fetch("/api/coverage-alerts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertDate: date, timeBlock: time, roleNeeded: role, notes })
    }).then(r => r.json()).then(row => {
        coverageAlerts.unshift(row);
        renderAlertPanel();
        closeModal("alertModal");
        ["alertDate","alertTime","alertRole","alertNotes"].forEach(id => document.getElementById(id).value = "");
        showToast("Coverage alert created!");
    });
}

// ── Colour helpers ────────────────────────────────────────────────
function colorClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("duty"))    return "pill-green";
    if (s.includes("call"))    return "pill-purple";
    if (s.includes("breakfast") || s.includes("lunch") || s.includes("dinner") || s.includes("meal")) return "pill-orange";
    if (s.includes("away") || s.includes("off")) return "pill-red";
    return "pill-green";
}

function sheetStatusClass(status) {
    const s = (status || "").toLowerCase();

    if (s.includes("on duty")) return "sheet-duty";
    if (s.includes("on call")) return "sheet-call";
    if (s.includes("breakfast") || s.includes("lunch") || s.includes("dinner")) return "sheet-meal";
    if (s.includes("night")) return "sheet-night";
    if (s.includes("off")) return "sheet-off";

    return "";
}

function sortStaffRoles(a, b) {
    const order = ["PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7", "PA8", "PA9", "Rec Dir", "Teacher Fellow", "PD1", "PD2"];

    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.localeCompare(b);
}

function sortTimeBlocks(a, b) {
    const hour = s => {
        const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (!m) return 999;
        let h = parseInt(m[1]);
        const ap = (m[3] || "").toLowerCase();
        if (ap === "pm" && h !== 12) h += 12;
        if (ap === "am" && h === 12) h = 0;
        return h * 60 + parseInt(m[2] || 0);
    };
    return hour(a) - hour(b);
}

// ── Date utilities ────────────────────────────────────────────────
function getMondayOf(d) {
    const dt = new Date(d);
    const day = dt.getDay();
    dt.setDate(dt.getDate() - day);
    dt.setHours(0, 0, 0, 0);
    return dt;
}
function weekDays(monday) { return Array.from({ length: 7 }, (_, i) => addDays(monday, i)); }
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function toISO(d) {
    return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
}
function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtShort(d)  { return d.toLocaleDateString("en", { month: "short", day: "numeric" }); }

// ── DOM & UI helpers ──────────────────────────────────────────────
function mkDiv(cls) { const el = document.createElement("div"); el.className = cls; return el; }
function v(id) { return (document.getElementById(id)?.value || "").trim(); }
function openModal(id)  { document.getElementById(id).classList.add("open"); document.body.style.overflow = "hidden"; }
function closeModal(id) { document.getElementById(id).classList.remove("open"); document.body.style.overflow = ""; }

function showFormErr(modalId, msg) {
    const modal = document.getElementById(modalId);
    let err = modal.querySelector(".form-error");
    if (!err) { err = document.createElement("p"); err.className = "form-error"; modal.querySelector(".modal-body").prepend(err); }
    err.textContent = msg;
    setTimeout(() => err.remove(), 4000);
}

function showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2500);
}
