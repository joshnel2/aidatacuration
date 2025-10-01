// Test authentication API
require('dotenv').config();
const express = require('express');
const { router: authRouter } = require('./api/auth');
const { testConnection } = require('./database/connection');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

async function testAuth() {
    try {
        console.log('🔄 Testing database connection...');
        const connected = await testConnection();
        
        if (!connected) {
            console.error('❌ Database connection failed');
            return;
        }
        
        const server = app.listen(3002, () => {
            console.log('✅ Test auth server running on port 3002');
            
            // Test sign in
            testSignIn();
        });
        
        async function testSignIn() {
            try {
                console.log('🔄 Testing sign in API...');
                
                const response = await fetch('http://localhost:3002/api/auth/signin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: 'demo',
                        password: 'demo123',
                        rememberMe: false
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    console.log('✅ Sign in successful!');
                    console.log('👤 User:', data.user.username);
                    console.log('💳 Plan:', data.subscription?.plan_type);
                    console.log('🔑 Token received:', !!data.accessToken);
                } else {
                    console.error('❌ Sign in failed:', data.error);
                }
                
                server.close();
                process.exit(0);
                
            } catch (error) {
                console.error('❌ Auth test failed:', error);
                server.close();
                process.exit(1);
            }
        }
        
    } catch (error) {
        console.error('❌ Test setup failed:', error);
        process.exit(1);
    }
}

testAuth();