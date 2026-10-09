const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [compliances] = await db.execute(`
            SELECT c.* FROM compliances c
            JOIN businesses b ON c.business_id = b.business_id
            WHERE b.user_id = ?`, [req.user.user_id]);
        res.sendSuccess(compliances, "Compliances retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { business_id, category_id, title, description, frequency, due_date } = req.body;
        const [result] = await db.execute(
            `INSERT INTO compliances (business_id, category_id, title, description, frequency, due_date) VALUES (?, ?, ?, ?, ?, ?)`,
            [business_id, category_id, title, description, frequency, due_date]
        );
        res.status(201).json({ success: true, data: { compliance_id: result.insertId }, message: "Compliance created" });
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [compliance] = await db.execute('SELECT * FROM compliances WHERE compliance_id = ?', [req.params.id]);
        if (compliance.length === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(compliance[0], "Compliance retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, frequency, due_date, status } = req.body;
        const [result] = await db.execute(
            `UPDATE compliances SET title = ?, description = ?, frequency = ?, due_date = ?, status = ? WHERE compliance_id = ?`,
            [title, description, frequency, due_date, status, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(null, "Compliance updated");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM compliances WHERE compliance_id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(null, "Compliance deleted");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

module.exports = router;