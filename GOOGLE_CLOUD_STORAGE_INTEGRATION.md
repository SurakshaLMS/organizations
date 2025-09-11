# Google Cloud Storage Integration

This project now uses Google Cloud Storage instead of AWS S3 for file uploads, specifically for organization images.

## Features

- **Image Upload**: Upload organization images during creation and updates
- **Automatic Validation**: Validates image type, size, and format
- **Image Management**: Automatic deletion of old images when updating
- **Public URLs**: Generated public URLs for easy access
- **Error Handling**: Comprehensive error handling for upload failures

## Configuration

Add the following environment variables to your `.env` file:

```env
# Google Cloud Storage Configuration
GCS_PROJECT_ID=sacred-alloy-468619-s5
GCS_BUCKET_NAME=laas-file-storage
GCS_PRIVATE_KEY_ID=5dbc6adf2a2c241fdbbcc74941642952883080c1
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCS_CLIENT_EMAIL=cloudestoage@sacred-alloy-468619-s5.iam.gserviceaccount.com
GCS_CLIENT_ID=105093119287617070968
```

## API Endpoints

### Create Organization with Image

```http
POST /organization/api/v1/organizations
Content-Type: multipart/form-data
Authorization: Bearer <OM_TOKEN_OR_JWT>

Body:
- name: "Organization Name"
- type: "INSTITUTE"
- isPublic: true
- image: [file]
```

### Update Organization with Image

```http
PUT /organization/api/v1/organizations/:id
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>

Body:
- name: "Updated Name"
- image: [file]
```

## Supported Image Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **GIF** (.gif)
- **WebP** (.webp)
- **SVG** (.svg)

## Size Limits

- **Maximum file size**: 10MB
- **Automatic validation**: Files exceeding the limit will be rejected

## Storage Structure

Images are stored in the following structure:
```
laas-file-storage/
└── organization-images/
    ├── {uuid}.jpg
    ├── {uuid}.png
    └── ...
```

## Usage Examples

### Create Organization with Image (cURL)

```bash
curl -X POST "http://localhost:3001/organization/api/v1/organizations" \
  -H "Authorization: Bearer <OM_TOKEN>" \
  -F "name=Tech Club" \
  -F "type=INSTITUTE" \
  -F "isPublic=true" \
  -F "image=@organization-logo.jpg"
```

### Update Organization with Image (PowerShell)

```powershell
$headers = @{
    "Authorization" = "Bearer <JWT_TOKEN>"
}

$body = @{
    "name" = "Updated Organization Name"
}

$file = Get-Item "path/to/new-image.jpg"

Invoke-RestMethod -Uri "http://localhost:3001/organization/api/v1/organizations/123" `
    -Method PUT `
    -Headers $headers `
    -Form @{
        name = "Updated Organization Name"
        image = $file
    }
```

## Error Handling

The API provides detailed error messages for:

- **Invalid file types**: Only image files are accepted
- **File size exceeded**: Files over 10MB are rejected
- **Upload failures**: Network or storage issues
- **Authentication errors**: Invalid tokens or permissions

## Service Classes

### GCSImageService

Main service for handling image operations:

- `uploadImage(file, folder)` - Upload new image
- `deleteImage(key)` - Delete image by key
- `updateOrganizationImage(file, oldImageUrl)` - Replace existing image
- `validateImageFile(file)` - Validate image format and size

### S3Service (Updated)

Legacy service updated to use Google Cloud Storage:

- Maintains the same interface for backward compatibility
- Now uses Google Cloud Storage instead of AWS S3
- Supports all previous functionality

## Dependencies

```json
{
  "@google-cloud/storage": "^7.7.0",
  "multer": "^1.4.5-lts.1",
  "@types/multer": "^1.4.11"
}
```

## Security

- Service account authentication using private keys
- Public read access for uploaded images
- Automatic cleanup of old images during updates
- Validation of file types and sizes

## Troubleshooting

### Common Issues

1. **"OM_TOKEN not configured"**
   - Ensure `GCS_PRIVATE_KEY` is properly set in environment
   - Check that the private key includes proper line breaks

2. **"Image upload failed"**
   - Verify Google Cloud Storage bucket permissions
   - Check service account has write access to the bucket

3. **"Invalid image file"**
   - Ensure file is a supported image format
   - Check file size is under 10MB

### Debug Logging

The service includes comprehensive logging:
- Upload success/failure
- Image validation results
- GCS bucket operations
- Error details with stack traces
