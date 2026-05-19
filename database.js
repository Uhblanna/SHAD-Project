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
});

module.exports = db;
