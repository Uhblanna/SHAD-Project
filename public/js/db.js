// ============================================================
//  SHAD Portal — Central Database API Wrapper (SQLite backend)
//  This keeps the same ShadDB function names your pages already use,
//  but sends the data to server.js + shad_portal.db instead of localStorage.
// ============================================================

// ── API HELPERS ────────────────────────────────────────────
function apiRequest(method, url, data) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, false); // synchronous so existing page code can stay the same
    xhr.setRequestHeader('Content-Type', 'application/json');

    try {
        xhr.send(data ? JSON.stringify(data) : null);
    } catch (error) {
        console.error('API connection error:', error);
        return null;
    }

    if (xhr.status >= 200 && xhr.status < 300) {
        return xhr.responseText ? JSON.parse(xhr.responseText) : null;
    }

    console.error('API error:', method, url, xhr.status, xhr.responseText);
    return null;
}

function apiGet(url) {
    return apiRequest('GET', url);
}

function apiPost(url, data) {
    return apiRequest('POST', url, data);
}

function apiPut(url, data) {
    return apiRequest('PUT', url, data);
}

function apiDelete(url) {
    return apiRequest('DELETE', url);
}

// ── STUDENTS ─────────────────────────────────────────────
function getStudents() {
    return apiGet('/api/students') || [];
}

function setStudents(students) {
    apiPost('/api/students/replace', { students: students });
    window.dispatchEvent(new CustomEvent('shad:studentsChanged'));
}

function addStudent(student) {
    const newStudent = apiPost('/api/students', {
        name: student.name || '',
        pronouns: student.pronouns || '',
        houseTeam: student.houseTeam || student.group || '',
        designTeam: student.designTeam || '',
        reqTeam: student.reqTeam || '',
        age: student.age || '',
        instrument: student.instrument || '',
        dietary: student.dietary || 'None',
        note: student.note || ''
    });

    window.dispatchEvent(new CustomEvent('shad:studentsChanged'));
    return newStudent;
}

function updateStudent(id, updates) {
    apiPut('/api/students/' + encodeURIComponent(id), updates);
    window.dispatchEvent(new CustomEvent('shad:studentsChanged'));
    return true;
}

function deleteStudent(id) {
    apiDelete('/api/students/' + encodeURIComponent(id));
    window.dispatchEvent(new CustomEvent('shad:studentsChanged'));
}

function _mapStudentRow(row) {
    // Name: prefer PrefName if present, fall back to FirstName + LastName or Name
    const prefName  = (row['PrefName'] || '').trim();
    const firstName = (row['FirstName'] || row['First Name'] || '').trim();
    const lastName  = (row['LastName']  || row['Last Name']  || '').trim();
    const fullName  = prefName || (firstName && lastName ? firstName + ' ' + lastName : (firstName || lastName));
    const name      = fullName || row['Name'] || row['name'] || '';

    // Pronouns
    const pronouns = row['Pronoun'] || row['Pronouns'] || row['pronouns'] || '';

    // Teams — house team maps from Campus/Group columns
    const houseTeam  = row['House Team']  || row['house_team']  || row['Campus'] || row['Group']  || row['group']  || '';
    const designTeam = row['Design Team'] || row['design_team'] || '';
    const reqTeam    = row['Req Team']    || row['req_team']    || '';

    // Age
    const age = row['Age Start Prog'] || row['Age'] || row['age'] || '';

    // Instrument
    const instrument = row['Instrument'] || row['instrument'] || '';

    // Dietary
    const dietary = row['Dietary Restrictions And/Or Intolerances'] ||
                    row['Dietary'] || row['dietary'] ||
                    row['Dietary Restrictions'] || row['dietary_restrictions'] || 'None';

    // Notes — "Things to Know" / "Notes for PD to be aware of" → note field
    const note = row['Things to Know']            ||
                 row['Things To Know']             ||
                 row['Notes for PD to be aware of'] ||
                 row['Note'] || row['note'] || row['Notes'] || '';

    return { name, pronouns, houseTeam, designTeam, reqTeam, age, instrument, dietary, note };
}

function importStudentsFromCSV(rows) {
    const existing = getStudents();
    const newStudents = rows.map(_mapStudentRow).filter(s => s.name.trim() !== '');
    setStudents([...existing, ...newStudents]);
    return newStudents.length;
}

function clearAndImportStudents(rows) {
    const newStudents = rows.map(_mapStudentRow).filter(s => s.name.trim() !== '');
    setStudents(newStudents);
    return newStudents.length;
}

// ── ATTENDANCE ───────────────────────────────────────────
function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getTodayAttendance() {
    return apiGet('/api/attendance/today') || {};
}

function setTodayAttendance(record) {
    apiPost('/api/attendance/today', { record: record });
    window.dispatchEvent(new CustomEvent('shad:attendanceChanged'));
}

function checkInStudent(studentId) {
    const record = getTodayAttendance();
    record[studentId] = { checkedIn: true, time: new Date().toISOString() };
    setTodayAttendance(record);
}

function isCheckedIn(studentId) {
    const record = getTodayAttendance();
    return !!(record[studentId] && record[studentId].checkedIn);
}

// ── OBSERVATIONS ─────────────────────────────────────────
function getObservations() {
    return apiGet('/api/observations') || [];
}

function setObservations(observations) {
    // This function is kept for compatibility. Use add/update/delete for normal edits.
    observations.forEach(obs => {
        if (obs.id) updateObservation(obs.id, obs);
        else addObservation(obs);
    });
    window.dispatchEvent(new CustomEvent('shad:observationsChanged'));
}

function addObservation(obs) {
    const newObs = apiPost('/api/observations', {
        student: obs.student,
        type: obs.type,
        mood: obs.mood,
        details: obs.details,
        acknowledged: false,
        acknowledgementNote: ''
    });

    window.dispatchEvent(new CustomEvent('shad:observationsChanged'));
    return newObs;
}

function updateObservation(id, updates) {
    apiPut('/api/observations/' + encodeURIComponent(id), updates);
    window.dispatchEvent(new CustomEvent('shad:observationsChanged'));
    return true;
}

function deleteObservation(id) {
    apiDelete('/api/observations/' + encodeURIComponent(id));
    window.dispatchEvent(new CustomEvent('shad:observationsChanged'));
}

// ── REPORTS ──────────────────────────────────────────────
function getReports() {
    return apiGet('/api/reports') || [];
}

function addReport(report) {
    const newReport = apiPost('/api/reports', {
        student: report.student,
        types: report.types,
        notes: report.notes,
        time: report.time || formatReportTime(new Date())
    });

    window.dispatchEvent(new CustomEvent('shad:reportsChanged'));
    return newReport;
}

function formatReportTime(date) {
    let hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return 'Today • ' + hours + ':' + mins + ' ' + ampm;
}

// ── COMMITTEE ASSIGNMENTS ────────────────────────────────
function getCommitteeAssignments() {
    const list = apiGet('/api/committee-assignments') || [];
    const map = {};
    list.forEach(a => { map[a.student_name] = a.committee_name; });
    return map;
}

function getCommitteeOptions() {
    return apiGet('/api/committee-options') || [];
}

function assignCommittee(studentName, committeeName, committeeType) {
    return apiPut('/api/committee-assignments', {
        student_name: studentName,
        committee_name: committeeName,
        committee_type: committeeType || ''
    });
}

function unassignCommittee(studentName) {
    return apiDelete('/api/committee-assignments/' + encodeURIComponent(studentName));
}

// ── DASHBOARD STATS ──────────────────────────────────────
function getDashboardStats() {
    const students     = getStudents();
    const attendance   = getTodayAttendance();
    const observations = getObservations();
    const reports      = getReports();

    const checkedIn = students.filter(s => attendance[s.id] && attendance[s.id].checkedIn).length;
    const missing   = students.length - checkedIn;

    return {
        totalStudents:    students.length,
        checkedIn,
        missing,
        observationCount: observations.length,
        unacknowledged:   observations.filter(o => !o.acknowledged).length,
        reportCount:      reports.length
    };
}

// ── PARSE CSV TEXT ───────────────────────────────────────
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes("\t") ? "\t" : ",";

    function parseLine(line) {
        const fields = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];

            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === delimiter && !inQuotes) {
                fields.push(current.trim().replace(/^"|"$/g, ""));
                current = "";
            } else {
                current += ch;
            }
        }

        fields.push(current.trim().replace(/^"|"$/g, ""));
        return fields;
    }

    const headers = parseLine(lines[0]);

    return lines.slice(1).map(line => {
        const fields = parseLine(line);
        const row = {};

        headers.forEach((h, i) => {
            row[h] = fields[i] || "";
        });

        return row;
    }).filter(row => Object.values(row).some(v => v !== ""));
}

window.ShadDB = {
    getStudents, setStudents, addStudent, updateStudent, deleteStudent,
    importStudentsFromCSV, clearAndImportStudents,
    getTodayAttendance, setTodayAttendance, checkInStudent, isCheckedIn, todayKey,
    getObservations, setObservations, addObservation, updateObservation, deleteObservation,
    getReports, addReport,
    getCommitteeAssignments, getCommitteeOptions, assignCommittee, unassignCommittee,
    getDashboardStats,
    parseCSV, formatReportTime
};
