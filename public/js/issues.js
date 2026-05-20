document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("sendIssueBtn");
    if (btn) btn.addEventListener("click", submitIssueTicket);

    loadIssueQueue();
});

function submitIssueTicket() {
    const ticket = {
        name: document.getElementById("issueName").value.trim(),
        email: document.getElementById("issueEmail").value.trim(),
        phone: document.getElementById("issuePhone").value.trim(),
        issueType: document.getElementById("issueType").value,
        description: document.getElementById("issueDescription").value.trim(),
        urgent: document.getElementById("issueUrgent").checked
    };

    if (!ticket.name || !ticket.email || !ticket.description) {
        alert("Please enter your name, email, and issue description.");
        return;
    }

    fetch("/api/issue-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticket)
    })
    .then(res => res.json())
    .then(() => {
        alert("Issue report submitted.");

        loadIssueQueue();

        document.getElementById("issueName").value = "";
        document.getElementById("issueEmail").value = "";
        document.getElementById("issuePhone").value = "";
        document.getElementById("issueType").selectedIndex = 0;
        document.getElementById("issueDescription").value = "";
        document.getElementById("issueUrgent").checked = false;
    });
}

function loadIssueQueue() {
    fetch("/api/issue-tickets")
        .then(res => res.json())
        .then(tickets => {
            const queue = document.getElementById("issueQueue");
            if (!queue) return;

            queue.innerHTML = "";

            if (tickets.length === 0) {
                queue.innerHTML = "<p>No issue tickets submitted yet.</p>";
                return;
            }

            tickets.forEach(ticket => {
                const div = document.createElement("div");
                div.className = "error-item";

                div.innerHTML = `
                    <h4>${ticket.issueType || "System Issue"}</h4>
                    <p>Reported by ${ticket.name}</p>
                    <span>${ticket.createdAt || ""}</span>
                `;

                queue.appendChild(div);
            });
        });
}