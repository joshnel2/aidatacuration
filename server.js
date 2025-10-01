// Main Server for AI Data Curation Platform
// Integrates all backend services for automated data gathering and AI partner building

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Import database connection
const { db, testConnection, initializeDatabase, closeConnection } = require('./database/connection');

// Import API modules
const { router: dataProcessorRouter } = require('./api/data-processor');
const { router: employeeSurveyRouter } = require('./api/employee-surveys');
const { router: zoomIntegrationRouter } = require('./api/zoom-integration');
const { router: authRouter, authenticateToken, requireSubscription } = require('./api/auth');

// Import models
const User = require('./models/User');
const Subscription = require('./models/Subscription');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Ensure required directories exist
async function ensureDirectories() {
    const dirs = [
        'uploads',
        'data/processed',
        'data/natural_language',
        'data/surveys',
        'data/survey_responses',
        'data/aggregated_insights',
        'data/consultations',
        'data/consultation_results',
        'data/consultation_reports'
    ];

    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/data', authenticateToken, requireSubscription(), dataProcessorRouter);
app.use('/api/surveys', authenticateToken, requireSubscription('advanced-neural'), employeeSurveyRouter);
app.use('/api/zoom', authenticateToken, requireSubscription('enterprise-neural'), zoomIntegrationRouter);

// Main dashboard API endpoints
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        // Get user's processed data summary
        const dashboardData = await getDashboardData(req.user.id);
        
        res.json({
            success: true,
            data: dashboardData,
            user: req.user.toJSON(),
            subscription: req.subscription?.toJSON() || null
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// AI Partner status and configuration
app.get('/api/ai-partner/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const aiPartnerData = await getAIPartnerStatus(userId);
        
        res.json({
            success: true,
            data: aiPartnerData
        });
    } catch (error) {
        console.error('AI Partner data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Company onboarding workflow
app.post('/api/onboard-company', async (req, res) => {
    try {
        const { userId, companyData, plan } = req.body;
        
        const onboardingResult = await initiateCompanyOnboarding(userId, companyData, plan);
        
        res.json({
            success: true,
            message: 'Company onboarding initiated',
            data: onboardingResult
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Survey page route
app.get('/survey/:surveyId', (req, res) => {
    res.sendFile(path.join(__dirname, 'survey.html'));
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

// Helper functions
async function getDashboardData(userId) {
    try {
        // Get processed files
        const processedFiles = await getProcessedFiles(userId);
        
        // Get survey responses
        const surveyData = await getSurveyData(userId);
        
        // Get consultation data
        const consultationData = await getConsultationData(userId);
        
        // Get AI partner status
        const aiPartnerStatus = await getAIPartnerStatus(userId);
        
        return {
            processedFiles: processedFiles.length,
            surveyResponses: surveyData.completed,
            consultationsCompleted: consultationData.completed,
            aiPartnerStatus: aiPartnerStatus.status,
            dataQuality: calculateDataQuality(processedFiles, surveyData, consultationData),
            insights: await getLatestInsights(userId),
            recommendations: await getRecommendations(userId)
        };
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        return {
            processedFiles: 0,
            surveyResponses: 0,
            consultationsCompleted: 0,
            aiPartnerStatus: 'not_started',
            dataQuality: 0,
            insights: [],
            recommendations: []
        };
    }
}

async function getProcessedFiles(userId) {
    try {
        const files = await fs.readdir('data/processed');
        return files.filter(file => file.includes(`_${userId}_`));
    } catch (error) {
        return [];
    }
}

async function getSurveyData(userId) {
    try {
        const responses = await fs.readdir('data/survey_responses');
        const userResponses = responses.filter(file => file.includes(`_${userId}_`));
        
        return {
            sent: userResponses.length,
            completed: userResponses.length, // Simplified
            pending: 0
        };
    } catch (error) {
        return { sent: 0, completed: 0, pending: 0 };
    }
}

async function getConsultationData(userId) {
    try {
        const consultations = await fs.readdir('data/consultations');
        const userConsultations = consultations.filter(file => file.includes(`_${userId}_`));
        
        return {
            scheduled: userConsultations.length,
            completed: userConsultations.length, // Simplified
            pending: 0
        };
    } catch (error) {
        return { scheduled: 0, completed: 0, pending: 0 };
    }
}

async function getAIPartnerStatus(userId) {
    try {
        // Check if AI partner configuration exists
        const configFiles = await fs.readdir('data/processed');
        const hasConfig = configFiles.some(file => 
            file.includes(`_${userId}_`) && file.includes('ai_partner_config')
        );
        
        if (hasConfig) {
            return {
                status: 'active',
                accuracy: 94.7,
                dataPoints: 1247,
                lastTraining: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                capabilities: [
                    'Financial Analysis',
                    'Operational Insights',
                    'Strategic Planning',
                    'Risk Assessment'
                ]
            };
        } else {
            return {
                status: 'building',
                progress: 73,
                nextStep: 'Awaiting employee survey responses',
                estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
        }
    } catch (error) {
        return {
            status: 'not_started',
            progress: 0,
            nextStep: 'Upload business documents to begin'
        };
    }
}

function calculateDataQuality(processedFiles, surveyData, consultationData) {
    let score = 0;
    
    // Files contribute 40%
    if (processedFiles.length > 0) score += 40;
    
    // Surveys contribute 35%
    if (surveyData.completed > 0) score += 35;
    
    // Consultations contribute 25%
    if (consultationData.completed > 0) score += 25;
    
    return Math.min(score, 100);
}

async function getLatestInsights(userId) {
    // Return sample insights - in production, fetch from processed data
    return [
        {
            type: 'financial',
            title: 'Revenue Growth Opportunity',
            description: 'Analysis suggests 23% revenue increase possible through operational efficiency improvements',
            confidence: 87,
            priority: 'high'
        },
        {
            type: 'operational',
            title: 'Process Bottleneck Identified',
            description: 'Employee surveys reveal approval workflow causing 2-day delays',
            confidence: 92,
            priority: 'medium'
        }
    ];
}

async function getRecommendations(userId) {
    // Return sample recommendations - in production, generate from AI analysis
    return [
        {
            title: 'Implement Automated Approval System',
            impact: 'High',
            effort: 'Medium',
            timeline: '2-3 weeks',
            description: 'Reduce approval delays by 80% through workflow automation'
        },
        {
            title: 'Optimize Inventory Management',
            impact: 'Medium',
            effort: 'Low',
            timeline: '1 week',
            description: 'AI-driven inventory predictions can reduce holding costs by 15%'
        }
    ];
}

async function initiateCompanyOnboarding(userId, companyData, plan) {
    const onboardingSteps = {
        'basic-neural': [
            'document_upload',
            'natural_language_input',
            'ai_partner_generation'
        ],
        'advanced-neural': [
            'document_upload',
            'natural_language_input',
            'employee_survey_setup',
            'ai_partner_generation'
        ],
        'enterprise-neural': [
            'document_upload',
            'natural_language_input',
            'employee_survey_setup',
            'consultation_scheduling',
            'ai_partner_generation'
        ]
    };

    const steps = onboardingSteps[plan] || onboardingSteps['basic-neural'];
    
    // Save onboarding data
    const onboardingData = {
        userId,
        companyData,
        plan,
        steps,
        currentStep: 0,
        status: 'in_progress',
        createdAt: new Date().toISOString()
    };

    await fs.writeFile(
        path.join('data', 'onboarding', `${userId}_onboarding.json`),
        JSON.stringify(onboardingData, null, 2)
    );

    return {
        onboardingId: userId,
        steps,
        currentStep: steps[0],
        estimatedCompletion: getEstimatedCompletion(plan)
    };
}

function getEstimatedCompletion(plan) {
    const completionTimes = {
        'basic-neural': 2, // 2 days
        'advanced-neural': 7, // 1 week
        'enterprise-neural': 14 // 2 weeks
    };

    const days = completionTimes[plan] || 2;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// Error handling middleware
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
        console.log('🔄 Initializing AI Data Curation Platform...');
        
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }
        
        // Initialize database (run migrations and seeds)
        const dbInitialized = await initializeDatabase();
        if (!dbInitialized) {
            throw new Error('Database initialization failed');
        }
        
        // Ensure required directories exist
        await ensureDirectories();
        
        app.listen(PORT, () => {
            console.log('\n🎉 AI Data Curation Platform Started Successfully!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🚀 Server running on: http://localhost:${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
            console.log(`🔐 Authentication: /api/auth/*`);
            console.log(`💾 Data processing: /api/data/*`);
            console.log(`📧 Employee surveys: /api/surveys/*`);
            console.log(`🎥 Zoom integration: /api/zoom/*`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\n📝 Demo Accounts Available:');
            console.log('   Username: demo     | Password: demo123     | Plan: Advanced Neural');
            console.log('   Username: admin    | Password: admin123    | Plan: Enterprise Neural');
            console.log('   Username: enterprise_user | Password: enterprise123 | Plan: Enterprise Neural');
            console.log('   Username: startup_founder | Password: startup123    | Plan: Basic Neural (Trial)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await closeConnection();
    process.exit(0);
});

startServer();