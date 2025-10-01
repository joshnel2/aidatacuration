// Survey JavaScript - Employee Survey System
// Handles dynamic survey loading, question rendering, and response submission

class SurveyManager {
    constructor() {
        this.surveyId = this.getSurveyIdFromUrl();
        this.surveyData = null;
        this.currentQuestionIndex = 0;
        this.responses = {};
        this.startTime = Date.now();
        
        this.initializeSurvey();
    }

    getSurveyIdFromUrl() {
        const path = window.location.pathname;
        const matches = path.match(/\/survey\/(.+)/);
        return matches ? matches[1] : null;
    }

    async initializeSurvey() {
        if (!this.surveyId) {
            this.showError('Invalid survey link');
            return;
        }

        try {
            // Load survey data
            await this.loadSurveyData();
            
            // Show introduction
            this.showIntroduction();
            
        } catch (error) {
            console.error('Survey initialization error:', error);
            this.showError('Failed to load survey');
        }
    }

    async loadSurveyData() {
        // In a real implementation, this would fetch from the API
        // For demo purposes, we'll simulate survey data
        
        this.surveyData = {
            surveyId: this.surveyId,
            employee: {
                name: 'John Doe',
                email: 'john.doe@company.com',
                role: 'Senior Analyst',
                department: 'Finance'
            },
            questions: [
                {
                    id: 1,
                    type: 'multiple_choice',
                    category: 'operations',
                    question: 'How would you rate the efficiency of your current daily workflows?',
                    options: [
                        'Very Efficient - Everything runs smoothly',
                        'Efficient - Minor improvements needed',
                        'Neutral - Some good, some bad',
                        'Inefficient - Significant problems exist',
                        'Very Inefficient - Major overhaul needed'
                    ]
                },
                {
                    id: 2,
                    type: 'open_ended',
                    category: 'challenges',
                    question: 'What is the biggest challenge you face in your daily work? Please describe specific pain points and how they impact your productivity.',
                    placeholder: 'Describe the main challenges you encounter...'
                },
                {
                    id: 3,
                    type: 'multiple_choice',
                    category: 'customer_interaction',
                    question: 'How often do you interact with customers or clients in your role?',
                    options: [
                        'Daily - Multiple interactions per day',
                        'Weekly - Several times per week',
                        'Monthly - A few times per month',
                        'Rarely - Only occasionally',
                        'Never - No customer interaction'
                    ]
                },
                {
                    id: 4,
                    type: 'open_ended',
                    category: 'technology',
                    question: 'What technology tools or software do you use regularly? Which ones work well, and which ones cause problems?',
                    placeholder: 'List the tools you use and your experience with them...'
                },
                {
                    id: 5,
                    type: 'multiple_choice',
                    category: 'communication',
                    question: 'How would you describe communication within your team?',
                    options: [
                        'Excellent - Clear, timely, and effective',
                        'Good - Generally works well',
                        'Fair - Some communication issues',
                        'Poor - Frequent miscommunications',
                        'Very Poor - Major communication problems'
                    ]
                },
                {
                    id: 6,
                    type: 'open_ended',
                    category: 'processes',
                    question: 'Describe a typical workflow or process you follow regularly. What steps are involved, and where do you see opportunities for improvement?',
                    placeholder: 'Walk through a typical process you handle...'
                },
                {
                    id: 7,
                    type: 'multiple_choice',
                    category: 'resources',
                    question: 'Do you have adequate resources (tools, information, support) to do your job effectively?',
                    options: [
                        'Yes, completely - I have everything I need',
                        'Mostly - Just a few gaps',
                        'Somewhat - Several important gaps',
                        'Not really - Missing many key resources',
                        'No - Severely under-resourced'
                    ]
                },
                {
                    id: 8,
                    type: 'open_ended',
                    category: 'innovation',
                    question: 'If you could change or improve one thing about how your department operates, what would it be and why?',
                    placeholder: 'Describe your improvement idea...'
                },
                {
                    id: 9,
                    type: 'multiple_choice',
                    category: 'decision_making',
                    question: 'How involved are you in decision-making processes that affect your work?',
                    options: [
                        'Very involved - I participate in most decisions',
                        'Somewhat involved - I have input on some decisions',
                        'Occasionally involved - Limited input',
                        'Rarely involved - Decisions made without my input',
                        'Not involved - No participation in decisions'
                    ]
                },
                {
                    id: 10,
                    type: 'open_ended',
                    category: 'collaboration',
                    question: 'How do you typically collaborate with other departments? What works well and what could be improved?',
                    placeholder: 'Describe your cross-department interactions...'
                },
                {
                    id: 11,
                    type: 'multiple_choice',
                    category: 'training',
                    question: 'How would you rate the training and development opportunities available to you?',
                    options: [
                        'Excellent - Abundant opportunities',
                        'Good - Adequate opportunities',
                        'Fair - Some opportunities available',
                        'Poor - Limited opportunities',
                        'Very Poor - No meaningful opportunities'
                    ]
                },
                {
                    id: 12,
                    type: 'open_ended',
                    category: 'metrics',
                    question: 'What metrics or KPIs do you track in your role? How do you measure success, and what data would be helpful to have?',
                    placeholder: 'Describe the metrics you work with...'
                },
                {
                    id: 13,
                    type: 'multiple_choice',
                    category: 'workload',
                    question: 'How would you describe your current workload?',
                    options: [
                        'Very manageable - Good work-life balance',
                        'Manageable - Busy but sustainable',
                        'Heavy - Often working extra hours',
                        'Overwhelming - Consistently overloaded',
                        'Unsustainable - Burnout risk'
                    ]
                },
                {
                    id: 14,
                    type: 'open_ended',
                    category: 'future',
                    question: 'What do you see as the biggest opportunities for our company in the next 2-3 years? What should we focus on?',
                    placeholder: 'Share your thoughts on company opportunities...'
                },
                {
                    id: 15,
                    type: 'open_ended',
                    category: 'ai_integration',
                    question: 'How do you think AI or automation could help improve your work or our business operations? What tasks would you want AI to assist with?',
                    placeholder: 'Describe how AI could help in your role...'
                }
            ]
        };
    }

    showIntroduction() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('surveyIntro').style.display = 'block';

        // Populate employee info
        const employeeInfo = document.getElementById('employeeInfo');
        employeeInfo.innerHTML = `
            <h3>Survey Details</h3>
            <p><strong>Name:</strong> ${this.surveyData.employee.name}</p>
            <p><strong>Role:</strong> ${this.surveyData.employee.role}</p>
            <p><strong>Department:</strong> ${this.surveyData.employee.department}</p>
            <p><strong>Questions:</strong> ${this.surveyData.questions.length} personalized questions</p>
        `;

        // Setup start button
        document.getElementById('startSurvey').addEventListener('click', () => {
            this.startSurvey();
        });
    }

    startSurvey() {
        document.getElementById('surveyIntro').style.display = 'none';
        document.getElementById('surveyQuestions').style.display = 'block';

        this.setupNavigation();
        this.renderCurrentQuestion();
        this.updateProgress();
    }

    setupNavigation() {
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');
        const submitButton = document.getElementById('submitButton');

        prevButton.addEventListener('click', () => {
            if (this.currentQuestionIndex > 0) {
                this.currentQuestionIndex--;
                this.renderCurrentQuestion();
                this.updateProgress();
                this.updateNavigationButtons();
            }
        });

        nextButton.addEventListener('click', () => {
            if (this.validateCurrentQuestion()) {
                this.saveCurrentResponse();
                
                if (this.currentQuestionIndex < this.surveyData.questions.length - 1) {
                    this.currentQuestionIndex++;
                    this.renderCurrentQuestion();
                    this.updateProgress();
                    this.updateNavigationButtons();
                }
            }
        });

        submitButton.addEventListener('click', () => {
            if (this.validateCurrentQuestion()) {
                this.saveCurrentResponse();
                this.submitSurvey();
            }
        });
    }

    renderCurrentQuestion() {
        const question = this.surveyData.questions[this.currentQuestionIndex];
        const container = document.getElementById('questionContainer');

        let questionHtml = `
            <div class="question">
                <div class="question-category">${this.formatCategory(question.category)}</div>
                <h3>${question.question}</h3>
        `;

        if (question.type === 'multiple_choice') {
            questionHtml += '<div class="question-options">';
            question.options.forEach((option, index) => {
                const isSelected = this.responses[question.id] === option;
                questionHtml += `
                    <div class="option-item ${isSelected ? 'selected' : ''}" data-option="${option}">
                        <input type="radio" name="question_${question.id}" value="${option}" ${isSelected ? 'checked' : ''}>
                        <span>${option}</span>
                    </div>
                `;
            });
            questionHtml += '</div>';
        } else if (question.type === 'open_ended') {
            const currentValue = this.responses[question.id] || '';
            questionHtml += `
                <textarea class="text-input" 
                         placeholder="${question.placeholder || 'Please provide your answer...'}"
                         data-question-id="${question.id}">${currentValue}</textarea>
            `;
        }

        questionHtml += '</div>';
        container.innerHTML = questionHtml;

        // Setup event listeners for the current question
        this.setupQuestionEventListeners(question);
        this.updateNavigationButtons();
    }

    setupQuestionEventListeners(question) {
        if (question.type === 'multiple_choice') {
            const options = document.querySelectorAll('.option-item');
            options.forEach(option => {
                option.addEventListener('click', () => {
                    // Remove selection from all options
                    options.forEach(opt => opt.classList.remove('selected'));
                    
                    // Select clicked option
                    option.classList.add('selected');
                    const radio = option.querySelector('input[type="radio"]');
                    radio.checked = true;
                });
            });
        }
    }

    validateCurrentQuestion() {
        const question = this.surveyData.questions[this.currentQuestionIndex];
        
        if (question.type === 'multiple_choice') {
            const selected = document.querySelector(`input[name="question_${question.id}"]:checked`);
            if (!selected) {
                this.showValidationError('Please select an answer');
                return false;
            }
        } else if (question.type === 'open_ended') {
            const textarea = document.querySelector(`textarea[data-question-id="${question.id}"]`);
            if (!textarea.value.trim()) {
                this.showValidationError('Please provide an answer');
                return false;
            }
        }

        return true;
    }

    saveCurrentResponse() {
        const question = this.surveyData.questions[this.currentQuestionIndex];
        
        if (question.type === 'multiple_choice') {
            const selected = document.querySelector(`input[name="question_${question.id}"]:checked`);
            if (selected) {
                this.responses[question.id] = selected.value;
            }
        } else if (question.type === 'open_ended') {
            const textarea = document.querySelector(`textarea[data-question-id="${question.id}"]`);
            this.responses[question.id] = textarea.value.trim();
        }
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.surveyData.questions.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${this.surveyData.questions.length}`;
    }

    updateNavigationButtons() {
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');
        const submitButton = document.getElementById('submitButton');

        prevButton.disabled = this.currentQuestionIndex === 0;
        
        const isLastQuestion = this.currentQuestionIndex === this.surveyData.questions.length - 1;
        
        if (isLastQuestion) {
            nextButton.style.display = 'none';
            submitButton.style.display = 'inline-flex';
        } else {
            nextButton.style.display = 'inline-flex';
            submitButton.style.display = 'none';
        }
    }

    async submitSurvey() {
        try {
            // Show loading state
            const submitButton = document.getElementById('submitButton');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitButton.disabled = true;

            // Calculate completion time
            const completionTime = Math.round((Date.now() - this.startTime) / 60000); // minutes

            // Prepare submission data
            const submissionData = {
                surveyId: this.surveyId,
                responses: this.responses,
                completionTime: completionTime,
                submittedAt: new Date().toISOString()
            };

            // Submit to API (simulated for demo)
            await this.submitToAPI(submissionData);

            // Show completion screen
            this.showCompletion(completionTime);

        } catch (error) {
            console.error('Survey submission error:', error);
            this.showValidationError('Failed to submit survey. Please try again.');
            
            // Reset submit button
            const submitButton = document.getElementById('submitButton');
            submitButton.innerHTML = '<i class="fas fa-check"></i> Submit Survey';
            submitButton.disabled = false;
        }
    }

    async submitToAPI(data) {
        // In a real implementation, this would submit to the backend API
        // For demo purposes, we'll simulate the API call
        
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Survey submitted:', data);
                resolve({ success: true });
            }, 2000);
        });
    }

    showCompletion(completionTime) {
        document.getElementById('surveyQuestions').style.display = 'none';
        document.getElementById('surveyComplete').style.display = 'block';

        // Update completion stats
        document.getElementById('questionsAnswered').textContent = this.surveyData.questions.length;
        document.getElementById('timeSpent').textContent = completionTime;

        // Update progress to 100%
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('progressText').textContent = 'Survey Complete!';
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        
        const errorContent = document.querySelector('.error-content p');
        if (errorContent) {
            errorContent.textContent = message;
        }
    }

    showValidationError(message) {
        // Remove existing error messages
        const existingError = document.querySelector('.validation-error');
        if (existingError) {
            existingError.remove();
        }

        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.style.cssText = `
            background: #fee2e2;
            color: #dc2626;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 16px;
            font-size: 14px;
            border: 1px solid #fecaca;
        `;
        errorDiv.textContent = message;

        // Insert after question container
        const container = document.getElementById('questionContainer');
        container.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    formatCategory(category) {
        return category.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
}

// Initialize survey when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SurveyManager();
});