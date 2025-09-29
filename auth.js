// Authentication JavaScript

// Storage keys
const STORAGE_KEYS = {
    USER: 'ai_data_curation_user',
    AUTH_TOKEN: 'ai_data_curation_token',
    REMEMBER_ME: 'ai_data_curation_remember'
};

// Demo users for testing
const DEMO_USERS = [
    {
        id: 1,
        username: 'demo',
        email: 'demo@aidatacuration.com',
        password: 'demo123',
        firstName: 'Demo',
        lastName: 'User',
        company: 'AI Data Curation Inc',
        companySize: '11-50',
        plan: 'advanced-neural',
        joinDate: '2024-01-15'
    },
    {
        id: 2,
        username: 'admin',
        email: 'admin@aidatacuration.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        company: 'AI Data Curation Inc',
        companySize: '201-1000',
        plan: 'enterprise-neural',
        joinDate: '2024-01-01'
    }
];

// Utility functions
function generateAuthToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function hashPassword(password) {
    // Simple hash for demo purposes - in production, use proper encryption
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.auth-message');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message auth-message-${type}`;
    messageDiv.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        background: ${type === 'error' ? '#fee2e2' : type === 'success' ? '#d1fae5' : '#dbeafe'};
        color: ${type === 'error' ? '#dc2626' : type === 'success' ? '#065f46' : '#1d4ed8'};
        border: 1px solid ${type === 'error' ? '#fecaca' : type === 'success' ? '#a7f3d0' : '#93c5fd'};
    `;
    messageDiv.textContent = message;

    // Insert at the top of the form
    const form = document.querySelector('.auth-form');
    if (form) {
        form.insertBefore(messageDiv, form.firstChild);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
}

// Authentication functions
function saveUser(user, rememberMe = false) {
    const token = generateAuthToken();
    const userData = { ...user, token };
    delete userData.password; // Don't store password

    if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    } else {
        sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    }

    return userData;
}

function getCurrentUser() {
    const sessionUser = sessionStorage.getItem(STORAGE_KEYS.USER);
    const localUser = localStorage.getItem(STORAGE_KEYS.USER);
    
    if (sessionUser) {
        return JSON.parse(sessionUser);
    } else if (localUser) {
        return JSON.parse(localUser);
    }
    
    return null;
}

function signOut() {
    // Clear all stored data
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    
    // Redirect to sign in
    window.location.href = 'signin.html';
}

function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
        // Not authenticated, redirect to sign in
        if (!window.location.pathname.includes('signin.html') && 
            !window.location.pathname.includes('signup.html') && 
            !window.location.pathname.includes('index.html')) {
            window.location.href = 'signin.html';
        }
        return false;
    }
    return true;
}

// Sign up functionality
function handleSignUp(formData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Validate required fields
            const requiredFields = ['firstName', 'lastName', 'email', 'company', 'companySize', 'plan', 'username', 'password'];
            for (const field of requiredFields) {
                if (!formData.get(field)) {
                    reject(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
                    return;
                }
            }

            // Validate email
            if (!validateEmail(formData.get('email'))) {
                reject('Please enter a valid email address');
                return;
            }

            // Validate password
            if (!validatePassword(formData.get('password'))) {
                reject('Password must be at least 8 characters long');
                return;
            }

            // Check password confirmation
            if (formData.get('password') !== formData.get('confirmPassword')) {
                reject('Passwords do not match');
                return;
            }

            // Check if terms are accepted
            if (!formData.get('terms')) {
                reject('You must accept the Terms of Service and Privacy Policy');
                return;
            }

            // Check if username already exists (check against demo users)
            const username = formData.get('username');
            const email = formData.get('email');
            const existingUser = DEMO_USERS.find(u => u.username === username || u.email === email);
            if (existingUser) {
                reject('Username or email already exists');
                return;
            }

            // Create new user
            const newUser = {
                id: Date.now(),
                username: formData.get('username'),
                email: formData.get('email'),
                password: hashPassword(formData.get('password')),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                company: formData.get('company'),
                companySize: formData.get('companySize'),
                plan: formData.get('plan'),
                newsletter: !!formData.get('newsletter'),
                joinDate: new Date().toISOString().split('T')[0]
            };

            // Add to demo users (in real app, this would be an API call)
            DEMO_USERS.push(newUser);

            resolve(newUser);
        }, 1500); // Simulate API delay
    });
}

// Sign in functionality
function handleSignIn(username, password, rememberMe = false) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Find user
            const user = DEMO_USERS.find(u => 
                (u.username === username || u.email === username) && 
                u.password === hashPassword(password)
            );

            if (!user) {
                reject('Invalid username/email or password');
                return;
            }

            resolve(user);
        }, 1000); // Simulate API delay
    });
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a protected page
    if (window.location.pathname.includes('dashboard.html')) {
        if (!checkAuth()) {
            return;
        }
    }

    // Sign up form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            
            setLoading(submitBtn, true);
            
            try {
                const newUser = await handleSignUp(formData);
                
                // Save user and redirect to dashboard
                saveUser(newUser, false);
                showMessage('Account created successfully! Redirecting to dashboard...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
                
            } catch (error) {
                showMessage(error, 'error');
                setLoading(submitBtn, false);
            }
        });
    }

    // Sign in form
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
        signinForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            setLoading(submitBtn, true);
            
            try {
                const user = await handleSignIn(username, password, rememberMe);
                
                // Save user and redirect to dashboard
                saveUser(user, rememberMe);
                showMessage('Sign in successful! Redirecting to dashboard...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } catch (error) {
                showMessage(error, 'error');
                setLoading(submitBtn, false);
            }
        });
    }

    // Demo account button
    const demoBtn = document.querySelector('.demo-btn');
    if (demoBtn) {
        demoBtn.addEventListener('click', async function() {
            const submitBtn = document.querySelector('#signinForm button[type="submit"]');
            setLoading(this, true);
            
            try {
                const demoUser = DEMO_USERS[0]; // Use first demo user
                saveUser(demoUser, false);
                showMessage('Demo account loaded! Redirecting to dashboard...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } catch (error) {
                showMessage('Failed to load demo account', 'error');
                setLoading(this, false);
            }
        });
    }

    // Sign out functionality
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            signOut();
        });
    }

    // Load user data on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        const user = getCurrentUser();
        if (user) {
            // Update user info in navigation
            const userName = document.getElementById('userName');
            const userPlan = document.getElementById('userPlan');
            
            if (userName) {
                userName.textContent = `${user.firstName} ${user.lastName}`;
            }
            
            if (userPlan) {
                const planNames = {
                    'basic-neural': 'Basic Neural',
                    'advanced-neural': 'Advanced Neural',
                    'enterprise-neural': 'Enterprise Neural'
                };
                userPlan.textContent = planNames[user.plan] || user.plan;
            }
        }
    }

    // Auto-redirect if already signed in
    if (window.location.pathname.includes('signin.html') || window.location.pathname.includes('signup.html')) {
        const user = getCurrentUser();
        if (user) {
            window.location.href = 'dashboard.html';
        }
    }
});

// Export functions for use in other scripts
window.AuthSystem = {
    getCurrentUser,
    signOut,
    checkAuth,
    saveUser,
    handleSignUp,
    handleSignIn
};