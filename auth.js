// Authentication JavaScript

// Storage keys
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'ai_data_curation_access_token',
    REFRESH_TOKEN: 'ai_data_curation_refresh_token',
    USER: 'ai_data_curation_user',
    SUBSCRIPTION: 'ai_data_curation_subscription'
};

// API Base URL
const API_BASE_URL = window.location.origin + '/api';

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
function saveAuthData(authData, rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authData.accessToken);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authData.refreshToken);
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(authData.user));
    
    if (authData.subscription) {
        storage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(authData.subscription));
    }
    
    return authData;
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

function getCurrentSubscription() {
    const sessionSub = sessionStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    const localSub = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    
    if (sessionSub) {
        return JSON.parse(sessionSub);
    } else if (localSub) {
        return JSON.parse(localSub);
    }
    
    return null;
}

function getAccessToken() {
    return sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || 
           localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

function getRefreshToken() {
    return sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || 
           localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

async function signOut() {
    try {
        // Call API to sign out
        const token = getAccessToken();
        if (token) {
            await fetch(`${API_BASE_URL}/auth/signout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Sign out API error:', error);
    }
    
    // Clear all stored data
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION);
    
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
async function handleSignUp(formData) {
    try {
        const signupData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            companyName: formData.get('company'),
            companySize: formData.get('companySize'),
            plan: formData.get('plan'),
            industry: formData.get('industry') || '',
            companyDescription: formData.get('companyDescription') || ''
        };

        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signupData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Sign up failed');
        }

        return data;
    } catch (error) {
        throw new Error(error.message || 'Sign up failed');
    }
}

// Sign in functionality
async function handleSignIn(username, password, rememberMe = false) {
    try {
        const signinData = {
            username: username,
            password: password,
            rememberMe: rememberMe
        };

        const response = await fetch(`${API_BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signinData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Sign in failed');
        }

        return data;
    } catch (error) {
        throw new Error(error.message || 'Sign in failed');
    }
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
                const authData = await handleSignUp(formData);
                
                // Save authentication data and redirect to dashboard
                saveAuthData(authData, false);
                showMessage('Account created successfully! Redirecting to dashboard...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
                
            } catch (error) {
                showMessage(error.message, 'error');
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
                const authData = await handleSignIn(username, password, rememberMe);
                
                // Save authentication data and redirect to dashboard
                saveAuthData(authData, rememberMe);
                showMessage('Sign in successful! Redirecting to dashboard...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } catch (error) {
                showMessage(error.message, 'error');
                setLoading(submitBtn, false);
            }
        });
    }

    // Demo account button
    const demoBtn = document.querySelector('.demo-btn');
    if (demoBtn) {
        demoBtn.addEventListener('click', async function() {
            setLoading(this, true);
            
            try {
                const authData = await handleSignIn('demo', 'demo123', false);
                
                // Save authentication data and redirect to dashboard
                saveAuthData(authData, false);
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
        const subscription = getCurrentSubscription();
        
        if (user) {
            // Update user info in navigation
            const userName = document.getElementById('userName');
            const userPlan = document.getElementById('userPlan');
            
            if (userName) {
                userName.textContent = `${user.first_name} ${user.last_name}`;
            }
            
            if (userPlan && subscription) {
                const planNames = {
                    'basic-neural': 'Basic Neural',
                    'advanced-neural': 'Advanced Neural',
                    'enterprise-neural': 'Enterprise Neural'
                };
                
                let planText = planNames[subscription.plan_type] || subscription.plan_type;
                if (subscription.is_in_trial) {
                    planText += ' (Trial)';
                }
                
                userPlan.textContent = planText;
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