// Dashboard JavaScript

// Dashboard data and functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initializeDashboard();
    setupNavigation();
    animateProgressBars();
    animateStatCounters();
    setupQuickActions();
    setupNeuralMap();
});

function initializeDashboard() {
    // Check authentication
    if (!window.AuthSystem.checkAuth()) {
        return;
    }

    // Load user-specific data
    const user = window.AuthSystem.getCurrentUser();
    if (user) {
        loadUserDashboard(user);
    }
}

function loadUserDashboard(user) {
    // Customize dashboard based on user plan
    const planFeatures = {
        'basic-neural': {
            maxDocuments: 50,
            maxEmployees: 10,
            aiInsights: 5
        },
        'advanced-neural': {
            maxDocuments: 200,
            maxEmployees: 50,
            aiInsights: 25
        },
        'enterprise-neural': {
            maxDocuments: 1000,
            maxEmployees: 500,
            aiInsights: 100
        }
    };

    const features = planFeatures[user.plan] || planFeatures['basic-neural'];
    
    // Update plan-specific limits and features
    updateDashboardForPlan(features);
}

function updateDashboardForPlan(features) {
    // This would update various dashboard elements based on plan limits
    console.log('Dashboard customized for plan features:', features);
}

function setupNavigation() {
    // Sidebar navigation
    const menuLinks = document.querySelectorAll('.menu-link');
    const sections = document.querySelectorAll('.dashboard-section');

    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all menu items
            document.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.parentElement.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Show target section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

function animateProgressBars() {
    // Animate progress bars when they come into view
    const progressBars = document.querySelectorAll('.progress-fill');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progressBar = entry.target;
                const width = progressBar.style.width;
                progressBar.style.width = '0%';
                
                setTimeout(() => {
                    progressBar.style.width = width;
                }, 100);
                
                observer.unobserve(progressBar);
            }
        });
    }, { threshold: 0.5 });
    
    progressBars.forEach(bar => observer.observe(bar));
}

function animateStatCounters() {
    // Animate counter numbers
    function animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = current;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Animate status values
    const statusValues = document.querySelectorAll('.status-value');
    statusValues.forEach(value => {
        const text = value.textContent;
        const number = parseInt(text);
        if (!isNaN(number)) {
            animateValue(value, 0, number, 2000);
        }
    });
}

function setupQuickActions() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const actionId = this.id;
            handleQuickAction(actionId);
        });
    });
}

function handleQuickAction(actionId) {
    // Handle quick action clicks with actual functionality
    switch(actionId) {
        case 'uploadDocuments':
            showModal('Upload Business Documents', createFileUploadContent());
            break;
        case 'addNaturalLanguage':
            showModal('Add Business Insights', createNaturalLanguageContent());
            break;
        case 'sendSurveys':
            showModal('Send Employee Surveys', createEmployeeSurveyContent());
            break;
        case 'scheduleConsultation':
            showModal('Schedule Expert Consultation', createConsultationContent());
            break;
        default:
            showNotification('Feature coming soon!', 'info');
    }
}

function createFileUploadContent() {
    return `
        <div class="modal-content">
            <div class="upload-description">
                <h3>📊 Upload Your Business Documents</h3>
                <p>Upload financial statements, inventory reports, and operational documents. Our AI will extract key data and integrate it into your business neural network.</p>
            </div>
            
            <div class="upload-area" id="uploadArea">
                <i class="fas fa-cloud-upload-alt"></i>
                <h4>Drag and drop files here or click to browse</h4>
                <p>Supported: PDF, Excel, CSV, Word documents</p>
                <input type="file" id="fileInput" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" style="display: none;">
                <button class="btn btn-outline" onclick="document.getElementById('fileInput').click()">
                    <i class="fas fa-folder-open"></i>
                    Browse Files
                </button>
            </div>
            
            <div class="file-categories">
                <h4>What types of documents should you upload?</h4>
                <div class="category-grid">
                    <div class="category-item">
                        <i class="fas fa-chart-line"></i>
                        <strong>Financial Data</strong>
                        <span>P&L statements, balance sheets, cash flow reports</span>
                    </div>
                    <div class="category-item">
                        <i class="fas fa-boxes"></i>
                        <strong>Inventory Reports</strong>
                        <span>Stock levels, supplier data, product catalogs</span>
                    </div>
                    <div class="category-item">
                        <i class="fas fa-cogs"></i>
                        <strong>Operational Data</strong>
                        <span>Process documents, workflow charts, procedures</span>
                    </div>
                </div>
            </div>
            
            <div class="processing-options">
                <label class="checkbox-label">
                    <input type="checkbox" checked id="extractFinancial">
                    <span class="checkmark"></span>
                    Extract and categorize financial data automatically
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" checked id="processInventory">
                    <span class="checkmark"></span>
                    Analyze inventory patterns and supplier relationships
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" checked id="generatePrompts">
                    <span class="checkmark"></span>
                    Generate AI prompts using Grok API
                </label>
            </div>
            
            <div class="selected-files" id="selectedFiles" style="display: none;">
                <h4>Selected Files:</h4>
                <div class="file-list" id="fileList"></div>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary" id="processFiles" disabled>
                    <i class="fas fa-brain"></i>
                    Process with AI
                </button>
                <button class="btn btn-outline modal-close">Cancel</button>
            </div>
        </div>
    `;
}

function createNaturalLanguageContent() {
    return `
        <div class="modal-content">
            <div class="nl-description">
                <h3>🗣️ Share Your Business Insights</h3>
                <p>Tell us about your business in your own words. Our AI will process your insights and integrate them into your business neural network.</p>
            </div>
            
            <div class="insight-prompts">
                <h4>What would you like to share?</h4>
                <div class="prompt-buttons">
                    <button class="prompt-btn" data-prompt="business-overview">
                        <i class="fas fa-building"></i>
                        Business Overview
                    </button>
                    <button class="prompt-btn" data-prompt="challenges">
                        <i class="fas fa-exclamation-triangle"></i>
                        Current Challenges
                    </button>
                    <button class="prompt-btn" data-prompt="goals">
                        <i class="fas fa-target"></i>
                        Goals & Objectives
                    </button>
                    <button class="prompt-btn" data-prompt="processes">
                        <i class="fas fa-cogs"></i>
                        Key Processes
                    </button>
                </div>
            </div>
            
            <div class="form-group">
                <label>Share your business insights:</label>
                <textarea id="businessInsights" placeholder="Describe your business operations, challenges, goals, team structure, or any other insights you'd like the AI to understand about your company..." rows="8"></textarea>
                <small>The more detail you provide, the better our AI can understand and support your business.</small>
            </div>
            
            <div class="context-options">
                <h4>Context (Optional)</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Focus Area</label>
                        <select id="focusArea">
                            <option value="">Select focus area</option>
                            <option value="operations">Operations & Processes</option>
                            <option value="financial">Financial Management</option>
                            <option value="team">Team & HR</option>
                            <option value="customer">Customer Relations</option>
                            <option value="growth">Growth & Strategy</option>
                            <option value="technology">Technology & Systems</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Priority Level</label>
                        <select id="priorityLevel">
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                            <option value="low">Low Priority</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary" id="processInsights">
                    <i class="fas fa-brain"></i>
                    Process with Grok AI
                </button>
                <button class="btn btn-outline modal-close">Cancel</button>
            </div>
        </div>
    `;
}

function createEmployeeSurveyContent() {
    return `
        <div class="modal-content">
            <div class="survey-description">
                <h3>📧 Send Employee Surveys</h3>
                <p>Automatically send personalized surveys to your employees to gather insights about their roles, processes, and ideas for improvement.</p>
            </div>
            
            <div class="survey-features">
                <div class="feature-highlight">
                    <i class="fas fa-robot"></i>
                    <strong>AI-Generated Questions</strong>
                    <span>Personalized questions based on each employee's role and department</span>
                </div>
                <div class="feature-highlight">
                    <i class="fas fa-envelope"></i>
                    <strong>Automated Emails</strong>
                    <span>Professional survey invitations sent automatically</span>
                </div>
                <div class="feature-highlight">
                    <i class="fas fa-brain"></i>
                    <strong>Grok AI Processing</strong>
                    <span>Responses processed into actionable business insights</span>
                </div>
            </div>
            
            <div class="employee-input">
                <h4>Add Employees for Survey</h4>
                <div class="employee-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Employee Name</label>
                            <input type="text" id="employeeName" placeholder="Full name">
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="employeeEmail" placeholder="employee@company.com">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Department</label>
                            <select id="employeeDepartment">
                                <option value="">Select department</option>
                                <option value="Finance">Finance</option>
                                <option value="HR">Human Resources</option>
                                <option value="Operations">Operations</option>
                                <option value="Sales">Sales</option>
                                <option value="Marketing">Marketing</option>
                                <option value="IT">Information Technology</option>
                                <option value="Customer Service">Customer Service</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Role/Position</label>
                            <input type="text" id="employeeRole" placeholder="e.g., Manager, Analyst, Director">
                        </div>
                    </div>
                    <button class="btn btn-outline" id="addEmployee">
                        <i class="fas fa-plus"></i>
                        Add Employee
                    </button>
                </div>
            </div>
            
            <div class="employee-list" id="employeeList" style="display: none;">
                <h4>Employees to Survey:</h4>
                <div class="employee-items" id="employeeItems"></div>
            </div>
            
            <div class="survey-options">
                <h4>Survey Configuration</h4>
                <label class="checkbox-label">
                    <input type="checkbox" checked id="personalizeQuestions">
                    <span class="checkmark"></span>
                    Generate personalized questions for each role
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" checked id="followUpReminders">
                    <span class="checkmark"></span>
                    Send follow-up reminders after 3 days
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" checked id="anonymousResponses">
                    <span class="checkmark"></span>
                    Keep individual responses confidential
                </label>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary" id="sendSurveys" disabled>
                    <i class="fas fa-paper-plane"></i>
                    Send Surveys
                </button>
                <button class="btn btn-outline modal-close">Cancel</button>
            </div>
        </div>
    `;
}

function createConsultationContent() {
    return `
        <div class="modal-content">
            <div class="consultation-description">
                <h3>🎥 Schedule Expert Consultation</h3>
                <p>Book a comprehensive 90-minute Zoom consultation with our expert team. We'll conduct deep interviews to understand your business and create the most accurate AI partner possible.</p>
            </div>
            
            <div class="consultation-features">
                <div class="feature-highlight">
                    <i class="fas fa-users"></i>
                    <strong>Expert Team Interview</strong>
                    <span>Human specialists conduct detailed business analysis</span>
                </div>
                <div class="feature-highlight">
                    <i class="fas fa-video"></i>
                    <strong>90-Minute Deep Dive</strong>
                    <span>Comprehensive Zoom session covering all business aspects</span>
                </div>
                <div class="feature-highlight">
                    <i class="fas fa-file-alt"></i>
                    <strong>Detailed Report</strong>
                    <span>Professional analysis and AI integration roadmap</span>
                </div>
            </div>
            
            <div class="consultation-form">
                <h4>Consultation Details</h4>
                <div class="form-group">
                    <label>Primary Contact Name</label>
                    <input type="text" id="contactName" placeholder="Your full name">
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="contactEmail" placeholder="your.email@company.com">
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" id="contactPhone" placeholder="+1 (555) 123-4567">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Preferred Date</label>
                        <input type="date" id="preferredDate" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Preferred Time</label>
                        <select id="preferredTime">
                            <option value="">Select time</option>
                            <option value="09:00">9:00 AM</option>
                            <option value="10:00">10:00 AM</option>
                            <option value="11:00">11:00 AM</option>
                            <option value="13:00">1:00 PM</option>
                            <option value="14:00">2:00 PM</option>
                            <option value="15:00">3:00 PM</option>
                            <option value="16:00">4:00 PM</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Timezone</label>
                    <select id="timezone">
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="UTC">UTC</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Key Areas to Focus On</label>
                    <textarea id="focusAreas" placeholder="What specific aspects of your business would you like our experts to focus on during the consultation?" rows="4"></textarea>
                </div>
            </div>
            
            <div class="consultation-agenda">
                <h4>What We'll Cover</h4>
                <div class="agenda-items">
                    <div class="agenda-item">
                        <i class="fas fa-building"></i>
                        <span>Business model and value proposition analysis</span>
                    </div>
                    <div class="agenda-item">
                        <i class="fas fa-cogs"></i>
                        <span>Operational workflows and process mapping</span>
                    </div>
                    <div class="agenda-item">
                        <i class="fas fa-users"></i>
                        <span>Team structure and organizational dynamics</span>
                    </div>
                    <div class="agenda-item">
                        <i class="fas fa-chart-line"></i>
                        <span>Financial landscape and growth strategies</span>
                    </div>
                    <div class="agenda-item">
                        <i class="fas fa-laptop"></i>
                        <span>Technology infrastructure assessment</span>
                    </div>
                    <div class="agenda-item">
                        <i class="fas fa-target"></i>
                        <span>AI integration opportunities and roadmap</span>
                    </div>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary" id="scheduleConsultation">
                    <i class="fas fa-calendar-plus"></i>
                    Schedule Consultation
                </button>
                <button class="btn btn-outline modal-close">Cancel</button>
            </div>
        </div>
    `;
}

function setupNeuralMap() {
    const neuralNodes = document.querySelectorAll('.dashboard-node');
    
    neuralNodes.forEach(node => {
        node.addEventListener('click', function() {
            const nodeType = this.getAttribute('data-type');
            showNodeDetails(nodeType);
        });
        
        // Add floating animation with delay
        const delay = Math.random() * 2;
        node.style.animationDelay = `${delay}s`;
    });
}

function showNodeDetails(nodeType) {
    const nodeInfo = {
        'finance': {
            title: 'Finance Department',
            description: 'Financial data analysis and processing',
            metrics: ['Revenue: $2.3M', 'Expenses: $1.8M', 'Profit Margin: 22%'],
            connections: ['HR', 'Operations', 'Sales']
        },
        'hr': {
            title: 'Human Resources',
            description: 'Employee data and organizational insights',
            metrics: ['Employees: 47', 'Satisfaction: 8.2/10', 'Turnover: 5%'],
            connections: ['Finance', 'Operations']
        },
        'operations': {
            title: 'Operations',
            description: 'Operational efficiency and process optimization',
            metrics: ['Efficiency: 89%', 'Capacity: 76%', 'Quality Score: 9.1/10'],
            connections: ['Finance', 'HR', 'Sales']
        },
        'sales': {
            title: 'Sales Department',
            description: 'Sales performance and customer insights',
            metrics: ['Monthly Sales: $198K', 'Conversion: 12%', 'Leads: 234'],
            connections: ['Finance', 'Operations']
        },
        'ai': {
            title: 'AI Core',
            description: 'Central neural network processing hub',
            metrics: ['Processing Speed: 1.2ms', 'Accuracy: 94.7%', 'Uptime: 99.9%'],
            connections: ['All Departments']
        }
    };

    const info = nodeInfo[nodeType];
    if (info) {
        const content = `
            <div class="node-details">
                <h3>${info.title}</h3>
                <p>${info.description}</p>
                <div class="node-metrics">
                    <h4>Key Metrics:</h4>
                    <ul>
                        ${info.metrics.map(metric => `<li>${metric}</li>`).join('')}
                    </ul>
                </div>
                <div class="node-connections">
                    <h4>Connected To:</h4>
                    <p>${info.connections.join(', ')}</p>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary">View Detailed Analytics</button>
                    <button class="btn btn-outline modal-close">Close</button>
                </div>
            </div>
        `;
        showModal(info.title, content);
    }
}

function showModal(title, content) {
    // Remove existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        transform: scale(0.9);
        transition: transform 0.3s ease-out;
    `;

    modal.innerHTML = `
        <div class="modal-header" style="padding: 24px 32px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">${title}</h2>
            <button class="modal-close" style="background: none; border: none; font-size: 24px; color: #6b7280; cursor: pointer; padding: 4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body" style="padding: 32px;">
            ${content}
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animate in
    setTimeout(() => {
        modal.style.transform = 'scale(1)';
    }, 10);

    // Close modal functionality
    const closeButtons = modal.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.transform = 'scale(0.9)';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        });
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            modal.style.transform = 'scale(0.9)';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    });
}

function showNotification(message, type = 'info') {
    // Reuse the notification system from the main script
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        alert(message); // Fallback
    }
}

// Add some dashboard-specific styles
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    .modal-content .form-group {
        margin-bottom: 16px;
    }
    
    .modal-content label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #374151;
    }
    
    .modal-content input,
    .modal-content select {
        width: 100%;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
    }
    
    .modal-content input:focus,
    .modal-content select:focus {
        border-color: #627eea;
        outline: none;
        box-shadow: 0 0 0 3px rgba(98, 126, 234, 0.1);
    }
    
    .modal-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
    }
    
    .upload-area {
        text-align: center;
        padding: 40px;
        border: 2px dashed #d1d5db;
        border-radius: 12px;
        margin-bottom: 24px;
        cursor: pointer;
        transition: border-color 0.3s ease;
    }
    
    .upload-area:hover {
        border-color: #627eea;
    }
    
    .upload-area i {
        font-size: 48px;
        color: #9ca3af;
        margin-bottom: 16px;
    }
    
    .upload-area h3 {
        margin-bottom: 8px;
        color: #374151;
    }
    
    .upload-area input[type="file"] {
        display: none;
    }
    
    .training-card {
        padding: 20px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        margin-bottom: 16px;
    }
    
    .training-card h4 {
        margin-bottom: 8px;
        color: #374151;
    }
    
    .training-card p {
        color: #6b7280;
        margin-bottom: 16px;
    }
    
    .chat-messages {
        height: 300px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
    }
    
    .message {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
    }
    
    .message-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #627eea;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
    }
    
    .message-content {
        flex: 1;
        background: #f3f4f6;
        padding: 12px 16px;
        border-radius: 12px;
    }
    
    .chat-input {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
    }
    
    .chat-input input {
        flex: 1;
    }
    
    .quick-questions {
        margin-top: 16px;
    }
    
    .question-btn {
        display: block;
        width: 100%;
        padding: 8px 12px;
        margin-bottom: 8px;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        text-align: left;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }
    
    .question-btn:hover {
        background: #e5e7eb;
    }
    
    .node-details ul {
        list-style: none;
        padding: 0;
    }
    
    .node-details li {
        padding: 8px 0;
        border-bottom: 1px solid #f3f4f6;
    }
    
    .status-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #f3f4f6;
    }
`;

document.head.appendChild(dashboardStyles);

// Add additional modal styles
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .upload-description, .nl-description, .survey-description, .consultation-description {
        text-align: center;
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: #f8fafc;
        border-radius: 12px;
    }

    .file-categories, .insight-prompts, .survey-features, .consultation-features {
        margin: 2rem 0;
    }

    .category-grid, .prompt-buttons {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .category-item, .feature-highlight {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1.5rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        gap: 0.5rem;
    }

    .category-item i, .feature-highlight i {
        font-size: 2rem;
        color: #627eea;
        margin-bottom: 0.5rem;
    }

    .prompt-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .prompt-btn:hover {
        border-color: #627eea;
        background: #f8fafc;
    }

    .prompt-btn i {
        font-size: 1.5rem;
        color: #627eea;
    }

    .processing-options, .context-options, .survey-options {
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 12px;
        margin: 1.5rem 0;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .employee-form {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
    }

    .agenda-items {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .agenda-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
    }

    .agenda-item i {
        color: #627eea;
        font-size: 1.2rem;
    }

    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }
        
        .category-grid, .prompt-buttons {
            grid-template-columns: 1fr;
        }
        
        .agenda-items {
            grid-template-columns: 1fr;
        }
    }
`;

document.head.appendChild(additionalStyles);