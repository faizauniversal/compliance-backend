const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [reminders] = await db.execute(`
            SELECT r.* FROM reminders r
            JOIN compliances c ON r.compliance_id = c.compliance_id
            JOIN businesses b ON c.business_id = b.business_id
            WHERE b.user_id = ?`, [req.user.user_id]);
        res.sendSuccess(reminders, "Reminders retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { compliance_id, reminder_date, reminder_type } = req.body;
        const [result] = await db.execute(
            `INSERT INTO reminders (compliance_id, reminder_date, reminder_type) VALUES (?, ?, ?)`,
            [compliance_id, reminder_date, reminder_type]
        );
        res.status(201).json({ success: true, data: { reminder_id: result.insertId }, message: "Reminder created" });
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { reminder_date, status } = req.body;
        const [result] = await db.execute(`UPDATE reminders SET reminder_date = ?, status = ? WHERE reminder_id = ?`, [reminder_date, status, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(null, "Reminder updated");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM reminders WHERE reminder_id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(null, "Reminder deleted");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

module.exports = router;