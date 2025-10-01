// Zoom Integration System for Enterprise Tier
// Human expert team conducts Zoom calls to gather deep business insights

const express = require('express');
const axios = require('axios');
const { DataProcessor } = require('./data-processor');

class ZoomIntegrationSystem {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.zoomApiKey = process.env.ZOOM_API_KEY;
        this.zoomApiSecret = process.env.ZOOM_API_SECRET;
        this.zoomAccountId = process.env.ZOOM_ACCOUNT_ID;
        this.baseUrl = 'https://api.zoom.us/v2';
    }

    // Generate Zoom access token
    async getZoomAccessToken() {
        try {
            const response = await axios.post('https://zoom.us/oauth/token', null, {
                params: {
                    grant_type: 'account_credentials',
                    account_id: this.zoomAccountId
                },
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.zoomApiKey}:${this.zoomApiSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            return response.data.access_token;
        } catch (error) {
            console.error('Error getting Zoom access token:', error);
            throw new Error('Failed to authenticate with Zoom');
        }
    }

    // Schedule consultation call with business owner
    async scheduleConsultationCall(companyId, businessOwner, preferences = {}) {
        try {
            const accessToken = await this.getZoomAccessToken();
            
            // Generate consultation agenda based on business context
            const agenda = await this.generateConsultationAgenda(companyId, businessOwner, preferences);
            
            // Create Zoom meeting
            const meeting = await this.createZoomMeeting(accessToken, {
                topic: `Business Neural Network Consultation - ${businessOwner.company}`,
                type: 2, // Scheduled meeting
                start_time: preferences.preferredTime || this.getNextAvailableSlot(),
                duration: preferences.duration || 90, // 90 minutes default
                timezone: preferences.timezone || 'UTC',
                agenda: agenda.summary,
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: true,
                    waiting_room: true,
                    audio: 'both',
                    auto_recording: 'cloud'
                }
            });

            // Save consultation data
            const consultationId = await this.saveConsultationData(companyId, {
                meetingId: meeting.id,
                businessOwner: businessOwner,
                agenda: agenda,
                meeting: meeting,
                status: 'scheduled',
                scheduledAt: new Date().toISOString()
            });

            // Send calendar invite and preparation materials
            await this.sendConsultationPreparation(businessOwner, meeting, agenda);

            return {
                consultationId,
                meeting,
                agenda,
                preparationSent: true
            };

        } catch (error) {
            console.error('Error scheduling consultation:', error);
            throw error;
        }
    }

    // Generate consultation agenda using Grok
    async generateConsultationAgenda(companyId, businessOwner, preferences) {
        // Get existing business data if available
        const existingData = await this.getExistingBusinessData(companyId);
        
        const prompt = `
        Create a comprehensive consultation agenda for a 90-minute Zoom call with a business owner:
        
        Business Owner: ${JSON.stringify(businessOwner)}
        Existing Data: ${JSON.stringify(existingData)}
        Preferences: ${JSON.stringify(preferences)}
        
        Generate a detailed agenda that covers:
        1. Business overview and history (10 minutes)
        2. Current operations and processes (20 minutes)
        3. Team structure and dynamics (15 minutes)
        4. Financial landscape and goals (15 minutes)
        5. Technology infrastructure (10 minutes)
        6. Market position and competition (10 minutes)
        7. Growth plans and challenges (10 minutes)
        
        For each section, provide:
        - Specific questions to ask
        - Key insights to gather
        - Follow-up topics
        - Data points to collect
        
        Also generate:
        - Pre-call preparation checklist for the business owner
        - Documents they should have ready
        - Key objectives for the AI neural network
        
        Return as detailed JSON structure with timing and objectives.
        `;

        try {
            const response = await this.dataProcessor.callGrokAPI(prompt);
            return JSON.parse(response.content);
        } catch (error) {
            console.error('Error generating agenda:', error);
            return this.getDefaultConsultationAgenda();
        }
    }

    // Create Zoom meeting
    async createZoomMeeting(accessToken, meetingData) {
        try {
            const response = await axios.post(`${this.baseUrl}/users/me/meetings`, meetingData, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error creating Zoom meeting:', error);
            throw new Error('Failed to create Zoom meeting');
        }
    }

    // Process consultation recording and extract insights
    async processConsultationRecording(consultationId, recordingData) {
        try {
            // Get consultation data
            const consultation = await this.getConsultationData(consultationId);
            
            // Transcribe audio if needed (using Zoom's transcription or external service)
            const transcript = await this.getOrCreateTranscript(recordingData);
            
            // Extract insights using Grok
            const insights = await this.extractConsultationInsights(
                transcript, 
                consultation.agenda, 
                consultation.businessOwner
            );

            // Generate AI partner recommendations
            const aiRecommendations = await this.generateAIPartnerRecommendations(insights);

            // Save processed consultation
            await this.saveConsultationResults(consultationId, {
                transcript: transcript,
                insights: insights,
                aiRecommendations: aiRecommendations,
                processedAt: new Date().toISOString(),
                status: 'completed'
            });

            // Generate follow-up report
            const report = await this.generateConsultationReport(consultationId, insights, aiRecommendations);

            return {
                insights,
                aiRecommendations,
                report,
                consultationId
            };

        } catch (error) {
            console.error('Error processing consultation:', error);
            throw error;
        }
    }

    // Extract insights from consultation transcript
    async extractConsultationInsights(transcript, agenda, businessOwner) {
        const prompt = `
        Analyze the following business consultation transcript and extract comprehensive insights:
        
        Transcript: ${transcript}
        Agenda: ${JSON.stringify(agenda)}
        Business Owner: ${JSON.stringify(businessOwner)}
        
        Extract detailed insights about:
        1. Business model and value proposition
        2. Operational workflows and processes
        3. Team structure, roles, and dynamics
        4. Financial health and projections
        5. Technology stack and digital maturity
        6. Market position and competitive landscape
        7. Growth strategies and expansion plans
        8. Pain points and operational challenges
        9. Customer relationships and service delivery
        10. Innovation opportunities and priorities
        11. Risk factors and mitigation strategies
        12. Leadership style and decision-making processes
        13. Company culture and values
        14. Strategic partnerships and vendor relationships
        15. Performance metrics and KPIs
        
        For each insight category, provide:
        - Key findings with supporting quotes
        - Confidence level (1-10)
        - Actionable recommendations
        - Priority level for AI integration
        - Potential impact on business operations
        
        Return as comprehensive JSON structure with detailed analysis.
        `;

        try {
            const response = await this.dataProcessor.callGrokAPI(prompt);
            return JSON.parse(response.content);
        } catch (error) {
            console.error('Error extracting insights:', error);
            throw error;
        }
    }

    // Generate AI partner recommendations based on consultation
    async generateAIPartnerRecommendations(insights) {
        const prompt = `
        Based on the following business consultation insights, create detailed AI partner recommendations:
        
        Business Insights: ${JSON.stringify(insights)}
        
        Generate comprehensive recommendations for:
        1. AI Partner Personality and Communication Style
        2. Core Knowledge Areas and Expertise
        3. Decision-Making Frameworks and Logic
        4. Automated Workflow Integrations
        5. Reporting and Analytics Capabilities
        6. Customer Interaction Protocols
        7. Risk Assessment and Management
        8. Growth Strategy Support
        9. Performance Monitoring and KPIs
        10. Training and Learning Priorities
        
        For each recommendation, provide:
        - Detailed implementation plan
        - Expected business impact
        - Technical requirements
        - Timeline and milestones
        - Success metrics
        - Integration points with existing systems
        
        Also generate:
        - Custom AI prompts and responses
        - Specialized business logic rules
        - Automated decision trees
        - Integration APIs and workflows
        - Performance benchmarks and goals
        
        Return as actionable JSON configuration for AI partner deployment.
        `;

        try {
            const response = await this.dataProcessor.callGrokAPI(prompt);
            return JSON.parse(response.content);
        } catch (error) {
            console.error('Error generating AI recommendations:', error);
            throw error;
        }
    }

    // Generate consultation report
    async generateConsultationReport(consultationId, insights, aiRecommendations) {
        const consultation = await this.getConsultationData(consultationId);
        
        const prompt = `
        Create a comprehensive business consultation report:
        
        Consultation Data: ${JSON.stringify(consultation)}
        Extracted Insights: ${JSON.stringify(insights)}
        AI Recommendations: ${JSON.stringify(aiRecommendations)}
        
        Generate a professional report including:
        1. Executive Summary
        2. Business Analysis Overview
        3. Key Findings and Insights
        4. Operational Assessment
        5. Technology Readiness Evaluation
        6. AI Integration Roadmap
        7. Implementation Timeline
        8. Expected ROI and Benefits
        9. Risk Assessment and Mitigation
        10. Next Steps and Action Items
        
        Format as professional business document with clear sections and actionable recommendations.
        Include specific metrics, timelines, and success criteria.
        Return as structured JSON that can be formatted into PDF/HTML report.
        `;

        try {
            const response = await this.dataProcessor.callGrokAPI(prompt);
            const report = JSON.parse(response.content);
            
            // Save report
            await this.saveConsultationReport(consultationId, report);
            
            return report;
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }

    // Send consultation preparation materials
    async sendConsultationPreparation(businessOwner, meeting, agenda) {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const emailTemplate = this.generatePreparationEmail(businessOwner, meeting, agenda);

        try {
            await transporter.sendMail({
                from: `"AI Data Curation - Expert Team" <${process.env.SMTP_USER}>`,
                to: businessOwner.email,
                subject: `Your Business Neural Network Consultation - Preparation Guide`,
                html: emailTemplate,
                attachments: [
                    {
                        filename: 'consultation-agenda.pdf',
                        content: await this.generateAgendaPDF(agenda)
                    }
                ]
            });

            return true;
        } catch (error) {
            console.error('Error sending preparation email:', error);
            return false;
        }
    }

    // Generate preparation email template
    generatePreparationEmail(businessOwner, meeting, agenda) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #627eea 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
                .meeting-details { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .preparation-list { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 Your Business Neural Network Consultation</h1>
                    <p>Expert-led deep dive into your business operations</p>
                </div>
                
                <div class="content">
                    <h2>Hi ${businessOwner.firstName || businessOwner.name},</h2>
                    
                    <p>We're excited to conduct your comprehensive business consultation! Our expert team will work with you to understand every aspect of your business and create a truly intelligent AI partner.</p>
                    
                    <div class="meeting-details">
                        <h3>📅 Meeting Details</h3>
                        <p><strong>Date & Time:</strong> ${new Date(meeting.start_time).toLocaleString()}</p>
                        <p><strong>Duration:</strong> ${meeting.duration} minutes</p>
                        <p><strong>Join URL:</strong> <a href="${meeting.join_url}">${meeting.join_url}</a></p>
                        <p><strong>Meeting ID:</strong> ${meeting.id}</p>
                        <p><strong>Passcode:</strong> ${meeting.password || 'Not required'}</p>
                    </div>
                    
                    <div class="preparation-list">
                        <h3>📋 Please Prepare the Following:</h3>
                        <ul>
                            <li><strong>Financial Documents:</strong> Recent P&L statements, balance sheets, cash flow reports</li>
                            <li><strong>Operational Data:</strong> Process documentation, workflow charts, org charts</li>
                            <li><strong>Technology Overview:</strong> Current software stack, integrations, pain points</li>
                            <li><strong>Team Information:</strong> Employee roles, responsibilities, performance metrics</li>
                            <li><strong>Customer Data:</strong> Customer profiles, feedback, interaction patterns</li>
                            <li><strong>Strategic Plans:</strong> Growth goals, expansion plans, market analysis</li>
                        </ul>
                    </div>
                    
                    <h3>🎯 What We'll Cover</h3>
                    <p>Our consultation will dive deep into:</p>
                    <ul>
                        <li>Your business model and value proposition</li>
                        <li>Current operations and efficiency opportunities</li>
                        <li>Team dynamics and communication patterns</li>
                        <li>Technology infrastructure and digital readiness</li>
                        <li>Market position and competitive advantages</li>
                        <li>Growth strategies and scaling challenges</li>
                    </ul>
                    
                    <p><strong>The Result:</strong> A custom AI business partner that understands your company inside and out, ready to help with strategic decisions, operational efficiency, and growth initiatives.</p>
                    
                    <p>If you need to reschedule or have any questions, please contact us at least 24 hours before the meeting.</p>
                    
                    <p>Looking forward to building your AI partner together!</p>
                    
                    <p>Best regards,<br>
                    The AI Data Curation Expert Team</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Utility methods
    getNextAvailableSlot() {
        // Simple implementation - in production, integrate with calendar system
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow
        return tomorrow.toISOString();
    }

    async getExistingBusinessData(companyId) {
        // Retrieve any existing data for the company
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            const dataPath = path.join('data', 'processed', `processed_data_${companyId}_*.json`);
            // In production, use proper database query
            return {};
        } catch (error) {
            return {};
        }
    }

    async saveConsultationData(companyId, data) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const consultationId = `consultation_${companyId}_${Date.now()}`;
        const filePath = path.join('data', 'consultations', `${consultationId}.json`);
        
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        return consultationId;
    }

    async getConsultationData(consultationId) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const filePath = path.join('data', 'consultations', `${consultationId}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error('Consultation not found');
        }
    }

    async saveConsultationResults(consultationId, results) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join('data', 'consultation_results', `${consultationId}_results.json`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(results, null, 2));
    }

    async saveConsultationReport(consultationId, report) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join('data', 'consultation_reports', `${consultationId}_report.json`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(report, null, 2));
    }

    async getOrCreateTranscript(recordingData) {
        // In production, integrate with Zoom's transcription API or external service
        return "Transcript would be generated from recording here...";
    }

    async generateAgendaPDF(agenda) {
        // In production, use PDF generation library
        return Buffer.from("PDF agenda would be generated here");
    }

    getDefaultConsultationAgenda() {
        return {
            summary: "Comprehensive business consultation for AI partner development",
            sections: [
                {
                    title: "Business Overview",
                    duration: 10,
                    objectives: ["Understand business model", "Identify value proposition"]
                }
                // Add more default sections...
            ]
        };
    }
}

// API Routes
const router = express.Router();
const zoomSystem = new ZoomIntegrationSystem();

// Schedule consultation
router.post('/schedule-consultation', async (req, res) => {
    try {
        const { companyId, businessOwner, preferences } = req.body;

        const consultation = await zoomSystem.scheduleConsultationCall(companyId, businessOwner, preferences);
        
        res.json({
            success: true,
            message: 'Consultation scheduled successfully',
            consultation: consultation
        });
    } catch (error) {
        console.error('Consultation scheduling error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process consultation recording
router.post('/process-consultation/:consultationId', async (req, res) => {
    try {
        const { consultationId } = req.params;
        const { recordingData } = req.body;

        const results = await zoomSystem.processConsultationRecording(consultationId, recordingData);
        
        res.json({
            success: true,
            message: 'Consultation processed successfully',
            results: results
        });
    } catch (error) {
        console.error('Consultation processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, ZoomIntegrationSystem };