// Employee Survey System for Advanced Tier
// Automated email surveys to gather employee insights

const express = require('express');
const nodemailer = require('nodemailer');
const { DataProcessor } = require('./data-processor');

class EmployeeSurveySystem {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.emailTransporter = this.setupEmailTransporter();
    }

    setupEmailTransporter() {
        // Configure email transporter (using environment variables)
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Generate personalized survey questions using Grok
    async generateSurveyQuestions(employeeRole, department, businessContext) {
        const prompt = `
        Generate a comprehensive employee survey for gathering business intelligence data:
        
        Employee Role: ${employeeRole}
        Department: ${department}
        Business Context: ${JSON.stringify(businessContext)}
        
        Create 15-20 targeted questions that will help understand:
        1. Daily workflows and processes
        2. Pain points and inefficiencies
        3. Team dynamics and communication
        4. Resource needs and constraints
        5. Innovation opportunities
        6. Customer interaction insights
        7. Performance metrics and KPIs
        8. Training and development needs
        9. Technology usage and preferences
        10. Strategic insights and suggestions
        
        Make questions specific to their role and department.
        Include both multiple choice and open-ended questions.
        Return as JSON array with question objects containing: id, type, question, options (if applicable), category.
        `;

        try {
            const response = await this.dataProcessor.callGrokAPI(prompt);
            return JSON.parse(response.content);
        } catch (error) {
            console.error('Error generating survey questions:', error);
            return this.getDefaultSurveyQuestions(employeeRole, department);
        }
    }

    // Send automated survey emails
    async sendSurveyEmails(companyId, employees, surveyConfig) {
        const results = [];

        for (const employee of employees) {
            try {
                // Generate personalized questions
                const questions = await this.generateSurveyQuestions(
                    employee.role, 
                    employee.department, 
                    surveyConfig.businessContext
                );

                // Create unique survey link
                const surveyId = this.generateSurveyId(companyId, employee.id);
                const surveyLink = `${process.env.FRONTEND_URL}/survey/${surveyId}`;

                // Save survey data
                await this.saveSurveyData(surveyId, {
                    companyId,
                    employeeId: employee.id,
                    employee: employee,
                    questions: questions,
                    status: 'sent',
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                });

                // Send email
                const emailSent = await this.sendSurveyEmail(employee, surveyLink, questions.length);
                
                results.push({
                    employeeId: employee.id,
                    email: employee.email,
                    surveyId: surveyId,
                    status: emailSent ? 'sent' : 'failed',
                    questionsCount: questions.length
                });

            } catch (error) {
                console.error(`Error sending survey to ${employee.email}:`, error);
                results.push({
                    employeeId: employee.id,
                    email: employee.email,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return results;
    }

    // Send individual survey email
    async sendSurveyEmail(employee, surveyLink, questionCount) {
        const emailTemplate = this.generateEmailTemplate(employee, surveyLink, questionCount);

        try {
            await this.emailTransporter.sendMail({
                from: `"AI Data Curation" <${process.env.SMTP_USER}>`,
                to: employee.email,
                subject: `Help Build Our AI Business Partner - Quick ${questionCount}-Question Survey`,
                html: emailTemplate,
                text: this.generateTextEmail(employee, surveyLink)
            });

            return true;
        } catch (error) {
            console.error('Email sending error:', error);
            return false;
        }
    }

    // Generate HTML email template
    generateEmailTemplate(employee, surveyLink, questionCount) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #627eea 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
                .button { display: inline-block; background: #627eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #6b7280; }
                .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🧠 Help Build Our AI Business Partner</h1>
                    <p>Your insights will help create an AI that understands our business better</p>
                </div>
                
                <div class="content">
                    <h2>Hi ${employee.firstName || employee.name},</h2>
                    
                    <p>We're building a custom AI business partner that will help our company make better decisions, improve efficiency, and drive growth. Your unique perspective and experience are crucial to making this AI truly understand our business.</p>
                    
                    <div class="highlight">
                        <strong>📊 Quick Survey Details:</strong><br>
                        • ${questionCount} targeted questions about your role and processes<br>
                        • Takes approximately 10-15 minutes to complete<br>
                        • Your responses help train our AI to understand our operations<br>
                        • All responses are confidential and used only for AI training
                    </div>
                    
                    <p><strong>What we're learning about:</strong></p>
                    <ul>
                        <li>Your daily workflows and processes</li>
                        <li>Challenges and opportunities you see</li>
                        <li>How technology can better support your work</li>
                        <li>Ideas for improving our operations</li>
                        <li>Your interactions with customers and other departments</li>
                    </ul>
                    
                    <p>Your input will directly shape how our AI partner understands and supports our ${employee.department || 'team'}.</p>
                    
                    <div style="text-align: center;">
                        <a href="${surveyLink}" class="button">Start Survey (${questionCount} Questions)</a>
                    </div>
                    
                    <p><small>Survey expires in 7 days. If you have any questions, please contact your manager or IT support.</small></p>
                </div>
                
                <div class="footer">
                    <p>This survey is part of our AI Business Partner initiative.<br>
                    Your participation helps create smarter, more efficient business operations.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Generate plain text email
    generateTextEmail(employee, surveyLink) {
        return `
Hi ${employee.firstName || employee.name},

We're building a custom AI business partner for our company, and your insights are crucial to its success.

Please take our quick survey to help train the AI about our business operations:
${surveyLink}

The survey takes about 10-15 minutes and covers your daily workflows, challenges, and ideas for improvement.

Your responses are confidential and will only be used to train our AI system.

Thank you for your participation!

AI Data Curation Team
        `;
    }

    // Process survey responses
    async processSurveyResponse(surveyId, responses) {
        try {
            // Get survey data
            const surveyData = await this.getSurveyData(surveyId);
            if (!surveyData) {
                throw new Error('Survey not found');
            }

            // Process responses with Grok
            const processedInsights = await this.extractEmployeeInsights(
                responses, 
                surveyData.employee, 
                surveyData.questions
            );

            // Save processed response
            await this.saveSurveyResponse(surveyId, {
                responses: responses,
                processedInsights: processedInsights,
                completedAt: new Date().toISOString(),
                status: 'completed'
            });

            // Update survey status
            await this.updateSurveyStatus(surveyId, 'completed');

            return processedInsights;
        } catch (error) {
            console.error('Error processing survey response:', error);
            throw error;
        }
    }

    // Extract insights from survey responses using Grok
    async extractEmployeeInsights(responses, employee, questions) {
        const prompt = `
        Analyze the following employee survey responses and extract key business insights:
        
        Employee: ${JSON.stringify(employee)}
        Questions: ${JSON.stringify(questions)}
        Responses: ${JSON.stringify(responses)}
        
        Extract and structure:
        1. Operational insights and process improvements
        2. Technology needs and pain points
        3. Team dynamics and communication patterns
        4. Customer interaction insights
        5. Innovation opportunities
        6. Training and development needs
        7. Resource constraints and requirements
        8. Strategic recommendations from employee perspective
        
        Convert into structured data that can be used to train an AI business partner.
        Focus on actionable insights and specific business intelligence.
        Return as detailed JSON with categories and confidence scores.
        `;

        try {
            const response = await this.dataProcessor.callGrokAPI(prompt);
            return JSON.parse(response.content);
        } catch (error) {
            console.error('Error extracting insights:', error);
            return { error: 'Failed to process insights' };
        }
    }

    // Aggregate insights from all survey responses
    async aggregateCompanyInsights(companyId) {
        const allResponses = await this.getAllCompanySurveyResponses(companyId);
        
        const prompt = `
        Aggregate and analyze all employee survey responses for comprehensive business insights:
        
        Survey Responses: ${JSON.stringify(allResponses)}
        
        Create a comprehensive business intelligence report covering:
        1. Overall operational efficiency patterns
        2. Common pain points and challenges across departments
        3. Technology adoption and needs assessment
        4. Communication and collaboration insights
        5. Customer service and interaction patterns
        6. Innovation opportunities and suggestions
        7. Training and development priorities
        8. Resource allocation recommendations
        9. Strategic insights for business growth
        10. AI integration opportunities
        
        Provide actionable recommendations and priority rankings.
        Include confidence scores and supporting evidence from responses.
        Return as comprehensive JSON business intelligence report.
        `;

        try {
            const response = await this.dataProcessor.callGrokAPI(prompt);
            const aggregatedInsights = JSON.parse(response.content);
            
            // Save aggregated insights
            await this.saveAggregatedInsights(companyId, aggregatedInsights);
            
            return aggregatedInsights;
        } catch (error) {
            console.error('Error aggregating insights:', error);
            throw error;
        }
    }

    // Utility methods
    generateSurveyId(companyId, employeeId) {
        return `survey_${companyId}_${employeeId}_${Date.now()}`;
    }

    async saveSurveyData(surveyId, data) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join('data', 'surveys', `${surveyId}.json`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    async getSurveyData(surveyId) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const filePath = path.join('data', 'surveys', `${surveyId}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    async saveSurveyResponse(surveyId, responseData) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join('data', 'survey_responses', `${surveyId}_response.json`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(responseData, null, 2));
    }

    async updateSurveyStatus(surveyId, status) {
        const surveyData = await this.getSurveyData(surveyId);
        if (surveyData) {
            surveyData.status = status;
            surveyData.updatedAt = new Date().toISOString();
            await this.saveSurveyData(surveyId, surveyData);
        }
    }

    async getAllCompanySurveyResponses(companyId) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const responsesDir = path.join('data', 'survey_responses');
            const files = await fs.readdir(responsesDir);
            const companyResponses = [];
            
            for (const file of files) {
                if (file.includes(`survey_${companyId}_`)) {
                    const filePath = path.join(responsesDir, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    companyResponses.push(JSON.parse(data));
                }
            }
            
            return companyResponses;
        } catch (error) {
            return [];
        }
    }

    async saveAggregatedInsights(companyId, insights) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join('data', 'aggregated_insights', `company_${companyId}_insights.json`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify({
            companyId,
            insights,
            generatedAt: new Date().toISOString()
        }, null, 2));
    }

    // Default survey questions fallback
    getDefaultSurveyQuestions(role, department) {
        return [
            {
                id: 1,
                type: 'multiple_choice',
                question: 'How would you rate the efficiency of your current daily workflows?',
                options: ['Very Efficient', 'Efficient', 'Neutral', 'Inefficient', 'Very Inefficient'],
                category: 'operations'
            },
            {
                id: 2,
                type: 'open_ended',
                question: 'What is the biggest challenge you face in your role?',
                category: 'challenges'
            },
            {
                id: 3,
                type: 'multiple_choice',
                question: 'How often do you interact with customers or clients?',
                options: ['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never'],
                category: 'customer_interaction'
            },
            // Add more default questions...
        ];
    }
}

// API Routes
const router = express.Router();
const surveySystem = new EmployeeSurveySystem();

// Send surveys to employees
router.post('/send-surveys', async (req, res) => {
    try {
        const { companyId, employees, surveyConfig } = req.body;

        if (!employees || employees.length === 0) {
            return res.status(400).json({ error: 'No employees provided' });
        }

        const results = await surveySystem.sendSurveyEmails(companyId, employees, surveyConfig);
        
        res.json({
            success: true,
            message: 'Surveys sent successfully',
            results: results,
            totalSent: results.filter(r => r.status === 'sent').length,
            totalFailed: results.filter(r => r.status === 'failed' || r.status === 'error').length
        });
    } catch (error) {
        console.error('Survey sending error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit survey response
router.post('/submit-response/:surveyId', async (req, res) => {
    try {
        const { surveyId } = req.params;
        const { responses } = req.body;

        const insights = await surveySystem.processSurveyResponse(surveyId, responses);
        
        res.json({
            success: true,
            message: 'Survey response processed successfully',
            insights: insights
        });
    } catch (error) {
        console.error('Survey response error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get aggregated company insights
router.get('/insights/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const insights = await surveySystem.aggregateCompanyInsights(companyId);
        
        res.json({
            success: true,
            insights: insights
        });
    } catch (error) {
        console.error('Insights aggregation error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, EmployeeSurveySystem };