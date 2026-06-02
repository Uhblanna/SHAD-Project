document.addEventListener("DOMContentLoaded", () => {
    loadIssueTickets();

    document.getElementById("clearTicketsBtn").addEventListener("click", clearTickets);
    document.getElementById("uploadStaffBtn").addEventListener("click", uploadStaffCSV);
    document.getElementById("uploadScheduleBtn").addEventListener("click", uploadScheduleCSV);
    document.getElementById("uploadStudentsReplaceBtn").addEventListener("click", uploadStudentsReplace);
    document.getElementById("uploadStudentsAddBtn").addEventListener("click", uploadStudentsAdd);
    document.getElementById("clearStudentsAdminBtn").addEventListener("click", clearStudentsFromAdmin);
    // Isabelle McLean — Wires up the Upload Committee Options CSV button on the admin page
    document.getElementById("uploadCommitteeBtn").addEventListener("click", uploadCommitteeOptionsCSV);
    // Isabelle McLean — Wires up the Remove a Committee button + confirm remove button
    document.getElementById("removeCommitteeBtn").addEventListener("click", openRemoveCommitteePanel);
    document.getElementById("confirmRemoveCommitteeBtn").addEventListener("click", confirmRemoveCommittee);
    document.getElementById("clearCommitteesBtn").addEventListener("click", clearAllCommittees);
    document.getElementById("uploadMedkitsBtn").addEventListener("click", uploadMedkitsCSV);

    setupPanelToggles();
});

// Collapse/expand each admin card. Clicking the toggle hides the card body
// and swaps the −/+ glyph.
function setupPanelToggles() {
    document.querySelectorAll(".panel-toggle").forEach(function (btn) {
        const head = btn.closest(".admin-card-head");
        const body = head.nextElementSibling;

        function setCollapsed(collapsed) {
            body.classList.toggle("collapsed", collapsed);
            btn.textContent = collapsed ? "+" : "−";
            btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
            btn.title = collapsed ? "Expand" : "Collapse";
        }

        btn.addEventListener("click", function () {
            setCollapsed(!body.classList.contains("collapsed"));
        });

        setCollapsed(true); // start closed
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
        const formattedRows = formatShadStudentRows(rows);
        const count = ShadDB.clearAndImportStudents(formattedRows);
        alert(count + " student(s) uploaded. Previous students were replaced.");
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
        const count = ShadDB.importStudentsFromCSV(formattedRows);
        alert(count + " student(s) added.");
        input.value = "";
    });
}

function clearStudentsFromAdmin() {
    const confirmClear = confirm("Clear all students? This cannot be undone.");
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
                opt.textContent = c.name + " (" + (c.type || "Project") + ")";
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
        const medkits = rows.map(row => ({
            qrCode: row.QRCode || row.qrCode || row.qr_code || row["QR Code"] || "",
            name: row.Name || row.name || "",
            assignedStaff: row.AssignedStaff || row.assignedStaff || row["Assigned Staff"] || "",
            location: row.Location || row.location || "",
            status: row.Status || row.status || "Ready",
            supplies: row.Supplies || row.supplies || ""
        })).filter(kit => kit.qrCode && kit.name);

        apiRequest("POST", "/api/medkits/replace", { medkits })
            .then(() => {
                alert(medkits.length + " med kit(s) uploaded.");
                input.value = "";
            });
    });
}

function formatShadStudentRows(rows) {
    return rows.map(row => {
        const firstName = row.FirstName || row["FirstName"] || "";
        const lastName = row.LastName || row["LastName"] || "";
        const prefName = row.PrefName || row["PrefName"] || "";

        const displayName = prefName
            ? `${prefName} ${lastName}`
            : `${firstName} ${lastName}`;

        const dietary = row["Dietary Restrictions And/Or Intolerances"] || "None";
        const allergies = row.Allergies || "None";
        const epipen = row["Epipen?"] || "No";

        let dietaryNote = dietary;

        if (allergies && allergies.toLowerCase() !== "none") {
            dietaryNote += ` | Allergies: ${allergies}`;
        }

        if (epipen && epipen.toLowerCase() !== "no") {
            dietaryNote += ` | Epipen: ${epipen}`;
        }

        return {
            Name: displayName.trim(),
            Pronouns: row.Pronoun || row["Self-ID Pronoun"] || "",
            Group: row.Campus || "Group 1",
            Age: row["Age Start Prog"] || "",
            Instrument: "",
            Medication: "None",
            Dietary: dietaryNote,
            Note: row["Notes for PD to be aware of"] || ""
        };
    }).filter(student => student.Name);
}