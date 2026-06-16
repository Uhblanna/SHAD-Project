let medKits = [];
let qrScanner = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("showAddKitBtn").addEventListener("click", toggleAddForm);
    document.getElementById("addKitBtn").addEventListener("click", addKit);
    document.getElementById("cancelAddKitBtn").addEventListener("click", hideAddForm);
    document.getElementById("manualCheckInBtn").addEventListener("click", manualCheckIn);
    document.getElementById("startScannerBtn").addEventListener("click", startScanner);
    document.getElementById("stopScannerBtn").addEventListener("click", stopScanner);
    document.getElementById("resetCheckinsBtn").addEventListener("click", resetCheckins);

    const printAllBtn = document.getElementById("printAllMedkitQRBtn");
    if (printAllBtn) printAllBtn.addEventListener("click", () => printMedkitQR(medKits));

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
            renderCheckinSummary();
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

        // Only show optional fields if they have values
        const staffLine = kit.assignedStaff ? `<p><strong>Assigned Staff:</strong> ${esc(kit.assignedStaff)}</p>` : "";
        const locationLine = kit.location ? `<p><strong>Location:</strong> ${esc(kit.location)}</p>` : "";
        const descLine = kit.supplies ? `<p><strong>Description:</strong> ${esc(kit.supplies)}</p>` : "";

        const uncheckBtn = kit.checkedIn
            ? `<button class="uncheck-btn" style="padding:7px 16px;background:#fff1e0;color:#cc7a00;border:none;border-radius:9px;font-family:'Archivo',sans-serif;font-size:13px;font-weight:700;cursor:pointer;">↩ Uncheck</button>`
            : `<button class="uncheck-btn" disabled style="padding:7px 16px;background:#f0f0f0;color:#bbb;border:none;border-radius:9px;font-family:'Archivo',sans-serif;font-size:13px;font-weight:700;cursor:default;">↩ Uncheck</button>`;

        card.innerHTML = `
            <div class="kit-top">
                <h4>${esc(kit.name)}</h4>
                <span class="status ${statusClass}">${esc(kit.status)}</span>
            </div>
            <div class="kit-qr-wrap" style="display:flex;align-items:flex-start;gap:16px;margin:12px 0;">
                <div class="kit-qr-img" style="flex-shrink:0;padding:8px;background:#fff;border:2px solid #e5e5e5;border-radius:10px;"></div>
                <div class="kit-info" style="flex:1;">
                    <p><strong>QR Code:</strong> ${esc(kit.qrCode)}</p>
                    ${staffLine}
                    ${locationLine}
                    ${descLine}
                </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="print-qr-btn" style="padding:7px 16px;background:#146ff8;color:#fff;border:none;border-radius:9px;font-family:'Archivo',sans-serif;font-size:13px;font-weight:700;cursor:pointer;">🖨 Print QR</button>
                ${uncheckBtn}
                <button class="delete-btn" onclick="deleteKit(${kit.id})">Remove Kit</button>
            </div>
        `;

        const qrDiv = card.querySelector(".kit-qr-img");
        if (window.QRCode && kit.qrCode) {
            new QRCode(qrDiv, {
                text: kit.qrCode,
                width: 96,
                height: 96,
                correctLevel: QRCode.CorrectLevel.M
            });
        }

        card.querySelector(".print-qr-btn").addEventListener("click", () => printMedkitQR([kit]));

        const uncheckEl = card.querySelector(".uncheck-btn");
        if (uncheckEl) {
            uncheckEl.addEventListener("click", () => {
                uncheckEl.disabled = true;
                uncheckEl.textContent = "Unchecking…";
                apiRequest("POST", "/api/medkits/uncheck/" + kit.id)
                    .then(result => {
                        if (result.error) { alert(result.error); uncheckEl.disabled = false; uncheckEl.textContent = "↩ Uncheck"; return; }
                        loadMedKits();
                    });
            });
        }

        kitList.appendChild(card);
    });
}

function renderCheckinSummary() {
    const container = document.getElementById("checkin-summary");
    if (!container) return;

    if (medKits.length === 0) {
        container.innerHTML = '<p style="color:#aaa;font-size:14px;font-weight:600;">No med kits loaded yet.</p>';
        return;
    }

    const checkedIn = medKits.filter(k => k.checkedIn);
    const notChecked = medKits.filter(k => !k.checkedIn);

    container.innerHTML = "";

    // Summary badge
    const badge = document.createElement("div");
    badge.style.cssText = "display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;font-size:14px;font-weight:800;margin-bottom:18px;" +
        (checkedIn.length === medKits.length
            ? "background:#e6f9ef;color:#5f8c1d;"
            : "background:#fff1e0;color:#cc7a00;");
    badge.textContent = `${checkedIn.length} / ${medKits.length} checked in`;
    container.appendChild(badge);

    // Checked in list
    if (checkedIn.length > 0) {
        const label = document.createElement("p");
        label.style.cssText = "font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5f8c1d;margin-bottom:8px;";
        label.textContent = "Checked In";
        container.appendChild(label);

        checkedIn.forEach(kit => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 14px;background:#e6f9ef;border-radius:12px;margin-bottom:8px;";
            row.innerHTML = `<span style="font-size:13px;font-weight:700;color:#5f8c1d;flex:1;">${esc(kit.name)}</span><span style="font-size:11px;font-weight:700;color:#5f8c1d;">✓</span>`;
            container.appendChild(row);
        });
    }

    // Not checked in list
    if (notChecked.length > 0) {
        const label = document.createElement("p");
        label.style.cssText = "font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#cc7a00;margin-bottom:8px;" + (checkedIn.length > 0 ? "margin-top:16px;" : "");
        label.textContent = "Not Checked In";
        container.appendChild(label);

        notChecked.forEach(kit => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fafafa;border:1px solid #eee;border-radius:12px;margin-bottom:8px;";
            row.innerHTML = `<span style="font-size:13px;font-weight:700;color:#555;flex:1;">${esc(kit.name)}</span><span style="font-size:11px;font-weight:700;color:#ccc;">—</span>`;
            container.appendChild(row);
        });
    }
}

function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toggleAddForm() {
    const form = document.getElementById("addKitForm");
    form.classList.toggle("show");
}

function hideAddForm() {
    document.getElementById("addKitForm").classList.remove("show");
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
        qrCode, name, assignedStaff, location, status, supplies
    }).then(result => {
        if (result.error) { alert(result.error); return; }

        document.getElementById("qrCode").value = "";
        document.getElementById("kitName").value = "";
        document.getElementById("assignedStaff").value = "";
        document.getElementById("location").value = "";
        document.getElementById("status").value = "Ready";
        document.getElementById("supplies").value = "";

        hideAddForm();
        loadMedKits();
    });
}

function resetCheckins() {
    if (!confirm("Reset all check-ins? This will mark every med kit as not checked in.")) return;
    apiRequest("POST", "/api/medkits/reset-checkins")
        .then(() => loadMedKits())
        .catch(() => alert("Failed to reset check-ins. Please try again."));
}

function manualCheckIn() {
    const qrCode = document.getElementById("manualQrCode").value.trim();
    if (!qrCode) { alert("Please enter a QR code."); return; }
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
        decodedText => { checkInMedKit(decodedText); },
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

function printMedkitQR(kits) {
    if (!kits || !kits.length) { alert("No med kits to print."); return; }

    const scratch = document.createElement("div");
    scratch.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
    document.body.appendChild(scratch);

    const cards = kits.map(kit => {
        const wrapper = document.createElement("div");
        scratch.appendChild(wrapper);
        if (window.QRCode && kit.qrCode) {
            new QRCode(wrapper, { text: kit.qrCode, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
        }
        const canvas = wrapper.querySelector("canvas");
        return { kit, dataUrl: canvas ? canvas.toDataURL() : "" };
    });

    document.body.removeChild(scratch);

    const cardHTML = cards.map(({ kit, dataUrl }) =>
        '<div class="qr-card">' +
            '<div class="qr-header">SHAD 2026 — MED KIT</div>' +
            (dataUrl ? '<img src="' + dataUrl + '" class="qr-img">' : "") +
            '<p class="qr-name">' + esc(kit.name) + '</p>' +
            '<p class="qr-sub">' + esc(kit.qrCode) + (kit.supplies ? "<br>" + esc(kit.supplies) : "") + '</p>' +
        '</div>'
    ).join("");

    const win = window.open("", "_blank");
    if (!win) { alert("Please allow pop-ups to print QR codes."); return; }
    win.document.write(
        '<!DOCTYPE html><html><head><title>SHAD 2026 — Med Kit QR Codes</title>' +
        '<style>' +
            '*{box-sizing:border-box;margin:0;padding:0;}' +
            'body{font-family:Arial,sans-serif;background:#fff;padding:0.25in;}' +
            '.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}' +
            '.toolbar h2{font-size:16px;}' +
            '.print-btn{padding:10px 22px;background:#146ff8;color:white;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;}' +
            '.qr-grid{display:flex;flex-wrap:wrap;gap:0;}' +
            '.qr-card{width:2.5in;height:3.5in;min-width:2.5in;max-width:2.5in;min-height:3.5in;max-height:3.5in;border:1.5px dashed #aaa;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;padding:0.15in;page-break-inside:avoid;break-inside:avoid;}' +
            '.qr-header{font-size:10px;font-weight:700;letter-spacing:1.5px;color:#146ff8;text-transform:uppercase;margin-bottom:8px;text-align:center;flex-shrink:0;}' +
            '.qr-img{width:1.8in;height:1.8in;display:block;flex-shrink:0;}' +
            '.qr-name{font-weight:700;font-size:13px;margin-top:10px;text-align:center;word-break:break-word;line-height:1.3;flex-shrink:0;}' +
            '.qr-sub{font-size:10px;color:#888;margin-top:4px;text-align:center;line-height:1.4;flex-shrink:0;}' +
            '@media print{body{padding:0.25in;}.toolbar{display:none!important;}.qr-grid{width:7.5in;}}' +
        '</style></head><body>' +
        '<div class="toolbar">' +
            '<h2>SHAD 2026 — Med Kit QR Codes &nbsp;<span style="font-weight:400;color:#888;font-size:13px;">Cut along dotted lines</span></h2>' +
            '<button class="print-btn" onclick="window.print()">🖨 Print</button>' +
        '</div>' +
        '<div class="qr-grid">' + cardHTML + '</div>' +
        '</body></html>'
    );
    win.document.close();
}
