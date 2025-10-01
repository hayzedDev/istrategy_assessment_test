# Local Development Guide

This guide provides step-by-step instructions for setting up the Payment Processing API on your local machine for development purposes.

## Prerequisites

Before you begin, make sure you have the following installed on your system:

### 1. Node.js (v20 or later)

Our project uses Node.js v20. You can install it using:

- **macOS/Linux**: Using NVM (recommended)

  ```bash
  # Install NVM
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

  # Install Node.js v20
  nvm install 20
  nvm use 20
  ```

- **Windows**: Download the installer from [nodejs.org](https://nodejs.org/)

- **Verify installation**:
  ```bash
  node --version  # Should output v20.x.x
  ```

### 2. Yarn (v1.22 or later)

We use Yarn as our package manager:

```bash
# Install Yarn globally
npm install -g yarn

# Verify installation
yarn --version  # Should output 1.22.x or later
```

### 3. PostgreSQL (v15 or later)

Our application requires PostgreSQL as the database:

- **macOS**:

  ```bash
  # Using Homebrew
  brew install postgresql@15
  brew services start postgresql@15
  ```

- **Linux (Ubuntu/Debian)**:

  ```bash
  # Add PostgreSQL repository
  sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

  # Install PostgreSQL
  sudo apt-get update
  sudo apt-get install postgresql-15

  # Start service
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
  ```

- **Windows**: Download the installer from [postgresql.org](https://www.postgresql.org/download/windows/)

After installation, create a database for the project:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE payment_processor;"

# Verify database creation
psql -U postgres -c "\l" | grep payment_processor
```

### 4. Redis (v7 or later)

Our application uses Redis for JWT blacklisting and caching:

- **macOS**:

  ```bash
  # Using Homebrew
  brew install redis
  brew services start redis
  ```

- **Linux (Ubuntu/Debian)**:

  ```bash
  # Install Redis
  sudo apt-get update
  sudo apt-get install redis-server

  # Start service
  sudo systemctl start redis-server
  sudo systemctl enable redis-server
  ```

- **Windows**: Download from [redis.io](https://redis.io/download) or use [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install)

Verify Redis installation:

```bash
redis-cli ping  # Should output PONG
```

### 5. AWS CLI (optional, for SQS integration)

If you need to work with AWS SQS:

```bash
# Install AWS CLI
pip install awscli

# Configure with your credentials
aws configure
```

## Setting Up the Project

Follow these steps to set up the project locally:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd istrategy_assessment_backend
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory by copying the example:

```bash
cp .env.example .env
```

Then edit the `.env` file to match your local setup:

```bash
# Server Configuration
PORT=3010  # You can change this if port 3010 is already in use
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres        # Update if your PostgreSQL username is different
DB_PASSWORD=postgres        # Update to your PostgreSQL password
DB_NAME=payment_processor

# JWT Configuration
JWT_SECRET=your-local-development-secret-key
JWT_EXPIRES_IN=1h
JWT_EXPIRES_IN_SECONDS=3600

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=             # Add password if your Redis is password-protected

# AWS SQS Configuration (only needed if working with SQS)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
SQS_PAYMENT_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/payment-queue
```

### 4. Run Database Migrations

```bash
# Run migrations to create database schema
yarn migration:run
```

### 5. Seed Initial Data

```bash
# Seed the database with initial data
yarn seed:direct
```

## Running the Application

### Development Mode

```bash
# Start the application in development mode
yarn start:dev
```

This will:

- Run the application with hot-reload enabled
- Seed the database with initial data
- Make the API accessible at http://localhost:3010 (or your configured PORT)
- Make the Swagger API documentation available at http://localhost:3010/api/docs

### Other Useful Commands

```bash
# Build the application
yarn build

# Run in production mode
yarn start:prod

# Run tests
yarn test

# Run end-to-end tests
yarn test:e2e

# Generate new migration after entity changes
yarn migration:generate src/migrations/MigrationName

# Run linter
yarn lint

# Format code
yarn format
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify PostgreSQL is running:

   ```bash
   # macOS
   brew services list | grep postgresql

   # Linux
   sudo systemctl status postgresql
   ```

2. Check database credentials in your `.env` file match your PostgreSQL setup

3. Try connecting manually:

   ```bash
   psql -U postgres -h localhost -d payment_processor
   ```

4. Reset database if needed:
   ```bash
   psql -d payment_processor -U postgres -c "DROP TABLE IF EXISTS payments, payment_methods, merchants, migrations, typeorm_metadata CASCADE; DROP TYPE IF EXISTS payment_methods_type_enum, payments_status_enum CASCADE;"
   ```

### Redis Connection Issues

If Redis connection fails:

1. Verify Redis is running:

   ```bash
   # macOS
   brew services list | grep redis

   # Linux
   sudo systemctl status redis-server
   ```

2. Try connecting manually:

   ```bash
   redis-cli ping
   ```

3. Check Redis configuration in your `.env` file

### API Authentication Issues

Default admin user credentials (after seeding):

```
Email: admin@example.com
Password: Admin123!
```

Test authentication with:

```bash
curl -X POST http://localhost:3010/auth/login -H "Content-Type: application/json" -d '{"email": "admin@example.com", "password": "Admin123!"}'
```

## Integrating with Local Services

### Local SQS (Optional)

For local development without AWS SQS, you can use [LocalStack](https://github.com/localstack/localstack):

```bash
# Install LocalStack
pip install localstack

# Start LocalStack with SQS
localstack start -s sqs

# Create local queue
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name payment-queue
```

Then update your `.env`:

```
SQS_PAYMENT_QUEUE_URL=http://localhost:4566/000000000000/payment-queue
```

## Making API Requests

After starting the application, you can:

1. Use the Swagger UI at http://localhost:3010/api/docs
2. Use cURL or Postman to make requests

Example registration request:

```bash
curl -X POST http://localhost:3010/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "Password123!"}'
```

Example login request:

```bash
curl -X POST http://localhost:3010/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123!"}'
```

## Coding Standards

Please follow these guidelines when contributing to the project:

- Use the provided linting and formatting tools:

  ```bash
  yarn lint
  yarn format
  ```

- Write tests for new functionality
- Follow the existing code structure and patterns
- Use meaningful commit messages

## Need Help?

If you encounter any issues not covered in this guide:

1. Check the project documentation in the `docs` directory
2. Look for error messages in the console output
3. Contact the team lead or project maintainer
