import dotenv from 'dotenv';

dotenv.config();

/**
 * Typed configuration helper
 * Validates and exports all environment variables
 */
const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Server
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Email
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@crm.com',
  },

  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
};

// Validation
if (!config.database.url) {
  console.warn('⚠️  DATABASE_URL is not set');
}

if (config.jwt.secret === 'fallback-secret-key') {
  console.warn('⚠️  JWT_SECRET is using fallback value. Set it in production!');
}

export default config;

