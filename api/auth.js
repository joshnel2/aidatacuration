// Enhanced Authentication API with Database Integration
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { db } = require('../database/connection');

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

// Generate JWT token
function generateTokens(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan_type || null
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
}

// Create user session
async function createUserSession(userId, tokens, req) {
    try {
        const userAgent = req.get('User-Agent') || '';
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        // Parse user agent for device info
        const deviceInfo = parseUserAgent(userAgent);
        
        const sessionData = {
            user_id: userId,
            session_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN),
            user_agent: userAgent,
            ip_address: ipAddress,
            device_type: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            last_activity_at: db.fn.now(),
            remember_me: req.body.rememberMe || false
        };

        await db('user_sessions').insert(sessionData);
        return true;
    } catch (error) {
        console.error('Failed to create user session:', error);
        return false;
    }
}

// Parse user agent for device information
function parseUserAgent(userAgent) {
    const device = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'desktop';
    const browser = userAgent.includes('Chrome') ? 'Chrome' : 
                   userAgent.includes('Firefox') ? 'Firefox' : 
                   userAgent.includes('Safari') ? 'Safari' : 'Unknown';
    const os = userAgent.includes('Windows') ? 'Windows' : 
               userAgent.includes('Mac') ? 'macOS' : 
               userAgent.includes('Linux') ? 'Linux' : 'Unknown';
    
    return { device, browser, os };
}

// Middleware to authenticate JWT token
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if session exists and is active
        const session = await db('user_sessions')
            .where({ session_token: token, is_active: true })
            .where('expires_at', '>', db.fn.now())
            .first();

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        // Get user with subscription
        const user = await User.findById(decoded.userId);
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Get user's subscription
        const subscription = await Subscription.findActiveByUserId(user.id);

        // Update last activity
        await db('user_sessions')
            .where({ id: session.id })
            .update({ last_activity_at: db.fn.now() });

        // Attach user and subscription to request
        req.user = user;
        req.subscription = subscription;
        req.session = session;

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(403).json({ error: 'Invalid token' });
    }
}

// Middleware to check subscription access
function requireSubscription(requiredPlan = null) {
    return async (req, res, next) => {
        try {
            if (!req.subscription) {
                return res.status(403).json({ 
                    error: 'Active subscription required',
                    code: 'SUBSCRIPTION_REQUIRED'
                });
            }

            if (!req.subscription.isActive()) {
                return res.status(403).json({ 
                    error: 'Subscription expired or inactive',
                    code: 'SUBSCRIPTION_EXPIRED'
                });
            }

            // Check specific plan requirement
            if (requiredPlan) {
                const planHierarchy = {
                    'basic-neural': 1,
                    'advanced-neural': 2,
                    'enterprise-neural': 3
                };

                const userPlanLevel = planHierarchy[req.subscription.plan_type] || 0;
                const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

                if (userPlanLevel < requiredPlanLevel) {
                    return res.status(403).json({ 
                        error: `${requiredPlan} plan or higher required`,
                        code: 'PLAN_UPGRADE_REQUIRED',
                        currentPlan: req.subscription.plan_type,
                        requiredPlan: requiredPlan
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Subscription check error:', error);
            return res.status(500).json({ error: 'Subscription validation failed' });
        }
    };
}

// Sign up endpoint
router.post('/signup', async (req, res) => {
    try {
        const {
            username, email, password, confirmPassword,
            firstName, lastName, companyName, companySize, plan,
            industry, companyDescription
        } = req.body;

        // Validation
        if (!username || !email || !password || !firstName || !lastName || !companyName || !plan) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Check if user already exists
        const existingUser = await User.findByUsernameOrEmail(username) || await User.findByUsernameOrEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Create user
        const userData = {
            username,
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
            company_size: companySize,
            industry,
            company_description: companyDescription
        };

        const user = await User.create(userData);

        // Create subscription
        const subscriptionData = {
            user_id: user.id,
            plan_type: plan,
            billing_cycle: 'monthly', // Default to monthly
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            is_trial: true,
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 day trial
        };

        const subscription = await Subscription.create(subscriptionData);

        // Generate tokens
        const tokens = generateTokens({ ...user, plan_type: subscription.plan_type });

        // Create session
        await createUserSession(user.id, tokens, req);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: user.toJSON(),
            subscription: subscription.toJSON(),
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sign in endpoint
router.post('/signin', async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Find user
        const user = await User.findByUsernameOrEmail(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        // Verify password
        const isValidPassword = await user.verifyPassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get subscription
        const subscription = await Subscription.findActiveByUserId(user.id);

        // Update last login
        await user.updateLastLogin(req.ip);

        // Generate tokens
        const tokens = generateTokens({ ...user, plan_type: subscription?.plan_type });

        // Create session
        await createUserSession(user.id, tokens, req);

        res.json({
            success: true,
            message: 'Sign in successful',
            user: user.toJSON(),
            subscription: subscription?.toJSON() || null,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        // Find session with refresh token
        const session = await db('user_sessions')
            .where({ refresh_token: refreshToken, is_active: true })
            .where('expires_at', '>', db.fn.now())
            .first();

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Get user and subscription
        const user = await User.findById(session.user_id);
        const subscription = await Subscription.findActiveByUserId(user.id);

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Generate new tokens
        const tokens = generateTokens({ ...user, plan_type: subscription?.plan_type });

        // Update session
        await db('user_sessions')
            .where({ id: session.id })
            .update({
                session_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN),
                last_activity_at: db.fn.now()
            });

        res.json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: user.toJSON(),
            subscription: subscription?.toJSON() || null
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sign out endpoint
router.post('/signout', authenticateToken, async (req, res) => {
    try {
        // Deactivate current session
        await db('user_sessions')
            .where({ id: req.session.id })
            .update({ is_active: false });

        res.json({
            success: true,
            message: 'Signed out successfully'
        });

    } catch (error) {
        console.error('Signout error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sign out all devices
router.post('/signout-all', authenticateToken, async (req, res) => {
    try {
        // Deactivate all user sessions
        await db('user_sessions')
            .where({ user_id: req.user.id })
            .update({ is_active: false });

        res.json({
            success: true,
            message: 'Signed out from all devices'
        });

    } catch (error) {
        console.error('Signout all error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.toJSON(),
            subscription: req.subscription?.toJSON() || null
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const allowedFields = [
            'first_name', 'last_name', 'company_name', 'company_size',
            'industry', 'company_description', 'timezone', 'language', 'preferences'
        ];

        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        await req.user.update(updateData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: req.user.toJSON()
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'All password fields required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Verify current password
        const isValidPassword = await req.user.verifyPassword(currentPassword);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        await req.user.updatePassword(newPassword);

        // Sign out all other sessions for security
        await db('user_sessions')
            .where({ user_id: req.user.id })
            .whereNot({ id: req.session.id })
            .update({ is_active: false });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await db('user_sessions')
            .where({ user_id: req.user.id, is_active: true })
            .where('expires_at', '>', db.fn.now())
            .orderBy('last_activity_at', 'desc');

        const formattedSessions = sessions.map(session => ({
            id: session.id,
            device_type: session.device_type,
            browser: session.browser,
            os: session.os,
            ip_address: session.ip_address,
            country: session.country,
            city: session.city,
            last_activity_at: session.last_activity_at,
            created_at: session.created_at,
            is_current: session.id === req.session.id
        }));

        res.json({
            success: true,
            sessions: formattedSessions
        });

    } catch (error) {
        console.error('Sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Revoke specific session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;

        await db('user_sessions')
            .where({ 
                id: sessionId, 
                user_id: req.user.id 
            })
            .update({ is_active: false });

        res.json({
            success: true,
            message: 'Session revoked successfully'
        });

    } catch (error) {
        console.error('Session revoke error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = {
    router,
    authenticateToken,
    requireSubscription
};