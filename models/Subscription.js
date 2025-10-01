// Subscription Model
const { db } = require('../database/connection');

class Subscription {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.plan_type = data.plan_type;
        this.status = data.status;
        this.billing_cycle = data.billing_cycle;
        this.price = data.price;
        this.currency = data.currency;
        this.started_at = data.started_at;
        this.current_period_start = data.current_period_start;
        this.current_period_end = data.current_period_end;
        this.cancelled_at = data.cancelled_at;
        this.expires_at = data.expires_at;
        this.stripe_subscription_id = data.stripe_subscription_id;
        this.stripe_customer_id = data.stripe_customer_id;
        this.payment_method = data.payment_method;
        this.payment_details = data.payment_details || {};
        this.usage_limits = data.usage_limits || {};
        this.current_usage = data.current_usage || {};
        this.is_trial = data.is_trial || false;
        this.trial_ends_at = data.trial_ends_at;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Plan configurations
    static getPlanConfig(planType) {
        const plans = {
            'basic-neural': {
                name: 'Basic Neural',
                price_monthly: 99,
                price_annual: 990,
                features: {
                    max_files: 50,
                    max_file_size: '10MB',
                    ai_processing: true,
                    natural_language: true,
                    basic_support: true,
                    employee_surveys: false,
                    expert_consultations: false,
                    custom_ai_training: false
                },
                limits: {
                    monthly_uploads: 50,
                    storage_gb: 5,
                    ai_requests: 1000
                }
            },
            'advanced-neural': {
                name: 'Advanced Neural',
                price_monthly: 299,
                price_annual: 2990,
                features: {
                    max_files: 200,
                    max_file_size: '50MB',
                    ai_processing: true,
                    natural_language: true,
                    priority_support: true,
                    employee_surveys: true,
                    max_employees: 50,
                    expert_consultations: false,
                    custom_ai_training: true,
                    advanced_analytics: true
                },
                limits: {
                    monthly_uploads: 200,
                    storage_gb: 25,
                    ai_requests: 5000,
                    survey_responses: 500
                }
            },
            'enterprise-neural': {
                name: 'Enterprise Neural',
                price_monthly: 999,
                price_annual: 9990,
                features: {
                    max_files: 'unlimited',
                    max_file_size: '500MB',
                    ai_processing: true,
                    natural_language: true,
                    dedicated_support: true,
                    employee_surveys: true,
                    max_employees: 'unlimited',
                    expert_consultations: true,
                    custom_ai_training: true,
                    advanced_analytics: true,
                    white_label: true,
                    api_access: true
                },
                limits: {
                    monthly_uploads: -1, // unlimited
                    storage_gb: 500,
                    ai_requests: 25000,
                    survey_responses: -1, // unlimited
                    consultations: 4
                }
            }
        };

        return plans[planType] || null;
    }

    // Create new subscription
    static async create(subscriptionData) {
        try {
            const planConfig = Subscription.getPlanConfig(subscriptionData.plan_type);
            if (!planConfig) {
                throw new Error('Invalid plan type');
            }

            const price = subscriptionData.billing_cycle === 'annual' 
                ? planConfig.price_annual 
                : planConfig.price_monthly;

            const subscriptionToInsert = {
                user_id: subscriptionData.user_id,
                plan_type: subscriptionData.plan_type,
                status: subscriptionData.status || 'active',
                billing_cycle: subscriptionData.billing_cycle,
                price: price,
                currency: subscriptionData.currency || 'USD',
                started_at: subscriptionData.started_at || db.fn.now(),
                current_period_start: subscriptionData.current_period_start || db.fn.now(),
                current_period_end: subscriptionData.current_period_end,
                stripe_subscription_id: subscriptionData.stripe_subscription_id,
                stripe_customer_id: subscriptionData.stripe_customer_id,
                payment_method: subscriptionData.payment_method,
                payment_details: JSON.stringify(subscriptionData.payment_details || {}),
                usage_limits: JSON.stringify(planConfig.limits),
                current_usage: JSON.stringify({}),
                is_trial: subscriptionData.is_trial || false,
                trial_ends_at: subscriptionData.trial_ends_at
            };

            const [subscriptionId] = await db('subscriptions').insert(subscriptionToInsert);
            const subscription = await Subscription.findById(subscriptionId);
            
            return subscription;
        } catch (error) {
            throw new Error(`Failed to create subscription: ${error.message}`);
        }
    }

    // Find subscription by ID
    static async findById(id) {
        try {
            const subscriptionData = await db('subscriptions').where({ id }).first();
            if (!subscriptionData) return null;
            
            // Parse JSON fields
            if (subscriptionData.payment_details && typeof subscriptionData.payment_details === 'string') {
                subscriptionData.payment_details = JSON.parse(subscriptionData.payment_details);
            }
            if (subscriptionData.usage_limits && typeof subscriptionData.usage_limits === 'string') {
                subscriptionData.usage_limits = JSON.parse(subscriptionData.usage_limits);
            }
            if (subscriptionData.current_usage && typeof subscriptionData.current_usage === 'string') {
                subscriptionData.current_usage = JSON.parse(subscriptionData.current_usage);
            }
            
            return new Subscription(subscriptionData);
        } catch (error) {
            throw new Error(`Failed to find subscription by ID: ${error.message}`);
        }
    }

    // Find active subscription by user ID
    static async findActiveByUserId(userId) {
        try {
            const subscriptionData = await db('subscriptions')
                .where({ user_id: userId, status: 'active' })
                .where('current_period_end', '>', db.fn.now())
                .orderBy('created_at', 'desc')
                .first();
                
            if (!subscriptionData) return null;
            
            // Parse JSON fields
            if (subscriptionData.payment_details && typeof subscriptionData.payment_details === 'string') {
                subscriptionData.payment_details = JSON.parse(subscriptionData.payment_details);
            }
            if (subscriptionData.usage_limits && typeof subscriptionData.usage_limits === 'string') {
                subscriptionData.usage_limits = JSON.parse(subscriptionData.usage_limits);
            }
            if (subscriptionData.current_usage && typeof subscriptionData.current_usage === 'string') {
                subscriptionData.current_usage = JSON.parse(subscriptionData.current_usage);
            }
            
            return new Subscription(subscriptionData);
        } catch (error) {
            throw new Error(`Failed to find active subscription: ${error.message}`);
        }
    }

    // Find all subscriptions by user ID
    static async findByUserId(userId) {
        try {
            const subscriptions = await db('subscriptions')
                .where({ user_id: userId })
                .orderBy('created_at', 'desc');
                
            return subscriptions.map(subscriptionData => {
                // Parse JSON fields
                if (subscriptionData.payment_details && typeof subscriptionData.payment_details === 'string') {
                    subscriptionData.payment_details = JSON.parse(subscriptionData.payment_details);
                }
                if (subscriptionData.usage_limits && typeof subscriptionData.usage_limits === 'string') {
                    subscriptionData.usage_limits = JSON.parse(subscriptionData.usage_limits);
                }
                if (subscriptionData.current_usage && typeof subscriptionData.current_usage === 'string') {
                    subscriptionData.current_usage = JSON.parse(subscriptionData.current_usage);
                }
                
                return new Subscription(subscriptionData);
            });
        } catch (error) {
            throw new Error(`Failed to find subscriptions by user ID: ${error.message}`);
        }
    }

    // Update subscription
    async update(updateData) {
        try {
            const allowedFields = [
                'status', 'current_period_start', 'current_period_end', 'cancelled_at', 
                'expires_at', 'payment_method', 'payment_details', 'current_usage'
            ];
            
            const dataToUpdate = {};
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    if (['payment_details', 'current_usage'].includes(field) && typeof updateData[field] === 'object') {
                        dataToUpdate[field] = JSON.stringify(updateData[field]);
                    } else {
                        dataToUpdate[field] = updateData[field];
                    }
                }
            }
            
            if (Object.keys(dataToUpdate).length > 0) {
                dataToUpdate.updated_at = db.fn.now();
                await db('subscriptions').where({ id: this.id }).update(dataToUpdate);
                
                // Update instance properties
                for (const [key, value] of Object.entries(dataToUpdate)) {
                    if (['payment_details', 'current_usage'].includes(key) && typeof value === 'string') {
                        this[key] = JSON.parse(value);
                    } else {
                        this[key] = value;
                    }
                }
            }
            
            return true;
        } catch (error) {
            throw new Error(`Failed to update subscription: ${error.message}`);
        }
    }

    // Cancel subscription
    async cancel() {
        try {
            const now = new Date();
            await db('subscriptions').where({ id: this.id }).update({
                status: 'cancelled',
                cancelled_at: now,
                updated_at: db.fn.now()
            });
            
            this.status = 'cancelled';
            this.cancelled_at = now;
            
            return true;
        } catch (error) {
            throw new Error(`Failed to cancel subscription: ${error.message}`);
        }
    }

    // Renew subscription
    async renew(newPeriodEnd) {
        try {
            const now = new Date();
            await db('subscriptions').where({ id: this.id }).update({
                status: 'active',
                current_period_start: now,
                current_period_end: newPeriodEnd,
                updated_at: db.fn.now()
            });
            
            this.status = 'active';
            this.current_period_start = now;
            this.current_period_end = newPeriodEnd;
            
            return true;
        } catch (error) {
            throw new Error(`Failed to renew subscription: ${error.message}`);
        }
    }

    // Update usage
    async updateUsage(usageType, amount) {
        try {
            const currentUsage = { ...this.current_usage };
            currentUsage[usageType] = (currentUsage[usageType] || 0) + amount;
            
            await db('subscriptions').where({ id: this.id }).update({
                current_usage: JSON.stringify(currentUsage),
                updated_at: db.fn.now()
            });
            
            this.current_usage = currentUsage;
            return true;
        } catch (error) {
            throw new Error(`Failed to update usage: ${error.message}`);
        }
    }

    // Check if usage limit is exceeded
    hasExceededLimit(usageType) {
        const limit = this.usage_limits[usageType];
        const current = this.current_usage[usageType] || 0;
        
        // -1 means unlimited
        if (limit === -1) return false;
        
        return current >= limit;
    }

    // Get remaining usage
    getRemainingUsage(usageType) {
        const limit = this.usage_limits[usageType];
        const current = this.current_usage[usageType] || 0;
        
        // -1 means unlimited
        if (limit === -1) return -1;
        
        return Math.max(0, limit - current);
    }

    // Check if subscription is active
    isActive() {
        if (this.status !== 'active') return false;
        
        const now = new Date();
        const periodEnd = new Date(this.current_period_end);
        
        return now <= periodEnd;
    }

    // Check if subscription is in trial
    isInTrial() {
        if (!this.is_trial) return false;
        
        const now = new Date();
        const trialEnd = new Date(this.trial_ends_at);
        
        return now <= trialEnd;
    }

    // Get days until expiration
    getDaysUntilExpiration() {
        const now = new Date();
        const periodEnd = new Date(this.current_period_end);
        const diffTime = periodEnd - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
    }

    // Get plan configuration
    getPlanConfig() {
        return Subscription.getPlanConfig(this.plan_type);
    }

    // Reset monthly usage (for billing cycle)
    async resetUsage() {
        try {
            await db('subscriptions').where({ id: this.id }).update({
                current_usage: JSON.stringify({}),
                updated_at: db.fn.now()
            });
            
            this.current_usage = {};
            return true;
        } catch (error) {
            throw new Error(`Failed to reset usage: ${error.message}`);
        }
    }

    // Get expiring subscriptions (for notifications)
    static async getExpiring(days = 7) {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            
            const subscriptions = await db('subscriptions')
                .where({ status: 'active' })
                .where('current_period_end', '<=', futureDate)
                .where('current_period_end', '>', db.fn.now());
                
            return subscriptions.map(subscriptionData => {
                // Parse JSON fields
                if (subscriptionData.payment_details && typeof subscriptionData.payment_details === 'string') {
                    subscriptionData.payment_details = JSON.parse(subscriptionData.payment_details);
                }
                if (subscriptionData.usage_limits && typeof subscriptionData.usage_limits === 'string') {
                    subscriptionData.usage_limits = JSON.parse(subscriptionData.usage_limits);
                }
                if (subscriptionData.current_usage && typeof subscriptionData.current_usage === 'string') {
                    subscriptionData.current_usage = JSON.parse(subscriptionData.current_usage);
                }
                
                return new Subscription(subscriptionData);
            });
        } catch (error) {
            throw new Error(`Failed to get expiring subscriptions: ${error.message}`);
        }
    }

    // Convert to JSON
    toJSON() {
        const subscriptionData = { ...this };
        
        // Add computed properties
        subscriptionData.is_active = this.isActive();
        subscriptionData.is_in_trial = this.isInTrial();
        subscriptionData.days_until_expiration = this.getDaysUntilExpiration();
        subscriptionData.plan_config = this.getPlanConfig();
        
        return subscriptionData;
    }
}

module.exports = Subscription;