document.addEventListener("DOMContentLoaded", () => {
    loadIssueTickets();

    document.getElementById("clearTicketsBtn").addEventListener("click", clearTickets);
    document.getElementById("uploadStaffBtn").addEventListener("click", uploadStaffCSV);
    document.getElementById("uploadScheduleBtn").addEventListener("click", uploadScheduleCSV);
    document.getElementById("uploadStudentsReplaceBtn").addEventListener("click", uploadStudentsReplace);
document.getElementById("uploadStudentsAddBtn").addEventListener("click", uploadStudentsAdd);
document.getElementById("clearStudentsAdminBtn").addEventListener("click", clearStudentsFromAdmin);
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