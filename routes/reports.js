const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [reports] = await db.execute('SELECT * FROM reports WHERE generated_by = ?', [req.user.user_id]);
        res.sendSuccess(reports, "Reports retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { business_id, report_type, start_date, end_date } = req.body;
        const [result] = await db.execute(
            `INSERT INTO reports (business_id, report_type, start_date, end_date, generated_by, file_path) VALUES (?, ?, ?, ?, ?, ?)`,
            [business_id, report_type, start_date, end_date, req.user.user_id, '/path/to/generated_report.pdf']
        );
        res.status(201).json({ success: true, data: { report_id: result.insertId, file_path: '/path/to/generated_report.pdf' }, message: "Report generated" });
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [report] = await db.execute('SELECT * FROM reports WHERE report_id = ? AND generated_by = ?', [req.params.id, req.user.user_id]);
        if (report.length === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(report[0], "Report details retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM reports WHERE report_id = ? AND generated_by = ?', [req.params.id, req.user.user_id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(null, "Report deleted");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

module.exports = router;