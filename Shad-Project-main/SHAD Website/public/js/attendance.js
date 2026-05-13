// ============================================================
//  SHAD Portal — Attendance
//  Handles: student roster, check-in, missing list, search
// ============================================================


// ── STUDENT DATA ──────────────────────────────────────────
// This is your roster. Add or remove students here.
// When you connect Firebase this data will come from the database instead.

let students = [
    { id: 1,  name: 'Sarah Johnson',  group: 'Blue',   checkedIn: false },
    { id: 2,  name: 'Michael Chen',   group: 'Blue',   checkedIn: false },
    { id: 3,  name: 'Emily Patel',    group: 'Red',    checkedIn: false },
    { id: 4,  name: 'Alex Brown',     group: 'Red',    checkedIn: false },
    { id: 5,  name: 'Lucy Green',     group: 'Yellow', checkedIn: false },
    { id: 6,  name: 'Jason Kim',      group: 'Yellow', checkedIn: false },
    { id: 7,  name: 'Priya Sharma',   group: 'Blue',   checkedIn: false },
    { id: 8,  name: 'Marcus Davis',   group: 'Red',    checkedIn: false },
    { id: 9,  name: 'Chloe Martin',   group: 'Yellow', checkedIn: false },
    { id: 10, name: 'Jordan Taylor',  group: 'Blue',   checkedIn: false },
];

let recentScans = [];


// ── ON PAGE LOAD ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

    renderMissingList();
    updateCounter();
    setupManualEntry();
    setupSubmitButton();

});


// ── RENDER MISSING LIST ───────────────────────────────────
// Shows all students who have NOT checked in yet

function renderMissingList() {

    const missingCard = document.querySelector('.missing-card');
    const missing = students.filter(function(s) { return !s.checkedIn; });

    // Update the count badge
    const countBadge = missingCard.querySelector('.missing-head span');
    countBadge.textContent = missing.length + ' Missing';

    // Clear existing rows (keep the heading)
    const existingRows = missingCard.querySelectorAll('.student-missing');
    existingRows.forEach(function(row) { row.remove(); });

    // Rebuild the list
    if (missing.length === 0) {

        const allDone = document.createElement('p');
        allDone.style.color = '#8bc53f';
        allDone.style.fontWeight = '700';
        allDone.style.padding = '20px 0';
        allDone.textContent = 'All students checked in!';
        missingCard.appendChild(allDone);

    } else {

        missing.forEach(function(student) {

            const row = document.createElement('div');
            row.className = 'student-missing';
            row.setAttribute('data-id', student.id);

            const initial = student.name.charAt(0);

            row.innerHTML =
                '<div class="avatar">' + initial + '</div>' +
                '<div class="student-info">' +
                    '<h4>' + student.name + '</h4>' +
                    '<p>Group ' + student.group + '</p>' +
                '</div>' +
                '<a href="students.html">View Profile</a>';

            missingCard.appendChild(row);

        });

    }

}


// ── UPDATE COUNTER ────────────────────────────────────────
// Updates the checked-in count in the page header

function updateCounter() {

    const checkedInCount = students.filter(function(s) { return s.checkedIn; }).length;
    const total = students.length;

    // Update the submit button text to show progress
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.textContent = checkedInCount + ' / ' + total + ' Checked In';
    }

}


// ── CHECK IN A STUDENT ────────────────────────────────────
// Marks a student as checked in and adds them to recent scans

function checkInStudent(name) {

    // Find the student by name (case insensitive)
    const student = students.find(function(s) {
        return s.name.toLowerCase() === name.toLowerCase().trim();
    });

    if (!student) {
        showMessage('Student "' + name + '" not found in roster.', 'error');
        return;
    }

    if (student.checkedIn) {
        showMessage(student.name + ' is already checked in.', 'error');
        return;
    }

    // Mark as checked in
    student.checkedIn = true;

    // Add to recent scans list
    addRecentScan(student.name);

    // Refresh the page
    renderMissingList();
    updateCounter();

    showMessage(student.name + ' checked in successfully!', 'success');

}


// ── RECENT SCANS ──────────────────────────────────────────
// Adds a name to the "Recently Checked In" list at the top

function addRecentScan(name) {

    const time = getCurrentTime();

    // Add to our tracking array
    recentScans.unshift({ name: name, time: time });

    // Keep only the last 5
    if (recentScans.length > 5) {
        recentScans = recentScans.slice(0, 5);
    }

    // Rebuild the recent scans section
    const recentSection = document.querySelector('.recent-scans');
    const heading = recentSection.querySelector('h4');

    // Clear old rows
    const oldRows = recentSection.querySelectorAll('.scan-row');
    oldRows.forEach(function(row) { row.remove(); });

    // Add updated rows
    recentScans.forEach(function(scan) {

        const row = document.createElement('div');
        row.className = 'scan-row';
        row.innerHTML =
            '<span>' + scan.name + '</span>' +
            '<small>' + scan.time + '</small>';

        recentSection.appendChild(row);

    });

}


// ── MANUAL ENTRY ──────────────────────────────────────────
// Handles the text input + Add Student button

function setupManualEntry() {

    const input = document.querySelector('.manual-entry input');
    const button = document.querySelector('.manual-entry button');

    if (!input || !button) return;

    // Click the button
    button.addEventListener('click', function() {

        const name = input.value.trim();

        if (name === '') {
            showMessage('Please enter a student name.', 'error');
            return;
        }

        checkInStudent(name);
        input.value = '';

    });

    // Press Enter in the input field
    input.addEventListener('keydown', function(e) {

        if (e.key === 'Enter') {
            button.click();
        }

    });

}


// ── SUBMIT ATTENDANCE ─────────────────────────────────────
// Locks in the final attendance for the session

function setupSubmitButton() {

    const submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', function(e) {

        e.preventDefault();

        const checkedIn = students.filter(function(s) { return s.checkedIn; }).length;
        const missing   = students.filter(function(s) { return !s.checkedIn; }).length;

        const confirmed = confirm(
            'Submit attendance?\n\n' +
            'Checked In: ' + checkedIn + '\n' +
            'Missing: ' + missing + '\n\n' +
            'This will save the current attendance record.'
        );

        if (confirmed) {
            showMessage('Attendance submitted! ' + checkedIn + ' present, ' + missing + ' absent.', 'success');
        }

    });

}


// ── HELPERS ───────────────────────────────────────────────

function getCurrentTime() {

    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    if (hours === 0) hours = 12;

    return hours + ':' + minutes + ' ' + ampm;

}

function showMessage(text, type) {

    // Remove any existing message
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
