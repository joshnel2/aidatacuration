// Create User Sessions Table Migration

exports.up = function(knex) {
    return knex.schema.createTable('user_sessions', function(table) {
        // Primary key
        table.increments('id').primary();
        
        // Foreign key to users
        table.integer('user_id').unsigned().notNullable();
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        
        // Session details
        table.string('session_token').unique().notNullable();
        table.string('refresh_token').unique();
        table.timestamp('expires_at').notNullable();
        table.boolean('is_active').defaultTo(true);
        
        // Device/browser information
        table.string('user_agent');
        table.string('ip_address');
        table.string('device_type'); // 'desktop', 'mobile', 'tablet'
        table.string('browser');
        table.string('os');
        
        // Location (optional)
        table.string('country');
        table.string('city');
        
        // Security
        table.timestamp('last_activity_at').defaultTo(knex.fn.now());
        table.boolean('remember_me').defaultTo(false);
        
        // Timestamps
        table.timestamps(true, true);
        
        // Indexes
        table.index(['user_id']);
        table.index(['session_token']);
        table.index(['expires_at']);
        table.index(['is_active']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('user_sessions');
};