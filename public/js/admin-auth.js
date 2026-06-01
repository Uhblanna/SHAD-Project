// Isabelle McLean — Gates the admin page behind BOTH the existing staff login AND a separate admin password.
// Replaces auth-check.js on admin.html only. Other staff pages keep using auth-check.js as before.

document.documentElement.style.visibility = "hidden";

(function() {
    // Step 1: confirm staff is logged in (otherwise bounce to login like auth-check.js does)
    fetch("/api/check-auth")
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.ok) {
                window.location.href = "/public/login.html";
                return;
            }
            checkAdminAuth();
        })
        .catch(function() { window.location.href = "/public/login.html"; });

    // Step 2: confirm admin auth — if missing, show the password modal
    function checkAdminAuth() {
        fetch("/api/check-admin-auth")
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.ok) {
                    revealPage();
                } else {
                    showAdminLoginModal();
                }
            })
            .catch(function() { showAdminLoginModal(); });
    }

    function revealPage() {
        document.documentElement.style.visibility = "";
        injectLogout();
    }

    // Same logout-injection pattern as auth-check.js, plus also clears admin auth so re-entry requires the admin password again
    function injectLogout() {
        // Anchor on the Admin link so Log Out sits to its right; fall back to the
        // last (right-hand) nav in the header — NOT header nav:last-of-type, which
        // incorrectly matches the logo-group's Home nav first.
        var adminLink = document.querySelector('a[href="/public/admin.html"]');
        var nav;
        if (adminLink) {
            nav = adminLink.parentElement;
        } else {
            var navs = document.querySelectorAll("header nav, .topbar nav");
            nav = navs[navs.length - 1];
        }
        if (!nav) return;

        var divider = document.createElement("span");
        divider.style.cssText = "color:#ddd; font-weight:400;";
        divider.textContent = "|";

        var btn = document.createElement("a");
        btn.href = "#";
        btn.textContent = "Log Out";
        btn.style.cssText = "color:#d12c2c; font-weight:700;";

        btn.addEventListener("click", function(e) {
            e.preventDefault();
            // Clear both admin and staff auth, then bounce to login
            fetch("/api/admin-logout", { method: "POST" })
                .then(function() { return fetch("/api/staff-logout", { method: "POST" }); })
                .then(function() { window.location.href = "/public/login.html"; });
        });

        if (adminLink) {
            // Insert divider then Log Out immediately to the right of the Admin link
            adminLink.insertAdjacentElement("afterend", btn);
            adminLink.insertAdjacentElement("afterend", divider);
        } else {
            nav.appendChild(divider);
            nav.appendChild(btn);
        }
    }

    // Builds and shows the admin password modal. Uses inline visibility:visible so it appears even while <html> is hidden.
    function showAdminLoginModal() {
        var overlay = document.createElement("div");
        overlay.id = "adminAuthOverlay";
        overlay.style.cssText =
            "visibility:visible;position:fixed;inset:0;background:rgba(0,0,0,0.7);" +
            "z-index:9999;display:flex;align-items:center;justify-content:center;" +
            "padding:20px;font-family:Montserrat,sans-serif;";

        overlay.innerHTML =
            '<div style="visibility:visible;background:white;border-radius:22px;padding:44px 40px 36px;width:340px;max-width:100%;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,0.45);">' +
                '<div style="width:64px;height:64px;background:linear-gradient(135deg,#146ff8,#4d94ff);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">' +
                    '<svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>' +
                    '</svg>' +
                '</div>' +
                '<h3 style="font-size:22px;font-weight:800;color:#111;margin-bottom:8px;">Admin Access</h3>' +
                '<p style="font-size:14px;color:#888;font-weight:500;margin-bottom:28px;line-height:1.5;">' +
                    'Enter the admin password to view this page.' +
                '</p>' +
                '<form id="adminLoginForm">' +
                    '<input type="password" id="adminPasswordInput" placeholder="Admin Password" autocomplete="current-password" ' +
                        'style="width:100%;padding:14px 16px;border:2px solid #e5e5e5;border-radius:12px;' +
                        'font-family:Montserrat,sans-serif;font-size:15px;font-weight:600;outline:none;' +
                        'margin-bottom:14px;box-sizing:border-box;">' +
                    '<p id="adminLoginError" style="font-size:13px;color:#d12c2c;font-weight:700;min-height:18px;margin-bottom:4px;"></p>' +
                    '<button type="submit" id="adminLoginSubmit" ' +
                        'style="width:100%;padding:14px;background:#146ff8;color:white;' +
                        'font-family:Montserrat,sans-serif;font-size:16px;font-weight:700;' +
                        'border:none;border-radius:12px;cursor:pointer;margin-bottom:12px;">' +
                        'Enter Admin →' +
                    '</button>' +
                '</form>' +
                '<a href="/public/index.html" style="font-size:13px;color:#aaa;font-weight:600;text-decoration:none;">' +
                    '← Back to Staff Home' +
                '</a>' +
            '</div>';

        document.body.appendChild(overlay);

        setTimeout(function() {
            var input = document.getElementById("adminPasswordInput");
            if (input) input.focus();
        }, 100);

        document.getElementById("adminLoginForm").addEventListener("submit", function(e) {
            e.preventDefault();
            var input = document.getElementById("adminPasswordInput");
            var errEl = document.getElementById("adminLoginError");
            var btn   = document.getElementById("adminLoginSubmit");

            errEl.textContent = "";
            btn.textContent = "Checking...";
            btn.disabled = true;

            fetch("/api/admin-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: input.value })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.ok) {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    revealPage();
                } else {
                    errEl.textContent = "Incorrect password. Try again.";
                    input.value = "";
                    input.focus();
                    btn.textContent = "Enter Admin →";
                    btn.disabled = false;
                }
            })
            .catch(function() {
                errEl.textContent = "Connection error.";
                btn.textContent = "Enter Admin →";
                btn.disabled = false;
            });
        });
    }
})();
