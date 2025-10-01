// Demo Subscriptions Seed

exports.seed = async function(knex) {
    // Clear existing subscriptions
    await knex('subscriptions').del();

    // Calculate dates
    const now = new Date();
    const monthFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const yearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
    const trialEnd = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));

    // Insert demo subscriptions
    const subscriptions = await knex('subscriptions').insert([
        {
            id: 1,
            user_id: 1, // demo user
            plan_type: 'advanced-neural',
            status: 'active',
            billing_cycle: 'monthly',
            price: 299.00,
            currency: 'USD',
            started_at: now,
            current_period_start: now,
            current_period_end: monthFromNow,
            stripe_subscription_id: 'sub_demo_advanced_monthly',
            stripe_customer_id: 'cus_demo_user',
            payment_method: 'card',
            payment_details: JSON.stringify({
                card_brand: 'visa',
                card_last4: '4242',
                card_exp_month: 12,
                card_exp_year: 2025
            }),
            usage_limits: JSON.stringify({
                monthly_uploads: 200,
                storage_gb: 25,
                ai_requests: 5000,
                survey_responses: 500
            }),
            current_usage: JSON.stringify({
                monthly_uploads: 47,
                storage_gb: 12.3,
                ai_requests: 1247,
                survey_responses: 23
            }),
            is_trial: false,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        },
        {
            id: 2,
            user_id: 2, // admin user
            plan_type: 'enterprise-neural',
            status: 'active',
            billing_cycle: 'annual',
            price: 9990.00,
            currency: 'USD',
            started_at: now,
            current_period_start: now,
            current_period_end: yearFromNow,
            stripe_subscription_id: 'sub_admin_enterprise_annual',
            stripe_customer_id: 'cus_admin_user',
            payment_method: 'card',
            payment_details: JSON.stringify({
                card_brand: 'mastercard',
                card_last4: '5555',
                card_exp_month: 8,
                card_exp_year: 2026
            }),
            usage_limits: JSON.stringify({
                monthly_uploads: -1,
                storage_gb: 500,
                ai_requests: 25000,
                survey_responses: -1,
                consultations: 4
            }),
            current_usage: JSON.stringify({
                monthly_uploads: 156,
                storage_gb: 89.7,
                ai_requests: 3421,
                survey_responses: 87,
                consultations: 1
            }),
            is_trial: false,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        },
        {
            id: 3,
            user_id: 3, // enterprise user
            plan_type: 'enterprise-neural',
            status: 'active',
            billing_cycle: 'annual',
            price: 9990.00,
            currency: 'USD',
            started_at: now,
            current_period_start: now,
            current_period_end: yearFromNow,
            stripe_subscription_id: 'sub_enterprise_annual',
            stripe_customer_id: 'cus_enterprise_user',
            payment_method: 'invoice',
            payment_details: JSON.stringify({
                billing_contact: 'billing@bigcorp.com',
                po_number: 'PO-2024-AI-001',
                payment_terms: 'Net 30'
            }),
            usage_limits: JSON.stringify({
                monthly_uploads: -1,
                storage_gb: 500,
                ai_requests: 25000,
                survey_responses: -1,
                consultations: 4
            }),
            current_usage: JSON.stringify({
                monthly_uploads: 234,
                storage_gb: 145.2,
                ai_requests: 7892,
                survey_responses: 156,
                consultations: 2
            }),
            is_trial: false,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        },
        {
            id: 4,
            user_id: 4, // startup founder
            plan_type: 'basic-neural',
            status: 'active',
            billing_cycle: 'monthly',
            price: 99.00,
            currency: 'USD',
            started_at: now,
            current_period_start: now,
            current_period_end: monthFromNow,
            stripe_subscription_id: 'sub_startup_basic_monthly',
            stripe_customer_id: 'cus_startup_user',
            payment_method: 'card',
            payment_details: JSON.stringify({
                card_brand: 'amex',
                card_last4: '1005',
                card_exp_month: 3,
                card_exp_year: 2027
            }),
            usage_limits: JSON.stringify({
                monthly_uploads: 50,
                storage_gb: 5,
                ai_requests: 1000
            }),
            current_usage: JSON.stringify({
                monthly_uploads: 12,
                storage_gb: 2.1,
                ai_requests: 234
            }),
            is_trial: true,
            trial_ends_at: trialEnd,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        }
    ]).returning('id');

    console.log('✅ Demo subscriptions created successfully');
    return subscriptions;
};