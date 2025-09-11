# Testing Google Cloud Storage Image Upload

## Quick Test Guide

### 1. Using Swagger UI (Recommended)
1. Open: http://localhost:3001/api/docs
2. Navigate to "Organization" endpoints
3. Find "POST /organizations" endpoint
4. Click "Try it out"
5. Set Authorization header with OM token
6. Fill form data:
   - name: "Test GCS Organization"
   - description: "Testing Google Cloud Storage integration"
   - image: [Upload a JPG/PNG file]
7. Execute the request

### 2. Using cURL Command
```bash
# Replace [YOUR_OM_TOKEN] with actual token
# Replace /path/to/image.jpg with actual image path
curl -X POST http://localhost:3001/organization/api/v1/organizations \
  -H "Authorization: Bearer [YOUR_OM_TOKEN]" \
  -F "name=GCS Test Organization" \
  -F "description=Testing image upload to Google Cloud Storage" \
  -F "image=@/path/to/image.jpg"
```

### 3. Using Postman
1. Method: POST
2. URL: http://localhost:3001/organization/api/v1/organizations
3. Headers: Authorization: Bearer [YOUR_OM_TOKEN]
4. Body: form-data
   - name: GCS Test Organization
   - description: Testing image upload
   - image: [Select file]

## Expected Response
```json
{
  "message": "Organization created successfully",
  "data": {
    "id": "generated_id",
    "name": "GCS Test Organization",
    "description": "Testing image upload",
    "imageUrl": "https://storage.googleapis.com/laas-file-storage/organizations/[filename]",
    // ... other fields
  }
}
```

## Verification Steps
1. Check response contains valid imageUrl
2. Verify image is accessible via the returned URL
3. Check Google Cloud Console > Storage > laas-file-storage bucket
4. Confirm image file is uploaded with proper naming convention

## Test Images Requirements
- Format: JPG, JPEG, PNG, GIF, WebP
- Size: Maximum 5MB
- Dimensions: 100x100px to 2048x2048px

The system is ready for testing! 🚀
