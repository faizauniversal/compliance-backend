require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    res.sendSuccess = (data, message = "Operation completed") => {
        res.status(200).json({ success: true, data: data, message: message });
    };
    next();
});

// Import all routes
const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/businesses');
const categoryRoutes = require('./routes/categories');
const complianceRoutes = require('./routes/compliances');
const reminderRoutes = require('./routes/reminders');
const reportRoutes = require('./routes/reports');

// Register APIs
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/compliances', complianceRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
    res.sendSuccess(null, "Compliance Backend is running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});