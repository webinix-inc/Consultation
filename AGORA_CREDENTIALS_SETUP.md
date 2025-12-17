# How to Set Up Agora Credentials

## 📝 Step-by-Step Guide

### Step 1: Get Your Credentials from Agora Console

#### 1.1 Get App ID and App Certificate
1. Go to [Agora Console](https://console.agora.io/)
2. Navigate to **Project Management** → **Project List**
3. Click on your project (or create a new one)
4. Copy the **App ID**
5. Click **Edit** or **Config** button
6. Find **Primary Certificate** or **App Certificate** and copy it

#### 1.2 Get Customer ID and Customer Secret (for Cloud Recording)
1. In Agora Console, go to **Developer Toolkit** → **RESTful API**
2. Click **Add a secret** button
3. A Customer ID and Customer Secret will be generated
4. **Important:** Click **Download** to save the `key_and_secret.txt` file
   - ⚠️ You can only download this once! Save it securely.
5. Copy both:
   - **Customer ID** (this is the "key")
   - **Customer Secret** (this is the "secret")

---

### Step 2: Add Credentials to Backend .env File

1. Navigate to your `backend` folder
2. Open or create `.env` file
3. Add these lines (replace with your actual values):

```env
# Agora Video Calling Configuration
AGORA_APP_ID=your_actual_app_id_here
AGORA_APP_CERTIFICATE=your_actual_app_certificate_here

# Agora Cloud Recording REST API Credentials
AGORA_CUSTOMER_ID=your_actual_customer_id_here
AGORA_CUSTOMER_SECRET=your_actual_customer_secret_here
```

**Example (with sample values):**
```env
AGORA_APP_ID=1234567890abcdef1234567890abcdef
AGORA_APP_CERTIFICATE=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
AGORA_CUSTOMER_ID=NDI1OTQ3N2I4MzYy
AGORA_CUSTOMER_SECRET=Y2Q5ZjA3YjYxZTU4NGY2MTAwZjA=
```

**⚠️ Important Notes:**
- **No quotes** around values (unless they're part of the value itself)
- **No spaces** before or after the `=` sign
- **No extra spaces** at the beginning or end of values
- Copy values **exactly** as shown in Agora Console

---

### Step 3: Add App ID to Frontend .env File

1. Navigate to your `Consultant` folder
2. Open or create `.env` file
3. Add this line:

```env
# Agora Video Calling Configuration
VITE_AGORA_APP_ID=your_actual_app_id_here
```

**Note:** This should be the **same App ID** you used in the backend.

---

### Step 4: Test Your Configuration

Run the test script to verify everything is set up correctly:

```bash
cd backend
node test-agora-auth.js
```

This will test:
- ✅ Environment variables are loaded
- ✅ RTC Token generation works
- ✅ REST API authentication works

---

### Step 5: Restart Your Servers

**Backend:**
```bash
cd backend
# Stop current server (Ctrl+C)
npm run dev  # or npm start
```

**Frontend:**
```bash
cd Consultant
# Stop current server (Ctrl+C)
npm run dev
```

---

## 🔍 Verification Checklist

After setup, verify:

- [ ] All 4 backend environment variables are set
- [ ] Frontend `VITE_AGORA_APP_ID` is set
- [ ] No quotes around values in .env files
- [ ] No extra spaces in .env files
- [ ] Test script runs successfully
- [ ] Backend server starts without errors
- [ ] Frontend can access `AGORA_APP_ID` constant

---

## ❌ Common Issues & Solutions

### Issue 1: "Agora credentials not configured"
**Solution:** 
- Check that your `.env` file is in the correct location (`backend/.env`)
- Verify variable names are spelled correctly
- Restart your server after adding variables

### Issue 2: "401 Unauthorized" when calling REST API
**Solution:**
- Verify Customer ID and Customer Secret are correct
- Make sure there are no extra spaces or quotes
- Check that you downloaded and copied the secret correctly (can only download once!)

### Issue 3: "Token generation failed"
**Solution:**
- Verify App ID and App Certificate are correct
- Check for typos or extra spaces
- Ensure App Certificate is the full certificate string

### Issue 4: Frontend can't access AGORA_APP_ID
**Solution:**
- Make sure variable starts with `VITE_` prefix
- Restart the frontend dev server
- Clear browser cache if needed

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** to version control (they're in `.gitignore`)
2. **Use different credentials** for development and production
3. **Store production credentials** securely (use environment variables in your hosting platform)
4. **Keep Customer Secret secure** - it's like a password
5. **Rotate credentials** periodically if compromised

---

## 📞 Need Help?

If you're still having issues:
1. Run the test script: `node backend/test-agora-auth.js`
2. Check the error messages carefully
3. Verify credentials in Agora Console match what's in your .env
4. Check Agora documentation: https://docs.agora.io/

