// Demo Users Seed
const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
    // Clear existing entries
    await knex('user_sessions').del();
    await knex('business_data').del();
    await knex('subscriptions').del();
    await knex('users').del();

    // Create demo users with hashed passwords
    const demoPassword = await bcrypt.hash('demo123', 12);
    const adminPassword = await bcrypt.hash('admin123', 12);

    // Insert demo users
    const users = await knex('users').insert([
        {
            id: 1,
            username: 'demo',
            email: 'demo@aidatacuration.com',
            password_hash: demoPassword,
            first_name: 'Demo',
            last_name: 'User',
            company_name: 'Demo Company Inc',
            company_size: '11-50',
            industry: 'Technology',
            company_description: 'A demo company for testing the AI Data Curation platform',
            is_active: true,
            email_verified: true,
            email_verified_at: knex.fn.now(),
            preferences: JSON.stringify({
                notifications: true,
                theme: 'light',
                dashboard_layout: 'default'
            }),
            timezone: 'America/New_York',
            language: 'en',
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        },
        {
            id: 2,
            username: 'admin',
            email: 'admin@aidatacuration.com',
            password_hash: adminPassword,
            first_name: 'Admin',
            last_name: 'User',
            company_name: 'AI Data Curation Inc',
            company_size: '201-1000',
            industry: 'Artificial Intelligence',
            company_description: 'The company behind the AI Data Curation platform',
            is_active: true,
            email_verified: true,
            email_verified_at: knex.fn.now(),
            preferences: JSON.stringify({
                notifications: true,
                theme: 'dark',
                dashboard_layout: 'advanced',
                admin_access: true
            }),
            timezone: 'America/Los_Angeles',
            language: 'en',
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        },
        {
            id: 3,
            username: 'enterprise_user',
            email: 'enterprise@bigcorp.com',
            password_hash: await bcrypt.hash('enterprise123', 12),
            first_name: 'Enterprise',
            last_name: 'Manager',
            company_name: 'Big Corporation Ltd',
            company_size: '1000+',
            industry: 'Manufacturing',
            company_description: 'Large manufacturing company looking to implement AI solutions',
            is_active: true,
            email_verified: true,
            email_verified_at: knex.fn.now(),
            preferences: JSON.stringify({
                notifications: true,
                theme: 'light',
                dashboard_layout: 'enterprise'
            }),
            timezone: 'Europe/London',
            language: 'en',
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        },
        {
            id: 4,
            username: 'startup_founder',
            email: 'founder@startup.io',
            password_hash: await bcrypt.hash('startup123', 12),
            first_name: 'Startup',
            last_name: 'Founder',
            company_name: 'Innovative Startup',
            company_size: '1-10',
            industry: 'Software',
            company_description: 'Fast-growing startup in the fintech space',
            is_active: true,
            email_verified: true,
            email_verified_at: knex.fn.now(),
            preferences: JSON.stringify({
                notifications: true,
                theme: 'light',
                dashboard_layout: 'minimal'
            }),
            timezone: 'America/Los_Angeles',
            language: 'en',
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        }
    ]).returning('id');

    console.log('✅ Demo users created successfully');
    return users;
};