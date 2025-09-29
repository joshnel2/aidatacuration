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
            const action = this.textContent.trim();
            handleQuickAction(action);
        });
    });
}

function handleQuickAction(action) {
    // Handle quick action clicks
    switch(action) {
        case 'Upload Documents':
            showModal('Upload Documents', createUploadDocumentsContent());
            break;
        case 'Add Employees':
            showModal('Add Employees', createAddEmployeesContent());
            break;
        case 'Train Neural Net':
            showModal('Train Neural Network', createTrainNeuralNetContent());
            break;
        case 'Chat with AI':
            showModal('AI Assistant', createAIChatContent());
            break;
        default:
            showNotification('Feature coming soon!', 'info');
    }
}

function createUploadDocumentsContent() {
    return `
        <div class="modal-content">
            <div class="upload-area">
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Upload Business Documents</h3>
                <p>Drag and drop files here or click to browse</p>
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt">
                <div class="supported-formats">
                    <small>Supported formats: PDF, Word, Excel, Text files</small>
                </div>
            </div>
            <div class="upload-options">
                <label class="checkbox-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    Automatically extract financial data
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    Process for neural network training
                </label>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary">Start Upload</button>
                <button class="btn btn-outline modal-close">Cancel</button>
            </div>
        </div>
    `;
}

function createAddEmployeesContent() {
    return `
        <div class="modal-content">
            <div class="employee-form">
                <h3>Add Employee for AI Outreach</h3>
                <div class="form-group">
                    <label>Employee Name</label>
                    <input type="text" placeholder="Enter full name">
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" placeholder="employee@company.com">
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <select>
                        <option>Select department</option>
                        <option>Finance</option>
                        <option>HR</option>
                        <option>Operations</option>
                        <option>Sales</option>
                        <option>Marketing</option>
                        <option>IT</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Role/Position</label>
                    <input type="text" placeholder="e.g., Manager, Director, Analyst">
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" checked>
                        <span class="checkmark"></span>
                        Enable automatic AI interview scheduling
                    </label>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary">Add Employee</button>
                <button class="btn btn-outline modal-close">Cancel</button>
            </div>
        </div>
    `;
}

function createTrainNeuralNetContent() {
    return `
        <div class="modal-content">
            <div class="training-options">
                <h3>Neural Network Training Options</h3>
                <div class="training-card">
                    <h4>Quick Training</h4>
                    <p>Train on recently uploaded documents and new employee data</p>
                    <button class="btn btn-primary">Start Quick Training</button>
                </div>
                <div class="training-card">
                    <h4>Deep Training</h4>
                    <p>Comprehensive training on all available data with advanced analysis</p>
                    <button class="btn btn-primary">Start Deep Training</button>
                </div>
                <div class="training-card">
                    <h4>Custom Training</h4>
                    <p>Select specific data sources and configure training parameters</p>
                    <button class="btn btn-outline">Configure Custom Training</button>
                </div>
            </div>
            <div class="training-status">
                <h4>Current Training Status</h4>
                <div class="status-item">
                    <span>Last Training:</span>
                    <span>2 hours ago</span>
                </div>
                <div class="status-item">
                    <span>Network Accuracy:</span>
                    <span>87.3%</span>
                </div>
                <div class="status-item">
                    <span>Data Points:</span>
                    <span>1,247</span>
                </div>
            </div>
        </div>
    `;
}

function createAIChatContent() {
    return `
        <div class="modal-content">
            <div class="ai-chat-container">
                <div class="chat-header">
                    <h3>AI Business Assistant</h3>
                    <span class="chat-status">Online</span>
                </div>
                <div class="chat-messages">
                    <div class="message ai-message">
                        <div class="message-avatar">
                            <i class="fas fa-brain"></i>
                        </div>
                        <div class="message-content">
                            <p>Hello! I'm your AI business assistant. I've analyzed your company data and I'm ready to help you with insights, recommendations, and answering questions about your business operations.</p>
                        </div>
                    </div>
                </div>
                <div class="chat-input">
                    <input type="text" placeholder="Ask me anything about your business...">
                    <button class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="quick-questions">
                    <h4>Quick Questions:</h4>
                    <button class="question-btn">What are my top business risks?</button>
                    <button class="question-btn">Show me financial insights</button>
                    <button class="question-btn">How can I improve efficiency?</button>
                </div>
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