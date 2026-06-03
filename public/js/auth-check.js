document.documentElement.style.visibility = "hidden";

fetch("/api/check-auth")
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (!data.ok) {
            window.location.href = "/public/login.html";
        } else {
            document.documentElement.style.visibility = "";
            injectLogout();
        }
    })
    .catch(function() {
        window.location.href = "/public/login.html";
    });

function injectLogout() {
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
