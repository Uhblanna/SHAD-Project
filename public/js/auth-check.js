document.documentElement.style.visibility = "hidden";

fetch("/api/check-auth")
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (!data.ok) {
            window.location.href = "/public/login.html";
        } else {
            document.documentElement.style.visibility = "";
            whenReady(function() { injectLogout(data.staffName); });
        }
    })
    .catch(function() {
        window.location.href = "/public/login.html";
    });

// Run fn once the DOM is parsed. The auth fetch can resolve before <body> exists
// (fast/cached responses), so injecting the logout button immediately would find no
// nav and silently skip it — this guarantees the nav is present first.
function whenReady(fn) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn);
    } else {
        fn();
    }
}

function injectLogout(staffName) {
    var adminLink = document.querySelector('a[href="/public/admin.html"]');
    var nav;
    if (adminLink) {
        nav = adminLink.parentElement;
    } else {
        // Fall back to the last (right-hand) nav, NOT header nav:last-of-type,
        // which incorrectly matches the logo-group's Home nav first.
        var navs = document.querySelectorAll("header nav, .topbar nav");
        nav = navs[navs.length - 1];
    }
    if (!nav) return;

    var divider = document.createElement("span");
    divider.style.cssText = "color:#ddd; font-weight:400;";
    divider.textContent = "|";

    // Show who's logged in
    if (staffName && staffName !== "Staff") {
        var nameTag = document.createElement("span");
        nameTag.textContent = staffName;
        nameTag.style.cssText = "color:#555; font-weight:700; font-size:13px;";
        nav.appendChild(document.createTextNode(" "));
        nav.appendChild(nameTag);
    }

    var btn = document.createElement("a");
    btn.href = "javascript:void(0)";
    btn.textContent = "Log Out";
    btn.style.cssText = "color:#d12c2c; font-weight:700;";

    btn.addEventListener("click", function(e) {
        e.preventDefault();
        fetch("/api/staff-logout", { method: "POST" })
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
