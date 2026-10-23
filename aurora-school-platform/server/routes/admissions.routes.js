// server/routes/admissions.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth'); // Added security middleware

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. PUBLIC POST: Submit new application (From frontend website)
router.post('/apply', async (req, res) => {
    try {
        const { studentFirstName, studentLastName, dateOfBirth, applyingGrade, academicYear, parentName, email, mobileNumber } = req.body;
        const referenceNumber = `AUR-${academicYear.split('-')[0]}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const query = `
            INSERT INTO admission_applications 
            (reference_number, student_first_name, student_last_name, date_of_birth, applying_grade, academic_year, parent_name, email, mobile_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING reference_number
        `;
        
        const result = await pool.query(query, [referenceNumber, studentFirstName, studentLastName, dateOfBirth, applyingGrade, academicYear, parentName, email, mobileNumber]);

        res.status(201).json({ success: true, message: 'Application submitted.', referenceNumber: result.rows[0].reference_number });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error while submitting application.' });
    }
});

// 2. PROTECTED GET: Fetch all applications for Admin Dashboard
router.get('/list', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, reference_number, student_first_name, student_last_name, applying_grade, status, to_char(submitted_at, 'DD-MM-YYYY') as date
            FROM admission_applications 
            ORDER BY submitted_at DESC
        `);
        res.json({ success: true, applications: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching applications' });
    }
});

// 3. PROTECTED POST: Approve Application & Convert to Student
router.post('/approve/:id', authMiddleware, async (req, res) => {
    const applicationId = req.params.id;

    try {
        await pool.query('BEGIN'); // Start transaction

        // Update application status
        const appResult = await pool.query(`
            UPDATE admission_applications SET status = 'Approved' 
            WHERE id = $1 RETURNING *
        `, [applicationId]);

        const app = appResult.rows[0];

        if(app) {
            // Generate New Admission Number
            const admissionNo = `AUR-27-${Math.floor(Math.random() * 9000) + 1000}`;
            
            // Map applying_grade to class_id (basic matching)
            let classId = 1; // Default to Nursery
            if(app.applying_grade === 'KG') classId = 2;
            else if(app.applying_grade === 'Grade 1') classId = 3;
            else if(app.applying_grade === 'Grade 5') classId = 4;
            else if(app.applying_grade === 'Grade 9') classId = 5;

            // Insert into Students table automatically
            await pool.query(`
                INSERT INTO students (admission_number, first_name, last_name, class_id, date_of_birth, gender)
                VALUES ($1, $2, $3, $4, $5, 'Not Specified')
                ON CONFLICT DO NOTHING
            `, [admissionNo, app.student_first_name, app.student_last_name, classId, app.date_of_birth]);
        }

        await pool.query('COMMIT');
        res.json({ success: true, message: 'Application Approved & Student Enrolled!' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to approve application.' });
    }
});

module.exports = router;