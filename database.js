const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "shad_portal.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            pronouns TEXT DEFAULT '',
            group_name TEXT DEFAULT 'Group 1',
            age INTEGER,
            instrument TEXT DEFAULT '',
            medication TEXT DEFAULT 'None',
            medication_taken INTEGER DEFAULT 0,
            dietary TEXT DEFAULT 'None',
            note TEXT DEFAULT ''
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS observations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student TEXT NOT NULL,
            type TEXT NOT NULL,
            mood TEXT NOT NULL,
            details TEXT NOT NULL,
            acknowledged INTEGER DEFAULT 0,
            acknowledgement_note TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            attendance_date TEXT NOT NULL,
            checked_in INTEGER DEFAULT 0,
            check_in_time TEXT,
            UNIQUE(student_id, attendance_date),
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student TEXT NOT NULL,
            types TEXT DEFAULT '',
            notes TEXT NOT NULL,
            time TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
        db.run(`
        CREATE TABLE IF NOT EXISTS issue_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT DEFAULT '',
            issue_type TEXT DEFAULT '',
            description TEXT NOT NULL,
            urgent INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

        db.run(`
        CREATE TABLE IF NOT EXISTS medkits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qr_code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            assigned_staff TEXT DEFAULT '',
            location TEXT DEFAULT '',
            status TEXT DEFAULT 'Ready',
            supplies TEXT DEFAULT '',
            checked_in INTEGER DEFAULT 0,
            checked_in_time TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            slack_link TEXT DEFAULT ''
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            week_label TEXT DEFAULT '',
            schedule_date TEXT DEFAULT '',
            day_name TEXT DEFAULT '',
            time_block TEXT DEFAULT '',
            activity TEXT DEFAULT '',
            staff_role TEXT DEFAULT '',
            status TEXT DEFAULT ''
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS swap_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            requester_name TEXT NOT NULL,
            requester_role TEXT DEFAULT '',

            swap_with TEXT DEFAULT '',

            shift_date TEXT NOT NULL,
            shift_time TEXT NOT NULL,

            reason TEXT DEFAULT '',

            status TEXT DEFAULT 'Pending',

            resolved_by TEXT DEFAULT '',

            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS coverage_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_date TEXT NOT NULL,
            time_block TEXT NOT NULL,
            role_needed TEXT NOT NULL,
            notes TEXT DEFAULT '',
            status TEXT DEFAULT 'Open',
            resolved_by TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Isabelle McLean — Morning rec signups table: stores each student's daily sign-up; auto-resets each day via date filter
    db.run(`
        CREATE TABLE IF NOT EXISTS morning_rec_signups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL,
            signup_date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Isabelle McLean — Morning rec config table: stores the staff count set by staff before each session; capacity = staff_count * 8
    db.run(`
        CREATE TABLE IF NOT EXISTS morning_rec_config (
            config_date TEXT PRIMARY KEY,
            staff_count INTEGER NOT NULL DEFAULT 1
        )
    `);

    // Isabelle McLean — Committee options table: list of committees students can sign up for; populated via admin CSV upload
    db.run(`
        CREATE TABLE IF NOT EXISTS committee_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'Project',
            description TEXT DEFAULT ''
        )
    `);

    // Isabelle McLean — Committee signups table: stores up to 3 committee preferences per student; unique constraint blocks duplicate entries
    db.run(`
        CREATE TABLE IF NOT EXISTS committee_signups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL,
            committee_name TEXT NOT NULL,
            committee_type TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_name, committee_name)
        )
    `);

    // Isabelle McLean — Daily to-do list: tasks posted by admin; staff check them off with their name; cleared manually by admin
    db.run(`
        CREATE TABLE IF NOT EXISTS daily_todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            completed_by TEXT NOT NULL DEFAULT '',
            completed_at TEXT NOT NULL DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    // Migrate existing databases: add team columns to students
    db.run(`ALTER TABLE students ADD COLUMN design_team TEXT NOT NULL DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN req_team TEXT NOT NULL DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN house_team TEXT NOT NULL DEFAULT ''`, function() {});
    // Migrate existing databases: add room_number column
    db.run(`ALTER TABLE students ADD COLUMN room_number TEXT NOT NULL DEFAULT ''`, function() {});
    // Migrate existing databases: add full SHAD application fields
    db.run(`ALTER TABLE students ADD COLUMN app_id TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN first_name TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN last_name TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN pref_name TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN gender TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN self_id_gender TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN self_id_pronoun TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN dob TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN pd_notes TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN city TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN province TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN email TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN phone TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN school TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN grade TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN ethnicity TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN self_desc_ethnicity TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN indigenous TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN self_desc_indigenous TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN language_pref TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN parent_first_name TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN parent_last_name TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN parent_relationship TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN parent_email TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN parent_phone TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN lgbtq TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN city_size TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN region TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN hoodie_size TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN allergies TEXT DEFAULT ''`, function() {});
    db.run(`ALTER TABLE students ADD COLUMN epipen TEXT DEFAULT ''`, function() {});

    // Migrate observations: admin follow-up fields
    db.run(`ALTER TABLE observations ADD COLUMN admin_note TEXT NOT NULL DEFAULT ''`, function() {});
    db.run(`ALTER TABLE observations ADD COLUMN admin_dismissed INTEGER NOT NULL DEFAULT 0`, function() {});

    // Purchase receipts: uploaded by staff after a shopping trip
    db.run(`
        CREATE TABLE IF NOT EXISTS receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchased_by TEXT NOT NULL,
            total_cost REAL NOT NULL DEFAULT 0,
            image_data BLOB,
            image_type TEXT DEFAULT '',
            image_name TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migrate existing databases: add checked_in_by to medkits
    db.run(`ALTER TABLE medkits ADD COLUMN checked_in_by TEXT NOT NULL DEFAULT ''`, function() {});

    // Migrate existing databases that pre-date the completed_at column
    db.run(`ALTER TABLE daily_todos ADD COLUMN completed_at TEXT NOT NULL DEFAULT ''`, function() {});
    // Migrate: add claimed_by for "I'm doing it" pending state
    db.run(`ALTER TABLE daily_todos ADD COLUMN claimed_by TEXT NOT NULL DEFAULT ''`, function() {});
    // Migrate existing databases that pre-date the date column; backfill with today so old tasks don't disappear
    db.run(`ALTER TABLE daily_todos ADD COLUMN date TEXT NOT NULL DEFAULT ''`, function() {
        db.run(`UPDATE daily_todos SET date = date('now') WHERE date = ''`);
    });

    // Isabelle McLean — Permanent task history log: written on completion, row removed on undo; never cleared with the daily list
    db.run(`
        CREATE TABLE IF NOT EXISTS task_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            todo_id INTEGER NOT NULL,
            task TEXT NOT NULL,
            completed_by TEXT NOT NULL,
            completed_at TEXT NOT NULL
        )
    `);

    // Isabelle McLean — Shopping requests: shared live list across all staff devices
    db.run(`
        CREATE TABLE IF NOT EXISTS shopping_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            requested_by TEXT NOT NULL DEFAULT '',
            reason TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            priority INTEGER NOT NULL DEFAULT 0,
            purchased INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Isabelle McLean — Shopping archive: purchased items moved here when staff click "Remove Purchased Items"; never deleted so export always has full history
    db.run(`
        CREATE TABLE IF NOT EXISTS shopping_archive (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            requested_by TEXT NOT NULL DEFAULT '',
            reason TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            priority INTEGER NOT NULL DEFAULT 0,
            purchased_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Isabelle McLean — Committee enrollment window: stores the open and close datetimes set by admin; student portal reads these instead of hardcoded values
    db.run(`
        CREATE TABLE IF NOT EXISTS committee_enrollment_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            open_date TEXT NOT NULL DEFAULT '2026-01-01T00:00:00',
            close_date TEXT NOT NULL DEFAULT '2026-07-01T23:59:00'
        )
    `);
    db.run(`INSERT OR IGNORE INTO committee_enrollment_config (id, open_date, close_date) VALUES (1, '2026-01-01T00:00:00', '2026-07-01T23:59:00')`);

    // Isabelle McLean — Committee assignments table: staff places each student into exactly one final committee from their 3 preferences
    db.run(`
        CREATE TABLE IF NOT EXISTS committee_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL UNIQUE,
            committee_name TEXT NOT NULL,
            committee_type TEXT NOT NULL DEFAULT '',
            assigned_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ── Attendance sessions: morning + evening check-ins stored separately per session type + date
    // Each row = one full session snapshot; students are stored as JSON in the `students_json` column
    db.run(`
        CREATE TABLE IF NOT EXISTS attendance_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_date TEXT NOT NULL,
            session_type TEXT NOT NULL,
            checked_in_count INTEGER DEFAULT 0,
            total_count INTEGER DEFAULT 0,
            students_json TEXT DEFAULT '{}',
            submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(session_date, session_type)
        )
    `);

    // ── Activity roll call: up to 6 check-ins per day, reset at midnight but historical rows kept
    // checkin_number = 1–6 for that day; students_json = map of studentId → {checkedIn, time}
    db.run(`
        CREATE TABLE IF NOT EXISTS activity_rollcall (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checkin_date TEXT NOT NULL,
            checkin_number INTEGER NOT NULL,
            checkin_label TEXT DEFAULT '',
            started_at TEXT DEFAULT CURRENT_TIMESTAMP,
            submitted_at TEXT,
            students_json TEXT DEFAULT '{}',
            UNIQUE(checkin_date, checkin_number)
        )
    `);

    // ── SHAD 2026 Program Schedule: each row = one uploaded week, stored as a JSON blob
    // schedule_data holds { headers, dates, timeSlots } parsed from the timetable-grid CSV
    db.run(`
        CREATE TABLE IF NOT EXISTS shad_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            week_label TEXT NOT NULL UNIQUE,
            week_num   INTEGER DEFAULT 0,
            schedule_data TEXT NOT NULL,
            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Isabelle McLean — App settings: simple key/value store; currently holds the staff + admin passwords so they can be changed from the admin panel
    db.run(`
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `);

    // Isabelle McLean — Electives: admin-created sign-up opportunities separate from the main committees
    db.run(`
        CREATE TABLE IF NOT EXISTS electives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            capacity INTEGER DEFAULT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.run(`ALTER TABLE electives ADD COLUMN capacity INTEGER DEFAULT NULL`, function() {});

    db.run(`
        CREATE TABLE IF NOT EXISTS elective_signups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            elective_id INTEGER NOT NULL,
            student_name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(elective_id, student_name),
            FOREIGN KEY (elective_id) REFERENCES electives(id) ON DELETE CASCADE
        )
    `);

    // ── Medication administration log: records every time a student takes a medication,
    // who administered it, and when. Replaces the old binary medication_taken flag.
    db.run(`
        CREATE TABLE IF NOT EXISTS medication_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL,
            medication TEXT NOT NULL,
            administered_by TEXT NOT NULL,
            administered_at TEXT NOT NULL,
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

});

module.exports = db;
