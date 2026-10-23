// server/routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. Get classes for the dropdown
router.get('/classes', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM classes ORDER BY id ASC');
        res.json({ success: true, classes: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching classes' });
    }
});

// 2. Get students for a specific class to mark attendance
router.get('/students/:classId', authMiddleware, async (req, res) => {
    try {
        const classId = req.params.classId;
        const query = `
            SELECT id, admission_number, first_name, last_name 
            FROM students 
            WHERE class_id = $1 AND status = 'Active' 
            ORDER BY first_name ASC
        `;
        const result = await pool.query(query, [classId]);
        res.json({ success: true, students: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching students' });
    }
});

// 3. Save Attendance
router.post('/mark', authMiddleware, async (req, res) => {
    const { date, attendanceData } = req.body;
    const userId = req.session.userId;

    try {
        await pool.query('BEGIN'); // Start transaction

        for (let record of attendanceData) {
            // Upsert: Agar pehle se entry hai toh update, warna insert
            const query = `
                INSERT INTO attendance_records (student_id, attendance_date, status, marked_by)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (student_id, attendance_date) 
                DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by
            `;
            await pool.query(query, [record.student_id, date, record.status, userId]);
        }

        await pool.query('COMMIT'); // Save transaction
        res.json({ success: true, message: 'Attendance saved successfully!' });

    } catch (error) {
        await pool.query('ROLLBACK'); // Cancel if error
        console.error('Attendance Save Error:', error);
        res.status(500).json({ success: false, message: 'Failed to save attendance.' });
    }
});

module.exports = router;