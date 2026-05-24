const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const db = require("./database");

const app = express();
const PORT = 3000;

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

// Isabelle McLean — Returns date string for TOMORROW; used by morning rec routes since students sign up the night before
function tomorrowKey() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
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
        name: row.name,
        role: row.role || "",
        status: row.status || "duty",
        hours: row.hours || ""
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
app.get("/api/schedule", (req, res) => {
    db.all("SELECT * FROM schedule ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(rowToSchedule));
    });
});

app.post("/api/schedule/replace", (req, res) => {
    const schedule = Array.isArray(req.body.schedule) ? req.body.schedule : [];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM schedule");

        const stmt = db.prepare(`
            INSERT INTO schedule (name, role, status, hours)
            VALUES (?, ?, ?, ?)
        `);

        schedule.forEach(shift => {
            stmt.run([
                shift.name,
                shift.role || "",
                shift.status || "duty",
                shift.hours || ""
            ]);
        });

        stmt.finalize(err => {
            if (err) return db.run("ROLLBACK", () => res.status(500).json({ error: err.message }));

            db.run("COMMIT", err2 => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ inserted: schedule.length });
            });
        });
    });
});

// Isabelle McLean — Morning rec API routes: fetch tomorrow's list (since rec is for the next morning), submit a signup, remove one entry, or clear all
// MORNING REC
app.get("/api/morning-rec", (req, res) => {
    // Isabelle McLean — Returns TOMORROW's signups (the upcoming morning rec); kids sign up the evening before
    const tomorrow = tomorrowKey();
    db.all("SELECT * FROM morning_rec_signups WHERE signup_date = ? ORDER BY created_at ASC", [tomorrow], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Isabelle McLean — POST stores TOMORROW's date as signup_date because students sign up the night before for the next morning's rec
app.post("/api/morning-rec", (req, res) => {
    const { student_name } = req.body;
    if (!student_name || !student_name.trim()) return res.status(400).json({ error: "Student name is required." });

    const tomorrow = tomorrowKey();
    const name = student_name.trim();

    db.get("SELECT id FROM morning_rec_signups WHERE student_name = ? AND signup_date = ?", [name, tomorrow], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(409).json({ error: "You're already signed up for tomorrow!" });

        db.run("INSERT INTO morning_rec_signups (student_name, signup_date) VALUES (?, ?)", [name, tomorrow], function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ id: this.lastID, student_name: name, signup_date: tomorrow });
        });
    });
});

// Isabelle McLean — Clears TOMORROW's signups (the upcoming rec session); kept the /today route name for backwards-compat with the staff page
app.delete("/api/morning-rec/today", (req, res) => {
    const tomorrow = tomorrowKey();
    db.run("DELETE FROM morning_rec_signups WHERE signup_date = ?", [tomorrow], function(err) {
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
