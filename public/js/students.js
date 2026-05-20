// ============================================================
//  SHAD Portal — Students Hub
//  Uses ShadDB (db.js) for all persistence.
//  QR scanning via jsQR library loaded from CDN.
// ============================================================

// ── STATE ─────────────────────────────────────────────────
let editingStudentId   = null;
let editingObsId       = null;
let acknowledgingObsId = null;
let qrStream           = null;
let qrAnimFrame        = null;

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupHubNavigation();
    setupHamburgerMenu();
    setupAddStudentBtn();
    refreshAll();

    setupStudentControls();
    setupStudentEditForm();
    setupObservationToggle();
    setupObservationForm();
    setupObservationControls();
    setupObservationCSVDownload();
    setupAcknowledgementModal();
    setupManualAttendanceEntry();
    setupAttendanceSubmitButton();
    setupQRScanner();
});

function refreshAll() {
    loadStats();
    displayStudents(ShadDB.getStudents());
    renderMissingStudents();
    updateAttendanceCounter();
    displayAttendanceAlerts();
    displayObservations();
    loadObservationStudentDropdown();
    displayMedicationList();
    displayMedicationAlerts();
    displayDietaryList();
}

// ── NAV & MENU ────────────────────────────────────────────
function setupHubNavigation() {
    document.querySelectorAll('.hub-nav').forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.screen;
            document.querySelectorAll('.hub-nav').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.hub-screen').forEach(s => s.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(target).classList.add('active');
            if (target !== 'attendanceScreen') stopQRScanner();
        });
    });
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
    ['editStudentName','editStudentPronouns','editStudentAge','editStudentInstrument',
     'editStudentMedication','editStudentDietary','editStudentNote'].forEach(function(id) {
        var e2 = document.getElementById(id);
        if (e2) e2.value = '';
    });
    var grp = document.getElementById('editStudentGroup');
    if (grp) grp.value = 'Group 1';
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
        const row = document.createElement('div');
        row.classList.add('student-row');
        row.innerHTML =
            '<div>' +
                '<p class="student-name">' + esc(student.name) + '</p>' +
                '<p class="student-info">' + esc(student.pronouns) + ' \u2022 ' + esc(student.group) + ' \u2022 Age ' + esc(student.age) + '</p>' +
                '<p class="student-info">Instrument: ' + esc(student.instrument) + '</p>' +
                '<p class="student-info">Medication: ' + esc(student.medication) + '</p>' +
                '<p class="student-info">' + esc(student.note) + '</p>' +
            '</div>' +
            '<div class="student-actions">' +
                '<span class="status ' + statusClass + '">' + statusText + '</span>' +
                '<button class="edit-student-btn">Edit</button>' +
                '<button class="delete-student-btn">\u2715</button>' +
            '</div>';
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

function setupStudentControls() {
    var search = el('studentSearch'), filter = el('studentGroupFilter');
    if (search) search.addEventListener('input', filterStudents);
    if (filter) filter.addEventListener('change', filterStudents);
}

function filterStudents() {
    var search = (el('studentSearch') || {}).value || '';
    var group  = (el('studentGroupFilter') || {}).value || 'all';
    var filtered = ShadDB.getStudents().filter(function(s) {
        return s.name.toLowerCase().includes(search.toLowerCase()) &&
               (group === 'all' || s.group === group);
    });
    displayStudents(filtered);
}

function editStudent(id) {
    var student = ShadDB.getStudents().find(function(s) { return s.id === id; });
    if (!student) return;
    editingStudentId = id;
    var card = el('studentFormCard');
    card.querySelector('h3').textContent = 'Edit Student';
    el('editStudentName').value       = student.name;
    el('editStudentPronouns').value   = student.pronouns;
    el('editStudentGroup').value      = student.group;
    el('editStudentAge').value        = student.age;
    el('editStudentInstrument').value = student.instrument;
    el('editStudentMedication').value = student.medication;
    el('editStudentDietary').value    = student.dietary;
    el('editStudentNote').value       = student.note;
    card.classList.remove('hidden');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupStudentEditForm() {
    var saveBtn = el('saveStudentEditBtn'), cancelBtn = el('cancelStudentEditBtn'), formCard = el('studentFormCard');
    if (!saveBtn || !cancelBtn || !formCard) return;
    saveBtn.addEventListener('click', function() {
        var name       = el('editStudentName').value.trim();
        var pronouns   = el('editStudentPronouns').value.trim();
        var group      = el('editStudentGroup').value;
        var age        = el('editStudentAge').value;
        var instrument = el('editStudentInstrument').value.trim();
        var medication = el('editStudentMedication').value.trim();
        var dietary    = el('editStudentDietary').value.trim();
        var note       = el('editStudentNote').value.trim();
        if (!name || !pronouns || !age || !instrument || !medication) {
            alert('Please fill in name, pronouns, age, instrument, and medication.');
            return;
        }
        if (editingStudentId !== null) {
            ShadDB.updateStudent(editingStudentId, { name: name, pronouns: pronouns, group: group, age: age, instrument: instrument, medication: medication, dietary: dietary, note: note });
        } else {
            ShadDB.addStudent({ name: name, pronouns: pronouns, group: group, age: age, instrument: instrument, medication: medication, dietary: dietary, note: note });
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

// ── ATTENDANCE ────────────────────────────────────────────
function renderMissingStudents() {
    var missingList = el('missingStudentsList'), missingBadge = el('missingBadge');
    if (!missingList || !missingBadge) return;
    var students = ShadDB.getStudents(), attendance = ShadDB.getTodayAttendance();
    var missing = students.filter(function(s) { return !(attendance[s.id] && attendance[s.id].checkedIn); });
    missingBadge.textContent = missing.length + ' Missing';
    missingList.innerHTML = '';
    if (missing.length === 0) {
        missingList.innerHTML = '<p style="color:#8bc53f;font-weight:700;padding:20px 0;">All students checked in!</p>';
        return;
    }
    missing.forEach(function(student) {
        var row = document.createElement('div');
        row.classList.add('student-missing');
        row.innerHTML =
            '<div class="avatar">' + student.name.charAt(0) + '</div>' +
            '<div class="student-info"><h4>' + esc(student.name) + '</h4><p>' + esc(student.group) + '</p></div>' +
            '<button style="cursor:pointer;border:none;background:#8bc53f;color:white;padding:6px 14px;border-radius:8px;font-weight:700;">Check In</button>';
        row.querySelector('button').addEventListener('click', function() {
            ShadDB.checkInStudent(student.id);
            refreshAll();
            showMsg(student.name + ' checked in!', 'success');
        });
        missingList.appendChild(row);
    });
}

function updateAttendanceCounter() {
    var submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;
    var students = ShadDB.getStudents(), attendance = ShadDB.getTodayAttendance();
    var checkedIn = students.filter(function(s) { return attendance[s.id] && attendance[s.id].checkedIn; }).length;
    submitBtn.textContent = checkedIn + ' / ' + students.length + ' Checked In';
}

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
        row.classList.add('alert-row');
        row.innerHTML =
            '<div><p class="student-name">' + esc(student.name) + ' \u2014 not yet checked in</p>' +
            '<p class="alert-info">' + esc(student.group) + '</p></div>' +
            '<span class="status missing">Alert</span>';
        alertBox.appendChild(row);
    });
}

function setupManualAttendanceEntry() {
    var input = el('manualStudentInput'), button = el('manualStudentBtn');
    if (!input || !button) return;
    button.addEventListener('click', function() {
        var name = input.value.trim();
        if (!name) { showMsg('Please enter a student name.', 'error'); return; }
        checkInByName(name);
        input.value = '';
    });
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') button.click(); });
}

function checkInByName(name) {
    var student = ShadDB.getStudents().find(function(s) {
        return s.name.toLowerCase() === name.toLowerCase();
    });
    if (!student) { showMsg('"' + name + '" not found in roster.', 'error'); return; }
    if (ShadDB.isCheckedIn(student.id)) { showMsg(student.name + ' already checked in.', 'error'); return; }
    ShadDB.checkInStudent(student.id);
    addRecentScan(student.name);
    refreshAll();
    showMsg(student.name + ' checked in!', 'success');
}

var recentScans = [];
function addRecentScan(name) {
    var now = new Date(), h = now.getHours(), m = now.getMinutes().toString().padStart(2,'0');
    var ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    recentScans.unshift({ name: name, time: h + ':' + m + ' ' + ampm });
    if (recentScans.length > 5) recentScans = recentScans.slice(0, 5);
    var list = el('recentScansList');
    if (!list) return;
    list.innerHTML = '';
    recentScans.forEach(function(scan) {
        var row = document.createElement('div');
        row.classList.add('scan-row');
        row.innerHTML = '<span>' + esc(scan.name) + '</span><small>' + scan.time + '</small>';
        list.appendChild(row);
    });
}

function setupAttendanceSubmitButton() {
    var submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;
    submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        var students = ShadDB.getStudents(), attendance = ShadDB.getTodayAttendance();
        var checkedIn = students.filter(function(s) { return attendance[s.id] && attendance[s.id].checkedIn; }).length;
        var missing = students.length - checkedIn;
        if (confirm('Submit attendance?\n\nChecked In: ' + checkedIn + '\nMissing: ' + missing + '\n\nThis will save the current attendance record.')) {
            showMsg('Attendance submitted! ' + checkedIn + ' present, ' + missing + ' absent.', 'success');
        }
    });
}

// ── QR SCANNER ────────────────────────────────────────────
function setupQRScanner() {
    var scannerBox = document.querySelector('.scanner-box');
    if (!scannerBox) return;
    scannerBox.innerHTML =
        '<div id="qrStatus" style="text-align:center;padding:8px 0;font-size:13px;color:#888;">Camera not started</div>' +
        '<video id="qrVideo" style="width:100%;border-radius:12px;display:none;background:#000;" autoplay muted playsinline></video>' +
        '<canvas id="qrCanvas" style="display:none;"></canvas>' +
        '<button id="startQRBtn" style="margin-top:14px;width:100%;padding:14px;background:#6f2da8;color:white;border:none;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;">📷 Start QR Scanner</button>' +
        '<button id="stopQRBtn" style="margin-top:8px;width:100%;padding:12px;background:#e5e5e5;color:#444;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;display:none;">Stop Camera</button>';
    el('startQRBtn').addEventListener('click', startQRScanner);
    el('stopQRBtn').addEventListener('click', stopQRScanner);
}

function startQRScanner() {
    var video = el('qrVideo'), canvas = el('qrCanvas'), status = el('qrStatus');
    var startBtn = el('startQRBtn'), stopBtn = el('stopQRBtn');
    if (!video || !canvas) return;

    function doStart() {
        status.textContent = 'Requesting camera permission\u2026';
        status.style.color = '#f58220';
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function(stream) {
            qrStream = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            document.querySelector('.scanner-box').classList.add('scanning');
            startBtn.style.display = 'none';
            stopBtn.style.display  = 'block';
            status.textContent = '\uD83D\uDFE2 Scanning\u2026 point camera at a student QR code';
            status.style.color = '#8bc53f';
            video.addEventListener('loadedmetadata', function() {
                canvas.width  = video.videoWidth;
                canvas.height = video.videoHeight;
                scanQRFrame(video, canvas, status);
            });
        })
        .catch(function(err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                status.textContent = '\u26A0\uFE0F Camera permission denied. Please allow camera access in your browser settings.';
            } else {
                status.textContent = '\u26A0\uFE0F Camera unavailable: ' + err.message;
            }
            status.style.color = '#d12c2c';
        });
    }

    if (typeof jsQR === 'undefined') {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        s.onload = doStart;
        s.onerror = function() { status.textContent = 'Failed to load QR library.'; status.style.color = '#d12c2c'; };
        document.head.appendChild(s);
    } else {
        doStart();
    }
}

function scanQRFrame(video, canvas, status) {
    var ctx = canvas.getContext('2d');
    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (code) { handleQRResult(code.data, status); return; }
        }
        qrAnimFrame = requestAnimationFrame(tick);
    }
    qrAnimFrame = requestAnimationFrame(tick);
}

function handleQRResult(data, status) {
    var student = null;
    if (data.startsWith('SHAD_STUDENT:')) {
        var idStr = data.replace('SHAD_STUDENT:', '').trim();
        var idNum = parseFloat(idStr);
        student = ShadDB.getStudents().find(function(s) { return s.id === idNum || String(s.id) === idStr; });
    }
    if (!student) {
        student = ShadDB.getStudents().find(function(s) { return s.name.toLowerCase() === data.trim().toLowerCase(); });
    }
    if (student) {
        if (!ShadDB.isCheckedIn(student.id)) {
            ShadDB.checkInStudent(student.id);
            addRecentScan(student.name);
            refreshAll();
            status.textContent = '\u2705 Checked in: ' + student.name;
            status.style.color = '#8bc53f';
        } else {
            status.textContent = '\u26A0\uFE0F Already checked in: ' + student.name;
            status.style.color = '#f58220';
        }
    } else {
        status.textContent = '\u2753 Unrecognised QR: ' + data.slice(0, 40);
        status.style.color = '#d12c2c';
    }
    cancelAnimationFrame(qrAnimFrame);
    setTimeout(function() {
        var v2 = el('qrVideo'), c2 = el('qrCanvas');
        if (v2 && qrStream && qrStream.active) {
            status.textContent = '\uD83D\uDFE2 Scanning\u2026';
            status.style.color = '#8bc53f';
            scanQRFrame(v2, c2, status);
        }
    }, 2000);
}

function stopQRScanner() {
    cancelAnimationFrame(qrAnimFrame); qrAnimFrame = null;
    if (qrStream) { qrStream.getTracks().forEach(function(t) { t.stop(); }); qrStream = null; }
    var video = el('qrVideo'), status = el('qrStatus');
    var startBtn = el('startQRBtn'), stopBtn = el('stopQRBtn');
    if (video)    { video.style.display = 'none'; video.srcObject = null; }
    document.querySelector('.scanner-box')?.classList.remove('scanning');
    if (status)   { status.textContent = 'Camera stopped.'; status.style.color = '#888'; }
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn)  stopBtn.style.display  = 'none';
}

// ── MEDICATIONS ───────────────────────────────────────────
function displayMedicationList() {
    var list = el('medicationList');
    if (!list) return;
    list.innerHTML = '';
    var students = ShadDB.getStudents().filter(function(s) { return s.medication && s.medication.toLowerCase() !== 'none'; });
    if (students.length === 0) { list.innerHTML = '<p class="student-info">No students with listed medications.</p>'; return; }
    students.forEach(function(student) {
        var row = document.createElement('div');
        row.classList.add('student-row');
        row.innerHTML =
            '<div><p class="student-name">' + esc(student.name) + '</p>' +
            '<p class="student-info">' + esc(student.group) + ' \u2022 ' + esc(student.pronouns) + '</p>' +
            '<p class="student-info">Medication: ' + esc(student.medication) + '</p></div>' +
            '<label class="med-check-label"><input type="checkbox" ' + (student.medicationTaken ? 'checked' : '') + '> Taken</label>';
        row.querySelector('input').addEventListener('change', function(e) {
            ShadDB.updateStudent(student.id, { medicationTaken: e.target.checked });
            displayMedicationAlerts();
        });
        list.appendChild(row);
    });
}

function displayMedicationAlerts() {
    var box = el('medicationAlerts');
    if (!box) return;
    var needing = ShadDB.getStudents().filter(function(s) {
        return s.medication && s.medication.toLowerCase() !== 'none' && !s.medicationTaken;
    });
    box.innerHTML = '';
    if (needing.length === 0) { box.innerHTML = '<p class="student-info">All required medications have been marked as taken.</p>'; return; }
    needing.forEach(function(student) {
        var row = document.createElement('div');
        row.classList.add('alert-row');
        row.innerHTML =
            '<div><p class="student-name">' + esc(student.name) + ' \u2014 medication not taken</p>' +
            '<p class="alert-info">' + esc(student.medication) + '</p></div>' +
            '<span class="status missing">Alert</span>';
        box.appendChild(row);
    });
}

// ── DIETARY ───────────────────────────────────────────────
function displayDietaryList() {
    var list = el('dietaryList');
    if (!list) return;
    list.innerHTML = '';
    var students = ShadDB.getStudents().filter(function(s) { return s.dietary && s.dietary.toLowerCase() !== 'none'; });
    if (students.length === 0) { list.innerHTML = '<p class="student-info">No dietary restrictions have been listed.</p>'; return; }
    students.forEach(function(student) {
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

// ── OBSERVATIONS ──────────────────────────────────────────
function displayObservations() {
    var recentBox = el('recentObservations'), fullList = el('observationList');
    var searchText = (el('observationSearch') || {}).value || '';
    var filterMood = (el('observationFilter') || {}).value || 'all';
    var sortMode   = (el('observationSort') || {}).value || 'recent';
    var obs = ShadDB.getObservations();
    var filtered = obs.filter(function(o) {
        return o.student.toLowerCase().includes(searchText.toLowerCase()) &&
               (filterMood === 'all' || o.mood === filterMood);
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
        obs.slice(0, 3).forEach(function(o) { recentBox.appendChild(createObservationRow(o)); });
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
            '<span class="status ' + obs.mood + '">' + obs.mood.charAt(0).toUpperCase() + obs.mood.slice(1) + '</span>' +
            '<button class="edit-observation-btn">Edit</button>' +
        '</div>';
    row.querySelector('.acknowledge-check').addEventListener('change', function() { openAcknowledgeForm(obs.id); });
    row.querySelector('.edit-observation-btn').addEventListener('click', function() { editObservation(obs.id); });
    return row;
}

function setupObservationControls() {
    ['observationSearch','observationFilter','observationSort'].forEach(function(id) {
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
    });
    cancelBtn.addEventListener('click', function() {
        formCard.classList.add('hidden');
        newBtn.style.display = 'inline-block';
        el('saveObservationBtn').textContent = 'Save Observation';
        el('deleteObservationBtn').classList.add('hidden');
        editingObsId = null;
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
    document.querySelectorAll('.checkbox-grid input').forEach(function(cb) { cb.checked = false; });
    obs.type.split(',').map(function(t) { return t.trim(); }).forEach(function(t) {
        document.querySelectorAll('.checkbox-grid input').forEach(function(cb) { if (cb.value === t) cb.checked = true; });
    });
    document.querySelectorAll('input[name="observationMood"]').forEach(function(r) { r.checked = r.value === obs.mood; });
}

function setupObservationForm() {
    var saveBtn = el('saveObservationBtn'), deleteBtn = el('deleteObservationBtn');
    var formCard = el('observationFormCard'), newBtn = el('newObservationBtn');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', function() {
        var student = el('observationStudent').value;
        var details = el('observationDetails').value.trim();
        var checked = document.querySelectorAll('.checkbox-grid input:checked');
        var types   = Array.from(checked).map(function(cb) { return cb.value; });
        var moodEl  = document.querySelector('input[name="observationMood"]:checked');
        if (!moodEl) { alert('Please choose positive, neutral, or negative.'); return; }
        if (!types.length || !details) { alert('Please choose a type and enter details.'); return; }
        if (editingObsId !== null) {
            ShadDB.updateObservation(editingObsId, { student: student, type: types.join(', '), mood: moodEl.value, details: details });
        } else {
            ShadDB.addObservation({ student: student, type: types.join(', '), mood: moodEl.value, details: details });
        }
        editingObsId = null;
        el('observationDetails').value = '';
        if (moodEl) moodEl.checked = false;
        checked.forEach(function(cb) { cb.checked = false; });
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

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

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
