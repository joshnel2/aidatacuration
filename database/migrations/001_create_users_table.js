// Create Users Table Migration

exports.up = function(knex) {
    return knex.schema.createTable('users', function(table) {
        // Primary key
        table.increments('id').primary();
        
        // Basic user information
        table.string('username').unique().notNullable();
        table.string('email').unique().notNullable();
        table.string('password_hash').notNullable();
        table.string('first_name').notNullable();
        table.string('last_name').notNullable();
        
        // Company information
        table.string('company_name').notNullable();
        table.string('company_size');
        table.string('industry');
        table.text('company_description');
        
        // Account status
        table.boolean('is_active').defaultTo(true);
        table.boolean('email_verified').defaultTo(false);
        table.string('email_verification_token');
        table.timestamp('email_verified_at');
        
        // Authentication
        table.string('reset_password_token');
        table.timestamp('reset_password_expires');
        table.timestamp('last_login_at');
        table.string('last_login_ip');
        
        // Preferences
        table.json('preferences').defaultTo('{}');
        table.string('timezone').defaultTo('UTC');
        table.string('language').defaultTo('en');
        
        // Timestamps
        table.timestamps(true, true);
        
        // Indexes
        table.index(['email']);
        table.index(['username']);
        table.index(['company_name']);
        table.index(['is_active']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('users');
};