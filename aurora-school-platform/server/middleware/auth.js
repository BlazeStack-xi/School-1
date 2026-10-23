// server/middleware/auth.js
module.exports = (req, res, next) => {
    // Check if user session exists
    if (req.session && req.session.userId) {
        return next(); // User logged in hai, aage badhne do
    }
    // Agar login nahi hai toh 401 Unauthorized error do
    res.status(401).json({ success: false, message: 'Unauthorized access. Please login.' });
};