# CRM Backend API

Backend server for the CRM system built with Node.js, Express, Prisma, and PostgreSQL.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
DATABASE_URL="postgresql://username:password@localhost:5432/crm_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
```

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

5. Run migrations:
```bash
npm run prisma:migrate
```

6. Seed the database:
```bash
npm run prisma:seed
```

### Running the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

### Default Users

After seeding, you can login with:

- **Admin**: `admin@crm.com` / `admin123`
- **Manager**: `manager@crm.com` / `manager123`
- **Sales Executive**: `sales@crm.com` / `sales123`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middlewares/     # Express middlewares (auth, validation, etc.)
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.js          # Seed script
└── package.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed the database
- `npm run prisma:studio` - Open Prisma Studio
- `npm test` - Run tests

## 📚 API Documentation

API documentation will be added as features are implemented.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io
- **Email**: Nodemailer


