let medKits = [];
let qrScanner = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("showAddKitBtn").addEventListener("click", toggleAddForm);
    document.getElementById("addKitBtn").addEventListener("click", addKit);
    document.getElementById("manualCheckInBtn").addEventListener("click", manualCheckIn);
    document.getElementById("startScannerBtn").addEventListener("click", startScanner);
    document.getElementById("stopScannerBtn").addEventListener("click", stopScanner);

    loadMedKits();
});

function apiRequest(method, url, data) {
    return fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : null
    }).then(res => res.json());
}

function loadMedKits() {
    fetch("/api/medkits")
        .then(res => res.json())
        .then(kits => {
            medKits = kits;
            renderKits();
        });
}

function renderKits() {
    const kitList = document.getElementById("kit-list");
    const kitCount = document.getElementById("kit-count");

    kitList.innerHTML = "";
    kitCount.textContent = `${medKits.length} Kits`;

    if (medKits.length === 0) {
        kitList.innerHTML = "<p>No med kits uploaded yet. Upload them in Admin or add one manually.</p>";
        return;
    }

    medKits.forEach(kit => {
        const card = document.createElement("div");
        card.className = "kit-card";

        let statusClass = "inuse";

        if (kit.status === "Ready") statusClass = "checked";
        if (kit.status === "Needs Restock") statusClass = "restock";
        if (kit.status === "Missing") statusClass = "missing";

        card.innerHTML = `
            <div class="kit-top">
                <h4>${kit.name}</h4>
                <span class="status ${statusClass}">${kit.status}</span>
            </div>

            <div class="kit-info">
                <p><strong>QR Code:</strong> ${kit.qrCode}</p>
                <p><strong>Assigned Staff:</strong> ${kit.assignedStaff || "Not assigned"}</p>
                <p><strong>Location:</strong> ${kit.location || "No location listed"}</p>
                <p><strong>Supplies:</strong> ${kit.supplies || "No notes added"}</p>
                <p><strong>Checked In:</strong> ${kit.checkedIn ? "Yes" : "No"}</p>
            </div>

            <button class="delete-btn" onclick="deleteKit(${kit.id})">Remove Kit</button>
        `;

        kitList.appendChild(card);
    });
}

function toggleAddForm() {
    document.getElementById("addKitForm").classList.toggle("show");
}

function addKit() {
    const qrCode = document.getElementById("qrCode").value.trim();
    const name = document.getElementById("kitName").value.trim();
    const assignedStaff = document.getElementById("assignedStaff").value.trim();
    const location = document.getElementById("location").value.trim();
    const status = document.getElementById("status").value;
    const supplies = document.getElementById("supplies").value.trim();

    if (!qrCode || !name) {
        alert("Please enter at least the QR code and kit name.");
        return;
    }

    apiRequest("POST", "/api/medkits", {
        qrCode,
        name,
        assignedStaff,
        location,
        status,
        supplies
    }).then(result => {
        if (result.error) {
            alert(result.error);
            return;
        }

        document.getElementById("qrCode").value = "";
        document.getElementById("kitName").value = "";
        document.getElementById("assignedStaff").value = "";
        document.getElementById("location").value = "";
        document.getElementById("status").value = "Ready";
        document.getElementById("supplies").value = "";

        loadMedKits();
    });
}

function manualCheckIn() {
    const qrCode = document.getElementById("manualQrCode").value.trim();

    if (!qrCode) {
        alert("Please enter a QR code.");
        return;
    }

    checkInMedKit(qrCode);
}

function checkInMedKit(qrCode) {
    apiRequest("POST", "/api/medkits/check-in", { qrCode })
        .then(result => {
            const message = document.getElementById("scanMessage");

            if (result.error) {
                message.textContent = result.error;
                message.className = "scan-message error";
                return;
            }

            message.textContent = `${result.name} checked in successfully.`;
            message.className = "scan-message success";

            document.getElementById("manualQrCode").value = "";
            loadMedKits();
        });
}

function startScanner() {
    if (qrScanner) return;

    qrScanner = new Html5Qrcode("qr-reader");

    qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        decodedText => {
            checkInMedKit(decodedText);
        },
        () => {}
    ).catch(() => {
        document.getElementById("scanMessage").textContent =
            "Camera could not start. Try manual entry or check browser permissions.";
        document.getElementById("scanMessage").className = "scan-message error";
    });
}

function stopScanner() {
    if (!qrScanner) return;

    qrScanner.stop().then(() => {
        qrScanner.clear();
        qrScanner = null;
    });
}

function deleteKit(id) {
    if (!confirm("Remove this med kit?")) return;

    apiRequest("DELETE", "/api/medkits/" + id)
        .then(() => loadMedKits());
}