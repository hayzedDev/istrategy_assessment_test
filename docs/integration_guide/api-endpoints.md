# API Endpoints Reference

This document provides a comprehensive overview of all the API endpoints available in our Payment Processing System.

## Base URL

All API endpoints are relative to:

```
https://api.example.com/v1
```

For local development:

```
http://localhost:3010
```

## Authentication

Most endpoints require authentication using a JWT token, which you get from the `/auth/login` endpoint. Include it in the header of your requests:

```
Authorization: Bearer your_jwt_token
```

## Auth Endpoints

### Login - Create a session and get an auth token

```
POST /auth/login
```

**Request body:**

```json
{
  "email": "merchant@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "merchantId": "06e8d362-8937-48e2-8b32-bcbd4f063219",
  "email": "merchant@example.com",
  "name": "Merchant Name",
  "expiresIn": 3600
}
```

### Logout - End a session

```
POST /auth/logout
```

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
  "success": true,
  "message": "You have been successfully logged out"
}
```

### Get Merchants - List all merchants (public)

```
GET /auth/merchants
```

**Response:**

```json
{
  "merchants": [
    {
      "name": "Merchant One",
      "email": "merchant1@example.com"
    },
    {
      "name": "Merchant Two",
      "email": "merchant2@example.com"
    }
  ],
  "total": 2
}
```

## Payment Endpoints

### Initialize a Payment

```
POST /payments
```

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Request Body:**

```json
{
  "amount": 100.5,
  "currency": "USD",
  "paymentMethodId": "d97f10ea-8150-4479-a509-4693bd044f37",
  "metadata": {
    "orderId": "123456",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe"
  }
}
```

**Response:**

```json
{
  "id": "5efbb2a9-b70a-4c36-9a56-f90d962215d3",
  "reference": "PAY-52021643",
  "amount": 100.5,
  "currency": "USD",
  "status": "pending",
  "createdAt": "2025-09-30T22:36:34.229Z",
  "updatedAt": "2025-09-30T22:36:34.229Z"
}
```

### Get Payment by Reference

```
GET /payments/:reference
```

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
  "id": "5efbb2a9-b70a-4c36-9a56-f90d962215d3",
  "reference": "PAY-52021643",
  "amount": 100.5,
  "currency": "USD",
  "status": "pending",
  "createdAt": "2025-09-30T22:36:34.229Z",
  "updatedAt": "2025-09-30T22:36:34.229Z"
}
```

### Get Merchant Payments (paginated)

```
GET /payments/merchant?page=1&limit=10
```

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
  "data": [
    {
      "id": "5efbb2a9-b70a-4c36-9a56-f90d962215d3",
      "reference": "PAY-52021643",
      "amount": 100.5,
      "currency": "USD",
      "status": "pending",
      "createdAt": "2025-09-30T22:36:34.229Z",
      "updatedAt": "2025-09-30T22:36:34.229Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pageCount": 1
  }
}
```

### Get Merchant Payment Methods

```
GET /payments/payment-methods
```

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
  "paymentMethods": [
    {
      "id": "d97f10ea-8150-4479-a509-4693bd044f37",
      "name": "Visa Card",
      "type": "credit_card",
      "active": true,
      "configuration": {
        "provider": "STRIPE",
        "cardNumber": "4242",
        "expiryMonth": "12",
        "expiryYear": "2030",
        "cardholderName": "Merchant One"
      },
      "createdAt": "2025-09-30T19:35:09.745Z",
      "updatedAt": "2025-09-30T19:35:09.745Z",
      "merchantId": "06e8d362-8937-48e2-8b32-bcbd4f063219"
    }
  ],
  "total": 1
}
```

## Webhook Endpoints

### Process Payment Status Update

```
POST /webhooks/payment/ndsiuhfjwmpeoimfesdfs/:reference
```

**Headers:**

```
x-webhook-signature: your_webhook_signature
```

**Request Body:**

```json
{
  "status": "completed",
  "gatewayReference": "trx_12345",
  "gatewayResponseCode": "00",
  "metadata": {
    "processorId": "proc_123"
  }
}
```

**Response:**

```json
{
  "id": "5efbb2a9-b70a-4c36-9a56-f90d962215d3",
  "reference": "PAY-52021643",
  "amount": 100.5,
  "currency": "USD",
  "status": "completed",
  "createdAt": "2025-09-30T22:36:34.229Z",
  "updatedAt": "2025-09-30T22:40:15.123Z"
}
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "statusCode": 400,
  "message": "Description of the error",
  "error": "Bad Request"
}
```

Common status codes:

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid credentials)
- `404` - Not Found
- `500` - Internal Server Error
