# Payment Processing System

This payment processing system is a backend application built with NestJS, PostgreSQL, and AWS SQS integration. It enables the initialization, processing, and tracking of payments with a focus on security, reliability, and maintainable architecture.

## Features

- **Database Schema**: Tables and models for Payments, PaymentMethods, and Merchants
- **Payment Initialization API**: REST API to initialize payments and save them with pending status
- **Event-Driven Architecture**: Publishes events to AWS SQS for payment processing
- **Webhook Handling**: Endpoint for payment gateway status updates
- **SQS Consumer Service**: Consumes payment event messages for logging and further processing

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Message Queue**: AWS SQS
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator and class-transformer

## Prerequisites

- Node.js (v16.x or later)
- npm (v8.x or later)
- PostgreSQL (v12.x or later)
- AWS Account with SQS access

## Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and update the values:

   ```
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_NAME=payment_processor

   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_SQS_PAYMENT_QUEUE_URL=your_payment_queue_url

   # App Configuration
   PORT=3000
   NODE_ENV=development
   ```

## Installation

```bash
# Install dependencies
$ npm install
```

## Database Setup

1. Create a PostgreSQL database:

   ```bash
   createdb payment_processor
   ```

2. The application will automatically create the required tables when started in development mode.

## Running the Application

```bash
# Development mode
$ npm run start:dev

# Production mode
$ npm run build
$ npm run start:prod
```

## API Documentation

Once the application is running, access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

## API Endpoints

### Payment Endpoints

- **POST /payments**
  - Initialize a new payment
  - Requires authentication
  - Returns payment reference

- **GET /payments/:reference**
  - Get payment details by reference
  - Requires authentication

- **GET /payments/merchant/:merchantId**
  - Get all payments for a merchant
  - Requires authentication

- **POST /payments/webhook/:reference**
  - Update payment status via webhook
  - Requires webhook signature

## Testing

```bash
# Run unit tests
$ npm run test

# Run e2e tests
$ npm run test:e2e

# Generate test coverage report
$ npm run test:cov
```

## Security Considerations

- API authentication using Bearer tokens
- Webhook signature verification
- Environment variables for sensitive information
- Input validation using class-validator

## License

This project is MIT licensed.
