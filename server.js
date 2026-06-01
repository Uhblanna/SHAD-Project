const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Change this to your actual staff password ──────────────────────────────
const STAFF_PASSWORD = "shad2026";
// Isabelle McLean — Separate admin password gating the /public/admin.html page; change this to set a new admin password
const ADMIN_PASSWORD = "shadadmin";
// ──────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "shad2026-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));
app.use("/public", express.static(path.join(__dirname, "public")));

app.post("/api/staff-login", (req, res) => {
    if (req.body.password === STAFF_PASSWORD) {
        req.session.staffAuth = true;
        res.json({ ok: true });
    } else {
        res.status(401).json({ ok: false, error: "Incorrect password." });
    }
});

app.get("/api/check-auth", (req, res) => {
    res.json({ ok: !!req.session.staffAuth });
});

app.post("/api/staff-logout", (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

// Isabelle McLean — Admin auth routes: separate password layer for the /public/admin.html page
app.post("/api/admin-login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.adminAuth = true;
        res.json({ ok: true });
    } else {
        res.status(401).json({ ok: false, error: "Incorrect admin password." });
    }
});

app.get("/api/check-admin-auth", (req, res) => {
    res.json({ ok: !!req.session.adminAuth });
});

app.post("/api/admin-logout", (req, res) => {
    req.session.adminAuth = false;
    res.json({ ok: true });
});

function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Isabelle McLean — Returns the active morning-rec date with a 10 AM reset point.
// Before 10 AM the rec is happening THIS morning, so we stay on today's signups.
// At/after 10 AM that session is over, so we roll forward to tomorrow's signups
// (students sign up the evening before for the next morning's rec).
function recDateKey() {
    const d = new Date();
    if (d.getHours() >= 10) {
        d.setDate(d.getDate() + 1);
    }
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function rowToMedkit(row) {
    return {
        id: row.id,
        qrCode: row.qr_code,
        name: row.name,
        assignedStaff: row.assigned_staff || "",
        location: row.location || "",
        status: row.status || "Ready",
        supplies: row.supplies || "",
        checkedIn: row.checked_in === 1,
        checkedInTime: row.checked_in_time || ""
    };
}

function rowToStudent(row) {
    return {
        id: row.id,
        name: row.name,
        pronouns: row.pronouns || "",
        group: row.group_name || "Group 1",
        age: row.age || "",
        instrument: row.instrument || "",
        medication: row.medication || "None",
        medicationTaken: row.medication_taken === 1,
        dietary: row.dietary || "None",
        note: row.note || ""
    };
}

function rowToObservation(row) {
    return {
        id: row.id,
        student: row.student,
        type: row.type,
        mood: row.mood,
        details: row.details,
        acknowledged: row.acknowledged === 1,
        acknowledgementNote: row.acknowledgement_note || "",
        createdAt: row.created_at
    };
}

function rowToReport(row) {
    return {
        id: row.id,
        student: row.student,
        types: row.types ? row.types.split("|").filter(Boolean) : [],
        notes: row.notes,
        time: row.time,
        createdAt: row.created_at
    };
}

function rowToIssueTicket(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || "",
        issueType: row.issue_type || "",
        description: row.description,
        urgent: row.urgent === 1,
        createdAt: row.created_at
    };
}

function rowToStaff(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        slackLink: row.slack_link || ""
    };
}

function rowToSchedule(row) {
    return {
        id: row.id,
        weekLabel: row.week_label || "",
        date: row.schedule_date || "",
        dayName: row.day_name || "",
        timeBlock: row.time_block || "",
        activity: row.activity || "",
        staffRole: row.staff_role || "",
        status: row.status || ""
    };
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// STUDENTS
app.get("/api/students", (req, res) => {
    db.all("SELECT * FROM students ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(rowToStudent));
    });
});

app.post("/api/students", (req, res) => {
    const s = req.body;
    db.run(`
        INSERT INTO students (name, pronouns, group_name, age, instrument, medication, medication_taken, dietary, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [s.name, s.pronouns || "", s.group || "Group 1", s.age || null, s.instrument || "", s.medication || "None", s.medicationTaken ? 1 : 0, s.dietary || "None", s.note || ""], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM students WHERE id = ?", [this.lastID], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(rowToStudent(row));
        });
    });
});

app.put("/api/students/:id", (req, res) => {
    const s = req.body;
    db.run(`
        UPDATE students
        SET name = COALESCE(?, name),
            pronouns = COALESCE(?, pronouns),
            group_name = COALESCE(?, group_name),
            age = COALESCE(?, age),
            instrument = COALESCE(?, instrument),
            medication = COALESCE(?, medication),
            medication_taken = COALESCE(?, medication_taken),
            dietary = COALESCE(?, dietary),
            note = COALESCE(?, note)
        WHERE id = ?
    `, [s.name, s.pronouns, s.group, s.age, s.instrument, s.medication, typeof s.medicationTaken === "boolean" ? (s.medicationTaken ? 1 : 0) : null, s.dietary, s.note, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.delete("/api/students/:id", (req, res) => {
    db.run("DELETE FROM students WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.post("/api/students/replace", (req, res) => {
    const students = Array.isArray(req.body.students) ? req.body.students : [];
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM students");
        const stmt = db.prepare(`
            INSERT INTO students (name, pronouns, group_name, age, instrument, medication, medication_taken, dietary, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        students.forEach(s => {
            stmt.run([s.name, s.pronouns || "", s.group || "Group 1", s.age || null, s.instrument || "", s.medication || "None", s.medicationTaken ? 1 : 0, s.dietary || "None", s.note || ""]);
        });
        stmt.finalize(err => {
            if (err) return db.run("ROLLBACK", () => res.status(500).json({ error: err.message }));
            db.run("COMMIT", err2 => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ inserted: students.length });
            });
        });
    });
});

// OBSERVATIONS
app.get("/api/observations", (req, res) => {
    db.all("SELECT * FROM observations ORDER BY datetime(created_at) DESC, id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(rowToObservation));
    });
});

app.post("/api/observations", (req, res) => {
    const o = req.body;
    db.run(`
        INSERT INTO observations (student, type, mood, details, acknowledged, acknowledgement_note)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [o.student, o.type, o.mood, o.details, o.acknowledged ? 1 : 0, o.acknowledgementNote || ""], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM observations WHERE id = ?", [this.lastID], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(rowToObservation(row));
        });
    });
});

app.put("/api/observations/:id", (req, res) => {
    const o = req.body;
    db.run(`
        UPDATE observations
        SET student = COALESCE(?, student),
            type = COALESCE(?, type),
            mood = COALESCE(?, mood),
            details = COALESCE(?, details),
            acknowledged = COALESCE(?, acknowledged),
            acknowledgement_note = COALESCE(?, acknowledgement_note)
        WHERE id = ?
    `, [o.student, o.type, o.mood, o.details, typeof o.acknowledged === "boolean" ? (o.acknowledged ? 1 : 0) : null, o.acknowledgementNote, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.delete("/api/observations/:id", (req, res) => {
    db.run("DELETE FROM observations WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// ATTENDANCE
app.get("/api/attendance/today", (req, res) => {
    db.all("SELECT * FROM attendance WHERE attendance_date = ?", [todayKey()], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const record = {};
        rows.forEach(row => {
            record[row.student_id] = { checkedIn: row.checked_in === 1, time: row.check_in_time };
        });
        res.json(record);
    });
});

app.post("/api/attendance/today", (req, res) => {
    const record = req.body.record || {};
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM attendance WHERE attendance_date = ?", [todayKey()]);
        const stmt = db.prepare(`
            INSERT INTO attendance (student_id, attendance_date, checked_in, check_in_time)
            VALUES (?, ?, ?, ?)
        `);
        Object.keys(record).forEach(studentId => {
            stmt.run([studentId, todayKey(), record[studentId].checkedIn ? 1 : 0, record[studentId].time || null]);
        });
        stmt.finalize(err => {
            if (err) return db.run("ROLLBACK", () => res.status(500).json({ error: err.message }));
            db.run("COMMIT", err2 => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ saved: Object.keys(record).length });
            });
        });
    });
});

// REPORTS
app.get("/api/reports", (req, res) => {
    db.all("SELECT * FROM reports ORDER BY datetime(created_at) ASC, id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(rowToReport));
    });
});

app.post("/api/reports", (req, res) => {
    const r = req.body;
    const types = Array.isArray(r.types) ? r.types.join("|") : (r.types || "");
    db.run(`
        INSERT INTO reports (student, types, notes, time)
        VALUES (?, ?, ?, ?)
    `, [r.student, types, r.notes, r.time || ""], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM reports WHERE id = ?", [this.lastID], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(rowToReport(row));
        });
    });
});

// ISSUE TICKETS
app.get("/api/issue-tickets", (req, res) => {
    db.all("SELECT * FROM issue_tickets ORDER BY datetime(created_at) DESC, id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(rowToIssueTicket));
    });
});

app.post("/api/issue-tickets", (req, res) => {
    const t = req.body;

    db.run(`
        INSERT INTO issue_tickets (name, email, phone, issue_type, description, urgent)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        t.name,
        t.email,
        t.phone || "",
        t.issueType || "",
        t.description,
        t.urgent ? 1 : 0
    ], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.get("SELECT * FROM issue_tickets WHERE id = ?", [this.lastID], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(rowToIssueTicket(row));
        });
    });
});

app.delete("/api/issue-tickets", (req, res) => {
    db.run("DELETE FROM issue_tickets", [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ cleared: this.changes });
    });
});

app.delete("/api/issue-tickets/:id", (req, res) => {
    db.run("DELETE FROM issue_tickets WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ deleted: this.changes });
    });
});


// STAFF
app.get("/api/staff", (req, res) => {
    db.all("SELECT * FROM staff ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(rowToStaff));
    });
});

app.post("/api/staff/replace", (req, res) => {
    const staff = Array.isArray(req.body.staff) ? req.body.staff : [];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM staff");

        const stmt = db.prepare(`
            INSERT INTO staff (name, email, slack_link)
            VALUES (?, ?, ?)
        `);

        staff.forEach(person => {
            stmt.run([
                person.name,
                person.email,
                person.slackLink || ""
            ]);
        });

        stmt.finalize(err => {
            if (err) return db.run("ROLLBACK", () => res.status(500).json({ error: err.message }));

            db.run("COMMIT", err2 => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ inserted: staff.length });
            });
        });
    });
});


// SCHEDULE
// SCHEDULE
app.get("/api/schedule", (req, res) => {
    const range = req.query.range || "day";
    const date = req.query.date || "";

    let sql = "SELECT * FROM schedule";
    const params = [];

    if (date) {
        if (range === "day") {
            sql += " WHERE schedule_date = ?";
            params.push(date);
        }

        if (range === "week") {
            sql += `
                WHERE schedule_date >= date(?, 'weekday 0', '-6 days')
                AND schedule_date <= date(?, 'weekday 0')
            `;
            params.push(date, date);
        }

        if (range === "month") {
            sql += `
                WHERE strftime('%Y-%m', schedule_date) = strftime('%Y-%m', ?)
            `;
            params.push(date);
        }
    }

    sql += " ORDER BY schedule_date ASC, id ASC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(rowToSchedule));
    });
});

app.post("/api/schedule/replace", (req, res) => {
    const schedule = Array.isArray(req.body.schedule) ? req.body.schedule : [];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const weekLabel = schedule[0]?.weekLabel || "";
        const firstDate = schedule[0]?.date || "";

        if (weekLabel || firstDate) {
            db.run(
                "DELETE FROM schedule WHERE week_label = ? OR schedule_date = ?",
                [weekLabel, firstDate]
            );
        }

        const stmt = db.prepare(`
            INSERT INTO schedule (
                week_label,
                schedule_date,
                day_name,
                time_block,
                activity,
                staff_role,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        schedule.forEach(row => {
            stmt.run([
                row.weekLabel || "",
                row.date || "",
                row.dayName || "",
                row.timeBlock || "",
                row.activity || "",
                row.staffRole || "",
                row.status || ""
            ]);
        });

        stmt.finalize(err => {
            if (err) {
                return db.run("ROLLBACK", () => {
                    res.status(500).json({ error: err.message });
                });
            }

            db.run("COMMIT", err2 => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ inserted: schedule.length });
            });
        });
    });
});

// SWAP REQUESTS
app.get("/api/swap-requests", (req, res) => {
    db.all("SELECT * FROM swap_requests ORDER BY datetime(created_at) DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/swap-requests", (req, res) => {
    const r = req.body;
    db.run(`
        INSERT INTO swap_requests (requester_name, requester_role, shift_date, shift_time, reason, status)
        VALUES (?, ?, ?, ?, ?, 'Pending')
    `, [r.requesterName, r.requesterRole || "", r.shiftDate, r.shiftTime, r.reason || ""], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM swap_requests WHERE id = ?", [this.lastID], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(row);
        });
    });
});

app.put("/api/swap-requests/:id", (req, res) => {
    const r = req.body;
    db.run(`
        UPDATE swap_requests SET status = ?, resolved_by = ? WHERE id = ?
    `, [r.status, r.resolvedBy || "", req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.delete("/api/swap-requests/:id", (req, res) => {
    db.run("DELETE FROM swap_requests WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// COVERAGE ALERTS
app.get("/api/coverage-alerts", (req, res) => {
    db.all("SELECT * FROM coverage_alerts ORDER BY alert_date ASC, time_block ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/coverage-alerts", (req, res) => {
    const a = req.body;
    db.run(`
        INSERT INTO coverage_alerts (alert_date, time_block, role_needed, notes, status)
        VALUES (?, ?, ?, ?, 'Open')
    `, [a.alertDate, a.timeBlock, a.roleNeeded, a.notes || ""], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM coverage_alerts WHERE id = ?", [this.lastID], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(row);
        });
    });
});

app.put("/api/coverage-alerts/:id", (req, res) => {
    const a = req.body;
    db.run(`
        UPDATE coverage_alerts SET status = ?, resolved_by = ? WHERE id = ?
    `, [a.status, a.resolvedBy || "", req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.delete("/api/coverage-alerts/:id", (req, res) => {
    db.run("DELETE FROM coverage_alerts WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Isabelle McLean — Morning rec API routes: fetch the active session's list, submit a signup, remove one entry, or clear all.
// Active session uses a 10 AM reset (see recDateKey): this morning's list stays up until 10 AM, then rolls to the next day.
// MORNING REC
app.get("/api/morning-rec", (req, res) => {
    // Isabelle McLean — Returns the active rec session's signups (today before 10 AM, tomorrow after)
    const recDate = recDateKey();
    db.all("SELECT * FROM morning_rec_signups WHERE signup_date = ? ORDER BY created_at ASC", [recDate], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Isabelle McLean — POST stores the active rec date as signup_date (today before 10 AM, tomorrow after the 10 AM reset)
app.post("/api/morning-rec", (req, res) => {
    const { student_name } = req.body;
    if (!student_name || !student_name.trim()) return res.status(400).json({ error: "Student name is required." });

    const recDate = recDateKey();
    const name = student_name.trim();

    db.get("SELECT id FROM morning_rec_signups WHERE student_name = ? AND signup_date = ?", [name, recDate], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(409).json({ error: "You're already signed up for the next rec!" });

        db.run("INSERT INTO morning_rec_signups (student_name, signup_date) VALUES (?, ?)", [name, recDate], function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ id: this.lastID, student_name: name, signup_date: recDate });
        });
    });
});

// Isabelle McLean — Clears the active rec session's signups; kept the /today route name for backwards-compat with the staff page
app.delete("/api/morning-rec/today", (req, res) => {
    const recDate = recDateKey();
    db.run("DELETE FROM morning_rec_signups WHERE signup_date = ?", [recDate], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ cleared: this.changes });
    });
});

app.delete("/api/morning-rec/:id", (req, res) => {
    db.run("DELETE FROM morning_rec_signups WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Isabelle McLean — Committee options API: GET list of committees students can sign up for, POST to replace the whole list (uploaded via admin CSV)
app.get("/api/committee-options", (req, res) => {
    db.all("SELECT * FROM committee_options ORDER BY type ASC, name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Isabelle McLean — Delete a single committee option by ID (used by the "Remove a Committee" button on the admin page)
app.delete("/api/committee-options/:id", (req, res) => {
    db.run("DELETE FROM committee_options WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.post("/api/committee-options/replace", (req, res) => {
    const committees = Array.isArray(req.body.committees) ? req.body.committees : [];
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM committee_options");
        const stmt = db.prepare("INSERT INTO committee_options (name, type, description) VALUES (?, ?, ?)");
        committees.forEach(c => {
            stmt.run([c.name, c.type || "Project", c.description || ""]);
        });
        stmt.finalize(err => {
            if (err) return db.run("ROLLBACK", () => res.status(500).json({ error: err.message }));
            db.run("COMMIT", err2 => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ inserted: committees.length });
            });
        });
    });
});

// Isabelle McLean — Committee signup API routes: fetch all signups, submit a new one (blocks duplicate student+committee combos), remove by ID
// COMMITTEE SIGNUPS
app.get("/api/committee-signups", (req, res) => {
    db.all("SELECT * FROM committee_signups ORDER BY committee_type ASC, committee_name ASC, created_at ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/committee-signups", (req, res) => {
    const { student_name, committee_name, committee_type } = req.body;
    if (!student_name || !committee_name) return res.status(400).json({ error: "Name and committee are required." });

    db.run(
        "INSERT INTO committee_signups (student_name, committee_name, committee_type) VALUES (?, ?, ?)",
        [student_name.trim(), committee_name, committee_type || ""],
        function(err) {
            if (err) {
                if (err.message.includes("UNIQUE")) {
                    return res.status(409).json({ error: "You're already signed up for this committee!" });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, student_name: student_name.trim(), committee_name, committee_type });
        }
    );
});

app.delete("/api/committee-signups/:id", (req, res) => {
    db.run("DELETE FROM committee_signups WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// MEDKITS
app.get("/api/medkits", (req, res) => {
    db.all("SELECT * FROM medkits ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(rowToMedkit));
    });
});

app.post("/api/medkits", (req, res) => {
    const kit = req.body;

    db.run(`
        INSERT INTO medkits (qr_code, name, assigned_staff, location, status, supplies, checked_in, checked_in_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        kit.qrCode,
        kit.name,
        kit.assignedStaff || "",
        kit.location || "",
        kit.status || "Ready",
        kit.supplies || "",
        kit.checkedIn ? 1 : 0,
        kit.checkedIn ? new Date().toISOString() : null
    ], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.get("SELECT * FROM medkits WHERE id = ?", [this.lastID], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(rowToMedkit(row));
        });
    });
});

app.post("/api/medkits/replace", (req, res) => {
    const medkits = Array.isArray(req.body.medkits) ? req.body.medkits : [];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM medkits");

        const stmt = db.prepare(`
            INSERT INTO medkits (qr_code, name, assigned_staff, location, status, supplies, checked_in, checked_in_time)
            VALUES (?, ?, ?, ?, ?, ?, 0, NULL)
        `);

        medkits.forEach(kit => {
            stmt.run([
                kit.qrCode,
                kit.name,
                kit.assignedStaff || "",
                kit.location || "",
                kit.status || "Ready",
                kit.supplies || ""
            ]);
        });

        stmt.finalize(err => {
            if (err) return db.run("ROLLBACK", () => res.status(500).json({ error: err.message }));

            db.run("COMMIT", err2 => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ inserted: medkits.length });
            });
        });
    });
});

app.post("/api/medkits/check-in", (req, res) => {
    const qrCode = (req.body.qrCode || "").trim();

    if (!qrCode) {
        return res.status(400).json({ error: "QR code is required." });
    }

    db.run(`
        UPDATE medkits
        SET checked_in = 1,
            checked_in_time = ?
        WHERE qr_code = ?
    `, [new Date().toISOString(), qrCode], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        if (this.changes === 0) {
            return res.status(404).json({ error: "No med kit found with that QR code." });
        }

        db.get("SELECT * FROM medkits WHERE qr_code = ?", [qrCode], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(rowToMedkit(row));
        });
    });
});

app.post("/api/medkits/reset-checkins", (req, res) => {
    db.run(`
        UPDATE medkits
        SET checked_in = 0,
            checked_in_time = NULL
    `, [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ reset: this.changes });
    });
});

app.delete("/api/medkits/:id", (req, res) => {
    db.run("DELETE FROM medkits WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
