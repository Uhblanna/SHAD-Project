// ============================================================
//  SHAD Portal — Scheduling
//  Handles: shift status updates, swap requests, coverage
// ============================================================


// ── STAFF SCHEDULE DATA ───────────────────────────────────
// When you connect Firebase this will come from the database.

let schedule = [];

const statusLabels = {
    duty:    { text: 'On Duty',  css: 'green'  },
    oncall:  { text: 'On Call',  css: 'purple' },
    halfday: { text: 'Half Day', css: 'orange' },
    away:    { text: 'Away',     css: 'red'    },
};


// ── ON PAGE LOAD ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

    loadSchedule();
    setupAddShift();

});

function loadSchedule() {
    fetch("/api/schedule")
        .then(res => res.json())
        .then(data => {
            schedule = data;
            renderSchedule();
        });
}

// ── RENDER SCHEDULE TABLE ─────────────────────────────────

function renderSchedule() {

    const table = document.querySelector('table');
    if (!table) return;

    // Keep the header row, remove old data rows
    const rows = table.querySelectorAll('tr:not(:first-child)');
    rows.forEach(function(row) { row.remove(); });

    schedule.forEach(function(staff) {

        const statusInfo = statusLabels[staff.status] || { text: staff.status, css: 'green' };

        const row = document.createElement('tr');
        row.setAttribute('data-id', staff.id);

        row.innerHTML =
            '<td>' + staff.name + '</td>' +
            '<td>' + staff.role + '</td>' +
            '<td><span class="badge ' + statusInfo.css + '">' + statusInfo.text + '</span></td>' +
            '<td>' + staff.hours + '</td>';

        // Click to update status
        row.style.cursor = 'pointer';
        row.title = 'Click to update status';

        row.addEventListener('click', function() {
            showStatusUpdate(staff.id);
        });

        table.appendChild(row);

    });

}


// ── UPDATE STATUS ─────────────────────────────────────────

function showStatusUpdate(staffId) {

    const staff = schedule.find(function(s) { return s.id === staffId; });
    if (!staff) return;

    const newStatus = prompt(
        'Update status for ' + staff.name + ':\n\n' +
        'Type one of: duty, oncall, halfday, away\n\n' +
        'Current status: ' + staff.status
    );

    if (!newStatus) return;

    const cleaned = newStatus.trim().toLowerCase();

    if (!statusLabels[cleaned]) {
        showMessage('Invalid status. Use: duty, oncall, halfday, or away', 'error');
        return;
    }

    staff.status = cleaned;
    renderSchedule();
    showMessage(staff.name + ' updated to ' + statusLabels[cleaned].text, 'success');

}


// ── ADD SHIFT ─────────────────────────────────────────────

function setupAddShift() {

    const addBtn = document.querySelector('.add-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', function(e) {

        e.preventDefault();
        showAddShiftForm();

    });

}

function showAddShiftForm() {

    if (document.querySelector('.add-shift-form')) return;

    const form = document.createElement('div');
    form.className = 'add-shift-form';

    form.style.cssText =
        'position:fixed; top:0; left:0; width:100%; height:100%;' +
        'background:rgba(0,0,0,0.5); z-index:999;' +
        'display:flex; justify-content:center; align-items:center;';

    form.innerHTML =
        '<div style="background:white; padding:40px; border-radius:24px;' +
        'width:460px; max-width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.2);">' +

            '<h3 style="font-size:26px; margin-bottom:22px;">Add Staff Shift</h3>' +

            '<label style="display:block; font-weight:700; margin-bottom:8px;">Name</label>' +
            '<input id="shift-name" type="text" placeholder="Staff name"' +
            'style="width:100%; padding:14px; border:none; background:#f4f5f7;' +
            'border-radius:14px; font-size:15px; margin-bottom:14px; outline:none; font-family:Montserrat,sans-serif;">' +

            '<label style="display:block; font-weight:700; margin-bottom:8px;">Role</label>' +
            '<input id="shift-role" type="text" placeholder="PA, Director, Floater..."' +
            'style="width:100%; padding:14px; border:none; background:#f4f5f7;' +
            'border-radius:14px; font-size:15px; margin-bottom:14px; outline:none; font-family:Montserrat,sans-serif;">' +

            '<label style="display:block; font-weight:700; margin-bottom:8px;">Hours</label>' +
            '<input id="shift-hours" type="text" placeholder="8AM - 4PM"' +
            'style="width:100%; padding:14px; border:none; background:#f4f5f7;' +
            'border-radius:14px; font-size:15px; margin-bottom:14px; outline:none; font-family:Montserrat,sans-serif;">' +

            '<label style="display:block; font-weight:700; margin-bottom:8px;">Status</label>' +
            '<select id="shift-status"' +
            'style="width:100%; padding:14px; border:none; background:#f4f5f7;' +
            'border-radius:14px; font-size:15px; margin-bottom:22px; outline:none; font-family:Montserrat,sans-serif;">' +
                '<option value="duty">On Duty</option>' +
                '<option value="oncall">On Call</option>' +
                '<option value="halfday">Half Day</option>' +
                '<option value="away">Away</option>' +
            '</select>' +

            '<div style="display:flex; gap:12px;">' +
                '<button id="save-shift-btn"' +
                'style="flex:1; padding:16px; border:none; background:#6f2da8;' +
                'color:white; border-radius:14px; font-size:16px; font-weight:800;' +
                'cursor:pointer; font-family:Montserrat,sans-serif;">Save Shift</button>' +
                '<button id="cancel-shift-btn"' +
                'style="flex:1; padding:16px; border:none; background:#f4f5f7;' +
                'color:#333; border-radius:14px; font-size:16px; font-weight:800;' +
                'cursor:pointer; font-family:Montserrat,sans-serif;">Cancel</button>' +
            '</div>' +

        '</div>';

    document.body.appendChild(form);

    document.getElementById('cancel-shift-btn').addEventListener('click', function() {
        form.remove();
    });

    document.getElementById('save-shift-btn').addEventListener('click', function() {

        const name   = document.getElementById('shift-name').value.trim();
        const role   = document.getElementById('shift-role').value.trim();
        const hours  = document.getElementById('shift-hours').value.trim();
        const status = document.getElementById('shift-status').value;

        if (!name || !role || !hours) {
            alert('Please fill in all fields.');
            return;
        }

        schedule.push({
            id: schedule.length + 1,
            name: name,
            role: role,
            status: status,
            hours: hours
        });

        renderSchedule();
        form.remove();
        showMessage(name + ' added to the schedule.', 'success');

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
