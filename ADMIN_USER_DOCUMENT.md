# 🔑 Admin User Document for Database Seeding

## ✅ Admin User Successfully Created!

The admin user has been **automatically inserted** into your database. Here are the details:

## 🔑 Login Credentials:

- **Username**: `admin`
- **Password**: `Admin@123`
- **Role**: `it_admin` (IT Admin - Full System Access)
- **Email**: `admin@taskmanagement.com`
- **Name**: `System Administrator`
- **Database ID**: `696c5a0c6b5849d96ba75a32`

## 🎯 Ready to Use:

1. **Open Browser**: Go to http://localhost:3000
2. **Login**: Use `admin` / `Admin@123`
3. **Dashboard**: Will redirect to IT Admin Dashboard
4. **Full Access**: Create users, departments, projects, tasks

## 📋 Complete Database Document:

If you need to manually seed this user in another database, here's the complete document:

### JSON Format (for MongoDB Compass):

```json
{
  "_id": {"$oid": "696c5a0c6b5849d96ba75a2d"},
  "username": "admin",
  "email": "admin@taskmanagement.com",
  "password": "$2a$12$/RMuJjLDcjVTjXvKlaqE4OgeRyN/w6/IKYZ/w0q9mBbaXKk2x6Hv6",
  "firstName": "System",
  "lastName": "Administrator",
  "name": "System Administrator",
  "role": "it_admin",
  "department": "IT Development",
  "teamId": null,
  "isActive": true,
  "is_active": true,
  "unique_id": "ADMIN",
  "passwordChangedAt": {"$date": "2026-01-18T03:57:00.102Z"},
  "createdAt": {"$date": "2026-01-18T03:57:00.102Z"},
  "updatedAt": {"$date": "2026-01-18T03:57:00.102Z"},
  "__v": 0
}
```

### MongoDB Shell Command:

```javascript
db.users.insertOne({
  "_id": ObjectId("696c5a0c6b5849d96ba75a2d"),
  "username": "admin",
  "email": "admin@taskmanagement.com",
  "password": "$2a$12$/RMuJjLDcjVTjXvKlaqE4OgeRyN/w6/IKYZ/w0q9mBbaXKk2x6Hv6",
  "firstName": "System",
  "lastName": "Administrator",
  "name": "System Administrator",
  "role": "it_admin",
  "department": "IT Development",
  "teamId": null,
  "isActive": true,
  "is_active": true,
  "unique_id": "ADMIN",
  "passwordChangedAt": new Date("2026-01-18T03:57:00.102Z"),
  "createdAt": new Date("2026-01-18T03:57:00.102Z"),
  "updatedAt": new Date("2026-01-18T03:57:00.102Z"),
  "__v": 0
});
```

## 🎯 User Permissions:

With `it_admin` role, this user has:
- ✅ Full system access
- ✅ Create/delete users, departments, projects, tasks
- ✅ User management capabilities
- ✅ System administration features
- ✅ Access to IT Admin Dashboard

## ✅ Current Database Users:

Your database now contains:
1. **md1** (Managing Director) - `md1` / `Admin@123`
2. **md2** (Managing Director) - `md2` / `Admin@123`
3. **admin** (IT Admin) - `admin` / `Admin@123` ← **NEW**

## 🔐 Password Hash Details:

- **Original Password**: `Admin@123`
- **Hash Algorithm**: bcrypt
- **Salt Rounds**: 12
- **Hashed Password**: `$2a$12$/RMuJjLDcjVTjXvKlaqE4OgeRyN/w6/IKYZ/w0q9mBbaXKk2x6Hv6`

---

## 🚀 Ready to Login!

You can now login with:
- **Username**: `admin`
- **Password**: `Admin@123`

This will give you full IT Admin access to the system!