# 🚀 Cloud Run Deployment Script

# Configuration
$PROJECT_ID = "earnest-radio-475808-j8"
$REGION = "us-central1"
$SERVICE_NAME = "organizations-service"
$IMAGE_NAME = "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

Write-Host "🔧 Starting deployment process..." -ForegroundColor Cyan

# Step 1: Ensure Docker is running
Write-Host "`n📦 Step 1: Checking Docker..." -ForegroundColor Yellow
docker version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Step 2: Build the Docker image
Write-Host "`n🏗️  Step 2: Building Docker image..." -ForegroundColor Yellow
docker build -t $IMAGE_NAME .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker image built successfully!" -ForegroundColor Green

# Step 3: Configure Docker for GCR
Write-Host "`n🔐 Step 3: Configuring Docker for Google Container Registry..." -ForegroundColor Yellow
gcloud auth configure-docker
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker configuration failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Push to Google Container Registry
Write-Host "`n📤 Step 4: Pushing image to Google Container Registry..." -ForegroundColor Yellow
docker push $IMAGE_NAME
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Image pushed successfully!" -ForegroundColor Green

# Step 5: Deploy to Cloud Run
Write-Host "`n🚀 Step 5: Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --port 8080 `
    --timeout 300 `
    --memory 1Gi `
    --cpu 1 `
    --max-instances 10 `
    --min-instances 0 `
    --set-env-vars "NODE_ENV=production" `
    --set-env-vars "PORT=8080" `
    --set-env-vars "DATABASE_URL=mysql://root:Skaveesha1355660%40@34.29.9.105:3306/suraksha-lms-db?connection_limit=10&pool_timeout=120&connect_timeout=120&sslmode=disable" `
    --set-env-vars "STORAGE_PROVIDER=google" `
    --set-env-vars "GCS_BUCKET_NAME=suraksha-lms" `
    --set-env-vars "GCS_PROJECT_ID=earnest-radio-475808-j8" `
    --set-env-vars "JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024" `
    --set-env-vars "JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-this-in-production-2024" `
    --set-env-vars "OM_TOKEN=v9Jz3Xq7Lk2p8Yt5Wm1r4Bv6Qe9Tn0HsXc3Zg7Ua5Md2Rf8KjLq6Np1YwVb4Ez7C" `
    --set-env-vars "BCRYPT_SALT_ROUNDS=12" `
    --set-env-vars "SWAGGER_ENABLED=false" `
    --set-env-vars "GCS_CLIENT_EMAIL=suraksha-lms-bucket@earnest-radio-475808-j8.iam.gserviceaccount.com" `
    --set-env-vars "GCS_CLIENT_ID=103372710019303262911"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cloud Run deployment failed!" -ForegroundColor Red
    exit 1
}

# Step 6: Set GCS Private Key (as a separate command due to special characters)
Write-Host "`n🔑 Step 6: Setting GCS Private Key..." -ForegroundColor Yellow
$GCS_PRIVATE_KEY = @"
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQClJL5BKfLef2l+
270+cAIv+1kgfxtGb+F07m9MYdFJQFi6DRe7NQD6tyGAQYy81Tv/bQ8WLq5yipvw
puJL26zzbkqWaCZIS40chLpl7KrtgvhBVzbnklf+HqBg3IehPUTwyEPZdQSvjn00
xEHfTsD5dFJYia5hX2ZPJSNKq1Cl+FHa156GAHR5Cj6t+2HJmRTqUI20gNQmciPm
0Ori3RkJ9SdZg3W4ROXB7qZqMy7iepwixDOgCMJXXyJJhoBvz5QV6m/2AojvMBh3
82Cs1OITk3nbw/s9HyUcsOve8kJgRBjclNUI+Qk8NV+Z01GjGQwau9+/G8GNGHvt
aI4lzP/LAgMBAAECggEASsTf/tDnTSWStgT3IZXE58R9DeF+j92HzlFFwudmwiuI
AHR9Eh1lXB4d5NvIxJYmm/bcpcZs5R8si0CDpKTJIU4GJyLwcjsCoK7XVd5ZZT+u
9qZuDVqMzFlBc5llLvN2iy2gyovYm0OAHKvexyP46vhnb/6mHR/8SkkeOWhnEz0n
2apZYnSt3Jbp2joxsdDZ9OQLVpqol6rewlvTiLSRE1DOswZOT9g4LAlevj5q+mmE
lQsfgUu3MyNeQzvrg/h4QSzLMu3ypSnmRmRQqT8W4Cio5L32eK4Sb9gRXMyhFz9g
wi+CQZogJc2jrtBLXlfDfeNm9IlH/0LJAuP+VXMFgQKBgQDdzcMtJCV0m1QKK0Ci
9t/4K4S7Yt37XA7LcJIJ5o/D+zdiFlOKl7On8+vrbxspBm+GtVvS0pnoZYMTx86f
gh9ZocogVkNpZwS5NoA7qaLkuSZ4Somnq8Z9UaTHXoKssSujbds3PtrRPthsWw1r
7oXv+XS5CdkaKci4BiC9lOi5owKBgQC+mrFNT8nhJADUoVcLeKDab3BdycAeabp2
yUGFFEBo782ydKHccQ8RLiTfOGjEa5GdaWgzatfCaxuc+o5FAqLwli3e2HjhYsop
EkkwE7GKO3BytzMNLYCXhajPfpbx7pdR34DpW7cV9nrkgVgidLPyvMre/tXEpfZP
sQ49icVTuQKBgQDAx3MpC+6mD88WW4t9WLdHWoOt3ntzWgrd1USI6GTyAKmdTixk
HAAhLQdTBKmFmbtbSMu7TCJK89feXF6BErauz8j/HBrRRKG9XNpNgN48j5QZHyfP
nKQTDd/7DHDlKcP08qmCtdW34jh2zRi4Q4MUFSvXG/EfJUv4bhMM050GowKBgCWG
wVeuWNnZw8wZQ9D/W/QFssLUYN3cBRk0AJFZ7mB6ri3vZprHK6c/RYUpTv81CoNK
aHiPFZGyksoyTmZp4XiqqLdSOWJul8zES+KKTg8gKsB7LzLt/X5Xk2fezYsuZV56
OaA4LXDGiWWJzbdi8Lbe0rZax+2imz8PZfVZtZ8JAoGAayKwKvSPaBqP/JMx+QrQ
S0okoHoLFUj2LrmrEYPWcNrSuCvNbyVvEmp7GkiQ6tAHx8xrlfzYLYYbA0sYJXDv
c7LIzZv3mSHivU43AXcSqKe6aBl9MKGNbNSr6BzwpdIc75n5gzGRXPIq+9pf7R+H
1VSGwHwdZXG68F1GSBE1YLA=
-----END PRIVATE KEY-----
"@

gcloud run services update $SERVICE_NAME `
    --region $REGION `
    --update-env-vars "GCS_PRIVATE_KEY=$GCS_PRIVATE_KEY"

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Failed to set GCS_PRIVATE_KEY. You may need to set this manually." -ForegroundColor Yellow
}

Write-Host "`n✅ Deployment completed successfully!" -ForegroundColor Green

# Step 7: Get service URL
Write-Host "`n🌐 Step 7: Getting service URL..." -ForegroundColor Yellow
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"
Write-Host "`n🎉 Your service is now running at: $SERVICE_URL" -ForegroundColor Green

# Step 8: Test the deployment
Write-Host "`n🧪 Step 8: Testing the deployment..." -ForegroundColor Yellow
Write-Host "Testing health endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$SERVICE_URL/organization/api/v1/health" -Method Get -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Health check failed. Check logs with: gcloud run services logs read $SERVICE_NAME --region $REGION --limit=50" -ForegroundColor Yellow
}

Write-Host "`n📋 Useful commands:" -ForegroundColor Cyan
Write-Host "View logs: gcloud run services logs read $SERVICE_NAME --region $REGION --limit=50" -ForegroundColor Gray
Write-Host "View logs (live): gcloud run services logs tail $SERVICE_NAME --region $REGION" -ForegroundColor Gray
Write-Host "Service details: gcloud run services describe $SERVICE_NAME --region $REGION" -ForegroundColor Gray
Write-Host "`nAPI Base URL: $SERVICE_URL/organization/api/v1" -ForegroundColor Green
