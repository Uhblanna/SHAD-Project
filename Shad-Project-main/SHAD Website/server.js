const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Lets the server understand form data and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serves your HTML, CSS, JS, and images
app.use(express.static(path.join(__dirname, "public")));

// Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public","html", "index.html"));
});

// Example API route for med kits
app.get("/api/med-kits", (req, res) => {
    res.json([
        {
            name: "Main Med Kit",
            staff: "Sarah Kim",
            location: "Lecture Hall",
            status: "Checked"
        }
    ]);
});

// Example POST route
app.post("/api/med-kits", (req, res) => {
    console.log(req.body);
    res.json({ message: "Med kit saved successfully" });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});