// Create Subscriptions Table Migration

exports.up = function(knex) {
    return knex.schema.createTable('subscriptions', function(table) {
        // Primary key
        table.increments('id').primary();
        
        // Foreign key to users
        table.integer('user_id').unsigned().notNullable();
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        
        // Subscription details
        table.string('plan_type').notNullable(); // 'basic-neural', 'advanced-neural', 'enterprise-neural'
        table.string('status').notNullable().defaultTo('active'); // 'active', 'cancelled', 'expired', 'suspended'
        table.string('billing_cycle').notNullable(); // 'monthly', 'annual'
        
        // Pricing
        table.decimal('price', 10, 2).notNullable();
        table.string('currency').defaultTo('USD');
        
        // Billing dates
        table.timestamp('started_at').notNullable();
        table.timestamp('current_period_start').notNullable();
        table.timestamp('current_period_end').notNullable();
        table.timestamp('cancelled_at');
        table.timestamp('expires_at');
        
        // Payment information
        table.string('stripe_subscription_id').unique();
        table.string('stripe_customer_id');
        table.string('payment_method'); // 'card', 'bank_transfer', 'invoice'
        table.json('payment_details').defaultTo('{}');
        
        // Usage tracking
        table.json('usage_limits').defaultTo('{}'); // Plan-specific limits
        table.json('current_usage').defaultTo('{}'); // Current usage stats
        
        // Trial information
        table.boolean('is_trial').defaultTo(false);
        table.timestamp('trial_ends_at');
        
        // Timestamps
        table.timestamps(true, true);
        
        // Indexes
        table.index(['user_id']);
        table.index(['plan_type']);
        table.index(['status']);
        table.index(['stripe_subscription_id']);
        table.index(['current_period_end']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('subscriptions');
};