document.addEventListener("DOMContentLoaded", () => {
    loadQuickDashboard();
    loadMedkitCheckins();

    const resetBtn = document.getElementById("resetMedkitCheckinsBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", resetMedkitCheckins);
    }
});

function loadQuickDashboard() {
    if (!window.ShadDB) {
        console.error("ShadDB is not loaded. Make sure db.js is linked before index.js.");
        return;
    }

    const stats = ShadDB.getDashboardStats();

    document.getElementById("checkedInStat").textContent =
        stats.checkedIn + " / " + stats.totalStudents;

    document.getElementById("missingStat").textContent =
        stats.missing;

    document.getElementById("alertsStat").textContent =
        stats.unacknowledged;

    document.getElementById("medicationStat").textContent =
        stats.needsMedication;
}
function loadMedkitCheckins() {
    fetch("/api/medkits")
        .then(res => res.json())
        .then(kits => {
            const checked = kits.filter(kit => kit.checkedIn).length;
            const total = kits.length;

            document.getElementById("medkitCheckinStat").textContent =
                checked + " / " + total;
        });
}

function resetMedkitCheckins() {
    if (!confirm("Reset all med kit check-ins?")) return;

    fetch("/api/medkits/reset-checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(() => loadMedkitCheckins());
}