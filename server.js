const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const db = require("./database");

const app = express();
const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: "stephanie.powers@reddeer.shad.ca",
        pass: "YOUR_GMAIL_APP_PASSWORD"
    }
});
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
        db.run("DELETE FROM committee_signups");
        db.run("DELETE FROM committee_assignments");
        db.run("DELETE FROM morning_rec_signups");
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

app.post("/api/students/add", (req, res) => {
    const students = Array.isArray(req.body.students) ? req.body.students : [];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const stmt = db.prepare(`
            INSERT INTO students (
                name,
                pronouns,
                group_name,
                age,
                instrument,
                medication,
                medication_taken,
                dietary,
                note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        students.forEach(s => {
            stmt.run([
                s.name,
                s.pronouns || "",
                s.group || "Group 1",
                s.age || null,
                s.instrument || "",
                s.medication || "None",
                s.medicationTaken ? 1 : 0,
                s.dietary || "None",
                s.note || ""
            ]);
        });

        stmt.finalize(err => {
            if (err) {
                return db.run("ROLLBACK", () =>
                    res.status(500).json({ error: err.message })
                );
            }

            db.run("COMMIT", err2 => {
                if (err2) {
                    return res.status(500).json({ error: err2.message });
                }

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

// Isabelle McLean — Clear all staff records
app.delete("/api/staff/all", (req, res) => {
    db.run("DELETE FROM staff", [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Isabelle McLean — Clear all schedule records
app.delete("/api/schedule/all", (req, res) => {
    db.run("DELETE FROM schedule", [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
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
        INSERT INTO swap_requests (
            requester_name,
            requester_role,
            swap_with,
            shift_date,
            shift_time,
            reason,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `,
    [
        r.requesterName,
        r.requesterRole || "",
        r.swapWith || "",
        r.shiftDate,
        r.shiftTime,
        r.reason || ""
    ],
    function(err) {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        transporter.sendMail({
            from: "stephanie.powers@reddeer.shad.ca",

            to: "stephanie.powers@reddeer.shad.ca",

            subject: "New Shift Swap Request",

            text:
`New shift swap request submitted.

Requester:
${r.requesterName}

Swap With:
${r.swapWith || "Not specified"}

Role:
${r.requesterRole || "N/A"}

Date:
${r.shiftDate}

Shift:
${r.shiftTime}

Reason:
${r.reason || "No reason provided"}
`
        });

        db.get(
            "SELECT * FROM swap_requests WHERE id = ?",
            [this.lastID],
            (err2, row) => {

                if (err2) {
                    return res.status(500).json({
                        error: err2.message
                    });
                }

                res.json(row);
            }
        );
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
// Also enforces the staff-set capacity (staff_count * 8); rejects if session is full.
app.post("/api/morning-rec", (req, res) => {
    const { student_name } = req.body;
    if (!student_name || !student_name.trim()) return res.status(400).json({ error: "Student name is required." });

    const recDate = recDateKey();
    const name = student_name.trim();

    // Check for duplicate first, then check capacity
    db.get("SELECT id FROM morning_rec_signups WHERE student_name = ? AND signup_date = ?", [name, recDate], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(409).json({ error: "You're already signed up for the next rec!" });

        // Get the staff count config for this date (default to 1 staff = 8 spots)
        db.get("SELECT staff_count FROM morning_rec_config WHERE config_date = ?", [recDate], (err2, configRow) => {
            if (err2) return res.status(500).json({ error: err2.message });
            const capacity = (configRow ? configRow.staff_count : 1) * 8;

            // Count current signups for this date
            db.get("SELECT COUNT(*) AS cnt FROM morning_rec_signups WHERE signup_date = ?", [recDate], (err3, countRow) => {
                if (err3) return res.status(500).json({ error: err3.message });
                if (countRow.cnt >= capacity) {
                    return res.status(409).json({ error: "Sorry, this session is full! No spots remaining." });
                }

                db.run("INSERT INTO morning_rec_signups (student_name, signup_date) VALUES (?, ?)", [name, recDate], function(err4) {
                    if (err4) return res.status(500).json({ error: err4.message });
                    res.json({ id: this.lastID, student_name: name, signup_date: recDate });
                });
            });
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

// Isabelle McLean — Morning rec config: GET returns the staff count + calculated capacity for the active session date
app.get("/api/morning-rec/config", (req, res) => {
    const recDate = recDateKey();
    db.get("SELECT staff_count FROM morning_rec_config WHERE config_date = ?", [recDate], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const staffCount = row ? row.staff_count : 1;
        res.json({ config_date: recDate, staff_count: staffCount, capacity: staffCount * 8 });
    });
});

// Isabelle McLean — Morning rec config: PUT lets staff set the number of staff working that morning; capacity = staff_count * 8
app.put("/api/morning-rec/config", (req, res) => {
    const staffCount = parseInt(req.body.staff_count, 10);
    if (!staffCount || staffCount < 1) return res.status(400).json({ error: "staff_count must be a positive integer." });
    const recDate = recDateKey();
    db.run(
        "INSERT INTO morning_rec_config (config_date, staff_count) VALUES (?, ?) ON CONFLICT(config_date) DO UPDATE SET staff_count = excluded.staff_count",
        [recDate, staffCount],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ config_date: recDate, staff_count: staffCount, capacity: staffCount * 8 });
        }
    );
});

// Isabelle McLean — Committee enrollment config: GET returns the open/close dates, PUT lets admin update them
app.get("/api/committee-enrollment-config", (req, res) => {
    db.get("SELECT open_date, close_date FROM committee_enrollment_config WHERE id = 1", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { open_date: '2026-01-01T00:00:00', close_date: '2026-07-01T23:59:00' });
    });
});

app.put("/api/committee-enrollment-config", (req, res) => {
    const { open_date, close_date } = req.body;
    if (!open_date || !close_date) return res.status(400).json({ error: "Both open_date and close_date are required." });
    db.run(
        "UPDATE committee_enrollment_config SET open_date = ?, close_date = ? WHERE id = 1",
        [open_date, close_date],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ open_date, close_date });
        }
    );
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
    db.get("SELECT name FROM committee_options WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const committeeName = row ? row.name : null;

        db.run("DELETE FROM committee_options WHERE id = ?", [req.params.id], function(delErr) {
            if (delErr) return res.status(500).json({ error: delErr.message });

            if (!committeeName) return res.json({ deleted: this.changes });

            // Clear any signups and assignments referencing this committee
            db.run("DELETE FROM committee_signups WHERE committee_name = ?", [committeeName]);
            db.run("DELETE FROM committee_assignments WHERE committee_name = ?", [committeeName]);
            res.json({ deleted: 1 });
        });
    });
});

// Isabelle McLean — Clear only committee signups and assignments without touching the committee options list itself
app.delete("/api/committee-signups/all", (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM committee_signups");
        db.run("DELETE FROM committee_assignments", [], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true });
        });
    });
});

// Isabelle McLean — Replace all committee options atomically; also wipes all student signups and assignments so stale choices don't carry over to new committees
app.post("/api/committee-options/replace", (req, res) => {
    const committees = Array.isArray(req.body.committees) ? req.body.committees : [];
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM committee_options");
        db.run("DELETE FROM committee_signups");
        db.run("DELETE FROM committee_assignments");
        const stmt = db.prepare("INSERT INTO committee_options (name, type, description) VALUES (?, ?, ?)");
        committees.forEach(c => {
            stmt.run([c.name, c.type || "", c.description || ""]);
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

    const name = student_name.trim();

    // Isabelle McLean — Enforce max 3 committee preferences per student before inserting
    db.get("SELECT COUNT(*) AS cnt FROM committee_signups WHERE student_name = ?", [name], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.cnt >= 3) return res.status(409).json({ error: "You've already selected 3 committees. That's the maximum!" });

        db.run(
            "INSERT INTO committee_signups (student_name, committee_name, committee_type) VALUES (?, ?, ?)",
            [name, committee_name, committee_type || ""],
            function(err2) {
                if (err2) {
                    if (err2.message.includes("UNIQUE")) {
                        return res.status(409).json({ error: "You've already selected this committee!" });
                    }
                    return res.status(500).json({ error: err2.message });
                }
                res.json({ id: this.lastID, student_name: name, committee_name, committee_type, count: row.cnt + 1 });
            }
        );
    });
});

// Isabelle McLean — Delete one committee preference by ID; if the student has no preferences left afterwards, their assignment is also cleared
app.delete("/api/committee-signups/:id", (req, res) => {
    // Find the student name before deleting so we can cascade to assignments if needed
    db.get("SELECT student_name FROM committee_signups WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const studentName = row ? row.student_name : null;

        db.run("DELETE FROM committee_signups WHERE id = ?", [req.params.id], function(delErr) {
            if (delErr) return res.status(500).json({ error: delErr.message });

            if (!studentName) return res.json({ deleted: this.changes });

            // If the student now has no preferences left, clear their assignment too
            db.get("SELECT COUNT(*) AS cnt FROM committee_signups WHERE student_name = ?", [studentName], (cntErr, cntRow) => {
                if (!cntErr && cntRow && cntRow.cnt === 0) {
                    db.run("DELETE FROM committee_assignments WHERE student_name = ?", [studentName]);
                }
                res.json({ deleted: 1 });
            });
        });
    });
});

// Isabelle McLean — Committee assignments: GET all staff-assigned placements, PUT to assign/update a student's final committee
app.get("/api/committee-assignments", (req, res) => {
    db.all("SELECT * FROM committee_assignments ORDER BY committee_type ASC, committee_name ASC, student_name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put("/api/committee-assignments", (req, res) => {
    const { student_name, committee_name, committee_type } = req.body;
    if (!student_name || !committee_name) return res.status(400).json({ error: "student_name and committee_name are required." });
    db.run(
        "INSERT INTO committee_assignments (student_name, committee_name, committee_type) VALUES (?, ?, ?) ON CONFLICT(student_name) DO UPDATE SET committee_name = excluded.committee_name, committee_type = excluded.committee_type, assigned_at = CURRENT_TIMESTAMP",
        [student_name.trim(), committee_name, committee_type || ""],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ student_name: student_name.trim(), committee_name, committee_type });
        }
    );
});

app.delete("/api/committee-assignments/:student_name", (req, res) => {
    db.run("DELETE FROM committee_assignments WHERE student_name = ?", [decodeURIComponent(req.params.student_name)], function(err) {
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

// Isabelle McLean — Clear all med kit records
app.delete("/api/medkits/all", (req, res) => {
    db.run("DELETE FROM medkits", [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
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

// Isabelle McLean — Daily to-do list routes: GET all tasks, POST a new task, PATCH to check off with staff name, DELETE one or all
app.get("/api/todos", (req, res) => {
    // Optional ?date=YYYY-MM-DD filter; omitting returns all tasks (used by staff history)
    const date = (req.query.date || "").trim();
    if (date) {
        db.all("SELECT * FROM daily_todos WHERE date = ? ORDER BY created_at ASC", [date], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        db.all("SELECT * FROM daily_todos ORDER BY created_at ASC", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

app.post("/api/todos", (req, res) => {
    const task = (req.body.task || "").trim();
    if (!task) return res.status(400).json({ error: "Task text is required." });
    const today = new Date().toISOString().slice(0, 10);
    db.run("INSERT INTO daily_todos (task, date) VALUES (?, ?)", [task, today], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, task, date: today, completed: 0, completed_by: "" });
    });
});

app.patch("/api/todos/:id", (req, res) => {
    const { completed, completed_by } = req.body;
    const id = req.params.id;
    const now = completed ? new Date().toISOString() : "";
    const name = completed ? (completed_by || "").trim() : "";

    db.run(
        "UPDATE daily_todos SET completed = ?, completed_by = ?, completed_at = ? WHERE id = ?",
        [completed ? 1 : 0, name, now, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });

            if (completed) {
                // Write a permanent history record when a task is checked off
                db.get("SELECT task FROM daily_todos WHERE id = ?", [id], (err2, row) => {
                    if (!err2 && row) {
                        db.run(
                            "INSERT INTO task_history (todo_id, task, completed_by, completed_at) VALUES (?, ?, ?, ?)",
                            [id, row.task, name, now]
                        );
                    }
                });
            } else {
                // Remove the history record if the staff member undoes the completion
                db.run("DELETE FROM task_history WHERE todo_id = ?", [id]);
            }

            res.json({ id, completed: completed ? 1 : 0, completed_by: name, completed_at: now });
        }
    );
});

// Isabelle McLean — Permanent task history log: all completions across all days, survives daily list clears
app.get("/api/task-history", (req, res) => {
    db.all("SELECT * FROM task_history ORDER BY completed_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete("/api/task-history/all", (req, res) => {
    db.run("DELETE FROM task_history", [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ cleared: this.changes });
    });
});

app.delete("/api/todos/all", (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    db.run("DELETE FROM daily_todos WHERE date = ?", [today], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ cleared: this.changes });
    });
});

app.delete("/api/todos/:id", (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM daily_todos WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        // Also remove any completion history so deleted tasks don't linger in the log
        db.run("DELETE FROM task_history WHERE todo_id = ?", [id]);
        res.json({ deleted: this.changes });
    });
});


// ── ATTENDANCE SESSIONS (Morning / Evening) ─────────────────────────────────

// GET all sessions, or filter by ?date=YYYY-MM-DD and/or ?type=morning|evening
app.get("/api/attendance-sessions", (req, res) => {
    let sql = "SELECT * FROM attendance_sessions";
    const params = [];
    const filters = [];
    if (req.query.date) { filters.push("session_date = ?"); params.push(req.query.date); }
    if (req.query.type) { filters.push("session_type = ?"); params.push(req.query.type); }
    if (filters.length) sql += " WHERE " + filters.join(" AND ");
    sql += " ORDER BY session_date DESC, submitted_at DESC";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ ...r, students_json: JSON.parse(r.students_json || "{}") })));
    });
});

// POST — save or overwrite a session snapshot (upsert by date + type)
app.post("/api/attendance-sessions", (req, res) => {
    const { session_date, session_type, students_json } = req.body;
    if (!session_date || !session_type) return res.status(400).json({ error: "session_date and session_type required" });
    const json = JSON.stringify(students_json || {});
    const checkedIn = Object.values(students_json || {}).filter(v => v && v.checkedIn).length;
    const total = Object.keys(students_json || {}).length;
    db.run(`
        INSERT INTO attendance_sessions (session_date, session_type, checked_in_count, total_count, students_json, submitted_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(session_date, session_type) DO UPDATE SET
            checked_in_count = excluded.checked_in_count,
            total_count = excluded.total_count,
            students_json = excluded.students_json,
            submitted_at = excluded.submitted_at
    `, [session_date, session_type, checkedIn, total, json], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM attendance_sessions WHERE session_date = ? AND session_type = ?", [session_date, session_type], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ ...row, students_json: JSON.parse(row.students_json || "{}") });
        });
    });
});

// ── ACTIVITY ROLL CALL ────────────────────────────────────────────────────────

// GET today's roll call sessions (or all if ?all=1, or by ?date=)
app.get("/api/activity-rollcall", (req, res) => {
    let sql, params = [];
    if (req.query.all === "1") {
        sql = "SELECT * FROM activity_rollcall ORDER BY checkin_date DESC, checkin_number ASC";
    } else {
        const date = req.query.date || todayKey();
        sql = "SELECT * FROM activity_rollcall WHERE checkin_date = ? ORDER BY checkin_number ASC";
        params.push(date);
    }
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ ...r, students_json: JSON.parse(r.students_json || "{}") })));
    });
});

// POST — start a new roll call for today (assigns next available checkin_number 1-6)
app.post("/api/activity-rollcall/start", (req, res) => {
    const date = todayKey();
    const label = req.body.label || "";
    db.get("SELECT MAX(checkin_number) AS maxNum FROM activity_rollcall WHERE checkin_date = ?", [date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const nextNum = (row && row.maxNum ? row.maxNum : 0) + 1;
        if (nextNum > 6) return res.status(409).json({ error: "Maximum of 6 roll calls per day reached." });
        db.run(
            "INSERT INTO activity_rollcall (checkin_date, checkin_number, checkin_label, students_json) VALUES (?, ?, ?, '{}')",
            [date, nextNum, label],
            function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                db.get("SELECT * FROM activity_rollcall WHERE id = ?", [this.lastID], (err3, r) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ ...r, students_json: {} });
                });
            }
        );
    });
});

// PUT — update students_json for a roll call (live check-ins) and optionally submit
app.put("/api/activity-rollcall/:id", (req, res) => {
    const { students_json, submitted } = req.body;
    const json = JSON.stringify(students_json || {});
    const submittedAt = submitted ? new Date().toISOString() : null;
    db.run(
        "UPDATE activity_rollcall SET students_json = ?, submitted_at = COALESCE(?, submitted_at) WHERE id = ?",
        [json, submittedAt, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get("SELECT * FROM activity_rollcall WHERE id = ?", [req.params.id], (err2, r) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ ...r, students_json: JSON.parse(r.students_json || "{}") });
            });
        }
    );
});

// DELETE a roll call session
app.delete("/api/activity-rollcall/:id", (req, res) => {
    db.run("DELETE FROM activity_rollcall WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// ── Midnight auto-clear for approved swap requests ─────────────────────────
// Deletes swap_requests with status = 'Approved' once per day at midnight.
// Also exposed as a POST endpoint so the admin page can trigger it manually.
function scheduleApprovedSwapsClear() {
    const now = new Date();
    const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now;
    setTimeout(() => {
        db.run("DELETE FROM swap_requests WHERE status = 'Approved'", [], function(err) {
            if (err) console.error("Auto-clear approved swaps error:", err.message);
            else console.log(`[midnight] Cleared ${this.changes} approved swap request(s).`);
        });
        scheduleApprovedSwapsClear(); // re-schedule for next midnight
    }, msUntilMidnight);
}
scheduleApprovedSwapsClear();

// Manual trigger endpoint (called from admin page)
app.post("/api/swap-requests/clear-approved", (req, res) => {
    db.run("DELETE FROM swap_requests WHERE status = 'Approved'", [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ cleared: this.changes });
    });
});

// ── SHAD 2026 PROGRAM SCHEDULE ────────────────────────────────────────────────
// GET — all weeks ordered by week_num
app.get("/api/shad-schedule", (req, res) => {
    db.all("SELECT * FROM shad_schedule ORDER BY week_num ASC, week_label ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST — upsert a week (insert or replace by week_label)
app.post("/api/shad-schedule", (req, res) => {
    const { week_label, week_num, schedule_data } = req.body;
    if (!week_label || !schedule_data) {
        return res.status(400).json({ error: "week_label and schedule_data are required." });
    }
    const num = typeof week_num === "number" ? week_num : parseInt(week_num, 10) || 0;
    db.run(
        `INSERT INTO shad_schedule (week_label, week_num, schedule_data)
         VALUES (?, ?, ?)
         ON CONFLICT(week_label) DO UPDATE SET
             week_num = excluded.week_num,
             schedule_data = excluded.schedule_data,
             uploaded_at = CURRENT_TIMESTAMP`,
        [week_label.trim(), num, schedule_data],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get("SELECT * FROM shad_schedule WHERE week_label = ?", [week_label.trim()], (err2, row) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json(row);
            });
        }
    );
});

// DELETE — remove one week
app.delete("/api/shad-schedule/:id", (req, res) => {
    db.run("DELETE FROM shad_schedule WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// DELETE — clear all weeks
app.delete("/api/shad-schedule/all", (req, res) => {
    db.run("DELETE FROM shad_schedule", [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ cleared: this.changes });
    });
});

// ── ATTENDANCE TRENDS ─────────────────────────────────────────────────────────
// Returns students who missed MORE THAN 2 check-ins, with per-session detail.
// Only sessions that have actual student data are counted.
app.get("/api/attendance-trends", (req, res) => {
    db.all(
        "SELECT * FROM attendance_sessions ORDER BY session_date ASC, session_type ASC",
        [],
        (err, sessions) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all("SELECT id, name, group_name FROM students ORDER BY name ASC", [], (err2, students) => {
                if (err2) return res.status(500).json({ error: err2.message });

                // Only count sessions that have real data recorded
                const parsed = sessions
                    .map(s => ({ ...s, sj: JSON.parse(s.students_json || "{}") }))
                    .filter(s => Object.keys(s.sj).length > 0);

                if (parsed.length === 0 || students.length === 0) {
                    return res.json({ sessions: [], atRisk: [] });
                }

                const atRisk = students.map(student => {
                    const sid = String(student.id);
                    const attendance = parsed.map(session => {
                        const record = session.sj[sid];
                        if (!record) return false;          // not in record = absent
                        return record.checkedIn === true;
                    });
                    const missed = attendance.filter(a => !a).length;
                    return {
                        id:         student.id,
                        name:       student.name,
                        group:      student.group_name || "",
                        attendance,
                        missed
                    };
                })
                .filter(s => s.missed > 2)
                .sort((a, b) => b.missed - a.missed);

                res.json({
                    sessions: parsed.map(s => ({
                        label: s.session_date + (s.session_type === "morning" ? " AM" : " PM"),
                        type:  s.session_type
                    })),
                    atRisk
                });
            });
        }
    );
});

// ── MEDICATION LOGS ───────────────────────────────────────────────────────────
// GET all logs, optionally filtered by student name substring (?student=)
app.get("/api/medication-logs", (req, res) => {
    const { student } = req.query;
    let sql = "SELECT * FROM medication_logs";
    const params = [];
    if (student) {
        sql += " WHERE student_name LIKE ?";
        params.push("%" + student + "%");
    }
    sql += " ORDER BY administered_at DESC, id DESC";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST — add a new medication administration log entry
app.post("/api/medication-logs", (req, res) => {
    const { student_name, medication, administered_at, notes } = req.body;
    if (!student_name || !medication || !administered_at) {
        return res.status(400).json({ error: "student_name, medication, and administered_at are required." });
    }
    db.run(
        "INSERT INTO medication_logs (student_name, medication, administered_by, administered_at, notes) VALUES (?, ?, ?, ?, ?)",
        [student_name.trim(), medication.trim(), "", administered_at, (notes || "").trim()],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get("SELECT * FROM medication_logs WHERE id = ?", [this.lastID], (err2, row) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json(row);
            });
        }
    );
});

// DELETE — remove a single medication log entry by id
app.delete("/api/medication-logs/:id", (req, res) => {
    db.run("DELETE FROM medication_logs WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
