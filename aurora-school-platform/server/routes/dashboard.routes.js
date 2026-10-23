// server/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get Dashboard Data (Protected by authMiddleware)
router.get('/data', authMiddleware, async (req, res) => {
    try {
        // 1. Get Pending Admissions Count
        const pendingResult = await pool.query("SELECT COUNT(*) FROM admission_applications WHERE status = 'Submitted'");
        const pendingAdmissions = pendingResult.rows[0].count;

        // 2. Get 5 Most Recent Admission Applications for the table
        const recentAdmissions = await pool.query(`
            SELECT reference_number, student_first_name, student_last_name, applying_grade, status, to_char(submitted_at, 'DD-MM-YYYY') as date 
            FROM admission_applications 
            ORDER BY submitted_at DESC 
            LIMIT 5
        `);

        // Send data to frontend
        res.json({
            success: true,
            user: {
                name: req.session.name,
                role: req.session.role
            },
            stats: {
                pendingAdmissions: pendingAdmissions,
                totalStudents: 845, // Demo number for now
                activeTeachers: 64, // Demo number for now
                feeCollection: '₹ 14.5L' // Demo number for now
            },
            recentAdmissions: recentAdmissions.rows
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        res.status(500).json({ success: false, message: 'Server error loading dashboard data.' });
    }
});

module.exports = router;