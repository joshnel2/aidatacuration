// User Model
const { db } = require('../database/connection');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.company_name = data.company_name;
        this.company_size = data.company_size;
        this.industry = data.industry;
        this.company_description = data.company_description;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.email_verified = data.email_verified || false;
        this.email_verification_token = data.email_verification_token;
        this.email_verified_at = data.email_verified_at;
        this.reset_password_token = data.reset_password_token;
        this.reset_password_expires = data.reset_password_expires;
        this.last_login_at = data.last_login_at;
        this.last_login_ip = data.last_login_ip;
        this.preferences = data.preferences || {};
        this.timezone = data.timezone || 'UTC';
        this.language = data.language || 'en';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create new user
    static async create(userData) {
        try {
            // Hash password
            const password_hash = await bcrypt.hash(userData.password, 12);
            
            // Generate email verification token
            const email_verification_token = crypto.randomBytes(32).toString('hex');
            
            const userToInsert = {
                username: userData.username,
                email: userData.email.toLowerCase(),
                password_hash,
                first_name: userData.first_name,
                last_name: userData.last_name,
                company_name: userData.company_name,
                company_size: userData.company_size,
                industry: userData.industry,
                company_description: userData.company_description,
                email_verification_token,
                preferences: JSON.stringify(userData.preferences || {}),
                timezone: userData.timezone || 'UTC',
                language: userData.language || 'en'
            };

            const [userId] = await db('users').insert(userToInsert);
            const user = await User.findById(userId);
            
            return user;
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    // Find user by ID
    static async findById(id) {
        try {
            const userData = await db('users').where({ id }).first();
            if (!userData) return null;
            
            // Parse JSON fields
            if (userData.preferences && typeof userData.preferences === 'string') {
                userData.preferences = JSON.parse(userData.preferences);
            }
            
            return new User(userData);
        } catch (error) {
            throw new Error(`Failed to find user by ID: ${error.message}`);
        }
    }

    // Find user by email
    static async findByEmail(email) {
        try {
            const userData = await db('users').where({ email: email.toLowerCase() }).first();
            if (!userData) return null;
            
            if (userData.preferences && typeof userData.preferences === 'string') {
                userData.preferences = JSON.parse(userData.preferences);
            }
            
            return new User(userData);
        } catch (error) {
            throw new Error(`Failed to find user by email: ${error.message}`);
        }
    }

    // Find user by username
    static async findByUsername(username) {
        try {
            const userData = await db('users').where({ username }).first();
            if (!userData) return null;
            
            if (userData.preferences && typeof userData.preferences === 'string') {
                userData.preferences = JSON.parse(userData.preferences);
            }
            
            return new User(userData);
        } catch (error) {
            throw new Error(`Failed to find user by username: ${error.message}`);
        }
    }

    // Find user by username or email
    static async findByUsernameOrEmail(identifier) {
        try {
            const userData = await db('users')
                .where({ username: identifier })
                .orWhere({ email: identifier.toLowerCase() })
                .first();
                
            if (!userData) return null;
            
            if (userData.preferences && typeof userData.preferences === 'string') {
                userData.preferences = JSON.parse(userData.preferences);
            }
            
            return new User(userData);
        } catch (error) {
            throw new Error(`Failed to find user: ${error.message}`);
        }
    }

    // Verify password
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password_hash);
        } catch (error) {
            throw new Error(`Password verification failed: ${error.message}`);
        }
    }

    // Update password
    async updatePassword(newPassword) {
        try {
            const password_hash = await bcrypt.hash(newPassword, 12);
            await db('users').where({ id: this.id }).update({
                password_hash,
                reset_password_token: null,
                reset_password_expires: null,
                updated_at: db.fn.now()
            });
            
            this.password_hash = password_hash;
            this.reset_password_token = null;
            this.reset_password_expires = null;
            
            return true;
        } catch (error) {
            throw new Error(`Failed to update password: ${error.message}`);
        }
    }

    // Update user data
    async update(updateData) {
        try {
            const allowedFields = [
                'first_name', 'last_name', 'company_name', 'company_size', 
                'industry', 'company_description', 'preferences', 'timezone', 'language'
            ];
            
            const dataToUpdate = {};
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    if (field === 'preferences' && typeof updateData[field] === 'object') {
                        dataToUpdate[field] = JSON.stringify(updateData[field]);
                    } else {
                        dataToUpdate[field] = updateData[field];
                    }
                }
            }
            
            if (Object.keys(dataToUpdate).length > 0) {
                dataToUpdate.updated_at = db.fn.now();
                await db('users').where({ id: this.id }).update(dataToUpdate);
                
                // Update instance properties
                for (const [key, value] of Object.entries(dataToUpdate)) {
                    if (key === 'preferences' && typeof value === 'string') {
                        this[key] = JSON.parse(value);
                    } else {
                        this[key] = value;
                    }
                }
            }
            
            return true;
        } catch (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    // Update last login
    async updateLastLogin(ipAddress) {
        try {
            await db('users').where({ id: this.id }).update({
                last_login_at: db.fn.now(),
                last_login_ip: ipAddress,
                updated_at: db.fn.now()
            });
            
            this.last_login_at = new Date();
            this.last_login_ip = ipAddress;
            
            return true;
        } catch (error) {
            throw new Error(`Failed to update last login: ${error.message}`);
        }
    }

    // Verify email
    async verifyEmail() {
        try {
            await db('users').where({ id: this.id }).update({
                email_verified: true,
                email_verified_at: db.fn.now(),
                email_verification_token: null,
                updated_at: db.fn.now()
            });
            
            this.email_verified = true;
            this.email_verified_at = new Date();
            this.email_verification_token = null;
            
            return true;
        } catch (error) {
            throw new Error(`Failed to verify email: ${error.message}`);
        }
    }

    // Generate password reset token
    async generatePasswordResetToken() {
        try {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            await db('users').where({ id: this.id }).update({
                reset_password_token: token,
                reset_password_expires: expires,
                updated_at: db.fn.now()
            });
            
            this.reset_password_token = token;
            this.reset_password_expires = expires;
            
            return token;
        } catch (error) {
            throw new Error(`Failed to generate reset token: ${error.message}`);
        }
    }

    // Get user with subscription
    async getWithSubscription() {
        try {
            const subscription = await db('subscriptions')
                .where({ user_id: this.id, status: 'active' })
                .where('current_period_end', '>', db.fn.now())
                .orderBy('created_at', 'desc')
                .first();
            
            return {
                user: this,
                subscription: subscription
            };
        } catch (error) {
            throw new Error(`Failed to get user with subscription: ${error.message}`);
        }
    }

    // Deactivate user
    async deactivate() {
        try {
            await db('users').where({ id: this.id }).update({
                is_active: false,
                updated_at: db.fn.now()
            });
            
            this.is_active = false;
            return true;
        } catch (error) {
            throw new Error(`Failed to deactivate user: ${error.message}`);
        }
    }

    // Get user's full name
    get fullName() {
        return `${this.first_name} ${this.last_name}`.trim();
    }

    // Check if user has active subscription
    async hasActiveSubscription() {
        try {
            const subscription = await db('subscriptions')
                .where({ user_id: this.id, status: 'active' })
                .where('current_period_end', '>', db.fn.now())
                .first();
            return !!subscription;
        } catch (error) {
            return false;
        }
    }

    // Get user's current plan
    async getCurrentPlan() {
        try {
            const subscription = await db('subscriptions')
                .where({ user_id: this.id, status: 'active' })
                .where('current_period_end', '>', db.fn.now())
                .first();
            return subscription ? subscription.plan_type : null;
        } catch (error) {
            return null;
        }
    }

    // Convert to JSON (exclude sensitive data)
    toJSON() {
        const userData = { ...this };
        delete userData.password_hash;
        delete userData.email_verification_token;
        delete userData.reset_password_token;
        delete userData.reset_password_expires;
        
        return userData;
    }

    // Get all users (admin function)
    static async getAll(limit = 50, offset = 0) {
        try {
            const users = await db('users')
                .select('*')
                .limit(limit)
                .offset(offset)
                .orderBy('created_at', 'desc');
                
            return users.map(userData => {
                if (userData.preferences && typeof userData.preferences === 'string') {
                    userData.preferences = JSON.parse(userData.preferences);
                }
                return new User(userData);
            });
        } catch (error) {
            throw new Error(`Failed to get users: ${error.message}`);
        }
    }

    // Get user count
    static async getCount() {
        try {
            const result = await db('users').count('id as count').first();
            return parseInt(result.count);
        } catch (error) {
            throw new Error(`Failed to get user count: ${error.message}`);
        }
    }
}

module.exports = User;