# S3 File Storage Implementation Summary

## Overview
AWS S3 has been integrated into the Consultation application for storing all images and documents. Files are organized in dedicated user folders for better management and security.

## What Was Implemented

### 1. S3 Service (`src/services/s3.service.js`)
- **uploadFile()**: Uploads files to S3 with user-specific folder structure
- **deleteFile()**: Deletes files from S3
- **getPresignedUrl()**: Generates temporary URLs for private file access
- **extractKeyFromUrl()**: Extracts S3 key from file URL
- **getUserFolder()**: Generates folder paths like `users/{userId}/images` or `users/{userId}/documents`

### 2. Upload Middleware (`src/middlewares/upload.middleware.js`)
- **uploadImage**: Multer middleware for image uploads (5MB limit)
- **uploadDocument**: Multer middleware for document uploads (10MB limit)
- **uploadToS3**: Middleware that uploads files to S3 after multer processes them
- **uploadMultipleToS3**: Handles multiple file uploads

### 3. File Upload Controller (`src/api/v1/controllers/fileUpload.controller.js`)
- `POST /api/v1/upload/image` - Upload profile image
- `POST /api/v1/upload/document` - Upload document
- `POST /api/v1/upload/multiple` - Upload multiple files
- `DELETE /api/v1/upload/:key` - Delete file from S3

### 4. Document Management API
- **Model**: `src/models/document.model.js`
- **Controller**: `src/api/v1/controllers/document.controller.js`
- **Routes**: `src/api/v1/routes/document.routes.js`
- **Validators**: `src/api/v1/validators/document.validator.js`

**Endpoints:**
- `GET /api/v1/documents` - List documents (with filters)
- `GET /api/v1/documents/:id` - Get single document
- `POST /api/v1/documents` - Create document record
- `PATCH /api/v1/documents/:id` - Update document
- `DELETE /api/v1/documents/:id` - Delete document (and file from S3)
- `GET /api/v1/documents/types` - Get document types

### 5. Updated Controllers
- **Consultant Controller**: Now handles image uploads via S3
- **Client Controller**: Now handles avatar uploads via S3

## File Organization Structure

```
S3 Bucket/
├── users/
│   ├── {userId1}/
│   │   ├── images/
│   │   │   ├── {uuid}.jpg
│   │   │   └── {uuid}.png
│   │   └── documents/
│   │       ├── {uuid}.pdf
│   │       └── {uuid}.docx
│   ├── {userId2}/
│   │   ├── images/
│   │   └── documents/
```

## Environment Variables Required

Add these to your `.env` file:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

## API Usage Examples

### Upload Profile Image
```javascript
const formData = new FormData();
formData.append('image', file);

fetch('/api/v1/upload/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Upload Document
```javascript
const formData = new FormData();
formData.append('document', file);

const uploadRes = await fetch('/api/v1/upload/document', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { data } = await uploadRes.json();

// Then create document record
await fetch('/api/v1/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Medical Report',
    type: 'Medical Report',
    fileUrl: data.url,
    fileKey: data.key,
    fileName: data.fileName,
    originalFileName: data.fileName,
    fileSize: data.size,
    mimeType: data.mimeType,
    client: clientId,
    consultant: consultantId
  })
});
```

### Update Consultant with Image
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('name', 'Dr. John Doe');
formData.append('category', 'Health');

fetch('/api/v1/consultants/:id', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

## Security Features

1. **User Isolation**: Files are stored in user-specific folders
2. **Authentication Required**: All upload endpoints require authentication
3. **File Type Validation**: Only allowed file types are accepted
4. **File Size Limits**: Images (5MB), Documents (10MB)
5. **Authorization Checks**: Users can only access/delete their own files

## Dependencies Added

- `@aws-sdk/client-s3`: AWS SDK v3 for S3 operations
- `@aws-sdk/s3-request-presigner`: For generating presigned URLs
- `multer`: For handling multipart/form-data file uploads
- `uuid`: For generating unique file names

## Next Steps

1. **Install Dependencies**: Run `npm install` in the backend directory
2. **Configure AWS**: Set up S3 bucket and add credentials to `.env`
3. **Test Uploads**: Use Postman or frontend to test file uploads
4. **Update Frontend**: Integrate upload endpoints in frontend components

## Notes

- Files are automatically deleted from S3 when documents are deleted
- Old images are automatically deleted when new ones are uploaded
- All file URLs are stored in the database for easy access
- Files are publicly accessible (configure bucket policy accordingly)

