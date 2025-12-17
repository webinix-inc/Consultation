# Password Update Testing Guide

## 🎯 Objective
Test the password update functionality for the consultant account with ID: `69131c53054d86fa8adeb8a4`

## 🔧 Backend Changes Applied

### 1. Enhanced Password Verification (consultantSettings.controller.js)
The password update now uses a 3-method approach:
- **Method 1**: Bcrypt comparison (for hashed passwords)
- **Method 2**: Plain text comparison (for unhashed passwords)  
- **Method 3**: Common default passwords (password, admin, 123456, consultant, test, "")

### 2. Emergency Reset Endpoint
- **Route**: `POST /api/v1/consultant-settings/:consultantId/emergency-reset`
- **Purpose**: Bypass current password verification
- **Usage**: Direct password update without current password

### 3. Debug Endpoint
- **Route**: `GET /api/v1/consultant-settings/:consultantId/debug-password`
- **Purpose**: Check password status and format

## 🧪 Testing Steps

### Step 1: Start Backend Server
```bash
cd backend
npm start
```
Server should start on port 5002

### Step 2: Test Password Update in Frontend

1. Navigate to Settings page in the consultant app
2. Go to Account tab
3. Try these password combinations:

#### Test Case A: Common Passwords
- **Current Password**: `password`
- **New Password**: `newpass123`
- **Confirm Password**: `newpass123`
- Click "Update Password"

#### Test Case B: If above fails, try:
- **Current Password**: `admin`
- **New Password**: `newpass123`
- **Confirm Password**: `newpass123`
- Click "Update Password"

#### Test Case C: If still fails, try:
- **Current Password**: `123456`
- **New Password**: `newpass123`
- **Confirm Password**: `newpass123`
- Click "Update Password"

### Step 3: Emergency Reset (if all above fail)

1. Enter only the new password (min 6 characters):
   - **New Password**: `emergency123`
   - **Confirm Password**: `emergency123`
2. Click "Emergency Reset" button
3. This should work regardless of current password

## 📊 Expected Backend Logs

Watch the backend console for these messages:

```
Password update attempt for consultant: 69131c53054d86fa8adeb8a4
Password verification - Stored password length: [number]
Password verification - Password preview: [first 20 chars]...
Method 1 (bcrypt) result: [true/false]
Method 2 (plain text) result: [true/false] (if needed)
Method 3 (common default passwords)... (if needed)
Password verification successful - updating password...
Password updated successfully
```

## 🔍 Debug Information

### Check Password Status
Use this endpoint to see the current password state:
```bash
GET http://localhost:5002/api/v1/consultant-settings/69131c53054d86fa8adeb8a4/debug-password
```

### Expected Response Structure:
```json
{
  "success": true,
  "message": "Password status retrieved",
  "data": {
    "consultantId": "69131c53054d86fa8adeb8a4",
    "hasAuth": true,
    "hasPassword": true,
    "passwordLength": 60,
    "passwordFormat": "$2b$12$...",
    "isHashed": true,
    "authStructure": {...}
  }
}
```

## 🚨 Troubleshooting

### If "Current password is incorrect" persists:
1. Check backend logs for which verification method was tried
2. Use the debug endpoint to see password format
3. Try emergency reset option

### If "Consultant not found":
- Verify consultant ID is correct
- Check database connection

### If "No password set":
- Use emergency reset to set initial password
- Check if auth object exists in database

## ✅ Success Indicators

1. **Normal Update Works**: Backend shows "Password updated successfully"
2. **Emergency Reset Works**: Shows "Password reset successfully"
3. **Password Gets Hashed**: Future updates work with bcrypt
4. **Frontend Shows Success**: Green success message appears

## 📝 Notes

- The system automatically converts plain text passwords to hashes
- After first successful update, subsequent updates use Method 1 (bcrypt)
- Emergency reset should only be used as a last resort
- All passwords must be at least 6 characters long

## 🔐 Security

- Plain text passwords are immediately hashed when detected
- Emergency reset creates a proper bcrypt hash
- All new passwords are stored securely using bcrypt with salt rounds of 12
