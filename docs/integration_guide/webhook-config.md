# Webhook Configuration

Webhooks provide a real-time notification mechanism for your integration. This document explains how to configure, secure, and handle webhooks in our payment processing system.

## Overview

Our webhook system notifies your application when payment events occur, such as when a payment is completed, failed, or refunded. Instead of polling our API for updates, you can receive push notifications when these events happen.

## Webhook URL Pattern

The obfuscated webhook endpoints follow this pattern:

```
/webhooks/payment/ndsiuhfjwmpeoimfesdfs/:reference
```

This URL pattern includes:

- A deliberate random string (`ndsiuhfjwmpeoimfesdfs`) to obscure the endpoint
- The payment reference as a path parameter

## Supported Events

Our webhooks can notify you about the following events:

- `payment.initiated` - A new payment has been initialized
- `payment.completed` - A payment has been successfully processed
- `payment.failed` - A payment attempt has failed
- `payment.refunded` - A payment has been refunded

## Setting Up Webhooks

### 1. Create an Endpoint

First, create an endpoint on your server to receive webhook notifications. This endpoint should:

- Accept POST requests
- Parse JSON request bodies
- Verify webhook signatures
- Return a 200 OK response quickly (process asynchronously if needed)

### 2. Register Your Webhook URL

Register your webhook URL in your merchant dashboard or contact our support team to set it up.

### 3. Implement Signature Verification

All webhook requests include a signature in the `x-webhook-signature` header. Verify this signature to ensure the webhook came from our system:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

// In your webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  const secret = process.env.WEBHOOK_SECRET;

  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process the webhook
  // ...

  // Acknowledge receipt
  return res.status(200).send('Webhook received');
});
```

## Best Practices

### Security

1. **Always verify signatures** to prevent unauthorized webhook calls
2. **Use HTTPS** for your webhook endpoint
3. **Keep your webhook secret secure** and don't expose it in client-side code
4. **Implement IP whitelisting** if possible

### Reliability

1. **Respond quickly** (within 5 seconds) to webhook requests to prevent timeouts
2. **Process webhooks asynchronously** for time-consuming operations
3. **Implement idempotency** to handle duplicate webhook deliveries
4. **Set up monitoring** to detect webhook failures
5. **Implement a fallback polling mechanism** in case webhooks fail

### Webhook Handling

1. **Store raw webhook data** before processing for debugging and replay
2. **Implement a retry mechanism** for failed webhook processing
3. **Log all webhook events** for auditing and debugging
4. **Set up alerts** for critical webhook failures

## Webhook Obfuscation

We use endpoint obfuscation as an extra layer of security. While security through obscurity is not a primary defense, it provides:

1. **Reduced attack surface** by making endpoints harder to discover
2. **Protection against automated scanning** by bots and vulnerability scanners
3. **Defense in depth** when combined with other security measures

The random string in our webhook URLs (`ndsiuhfjwmpeoimfesdfs`) acts as a simple shared secret that makes it harder for unauthorized parties to send fake webhook events.

## Testing Webhooks

You can test webhook delivery using our sandbox environment:

1. Set up a test endpoint (services like [Webhook.site](https://webhook.site) can be useful)
2. Configure the test URL in your sandbox account
3. Create test payments to trigger webhooks
4. Verify your endpoint correctly receives and processes the webhooks

## Troubleshooting

Common webhook issues and solutions:

1. **Not receiving webhooks**
   - Check your firewall settings
   - Verify the webhook URL is correct and accessible
   - Check server logs for connection attempts

2. **Signature verification fails**
   - Ensure you're using the correct webhook secret
   - Check if the payload is being modified before verification
   - Verify the signature algorithm matches our implementation

3. **Duplicate webhook deliveries**
   - Implement idempotency by storing and checking webhook IDs
   - Use database transactions to prevent duplicate processing
