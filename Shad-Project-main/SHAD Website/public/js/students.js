// ============================================================
//  SHAD Portal — Students
//  Handles: search/filter, add student form, notes
// ============================================================


// ── STUDENT DATA ──────────────────────────────────────────
// Full student roster with profiles.
// When you connect Firebase this will come from the database.

let students = [
    {
        id: 1,
        name: 'Sarah Johnson',
        age: 17,
        birthday: 'March 12',
        allergies: 'Peanuts',
        medical: 'Asthma Inhaler',
        goodNotes: 'Strong leadership in team activities.',
        badNotes: 'Late to breakfast twice this week.'
    },
    {
        id: 2,
        name: 'Michael Chen',
        age: 16,
        birthday: 'July 8',
        allergies: 'None',
        medical: 'None',
        goodNotes: 'Excellent attendance and punctuality.',
        badNotes: 'No concerns reported.'
    },
    {
        id: 3,
        name: 'Emily Patel',
        age: 17,
        birthday: 'November 3',
        allergies: 'Gluten',
        medical: 'Dietary monitoring',
        goodNotes: 'Helpful with peers and positive attitude.',
        badNotes: 'Reported homesick yesterday evening.'
    },
    {
        id: 4,
        name: 'Alex Brown',
        age: 16,
        birthday: 'May 21',
        allergies: 'None',
        medical: 'None',
        goodNotes: 'Creative thinker in workshop sessions.',
        badNotes: 'Missed morning lecture on Tuesday.'
    },
    {
        id: 5,
        name: 'Lucy Green',
        age: 17,
        birthday: 'August 14',
        allergies: 'Tree nuts',
        medical: 'EpiPen on person',
        goodNotes: 'Enthusiastic participant in all activities.',
        badNotes: 'No concerns reported.'
    },
];

let nextId = 6;


// ── ON PAGE LOAD ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

    renderStudents(students);
    setupSearch();
    setupAddStudent();

});


// ── RENDER STUDENT CARDS ──────────────────────────────────

function renderStudents(list) {

    const grid = document.querySelector('.student-grid');
    grid.innerHTML = '';

    if (list.length === 0) {

        grid.innerHTML =
            '<p style="color:#666; font-size:18px; padding:20px 0;">No students found.</p>';
        return;

    }

    list.forEach(function(student) {

        const card = document.createElement('div');
        card.className = 'student-card';

        card.innerHTML =
            '<div class="card-top">' +
                '<h3>' + student.name + '</h3>' +
                '<span>Age ' + student.age + '</span>' +
            '</div>' +
            '<div class="info">' +
                '<p><strong>Birthday:</strong> ' + student.birthday + '</p>' +
                '<p><strong>Allergies:</strong> ' + student.allergies + '</p>' +
                '<p><strong>Medical:</strong> ' + student.medical + '</p>' +
            '</div>' +
            '<div class="notes good">' +
                '<h4>Good Notes</h4>' +
                '<p>' + student.goodNotes + '</p>' +
            '</div>' +
            '<div class="notes bad">' +
                '<h4>Needs Attention</h4>' +
                '<p>' + student.badNotes + '</p>' +
            '</div>';

        grid.appendChild(card);

    });

}


// ── SEARCH ────────────────────────────────────────────────

function setupSearch() {

    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {

        const query = searchInput.value.toLowerCase().trim();

        if (query === '') {
            renderStudents(students);
            return;
        }

        const filtered = students.filter(function(s) {
            return (
                s.name.toLowerCase().includes(query) ||
                s.allergies.toLowerCase().includes(query) ||
                s.medical.toLowerCase().includes(query)
            );
        });

        renderStudents(filtered);

    });

}


// ── ADD STUDENT ───────────────────────────────────────────
// The + Add Student button opens a simple form

function setupAddStudent() {

    const addBtn = document.querySelector('.add-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', function(e) {

        e.preventDefault();
        showAddForm();

    });

}

function showAddForm() {

    // Don't open a second form if one is already open
    if (document.querySelector('.add-student-form')) return;

    const form = document.createElement('div');
    form.className = 'add-student-form';

    form.style.cssText =
        'position:fixed; top:0; left:0; width:100%; height:100%;' +
        'background:rgba(0,0,0,0.5); z-index:999;' +
        'display:flex; justify-content:center; align-items:center;';

    form.innerHTML =
        '<div style="background:white; padding:40px; border-radius:24px;' +
        'width:500px; max-width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.2);">' +

            '<h3 style="font-size:28px; margin-bottom:24px;">Add New Student</h3>' +

            '<label style="display:block; font-weight:700; margin-bottom:8px;">Full Name</label>' +
            '<input id="new-name" type="text" placeholder="Student name"' +
            'style="width:100%; padding:14px; border:none; background:#f4f5f7;' +
            'border-radius:14px; font-size:15px; margin-bottom:16px; outline:none;">' +

            '<label style="display:block; font-weight:700; margin-bottom:8px;">Age</label>' +
            '<input id="new-age" type="number" placeholder="16"' +
            'style="width:100%; padding:14px; border:none; background:#f4f5f7;' +
            'border-radius:14px; font-size:15px; margin-bottom:16px; outline:none;">' +

            '<label style="display:block; font-weight:700; margin-bottom:8px;">Allergies</label>' +
            '<input id="new-allergies" type="text" placeholder="None"' +
            'style="width:100%; padding:14px; border:none; background:#f4f5f7;' +
            'border-radius:14px; font-size:15px; margin-bottom:16px; outline:none;">' +

            '<label style="display:block; font-weight:700; margin-bottom:8px;">Medical Notes</label>' +
            '<input id="new-medical" type="text" placeholder="None"' +
            'style="width:100%; padding:14px; border:none; background:#f4f5f7;' +
            'border-radius:14px; font-size:15px; margin-bottom:24px; outline:none;">' +

            '<div style="display:flex; gap:12px;">' +
                '<button id="save-student-btn"' +
                'style="flex:1; padding:16px; border:none; background:#6f2da8;' +
                'color:white; border-radius:14px; font-size:16px; font-weight:800; cursor:pointer;">' +
                'Save Student</button>' +
                '<button id="cancel-student-btn"' +
                'style="flex:1; padding:16px; border:none; background:#f4f5f7;' +
                'color:#333; border-radius:14px; font-size:16px; font-weight:800; cursor:pointer;">' +
                'Cancel</button>' +
            '</div>' +

        '</div>';

    document.body.appendChild(form);

    // Cancel button
    document.getElementById('cancel-student-btn').addEventListener('click', function() {
        form.remove();
    });

    // Save button
    document.getElementById('save-student-btn').addEventListener('click', function() {

        const name     = document.getElementById('new-name').value.trim();
        const age      = document.getElementById('new-age').value.trim();
        const allergies = document.getElementById('new-allergies').value.trim() || 'None';
        const medical  = document.getElementById('new-medical').value.trim() || 'None';

        if (!name || !age) {
            alert('Please fill in at least a name and age.');
            return;
        }

        const newStudent = {
            id: nextId++,
            name: name,
            age: parseInt(age),
            birthday: 'N/A',
            allergies: allergies,
            medical: medical,
            goodNotes: 'No notes yet.',
            badNotes: 'No concerns yet.'
        };

        students.push(newStudent);
        renderStudents(students);
        form.remove();
        showMessage(name + ' added successfully!', 'success');

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
