# AWS S3 Setup Guide

This guide explains how to configure AWS S3 for file storage in the Consultation application.

## Prerequisites

1. AWS Account
2. AWS S3 Bucket created
3. IAM User with S3 permissions

## Step 1: Create S3 Bucket

1. Log in to AWS Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `consultation-app-files`)
5. Select your preferred region (e.g., `us-east-1`)
6. Configure bucket settings:
   - **Block Public Access**: Uncheck "Block all public access" (or configure bucket policy for public read)
   - **Bucket Versioning**: Optional (recommended for production)
   - **Encryption**: Optional but recommended
7. Click "Create bucket"

## Step 2: Configure Bucket Policy (for Public Read Access)

If you want files to be publicly accessible, add this bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

## Step 3: Create IAM User

1. Navigate to IAM service in AWS Console
2. Click "Users" → "Create user"
3. Enter username (e.g., `consultation-s3-user`)
4. Select "Attach policies directly"
5. Attach policy: `AmazonS3FullAccess` (or create a custom policy with minimal permissions)
6. Click "Create user"
7. **Important**: Save the Access Key ID and Secret Access Key

## Step 4: Configure Environment Variables

Add the following variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
```

## Step 5: Install Dependencies

The required packages are already added to `package.json`. Run:

```bash
npm install
```

## File Organization Structure

Files are organized in S3 with the following structure:

```
bucket-name/
├── users/
│   ├── {userId}/
│   │   ├── images/
│   │   │   └── {unique-filename}.jpg
│   │   └── documents/
│   │       └── {unique-filename}.pdf
```

## API Endpoints

### Upload Profile Image
```
POST /api/v1/upload/image
Content-Type: multipart/form-data
Body: { image: File }
```

### Upload Document
```
POST /api/v1/upload/document
Content-Type: multipart/form-data
Body: { document: File }
```

### Create Document Record
```
POST /api/v1/documents
Body: {
  title: string,
  type: string,
  fileUrl: string,
  fileKey: string,
  client: ObjectId,
  consultant: ObjectId,
  ...
}
```

## Security Considerations

1. **Access Control**: Files are organized by user ID, and users can only access their own files
2. **File Validation**: Only allowed file types are accepted (images: JPEG, PNG, GIF, WebP; documents: PDF, DOC, DOCX, TXT)
3. **File Size Limits**: 
   - Images: 5MB max
   - Documents: 10MB max
4. **Authentication**: All upload endpoints require authentication

## Testing

1. Start your backend server
2. Use Postman or similar tool to test upload endpoints
3. Verify files appear in your S3 bucket under the correct user folder

## Troubleshooting

### Error: "Access Denied"
- Check IAM user permissions
- Verify bucket policy allows public read (if needed)
- Check CORS configuration on S3 bucket

### Error: "Bucket not found"
- Verify bucket name in `.env` matches actual bucket name
- Check AWS region is correct

### Files not accessible
- Verify bucket policy allows public read
- Check file URL format matches S3 URL structure
- Verify CORS is configured if accessing from frontend

## CORS Configuration (if accessing from frontend)

Add CORS configuration to your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173", "https://your-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

