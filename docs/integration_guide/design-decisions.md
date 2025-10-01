# Design Decisions

This document explains the key architectural and design decisions made in our Payment Processing API. These decisions reflect my approach to building secure, scalable, and maintainable payment systems.

## Architecture Overview

Our payment processing API is built using a modular, domain-driven design approach with NestJS as the framework. The architecture consists of the following key components:

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Client   │────▶│  REST API  │────▶│ Services   │
└────────────┘     └────────────┘     └─────┬──────┘
                                            │
┌────────────┐     ┌────────────┐     ┌─────▼──────┐
│  Webhooks  │◀────│   Events   │◀────│ Repository │
└────────────┘     └────────────┘     └─────┬──────┘
                                            │
                                      ┌─────▼──────┐
                                      │  Database  │
                                      └────────────┘
```

## Key Design Decisions

### 1. Resource Separation

I chose to separate resources into distinct modules (Auth, Payment, Webhook) for several reasons:

- **Domain Isolation**: Each module represents a bounded context with clear responsibilities
- **Maintainability**: Smaller, focused modules are easier to maintain and test
- **Scalability**: Modules can be deployed independently if needed
- **Team Organization**: Allows different teams to work on different modules

### 2. Webhook Endpoint Obfuscation

I implemented webhook endpoint obfuscation with a random string:

```
/webhooks/payment/ndsiuhfjwmpeoimfesdfs/:reference
```

This decision was made for:

- **Security in Depth**: Adds an additional layer of security beyond signature verification
- **Reduced Attack Surface**: Makes it harder for automated scanners to discover endpoints
- **Prevention of Spam**: Reduces likelihood of random webhook calls

### 3. JWT Authentication with Redis Blacklisting

The decision to use JWTs for authentication with Redis blacklisting combines the benefits of stateless authentication with the ability to revoke tokens:

- **Performance**: JWTs can be verified without database lookups for most requests
- **Scalability**: Works well in distributed environments
- **Security**: Allows token revocation by adding them to a blacklist
- **Modern Standard**: Uses industry-standard authentication mechanism

Implementation:

```typescript
// Token blacklisting in Redis
await redis.set(`blacklist:${jti}`, '1', 'EX', remainingTime);

// Token verification with blacklist check
const isBlacklisted = await redis.get(`blacklist:${jti}`);
if (isBlacklisted) {
  throw new UnauthorizedException('Token has been revoked');
}
```

### 4. Idempotent Payment Processing

I implemented idempotency in payment processing to ensure that duplicate requests don't create multiple payments:

- **Payment Reference**: Each payment has a unique reference
- **State Management**: Payments in terminal states (COMPLETED, FAILED) can't be modified
- **Retry Safety**: Safe to retry failed API calls without side effects

```typescript
// Check if payment is already in a terminal state (COMPLETED or FAILED)
if (
  payment.status === EPaymentStatus.COMPLETED ||
  payment.status === EPaymentStatus.FAILED
) {
  // Return the existing payment without modifying it
  console.log(`Payment ${reference} is already in terminal state`);
  return this.mapPaymentToResponse(payment);
}
```

### 5. Event-Driven Architecture with SQS

Using Amazon SQS for payment event processing provides:

- **Decoupling**: Services can operate independently
- **Reliability**: Events aren't lost if a service is down
- **Scalability**: Easily handles traffic spikes
- **Observability**: Events provide an audit trail

### 6. Sensitive Data Handling

Our approach to handling sensitive payment data:

- **Minimal Storage**: Only store what's absolutely necessary
- **Masking**: Card numbers stored as last 4 digits only
- **Separation**: Keep sensitive data in separate systems when possible

### 7. Pagination for Large Collections

I implemented pagination for collection endpoints to ensure performance:

```typescript
async getMerchantPaymentsPaginated(
  merchant: Merchant,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedResponse<any>> {
  // Implementation with skip/take for pagination
}
```

This ensures:

- **Performance**: Large result sets don't overload the server or client
- **Usability**: Clients can navigate through large data sets
- **Resource Management**: Controls server resource consumption

### 8. Database Migrations vs. Synchronization

I chose TypeORM migrations over automatic synchronization:

```typescript
// TypeORM config
synchronize: false, // Disable auto sync for production
migrations: [join(__dirname, 'src/common/database/migrations/*{.ts,.js}')],
```

Benefits:

- **Safety**: Prevents accidental schema changes in production
- **Version Control**: Schema changes are tracked in version control
- **Rollback Capability**: Can rollback problematic migrations
- **Team Coordination**: Everyone uses the same schema changes

### 9. Request Validation

I implemented comprehensive request validation using class-validator:

```typescript
export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsUUID()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
```

This ensures:

- **Data Integrity**: Only valid data enters the system
- **Security**: Prevents malformed data and potential injection attacks
- **Clear Contracts**: DTOs define the API contract clearly
- **Self-Documentation**: Validation rules document requirements

### 10. Response Standardization

I standardized API responses:

- **Consistent Structure**: All responses follow the same pattern
- **Field Selection**: Only necessary fields are returned
- **Security**: Sensitive data is automatically excluded

## Trade-offs Considered

1. **JWT vs. Session Authentication**
   - Chose JWT for scalability, but added Redis blacklisting for revocation capability

2. **PostgreSQL vs. MongoDB**
   - Chose PostgreSQL for ACID compliance and strong relationships between entities

3. **REST API vs. GraphQL**
   - Chose REST for simplicity, wide adoption, and cacheability

4. **Direct DB Access vs. Repository Pattern**
   - Chose Repository pattern for abstraction and testability

5. **Data Structure Normalization vs. Denormalization**
   - Used normalization for core payment data, but allowed some denormalization in metadata

## Future Considerations

1. **API Versioning**
   - Planning to implement formal API versioning for future changes

2. **Rate Limiting**
   - Will add more sophisticated rate limiting based on merchant tiers

3. **Caching Layer**
   - Planning to add Redis caching for frequently accessed data

4. **Multi-region Deployment**
   - Architecture supports expansion to multiple regions for lower latency

5. **Real-time Updates**
   - Considering adding WebSocket support for real-time payment updates
