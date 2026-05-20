document.addEventListener("DOMContentLoaded", () => {
    loadStaff();
    setupSearch();
});

let staffMembers = [];

function loadStaff() {
    fetch("/api/staff")
        .then(res => res.json())
        .then(staff => {
            staffMembers = staff;
            renderStaff();
        });
}

function renderStaff() {
    const grid = document.getElementById("staffGrid");
    if (!grid) return;

    grid.innerHTML = "";

    if (staffMembers.length === 0) {
        grid.innerHTML = "<p>No staff uploaded yet. Upload staff from the Admin page.</p>";
        return;
    }

    staffMembers.forEach(person => {
        const card = document.createElement("div");
        card.className = "staff-card";

        const initial = person.name.charAt(0).toUpperCase();

        card.innerHTML = `
            <div class="avatar">${initial}</div>
            <h3>${person.name}</h3>
            <p class="role">Staff</p>

            <div class="info">
                <p>${person.email}</p>
            </div>

            <div class="actions">
                <a href="mailto:${person.email}">Email</a>
                <a href="${person.slackLink}" target="_blank">Slack</a>
            </div>
        `;

        grid.appendChild(card);
    });
}

function setupSearch() {
    const searchInput = document.querySelector(".search-bar input");
    if (!searchInput) return;

    searchInput.addEventListener("input", function() {
        const query = searchInput.value.toLowerCase().trim();
        const cards = document.querySelectorAll(".staff-card");

        cards.forEach(card => {
            const name = card.querySelector("h3").textContent.toLowerCase();

            if (query === "" || name.includes(query)) {
                card.style.display = "";
            } else {
                card.style.display = "none";
            }
        });
    });
}
