// ============================================================
//  SHAD Portal — Reports & Concerns
//  Handles: submit report form, recent reports list
// ============================================================


// ── REPORTS DATA ──────────────────────────────────────────
// Existing reports. When you connect Firebase this will
// come from the database.

let reports = [
    {
        id: 1,
        student: 'Sarah Johnson',
        types: ['Late Arrival'],
        notes: 'Late Arrival • Breakfast Check-In',
        time: 'Today • 8:14 AM'
    },
    {
        id: 2,
        student: 'Alex Brown',
        types: ['Attendance'],
        notes: 'Attendance Concern • Missing From Lecture',
        time: 'Today • 10:22 AM'
    },
    {
        id: 3,
        student: 'Emily Patel',
        types: ['Wellness'],
        notes: 'Wellness • Requested Support',
        time: 'Yesterday • 9:05 PM'
    },
];

let nextReportId = 4;


// ── ON PAGE LOAD ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

    renderReports();
    setupReportForm();

});


// ── RENDER RECENT REPORTS ─────────────────────────────────

function renderReports() {

    const recentCard = document.querySelector('.recent-card');

    // Keep the heading, remove old items
    const oldItems = recentCard.querySelectorAll('.report-item');
    oldItems.forEach(function(item) { item.remove(); });

    if (reports.length === 0) {

        const empty = document.createElement('p');
        empty.style.cssText = 'color:#888; padding:20px 0; font-size:15px;';
        empty.textContent = 'No reports submitted yet.';
        recentCard.appendChild(empty);
        return;

    }

    // Show newest first
    const sorted = reports.slice().reverse();

    sorted.forEach(function(report) {

        const item = document.createElement('div');
        item.className = 'report-item';

        item.innerHTML =
            '<h4>' + report.student + '</h4>' +
            '<p>' + report.notes + '</p>' +
            '<span>' + report.time + '</span>';

        recentCard.appendChild(item);

    });

}


// ── SUBMIT REPORT FORM ────────────────────────────────────

function setupReportForm() {

    const submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', function() {

        const studentSelect = document.querySelector('.report-card select');
        const notesTextarea = document.querySelector('.report-card textarea');
        const checkboxes    = document.querySelectorAll('.check-item input[type="checkbox"]');

        const student = studentSelect.value;
        const notes   = notesTextarea.value.trim();

        // Get selected issue types
        const selectedTypes = [];
        checkboxes.forEach(function(checkbox) {
            if (checkbox.checked) {
                selectedTypes.push(checkbox.parentElement.textContent.trim());
            }
        });

        // Validate
        if (student === 'Select from database') {
            showMessage('Please select a student.', 'error');
            return;
        }

        if (selectedTypes.length === 0) {
            showMessage('Please select at least one issue type.', 'error');
            return;
        }

        if (!notes) {
            showMessage('Please add detailed notes before submitting.', 'error');
            return;
        }

        // Build the report
        const now = new Date();
        const timeString = 'Today • ' + formatTime(now);

        const newReport = {
            id: nextReportId++,
            student: student,
            types: selectedTypes,
            notes: selectedTypes.join(', ') + ' • ' + notes.slice(0, 60) + (notes.length > 60 ? '...' : ''),
            time: timeString
        };

        reports.push(newReport);
        renderReports();

        // Clear the form
        studentSelect.value    = 'Select from database';
        notesTextarea.value    = '';
        checkboxes.forEach(function(cb) { cb.checked = false; });

        showMessage('Report submitted for ' + student + '.', 'success');

    });

}


// ── HELPERS ───────────────────────────────────────────────

function formatTime(date) {

    let hours   = date.getHours();
    const mins  = date.getMinutes().toString().padStart(2, '0');
    const ampm  = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return hours + ':' + mins + ' ' + ampm;

}

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
