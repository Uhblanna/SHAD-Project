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
    // Migrate existing databases that pre-date the completed_at column
    db.run(`ALTER TABLE daily_todos ADD COLUMN completed_at TEXT NOT NULL DEFAULT ''`, function() {});

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
});

module.exports = db;
