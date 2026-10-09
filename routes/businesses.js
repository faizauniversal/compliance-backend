const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [businesses] = await db.execute(`
            SELECT b.* FROM businesses b 
            WHERE b.user_id = ? OR b.business_id IN (
                SELECT business_id FROM business_members WHERE user_id = ?
            )`, [req.user.user_id, req.user.user_id]);
        res.sendSuccess(businesses, "Businesses retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Extract "members" array from frontend request
        const { business_name, registration_number, business_type, address, phone, members } = req.body;
        
        // 1. Create the business
        const [result] = await connection.execute(
            `INSERT INTO businesses (user_id, business_name, registration_number, business_type, address, phone) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.user_id, business_name, registration_number, business_type, address, phone]
        );
        const business_id = result.insertId;

        // 2. Loop through the members array from the frontend and assign dynamic roles
        if (members && members.length > 0) {
            for (const member of members) {
                await connection.execute(
                    `INSERT INTO business_members (business_id, user_id, role) VALUES (?, ?, ?)`,
                    [business_id, member.user_id, member.role]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ success: true, data: { business_id: business_id }, message: "Business created with assigned members" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    } finally {
        connection.release();
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [business] = await db.execute(`
            SELECT b.* FROM businesses b 
            WHERE b.business_id = ? AND (b.user_id = ? OR b.business_id IN (
                SELECT business_id FROM business_members WHERE user_id = ?
            ))`, [req.params.id, req.user.user_id, req.user.user_id]);
            
        if (business.length === 0) return res.status(404).json({ success: false, message: "Not found or unauthorized" });
        res.sendSuccess(business[0], "Business retrieved");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { business_name, address, phone, business_type } = req.body;
        const [result] = await db.execute(
            `UPDATE businesses SET business_name = ?, address = ?, phone = ?, business_type = ? WHERE business_id = ? AND user_id = ?`,
            [business_name, address, phone, business_type, req.params.id, req.user.user_id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found or unauthorized" });
        res.sendSuccess(null, "Business updated");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM businesses WHERE business_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found or unauthorized" });
        res.sendSuccess(null, "Business deleted");
    } catch (error) {
        res.status(500).json({ success: false, message: "DB Error: " + error.message });
    }
});

module.exports = router;