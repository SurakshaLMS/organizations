# 🔄 Organization Access Control Flow Diagram

## User Authentication & Access Flow

```
┌─────────────────┐
│   User Login    │
│  POST /login    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ OrganizationAccess│
│ Service gets user │ 
│ organization data │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│   Generate JWT  │
│  with org access │
│ + isGlobalAdmin │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Return Enhanced │
│ JWT to Client   │
└─────────────────┘
```

## Request Processing Flow

```
┌─────────────────┐
│ Client Request  │
│ with JWT Token  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│  JwtAuthGuard   │
│ Validates Token │
│ + Extracts User │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│OrganizationAccess│
│     Guard       │
│ Checks org access│
└─────────┬───────┘
          │
          ▼
     ┌─YES─────┐         ┌─NO──────┐
     │ Has     │         │ No      │
     │ Access? │────NO───│ Access  │
     └─────┬───┘         │ 403     │
           │YES          └─────────┘
           ▼
┌─────────────────┐
│  Check Role     │
│  Requirements   │
└─────────┬───────┘
          │
          ▼
     ┌─YES─────┐         ┌─NO──────┐
     │ Has     │         │ Wrong   │
     │ Role?   │────NO───│ Role    │
     └─────┬───┘         │ 403     │
           │YES          └─────────┘
           ▼
┌─────────────────┐
│ Execute Method  │
│ Return 200 OK   │
└─────────────────┘
```

## Role-Based Access Decision Tree

```
User Request for Organization Action
                │
                ▼
        ┌──────────────┐
        │ Is Global    │─YES─┐
        │ Admin?       │     │
        └──────┬───────┘     │
               │NO           │
               ▼             │
        ┌──────────────┐     │
        │ Is Member    │─NO──┤
        │ of Org?      │     │
        └──────┬───────┘     │
               │YES          │
               ▼             │
        ┌──────────────┐     │
        │ Check Role   │     │
        │ Requirement  │     │
        └──────┬───────┘     │
               │             │
               ▼             │
    ┌─────────────────┐      │
    │ MEMBER Required │      │
    │ User Role ≥ 1   │      │
    └─────────┬───────┘      │
              │              │
              ▼              │
    ┌─────────────────┐      │
    │ ADMIN Required  │      │
    │ User Role ≥ 3   │      │
    └─────────┬───────┘      │
              │              │
              ▼              │
    ┌─────────────────┐      │
    │PRESIDENT Required│     │
    │ User Role = 4   │      │
    └─────────┬───────┘      │
              │              │
              ▼              ▼
        ┌──────────────┐ ┌──────────────┐
        │ ALLOW ACCESS │ │ ALLOW ACCESS │
        │ Execute      │ │ (Global      │
        │ Method       │ │  Admin)      │
        └──────────────┘ └──────────────┘
```

## Organization Enrollment Flow

```
┌─────────────────┐
│ User Enrolls in │
│ Organization    │
│ POST /enroll    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Create/Update   │
│ Membership      │
│ in Database     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Refresh User's  │
│ JWT Token with  │
│ New Org Access  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Return New JWT  │
│ to Client       │
└─────────────────┘
```

## Error Handling Flow

```
Request Processing
        │
        ▼
┌──────────────┐
│ JWT Valid?   │─NO─┐
└──────┬───────┘    │
       │YES         │
       ▼            │
┌──────────────┐    │
│ Org Member?  │─NO─┤
└──────┬───────┘    │
       │YES         │
       ▼            │
┌──────────────┐    │
│ Has Role?    │─NO─┤
└──────┬───────┘    │
       │YES         │
       ▼            ▼
┌──────────────┐ ┌──────────────┐
│ SUCCESS      │ │ Error        │
│ 200 OK       │ │ Response     │
└──────────────┘ └──────┬───────┘
                        │
                        ▼
                ┌──────────────┐
                │ 401 - No JWT │
                │ 403 - No Org │
                │ 403 - No Role│
                └──────────────┘
```

## Token Lifecycle

```
┌─────────────────┐
│ User Login      │
│ Generate JWT    │
│ (7 days expiry) │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Client Uses     │
│ JWT for API     │
│ Requests        │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Organization    │
│ Change Event    │
│ (Join/Leave)    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Auto Refresh    │
│ JWT Token       │
│ /refresh-token  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Updated JWT     │
│ with New Org    │
│ Access Data     │
└─────────────────┘
```

## Database Query Optimization

```
Traditional Approach (Per Request):
┌─────────────────┐
│ API Request     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Query User      │
│ Memberships     │
│ (Database Hit)  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Check Roles     │
│ (Database Hit)  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Authorize       │
│ Request         │
└─────────────────┘

JWT-Based Approach (Our Implementation):
┌─────────────────┐
│ API Request     │
│ with JWT        │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Decode JWT      │
│ (No DB Query)   │
│ Get Org Access  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Authorize       │
│ Request         │
│ (Instant)       │
└─────────────────┘
```

## Security Layers

```
           ┌─────────────────┐
           │ HTTPS/TLS       │ ← Transport Security
           └─────────┬───────┘
                     │
           ┌─────────────────┐
           │ JWT Signature   │ ← Token Integrity
           │ Verification    │
           └─────────┬───────┘
                     │
           ┌─────────────────┐
           │ Organization    │ ← Membership Control
           │ Membership      │
           └─────────┬───────┘
                     │
           ┌─────────────────┐
           │ Role-Based      │ ← Permission Control
           │ Authorization   │
           └─────────┬───────┘
                     │
           ┌─────────────────┐
           │ Method          │ ← Business Logic
           │ Execution       │
           └─────────────────┘
```

---

**Visual Flow Reference | Organization Service API**  
*Last Updated: July 2025*
