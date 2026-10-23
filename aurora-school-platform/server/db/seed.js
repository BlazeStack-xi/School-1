// server/db/seed.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedAdmin() {
    try {
        console.log('Seeding admin account...');

        // 12+ character password for security
        const adminPassword = 'AdminPassword123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(adminPassword, salt);

        // Get the School Admin role ID
        const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'School Admin'");
        const roleId = roleResult.rows[0].id;

        // Insert user
        await pool.query(`
            INSERT INTO users (role_id, email, password_hash, first_name, last_name) 
            VALUES ($1, 'admin@aurora.example', $2, 'System', 'Admin')
            ON CONFLICT (email) DO NOTHING
        `, [roleId, hash]);

        console.log('✅ Admin seeded successfully!');
        console.log('Email: admin@aurora.example');
        console.log('Password: AdminPassword123');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedAdmin();
