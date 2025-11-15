/**
 * Generate a secure random JWT secret
 * Run: node generate-secret.js
 */
import crypto from 'crypto';

const secret = crypto.randomBytes(64).toString('hex');
console.log('\n🔐 Generated JWT Secret:');
console.log(secret);
console.log('\n📝 Add this to your .env file as:');
console.log(`JWT_SECRET="${secret}"\n`);

