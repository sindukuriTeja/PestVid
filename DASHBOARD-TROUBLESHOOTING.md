# 🔧 Dashboard Troubleshooting Guide

## 🚨 **Issue: Dashboard Not Working**

The Dashboard requires user authentication to access. Here's how to fix and test it:

---

## 🎯 **Quick Fixes Applied**

### **✅ 1. Auto-Login Test User**
- Added automatic test user creation and login
- Test user credentials: `test@pestivid.com` / `test123`
- Auto-logs in if no user is currently logged in

### **✅ 2. Debug Button**
- Added red "Debug Login" button in navigation
- Click it to manually login the test user
- Useful for testing authentication

### **✅ 3. Better Error Messages**
- Dashboard now shows registration modal instead of login
- Clear notification when authentication is required

### **✅ 4. Console Debugging**
- Added console logs to track authentication state
- Check browser console (F12) for debug info

---

## 🔍 **How to Test Dashboard**

### **Method 1: Automatic (Should Work Now)**
1. **Refresh the page** - Test user should auto-login
2. **Click "Dashboard"** - Should work immediately
3. **Check console** - Should see "Test user logged in"

### **Method 2: Manual Debug**
1. **Click the red "Debug Login" button** in navigation
2. **Click "Dashboard"** - Should work now
3. **Check user profile** - Should show "Test Farmer"

### **Method 3: Real Registration**
1. **Click "Register"** button
2. **Fill out the complete form** with real data
3. **Submit** - Should auto-login and redirect to dashboard
4. **Dashboard should work** with your real account

### **Method 4: Real Login**
1. **Register first** (if not done)
2. **Logout** (click logout icon)
3. **Click "Login"** button
4. **Enter credentials** and login
5. **Click "Dashboard"** - Should work

---

## 🛠️ **Troubleshooting Steps**

### **If Dashboard Still Doesn't Work:**

#### **Step 1: Check Browser Console**
1. Press **F12** to open developer tools
2. Go to **Console** tab
3. Look for error messages
4. Should see: "Test user logged in: Test"

#### **Step 2: Check Authentication State**
1. In console, type: `app.isLoggedIn`
2. Should return: `true`
3. Type: `app.currentUser`
4. Should show user object

#### **Step 3: Check Local Storage**
1. Go to **Application** tab in dev tools
2. Click **Local Storage** → your domain
3. Should see:
   - `pestivid_logged_in`: "true"
   - `pestivid_current_user`: user data
   - `pestivid_users`: array of users

#### **Step 4: Manual Reset**
1. In console, type: `localStorage.clear()`
2. **Refresh the page**
3. Should create new test user and auto-login

---

## 🎮 **Dashboard Features to Test**

Once Dashboard is working, test these features:

### **✅ Video Recording**
1. **Click "Start Recording"** button
2. **Allow camera/microphone** access
3. **Record a short video**
4. **Stop recording** and preview

### **✅ Form Fields**
1. **Fill in crop information**
2. **Add location details**
3. **Select purpose** (AgriStream, Sell, Funding)
4. **Add pesticide info** (optional)

### **✅ Upload Process**
1. **Click "Upload Video"** button
2. **Should show loading** indicator
3. **Check for success** notification
4. **Video should appear** in profile

---

## 🔧 **Common Issues & Solutions**

### **Issue: "Please register or login" message**
**Solution:** 
- Click the red "Debug Login" button
- Or register/login properly

### **Issue: Dashboard page is blank**
**Solution:**
- Check browser console for errors
- Refresh the page
- Clear localStorage and try again

### **Issue: Authentication not working**
**Solution:**
- Check if JavaScript is enabled
- Try in different browser
- Clear browser cache

### **Issue: Test user not created**
**Solution:**
- Check browser console for errors
- Manually create user via registration
- Clear localStorage and refresh

---

## 🚀 **Production Cleanup**

### **Before going live, remove:**
1. **Test user creation** in `mounted()` method
2. **Auto-login test user** functionality
3. **Debug login button** from navigation
4. **Console.log statements** for debugging

### **Search and remove these lines:**
```javascript
// Remove these in production:
this.createTestUser();
this.loginTestUser();
console.log('Auth check:', ...);
console.log('Test user created:', ...);
```

---

## 📊 **Expected Behavior**

### **✅ When Working Correctly:**
1. **Page loads** → Test user auto-logs in
2. **Navigation shows** "Test Farmer" profile
3. **Dashboard link** works without errors
4. **Dashboard page** shows recording interface
5. **All features** accessible and functional

### **✅ User Flow:**
```
Page Load → Auto-Login → Dashboard Access → Video Recording → Upload → Success
```

---

## 🆘 **Still Having Issues?**

### **Check These:**
1. **Browser compatibility** - Use Chrome/Firefox/Edge
2. **JavaScript enabled** - Required for Vue.js
3. **Local file access** - Some browsers block local files
4. **Console errors** - Any red error messages
5. **Network issues** - Check internet connection

### **Alternative Solutions:**
1. **Use a local server** instead of file:// protocol
2. **Try different browser** or incognito mode
3. **Disable browser extensions** that might interfere
4. **Check antivirus/firewall** settings

---

## 🎉 **Success Indicators**

When everything works:
- ✅ Dashboard loads without errors
- ✅ User profile shows in navigation
- ✅ Video recording interface appears
- ✅ All form fields are accessible
- ✅ Upload functionality works
- ✅ No console errors

**Your Dashboard should now be fully functional!** 🌱📹✨
