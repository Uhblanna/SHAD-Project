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
});

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

function uploadStudentsReplace() {
    const input = document.getElementById("studentCsvInput");
    const file = input.files[0];

    if (!file) {
        alert("Please choose a student CSV file first.");
        return;
    }

    readCSV(file).then(rows => {
        const count = ShadDB.clearAndImportStudents(rows);
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
        const count = ShadDB.importStudentsFromCSV(rows);
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

    readCSV(file).then(rows => {
        const schedule = rows.map(row => ({
            name: row.Name || row.name || "",
            role: row.Role || row.role || "",
            status: row.Status || row.status || "duty",
            hours: row.Hours || row.hours || ""
        })).filter(shift => shift.name);

        apiRequest("POST", "/api/schedule/replace", { schedule })
            .then(() => {
                alert(schedule.length + " schedule rows uploaded.");
                input.value = "";
            });
    });
}

// Isabelle McLean — Parses committee CSV (Name, Type, Description) and replaces the full committee options list via the API
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
            type: row.Type || row.type || "Project",
            description: row.Description || row.description || row.Details || row.details || ""
        })).filter(c => c.name);

        apiRequest("POST", "/api/committee-options/replace", { committees })
            .then(() => {
                alert(committees.length + " committee option(s) uploaded.");
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