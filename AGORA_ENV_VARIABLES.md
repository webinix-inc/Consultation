# Agora Environment Variables Reference

## 📝 Backend Environment Variables

Add these to your `backend/.env` file:

```env
# ============================================
# Agora Video Calling Configuration
# ============================================

# Your Agora App ID (found in Agora Console > Project Management)
AGORA_APP_ID=your_app_id_here

# Your Agora App Certificate (found in Agora Console > Project Management > Edit)
AGORA_APP_CERTIFICATE=your_app_certificate_here

# Cloud Recording Customer ID (found in Agora Console > Products & Services > Cloud Recording)
AGORA_CUSTOMER_ID=your_customer_id_here

# Cloud Recording Customer Secret (found in Agora Console > Products & Services > Cloud Recording)
AGORA_CUSTOMER_SECRET=your_customer_secret_here
```

## 🎨 Frontend Environment Variables

Add these to your `Consultant/.env` file (or `Consultation_Admin/.env` if using admin panel):

```env
# ============================================
# Agora Video Calling Configuration
# ============================================

# Your Agora App ID (same as backend, but uses VITE_ prefix for Vite)
VITE_AGORA_APP_ID=your_app_id_here
```

## 📋 Summary

| Variable | Location | Required | Purpose |
|----------|----------|----------|---------|
| `AGORA_APP_ID` | Backend `.env` | ✅ Yes | App ID for token generation |
| `AGORA_APP_CERTIFICATE` | Backend `.env` | ✅ Yes | App Certificate for token generation |
| `AGORA_CUSTOMER_ID` | Backend `.env` | ⚠️ Optional* | Cloud Recording authentication |
| `AGORA_CUSTOMER_SECRET` | Backend `.env` | ⚠️ Optional* | Cloud Recording authentication |
| `VITE_AGORA_APP_ID` | Frontend `.env` | ✅ Yes | App ID for frontend SDK |

*Cloud Recording credentials are optional if you don't plan to use recording features. However, recording is a key feature, so it's recommended to add them.

## 🔍 Where to Find These Values

### 1. App ID & App Certificate

1. Go to [Agora Console](https://console.agora.io/)
2. Log in to your account
3. Navigate to **Project Management** → **Project List**
4. Click on your project (or create a new one)
5. You'll see **App ID** displayed
6. Click **Edit** or **Config** to view/copy **Primary Certificate** or **App Certificate**

### 2. Customer ID & Customer Secret (for Cloud Recording)

1. In Agora Console, go to **Products & Services** → **Cloud Recording**
2. Navigate to **RESTful API** section
3. You'll find:
   - **Customer ID** - Your customer ID for REST API authentication
   - **Customer Secret** - Your customer secret (keep this secure!)

## ⚠️ Important Notes

1. **Never commit `.env` files to version control** - They're already in `.gitignore`
2. **Use different credentials for development and production**
3. **Keep App Certificate and Customer Secret secure** - Never expose them in frontend code
4. **App ID can be public** - It's safe to use in frontend code
5. **Restart your servers** after adding environment variables

## 🚀 After Adding Variables

### Backend
```bash
cd backend
# Restart your server
npm run dev
# or
npm start
```

### Frontend
```bash
cd Consultant
# Restart your dev server
npm run dev
```

## 🧪 Testing

After adding the variables, you can test if they're loaded correctly:

### Backend Test
The server should start without errors. Check logs for:
- ✅ No "Agora credentials not configured" errors
- ✅ Server starts successfully

### Frontend Test
The `AGORA_APP_ID` should be accessible via:
```typescript
import { AGORA_APP_ID } from '@/constants/appConstants';
console.log('Agora App ID:', AGORA_APP_ID);
```

## 📞 Support

If you encounter issues:
1. Verify all variables are spelled correctly
2. Check for extra spaces or quotes
3. Ensure variables are in the correct `.env` file (backend vs frontend)
4. Restart your development servers

