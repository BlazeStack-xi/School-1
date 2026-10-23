// server/server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. Security & Body Parser Middleware (Yaha hona zaroori hai)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Allow inline scripts
            scriptSrc: ["'self'", "'unsafe-inline'"],
            // Allow inline styles and Google Fonts
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            // Allow Google Fonts to load
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            // Allow images from our server and Unsplash
            imgSrc: ["'self'", "data:", "https://images.unsplash.com"]
        },
    },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// 3. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: "Too many requests, please try again later."
});
app.use('/api/', limiter);

// 4. Secure Sessions
app.use(session({
    store: new pgSession({ 
        pool, 
        tableName: 'sessions', 
        createTableIfMissing: true 
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// 5. Routes (Middlewares ke BAAD hone chahiye)
const admissionsRoutes = require('./routes/admissions.routes');
const authRoutes = require('./routes/auth.routes'); 
const dashboardRoutes = require('./routes/dashboard.routes');
const studentsRoutes = require('./routes/students.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const feesRoutes = require('./routes/fees.routes');

app.use('/api/admissions', admissionsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feesRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Aurora API is running securely.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Aurora API is running on http://localhost:${PORT}`);
});