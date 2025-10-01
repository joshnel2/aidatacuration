// Database Connection Manager
const knex = require('knex');
const config = require('./config');

// Create database connection
const db = knex(config);

// Test database connection
async function testConnection() {
    try {
        await db.raw('SELECT 1');
        console.log('✅ Database connection established successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Initialize database (run migrations)
async function initializeDatabase() {
    try {
        console.log('🔄 Running database migrations...');
        await db.migrate.latest();
        console.log('✅ Database migrations completed');
        
        // Run seeds in development
        if (process.env.NODE_ENV !== 'production') {
            console.log('🌱 Running database seeds...');
            await db.seed.run();
            console.log('✅ Database seeds completed');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        return false;
    }
}

// Graceful shutdown
async function closeConnection() {
    try {
        await db.destroy();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database connection:', error.message);
    }
}

module.exports = {
    db,
    testConnection,
    initializeDatabase,
    closeConnection
};