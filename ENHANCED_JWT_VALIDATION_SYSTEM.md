# Enhanced JWT Validation System

## Overview

The enhanced JWT validation system provides comprehensive security, monitoring, and validation for the organizations API. This system includes custom validation decorators, enhanced guards, and detailed interceptors for improved security and observability.

## Components

### 1. Enhanced JWT Guards

#### `EnhancedJwtAuthGuard`
**Location**: `src/auth/guards/enhanced-jwt-auth.guard.ts`

**Features**:
- **Token Format Validation**: Validates JWT structure and required fields
- **Expiration with Grace Period**: 30-second grace period for token expiration
- **Rate Limiting**: 60 requests per minute per user/IP combination
- **Suspicious Activity Detection**: Monitors for bot activity and unusual patterns
- **Enhanced Security Checks**: Validates organization access format and user patterns
- **Comprehensive Logging**: Detailed logs for security monitoring

**Usage**:
```typescript
@UseGuards(EnhancedJwtAuthGuard)
@Post('protected-endpoint')
async protectedAction(@GetUser() user: EnhancedJwtPayload) {
  // User is guaranteed to be authenticated and validated
}
```

#### `EnhancedOptionalJwtAuthGuard`
**Features**:
- Extends `EnhancedJwtAuthGuard` functionality
- Allows requests without tokens (public endpoints)
- Validates tokens when present
- Gracefully handles validation errors

**Usage**:
```typescript
@UseGuards(EnhancedOptionalJwtAuthGuard)
@Get('public-endpoint')
async publicAction(@GetUser() user?: EnhancedJwtPayload) {
  // User may or may not be authenticated
}
```

### 2. Enhanced JWT Validation Interceptor

#### `EnhancedJwtValidationInterceptor`
**Location**: `src/auth/interceptors/enhanced-jwt-validation.interceptor.ts`

**Features**:
- **Request/Response Logging**: Comprehensive logging with user context
- **Performance Monitoring**: Tracks request duration and slow queries
- **Security Event Monitoring**: Logs security-related errors and incidents
- **User Activity Tracking**: Monitors high-privilege user activities
- **Anomaly Detection**: Identifies unusual access patterns
- **API Usage Analytics**: Tracks endpoint usage and error patterns

**Automatic Monitoring**:
- Slow requests (>5 seconds)
- High-privilege user activities
- Security-related errors (401, 403)
- Unusual user agents (bots, crawlers)
- Potential privilege escalation attempts
- API error patterns

### 3. Custom Validation Decorators

#### `@IsSafeString()`
Validates that strings don't contain XSS or injection payloads:
- Script tags, JavaScript URLs
- VBScript, event handlers
- Iframe, object, embed tags
- Form tags and dangerous attributes

#### `@IsStringLength(min, max)`
Validates string length with custom min/max values.

#### `@IsNumericStringInRange(min, max)`
Validates numeric strings within specified ranges.

#### `@IsYouTubeUrl()`
Validates YouTube URL formats:
- youtube.com/watch?v=
- youtu.be/
- Various YouTube URL patterns

#### `@IsMeetingUrl()`
Validates meeting platform URLs:
- Zoom, Teams, Google Meet
- WebEx, GoToMeeting
- Custom meeting platforms

#### `@IsFutureDate()`
Validates that dates are in the future.

#### `@IsAfterStartTime(property)`
Validates that end time is after start time.

#### `@IsValidFileSize(maxSizeMB)`
Validates file upload size limits.

#### `@IsAllowedFileType(allowedTypes)`
Validates allowed MIME types for file uploads.

## Security Features

### Rate Limiting
- **Per User/IP**: 60 requests per minute
- **Automatic Reset**: 1-minute sliding window
- **Blocking**: Returns 429 Too Many Requests

### Suspicious Activity Detection
- **Bot Detection**: Identifies crawlers, scrapers, automated tools
- **Unusual Patterns**: Detects DELETE requests from non-admins
- **Old Tokens**: Warns about tokens older than 24 hours
- **Missing Referers**: Flags requests without referer headers

### Security Incident Logging
- **Structured Logging**: JSON format for security incidents
- **Context Preservation**: User, IP, endpoint, error details
- **Real-time Monitoring**: Immediate alerts for security events

### Organization Access Validation
- **Format Validation**: Ensures orgAccess follows ["A4", "M5"] pattern
- **Privilege Checks**: Validates admin/moderator access
- **Escalation Detection**: Monitors for privilege escalation attempts

## Implementation

### Controllers
Both Cause and Lecture controllers have been updated:

```typescript
@Controller('causes')
@UseInterceptors(SecurityHeadersInterceptor, EnhancedJwtValidationInterceptor)
export class CauseController {
  
  @UseGuards(EnhancedOptionalJwtAuthGuard)
  @Get()
  async getCauses(@GetUser() user?: EnhancedJwtPayload) {
    // Enhanced validation and monitoring automatically applied
  }
}
```

### Configuration
Global validation pipe configuration in `main.ts`:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

## Monitoring and Logging

### Log Categories
- **🔐 Authenticated Requests**: User context and endpoint access
- **🌐 Anonymous Requests**: Public endpoint access
- **✅ Successful Responses**: Status codes, duration, user info
- **❌ Error Responses**: Detailed error context and user info
- **🚨 Security Incidents**: Structured security event logging
- **⚠️ Warnings**: Unusual activity, old tokens, suspicious patterns
- **📊 Metrics**: Performance metrics and usage statistics

### Security Alerts
- **🚨 POTENTIAL PRIVILEGE ESCALATION**: Admin endpoint access attempts
- **🔒 HIGH-PRIVILEGE ACCESS**: Admin/President user activities
- **🤖 Suspicious user agent detected**: Bot/crawler detection
- **🕐 OLD TOKEN WARNING**: Tokens older than 24 hours
- **🚨 NO REFERER**: Requests without referer headers
- **🐌 SLOW REQUEST**: Requests taking >5 seconds

## Usage Examples

### Protected Endpoint with Validation
```typescript
@Post()
@UseGuards(EnhancedJwtAuthGuard)
@RequireOrganizationAdmin()
async createCause(
  @Body() createCauseDto: EnhancedCreateCauseDto,
  @GetUser() user: EnhancedJwtPayload
) {
  // Enhanced validation, security checks, and monitoring
  // User is guaranteed to be authenticated and authorized
}
```

### Public Endpoint with Optional Auth
```typescript
@Get()
@UseGuards(EnhancedOptionalJwtAuthGuard)
async getCauses(
  @Query() queryDto: EnhancedCauseQueryDto,
  @GetUser() user?: EnhancedJwtPayload
) {
  // Enhanced monitoring and validation
  // User context available if authenticated
}
```

## Benefits

1. **Enhanced Security**: Comprehensive validation and monitoring
2. **Real-time Monitoring**: Immediate visibility into API usage and security events
3. **Performance Insights**: Request duration and performance metrics
4. **Anomaly Detection**: Automatic identification of suspicious activities
5. **Audit Trail**: Detailed logs for security and compliance
6. **Rate Limiting**: Protection against abuse and DoS attacks
7. **Flexible Validation**: Custom validators for business-specific requirements

## Compatibility

- **Backward Compatible**: Works with existing JWT tokens
- **Graceful Degradation**: Enhanced features don't break existing functionality
- **Optional Features**: Enhanced validation can be enabled/disabled per endpoint
- **Performance Optimized**: Minimal overhead while providing comprehensive monitoring

This enhanced JWT validation system provides enterprise-grade security and monitoring capabilities while maintaining the flexibility and performance required for a modern API.