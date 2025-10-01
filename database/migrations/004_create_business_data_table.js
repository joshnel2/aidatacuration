// Create Business Data Table Migration

exports.up = function(knex) {
    return knex.schema.createTable('business_data', function(table) {
        // Primary key
        table.increments('id').primary();
        
        // Foreign key to users
        table.integer('user_id').unsigned().notNullable();
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        
        // Data classification
        table.string('data_type').notNullable(); // 'file_upload', 'natural_language', 'survey_response', 'consultation'
        table.string('category'); // 'financial', 'inventory', 'operational', 'strategic'
        table.string('source'); // 'manual_upload', 'api_integration', 'survey', 'consultation'
        
        // Content
        table.text('raw_data'); // Original data
        table.json('processed_data'); // AI-processed structured data
        table.json('ai_insights'); // Grok-generated insights
        table.json('metadata').defaultTo('{}'); // File info, processing details, etc.
        
        // Processing status
        table.string('processing_status').defaultTo('pending'); // 'pending', 'processing', 'completed', 'failed'
        table.text('processing_error');
        table.timestamp('processed_at');
        
        // AI processing details
        table.string('grok_model_used');
        table.json('grok_response_metadata');
        table.decimal('confidence_score', 5, 2); // AI confidence in processing
        
        // File information (if applicable)
        table.string('original_filename');
        table.string('file_path');
        table.string('file_type');
        table.integer('file_size');
        table.string('file_hash'); // For deduplication
        
        // Timestamps
        table.timestamps(true, true);
        
        // Indexes
        table.index(['user_id']);
        table.index(['data_type']);
        table.index(['category']);
        table.index(['processing_status']);
        table.index(['file_hash']);
        table.index(['created_at']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('business_data');
};