// ============================================================
//  SHAD Portal — Reports & Concerns
//  Uses ShadDB for student list and report persistence.
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    populateStudentDropdown();
    renderReports();
    setupReportForm();
});

function populateStudentDropdown() {
    var select   = document.getElementById('reportStudentSelect');
    if (!select) return;
    var students = ShadDB.getStudents();
    select.innerHTML = '<option value="">— Select a student —</option>';
    students.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = s.name + ' (' + s.group + ')';
        select.appendChild(opt);
    });
    if (students.length === 0) {
        select.innerHTML = '<option value="">No students loaded — import a CSV on the Students page</option>';
    }
}

function renderReports() {
    var listEl = document.getElementById('recentReportsList');
    if (!listEl) return;
    listEl.innerHTML = '';
    var reports = ShadDB.getReports();
    if (reports.length === 0) {
        listEl.innerHTML = '<p style="color:#888;padding:20px 0;font-size:15px;">No reports submitted yet.</p>';
        return;
    }
    var sorted = reports.slice().reverse();
    sorted.forEach(function(report) {
        var item = document.createElement('div');
        item.className = 'report-item';
        item.innerHTML =
            '<h4>' + esc(report.student) + '</h4>' +
            '<p>' + esc(report.notes) + '</p>' +
            '<span>' + esc(report.time) + '</span>';
        listEl.appendChild(item);
    });
}

function setupReportForm() {
    var submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;
    submitBtn.addEventListener('click', function() {
        var studentSelect = document.getElementById('reportStudentSelect');
        var notesInput    = document.getElementById('reportNotes');
        var checkboxes    = document.querySelectorAll('.check-item input[type="checkbox"]');

        var student = studentSelect ? studentSelect.value : '';
        var notes   = notesInput ? notesInput.value.trim() : '';

        var selectedTypes = [];
        checkboxes.forEach(function(cb) {
            if (cb.checked) selectedTypes.push(cb.value);
        });

        if (!student) { showMessage('Please select a student.', 'error'); return; }
        if (selectedTypes.length === 0) { showMessage('Please select at least one issue type.', 'error'); return; }
        if (!notes) { showMessage('Please add detailed notes before submitting.', 'error'); return; }

        ShadDB.addReport({
            student: student,
            types: selectedTypes,
            notes: selectedTypes.join(', ') + ' \u2022 ' + notes.slice(0, 80) + (notes.length > 80 ? '...' : ''),
        });

        renderReports();

        studentSelect.value = '';
        notesInput.value    = '';
        checkboxes.forEach(function(cb) { cb.checked = false; });

        showMessage('Report submitted for ' + student + '.', 'success');
    });
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showMessage(text, type) {
    var existing = document.querySelector('.js-message');
    if (existing) existing.remove();
    var msg = document.createElement('div');
    msg.className = 'js-message';
    msg.textContent = text;
    msg.style.cssText =
        'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);' +
        'padding:14px 28px;border-radius:14px;font-weight:700;font-size:15px;' +
        'font-family:Montserrat,sans-serif;z-index:9999;transition:opacity 0.4s;' +
        (type === 'success' ? 'background:#8bc53f;color:white;' : 'background:#d12c2c;color:white;');
    document.body.appendChild(msg);
    setTimeout(function() {
        msg.style.opacity = '0';
        setTimeout(function() { msg.remove(); }, 400);
    }, 2500);
}
