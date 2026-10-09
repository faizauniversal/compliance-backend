const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.execute(
            `INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)`, 
            [name, email, hashedPassword, phone]
        );
        
        const token = jwt.sign({ user_id: result.insertId }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        // 1. Store in Database
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
        await db.execute(
            `INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)`,
            [result.insertId, token, expiresAt]
        );

        // 2. Return token directly to Frontend
        res.status(201).json({ 
            success: true, 
            data: { user: { id: result.insertId, name, email }, token: token }, 
            message: "User registered and session stored" 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0 || !(await bcrypt.compare(password, users[0].password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign({ user_id: users[0].user_id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        // 1. Store in Database
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.execute(
            `INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)`,
            [users[0].user_id, token, expiresAt]
        );

        // 2. Return token directly to Frontend
        res.sendSuccess({ user: { id: users[0].user_id, email: users[0].email }, token: token }, "Login successful");
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        await db.execute('DELETE FROM user_sessions WHERE token = ?', [token]);
        res.sendSuccess(null, "Logged out successfully");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute('SELECT user_id, name, email, phone, role FROM users WHERE user_id = ?', [req.user.user_id]);
        res.sendSuccess(users[0], "User profile retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

// PUT /api/auth/me - Update logged-in user's profile
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        const [result] = await db.execute(
            `UPDATE users SET name = ?, email = ?, phone = ? WHERE user_id = ?`,
            [name, email, phone, req.user.user_id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        res.sendSuccess(null, "User profile updated successfully");
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Email is already in use by another account." });
        }
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

// PUT /api/auth/password - Update logged-in user's password
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, message: "Both current and new passwords are required" });
        }

        const [users] = await db.execute('SELECT password FROM users WHERE user_id = ?', [req.user.user_id]);
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect current password" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(new_password, salt);

        await db.execute('UPDATE users SET password = ? WHERE user_id = ?', [hashedNewPassword, req.user.user_id]);

        res.sendSuccess(null, "Password updated successfully");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

module.exports = router;