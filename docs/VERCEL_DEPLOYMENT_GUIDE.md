# MYSHELTER — Comprehensive Vercel & MongoDB Atlas Deployment Guide

> **Project:** MYSHELTER (Hotel Booking Platform — Delhi, Noida & Ghaziabad)  
> **Target Platform:** Vercel (Static Frontend + Node.js Serverless Functions)  
> **Database:** MongoDB Atlas (Cloud Database)  
> **Target Node.js Version:** Node.js `>=22`  

---

## 1. Prerequisites

Before deploying MYSHELTER to Vercel, ensure you have:
1. A **GitHub account** with access to push and manage your repository.
2. A **Vercel account** ([vercel.com](https://vercel.com)) connected to your GitHub account.
3. A **MongoDB Atlas account** ([mongodb.com/atlas](https://www.mongodb.com/atlas)) to host your database cluster.
4. **Node.js 22+** and **npm** installed on your development machine.

---

## 2. Local Setup & Testing

### 2.1 Install Dependencies
```bash
npm install
```
*Installs `mongodb` (native MongoDB driver) and `nodemailer`.*

### 2.2 Run Build Validation
```bash
npm run build
```
*Validates all 141 hotel rooms and prepares `dist/`.*

### 2.3 Run Local Development Server
```bash
npm start
```
*Starts local server at `http://127.0.0.1:5173` with local API route handling.*

### 2.4 Run Unit Tests
```bash
npm test
```

---

## 3. MongoDB Atlas Database Configuration

MYSHELTER uses MongoDB Atlas for user accounts, room bookings, search preferences, and OTP verification codes.

### Step-by-Step MongoDB Atlas Setup:
1. Log in to [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a new Project or select an existing one.
3. Click **Create** -> choose **M0 Free (Shared)**.
4. Select provider (e.g. AWS) and a region close to users (e.g. Mumbai `ap-south-1`).
5. **Database Access**: Under Security, create a database user:
   - Username: `myshelter_app`
   - Password: `<your-secure-password>`
   - Role: Read and write to any database (`readWriteAnyDatabase`).
6. **Network Access**:
   - Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`) with description `Vercel Serverless Functions`.
7. **Get Connection String**:
   - In Clusters view, click **Connect**.
   - Choose **Drivers** -> Driver: **Node.js**.
   - Copy connection string (format: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`).

> **Note on Serverless Connection Pooling:** The backend in `api/_lib/mongodb.js` uses a global cached client promise pattern (`global._mongoClientPromise`) with max pool size 10 to reuse connections across serverless function invocations without exceeding Atlas connection limits.

---

## 4. Vercel Environment Variables Configuration

In the Vercel Dashboard -> **Project Settings** -> **Environment Variables**, add:

| Variable Name | Required | Target Environments | Scope | Description |
|---|---|---|---|---|
| `MONGODB_URI` | **Required** | Production, Preview, Development | Backend Serverless | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `MONGODB_DB_NAME` | **Required** | Production, Preview, Development | Backend Serverless | Database name (e.g. `myshelter`) |
| `ADMIN_PASSWORD` | **Required** | Production, Preview, Development | Backend Serverless | Secret password to access `/admin` dashboard |
| `JWT_SECRET` | **Required** | Production, Preview, Development | Backend Serverless | 32+ character random secret string for signing JWT tokens |
| `OTP_TTL_MINUTES` | Optional | Production, Preview, Development | Backend Serverless | Minutes until OTP code expires (default: `10`) |
| `REQUIRE_EMAIL_VERIFICATION` | Optional | Production, Preview, Development | Backend Serverless | `false` (default) for non-blocking access, `true` for strict gating |
| `GMAIL_USER` | Optional | Production, Preview, Development | Backend Serverless | Sender Gmail address for live OTP delivery |
| `GMAIL_APP_PASSWORD` | Optional | Production, Preview, Development | Backend Serverless | 16-character Google App Password |

---

## 5. Vercel Deployment Settings

- **Framework Preset:** `Other`
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
