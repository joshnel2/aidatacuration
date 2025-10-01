// Database Configuration
// Supports SQLite (development) and PostgreSQL/MySQL (production)

const path = require('path');

const config = {
    development: {
        client: 'sqlite3',
        connection: {
            filename: path.join(__dirname, 'ai_data_curation.db')
        },
        useNullAsDefault: true,
        migrations: {
            directory: path.join(__dirname, 'migrations')
        },
        seeds: {
            directory: path.join(__dirname, 'seeds')
        }
    },
    
    production: {
        client: process.env.DB_CLIENT || 'pg',
        connection: process.env.DATABASE_URL || {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: path.join(__dirname, 'migrations')
        },
        seeds: {
            directory: path.join(__dirname, 'seeds')
        }
    }
};

module.exports = config[process.env.NODE_ENV || 'development'];