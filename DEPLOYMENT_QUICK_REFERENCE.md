# Render Deployment - Quick Reference Card

## 🚀 Quick Deploy Steps

### 1. MongoDB Atlas (5 minutes)
```
1. Create account at mongodb.com/cloud/atlas
2. Create FREE cluster
3. Create database user (save password!)
4. Whitelist IP: 0.0.0.0/0
5. Get connection string
```

**Connection String Format:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/daily-activity-tracker?retryWrites=true&w=majority
```

---

### 2. Push to GitHub (2 minutes)
```bash
git init
git add .
git commit -m "Deploy to Render"
git remote add origin https://github.com/YOUR_USERNAME/daily-activity-tracker.git
git push -u origin main
```

---

### 3. Render Setup (5 minutes)

**Create Web Service:**
- Runtime: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Instance: Free

**Environment Variables:**
```
NODE_ENV=production
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<random-32-char-string>
JWT_EXPIRE=7d
PORT=5000
CLIENT_URL=https://your-app-name.onrender.com
```

---

### 4. Initialize Database (2 minutes)

In Render Shell:
```bash
node scripts/setup-fresh-application.js
```

---

### 5. Login & Test
```
URL: https://your-app-name.onrender.com
Username: md1
Password: Admin@123
```

---

## 🔧 Generate JWT Secret

**Windows PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Or use this example:**
```
aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1pQ3rS5
```

---

## 📝 Important URLs

- **Render Dashboard:** https://dashboard.render.com
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Your App:** https://your-app-name.onrender.com

---

## ⚠️ Common Issues

**Build Failed:**
- Check Render logs
- Verify package.json scripts

**MongoDB Connection Failed:**
- Check connection string
- Verify IP whitelist (0.0.0.0/0)
- URL encode special characters in password

**App Loads but Errors:**
- Check environment variables
- View Render logs
- Check browser console

---

## 🔄 Update Deployment

```bash
git add .
git commit -m "Update message"
git push
```
Render auto-deploys!

---

## 📊 Free Tier Limits

**Render:**
- 750 hours/month
- Sleeps after 15 min inactivity
- 512 MB RAM

**MongoDB Atlas:**
- 512 MB storage
- Shared resources

---

## 🎯 Default Credentials

After running setup script:

**MD1:**
- Username: `md1`
- Email: `md1@yantrik.com`
- Password: `Admin@123`

**MD2:**
- Username: `md2`
- Email: `md2@yantrik.com`
- Password: `Admin@123`

---

## ✅ Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user & password saved
- [ ] IP whitelist: 0.0.0.0/0
- [ ] Connection string copied
- [ ] Code pushed to GitHub
- [ ] Render web service created
- [ ] All environment variables set
- [ ] Build successful
- [ ] Database initialized
- [ ] Login tested
- [ ] Features working

---

**Total Time: ~15 minutes** ⏱️
