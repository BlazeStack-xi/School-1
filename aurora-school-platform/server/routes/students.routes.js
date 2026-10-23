// server/routes/students.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET route to fetch all students (Protected)
router.get('/list', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT s.admission_number, s.first_name, s.last_name, s.gender, s.status, c.name as class_name 
            FROM students s 
            LEFT JOIN classes c ON s.class_id = c.id 
            ORDER BY s.first_name ASC
        `;
        const result = await pool.query(query);

        res.json({
            success: true,
            students: result.rows
        });

    } catch (error) {
        console.error('Students API Error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching students.' });
    }
});

module.exports = router;