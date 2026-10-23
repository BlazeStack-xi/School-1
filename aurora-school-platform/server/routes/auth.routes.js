// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST route for login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user and their role
        const query = `
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.email = $1 AND u.is_active = true
        `;
        const userResult = await pool.query(query, [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = userResult.rows[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Set secure session
        req.session.userId = user.id;
        req.session.role = user.role_name;
        req.session.name = `${user.first_name} ${user.last_name}`;

        res.json({ 
            success: true, 
            message: 'Logged in successfully.',
            role: user.role_name,
            redirectUrl: '/dashboard/admin.html' // Change based on role later
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// GET route for logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

module.exports = router;
