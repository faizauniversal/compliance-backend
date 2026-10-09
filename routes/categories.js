const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [categories] = await db.execute('SELECT * FROM compliance_categories');
        res.sendSuccess(categories, "Categories retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { category_name, description } = req.body;
        const [result] = await db.execute(`INSERT INTO compliance_categories (category_name, description) VALUES (?, ?)`, [category_name, description]);
        res.status(201).json({ success: true, data: { category_id: result.insertId }, message: "Category created" });
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { category_name, description } = req.body;
        const [result] = await db.execute(`UPDATE compliance_categories SET category_name = ?, description = ? WHERE category_id = ?`, [category_name, description, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(null, "Category updated");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM compliance_categories WHERE category_id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.sendSuccess(null, "Category deleted");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

module.exports = router;