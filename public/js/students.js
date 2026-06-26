// ============================================================
//  SHAD Portal — Students Hub
//  Uses ShadDB (db.js) for all persistence.
//  QR scanning via jsQR library loaded from CDN.
// ============================================================

// ── STATE ─────────────────────────────────────────────────
let editingStudentId    = null;
let editingObsId        = null;
let acknowledgingObsId  = null;
let qrStream            = null;
let qrAnimFrame         = null;
let committeeAssignments = {}; // name → committee_name
let committeeOptions     = []; // [{id, name, type}]

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupHubNavigation();
    setupHamburgerMenu();
    setupAddStudentBtn();
    refreshAll();

    var printAllBtn = el('printAllQRBtn');
    if (printAllBtn) {
        printAllBtn.addEventListener('click', function() {
            printStudentQR(ShadDB.getStudents());
        });
    }

    var rcDlAllBtn = el('rcDownloadAllBtn');
    if (rcDlAllBtn) rcDlAllBtn.addEventListener('click', rcDownloadAll);

    setupStudentControls();
    setupDietarySearch();
    setupStudentEditForm();
    setupObservationToggle();
    setupObservationForm();
    setupObservationControls();
    setupObservationBehaviourPicker();
    setupObservationCSVDownload();
    setupAcknowledgementModal();
    setupMedicationTracking();
    setupAttendance();
    setupQRScanners();
    setupPanelToggles();
});

// Collapse/expand the hub panels (alerts, lists, checklists). Each panel
// starts collapsed and waits to be opened; clicking the toggle hides/shows the
// panel body and swaps the −/+ glyph.
function setupPanelToggles() {
    document.querySelectorAll('.panel-toggle').forEach(function(btn) {
        var header = btn.closest('.card-header');
        var body   = header.nextElementSibling;

        function setCollapsed(collapsed) {
            body.classList.toggle('collapsed', collapsed);
            header.classList.toggle('collapsed-header', collapsed);
            btn.textContent = collapsed ? '+' : '−';
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            btn.title = collapsed ? 'Expand' : 'Collapse';
        }

        btn.addEventListener('click', function() {
            setCollapsed(!body.classList.contains('collapsed'));
        });

        // Panels with data-start-expanded="true" open on load; all others start closed
        setCollapsed(btn.dataset.startExpanded !== 'true');
    });
}

function refreshAll() {
    committeeAssignments = ShadDB.getCommitteeAssignments();
    committeeOptions     = ShadDB.getCommitteeOptions();
    loadStats();
    populateTeamDropdowns();
    displayStudents(ShadDB.getStudents());
    displayAttendanceAlerts();
    displayObservations();
    displayObsLeaderboard();
    loadObservationStudentDropdown();
    displayDietaryList();
}

// ── NAV & MENU ────────────────────────────────────────────
// Clean URL hashes for each hub sub-screen so the hub can be deep-linked
// (e.g. students.html#observations) — lets other pages and the top nav fold
// straight into a sub-page instead of needing separate standalone pages.
const SCREEN_HASHES = {
    hubHome:                'home',
    studentsScreen:         'students',
    medicationsScreen:      'medications',
    attendanceScreen:       'attendance',
    activityRollCallScreen: 'activity-roll-call',
    observationsScreen:     'observations',
    dietaryScreen:          'dietary',
    morningRecScreen:       'morning-rec',
    committeesScreen:       'committees',
    electivesScreen:        'electives'
};

function activateScreen(screenId) {
    if (!document.getElementById(screenId)) screenId = 'activityRollCallScreen';
    document.querySelectorAll('.hub-nav').forEach(function(b) {
        b.classList.toggle('active', b.dataset.screen === screenId);
    });
    document.querySelectorAll('.hub-screen').forEach(function(s) {
        s.classList.toggle('active', s.id === screenId);
    });
    if (screenId !== 'attendanceScreen') stopQRScanner();

    // Load screen-specific data whenever a screen is activated (covers both
    // initial page load and nav-button clicks, so history is never stuck on "Loading...")
    if (screenId === 'activityRollCallScreen') {
        if (typeof rcLoadToday === 'function') rcLoadToday();
        if (typeof rcLoadFullHistory === 'function') rcLoadFullHistory();
    }
    if (screenId === 'observationsScreen') {
        if (typeof displayObservations === 'function') displayObservations();
    }
}

// Resolve a screen id from the current URL hash. Accepts either the clean
// name (#observations) or the raw screen id (#observationsScreen).
function screenIdFromHash() {
    var h = (window.location.hash || '').replace('#', '');
    if (!h) return 'activityRollCallScreen';
    for (var id in SCREEN_HASHES) {
        if (SCREEN_HASHES[id] === h || id === h) return id;
    }
    return 'activityRollCallScreen';
}

function setupHubNavigation() {
    document.querySelectorAll('.hub-nav').forEach(function(button) {
        button.addEventListener('click', function() {
            var target = button.dataset.screen;
            window.location.hash = SCREEN_HASHES[target] || '';
            activateScreen(target);
        });
    });
    // React to back/forward and to deep links pasted into the address bar
    window.addEventListener('hashchange', function() {
        activateScreen(screenIdFromHash());
    });
    // Honour a deep-link hash on initial load (defaults to the hub home)
    activateScreen(screenIdFromHash());
}

function setupHamburgerMenu() {
    const menuBtn = document.getElementById('hubMenuBtn');
    const sidebar = document.getElementById('hubSidebar');
    if (!menuBtn || !sidebar) return;
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
}

// ── STATS ─────────────────────────────────────────────────
function loadStats() {
    const stats = ShadDB.getDashboardStats();
    el('studentCount').textContent     = stats.totalStudents;
    el('presentCount').textContent     = stats.checkedIn;
    el('missingCount').textContent     = stats.missing;
    el('observationCount').textContent = stats.observationCount;
}


// ── ADD STUDENT ───────────────────────────────────────────
function setupAddStudentBtn() {
    const addBtn = document.querySelector('#studentsScreen .add-btn');
    if (!addBtn) return;
    addBtn.addEventListener('click', e => {
        e.preventDefault();
        editingStudentId = null;
        clearEditForm();
        const card = document.getElementById('studentFormCard');
        card.querySelector('h3').textContent = 'Add Student';
        card.classList.remove('hidden');
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function clearEditForm() {
    ['editStudentName','editStudentPronouns','editStudentHouseTeam','editStudentDesignTeam',
     'editStudentReqTeam','editStudentRoomNumber','editStudentAge','editStudentInstrument',
     'editStudentDietary','editStudentNote'].forEach(function(id) {
        var e2 = document.getElementById(id);
        if (e2) e2.value = '';
    });
    populateCommitteeDropdown('');
}

// ── COMMITTEE DROPDOWN ────────────────────────────────────
function populateCommitteeDropdown(selectedName) {
    var sel = el('editStudentCommittee');
    if (!sel) return;
    sel.innerHTML = '<option value="">— No committee assigned —</option>';
    committeeOptions.forEach(function(c) {
        var opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name + (c.type ? ' (' + c.type + ')' : '');
        if (c.name === selectedName) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ── STUDENT LIST ──────────────────────────────────────────
function displayStudents(studentArray) {
    const list = el('studentList');
    if (!list) return;
    list.innerHTML = '';
    if (studentArray.length === 0) {
        list.innerHTML = '<p class="student-info" style="padding:20px 0;">No students yet. Import a CSV or add students manually.</p>';
        return;
    }
    const attendance = ShadDB.getTodayAttendance();
    studentArray.forEach(function(student) {
        const checkedIn   = attendance[student.id] && attendance[student.id].checkedIn;
        const statusText  = checkedIn ? 'Present' : 'Not Checked In';
        const statusClass = checkedIn ? 'present' : 'missing';
        const committee   = committeeAssignments[student.name] || '';

        var teams = [];
        if (student.houseTeam)  teams.push('House: ' + student.houseTeam);
        if (student.designTeam) teams.push('Design: ' + student.designTeam);
        if (student.reqTeam)    teams.push('Rec: ' + student.reqTeam);

        const row = document.createElement('div');
        row.classList.add('student-row');
        row.innerHTML =
            '<div>' +
                '<p class="student-name">' + esc(student.name) + '</p>' +
                '<p class="student-info">' + esc(student.pronouns) + (student.age ? ' \u2022 Age ' + esc(student.age) : '') + '</p>' +
                (student.roomNumber ? '<p class="student-info">\ud83d\udeaa Room ' + esc(student.roomNumber) + '</p>' : '') +
                (teams.length ? '<p class="student-info">' + esc(teams.join(' \u2022 ')) + '</p>' : '') +
                (committee ? '<p class="student-info">Committee: <strong>' + esc(committee) + '</strong></p>' : '') +
                (student.instrument ? '<p class="student-info">Instrument: ' + esc(student.instrument) + '</p>' : '') +
                (student.note ? '<p class="student-info">' + esc(student.note) + '</p>' : '') +
            '</div>' +
            '<div class="student-actions">' +
                '<span class="status ' + statusClass + '">' + statusText + '</span>' +
                '<button class="print-qr-btn">\ud83d\udda8 QR</button>' +
                '<button class="edit-student-btn">Edit</button>' +
                '<button class="delete-student-btn">\u2715</button>' +
            '</div>';
        row.querySelector('.print-qr-btn').addEventListener('click', function() { printStudentQR([student]); });
        row.querySelector('.edit-student-btn').addEventListener('click', function() { editStudent(student.id); });
        row.querySelector('.delete-student-btn').addEventListener('click', function() {
            if (confirm('Remove ' + student.name + ' from the list?')) {
                ShadDB.deleteStudent(student.id);
                refreshAll();
            }
        });
        list.appendChild(row);
    });
}

// ── QR CODE PRINTING ──────────────────────────────────────
// Isabelle
function printStudentQR(students) {
    if (!students.length) { alert('No students to print.'); return; }

    // Generate QR codes off-screen in the parent window where qrcodejs is already loaded
    var scratch = document.createElement('div');
    scratch.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(scratch);

    var cards = students.map(function(s) {
        var wrapper = document.createElement('div');
        scratch.appendChild(wrapper);
        new QRCode(wrapper, { text: 'SHAD_STUDENT:' + s.id, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
        var canvas = wrapper.querySelector('canvas');
        var dataUrl = canvas ? canvas.toDataURL() : '';
        return { student: s, dataUrl: dataUrl };
    });

    document.body.removeChild(scratch);

    var cardHTML = cards.map(function(card) {
        var s = card.student;
        var sub = s.group || s.houseTeam || s.Group || '';
        // Use preferred name if available, fall back to stored display name
        var displayName = (s.prefName && s.lastName)
            ? s.prefName + ' ' + s.lastName
            : s.name;
        return '<div class="qr-card">' +
            '<div class="qr-header">SHAD 2026</div>' +
            (card.dataUrl ? '<img src="' + card.dataUrl + '" class="qr-img">' : '') +
            '<p class="qr-name">' + esc(displayName) + '</p>' +
            (sub ? '<p class="qr-sub">' + esc(sub) + '</p>' : '') +
            '</div>';
    }).join('');

    var win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print QR codes.'); return; }
    win.document.write(
        '<!DOCTYPE html><html><head><title>SHAD 2026 — QR Codes</title>' +
        '<style>' +
            '*{box-sizing:border-box;margin:0;padding:0;}' +
            'body{font-family:Arial,sans-serif;background:#fff;padding:0.25in;}' +
            '.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}' +
            '.toolbar h2{font-size:16px;}' +
            '.print-btn{padding:10px 22px;background:#146ff8;color:white;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;}' +
            '.qr-grid{display:flex;flex-wrap:wrap;gap:0;}' +
            /* Each badge: 2.5in wide × 3.5in tall, dotted cut border */
            '.qr-card{' +
                'width:2.5in;height:3.5in;min-width:2.5in;max-width:2.5in;min-height:3.5in;max-height:3.5in;' +
                'border:1.5px dashed #aaa;overflow:hidden;' +
                'display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;' +
                'padding:0.15in;' +
                'page-break-inside:avoid;break-inside:avoid;' +
            '}' +
            '.qr-header{font-size:11px;font-weight:700;letter-spacing:1.5px;color:#146ff8;text-transform:uppercase;margin-bottom:8px;flex-shrink:0;}' +
            '.qr-img{width:1.8in;height:1.8in;display:block;flex-shrink:0;}' +
            '.qr-name{font-weight:700;font-size:13px;margin-top:10px;text-align:center;word-break:break-word;line-height:1.3;flex-shrink:0;}' +
            '.qr-sub{font-size:10px;color:#888;margin-top:4px;text-align:center;flex-shrink:0;}' +
            '@media print{' +
                'body{padding:0.25in;}' +
                '.toolbar{display:none!important;}' +
                /* Fit 3 badges across a standard letter page (8.5in − 0.5in margins = 8in ÷ 2.5in = 3) */
                '.qr-grid{width:7.5in;}' +
            '}' +
        '</style></head><body>' +
        '<div class="toolbar">' +
            '<h2>SHAD 2026 — Student QR Badges &nbsp;<span style="font-weight:400;color:#888;font-size:13px;">Cut along dotted lines</span></h2>' +
            '<button class="print-btn" onclick="window.print()">🖨 Print</button>' +
        '</div>' +
        '<div class="qr-grid">' + cardHTML + '</div>' +
        '</body></html>'
    );
    win.document.close();
}

function setupStudentControls() {
    var search = el('studentSearch');
    if (search) search.addEventListener('input', filterStudents);
    var dSel = el('filterDesignTeam'), rSel = el('filterReqTeam'), hSel = el('filterHouseTeam');
    if (dSel) dSel.addEventListener('change', filterStudents);
    if (rSel) rSel.addEventListener('change', filterStudents);
    if (hSel) hSel.addEventListener('change', filterStudents);
}

// Populate the three team dropdowns from current student data
function populateTeamDropdowns() {
    var students = ShadDB.getStudents();
    var design = {}, req = {}, house = {};
    students.forEach(function(s) {
        if (s.designTeam) design[s.designTeam] = 1;
        if (s.reqTeam)    req[s.reqTeam]       = 1;
        if (s.houseTeam)  house[s.houseTeam]   = 1;
    });
    function fill(id, map, label) {
        var sel = el(id);
        if (!sel) return;
        var current = sel.value;
        sel.innerHTML = '<option value="">All ' + label + 's</option>';
        Object.keys(map).sort().forEach(function(name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            sel.appendChild(opt);
        });
        // Restore previous selection if it still exists
        if (current && map[current]) sel.value = current;
    }
    fill('filterDesignTeam', design, 'Design Team');
    fill('filterReqTeam',    req,    'Rec Team');
    fill('filterHouseTeam',  house,  'House Team');
}

function filterStudents() {
    var search  = (el('studentSearch')    || {}).value || '';
    var design  = (el('filterDesignTeam') || {}).value || '';
    var req     = (el('filterReqTeam')    || {}).value || '';
    var house   = (el('filterHouseTeam')  || {}).value || '';
    var s2 = search.toLowerCase();
    var filtered = ShadDB.getStudents().filter(function(s) {
        var nameMatch   = !s2     || s.name.toLowerCase().includes(s2);
        var designMatch = !design || (s.designTeam || '') === design;
        var reqMatch    = !req    || (s.reqTeam    || '') === req;
        var houseMatch  = !house  || (s.houseTeam  || '') === house;
        return nameMatch && designMatch && reqMatch && houseMatch;
    });
    displayStudents(filtered);
}

function editStudent(id) {
    var student = ShadDB.getStudents().find(function(s) { return s.id === id; });
    if (!student) return;
    editingStudentId = id;
    var card = el('studentFormCard');
    card.querySelector('h3').textContent = 'Edit Student';
    el('editStudentName').value        = student.name;
    el('editStudentPronouns').value    = student.pronouns;
    el('editStudentHouseTeam').value   = student.houseTeam  || student.group || '';
    el('editStudentDesignTeam').value  = student.designTeam || '';
    el('editStudentReqTeam').value     = student.reqTeam    || '';
    el('editStudentRoomNumber').value  = student.roomNumber || '';
    el('editStudentAge').value         = student.age;
    el('editStudentInstrument').value  = student.instrument;
    el('editStudentDietary').value     = student.dietary;
    el('editStudentNote').value        = student.note;
    populateCommitteeDropdown(committeeAssignments[student.name] || '');
    card.classList.remove('hidden');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupStudentEditForm() {
    var saveBtn = el('saveStudentEditBtn'), cancelBtn = el('cancelStudentEditBtn'), formCard = el('studentFormCard');
    if (!saveBtn || !cancelBtn || !formCard) return;
    saveBtn.addEventListener('click', function() {
        var name       = el('editStudentName').value.trim();
        var pronouns   = el('editStudentPronouns').value.trim();
        var houseTeam  = el('editStudentHouseTeam').value.trim();
        var designTeam = el('editStudentDesignTeam').value.trim();
        var reqTeam    = el('editStudentReqTeam').value.trim();
        var roomNumber = el('editStudentRoomNumber') ? el('editStudentRoomNumber').value.trim() : '';
        var age        = el('editStudentAge').value;
        var instrument = el('editStudentInstrument').value.trim();
        var dietary    = el('editStudentDietary').value.trim();
        var note       = el('editStudentNote').value.trim();
        var committee  = el('editStudentCommittee') ? el('editStudentCommittee').value : '';
        if (!name) {
            alert('Please fill in the student name.');
            return;
        }
        var studentData = { name: name, pronouns: pronouns, houseTeam: houseTeam,
                            designTeam: designTeam, reqTeam: reqTeam, roomNumber: roomNumber,
                            age: age, instrument: instrument, dietary: dietary, note: note };
        if (editingStudentId !== null) {
            ShadDB.updateStudent(editingStudentId, studentData);
            // Save committee assignment if changed
            var prevCommittee = committeeAssignments[name] || '';
            if (committee && committee !== prevCommittee) {
                ShadDB.assignCommittee(name, committee, '');
            } else if (!committee && prevCommittee) {
                ShadDB.unassignCommittee(name);
            }
        } else {
            var newStudent = ShadDB.addStudent(studentData);
            if (committee && newStudent && newStudent.name) {
                ShadDB.assignCommittee(newStudent.name, committee, '');
            }
        }
        editingStudentId = null;
        formCard.classList.add('hidden');
        refreshAll();
    });
    cancelBtn.addEventListener('click', function() {
        editingStudentId = null;
        formCard.classList.add('hidden');
    });
}

// ── ATTENDANCE (Morning / Evening Sessions) ───────────────
// State
var attCurrentSession = 'morning';  // 'morning' | 'evening'
var attActiveRecord = null;         // the current in-memory attendance map {studentId: {checkedIn, time}}
var attRecentScans = [];
var attSessionActive = false;       // true while a session is open for editing
var attEditingDate = null;          // null = today; string = reopened past session date

function todayFmt() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function fmtTime(isoOrNow) {
    var d = isoOrNow ? new Date(isoOrNow) : new Date();
    var h = d.getHours(), m = d.getMinutes().toString().padStart(2,'0');
    var ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
}

function fmtDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso.replace(' ','T') + (iso.includes('Z') ? '' : 'Z'));
    if (isNaN(d)) d = new Date(iso);
    return d.toLocaleDateString('en-CA', {month:'short',day:'numeric'}) + ' ' + fmtTime(d);
}

function setupAttendance() {
    attSelectSession('morning');
    attLoadHistory();
    var attDlAllBtn = el('attDownloadAllBtn');
    if (attDlAllBtn) attDlAllBtn.addEventListener('click', attDownloadAll);
    // Manual entry wiring
    var input = el('manualStudentInput'), btn = el('manualStudentBtn');
    if (input && btn) {
        btn.addEventListener('click', function() {
            var name = input.value.trim();
            if (!name) return;
            attCheckInByName(name);
            input.value = '';
        });
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') btn.click(); });
    }
    // Date label
    var dateEl = el('attSessionDate');
    if (dateEl) {
        var d = new Date();
        dateEl.textContent = d.toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'});
    }
}

window.attSelectSession = function(type) {
    attCurrentSession = type;
    el('attTabMorning').classList.toggle('active', type === 'morning');
    el('attTabEvening').classList.toggle('active', type === 'evening');
    var labelEl = el('attSessionLabel');
    if (labelEl) labelEl.textContent = type === 'morning' ? 'Morning Check-In' : 'Evening Check-In';
    // Check if a session already exists for today
    attLoadOrShowSession();
};

function attLoadOrShowSession() {
    fetch('/api/attendance-sessions?date=' + todayFmt() + '&type=' + attCurrentSession)
        .then(function(r) { return r.json(); })
        .then(function(rows) {
            if (rows && rows.length > 0) {
                // Session exists — load it as editable
                attActiveRecord = rows[0].students_json || {};
                attSessionActive = true;
                attShowActive();
                attRefreshMissingList();
                attUpdateSubmitBtn();
            } else {
                // No session yet — show start button
                attSessionActive = false;
                attHideActive();
            }
        }).catch(function() { attHideActive(); });
}

window.attStartSession = function() {
    var today = todayFmt();
    attActiveRecord = {};
    attSessionActive = true;
    // Save the empty session to reserve it
    fetch('/api/attendance-sessions', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ session_date: today, session_type: attCurrentSession, students_json: {} })
    }).then(function() {
        attShowActive();
        attRefreshMissingList();
        attUpdateSubmitBtn();
        showMsg((attCurrentSession === 'morning' ? 'Morning' : 'Evening') + ' session started!', 'success');
    }).catch(function() { showMsg('Failed to start session.', 'error'); });
};

window.attSubmitSession = function() {
    var students = ShadDB.getStudents();
    var checkedIn = Object.values(attActiveRecord).filter(function(v) { return v && v.checkedIn; }).length;
    if (attEditingDate) {
        // Saving a reopened past session — no confirm needed, just save and close edit mode
        attSaveSession(function() {
            showMsg('Session updated!', 'success');
            attCloseEditMode();
        });
        return;
    }
    if (!confirm('Submit ' + (attCurrentSession === 'morning' ? 'morning' : 'evening') + ' attendance?\n\nChecked In: ' + checkedIn + '\nNot checked in: ' + (students.length - checkedIn))) return;
    attSaveSession(function() {
        showMsg('Attendance submitted! ' + checkedIn + '/' + students.length + ' present.', 'success');
        attLoadHistory();
    });
};

function attSaveSession(callback) {
    var dateToSave = attEditingDate || todayFmt();
    fetch('/api/attendance-sessions', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ session_date: dateToSave, session_type: attCurrentSession, students_json: attActiveRecord })
    }).then(function() { if (callback) callback(); }).catch(function() { showMsg('Save failed.', 'error'); });
}

function attShowActive() {
    el('attActivePanel').classList.remove('hidden');
    el('attNoSession').classList.add('hidden');
    el('attStartBtn').classList.add('hidden');
    el('attSubmitBtn').classList.remove('hidden');
}

function attHideActive() {
    el('attActivePanel').classList.add('hidden');
    el('attNoSession').classList.remove('hidden');
    el('attStartBtn').classList.remove('hidden');
    el('attSubmitBtn').classList.add('hidden');
    el('recentScansList').innerHTML = '';
    attRecentScans = [];
}

function attUpdateSubmitBtn() {
    var students = ShadDB.getStudents();
    var checkedIn = Object.values(attActiveRecord).filter(function(v) { return v && v.checkedIn; }).length;
    var btn = el('attSubmitBtn');
    if (!btn) return;
    if (attEditingDate) {
        btn.textContent = '✓ Save Changes (' + checkedIn + '/' + students.length + ')';
        btn.style.background = '#f39c12';
    } else {
        btn.textContent = '✓ Submit (' + checkedIn + '/' + students.length + ')';
        btn.style.background = '';
    }
}

window.attReopenSession = function(session) {
    if (attEditingDate && attEditingDate !== session.session_date) {
        if (!confirm('You are already editing a session. Switch to ' + session.session_date + ' ' + session.session_type + '?')) return;
    }
    // Switch tab to match the session type
    attCurrentSession = session.session_type;
    el('attTabMorning').classList.toggle('active', session.session_type === 'morning');
    el('attTabEvening').classList.toggle('active', session.session_type === 'evening');

    attEditingDate = session.session_date;
    attActiveRecord = session.students_json || {};
    attSessionActive = true;
    attShowActive();
    attRefreshMissingList();
    attUpdateSubmitBtn();

    // Update labels to show which historical session is being edited
    var labelEl = el('attSessionLabel');
    if (labelEl) labelEl.textContent = (session.session_type === 'morning' ? 'Morning' : 'Evening') + ' — Editing';
    var dateEl = el('attSessionDate');
    if (dateEl) dateEl.textContent = session.session_date;

    // Show a "Back to Today" button if not already present
    var backBtn = el('attBackTodayBtn');
    if (!backBtn) {
        backBtn = document.createElement('button');
        backBtn.id = 'attBackTodayBtn';
        backBtn.textContent = '← Back to Today';
        backBtn.style.cssText = 'margin-left:10px;padding:6px 14px;background:#f0f0f0;color:#555;border:none;border-radius:8px;font-family:\'Archivo\',sans-serif;font-size:13px;font-weight:700;cursor:pointer;';
        backBtn.addEventListener('click', attCloseEditMode);
        var submitBtn = el('attSubmitBtn');
        if (submitBtn && submitBtn.parentNode) submitBtn.parentNode.insertBefore(backBtn, submitBtn.nextSibling);
    }
    backBtn.style.display = 'inline-block';
    showMsg('Editing ' + session.session_date + ' ' + session.session_type + ' session.', 'success');
};

function attCloseEditMode() {
    attEditingDate = null;
    // Remove the back button
    var backBtn = el('attBackTodayBtn');
    if (backBtn) backBtn.style.display = 'none';
    // Restore today's session for the current tab
    attLoadHistory();
    attLoadOrShowSession();
    // Restore the label
    var labelEl = el('attSessionLabel');
    if (labelEl) labelEl.textContent = attCurrentSession === 'morning' ? 'Morning Check-In' : 'Evening Check-In';
    var dateEl = el('attSessionDate');
    if (dateEl) {
        var d = new Date();
        dateEl.textContent = d.toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'});
    }
    var btn = el('attSubmitBtn');
    if (btn) btn.style.background = '';
}

function attCheckInByName(name) {
    var student = ShadDB.getStudents().find(function(s) { return s.name.toLowerCase() === name.toLowerCase(); });
    if (!student) { showMsg('"' + name + '" not found in roster.', 'error'); return; }
    if (attActiveRecord[student.id] && attActiveRecord[student.id].checkedIn) {
        showMsg(student.name + ' already checked in.', 'error'); return;
    }
    attActiveRecord[student.id] = { checkedIn: true, time: new Date().toISOString() };
    attSaveSession(null);
    attAddRecentScan(student.name);
    attRefreshMissingList();
    attUpdateSubmitBtn();
    // Also update the main attendance so the dashboard counters work
    ShadDB.checkInStudent(student.id);
    refreshAll();
    showMsg(student.name + ' checked in!', 'success');
}

function attAddRecentScan(name) {
    attRecentScans.unshift({ name: name, time: fmtTime() });
    if (attRecentScans.length > 8) attRecentScans = attRecentScans.slice(0, 8);
    var list = el('recentScansList');
    if (!list) return;
    list.innerHTML = '';
    attRecentScans.forEach(function(scan) {
        var row = document.createElement('div');
        row.className = 'scan-row';
        row.innerHTML = '<span>' + esc(scan.name) + '</span><small>' + scan.time + '</small>';
        list.appendChild(row);
    });
}

function attRefreshMissingList() {
    var missingList = el('missingStudentsList'), badge = el('missingBadge');
    if (!missingList) return;
    var students = ShadDB.getStudents();
    var missing = students.filter(function(s) {
        return !(attActiveRecord[s.id] && attActiveRecord[s.id].checkedIn);
    });
    if (badge) badge.textContent = missing.length + ' Missing';
    missingList.innerHTML = '';
    if (missing.length === 0) {
        missingList.innerHTML = '<p style="color:#8bc53f;font-weight:700;padding:20px 0;">All students checked in!</p>';
        return;
    }
    missing.forEach(function(student) {
        var row = document.createElement('div');
        row.className = 'student-missing';
        row.innerHTML = '<div class="avatar">' + esc(student.name.charAt(0)) + '</div>' +
            '<div class="student-info"><h4>' + esc(student.name) + '</h4><p>' + esc(student.group) + '</p></div>' +
            '<button style="cursor:pointer;border:none;background:#8bc53f;color:white;padding:6px 14px;border-radius:8px;font-weight:700;font-family:inherit;">Check In</button>';
        row.querySelector('button').addEventListener('click', function() {
            attCheckInByName(student.name);
        });
        missingList.appendChild(row);
    });
}

function attLoadHistory() {
    var histList = el('attHistoryList');
    if (!histList) return;
    fetch('/api/attendance-sessions')
        .then(function(r) { return r.json(); })
        .then(function(rows) {
            if (!rows || rows.length === 0) {
                histList.innerHTML = '<p style="color:#aaa;font-size:13px;font-weight:600;">No sessions recorded yet.</p>';
                return;
            }
            histList.innerHTML = '';
            rows.forEach(function(session) {
                var checkedIn = session.checked_in_count || 0;
                var total = session.total_count || 0;
                var pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
                var typeLabel = session.session_type === 'morning' ? '🌅 Morning' : '🌙 Evening';
                var row = document.createElement('div');
                row.style.cssText = 'padding:14px 0;border-bottom:1px solid #f1f1f1;display:flex;align-items:center;gap:16px;flex-wrap:wrap;';
                row.innerHTML =
                    '<span style="font-size:13px;font-weight:800;color:#146ff8;min-width:90px;">' + typeLabel + '</span>' +
                    '<span style="font-size:13px;font-weight:700;color:#555;">' + session.session_date + '</span>' +
                    '<span style="font-size:13px;font-weight:700;color:#111;">' + checkedIn + ' / ' + total + ' present</span>' +
                    '<div style="flex:1;height:6px;background:#f0f0f0;border-radius:99px;overflow:hidden;min-width:80px;">' +
                    '<div style="height:100%;width:' + pct + '%;background:#8bc53f;border-radius:99px;"></div></div>' +
                    '<span style="font-size:12px;color:#aaa;font-weight:600;">' + fmtDateTime(session.submitted_at) + '</span>';
                var captured = session;
                var editBtn = document.createElement('button');
                editBtn.textContent = '✎ Edit';
                editBtn.style.cssText = 'padding:5px 12px;background:#f39c12;color:white;border:none;border-radius:8px;font-family:\'Archivo\',sans-serif;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;';
                editBtn.addEventListener('click', function() { attReopenSession(captured); });
                row.appendChild(editBtn);
                var dlBtn = document.createElement('button');
                dlBtn.textContent = '⬇ CSV';
                dlBtn.style.cssText = 'padding:5px 12px;background:#0693e3;color:white;border:none;border-radius:8px;font-family:\'Archivo\',sans-serif;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;';
                dlBtn.addEventListener('click', function() { attDownloadSession(captured); });
                row.appendChild(dlBtn);
                histList.appendChild(row);
            });
        }).catch(function() { if (histList) histList.innerHTML = '<p style="color:#e74c3c;font-size:13px;">Failed to load history.</p>'; });
}

function attDownloadSession(session) {
    var students = ShadDB.getStudents();
    var typeLabel = session.session_type === 'morning' ? 'Morning' : 'Evening';
    var rows = [['Student Name', 'Status', 'Check-In Time']];
    students.forEach(function(s) {
        var record = (session.students_json || {})[s.id];
        var status = (record && record.checkedIn) ? 'Present' : 'Not Checked In';
        var time = (record && record.time) ? new Date(record.time).toLocaleTimeString('en-CA', {hour:'numeric', minute:'2-digit', hour12:true}) : '';
        rows.push([s.name, status, time]);
    });
    downloadCSV(rows, 'attendance_' + session.session_date + '_' + typeLabel.toLowerCase() + '.csv');
}

function attDownloadAll() {
    fetch('/api/attendance-sessions')
        .then(function(r) { return r.json(); })
        .then(function(sessions) {
            if (!sessions || sessions.length === 0) { showMsg('No sessions to download.', 'error'); return; }
            var students = ShadDB.getStudents();
            var rows = [['Date', 'Session Type', 'Student Name', 'Status', 'Check-In Time']];
            sessions.forEach(function(session) {
                var typeLabel = session.session_type === 'morning' ? 'Morning' : 'Evening';
                students.forEach(function(s) {
                    var record = (session.students_json || {})[s.id];
                    var status = (record && record.checkedIn) ? 'Present' : 'Not Checked In';
                    var time = (record && record.time) ? new Date(record.time).toLocaleTimeString('en-CA', {hour:'numeric', minute:'2-digit', hour12:true}) : '';
                    rows.push([session.session_date, typeLabel, s.name, status, time]);
                });
            });
            downloadCSV(rows, 'attendance_all.csv');
        })
        .catch(function() { showMsg('Failed to download attendance data.', 'error'); });
}

function renderMissingStudents() {
    // Legacy function still called by refreshAll for the dashboard alerts
    attRefreshMissingList();
}

function updateAttendanceCounter() {
    // Legacy no-op — counter now lives in the submit button
}

function setupManualAttendanceEntry() { /* replaced by setupAttendance */ }
function setupAttendanceSubmitButton() { /* replaced by setupAttendance */ }

function displayAttendanceAlerts() {
    var alertBox = el('attendanceAlerts');
    if (!alertBox) return;
    var students = ShadDB.getStudents(), attendance = ShadDB.getTodayAttendance();
    var missing = students.filter(function(s) { return !(attendance[s.id] && attendance[s.id].checkedIn); });
    alertBox.innerHTML = '';
    if (missing.length === 0) {
        alertBox.innerHTML = '<p class="student-info" style="padding:12px 0;">All students checked in today.</p>';
        return;
    }
    missing.forEach(function(student) {
        var row = document.createElement('div');
        row.classList.add('observation-row', 'negative');
        row.innerHTML =
            '<div class="acknowledge-box"><input type="checkbox" class="acknowledge-check" title="Check in to clear this alert"></div>' +
            '<div class="observation-main-info">' +
                '<p class="student-name">' + esc(student.name) + ' \u2014 not yet checked in</p>' +
                '<p class="student-info">' + esc(student.group) + '</p>' +
            '</div>' +
            '<div class="observation-actions">' +
                '<span class="status missing">Alert</span>' +
            '</div>';
        row.querySelector('.acknowledge-check').addEventListener('change', function() {
            ShadDB.checkInStudent(student.id);
            refreshAll();
        });
        alertBox.appendChild(row);
    });
}

// ── QR SCANNERS (Attendance + Roll Call) ─────────────────
// We have two scanner boxes: one in attendance (#qrScannerBox or .scanner-box inside #attActivePanel)
// and one in roll call (#rcScannerBox). Each gets its own camera state.

var qrStreams = {}; // keyed by 'att' and 'rc'
var qrAnimFrames = {};

function setupQRScanners() {
    setupOneScanner('att', document.querySelector('#attActivePanel .scanner-box'), function(name) {
        attCheckInByName(name);
    });
    setupOneScanner('rc', el('rcScannerBox'), function(name) {
        rcCheckInByName(name);
    });
}

function setupOneScanner(key, scannerBox, onCheckIn) {
    if (!scannerBox) return;
    var statusId = 'qrStatus_' + key, videoId = 'qrVideo_' + key, canvasId = 'qrCanvas_' + key;
    var startBtnId = 'startQRBtn_' + key, stopBtnId = 'stopQRBtn_' + key;
    scannerBox.innerHTML =
        '<div id="' + statusId + '" style="text-align:center;padding:8px 0;font-size:13px;color:#888;">Camera not started</div>' +
        '<video id="' + videoId + '" style="width:100%;border-radius:12px;display:none;background:#000;" autoplay muted playsinline></video>' +
        '<canvas id="' + canvasId + '" style="display:none;"></canvas>' +
        '<button id="' + startBtnId + '" style="margin-top:auto;width:100%;padding:14px;background:#6f2da8;color:white;border:none;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;">📷 Scan QR</button>' +
        '<button id="' + stopBtnId + '" style="margin-top:8px;width:100%;padding:12px;background:#e5e5e5;color:#444;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;display:none;font-family:inherit;">Stop Camera</button>';
    el(startBtnId).addEventListener('click', function() { startOneScanner(key, onCheckIn); });
    el(stopBtnId).addEventListener('click', function() { stopOneScanner(key); });
}

function startOneScanner(key, onCheckIn) {
    var statusId = 'qrStatus_' + key, videoId = 'qrVideo_' + key, canvasId = 'qrCanvas_' + key;
    var startBtnId = 'startQRBtn_' + key, stopBtnId = 'stopQRBtn_' + key;
    var video = el(videoId), canvas = el(canvasId), status = el(statusId);
    if (!video || !canvas) return;

    function doStart() {
        status.textContent = 'Requesting camera…';
        status.style.color = '#f58220';
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            status.textContent = '⚠️ Camera unavailable. The page must be served over HTTPS or accessed from localhost.';
            status.style.color = '#d12c2c';
            var startBtn = el(startBtnId), stopBtn = el(stopBtnId);
            if (startBtn) startBtn.style.display = 'block';
            if (stopBtn)  stopBtn.style.display  = 'none';
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function(stream) {
            qrStreams[key] = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            video.closest('.scanner-box').classList.add('scanning');
            el(startBtnId).style.display = 'none';
            el(stopBtnId).style.display  = 'block';
            status.textContent = '🟢 Scanning…';
            status.style.color = '#8bc53f';
            video.addEventListener('loadedmetadata', function() {
                canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                scanQRFrameKey(key, video, canvas, status, onCheckIn);
            });
        }).catch(function(err) {
            status.textContent = '⚠️ ' + (err.name === 'NotAllowedError' ? 'Camera permission denied.' : err.message);
            status.style.color = '#d12c2c';
        });
    }

    if (typeof jsQR === 'undefined') {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        s.onload = doStart;
        s.onerror = function() { status.textContent = 'Failed to load QR library.'; };
        document.head.appendChild(s);
    } else { doStart(); }
}

function scanQRFrameKey(key, video, canvas, status, onCheckIn) {
    var ctx = canvas.getContext('2d');
    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            var code = jsQR(ctx.getImageData(0,0,canvas.width,canvas.height).data, canvas.width, canvas.height, { inversionAttempts:'dontInvert' });
            if (code) {
                handleQRData(code.data, status, key, onCheckIn);
                return;
            }
        }
        qrAnimFrames[key] = requestAnimationFrame(tick);
    }
    qrAnimFrames[key] = requestAnimationFrame(tick);
}

function handleQRData(data, status, key, onCheckIn) {
    var student = null;
    if (data.startsWith('SHAD_STUDENT:')) {
        var idStr = data.replace('SHAD_STUDENT:', '').trim();
        student = ShadDB.getStudents().find(function(s) { return String(s.id) === idStr; });
    }
    if (!student) {
        student = ShadDB.getStudents().find(function(s) { return s.name.toLowerCase() === data.trim().toLowerCase(); });
    }
    if (student) {
        status.textContent = '✅ Scanned: ' + student.name;
        status.style.color = '#8bc53f';
        onCheckIn(student.name);
    } else {
        status.textContent = '❓ Unknown QR: ' + data.slice(0,30);
        status.style.color = '#d12c2c';
    }
    cancelAnimationFrame(qrAnimFrames[key]);
    setTimeout(function() {
        var v = el('qrVideo_' + key), c = el('qrCanvas_' + key);
        if (v && qrStreams[key] && qrStreams[key].active) {
            status.textContent = '🟢 Scanning…'; status.style.color = '#8bc53f';
            scanQRFrameKey(key, v, c, status, onCheckIn);
        }
    }, 2000);
}

function stopOneScanner(key) {
    cancelAnimationFrame(qrAnimFrames[key]); qrAnimFrames[key] = null;
    var stream = qrStreams[key];
    if (stream) { stream.getTracks().forEach(function(t) { t.stop(); }); qrStreams[key] = null; }
    var video = el('qrVideo_' + key), status = el('qrStatus_' + key);
    if (video) { video.style.display = 'none'; video.srcObject = null; video.closest('.scanner-box')?.classList.remove('scanning'); }
    if (status) { status.textContent = 'Camera stopped.'; status.style.color = '#888'; }
    var start = el('startQRBtn_' + key), stop = el('stopQRBtn_' + key);
    if (start) start.style.display = 'block';
    if (stop)  stop.style.display  = 'none';
}

function stopQRScanner() {
    // Legacy — stop both
    stopOneScanner('att');
    stopOneScanner('rc');
    if (qrStream) { qrStream.getTracks().forEach(function(t) { t.stop(); }); qrStream = null; }
}

// ── ACTIVITY ROLL CALL ────────────────────────────────────
var rcActiveId = null;      // ID of the open roll call row in the DB
var rcRecord = {};          // {studentId: {checkedIn, time}}
var rcRecentScans = [];
var rcNumber = 0;

window.rcStartNew = function() {
    fetch('/api/activity-rollcall/start', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ label: '' })
    }).then(function(r) {
        if (!r.ok) return r.json().then(function(d) { showMsg(d.error || 'Cannot start roll call.', 'error'); throw new Error(); });
        return r.json();
    }).then(function(row) {
        rcActiveId = row.id;
        rcRecord = {};
        rcNumber = row.checkin_number;
        rcRecentScans = [];
        el('rcActiveLabel').textContent = 'Roll Call #' + rcNumber;
        var now = new Date();
        el('rcActiveTime').textContent = now.toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'}) + ' · ' + fmtTime(now);
        el('rcActivePanel').classList.remove('hidden');
        el('rcNoActive').classList.add('hidden');
        el('startRollCallBtn').textContent = '+ New Roll Call';
        rcRefreshMissing();
        rcUpdateProgress();
        rcLoadToday();
        // wire up manual input
        var input = el('rcManualInput');
        if (input) {
            input.onkeydown = function(e) { if (e.key === 'Enter') rcCheckInByName(); };
        }
        // Setup scanner for roll call
        setupOneScanner('rc', el('rcScannerBox'), function(name) { rcCheckInByName(name); });
        showMsg('Roll Call #' + rcNumber + ' started!', 'success');
    }).catch(function() {});
};

window.rcCheckInByName = function(nameArg) {
    var name = nameArg || (el('rcManualInput') ? el('rcManualInput').value.trim() : '');
    if (!name) return;
    if (el('rcManualInput') && !nameArg) el('rcManualInput').value = '';
    if (!rcActiveId) { showMsg('No active roll call.', 'error'); return; }
    var student = ShadDB.getStudents().find(function(s) { return s.name.toLowerCase() === name.toLowerCase(); });
    if (!student) { showMsg('"' + name + '" not found in roster.', 'error'); return; }
    if (rcRecord[student.id] && rcRecord[student.id].checkedIn) {
        showMsg(student.name + ' already checked in.', 'error'); return;
    }
    rcRecord[student.id] = { checkedIn: true, time: new Date().toISOString() };
    rcSaveActive(null);
    rcAddRecentScan(student.name);
    rcRefreshMissing();
    rcUpdateProgress();
    showMsg(student.name + ' checked in!', 'success');
};

// Re-open a previously submitted roll call for editing
window.rcReopenRollCall = function(id, studentsJson, number) {
    if (rcActiveId && rcActiveId !== id) {
        if (!confirm('You have an active roll call in progress. Reopen Roll Call #' + number + ' instead?')) return;
        stopOneScanner('rc');
    }
    fetch('/api/activity-rollcall/' + id, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ students_json: studentsJson, reopen: true })
    }).then(function(r) { return r.json(); })
    .then(function(row) {
        rcActiveId = row.id;
        rcRecord = row.students_json || {};
        rcNumber = row.checkin_number;
        rcRecentScans = [];
        el('rcActiveLabel').textContent = 'Roll Call #' + rcNumber + ' (Editing)';
        var now = new Date();
        el('rcActiveTime').textContent = 'Reopened · ' + fmtTime(now);
        el('rcActivePanel').classList.remove('hidden');
        el('rcNoActive').classList.add('hidden');
        rcRefreshMissing();
        rcUpdateProgress();
        rcLoadToday();
        setupOneScanner('rc', el('rcScannerBox'), function(name) { rcCheckInByName(name); });
        showMsg('Roll Call #' + rcNumber + ' reopened for editing.', 'success');
    }).catch(function() { showMsg('Failed to reopen roll call.', 'error'); });
};

window.rcSubmit = function() {
    if (!rcActiveId) return;
    var students = ShadDB.getStudents();
    var checkedIn = Object.values(rcRecord).filter(function(v) { return v && v.checkedIn; }).length;
    if (!confirm('Submit Roll Call #' + rcNumber + '?\n\nChecked In: ' + checkedIn + ' / ' + students.length)) return;
    fetch('/api/activity-rollcall/' + rcActiveId, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ students_json: rcRecord, submitted: true })
    }).then(function() {
        var missing = students.filter(function(s) { return !(rcRecord[s.id] && rcRecord[s.id].checkedIn); });
        // Isabelle
        var date = new Date().toLocaleDateString('en-CA');
        var obsPromises = missing.map(function(s) {
            return fetch('/api/observations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student: s.name,
                    type: 'Attendance',
                    mood: 'neutral',
                    details: 'Not checked in at Activity Roll Call #' + rcNumber + ' on ' + date + '.',
                    acknowledged: false,
                    acknowledgementNote: ''
                })
            });
        });
        return Promise.all(obsPromises);
    }).then(function() {
        showMsg('Roll Call #' + rcNumber + ' submitted!', 'success');
        stopOneScanner('rc');
        rcActiveId = null;
        rcRecord = {};
        el('rcActivePanel').classList.add('hidden');
        el('rcNoActive').classList.remove('hidden');
        rcLoadToday();
    }).catch(function(e) { console.error('Roll call submit error:', e); showMsg('Save failed.', 'error'); });
};

function rcSaveActive(callback) {
    if (!rcActiveId) return;
    fetch('/api/activity-rollcall/' + rcActiveId, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ students_json: rcRecord })
    }).then(function() { if (callback) callback(); }).catch(function() {});
}

function rcRefreshMissing() {
    var missingList = el('rcMissingList'), badge = el('rcMissingBadge');
    if (!missingList) return;
    var students = ShadDB.getStudents();
    var missing = students.filter(function(s) { return !(rcRecord[s.id] && rcRecord[s.id].checkedIn); });
    if (badge) badge.textContent = missing.length + ' Missing';
    missingList.innerHTML = '';
    if (missing.length === 0) {
        missingList.innerHTML = '<p style="color:#8bc53f;font-weight:700;padding:20px 0;">All students accounted for!</p>';
        return;
    }
    missing.forEach(function(student) {
        var row = document.createElement('div');
        row.className = 'student-missing';
        row.innerHTML = '<div class="avatar">' + esc(student.name.charAt(0)) + '</div>' +
            '<div class="student-info"><h4>' + esc(student.name) + '</h4><p>' + esc(student.group) + '</p></div>' +
            '<button style="cursor:pointer;border:none;background:#8bc53f;color:white;padding:6px 14px;border-radius:8px;font-weight:700;font-family:inherit;">Check In</button>';
        row.querySelector('button').addEventListener('click', function() { rcCheckInByName(student.name); });
        missingList.appendChild(row);
    });
}

function rcAddRecentScan(name) {
    rcRecentScans.unshift({ name: name, time: fmtTime() });
    if (rcRecentScans.length > 8) rcRecentScans = rcRecentScans.slice(0,8);
    var list = el('rcRecentList');
    if (!list) return;
    list.innerHTML = '';
    rcRecentScans.forEach(function(scan) {
        var row = document.createElement('div');
        row.className = 'scan-row';
        row.innerHTML = '<span>' + esc(scan.name) + '</span><small>' + scan.time + '</small>';
        list.appendChild(row);
    });
}

function rcUpdateProgress() {
    var students = ShadDB.getStudents();
    var checkedIn = Object.values(rcRecord).filter(function(v) { return v && v.checkedIn; }).length;
    var badge = el('rcProgressBadge');
    if (badge) badge.textContent = checkedIn + ' / ' + students.length;
}

function rcLoadToday() {
    var todayList = el('rcTodayList'), badge = el('rcTodayBadge');
    if (!todayList) return;
    fetch('/api/activity-rollcall')
        .then(function(r) { return r.json(); })
        .then(function(rows) {
            if (badge) { badge.textContent = rows.length; badge.style.display = rows.length ? 'inline' : 'none'; }
            if (rows.length === 0) {
                todayList.innerHTML = '<p style="color:#aaa;font-size:13px;font-weight:600;padding:12px 0;">No roll calls today.</p>';
                return;
            }
            var students = ShadDB.getStudents();
            todayList.innerHTML = '';
            rows.forEach(function(row) {
                var checkedIn = Object.values(row.students_json || {}).filter(function(v) { return v && v.checkedIn; }).length;
                var pct = students.length > 0 ? Math.round((checkedIn / students.length) * 100) : 0;
                var isActive = row.id === rcActiveId;
                var card = document.createElement('div');
                card.style.cssText = 'padding:14px 0;border-bottom:1px solid #f1f1f1;display:flex;align-items:center;gap:14px;flex-wrap:wrap;';
                var statusBadge = row.submitted_at
                    ? '<span style="font-size:11px;font-weight:700;color:#00c87a;background:#e8fff4;padding:3px 9px;border-radius:20px;">✓ Submitted</span>'
                    : '<span style="font-size:11px;font-weight:700;color:#f39c12;background:#fff8e8;padding:3px 9px;border-radius:20px;">' + (isActive ? '● Active' : '○ In Progress') + '</span>';
                card.innerHTML =
                    '<span style="font-size:13px;font-weight:800;color:#146ff8;min-width:90px;">Roll Call #' + row.checkin_number + '</span>' +
                    '<span style="font-size:13px;font-weight:700;color:#111;">' + checkedIn + ' / ' + students.length + ' present</span>' +
                    '<div style="flex:1;height:6px;background:#f0f0f0;border-radius:99px;overflow:hidden;min-width:60px;">' +
                    '<div style="height:100%;width:' + pct + '%;background:#8bc53f;border-radius:99px;"></div></div>' +
                    statusBadge +
                    '<span style="font-size:12px;color:#aaa;font-weight:600;">' + fmtDateTime(row.started_at) + '</span>';
                if (row.submitted_at && !isActive) {
                    var editBtn = document.createElement('button');
                    editBtn.textContent = 'Edit';
                    editBtn.style.cssText = 'padding:5px 12px;background:#146ff8;color:white;border:none;border-radius:8px;font-family:\'Archivo\',sans-serif;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;';
                    var capturedRow = row;
                    editBtn.addEventListener('click', function() {
                        rcReopenRollCall(capturedRow.id, capturedRow.students_json || {}, capturedRow.checkin_number);
                    });
                    card.appendChild(editBtn);
                }
                var dlBtn = document.createElement('button');
                dlBtn.textContent = '⬇ CSV';
                dlBtn.style.cssText = 'padding:5px 12px;background:#0693e3;color:white;border:none;border-radius:8px;font-family:\'Archivo\',sans-serif;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;';
                var capturedForDl = row;
                dlBtn.addEventListener('click', function() { rcDownloadSession(capturedForDl); });
                card.appendChild(dlBtn);
                todayList.appendChild(card);
            });
            // Update the "new roll call" button
            var btn = el('startRollCallBtn');
            if (btn) {
                var canStart = rows.length < 6 && !rows.find(function(r) { return !r.submitted_at && r.id !== rcActiveId; });
                btn.disabled = rows.length >= 6;
                btn.style.opacity = rows.length >= 6 ? '0.4' : '1';
                btn.title = rows.length >= 6 ? 'Maximum 6 roll calls per day reached' : '';
            }
        }).catch(function() {});
}

function rcLoadFullHistory() {
    var histList = el('rcHistoryList');
    if (!histList) return;
    fetch('/api/activity-rollcall?all=1')
        .then(function(r) { return r.json(); })
        .then(function(rows) {
            if (!rows || rows.length === 0) {
                histList.innerHTML = '<p style="color:#aaa;font-size:13px;font-weight:600;padding:12px 0;">No roll calls recorded yet.</p>';
                return;
            }
            var students = ShadDB.getStudents();
            histList.innerHTML = '';
            // Group by date
            var byDate = {};
            rows.forEach(function(row) { var d = row.checkin_date; if (!byDate[d]) byDate[d] = []; byDate[d].push(row); });
            Object.keys(byDate).sort().reverse().forEach(function(date) {
                var dateHeader = document.createElement('div');
                dateHeader.style.cssText = 'font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#146ff8;padding:16px 0 8px;';
                var d = new Date(date + 'T12:00:00');
                dateHeader.textContent = d.toLocaleDateString('en-CA', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
                histList.appendChild(dateHeader);
                byDate[date].forEach(function(row) {
                    var checkedIn = Object.values(row.students_json || {}).filter(function(v) { return v && v.checkedIn; }).length;
                    var total = students.length;
                    var pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
                    var card = document.createElement('div');
                    card.style.cssText = 'padding:12px 0;border-bottom:1px solid #f1f1f1;display:flex;align-items:center;gap:14px;flex-wrap:wrap;';
                    card.innerHTML =
                        '<span style="font-size:13px;font-weight:800;color:#111;min-width:100px;">Roll Call #' + row.checkin_number + '</span>' +
                        '<span style="font-size:13px;font-weight:700;color:#111;">' + checkedIn + ' / ' + total + ' present</span>' +
                        '<div style="flex:1;height:6px;background:#f0f0f0;border-radius:99px;overflow:hidden;min-width:60px;">' +
                        '<div style="height:100%;width:' + pct + '%;background:#8bc53f;border-radius:99px;"></div></div>' +
                        '<span style="font-size:11px;font-weight:700;color:' + (row.submitted_at ? '#00c87a' : '#f39c12') + ';background:' + (row.submitted_at ? '#e8fff4' : '#fff8e8') + ';padding:3px 9px;border-radius:20px;">' +
                        (row.submitted_at ? '✓ Submitted' : '○ In Progress') + '</span>' +
                        '<span style="font-size:12px;color:#aaa;font-weight:600;">' + fmtDateTime(row.started_at) + '</span>';
                    var dlBtn = document.createElement('button');
                    dlBtn.textContent = '⬇ CSV';
                    dlBtn.style.cssText = 'padding:5px 12px;background:#0693e3;color:white;border:none;border-radius:8px;font-family:\'Archivo\',sans-serif;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;';
                    var capturedRow = row;
                    dlBtn.addEventListener('click', function() { rcDownloadSession(capturedRow); });
                    card.appendChild(dlBtn);
                    histList.appendChild(card);
                });
            });
        })
        .catch(function() { if (el('rcHistoryList')) el('rcHistoryList').innerHTML = '<p style="color:#e74c3c;font-size:13px;padding:12px 0;">Failed to load history.</p>'; });
}

function rcDownloadSession(rollcall) {
    var students = ShadDB.getStudents();
    var rows = [['Student Name', 'Status', 'Check-In Time']];
    students.forEach(function(s) {
        var record = (rollcall.students_json || {})[s.id];
        var status = (record && record.checkedIn) ? 'Present' : 'Not Checked In';
        var time = (record && record.time) ? new Date(record.time).toLocaleTimeString('en-CA', {hour:'numeric', minute:'2-digit', hour12:true}) : '';
        rows.push([s.name, status, time]);
    });
    downloadCSV(rows, 'rollcall_' + rollcall.checkin_date + '_' + rollcall.checkin_number + '.csv');
}

function rcDownloadAll() {
    fetch('/api/activity-rollcall?all=1')
        .then(function(r) { return r.json(); })
        .then(function(rollcalls) {
            if (!rollcalls || rollcalls.length === 0) { showMsg('No roll calls to download.', 'error'); return; }
            var students = ShadDB.getStudents();
            var rows = [['Date', 'Roll Call #', 'Student Name', 'Status', 'Check-In Time']];
            rollcalls.forEach(function(rc) {
                students.forEach(function(s) {
                    var record = (rc.students_json || {})[s.id];
                    var status = (record && record.checkedIn) ? 'Present' : 'Not Checked In';
                    var time = (record && record.time) ? new Date(record.time).toLocaleTimeString('en-CA', {hour:'numeric', minute:'2-digit', hour12:true}) : '';
                    rows.push([rc.checkin_date, 'Roll Call #' + rc.checkin_number, s.name, status, time]);
                });
            });
            downloadCSV(rows, 'rollcall_all.csv');
        })
        .catch(function() { showMsg('Failed to download roll call data.', 'error'); });
}




// ── MEDICATION TRACKING ───────────────────────────────────
// Medications tab: full tracking UI
function setupMedicationTracking() {
    var newBtn    = el('newMedLogBtn');
    var formCard  = el('medLogFormCard');
    var saveBtn   = el('saveMedLogBtn');
    var cancelBtn = el('cancelMedLogBtn');
    var searchEl  = el('medLogSearch');
    var studentEl = el('medLogStudent');

    if (newBtn) {
        newBtn.addEventListener('click', function() {
            var now = new Date();
            var offset = now.getTimezoneOffset() * 60000;
            el('medLogDateTime').value = new Date(now - offset).toISOString().slice(0, 16);
            medPopulateDatalist();
            formCard.classList.remove('hidden');
            formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            formCard.classList.add('hidden');
            medClearForm();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', medSaveLog);
    }

    // Auto-fill medication from student profile when a known student is chosen
    if (studentEl) {
        studentEl.addEventListener('input', function() {
            var name = this.value.trim();
            var student = ShadDB.getStudents().find(function(s) { return s.name === name; });
            if (student && student.medication && student.medication.toLowerCase() !== 'none') {
                var medEl = el('medLogMedication');
                if (medEl && !medEl.value) medEl.value = student.medication;
            }
        });
    }

    if (searchEl) {
        searchEl.addEventListener('input', function() {
            medLoadLogs(this.value.trim());
        });
    }

    // Reload log when switching to the medications tab
    document.querySelectorAll('.hub-nav').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (this.dataset.screen === 'medicationsScreen') {
                medPopulateDatalist();
                medLoadLogs((el('medLogSearch') || {}).value || '');
            }
        });
    });

    medLoadLogs('');
}

function medPopulateDatalist() {
    var datalist = el('medStudentDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    ShadDB.getStudents().forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.name;
        datalist.appendChild(opt);
    });
}

function medClearForm() {
    ['medLogStudent', 'medLogMedication', 'medLogDateTime', 'medLogNotes'].forEach(function(id) {
        var e2 = el(id);
        if (e2) e2.value = '';
    });
}

function medSaveLog() {
    var student    = ((el('medLogStudent')    || {}).value || '').trim();
    var medication = ((el('medLogMedication') || {}).value || '').trim();
    var dateTime   = ((el('medLogDateTime')   || {}).value || '');
    var notes      = ((el('medLogNotes')      || {}).value || '').trim();

    if (!student || !medication || !dateTime) {
        alert('Please fill in Student, Medication, and Date & Time.');
        return;
    }

    fetch('/api/medication-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            student_name:    student,
            medication:      medication,
            administered_at: dateTime,
            notes:           notes
        })
    }).then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.error) { showMsg(data.error, 'error'); return; }
        el('medLogFormCard').classList.add('hidden');
        medClearForm();
        medLoadLogs((el('medLogSearch') || {}).value || '');
        showMsg('Medication logged!', 'success');
    })
    .catch(function() { showMsg('Failed to save entry.', 'error'); });
}

function medLoadLogs(search) {
    var url = '/api/medication-logs';
    if (search) url += '?student=' + encodeURIComponent(search);
    var list = el('medicationLogList');
    if (!list) return;
    list.innerHTML = '<p class="student-info" style="color:#aaa;font-size:13px;">Loading…</p>';
    fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(logs) { medDisplayLogs(logs); })
        .catch(function() {
            list.innerHTML = '<p class="student-info" style="color:#d12c2c;">Failed to load entries.</p>';
        });
}

function medDisplayLogs(logs) {
    var list = el('medicationLogList');
    if (!list) return;
    list.innerHTML = '';
    if (logs.length === 0) {
        list.innerHTML = '<p class="student-info" style="padding:20px 0;">No medication entries yet. Click “+ Add New” to log one.</p>';
        return;
    }
    logs.forEach(function(log) {
        var dateStr = '';
        if (log.administered_at) {
            var d = new Date(log.administered_at.replace('T', ' '));
            if (isNaN(d)) d = new Date(log.administered_at);
            if (!isNaN(d)) {
                dateStr = d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
                          ' · ' +
                          d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
            }
        }
        var row = document.createElement('div');
        row.classList.add('student-row');
        row.innerHTML =
            '<div>' +
                '<p class="student-name">' + esc(log.student_name) + '</p>' +
                '<p class="student-info">' + esc(log.medication) + '</p>' +
                (log.notes ? '<p class="student-info">' + esc(log.notes) + '</p>' : '') +
            '</div>' +
            '<div class="student-actions">' +
                '<span class="student-info" style="font-size:12px;color:#aaa;text-align:right;">' + esc(dateStr) + '</span>' +
                '<button class="delete-student-btn" title="Remove entry">✕</button>' +
            '</div>';
        row.querySelector('.delete-student-btn').addEventListener('click', function() {
            if (confirm('Remove this medication log entry?')) {
                fetch('/api/medication-logs/' + log.id, { method: 'DELETE' })
                    .then(function() {
                        medLoadLogs((el('medLogSearch') || {}).value || '');
                        showMsg('Entry removed.', 'success');
                    })
                    .catch(function() { showMsg('Failed to remove entry.', 'error'); });
            }
        });
        list.appendChild(row);
    });
}

// ── DIETARY ───────────────────────────────────────────────
var DIETARY_TYPES = [
    { label: 'Epipen',       keywords: ['epipen'] },
    { label: 'Nut Allergy',  keywords: ['nut', 'peanut', 'tree nut'] },
    { label: 'Allergy',      keywords: ['allerg'] },
    { label: 'Gluten-Free',  keywords: ['gluten', 'celiac'] },
    { label: 'Dairy-Free',   keywords: ['dairy', 'lactose', 'milk'] },
    { label: 'Shellfish',    keywords: ['shellfish', 'seafood', 'shrimp', 'lobster', 'crab'] },
    { label: 'Egg',          keywords: ['egg'] },
    { label: 'Soy',          keywords: ['soy'] },
    { label: 'Vegetarian',   keywords: ['vegetarian'] },
    { label: 'Vegan',        keywords: ['vegan'] },
    { label: 'Halal',        keywords: ['halal'] },
    { label: 'Kosher',       keywords: ['kosher'] },
];

function displayDietaryList() {
    var list = el('dietaryList');
    if (!list) return;
    list.innerHTML = '';

    var allStudents = ShadDB.getStudents().filter(function(s) {
        return s.dietary && s.dietary.toLowerCase() !== 'none';
    });

    // Summary box \u2014 always based on full list, not filtered
    if (allStudents.length > 0) {
        var counts = {};
        var matchedStudents = new Set();

        allStudents.forEach(function(s) {
            var d = s.dietary.toLowerCase();
            var matched = false;
            DIETARY_TYPES.forEach(function(type) {
                if (type.keywords.some(function(k) { return d.includes(k); })) {
                    counts[type.label] = (counts[type.label] || 0) + 1;
                    matched = true;
                }
            });
            if (matched) matchedStudents.add(s.name);
        });

        var otherCount = allStudents.filter(function(s) { return !matchedStudents.has(s.name); }).length;

        var summary = document.createElement('div');
        summary.style.cssText = 'background:#f7fafc;border:1px solid #e5e5e5;border-radius:16px;padding:18px 20px;margin-bottom:22px;';

        var heading = document.createElement('p');
        heading.style.cssText = 'font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#aaa;margin-bottom:14px;';
        heading.textContent = 'Summary \u2014 ' + allStudents.length + ' student' + (allStudents.length === 1 ? '' : 's') + ' with restrictions';
        summary.appendChild(heading);

        var grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

        var summaryKeys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
        summaryKeys.forEach(function(label) {
            var pill = document.createElement('span');
            pill.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:white;border:1px solid #e5e5e5;border-radius:999px;font-size:13px;font-weight:700;color:#333;';
            pill.innerHTML = esc(label) + ' <span style="background:#146ff8;color:white;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:800;">' + counts[label] + '</span>';
            grid.appendChild(pill);
        });

        if (otherCount > 0) {
            var otherPill = document.createElement('span');
            otherPill.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:white;border:1px solid #e5e5e5;border-radius:999px;font-size:13px;font-weight:700;color:#333;';
            otherPill.innerHTML = 'Other <span style="background:#888;color:white;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:800;">' + otherCount + '</span>';
            grid.appendChild(otherPill);
        }

        summary.appendChild(grid);
        list.appendChild(summary);
    }

    // Filtered list
    var query = ((el('dietarySearch') || {}).value || '').toLowerCase().trim();
    var filtered = allStudents.filter(function(s) {
        if (!query) return true;
        return s.name.toLowerCase().includes(query) || s.dietary.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        var empty = document.createElement('p');
        empty.className = 'student-info';
        empty.textContent = query ? 'No results for "' + query + '".' : 'No dietary restrictions have been listed.';
        list.appendChild(empty);
        return;
    }

    filtered.forEach(function(student) {
        var row = document.createElement('div');
        row.classList.add('student-row');
        row.innerHTML =
            '<div><p class="student-name">' + esc(student.name) + '</p>' +
            '<p class="student-info">' + esc(student.group) + ' \u2022 ' + esc(student.pronouns) + '</p>' +
            '<p class="student-info">Dietary: ' + esc(student.dietary) + '</p></div>' +
            '<span class="status observation">Food Note</span>';
        list.appendChild(row);
    });
}

function setupDietarySearch() {
    var input = el('dietarySearch');
    if (input) input.addEventListener('input', displayDietaryList);
}

// ── OBSERVATION LEADERBOARD ────────────────────────────────
function displayObsLeaderboard() {
    var posBox  = el('obsTopPositive');
    var negBox  = el('obsTopNegative');
    var brkList = el('obsBreakdownList');
    if (!posBox && !negBox && !brkList) return;

    var obs = ShadDB.getObservations();
    if (!obs || obs.length === 0) {
        if (posBox) posBox.innerHTML = '<p style="color:#aaa;font-size:13px;font-weight:600;">No observations yet.</p>';
        if (negBox) negBox.innerHTML = '';
        if (brkList) brkList.innerHTML = '';
        return;
    }

    // Tally per student
    var tally = {}; // { name: { pos, neg } }
    obs.forEach(function(o) {
        if (!o.student) return;
        if (!tally[o.student]) tally[o.student] = { pos: 0, neg: 0 };
        if (o.mood === 'positive') tally[o.student].pos++;
        else if (o.mood === 'negative') tally[o.student].neg++;
    });

    var names = Object.keys(tally);
    var maxPos = Math.max(1, Math.max.apply(null, names.map(function(n) { return tally[n].pos; })));
    var maxNeg = Math.max(1, Math.max.apply(null, names.map(function(n) { return tally[n].neg; })));

    // Sort for top-3 lists
    var byPos = names.slice().sort(function(a, b) { return tally[b].pos - tally[a].pos; }).slice(0, 3);
    var byNeg = names.slice().sort(function(a, b) { return tally[b].neg - tally[a].neg; }).slice(0, 3);

    var medals = ['🥇', '🥈', '🥉'];

    function makeTopRow(name, count, maxCount, colour, rank) {
        var pct = Math.round((count / maxCount) * 100);
        var div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';
        div.innerHTML =
            '<span style="font-size:18px;flex:0 0 24px;text-align:center;">' + medals[rank] + '</span>' +
            '<div style="flex:1;">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
                    '<span style="font-size:13px;font-weight:800;color:#111;">' + esc(name) + '</span>' +
                    '<span style="font-size:13px;font-weight:700;color:' + colour + ';">' + count + '</span>' +
                '</div>' +
                '<div style="height:8px;background:#f0f0f0;border-radius:99px;overflow:hidden;">' +
                    '<div style="height:100%;width:' + pct + '%;background:' + colour + ';border-radius:99px;transition:width 0.4s;"></div>' +
                '</div>' +
            '</div>';
        return div;
    }

    // Render top positive
    if (posBox) {
        posBox.innerHTML = '';
        var filtered = byPos.filter(function(n) { return tally[n].pos > 0; });
        if (filtered.length === 0) {
            posBox.innerHTML = '<p style="color:#aaa;font-size:13px;font-weight:600;">No positive observations yet.</p>';
        } else {
            filtered.forEach(function(name, i) {
                posBox.appendChild(makeTopRow(name, tally[name].pos, maxPos, '#5a9a20', i));
            });
        }
    }

    // Render top negative
    if (negBox) {
        negBox.innerHTML = '';
        var filteredNeg = byNeg.filter(function(n) { return tally[n].neg > 0; });
        if (filteredNeg.length === 0) {
            negBox.innerHTML = '<p style="color:#aaa;font-size:13px;font-weight:600;">No needs attention observations yet.</p>';
        } else {
            filteredNeg.forEach(function(name, i) {
                negBox.appendChild(makeTopRow(name, tally[name].neg, maxNeg, '#d12c2c', i));
            });
        }
    }

    // Render full breakdown (all students, sorted by total desc)
    if (brkList) {
        brkList.innerHTML = '';
        var allSorted = names.slice().sort(function(a, b) {
            return (tally[b].pos + tally[b].neg) - (tally[a].pos + tally[a].neg);
        });
        allSorted.forEach(function(name) {
            var p = tally[name].pos, n = tally[name].neg, total = p + n;
            if (total === 0) return;
            var pPct = Math.round((p / total) * 100);
            var nPct = 100 - pPct;
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f1f1f1;flex-wrap:wrap;';
            row.innerHTML =
                '<span style="font-size:13px;font-weight:800;color:#111;min-width:140px;flex:0 0 140px;">' + esc(name) + '</span>' +
                '<div style="flex:1;min-width:120px;">' +
                    '<div style="display:flex;height:10px;border-radius:99px;overflow:hidden;gap:2px;">' +
                        '<div title="Positive: ' + p + '" style="width:' + pPct + '%;background:#8bc53f;transition:width 0.3s;border-radius:99px 0 0 99px;"></div>' +
                        '<div title="Needs Attention: ' + n + '" style="width:' + nPct + '%;background:#e74c3c;transition:width 0.3s;border-radius:0 99px 99px 0;"></div>' +
                    '</div>' +
                '</div>' +
                '<span style="font-size:12px;font-weight:700;color:#5a9a20;min-width:36px;text-align:right;">+' + p + '</span>' +
                '<span style="font-size:12px;font-weight:700;color:#d12c2c;min-width:36px;text-align:right;">−' + n + '</span>';
            brkList.appendChild(row);
        });

        // Wire up the breakdown toggle if not already done
        var toggle = el('obsBreakdownToggle');
        if (toggle && !toggle._wired) {
            toggle._wired = true;
            var btn = toggle.querySelector('.panel-toggle');
            toggle.addEventListener('click', function() {
                var collapsed = brkList.classList.contains('collapsed');
                brkList.classList.toggle('collapsed', !collapsed);
                if (btn) {
                    btn.textContent = collapsed ? '−' : '+';
                    btn.setAttribute('aria-expanded', collapsed ? 'true' : 'false');
                    btn.title = collapsed ? 'Collapse' : 'Expand';
                }
            });
        }
    }
}

// ── OBSERVATIONS ──────────────────────────────────────────
function displayObservations() {
    displayObsLeaderboard();
    var recentBox = el('recentObservations'), fullList = el('observationList');
    var searchText = (el('observationSearch') || {}).value || '';
    var filterMood = (el('observationFilter') || {}).value || 'all';
    var filterAck  = (el('observationAckFilter') || {}).value || 'all';
    var sortMode   = (el('observationSort') || {}).value || 'recent';
    var obs = ShadDB.getObservations();
    var filtered = obs.filter(function(o) {
        // Acknowledged "needs attention" observations are escalated to admin — hide from staff view entirely
        if (o.mood === 'negative' && o.acknowledged) return false;
        var matchesSearch = o.student.toLowerCase().includes(searchText.toLowerCase());
        var matchesMood   = filterMood === 'all' || o.mood === filterMood;
        var matchesAck    = filterAck === 'all' ||
                            (filterAck === 'acknowledged'   &&  o.acknowledged) ||
                            (filterAck === 'unacknowledged' && !o.acknowledged);
        return matchesSearch && matchesMood && matchesAck;
    });
    if (sortMode !== 'recent') {
        filtered = filtered.sort(function(a, b) {
            if (a.mood === sortMode && b.mood !== sortMode) return -1;
            if (b.mood === sortMode && a.mood !== sortMode) return 1;
            return 0;
        });
    }
    if (recentBox) {
        recentBox.innerHTML = '';
        // Once an observation has been acknowledged, drop it from Recent Observations
        var recent = obs.filter(function(o) { return !o.acknowledged; }).slice(0, 3);
        if (recent.length === 0) {
            recentBox.innerHTML = '<p class="student-info">No recent observations.</p>';
        } else {
            recent.forEach(function(o) { recentBox.appendChild(createObservationRow(o)); });
        }
    }
    if (fullList) {
        fullList.innerHTML = '';
        if (filtered.length === 0) { fullList.innerHTML = '<p class="student-info">No observations match your search or filter.</p>'; return; }
        filtered.forEach(function(o) { fullList.appendChild(createObservationRow(o)); });
    }
}

function createObservationRow(obs) {
    var row = document.createElement('div');
    row.classList.add('observation-row', obs.mood);
    if (obs.acknowledged) row.classList.add('acknowledged');
    row.innerHTML =
        '<div class="acknowledge-box"><input type="checkbox" class="acknowledge-check" ' + (obs.acknowledged ? 'checked' : '') + '></div>' +
        '<div class="observation-main-info">' +
            '<p class="student-name">' + esc(obs.student) + '</p>' +
            '<p class="student-info">' + esc(obs.type) + ' \u2014 ' + esc(obs.details) + '</p>' +
            (obs.acknowledged && obs.acknowledgementNote ? '<p class="acknowledgement-note"><strong>Acknowledged:</strong> ' + esc(obs.acknowledgementNote) + '</p>' : '') +
        '</div>' +
        '<div class="observation-actions">' +
            '<span class="status ' + obs.mood + '">' + (obs.mood === 'negative' ? 'Needs Attention' : obs.mood.charAt(0).toUpperCase() + obs.mood.slice(1)) + '</span>' +
            // Edit button edits the acknowledgement note; only shown once acknowledged
            (obs.acknowledged ? '<button class="edit-observation-btn">Edit</button>' : '') +
        '</div>';
    row.querySelector('.acknowledge-check').addEventListener('change', function() { openAcknowledgeForm(obs.id); });
    var editBtn = row.querySelector('.edit-observation-btn');
    if (editBtn) editBtn.addEventListener('click', function() { openAcknowledgeForm(obs.id); });
    return row;
}

function setupObservationControls() {
    ['observationSearch','observationFilter','observationAckFilter','observationSort'].forEach(function(id) {
        var e2 = el(id);
        if (e2) e2.addEventListener(id === 'observationSearch' ? 'input' : 'change', displayObservations);
    });
}

function setupObservationCSVDownload() {
    var btn = el('downloadObservationsBtn');
    if (!btn) return;
    btn.addEventListener('click', function() {
        var obs = ShadDB.getObservations();
        var headers = ['Student','Type','Mood','Details','Acknowledged','Acknowledgement Note'];
        var rows = obs.map(function(o) { return [o.student, o.type, o.mood, o.details, o.acknowledged ? 'Yes' : 'No', o.acknowledgementNote || '']; });
        var csv = [headers].concat(rows).map(function(r) { return r.map(function(v) { return '"' + String(v).replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
        var blob = new Blob([csv], { type: 'text/csv' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'observations.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    });
}

function loadObservationStudentDropdown() {
    var dropdown = el('observationStudent');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    var students = ShadDB.getStudents();
    if (students.length === 0) { dropdown.innerHTML = '<option value="">No students loaded</option>'; return; }
    students.forEach(function(s) { dropdown.innerHTML += '<option value="' + esc(s.name) + '">' + esc(s.name) + '</option>'; });
}

function setupObservationToggle() {
    var newBtn = el('newObservationBtn'), formCard = el('observationFormCard'), cancelBtn = el('cancelObservationBtn');
    if (!newBtn || !formCard || !cancelBtn) return;
    newBtn.addEventListener('click', function() {
        formCard.classList.remove('hidden');
        newBtn.style.display = 'none';
        el('saveObservationBtn').textContent = 'Save Observation';
        el('deleteObservationBtn').classList.add('hidden');
        editingObsId = null;
        document.querySelectorAll('input[name="observationMood"]').forEach(function(r) { r.checked = false; });
        el('observationDetails').value = '';
        obsResetPicker();
    });
    cancelBtn.addEventListener('click', function() {
        formCard.classList.add('hidden');
        newBtn.style.display = 'inline-block';
        el('saveObservationBtn').textContent = 'Save Observation';
        el('deleteObservationBtn').classList.add('hidden');
        editingObsId = null;
        obsResetPicker();
    });
}

function editObservation(id) {
    var obs = ShadDB.getObservations().find(function(o) { return o.id === id; });
    if (!obs) return;
    editingObsId = id;
    var formCard = el('observationFormCard'), newBtn = el('newObservationBtn');
    formCard.classList.remove('hidden');
    newBtn.style.display = 'none';
    el('deleteObservationBtn').classList.remove('hidden');
    el('saveObservationBtn').textContent = 'Update Observation';
    el('observationStudent').value = obs.student;
    el('observationDetails').value = obs.details;
    document.querySelectorAll('input[name="observationMood"]').forEach(function(r) { r.checked = r.value === obs.mood; });

    // Restore the category/behaviour selection from the stored "Category — Behaviour" string.
    // Older observations may use a different format; if it doesn't match the known list, the picker
    // just starts unselected and staff can re-pick (the stored value stays until they do).
    var parts = (obs.type || '').split(' — ');
    var cat = (parts[0] || '').trim();
    var beh = (parts[1] || '').trim();
    obsSel = { cat: null, beh: null };
    if (cat === 'Other') {
        obsSel.cat = 'Other';
    } else if (OBS_BEHAVIOURS[obs.mood] && OBS_BEHAVIOURS[obs.mood][cat]) {
        obsSel.cat = cat;
        if (OBS_BEHAVIOURS[obs.mood][cat].indexOf(beh) !== -1) obsSel.beh = beh;
    }
    obsRenderCategories(obs.mood);
}

// Isabelle — Two-level behaviour picker: mood → category → specific behaviour.
// Stored back into the existing fields: mood = positive/neutral/negative, type = "Category — Behaviour".
var OBS_BEHAVIOURS = {
    positive: {
        Engagement: ['Participation', 'Curiosity'],
        Leadership: ['Initiative', 'Support'],
        Collaboration: ['Teamwork', 'Inclusion'],
        Respect: ['Courtesy', 'Professionalism'],
        Accountability: ['Punctuality', 'Follow-through'],
        Resilience: ['Adaptability', 'Perseverance']
    },
    neutral: {
        'Reserved Participation': ['Quiet', 'Prompted'],
        'Independent Working Style': ['Self-directed', 'Individual'],
        'Developing Confidence': ['Hesitant', 'Emerging'],
        'Inconsistent Engagement': ['Variable', 'Situational'],
        'Routine-Focused Behaviour': ['Compliant', 'Steady'],
        'Social Adjustment': ['Cautious', 'Settling-in']
    },
    negative: {
        Disengagement: ['Distracted', 'Withdrawn'],
        Disrespect: ['Inappropriate', 'Dismissive'],
        'Poor Accountability': ['Late', 'Incomplete'],
        'Lack of Collaboration': ['Excluding', 'Uncooperative'],
        'Disruptive Behaviour': ['Interruptive', 'Distracting'],
        'Safety or Conduct Concerns': ['Unsafe', 'Non-compliant']
    }
};
var obsSel = { cat: null, beh: null };

function obsRenderCategories(mood) {
    var row = el('obsCatRow');
    var behWrap = el('obsBehWrap');
    var catLabel = el('obsCatLabel');
    if (!row) return;
    row.innerHTML = '';
    // Needs Attention and Neutral observations don't use behaviour categories
    if (mood === 'negative' || mood === 'neutral') {
        if (catLabel) catLabel.style.display = 'none';
        row.style.display = 'none';
        if (behWrap) behWrap.style.display = 'none';
        return;
    }
    if (catLabel) catLabel.style.display = '';
    row.style.display = '';
    if (!mood || !OBS_BEHAVIOURS[mood]) {
        row.innerHTML = '<p class="obs-chip-hint">Choose a mood above to see categories.</p>';
        if (behWrap) behWrap.style.display = 'none';
        return;
    }
    var cats = Object.keys(OBS_BEHAVIOURS[mood]).concat(['Other']);
    cats.forEach(function(cat) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'obs-chip' + (obsSel.cat === cat ? ' active' : '');
        b.textContent = cat;
        b.addEventListener('click', function() {
            obsSel.cat = cat;
            obsSel.beh = null;
            obsRenderCategories(mood);
            obsRenderBehaviours(mood);
        });
        row.appendChild(b);
    });
    obsRenderBehaviours(mood);
}

function obsRenderBehaviours(mood) {
    var wrap = el('obsBehWrap'), row = el('obsBehRow');
    if (!wrap || !row) return;
    if (!obsSel.cat || !OBS_BEHAVIOURS[mood] || !OBS_BEHAVIOURS[mood][obsSel.cat]) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'block';
    row.innerHTML = '';
    OBS_BEHAVIOURS[mood][obsSel.cat].forEach(function(beh) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'obs-chip' + (obsSel.beh === beh ? ' active' : '');
        b.textContent = beh;
        b.addEventListener('click', function() {
            obsSel.beh = (obsSel.beh === beh) ? null : beh; // allow tapping again to deselect (it's optional)
            obsRenderBehaviours(mood);
        });
        row.appendChild(b);
    });
}

function obsResetPicker() {
    obsSel = { cat: null, beh: null };
    var checked = document.querySelector('input[name="observationMood"]:checked');
    obsRenderCategories(checked ? checked.value : null);
}

// Wire the mood radios so picking a mood swaps the category list
function setupObservationBehaviourPicker() {
    document.querySelectorAll('input[name="observationMood"]').forEach(function(r) {
        r.addEventListener('change', function() {
            obsSel.cat = null;
            obsSel.beh = null;
            obsRenderCategories(this.value);
        });
    });
}

function setupObservationForm() {
    var saveBtn = el('saveObservationBtn'), deleteBtn = el('deleteObservationBtn');
    var formCard = el('observationFormCard'), newBtn = el('newObservationBtn');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', function() {
        var student = el('observationStudent').value;
        var details = el('observationDetails').value.trim();
        var moodEl  = document.querySelector('input[name="observationMood"]:checked');
        if (!moodEl) { alert('Please choose positive, neutral, or needs attention.'); return; }
        // Behaviour category is only used for Positive observations
        if (moodEl.value === 'positive') {
            if (!obsSel.cat) { alert('Please choose a behaviour category.'); return; }
            // "Other" has no preset behaviour, so a written comment is required to explain it
            if (obsSel.cat === 'Other' && !details) { alert('Please add a comment in Details to explain the "Other" behaviour.'); return; }
        }
        // type = "Category — Behaviour" for positive only; empty for neutral/needs attention
        var typeStr = moodEl.value === 'positive'
            ? obsSel.cat + (obsSel.beh ? ' — ' + obsSel.beh : '')
            : '';
        if (editingObsId !== null) {
            ShadDB.updateObservation(editingObsId, { student: student, type: typeStr, mood: moodEl.value, details: details });
        } else {
            ShadDB.addObservation({ student: student, type: typeStr, mood: moodEl.value, details: details });
        }
        editingObsId = null;
        el('observationDetails').value = '';
        if (moodEl) moodEl.checked = false;
        obsResetPicker();
        formCard.classList.add('hidden');
        newBtn.style.display = 'inline-block';
        el('saveObservationBtn').textContent = 'Save Observation';
        el('deleteObservationBtn').classList.add('hidden');
        displayObservations();
        loadStats();
    });
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            if (editingObsId !== null && confirm('Delete this observation?')) {
                ShadDB.deleteObservation(editingObsId);
                editingObsId = null;
                formCard.classList.add('hidden');
                newBtn.style.display = 'inline-block';
                el('saveObservationBtn').textContent = 'Save Observation';
                deleteBtn.classList.add('hidden');
                displayObservations();
                loadStats();
            }
        });
    }
}

function openAcknowledgeForm(id) {
    acknowledgingObsId = id;
    var modal = el('acknowledgeModal'), input = el('acknowledgementNoteInput');
    var obs = ShadDB.getObservations().find(function(o) { return o.id === id; });
    input.value = obs ? (obs.acknowledgementNote || '') : '';
    modal.classList.remove('hidden');
}

function setupAcknowledgementModal() {
    var saveBtn = el('saveAcknowledgementBtn'), cancelBtn = el('cancelAcknowledgementBtn');
    var modal = el('acknowledgeModal'), noteInput = el('acknowledgementNoteInput');
    if (!saveBtn || !cancelBtn || !modal || !noteInput) return;
    saveBtn.addEventListener('click', function() {
        if (acknowledgingObsId === null) return;
        var note = noteInput.value.trim();
        if (!note) { alert('Please add a note explaining what was done.'); return; }
        ShadDB.updateObservation(acknowledgingObsId, { acknowledged: true, acknowledgementNote: note });
        acknowledgingObsId = null;
        modal.classList.add('hidden');
        displayObservations();
    });
    cancelBtn.addEventListener('click', function() {
        if (acknowledgingObsId !== null) { displayObservations(); }
        acknowledgingObsId = null;
        modal.classList.add('hidden');
    });
}

// ── UTILITIES ─────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function downloadCSV(rows, filename) {
    var csv = rows.map(function(r) {
        return r.map(function(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── ELECTIVES (staff view) ─────────────────────────────────
// Isabelle — Shows the Electives nav button only when active electives exist, and lists each elective's sign-ups.
function loadStaffElectives() {
    fetch('/api/electives')
        .then(function(r) { return r.json(); })
        .then(function(electives) {
            var navBtn = el('electivesNavBtn');
            var list = el('electivesStaffList');
            if (!electives || !electives.length) {
                if (navBtn) navBtn.style.display = 'none';
                // If the user is currently on the electives screen, send them home
                if (document.getElementById('electivesScreen') &&
                    document.getElementById('electivesScreen').classList.contains('active')) {
                    activateScreen('hubHome');
                }
                return;
            }
            if (navBtn) navBtn.style.display = '';
            if (!list) return;

            list.innerHTML = '';
            electives.forEach(function(e) {
                var card = document.createElement('div');
                card.className = 'student-panel';
                card.style.padding = '18px 20px';
                var capLabel = e.capacity ? (' / ' + e.capacity + ' spots') : '';
                card.innerHTML =
                    '<div style="display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:10px;">' +
                        '<h3 style="margin:0; font-size:17px; font-weight:800; color:#111;">' + esc(e.name) + '</h3>' +
                        '<span id="electiveCount-' + e.id + '" style="font-size:13px; font-weight:700; color:#888;"></span>' +
                    '</div>' +
                    (e.description ? '<p style="margin:0 0 12px; font-size:13px; color:#888;">' + esc(e.description) + '</p>' : '') +
                    '<div id="electiveSignups-' + e.id + '"><span style="font-size:13px; color:#aaa;">Loading…</span></div>';
                list.appendChild(card);
                loadStaffElectiveSignups(e.id, e.capacity, capLabel);
            });
        })
        .catch(function() {});
}

function loadStaffElectiveSignups(id, capacity, capLabel) {
    fetch('/api/electives/' + id + '/signups')
        .then(function(r) { return r.json(); })
        .then(function(signups) {
            var box = el('electiveSignups-' + id);
            var countEl = el('electiveCount-' + id);
            if (countEl) countEl.textContent = signups.length + (capLabel || ' signed up');
            if (!box) return;
            if (!signups.length) {
                box.innerHTML = '<span style="font-size:13px; color:#aaa;">No sign-ups yet.</span>';
                return;
            }
            box.innerHTML = signups.map(function(s) {
                return '<span style="display:inline-block; background:#f0f6ff; color:#146ff8; border-radius:20px; padding:5px 12px; font-size:13px; font-weight:600; margin:0 5px 5px 0;">' +
                    esc(s.student_name) + '</span>';
            }).join('');
        })
        .catch(function() {});
}

// Load on startup (sets nav visibility), refresh when the tab is opened, and poll so new sign-ups appear live
loadStaffElectives();
document.querySelectorAll('.hub-nav').forEach(function(btn) {
    btn.addEventListener('click', function() {
        if (this.dataset.screen === 'electivesScreen') loadStaffElectives();
    });
});
setInterval(loadStaffElectives, 20000);

function showMsg(text, type) {
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
