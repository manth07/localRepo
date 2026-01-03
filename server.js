const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const md5 = require('md5');

const app = express();
const PORT = 5000;
const SECRET_KEY = "dayflow_secret_hrms";

app.use(cors());
app.use(express.json());

// --- DATABASE SETUP ---
const db = new sqlite3.Database('./dayflow.db', (err) => {
    if (err) console.error("DB Error:", err.message);
    console.log('Connected to Dayflow Local Database.');
});

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT UNIQUE,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT, 
        phone TEXT,
        address TEXT,
        jobTitle TEXT,
        department TEXT,
        salary INTEGER,
        joinDate TEXT
    )`);

    // Attendance Table
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        date TEXT,
        status TEXT,
        checkIn TEXT,
        checkOut TEXT
    )`);

    // Leaves Table
    db.run(`CREATE TABLE IF NOT EXISTS leaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        type TEXT,
        startDate TEXT,
        endDate TEXT,
        remarks TEXT,
        status TEXT DEFAULT 'Pending'
    )`);
});

// --- MIDDLEWARE ---
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "No token provided" });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).json({ error: "Auth failed" });
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

// --- ROUTES ---

// 1. AUTHENTICATION
app.post('/api/signup', (req, res) => {
    const { employeeId, name, email, password, role } = req.body;
    db.run(`INSERT INTO users (employeeId, name, email, password, role, salary, department) VALUES (?,?,?,?,?,?,?)`, 
        [employeeId, name, email, md5(password), role, 50000, "General"], 
        function(err) {
            if (err) return res.status(400).json({ error: "ID or Email exists" });
            res.json({ message: "Registered", id: this.lastID });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { email, password, isAdminLogin } = req.body;
    db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, md5(password)], (err, user) => {
        if (err || !user) return res.status(401).json({ error: "Invalid Credentials" });
        
        // Strict Admin Portal Check
        if (isAdminLogin && user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Not an Admin Account" });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token, user });
    });
});

// 2. FORGOT PASSWORD (Security Question: Verify EmployeeID)
app.post('/api/reset-password', (req, res) => {
    const { email, employeeId, newPassword } = req.body;
    db.get(`SELECT * FROM users WHERE email = ? AND employeeId = ?`, [email, employeeId], (err, user) => {
        if (err || !user) return res.status(400).json({ error: "Verification Failed: Details do not match." });
        
        db.run(`UPDATE users SET password = ? WHERE id = ?`, [md5(newPassword), user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Password Reset Successfully" });
        });
    });
});

// 3. USER MANAGEMENT
app.get('/api/profile', authenticate, (req, res) => {
    db.get(`SELECT * FROM users WHERE id = ?`, [req.userId], (err, row) => res.json(row));
});

// Update Profile (Handles Password Change too)
app.put('/api/users/:id', authenticate, (req, res) => {
    const { name, phone, address, jobTitle, salary, email, password } = req.body;
    const uid = req.params.id;

    // Security: Only Admin or Self can edit
    if (req.userRole !== 'Admin' && parseInt(uid) !== req.userId) return res.status(403).json({ error: "Unauthorized" });

    // Dynamic Query Builder
    let updates = [];
    let params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (phone) { updates.push("phone = ?"); params.push(phone); }
    if (address) { updates.push("address = ?"); params.push(address); }
    if (email) { updates.push("email = ?"); params.push(email); } // Admin Security
    if (password) { updates.push("password = ?"); params.push(md5(password)); } // Admin Security
    if (req.userRole === 'Admin') {
        if (jobTitle) { updates.push("jobTitle = ?"); params.push(jobTitle); }
        if (salary) { updates.push("salary = ?"); params.push(salary); }
    }

    if (updates.length === 0) return res.json({ message: "No changes" });

    params.push(uid);
    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

    db.run(sql, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Update Successful" });
    });
});

app.get('/api/users', authenticate, (req, res) => {
    if (req.userRole !== 'Admin') return res.status(403).json({ error: "Unauthorized" });
    db.all(`SELECT id, employeeId, name, email, role, jobTitle, department FROM users`, [], (err, rows) => res.json(rows));
});

// 4. ATTENDANCE & LEAVES (Standard)
app.post('/api/attendance/checkin', authenticate, (req, res) => {
    const { date, checkIn } = req.body;
    db.run(`INSERT INTO attendance (userId, date, status, checkIn) VALUES (?,?,?,?)`, 
        [req.userId, date, 'Present', checkIn], (err) => res.json({ message: "Checked In" }));
});
app.put('/api/attendance/checkout', authenticate, (req, res) => {
    const { date, checkOut } = req.body;
    db.run(`UPDATE attendance SET checkOut = ? WHERE userId = ? AND date = ?`, 
        [checkOut, req.userId, date], (err) => res.json({ message: "Checked Out" }));
});
app.get('/api/attendance', authenticate, (req, res) => {
    const sql = req.userRole === 'Admin' ? `SELECT a.*, u.name, u.employeeId FROM attendance a JOIN users u ON a.userId = u.id ORDER BY a.date DESC` : `SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC`;
    db.all(sql, req.userRole === 'Admin' ? [] : [req.userId], (err, rows) => res.json(rows));
});
app.post('/api/leaves', authenticate, (req, res) => {
    const { type, startDate, endDate, remarks } = req.body;
    db.run(`INSERT INTO leaves (userId, type, startDate, endDate, remarks) VALUES (?,?,?,?,?)`,
        [req.userId, type, startDate, endDate, remarks], (err) => res.json({ message: "Leave applied" }));
});
app.get('/api/leaves', authenticate, (req, res) => {
    const sql = req.userRole === 'Admin' ? `SELECT l.*, u.name, u.employeeId FROM leaves l JOIN users u ON l.userId = u.id ORDER BY l.id DESC` : `SELECT * FROM leaves WHERE userId = ? ORDER BY id DESC`;
    db.all(sql, req.userRole === 'Admin' ? [] : [req.userId], (err, rows) => res.json(rows));
});
app.put('/api/leaves/:id', authenticate, (req, res) => {
    if (req.userRole !== 'Admin') return res.status(403).json({ error: "Unauthorized" });
    db.run(`UPDATE leaves SET status = ? WHERE id = ?`, [req.body.status, req.params.id], (err) => res.json({ message: "Updated" }));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));