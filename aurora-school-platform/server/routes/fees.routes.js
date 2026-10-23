// server/routes/fees.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. Get all invoices with student details
router.get('/invoices', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT i.id, i.invoice_number, i.title, i.amount, to_char(i.due_date, 'DD-MM-YYYY') as due_date, i.status, 
                   s.first_name, s.last_name, s.admission_number, c.name as class_name
            FROM invoices i
            JOIN students s ON i.student_id = s.id
            LEFT JOIN classes c ON s.class_id = c.id
            ORDER BY i.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, invoices: result.rows });
    } catch (error) {
        console.error('Fees Fetch Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching invoices' });
    }
});

// 2. Record an offline payment (Transaction safe)
router.post('/pay', authMiddleware, async (req, res) => {
    const { invoiceId, amountPaid, paymentMethod } = req.body;
    const userId = req.session.userId;

    try {
        await pool.query('BEGIN'); // Start Transaction

        // Insert Payment Record
        await pool.query(
            'INSERT INTO payments (invoice_id, amount_paid, payment_method, recorded_by) VALUES ($1, $2, $3, $4)',
            [invoiceId, amountPaid, paymentMethod, userId]
        );

        // Update Invoice Status to Paid
        await pool.query(
            "UPDATE invoices SET status = 'Paid' WHERE id = $1",
            [invoiceId]
        );

        await pool.query('COMMIT'); // Commit Transaction
        res.json({ success: true, message: 'Payment recorded successfully!' });

    } catch (error) {
        await pool.query('ROLLBACK'); // Cancel changes if error occurs
        console.error('Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to record payment' });
    }
});

module.exports = router;