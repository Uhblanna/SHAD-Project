// ============================================================
//  SHAD Portal — Report an Issue
//  Handles: submit issue form, error queue display
// ============================================================


// ── ISSUES DATA ───────────────────────────────────────────
// Existing issues in the queue.
// When you connect Firebase this will come from the database.

let issues = [
    { id: 1, title: 'Attendance Page Not Loading',      reporter: 'Sarah Kim',   time: 'Today • 9:42 AM'    },
    { id: 2, title: 'Student Search Returning Blank',   reporter: 'Jordan Lee',  time: 'Today • 11:08 AM'   },
    { id: 3, title: 'QR Scanner Camera Permission Error', reporter: 'Alex Chen', time: 'Yesterday • 6:14 PM' },
];

let nextIssueId = 4;


// ── ON PAGE LOAD ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

    renderIssueQueue();
    setupIssueForm();

});


// ── RENDER ISSUE QUEUE ────────────────────────────────────

function renderIssueQueue() {

    const systemCard = document.querySelector('.system-card');

    // Keep the heading, remove old items
    const oldItems = systemCard.querySelectorAll('.error-item');
    oldItems.forEach(function(item) { item.remove(); });

    if (issues.length === 0) {

        const empty = document.createElement('p');
        empty.style.cssText = 'color:#888; padding:20px 0; font-size:15px;';
        empty.textContent = 'No issues reported.';
        systemCard.appendChild(empty);
        return;

    }

    issues.slice().reverse().forEach(function(issue) {

        const item = document.createElement('div');
        item.className = 'error-item';

        item.innerHTML =
            '<h4>' + issue.title + '</h4>' +
            '<p>Reported by ' + issue.reporter + '</p>' +
            '<span>' + issue.time + '</span>';

        systemCard.appendChild(item);

    });

}


// ── SUBMIT ISSUE FORM ─────────────────────────────────────

function setupIssueForm() {

    const submitBtn = document.querySelector('.issue-card button');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', function() {

        const nameInput  = document.querySelector('.issue-card input[type="text"]');
        const emailInput = document.querySelector('.issue-card input[type="email"]');
        const typeSelect = document.querySelector('.issue-card select');
        const descArea   = document.querySelector('.issue-card textarea');
        const urgentBox  = document.querySelector('.urgent-check input[type="checkbox"]');

        const name    = nameInput.value.trim();
        const email   = emailInput.value.trim();
        const type    = typeSelect.value;
        const desc    = descArea.value.trim();
        const urgent  = urgentBox.checked;

        // Validate
        if (!name) {
            showMessage('Please enter your name.', 'error');
            return;
        }

        if (!email) {
            showMessage('Please enter your email address.', 'error');
            return;
        }

        if (type === 'Select issue type') {
            showMessage('Please select an issue type.', 'error');
            return;
        }

        if (!desc) {
            showMessage('Please describe the problem.', 'error');
            return;
        }

        // Build issue title
        const title = type + (urgent ? ' (URGENT)' : '');

        const now = new Date();
        let hours = now.getHours();
        const mins = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const timeString = 'Today • ' + hours + ':' + mins + ' ' + ampm;

        const newIssue = {
            id: nextIssueId++,
            title: title,
            reporter: name,
            time: timeString
        };

        issues.push(newIssue);
        renderIssueQueue();

        // Clear the form
        nameInput.value   = '';
        emailInput.value  = '';
        typeSelect.value  = 'Select issue type';
        descArea.value    = '';
        urgentBox.checked = false;

        showMessage('Issue reported successfully. Thank you!', 'success');

    });

}


// ── HELPERS ───────────────────────────────────────────────

function showMessage(text, type) {

    const existing = document.querySelector('.js-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.className = 'js-message';
    msg.textContent = text;

    msg.style.cssText =
        'position:fixed; bottom:30px; left:50%; transform:translateX(-50%);' +
        'padding:14px 28px; border-radius:14px; font-weight:700; font-size:15px;' +
        'font-family:Montserrat,sans-serif; z-index:9999; transition:opacity 0.4s;' +
        (type === 'success'
            ? 'background:#8bc53f; color:white;'
            : 'background:#d12c2c; color:white;');

    document.body.appendChild(msg);

    setTimeout(function() {
        msg.style.opacity = '0';
        setTimeout(function() { msg.remove(); }, 400);
    }, 2500);

}
