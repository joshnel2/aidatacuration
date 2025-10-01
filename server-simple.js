// Simplified Main Server - Focus on Core Authentication
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database connection
const { testConnection, initializeDatabase } = require('./database/connection');

// Import authentication API
const { router: authRouter, authenticateToken } = require('./api/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/auth', authRouter);

// Protected dashboard API
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Dashboard data loaded',
            user: req.user.toJSON(),
            subscription: req.subscription?.toJSON() || null,
            data: {
                processedFiles: 47,
                surveyResponses: 23,
                consultationsCompleted: 1,
                aiPartnerStatus: 'active',
                dataQuality: 87
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'signin.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// Start server
async function startServer() {
    try {
        console.log('🔄 Starting AI Data Curation Platform...');
        
        // Test database connection
        console.log('🔄 Testing database connection...');
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }
        console.log('✅ Database connected successfully');
        
        // Initialize database (migrations already run)
        console.log('🔄 Checking database initialization...');
        
        app.listen(PORT, () => {
            console.log('\n🎉 AI Data Curation Platform Started!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🚀 Server: http://localhost:${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
            console.log(`🔐 Sign In: http://localhost:${PORT}/signin`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\n📝 Demo Accounts:');
            console.log('   demo / demo123 (Advanced Neural)');
            console.log('   admin / admin123 (Enterprise Neural)');
            console.log('   enterprise_user / enterprise123 (Enterprise)');
            console.log('   startup_founder / startup123 (Basic - Trial)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();