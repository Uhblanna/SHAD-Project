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
    var nav = document.querySelector("header nav:last-of-type");
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
        fetch("/api/staff-logout", { method: "POST" })
            .then(function() { window.location.href = "/public/login.html"; });
    });

    nav.appendChild(divider);
    nav.appendChild(btn);
}
