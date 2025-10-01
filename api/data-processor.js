// Data Processing API for AI Partner Builder
// This handles file uploads, data extraction, and Grok API integration

const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept financial and inventory files
        const allowedTypes = ['.pdf', '.xlsx', '.xls', '.csv', '.txt', '.docx', '.doc'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Please upload financial or inventory documents.'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

class DataProcessor {
    constructor() {
        this.grokApiKey = process.env.GROK_API_KEY;
        this.grokApiUrl = 'https://api.x.ai/v1/chat/completions';
    }

    // Process uploaded files and extract business data
    async processFiles(files, userId, businessContext) {
        const processedData = {
            financials: {},
            inventory: {},
            operations: {},
            extractedText: [],
            aiPrompts: []
        };

        for (const file of files) {
            try {
                const fileData = await this.extractFileData(file);
                const categorizedData = await this.categorizeData(fileData, file.originalname);
                
                // Merge categorized data
                Object.assign(processedData.financials, categorizedData.financials || {});
                Object.assign(processedData.inventory, categorizedData.inventory || {});
                Object.assign(processedData.operations, categorizedData.operations || {});
                
                processedData.extractedText.push({
                    filename: file.originalname,
                    content: fileData.text,
                    metadata: fileData.metadata
                });

            } catch (error) {
                console.error(`Error processing file ${file.originalname}:`, error);
            }
        }

        // Generate AI prompts using Grok
        processedData.aiPrompts = await this.generateAIPrompts(processedData, businessContext);
        
        // Save processed data
        await this.saveProcessedData(userId, processedData);
        
        return processedData;
    }

    // Extract data from various file types
    async extractFileData(file) {
        const ext = path.extname(file.originalname).toLowerCase();
        let extractedData = { text: '', metadata: {} };

        switch (ext) {
            case '.pdf':
                extractedData = await this.extractPDFData(file.path);
                break;
            case '.xlsx':
            case '.xls':
                extractedData = await this.extractExcelData(file.path);
                break;
            case '.csv':
                extractedData = await this.extractCSVData(file.path);
                break;
            case '.txt':
                extractedData = await this.extractTextData(file.path);
                break;
            case '.docx':
            case '.doc':
                extractedData = await this.extractWordData(file.path);
                break;
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }

        return extractedData;
    }

    // Categorize extracted data using AI
    async categorizeData(fileData, filename) {
        const prompt = `
        Analyze the following business document data and categorize it into financial, inventory, and operational information:
        
        Filename: ${filename}
        Content: ${fileData.text.substring(0, 2000)}...
        
        Please extract and categorize:
        1. Financial data (revenue, expenses, profits, cash flow, etc.)
        2. Inventory data (products, quantities, values, suppliers, etc.)
        3. Operational data (processes, workflows, employee info, etc.)
        
        Return the data in JSON format with clear categories.
        `;

        try {
            const response = await this.callGrokAPI(prompt);
            return JSON.parse(response.content);
        } catch (error) {
            console.error('Error categorizing data:', error);
            return { financials: {}, inventory: {}, operations: {} };
        }
    }

    // Generate AI partner prompts using Grok
    async generateAIPrompts(processedData, businessContext) {
        const prompt = `
        Based on the following business data, create comprehensive AI prompts that will help build a custom AI business partner:

        Business Context: ${JSON.stringify(businessContext)}
        Financial Data: ${JSON.stringify(processedData.financials)}
        Inventory Data: ${JSON.stringify(processedData.inventory)}
        Operational Data: ${JSON.stringify(processedData.operations)}

        Generate specific AI prompts for:
        1. Financial analysis and forecasting
        2. Inventory management and optimization
        3. Operational efficiency improvements
        4. Strategic business recommendations
        5. Risk assessment and mitigation
        6. Growth opportunities identification

        Each prompt should be detailed and specific to this business's data and context.
        Return as a JSON array of prompt objects with categories and descriptions.
        `;

        try {
            const response = await this.callGrokAPI(prompt);
            return JSON.parse(response.content);
        } catch (error) {
            console.error('Error generating AI prompts:', error);
            return [];
        }
    }

    // Process natural language input from business owner
    async processNaturalLanguage(userId, input, context = {}) {
        const prompt = `
        Process the following natural language input from a business owner and extract key business insights:
        
        Input: "${input}"
        Context: ${JSON.stringify(context)}
        
        Extract and structure:
        1. Business goals and objectives
        2. Current challenges and pain points
        3. Key processes and workflows
        4. Team structure and roles
        5. Market position and competition
        6. Growth plans and strategies
        
        Convert this into structured data that can be used to train an AI business partner.
        Return as JSON with clear categories and actionable insights.
        `;

        try {
            const response = await this.callGrokAPI(prompt);
            const processedInput = JSON.parse(response.content);
            
            // Save processed natural language data
            await this.saveNaturalLanguageData(userId, {
                originalInput: input,
                processedData: processedInput,
                timestamp: new Date().toISOString(),
                context: context
            });
            
            return processedInput;
        } catch (error) {
            console.error('Error processing natural language:', error);
            throw error;
        }
    }

    // Call Grok API
    async callGrokAPI(prompt, model = 'grok-beta') {
        if (!this.grokApiKey) {
            throw new Error('Grok API key not configured');
        }

        try {
            const response = await axios.post(this.grokApiUrl, {
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert business analyst and AI prompt engineer. Provide detailed, accurate, and actionable responses in the requested format.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                model: model,
                stream: false,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.grokApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                content: response.data.choices[0].message.content,
                usage: response.data.usage
            };
        } catch (error) {
            console.error('Grok API Error:', error.response?.data || error.message);
            throw new Error('Failed to process with Grok API');
        }
    }

    // File extraction methods (simplified implementations)
    async extractPDFData(filePath) {
        // In a real implementation, use pdf-parse or similar
        return { 
            text: 'PDF content would be extracted here',
            metadata: { type: 'pdf', pages: 1 }
        };
    }

    async extractExcelData(filePath) {
        // In a real implementation, use xlsx or exceljs
        return { 
            text: 'Excel data would be extracted here',
            metadata: { type: 'excel', sheets: 1 }
        };
    }

    async extractCSVData(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        return { 
            text: content,
            metadata: { type: 'csv', rows: content.split('\n').length }
        };
    }

    async extractTextData(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        return { 
            text: content,
            metadata: { type: 'text', length: content.length }
        };
    }

    async extractWordData(filePath) {
        // In a real implementation, use mammoth or docx-parser
        return { 
            text: 'Word document content would be extracted here',
            metadata: { type: 'word', pages: 1 }
        };
    }

    // Save processed data to database/storage
    async saveProcessedData(userId, data) {
        const filename = `processed_data_${userId}_${Date.now()}.json`;
        const filePath = path.join('data', 'processed', filename);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        return { filename, path: filePath };
    }

    async saveNaturalLanguageData(userId, data) {
        const filename = `natural_language_${userId}_${Date.now()}.json`;
        const filePath = path.join('data', 'natural_language', filename);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        return { filename, path: filePath };
    }
}

// API Routes
const router = express.Router();
const dataProcessor = new DataProcessor();

// Upload and process files
router.post('/upload-files', upload.array('files', 10), async (req, res) => {
    try {
        const { userId, businessContext } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const processedData = await dataProcessor.processFiles(files, userId, JSON.parse(businessContext || '{}'));
        
        res.json({
            success: true,
            message: 'Files processed successfully',
            data: processedData,
            filesProcessed: files.length
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process natural language input
router.post('/process-language', async (req, res) => {
    try {
        const { userId, input, context } = req.body;

        if (!input || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const processedData = await dataProcessor.processNaturalLanguage(userId, input, context);
        
        res.json({
            success: true,
            message: 'Natural language processed successfully',
            data: processedData
        });
    } catch (error) {
        console.error('Natural language processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate AI partner configuration
router.post('/generate-ai-partner', async (req, res) => {
    try {
        const { userId, businessData, preferences } = req.body;

        const prompt = `
        Create a comprehensive AI partner configuration based on the following business data:
        
        Business Data: ${JSON.stringify(businessData)}
        User Preferences: ${JSON.stringify(preferences)}
        
        Generate:
        1. AI personality and communication style
        2. Specialized knowledge areas
        3. Decision-making frameworks
        4. Reporting and analytics preferences
        5. Integration capabilities
        6. Custom prompts and responses
        
        Return as a detailed JSON configuration that can be used to deploy a custom AI business partner.
        `;

        const response = await dataProcessor.callGrokAPI(prompt);
        const aiPartnerConfig = JSON.parse(response.content);
        
        // Save AI partner configuration
        await dataProcessor.saveProcessedData(userId, {
            type: 'ai_partner_config',
            config: aiPartnerConfig,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: 'AI partner configuration generated',
            config: aiPartnerConfig
        });
    } catch (error) {
        console.error('AI partner generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, DataProcessor };