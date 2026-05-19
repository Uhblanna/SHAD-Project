document.addEventListener("DOMContentLoaded", () => {
    loadQuickDashboard();
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