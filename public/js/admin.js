document.addEventListener("DOMContentLoaded", () => {
    loadIssueTickets();

    document.getElementById("clearTicketsBtn").addEventListener("click", clearTickets);
    document.getElementById("uploadStaffBtn").addEventListener("click", uploadStaffCSV);
    document.getElementById("uploadStaffCredBtn").addEventListener("click", uploadStaffCredCSV);
    document.getElementById("uploadScheduleBtn").addEventListener("click", uploadScheduleCSV);
    document.getElementById("uploadStudentsReplaceBtn").addEventListener("click", uploadStudentsReplace);
    document.getElementById("uploadStudentsAddBtn").addEventListener("click", uploadStudentsAdd);
    document.getElementById("clearStudentsAdminBtn").addEventListener("click", clearStudentsFromAdmin);
    // Isabelle McLean — Wires up the Upload Committee Options CSV button on the admin page
    document.getElementById("uploadCommitteeBtn").addEventListener("click", uploadCommitteeOptionsCSV);
    // Isabelle McLean — Wires up the Remove a Committee button + confirm remove button
    document.getElementById("removeCommitteeBtn").addEventListener("click", openRemoveCommitteePanel);
    document.getElementById("confirmRemoveCommitteeBtn").addEventListener("click", confirmRemoveCommittee);
    // Isabelle McLean — Wires up the Add a single committee button
    document.getElementById("addCommitteeBtn").addEventListener("click", addSingleCommittee);
    // Password-change buttons removed from admin panel
    document.getElementById("clearCommitteeSignupsBtn").addEventListener("click", clearCommitteeSignups);
    document.getElementById("clearCommitteesBtn").addEventListener("click", clearAllCommittees);
    document.getElementById("uploadMedkitsBtn").addEventListener("click", uploadMedkitsCSV);
    document.getElementById("clearMedkitsBtn").addEventListener("click", clearMedkits);
    document.getElementById("clearScheduleBtn").addEventListener("click", clearSchedule);
    document.getElementById("clearStaffBtn").addEventListener("click", clearStaff);
    document.getElementById("exportStudentsBtn").addEventListener("click", exportStudentsCSV);
    document.getElementById("uploadRoomsBtn").addEventListener("click", uploadRoomsCSV);
    document.getElementById("saveEnrollmentWindowBtn").addEventListener("click", saveEnrollmentWindow);
    document.getElementById("uploadShadScheduleBtn").addEventListener("click", uploadShadScheduleCSV);
    document.getElementById("clearShadScheduleBtn").addEventListener("click", clearShadSchedule);

    loadEnrollmentWindow();
    loadSwapRequestsAdmin();
    const addMapBtn = document.getElementById("addMapBtn");
    if (addMapBtn) addMapBtn.addEventListener("click", addMap);
    const clearMapsBtn = document.getElementById("clearAllMapsBtn");
    if (clearMapsBtn) clearMapsBtn.addEventListener("click", clearAllMaps);
    loadMaps();
    setupPanelToggles();

    // Hamburger toggle
    var adminMenuBtn = document.getElementById("adminMenuBtn");
    var adminSidebar = document.getElementById("adminSidebar");
    if (adminMenuBtn && adminSidebar) {
        adminMenuBtn.addEventListener("click", function() {
            adminSidebar.classList.toggle("collapsed");
        });
    }

    // Admin hub sidebar navigation
    document.querySelectorAll(".admin-nav").forEach(function(btn) {
        btn.addEventListener("click", function() {
            var screen = btn.getAttribute("data-screen");
            document.querySelectorAll(".admin-nav").forEach(function(b) { b.classList.remove("active"); });
            document.querySelectorAll(".admin-screen").forEach(function(s) { s.classList.remove("active"); });
            btn.classList.add("active");
            var el = document.getElementById(screen);
            if (el) el.classList.add("active");
        });
    });
});

// Isabelle McLean — Point pdf.js at its matching worker (used to render uploaded map PDFs)
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// Isabelle McLean — Render the current maps list: each row has an editable label (Save) and a Remove button
function loadMaps() {
    const list = document.getElementById("mapList");
    if (!list) return;
    fetch("/api/maps")
        .then(r => r.json())
        .then(maps => {
            list.innerHTML = "";
            if (!maps.length) {
                list.innerHTML = '<p class="example">No maps yet. Add one above.</p>';
                return;
            }
            maps.forEach((m, i) => {
                const row = document.createElement("div");
                row.className = "map-upload-row";
                row.setAttribute("data-id", m.id);
                row.innerHTML =
                    '<div class="map-row-main">' +
                        '<div class="map-arrange">' +
                            '<button type="button" class="map-move-btn" data-dir="up" title="Move up">▲</button>' +
                            '<button type="button" class="map-move-btn" data-dir="down" title="Move down">▼</button>' +
                        "</div>" +
                        '<input type="text" class="map-label-input" maxlength="40">' +
                        '<button type="button" class="map-save-btn">Save</button>' +
                        '<button type="button" class="map-remove-btn danger-btn">Remove</button>' +
                    "</div>" +
                    '<p class="map-upload-status example"></p>';
                const labelInput = row.querySelector(".map-label-input");
                const saveBtn = row.querySelector(".map-save-btn");
                const removeBtn = row.querySelector(".map-remove-btn");
                const upBtn = row.querySelector('.map-move-btn[data-dir="up"]');
                const downBtn = row.querySelector('.map-move-btn[data-dir="down"]');
                const status = row.querySelector(".map-upload-status");
                labelInput.value = m.label || "";
                upBtn.disabled = (i === 0);
                downBtn.disabled = (i === maps.length - 1);
                saveBtn.addEventListener("click", () => renameMap(m.id, labelInput, saveBtn, status));
                removeBtn.addEventListener("click", () => removeMap(m.id, m.label, removeBtn, status));
                upBtn.addEventListener("click", () => moveMap(m.id, "up"));
                downBtn.addEventListener("click", () => moveMap(m.id, "down"));
                list.appendChild(row);
            });
        })
        .catch(() => {
            list.innerHTML = '<p class="example">Could not load maps.</p>';
        });
}

// Isabelle McLean — Add a new map from the single upload point (label + image → POST /api/maps)
function addMap() {
    const labelInput = document.getElementById("newMapLabel");
    const fileInput = document.getElementById("newMapFile");
    const btn = document.getElementById("addMapBtn");
    const status = document.getElementById("newMapStatus");

    const label = labelInput.value.trim();
    const file = fileInput.files[0];
    if (!label) { status.style.color = "#cf2e2e"; status.textContent = "Enter a label."; return; }
    if (!file) { status.style.color = "#cf2e2e"; status.textContent = "Choose a map image or PDF."; return; }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Processing…";
    status.style.color = "#888";
    status.textContent = (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) ? "Rendering PDF…" : "Preparing image…";

    fileToMapPng(file)
        .then(dataUrl => {
            btn.textContent = "Adding…";
            status.textContent = "Adding…";
            return apiRequest("POST", "/api/maps", { label, dataUrl });
        })
        .then(res => {
            if (res && res.error) throw new Error(res.error);
            status.style.color = "#5a9a20";
            status.textContent = "Added ✓";
            labelInput.value = "";
            fileInput.value = "";
            btn.textContent = original;
            btn.disabled = false;
            loadMaps();
        })
        .catch(err => {
            status.style.color = "#cf2e2e";
            status.textContent = (err && err.message) ? err.message : "Could not add map.";
            btn.textContent = original;
            btn.disabled = false;
        });
}

// Isabelle McLean — Rename an existing map (PUT label)
function renameMap(id, labelInput, btn, status) {
    const label = labelInput.value.trim();
    if (!label) { status.style.color = "#cf2e2e"; status.textContent = "Label cannot be empty."; return; }
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Saving…";
    status.style.color = "#888";
    status.textContent = "Saving…";
    apiRequest("PUT", "/api/maps/" + id, { label })
        .then(res => {
            if (res && res.error) throw new Error(res.error);
            status.style.color = "#5a9a20";
            status.textContent = "Saved ✓";
            btn.textContent = original;
            btn.disabled = false;
        })
        .catch(err => {
            status.style.color = "#cf2e2e";
            status.textContent = (err && err.message) ? err.message : "Save failed.";
            btn.textContent = original;
            btn.disabled = false;
        });
}

// Isabelle McLean — Move a map up or down; sends the full new order to the server, then re-renders
function moveMap(id, dir) {
    const ids = [].map.call(document.querySelectorAll("#mapList .map-upload-row"),
        r => r.getAttribute("data-id"));
    const i = ids.indexOf(id);
    if (i < 0) return;
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return;
    const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    apiRequest("POST", "/api/maps/reorder", { order: ids })
        .then(res => { if (res && res.error) throw new Error(res.error); loadMaps(); })
        .catch(() => loadMaps());
}

// Isabelle McLean — Remove every map after confirmation
function clearAllMaps() {
    if (!confirm("Remove ALL maps? This deletes every map image and clears the Campus Maps section on the student portal.")) return;
    apiRequest("DELETE", "/api/maps")
        .then(res => { if (res && res.error) throw new Error(res.error); loadMaps(); })
        .catch(() => alert("Failed to clear maps. Please try again."));
}

// Isabelle McLean — Remove a map (and its image) after confirmation
function removeMap(id, label, btn, status) {
    if (!confirm('Remove the "' + label + '" map? This deletes its image and removes its tab from the student portal.')) return;
    btn.disabled = true;
    status.style.color = "#888";
    status.textContent = "Removing…";
    apiRequest("DELETE", "/api/maps/" + id)
        .then(res => {
            if (res && res.error) throw new Error(res.error);
            loadMaps();
        })
        .catch(err => {
            status.style.color = "#cf2e2e";
            status.textContent = (err && err.message) ? err.message : "Remove failed.";
            btn.disabled = false;
        });
}

// Isabelle McLean — Render a map file (image or PDF first page) to a normalized PNG data URL, capped at MAX_W wide
function fileToMapPng(file) {
    const MAX_W = 2200;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

    if (isPdf) {
        if (!window.pdfjsLib) return Promise.reject(new Error("PDF support failed to load. Try an image instead."));
        return file.arrayBuffer()
            .then(buf => pdfjsLib.getDocument({ data: buf }).promise)
            .then(pdf => pdf.getPage(1))
            .then(page => {
                const base = page.getViewport({ scale: 1 });
                const scale = Math.min(2.5, MAX_W / base.width);
                const vp = page.getViewport({ scale });
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(vp.width);
                canvas.height = Math.round(vp.height);
                return page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise
                    .then(() => canvas.toDataURL("image/png"));
            });
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, MAX_W / img.naturalWidth);
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => reject(new Error("Could not read that image file."));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
    });
}

// Isabelle McLean — Expand or collapse all admin cards at once; individual toggles still work independently
function expandAllPanels() {
    document.querySelectorAll(".panel-toggle").forEach(function(btn) {
        const body = btn.closest(".admin-card-head").nextElementSibling;
        body.classList.remove("collapsed");
        btn.textContent = "−";
        btn.setAttribute("aria-expanded", "true");
        btn.title = "Collapse";
    });
}

function collapseAllPanels() {
    document.querySelectorAll(".panel-toggle").forEach(function(btn) {
        const body = btn.closest(".admin-card-head").nextElementSibling;
        body.classList.add("collapsed");
        btn.textContent = "+";
        btn.setAttribute("aria-expanded", "false");
        btn.title = "Expand";
    });
}

// Collapse/expand each admin card independently — one toggle per card.
function setupPanelToggles() {
    document.querySelectorAll(".admin-card").forEach(function(card) {
        const btn  = card.querySelector(".panel-toggle");
        const body = card.querySelector(".admin-card-body");
        if (!btn || !body) return;

        // Start collapsed
        body.classList.add("collapsed");
        btn.textContent = "+";
        btn.setAttribute("aria-expanded", "false");
        btn.title = "Expand";

        btn.addEventListener("click", function() {
            const isCollapsed = body.classList.contains("collapsed");
            body.classList.toggle("collapsed", !isCollapsed);
            btn.textContent = isCollapsed ? "−" : "+";
            btn.setAttribute("aria-expanded", isCollapsed ? "true" : "false");
            btn.title = isCollapsed ? "Collapse" : "Expand";
        });
    });
}

function apiRequest(method, url, data) {
    return fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : null
    }).then(res => res.json());
}

function loadIssueTickets() {
    fetch("/api/issue-tickets")
        .then(res => res.json())
        .then(tickets => {
            const list = document.getElementById("ticketList");
            list.innerHTML = "";

            if (tickets.length === 0) {
                list.innerHTML = "<p>No issue tickets right now.</p>";
                return;
            }

            tickets.forEach(ticket => {
                const div = document.createElement("div");
                div.className = "ticket-item" + (ticket.urgent ? " urgent-ticket" : "");

                div.innerHTML = `
                    <h4>${ticket.issueType || "Issue Ticket"}</h4>
                    <p><strong>Reported by:</strong> ${ticket.name}</p>
                    <p><strong>Email:</strong> ${ticket.email}</p>
                    <p>${ticket.description}</p>

                    <button class="delete-ticket-btn" onclick="deleteIssueTicket(${ticket.id})">
                        Delete Ticket
                    </button>
                `;

                list.appendChild(div);
            });
        });
}

function clearTickets() {
    const confirmClear = confirm("Clear all issue tickets?");
    if (!confirmClear) return;

    apiRequest("DELETE", "/api/issue-tickets")
        .then(() => {
            alert("Issue tickets cleared.");
            loadIssueTickets();
        });
}

function deleteIssueTicket(id) {
    const confirmDelete = confirm("Delete this issue ticket?");
    if (!confirmDelete) return;

    apiRequest("DELETE", "/api/issue-tickets/" + id)
        .then(() => {
            alert("Issue ticket deleted.");
            loadIssueTickets();
        });
}

function uploadStudentsReplace() {
    const input = document.getElementById("studentCsvInput");
    const file = input.files[0];

    if (!file) {
        alert("Please choose a student CSV file first.");
        return;
    }

    readCSV(file).then(rows => {
        if (!confirm("Replacing students will also reset all committee selections, assignments, and morning rec signups. Continue?")) return;
        const formattedRows = formatShadStudentRows(rows);
        apiRequest("POST", "/api/students/replace", {
            students: formattedRows
        })
        .then(() => {
            alert(formattedRows.length + " student(s) uploaded. Previous students and all related data have been cleared.");
            input.value = "";
        });
        input.value = "";
    });
}

function uploadStudentsAdd() {
    const input = document.getElementById("studentCsvInput");
    const file = input.files[0];

    if (!file) {
        alert("Please choose a student CSV file first.");
        return;
    }

    readCSV(file).then(rows => {
        const formattedRows = formatShadStudentRows(rows);
        apiRequest("POST", "/api/students/add", {
            students: formattedRows
        })
        .then(() => {
            alert(formattedRows.length + " student(s) added.");
            input.value = "";
        });
    });
}

function clearStudentsFromAdmin() {
    const confirmClear = confirm("Clear all students? This will also reset all committee selections, assignments, and morning rec signups. This cannot be undone.");
    if (!confirmClear) return;

    ShadDB.setStudents([]);
    alert("All students cleared.");
}

function uploadStaffCSV() {
    const input = document.getElementById("staffCsvInput");
    const file = input.files[0];

    if (!file) {
        alert("Please choose a staff CSV file first.");
        return;
    }

    readCSV(file).then(rows => {
        const staff = rows.map(row => ({
            name: row.Name || row.name || "",
            email: row.Email || row.email || "",
            slackLink: row.Slack || row.slack || row["Slack Link"] || row["slack_link"] || ""
        })).filter(person => person.name && person.email);

        apiRequest("POST", "/api/staff/replace", { staff })
            .then(() => {
                alert(staff.length + " staff members uploaded.");
                input.value = "";
            });
    });
}

function uploadStaffCredCSV() {
    const input  = document.getElementById("staffCredCsvInput");
    const status = document.getElementById("staffCredUploadStatus");
    const file   = input.files[0];
    if (!file) { alert("Please choose a credentials CSV file first."); return; }

    status.style.color = "#888";
    status.textContent = "Uploading…";

    readCSV(file).then(rows => {
        const entries = rows.map(row => ({
            name:     (row.Name     || row.name     || "").trim(),
            username: (row.Username || row.username || "").trim(),
            password: (row.Password || row.password || "").trim()
        })).filter(r => r.name && r.username && r.password);

        if (!entries.length) {
            status.style.color = "#d12c2c";
            status.textContent = "No valid rows found. Check columns: Name, Username, Password.";
            return;
        }

        apiRequest("POST", "/api/staff/import-credentials", { entries })
            .then(data => {
                input.value = "";
                status.style.color = "#5a9a20";
                status.textContent = data.message || (entries.length + " credentials uploaded.");
                // Refresh the credentials list below
                if (typeof loadStaffCredentials === "function") loadStaffCredentials();
            })
            .catch(() => {
                status.style.color = "#d12c2c";
                status.textContent = "Upload failed. Please try again.";
            });
    });
}

function uploadScheduleCSV() {
    const input = document.getElementById("scheduleCsvInput");
    const file = input.files[0];

    if (!file) {
        alert("Please choose a schedule CSV file first.");
        return;
    }

    const reader = new FileReader();

    reader.onload = e => {
        const schedule = parseWeeklyScheduleCSV(e.target.result);

        if (schedule.length === 0) {
            alert("No schedule rows found. Check that your CSV has day rows like Sunday 2026-07-05.");
            return;
        }

        apiRequest("POST", "/api/schedule/replace", { schedule })
            .then(() => {
                alert(schedule.length + " schedule entries uploaded.");
                input.value = "";
            });
    };

    reader.readAsText(file);
}

function parseWeeklyScheduleCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");

    let weekLabel = "";
    let currentDay = "";
    let currentDate = "";
    let headers = [];
    const schedule = [];

    lines.forEach(line => {
        const columns = parseCSVLine(line);

        if (columns.length === 0) return;

        const firstCell = (columns[0] || "").trim();

        if (!weekLabel && firstCell.toLowerCase().includes("schedule")) {
            weekLabel = firstCell;
            return;
        }

        const dayMatch = firstCell.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+(\d{4}-\d{2}-\d{2})$/i);

        if (dayMatch) {
            currentDay = dayMatch[1];
            currentDate = dayMatch[2];
            headers = [];
            return;
        }

        if (firstCell === "Time Block") {
            headers = columns.map(h => h.trim());
            return;
        }

        if (!currentDate || headers.length === 0) return;

        const timeBlock = firstCell;
        const activity = columns[1] || "";

        for (let i = 2; i < headers.length; i++) {
            const staffRole = headers[i];
            const status = columns[i] || "";

            if (!staffRole || !status) continue;

            schedule.push({
                weekLabel,
                date: currentDate,
                dayName: currentDay,
                timeBlock,
                activity,
                staffRole,
                status
            });
        }
    });

    return schedule;
}

function parseCSVLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
            fields.push(current.trim().replace(/^"|"$/g, ""));
            current = "";
        } else {
            current += ch;
        }
    }

    fields.push(current.trim().replace(/^"|"$/g, ""));
    return fields;
}

// Isabelle McLean — Parses committee CSV (Name, Description) and replaces the full committee options list via the API
function uploadCommitteeOptionsCSV() {
    const input = document.getElementById("committeeCsvInput");
    const file = input.files[0];

    if (!file) {
        alert("Please choose a committee CSV file first.");
        return;
    }

    readCSV(file).then(rows => {
        const committees = rows.map(row => ({
            name: row.Name || row.name || "",
            type: "",
            description: row.Description || row.description || row.Details || row.details || ""
        })).filter(c => c.name);

        if (!confirm("Uploading new committees will reset ALL existing student selections and assignments. Continue?")) return;

        apiRequest("POST", "/api/committee-options/replace", { committees })
            .then(() => {
                alert(committees.length + " committee option(s) uploaded. All previous student selections have been cleared.");
                input.value = "";
            });
    });
}

// Isabelle McLean — Changes the staff or admin password; requires the current admin password to authorize
function changePassword(which) {
    var currentId = which === "staff" ? "staffCurrentAdminPass" : "adminCurrentAdminPass";
    var newId     = which === "staff" ? "staffNewPass" : "adminNewPass";
    var statusId  = which === "staff" ? "staffPassStatus" : "adminPassStatus";

    var currentAdminPassword = document.getElementById(currentId).value;
    var newPassword = document.getElementById(newId).value;
    var status = document.getElementById(statusId);

    if (!currentAdminPassword) {
        status.textContent = "Enter the current admin password to confirm.";
        status.style.color = "#d93025";
        return;
    }
    if (!newPassword || newPassword.length < 4) {
        status.textContent = "New password must be at least 4 characters.";
        status.style.color = "#d93025";
        return;
    }

    status.textContent = "Saving…";
    status.style.color = "#888";

    fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ which: which, currentAdminPassword: currentAdminPassword, newPassword: newPassword })
    })
    .then(function(r) { return r.json().then(function(body) { return { ok: r.ok, body: body }; }); })
    .then(function(res) {
        if (!res.ok) {
            status.textContent = res.body.error || "Could not update password.";
            status.style.color = "#d93025";
            return;
        }
        document.getElementById(currentId).value = "";
        document.getElementById(newId).value = "";
        status.textContent = "✓ " + (which === "staff" ? "Staff" : "Admin") + " password updated.";
        status.style.color = "#5a9a20";
        setTimeout(function() { status.textContent = ""; }, 3500);
    })
    .catch(function() {
        status.textContent = "Connection error. Please try again.";
        status.style.color = "#d93025";
    });
}

// Isabelle McLean — Adds a single committee without touching the rest of the list or any student selections
function addSingleCommittee() {
    const nameInput = document.getElementById("newCommitteeName");
    const descInput = document.getElementById("newCommitteeDesc");
    const status = document.getElementById("addCommitteeStatus");
    const name = nameInput.value.trim();
    const description = descInput.value.trim();

    if (!name) {
        status.textContent = "Please enter a committee name.";
        status.style.color = "#d93025";
        return;
    }

    apiRequest("POST", "/api/committee-options", { name, description })
        .then(() => {
            nameInput.value = "";
            descInput.value = "";
            status.textContent = '✓ "' + name + '" added.';
            status.style.color = "#5a9a20";
            setTimeout(() => { status.textContent = ""; }, 2500);
        })
        .catch(() => {
            status.textContent = "Could not add committee. Please try again.";
            status.style.color = "#d93025";
        });
}

// Isabelle McLean — Loads the current committees into the dropdown, then reveals the remove panel
function openRemoveCommitteePanel() {
    const panel = document.getElementById("removeCommitteePanel");
    const select = document.getElementById("removeCommitteeSelect");

    fetch("/api/committee-options")
        .then(r => r.json())
        .then(committees => {
            if (!committees || committees.length === 0) {
                alert("No committees to remove. Upload a CSV first.");
                return;
            }
            select.innerHTML = '<option value="">Choose a committee...</option>';
            committees.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.textContent = c.name;
                select.appendChild(opt);
            });
            panel.style.display = "block";
        });
}

// Isabelle McLean — Deletes the selected committee, then hides the remove panel
function confirmRemoveCommittee() {
    const select = document.getElementById("removeCommitteeSelect");
    const id = select.value;
    if (!id) {
        alert("Please choose a committee to remove.");
        return;
    }
    const name = select.options[select.selectedIndex].text;
    if (!confirm('Remove "' + name + '" from the committee list?')) return;

    apiRequest("DELETE", "/api/committee-options/" + id)
        .then(() => {
            alert("Committee removed.");
            document.getElementById("removeCommitteePanel").style.display = "none";
        });
}

// Isabelle McLean — Clears only student committee selections and assignments without removing the committee options themselves
function clearCommitteeSignups() {
    if (!confirm("Clear all student committee selections and assignments? The committee list itself will not be affected. This cannot be undone.")) return;
    apiRequest("DELETE", "/api/committee-signups/all")
        .then(() => alert("All student selections and assignments cleared."))
        .catch(() => alert("Failed to clear. Please try again."));
}

// Isabelle McLean — Clears every committee option (replaces the list with an empty one)
function clearAllCommittees() {
    if (!confirm("Clear ALL committees? This will remove every committee option AND reset all student selections and assignments.")) return;

    apiRequest("POST", "/api/committee-options/replace", { committees: [] })
        .then(() => {
            alert("All committees cleared.");
            document.getElementById("removeCommitteePanel").style.display = "none";
        });
}

function readCSV(file) {
    return new Promise(resolve => {
        const reader = new FileReader();

        reader.onload = e => {
            const rows = ShadDB.parseCSV(e.target.result);
            resolve(rows);
        };

        reader.readAsText(file);
    });
}

function uploadMedkitsCSV() {
    const input = document.getElementById("medkitCsvInput");
    const file = input.files[0];

    if (!file) {
        alert("Please choose a med kit CSV file first.");
        return;
    }

    readCSV(file).then(rows => {
        const medkits = rows.map((row, i) => {
            const name = row.Name || row.name || "";
            if (!name) return null;
            const num = String(i + 1).padStart(3, "0");
            return {
                qrCode: "MEDKIT-" + num,
                name: name,
                assignedStaff: "",
                location: "",
                status: "Ready",
                supplies: row.Description || row.description || row.Type || row.type || ""
            };
        }).filter(Boolean);

        if (medkits.length === 0) {
            alert("No valid med kit rows found. Make sure your CSV has a Name column.");
            return;
        }

        apiRequest("POST", "/api/medkits/replace", { medkits })
            .then(() => {
                alert(medkits.length + " med kit(s) uploaded with auto-generated QR codes.");
                input.value = "";
            });
    });
}

// Isabelle McLean — Loads the current enrollment window from the server and populates the split date/time inputs in the admin panel
function loadEnrollmentWindow() {
    fetch("/api/committee-enrollment-config")
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.open_date) {
                document.getElementById("enrollOpenDate").value = data.open_date.slice(0, 10);
                document.getElementById("enrollOpenTime").value = data.open_date.slice(11, 16);
            }
            if (data.close_date) {
                document.getElementById("enrollCloseDate").value = data.close_date.slice(0, 10);
                document.getElementById("enrollCloseTime").value = data.close_date.slice(11, 16);
            }
        })
        .catch(function() {});
}

// Isabelle McLean — Combines the split date/time inputs and saves the enrollment window to the server; student portal reads these on every load
function saveEnrollmentWindow() {
    var openDate  = document.getElementById("enrollOpenDate").value;
    var openTime  = document.getElementById("enrollOpenTime").value;
    var closeDate = document.getElementById("enrollCloseDate").value;
    var closeTime = document.getElementById("enrollCloseTime").value;

    if (!openDate || !openTime || !closeDate || !closeTime) {
        alert("Please set both a date and time for the open and close.");
        return;
    }

    var openVal  = openDate  + "T" + openTime;
    var closeVal = closeDate + "T" + closeTime;

    if (new Date(openVal) >= new Date(closeVal)) {
        alert("The close date must be after the open date.");
        return;
    }

    var btn = document.getElementById("saveEnrollmentWindowBtn");
    apiRequest("PUT", "/api/committee-enrollment-config", { open_date: openVal, close_date: closeVal })
        .then(function() {
            btn.textContent = "Saved ✓";
            btn.style.background = "#00d084";
            setTimeout(function() {
                btn.textContent = "Save Sign-Up Window";
                btn.style.background = "";
            }, 2000);
        })
        .catch(function() { alert("Failed to save. Please try again."); });
}

// Isabelle McLean — Clear all schedule entries
function clearSchedule() {
    if (!confirm("Clear the entire schedule? This cannot be undone.")) return;
    apiRequest("DELETE", "/api/schedule/all")
        .then(() => alert("Schedule cleared."))
        .catch(() => alert("Failed to clear schedule. Please try again."));
}

// Isabelle McLean — Clear all staff contacts
function clearStaff() {
    if (!confirm("Clear all staff contacts? This cannot be undone.")) return;
    apiRequest("DELETE", "/api/staff/all")
        .then(() => alert("Staff contacts cleared."))
        .catch(() => alert("Failed to clear staff. Please try again."));
}

// Isabelle McLean — Clear all med kit records
function clearMedkits() {
    if (!confirm("Clear all med kits? This cannot be undone.")) return;
    apiRequest("DELETE", "/api/medkits/all")
        .then(() => alert("Med kits cleared."))
        .catch(() => alert("Failed to clear med kits. Please try again."));
}

// Isabelle McLean — Export current student roster as a downloadable CSV backup
function exportStudentsCSV() {
    fetch("/api/students")
        .then(function(r) { return r.json(); })
        .then(function(students) {
            if (!students || students.length === 0) {
                alert("No students to export.");
                return;
            }
            var headers = ["Name", "Pronouns", "Group", "Age", "Instrument", "Medication", "Dietary", "Note"];
            var rows = students.map(function(s) {
                return [
                    s.name || "",
                    s.pronouns || "",
                    s.group || "",
                    s.age || "",
                    s.instrument || "",
                    s.medication || "",
                    s.dietary || "",
                    s.note || ""
                ].map(function(v) {
                    // Wrap in quotes if value contains a comma or quote
                    var str = String(v).replace(/"/g, '""');
                    return str.includes(",") || str.includes('"') || str.includes("\n") ? '"' + str + '"' : str;
                }).join(",");
            });
            var csv = [headers.join(",")].concat(rows).join("\n");
            var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "shad_students_backup_" + new Date().toISOString().slice(0, 10) + ".csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        })
        .catch(function() { alert("Failed to export students. Please try again."); });
}

function formatShadStudentRows(rows) {
    return rows.map(row => {
        const g = k => (row[k] || "").trim();
        const firstName = g("FirstName");
        const lastName  = g("LastName");
        const prefName  = g("PrefName");
        const displayName = prefName ? `${prefName} ${lastName}` : `${firstName} ${lastName}`;
        return {
            name:               displayName.trim(),
            firstName:          firstName,
            lastName:           lastName,
            prefName:           prefName,
            appId:              g("AppID"),
            campus:             g("Campus"),
            pronouns:           g("Pronoun") || g("Self-ID Pronoun"),
            selfIdPronoun:      g("Self-ID Pronoun"),
            gender:             g("Gender"),
            selfIdGender:       g("Self-ID Gender"),
            dob:                g("DOB"),
            age:                g("Age Start Prog"),
            pdNotes:            g("Notes for PD to be aware of"),
            city:               g("City"),
            province:           g("Prov"),
            email:              g("Email"),
            phone:              g("Phone"),
            school:             g("School"),
            grade:              g("Grade"),
            ethnicity:          g("Ethnicity"),
            selfDescEthnicity:  g("Self-Desc Ethnicity"),
            indigenous:         g("Indig?"),
            selfDescIndigenous: g("Self-Des Indig."),
            languagePref:       g("Language Pref"),
            parentFirstName:    g("Parent First Name"),
            parentLastName:     g("Parent Last Name"),
            parentRelationship: g("Relationship To Applicant"),
            parentEmail:        g("Parent Email Address"),
            parentPhone:        g("Parent Phone #"),
            lgbtq:              g("2SLGBTQ+"),
            citySize:           g("City Size"),
            region:             g("Region"),
            hoodieSize:         g("Hoodie Size"),
            dietary:            g("Dietary Restrictions And/Or Intolerances") || "None",
            allergies:          g("Allergies"),
            epipen:             g("Epipen?"),
            group:              g("Campus"),
            instrument:         "",
            note:               ""
        };
    }).filter(s => s.name);
}

// ── Shift Swap Requests — Admin approval ──────────────────────────────────
function loadSwapRequestsAdmin() {
    fetch("/api/swap-requests")
        .then(r => r.json())
        .then(swaps => {
            renderSwapAdminList(swaps);
        })
        .catch(() => {
            const list = document.getElementById("swapAdminList");
            if (list) list.innerHTML = "<p style='color:#e74c3c;'>Failed to load swap requests.</p>";
        });
}

function renderSwapAdminList(swaps) {
    const list = document.getElementById("swapAdminList");
    const badge = document.getElementById("swapAdminBadge");
    if (!list) return;

    const pending = swaps.filter(r => r.status === "Pending");

    if (badge) {
        badge.textContent = pending.length;
        badge.style.display = pending.length > 0 ? "inline" : "none";
    }

    if (swaps.length === 0) {
        list.innerHTML = "<p style='color:#aaa; font-size:13px; font-weight:600;'>No swap requests.</p>";
        return;
    }

    list.innerHTML = "";
    swaps.forEach(r => {
        const card = document.createElement("div");
        card.style.cssText = "background:#f8f9fa; border:2px solid #e5e5e5; border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:6px;";

        const statusColor = r.status === "Approved" ? "#27ae60" : r.status === "Denied" ? "#e74c3c" : "#f39c12";

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <span style="font-size:15px; font-weight:800; color:#111;">${r.requester_name}</span>
                <span style="font-size:12px; font-weight:700; color:${statusColor}; background:${statusColor}18; padding:3px 10px; border-radius:20px;">${r.status}</span>
            </div>
            <div style="font-size:13px; color:#555; font-weight:600;">
                ${r.requester_role ? r.requester_role + " &middot; " : ""}${r.shift_date} &middot; ${r.shift_time}
            </div>
            <div style="font-size:13px; color:#555;">
                Swapping with: <strong>${r.swap_with || "Not specified"}</strong>
            </div>
            ${r.reason ? `<div style="font-size:13px; color:#777; font-style:italic;">"${r.reason}"</div>` : ""}
            ${r.status === "Pending" ? `
            <div style="display:flex; gap:8px; margin-top:6px;">
                <button onclick="adminResolveSwap(${r.id},'Approved')" style="padding:7px 16px; background:#27ae60; color:#fff; border:none; border-radius:8px; font-family:'Archivo',sans-serif; font-size:13px; font-weight:700; cursor:pointer;">✓ Approve</button>
                <button onclick="adminResolveSwap(${r.id},'Denied')" style="padding:7px 16px; background:#e74c3c; color:#fff; border:none; border-radius:8px; font-family:'Archivo',sans-serif; font-size:13px; font-weight:700; cursor:pointer;">✕ Deny</button>
                <button onclick="adminDeleteSwap(${r.id})" style="padding:7px 16px; background:#f0f0f0; color:#555; border:none; border-radius:8px; font-family:'Archivo',sans-serif; font-size:13px; font-weight:700; cursor:pointer;">🗑 Delete</button>
            </div>` : `
            <div style="display:flex; gap:8px; margin-top:6px;">
                <button onclick="adminDeleteSwap(${r.id})" style="padding:7px 16px; background:#f0f0f0; color:#555; border:none; border-radius:8px; font-family:'Archivo',sans-serif; font-size:13px; font-weight:700; cursor:pointer;">🗑 Delete</button>
            </div>`}
        `;
        list.appendChild(card);
    });
}

function adminResolveSwap(id, status) {
    fetch("/api/swap-requests/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status, resolvedBy: "Admin" })
    })
    .then(r => r.json())
    .then(() => loadSwapRequestsAdmin())
    .catch(() => alert("Failed to update swap request."));
}

function adminDeleteSwap(id) {
    if (!confirm("Delete this swap request?")) return;
    fetch("/api/swap-requests/" + id, { method: "DELETE" })
        .then(() => loadSwapRequestsAdmin())
        .catch(() => alert("Failed to delete swap request."));
}

// ── SHAD 2026 PROGRAM SCHEDULE ────────────────────────────────────────────────

function uploadShadScheduleCSV() {
    const labelInput = document.getElementById("shadScheduleWeekLabel");
    const fileInput  = document.getElementById("shadScheduleCsvInput");
    const weekLabel  = (labelInput.value || "").trim();
    const file       = fileInput.files[0];

    if (!weekLabel) { alert("Please enter a week label (e.g. Week 0)."); return; }
    if (!file)      { alert("Please choose a CSV file."); return; }

    const reader = new FileReader();
    reader.onload = e => {
        const parsed = parseShadScheduleCSV(e.target.result);
        if (!parsed) { alert("Could not parse the CSV. Check that it matches the timetable grid format."); return; }

        // Extract week number from label ("Week 0" → 0, "Week 1" → 1, etc.)
        const numMatch = weekLabel.match(/\d+/);
        const weekNum  = numMatch ? parseInt(numMatch[0], 10) : 0;

        fetch("/api/shad-schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                week_label:    weekLabel,
                week_num:      weekNum,
                schedule_data: JSON.stringify(parsed)
            })
        }).then(r => r.json()).then(data => {
            if (data.error) { alert("Upload failed: " + data.error); return; }
            alert(weekLabel + " uploaded successfully (" + parsed.timeSlots.length + " time slots).");
            labelInput.value = "";
            fileInput.value  = "";
        }).catch(() => alert("Upload failed. Is the server running?"));
    };
    reader.readAsText(file);
}

function parseShadScheduleCSV(text) {
    // ── CSV row parser (handles quoted fields with embedded commas) ──────────
    function parseRow(line) {
        const fields = [];
        let cur = "", inQ = false;
        for (const ch of line) {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
            else { cur += ch; }
        }
        fields.push(cur.trim());
        return fields;
    }

    // Keep all lines (even blank ones hold structural whitespace)
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return null;

    const row0 = parseRow(lines[0]);

    // ── Detect layout: find non-empty cells in row 0 after col 0 ────────────
    // The gap between them tells us how many sub-columns each day uses.
    const dayPositions = [];   // column indices where each day starts
    for (let i = 1; i < row0.length; i++) {
        if (row0[i].trim()) dayPositions.push(i);
    }
    if (dayPositions.length === 0) return null;

    const numDays    = Math.min(7, dayPositions.length);
    const colsPerDay = numDays >= 2 ? dayPositions[1] - dayPositions[0] : 1;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const DAY_NAMES = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i;
    const OLD_DATE  = /^[A-Za-z]{3}-\d{1,2}$/;          // "Jun-30"
    const NEW_DATE  = /^[A-Za-z]+ \d{1,2}$|^[A-Za-z]+\d{1,2}$/; // "July 5"
    const isDay  = v => DAY_NAMES.test(v.trim());
    const isDate = v => OLD_DATE.test(v.trim()) || NEW_DATE.test(v.trim());
    const isJunk = v => !v || isDay(v) || isDate(v);

    // ── Extract headers and dates from the first 1-2 rows ───────────────────
    const headers = Array(numDays).fill("");
    const dates   = Array(numDays).fill("");

    if (colsPerDay === 1) {
        // Week-0 style: row 0 = day names; dates appear later inside time-slot cells
        for (let d = 0; d < numDays; d++) {
            headers[d] = (row0[dayPositions[d]] || "").trim();
        }
    } else {
        // Week-1+ style: row 0 = dates, row 1 = day names (both sparse)
        const row1 = parseRow(lines[1] || "");
        for (let d = 0; d < numDays; d++) {
            const pos = dayPositions[d];
            dates[d]   = (row0[pos] || "").trim();
            // Day name may land on pos or any sub-column within that day's span
            let dayName = "";
            for (let s = 0; s < colsPerDay && !dayName; s++) {
                const v = (row1[pos + s] || "").trim();
                if (isDay(v)) dayName = v;
            }
            headers[d] = dayName || (row1[pos] || "").trim();
        }
    }

    // ── Parse time slots ─────────────────────────────────────────────────────
    // For each CSV row, collect all non-junk values from each day's sub-columns.
    const startLine = colsPerDay === 1 ? 1 : 2;

    // rawSlots: { time, csvRows: [ [day0acts, day1acts, ...], ... ] }
    const rawSlots = [];
    let cur = null;

    for (let i = startLine; i < lines.length; i++) {
        const row     = parseRow(lines[i]);
        const timeVal = (row[0] || "").trim();

        // Gather activities for each day from this CSV row
        const rowDays = [];
        for (let d = 0; d < numDays; d++) {
            const pos  = dayPositions[d];
            const acts = [];
            for (let s = 0; s < colsPerDay; s++) {
                const v = (row[pos + s] || "").trim();
                // Single-col format: keep date strings so they can be extracted below;
                // multi-col format: strip all junk (day names, dates are never activities)
                const keep = colsPerDay === 1 ? (v && !isDay(v)) : (v && !isJunk(v));
                if (keep) acts.push(v);
            }
            rowDays.push(acts);
        }

        if (timeVal && !isJunk(timeVal)) {
            cur = { time: timeVal, csvRows: [rowDays] };
            rawSlots.push(cur);
        } else if (cur) {
            cur.csvRows.push(rowDays);
        }
    }

    // ── Detect dates from time-slot cells (Week-0 only) ──────────────────────
    if (colsPerDay === 1) {
        for (const slot of rawSlots.slice(0, 4)) {
            for (const csvRow of slot.csvRows) {
                csvRow.forEach((acts, d) => {
                    acts.forEach(v => { if (OLD_DATE.test(v)) dates[d] = v; });
                });
            }
        }
    }

    // ── Flatten: merge all csvRows + sub-columns into one deduplicated list ──
    // Also strip out any date strings that were kept for extraction (Week-0 only)
    const timeSlots = rawSlots.map(slot => {
        const days = Array.from({ length: numDays }, (_, d) => {
            const seen = new Set();
            const out  = [];
            for (const csvRow of slot.csvRows) {
                for (const v of (csvRow[d] || [])) {
                    if (isDate(v)) continue;   // drop date strings from activity list
                    if (!seen.has(v)) { seen.add(v); out.push(v); }
                }
            }
            return out;
        });
        return { time: slot.time, days };
    }).filter(slot => slot.days.some(d => d.length > 0));

    return { headers, dates, timeSlots };
}

function clearShadSchedule() {
    if (!confirm("Clear ALL SHAD Schedule data? This cannot be undone.")) return;
    fetch("/api/shad-schedule/all", { method: "DELETE" })
        .then(r => r.json())
        .then(d => alert("Cleared " + (d.cleared || 0) + " week(s)."))
        .catch(() => alert("Failed to clear schedule."));
}

// ── ROOM NUMBER CSV UPLOAD ────────────────────────────────────────────────────
function uploadRoomsCSV() {
    const input  = document.getElementById("roomCsvInput");
    const status = document.getElementById("roomUploadStatus");
    const file   = input.files[0];
    if (!file) { setRoomStatus("Please choose a CSV file first.", true); return; }

    readCSV(file).then(rows => {
        const rooms = rows.map(row => ({
            firstName:  (row.FirstName  || row.firstname  || row["First Name"]  || row.first_name  || "").trim(),
            lastName:   (row.LastName   || row.lastname   || row["Last Name"]   || row.last_name   || "").trim(),
            roomNumber: (row.RoomNumber || row.roomnumber || row["Room Number"] || row.room_number || row.Room || "").trim()
        })).filter(r => r.firstName && r.lastName && r.roomNumber);

        if (rooms.length === 0) {
            setRoomStatus("No valid rows found. Check that columns are FirstName, LastName, RoomNumber.", true);
            return;
        }

        fetch("/api/students/upload-rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rooms })
        })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            let msg = data.updated + " student(s) updated.";
            if (data.unmatched && data.unmatched.length > 0) {
                msg += " Could not match: " + data.unmatched.join(", ") + ".";
            }
            setRoomStatus(msg, data.unmatched && data.unmatched.length > 0);
            input.value = "";
        })
        .catch(err => setRoomStatus((err && err.message) || "Upload failed.", true));
    });
}

function setRoomStatus(msg, isError) {
    const el = document.getElementById("roomUploadStatus");
    if (!el) return;
    el.style.color = isError ? "#d12c2c" : "#5a9a20";
    el.textContent = msg;
}
