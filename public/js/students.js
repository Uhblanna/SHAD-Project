const students = [
    {
        name: "Maya Chen",
        group: "Group 1",
        age: 16,
        status: "Present",
        note: "Strong leadership during morning group activity."
    },
    {
        name: "Ethan Brooks",
        group: "Group 2",
        age: 17,
        status: "Missing",
        note: "Arrived late to breakfast. Follow up needed."
    },
    {
        name: "Caleb Kim",
        group: "Group 1",
        age: 16,
        status: "Present",
        note: "Positive attitude during archery."
    },
    {
        name: "Oliver Singh",
        group: "Group 3",
        age: 17,
        status: "Missing",
        note: "Has not checked in yet."
    },
    {
        name: "Ava Sinclair",
        group: "Group 2",
        age: 16,
        status: "Present",
        note: "Helped another student find their schedule."
    }
];

const observations = [
    {
        student: "Ethan Brooks",
        type: "Attendance Concern",
        mood: "negative",
        details: "Not checked in this morning."
    },
    {
        student: "Oliver Singh",
        type: "Attendance Concern",
        mood: "neutral",
        details: "Room key not yet collected."
    },
    {
        student: "Maya Chen",
        type: "Positive Observation",
        mood: "positive",
        details: "Stepped up as a natural leader."
    }
];

document.addEventListener("DOMContentLoaded", () => {
    setupHubNavigation();
    setupHamburgerMenu();

    loadStats();
    displayStudents(students);
    displayAttendanceList();
    displayAttendanceAlerts();
    displayObservations();
    loadObservationStudentDropdown();
    setupObservationToggle();
    setupObservationForm();

    const searchInput = document.getElementById("studentSearch");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const searchText = searchInput.value.toLowerCase();

            const filteredStudents = students.filter(student =>
                student.name.toLowerCase().includes(searchText)
            );

            displayStudents(filteredStudents);
        });
    }
});

function setupHubNavigation() {
    const navButtons = document.querySelectorAll(".hub-nav");
    const screens = document.querySelectorAll(".hub-screen");

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetScreen = button.dataset.screen;

            navButtons.forEach(btn => btn.classList.remove("active"));
            screens.forEach(screen => screen.classList.remove("active"));

            button.classList.add("active");
            document.getElementById(targetScreen).classList.add("active");
        });
    });
}

function setupHamburgerMenu() {
    const menuBtn = document.getElementById("hubMenuBtn");
    const sidebar = document.getElementById("hubSidebar");

    if (!menuBtn || !sidebar) return;

    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
    });
}

function loadStats() {
    const present = students.filter(student => student.status === "Present").length;
    const missing = students.filter(student => student.status === "Missing").length;

    document.getElementById("presentCount").textContent = present;
    document.getElementById("missingCount").textContent = missing;
    document.getElementById("studentCount").textContent = students.length;
    document.getElementById("observationCount").textContent = observations.length;
}

function displayStudents(studentArray) {
    const studentList = document.getElementById("studentList");
    if (!studentList) return;

    studentList.innerHTML = "";

    studentArray.forEach(student => {
        const row = document.createElement("div");
        row.classList.add("student-row");

        const statusClass = student.status === "Present" ? "present" : "missing";

        row.innerHTML = `
            <div>
                <p class="student-name">${student.name}</p>
                <p class="student-info">${student.group} • Age ${student.age}</p>
                <p class="student-info">${student.note}</p>
            </div>

            <span class="status ${statusClass}">
                ${student.status}
            </span>
        `;

        studentList.appendChild(row);
    });
}

function displayAttendanceList() {
    const attendanceList = document.getElementById("attendanceList");
    if (!attendanceList) return;

    attendanceList.innerHTML = "";

    students.forEach(student => {
        const row = document.createElement("div");
        row.classList.add("attendance-row");

        row.innerHTML = `
            <div>
                <p class="student-name">${student.name}</p>
                <p class="student-info">${student.group} • Age ${student.age}</p>
            </div>

            <label>
                <input type="checkbox" ${student.status === "Present" ? "checked" : ""}>
                Present
            </label>
        `;

        attendanceList.appendChild(row);
    });
}

function displayAttendanceAlerts() {
    const alertBox = document.getElementById("attendanceAlerts");
    if (!alertBox) return;

    const missingStudents = students.filter(student => student.status === "Missing");

    alertBox.innerHTML = "";

    missingStudents.forEach(student => {
        const row = document.createElement("div");
        row.classList.add("alert-row");

        row.innerHTML = `
            <div>
                <p class="student-name">${student.name} — not yet checked in</p>
                <p class="alert-info">${student.group}</p>
            </div>

            <span class="status missing">Alert</span>
        `;

        alertBox.appendChild(row);
    });
}

function displayObservations() {
    const recentObservations = document.getElementById("recentObservations");
    const observationList = document.getElementById("observationList");

    if (recentObservations) {
        recentObservations.innerHTML = "";

        observations.forEach(observation => {
            const row = createObservationRow(observation);
            recentObservations.appendChild(row);
        });
    }

    if (observationList) {
        observationList.innerHTML = "";

        observations.forEach(observation => {
            const row = createObservationRow(observation);
            observationList.appendChild(row);
        });
    }
}

function createObservationRow(observation) {
    const row = document.createElement("div");
    row.classList.add("observation-row");
    row.classList.add(observation.mood);

    row.innerHTML = `
        <div>
            <p class="student-name">${observation.student}</p>
            <p class="student-info">${observation.type} — ${observation.details}</p>
        </div>

        <span class="status ${observation.mood}">
            ${observation.mood.charAt(0).toUpperCase() + observation.mood.slice(1)}
        </span>
    `;

    return row;
}

function loadObservationStudentDropdown() {
    const observationStudent = document.getElementById("observationStudent");
    if (!observationStudent) return;

    observationStudent.innerHTML = "";

    students.forEach(student => {
        observationStudent.innerHTML += `
            <option value="${student.name}">${student.name}</option>
        `;
    });
}

function setupObservationToggle() {
    const newObservationBtn = document.getElementById("newObservationBtn");
    const observationFormCard = document.getElementById("observationFormCard");
    const cancelObservationBtn = document.getElementById("cancelObservationBtn");

    if (!newObservationBtn || !observationFormCard || !cancelObservationBtn) return;

    newObservationBtn.addEventListener("click", () => {
        observationFormCard.classList.remove("hidden");
        newObservationBtn.style.display = "none";
    });

    cancelObservationBtn.addEventListener("click", () => {
        observationFormCard.classList.add("hidden");
        newObservationBtn.style.display = "inline-block";
    });
}

function setupObservationForm() {
    const saveObservationBtn = document.getElementById("saveObservationBtn");
    const observationStudent = document.getElementById("observationStudent");
    const observationDetails = document.getElementById("observationDetails");
    const observationFormCard = document.getElementById("observationFormCard");
    const newObservationBtn = document.getElementById("newObservationBtn");

    if (!saveObservationBtn || !observationStudent || !observationDetails) return;

    saveObservationBtn.addEventListener("click", () => {
        const selectedStudent = observationStudent.value;
        const details = observationDetails.value;

        const checkedObservations = document.querySelectorAll(".checkbox-grid input:checked");
        const observationTypes = Array.from(checkedObservations).map(observation => observation.value);

        const selectedMood = document.querySelector('input[name="observationMood"]:checked');

        if (!selectedMood) {
            alert("Please choose positive, neutral, or negative.");
            return;
        }

        if (observationTypes.length === 0 || details.trim() === "") {
            alert("Please choose an observation type and enter details.");
            return;
        }

        observations.unshift({
            student: selectedStudent,
            type: observationTypes.join(", "),
            mood: selectedMood.value,
            details: details
        });

        displayObservations();
        loadStats();

        observationDetails.value = "";
        selectedMood.checked = false;
        checkedObservations.forEach(observation => observation.checked = false);

        observationFormCard.classList.add("hidden");
        newObservationBtn.style.display = "inline-block";
    });
}
// ── ATTENDANCE HUB SECTION ───────────────────────────────

let attendanceStudents = [
    { id: 1,  name: "Sarah Johnson",  group: "Blue",   checkedIn: false },
    { id: 2,  name: "Michael Chen",   group: "Blue",   checkedIn: false },
    { id: 3,  name: "Emily Patel",    group: "Red",    checkedIn: false },
    { id: 4,  name: "Alex Brown",     group: "Red",    checkedIn: false },
    { id: 5,  name: "Lucy Green",     group: "Yellow", checkedIn: false },
    { id: 6,  name: "Jason Kim",      group: "Yellow", checkedIn: false }
];

let recentScans = [];

document.addEventListener("DOMContentLoaded", () => {
    renderMissingStudents();
    updateAttendanceCounter();
    setupManualAttendanceEntry();
    setupAttendanceSubmitButton();
});

function renderMissingStudents() {
    const missingList = document.getElementById("missingStudentsList");
    const missingBadge = document.getElementById("missingBadge");

    if (!missingList || !missingBadge) return;

    const missing = attendanceStudents.filter(student => !student.checkedIn);

    missingBadge.textContent = missing.length + " Missing";
    missingList.innerHTML = "";

    if (missing.length === 0) {
        missingList.innerHTML = `
            <p style="color:#8bc53f; font-weight:700; padding:20px 0;">
                All students checked in!
            </p>
        `;
        return;
    }

    missing.forEach(student => {
        const row = document.createElement("div");
        row.classList.add("student-missing");

        row.innerHTML = `
            <div class="avatar">${student.name.charAt(0)}</div>

            <div class="student-info">
                <h4>${student.name}</h4>
                <p>Group ${student.group}</p>
            </div>

            <a href="#" class="view-profile">View Profile</a>
        `;

        missingList.appendChild(row);
    });
}

function updateAttendanceCounter() {
    const submitBtn = document.querySelector(".submit-btn");
    if (!submitBtn) return;

    const checkedInCount = attendanceStudents.filter(student => student.checkedIn).length;
    const total = attendanceStudents.length;

    submitBtn.textContent = checkedInCount + " / " + total + " Checked In";
}

function setupManualAttendanceEntry() {
    const input = document.getElementById("manualStudentInput");
    const button = document.getElementById("manualStudentBtn");

    if (!input || !button) return;

    button.addEventListener("click", () => {
        const name = input.value.trim();

        if (name === "") {
            showAttendanceMessage("Please enter a student name.", "error");
            return;
        }

        checkInAttendanceStudent(name);
        input.value = "";
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            button.click();
        }
    });
}

function checkInAttendanceStudent(name) {
    const student = attendanceStudents.find(student =>
        student.name.toLowerCase() === name.toLowerCase().trim()
    );

    if (!student) {
        showAttendanceMessage('Student "' + name + '" not found in roster.', "error");
        return;
    }

    if (student.checkedIn) {
        showAttendanceMessage(student.name + " is already checked in.", "error");
        return;
    }

    student.checkedIn = true;

    addRecentScan(student.name);
    renderMissingStudents();
    updateAttendanceCounter();

    showAttendanceMessage(student.name + " checked in successfully!", "success");
}

function addRecentScan(name) {
    const time = getCurrentTime();

    recentScans.unshift({
        name: name,
        time: time
    });

    if (recentScans.length > 5) {
        recentScans = recentScans.slice(0, 5);
    }

    const recentScansList = document.getElementById("recentScansList");
    if (!recentScansList) return;

    recentScansList.innerHTML = "";

    recentScans.forEach(scan => {
        const row = document.createElement("div");
        row.classList.add("scan-row");

        row.innerHTML = `
            <span>${scan.name}</span>
            <small>${scan.time}</small>
        `;

        recentScansList.appendChild(row);
    });
}

function setupAttendanceSubmitButton() {
    const submitBtn = document.querySelector(".submit-btn");
    if (!submitBtn) return;

    submitBtn.addEventListener("click", event => {
        event.preventDefault();

        const checkedIn = attendanceStudents.filter(student => student.checkedIn).length;
        const missing = attendanceStudents.filter(student => !student.checkedIn).length;

        const confirmed = confirm(
            "Submit attendance?\n\n" +
            "Checked In: " + checkedIn + "\n" +
            "Missing: " + missing + "\n\n" +
            "This will save the current attendance record."
        );

        if (confirmed) {
            showAttendanceMessage(
                "Attendance submitted! " + checkedIn + " present, " + missing + " absent.",
                "success"
            );
        }
    });
}

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;

    if (hours === 0) {
        hours = 12;
    }

    return hours + ":" + minutes + " " + ampm;
}

function showAttendanceMessage(text, type) {
    const existing = document.querySelector(".js-message");

    if (existing) {
        existing.remove();
    }

    const msg = document.createElement("div");
    msg.className = "js-message";
    msg.textContent = text;

    msg.style.cssText =
        "position:fixed; bottom:30px; left:50%; transform:translateX(-50%);" +
        "padding:14px 28px; border-radius:14px; font-weight:700; font-size:15px;" +
        "font-family:Montserrat,sans-serif; z-index:9999; transition:opacity 0.4s;" +
        (type === "success"
            ? "background:#8bc53f; color:white;"
            : "background:#d12c2c; color:white;");

    document.body.appendChild(msg);

    setTimeout(() => {
        msg.style.opacity = "0";

        setTimeout(() => {
            msg.remove();
        }, 400);
    }, 2500);
}