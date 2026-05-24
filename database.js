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
            name TEXT NOT NULL,
            role TEXT DEFAULT '',
            status TEXT DEFAULT 'duty',
            hours TEXT DEFAULT ''
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

    // Isabelle McLean — Committee signups table: stores student committee registrations; unique constraint blocks duplicate entries
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
});

module.exports = db;
