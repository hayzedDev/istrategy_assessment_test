# Integration Guide

This guide walks you through the process of integrating with our Payment Processing API. Follow these steps to quickly get started processing payments in your application.

## Prerequisites

Before you begin, make sure you have:

1. A merchant account with us
2. API credentials (email and password)
3. Basic understanding of RESTful APIs and JWT authentication

## Getting Started

### Step 1: Authentication

The first step is to authenticate and get your JWT token:

```javascript
// Example using fetch API
async function login() {
  const response = await fetch('https://api.example.com/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'your-merchant-email@example.com',
      password: 'your-password',
    }),
  });

  const data = await response.json();

  // Store the token securely
  localStorage.setItem('token', data.accessToken);
  return data.accessToken;
}
```

### Step 2: Get Your Payment Methods

Before processing a payment, you'll need to know your available payment methods:

```javascript
async function getPaymentMethods() {
  const token = localStorage.getItem('token');

  const response = await fetch(
    'https://api.example.com/v1/payments/payment-methods',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return await response.json();
}
```

### Step 3: Initialize a Payment

When a customer makes a purchase, initialize a payment:

```javascript
async function initializePayment(amount, paymentMethodId, metadata) {
  const token = localStorage.getItem('token');

  const response = await fetch('https://api.example.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount,
      currency: 'USD',
      paymentMethodId,
      metadata,
    }),
  });

  return await response.json();
}
```

### Step 4: Handle the Payment Status

After initializing a payment, you can check its status:

```javascript
async function checkPaymentStatus(reference) {
  const token = localStorage.getItem('token');

  const response = await fetch(
    `https://api.example.com/v1/payments/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return await response.json();
}
```

## Webhook Integration

For real-time payment updates, configure your backend to receive our webhooks:

1. Create an endpoint in your backend to receive webhook notifications
2. Configure the URL in your merchant dashboard
3. Implement signature verification to ensure security

Example webhook handler in Express:

```javascript
const express = require('express');
const app = express();
const crypto = require('crypto');

// Middleware to parse JSON
app.use(express.json());

// Webhook handler
app.post('/payment-webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  // Verify signature (implement your verification logic)
  if (!verifySignature(payload, signature)) {
    return res.status(401).send('Invalid signature');
  }

  // Process the payment update
  const { reference, status } = payload;
  console.log(`Payment ${reference} status updated to: ${status}`);

  // Always respond with 200 OK to acknowledge receipt
  res.status(200).send('Webhook received');
});

function verifySignature(payload, signature) {
  // Implement signature verification
  // This is a placeholder - implement actual verification
  return true;
}

app.listen(3000, () => console.log('Webhook server running'));
```

## Best Practices

1. **Token Management**: Store tokens securely and refresh them when needed
2. **Error Handling**: Implement robust error handling for all API calls
3. **Idempotency**: Handle duplicate requests safely by checking payment references
4. **Logging**: Log all payment-related activities for audit trails
5. **Timeouts**: Implement appropriate timeouts for API calls
6. **Webhook Redundancy**: Don't rely solely on webhooks - implement polling as a fallback

## Next Steps

- Implement a complete payment flow in your application
- Set up error monitoring and alerting
- Configure webhook endpoints for real-time updates
- Review and implement security best practices
