# MYSHELTER — Hotel Booking Platform (MongoDB Edition)

A hotel booking website for **Delhi, Noida, and Ghaziabad** with a warm earthy aesthetic (Haven-style), powered by **Vercel Serverless Functions** and **MongoDB Atlas** backend, with vanilla HTML, CSS, and JavaScript on the frontend.

---

## Key Features

1. **Frontend**: Plain HTML, CSS, and JavaScript. No external UI frameworks.
2. **Backend**: Vercel Serverless Functions (`/api/*`) for authentication, bookings, search preferences, OTP verification, and administrative data.
3. **Database**: MongoDB Atlas database storing collections for `users`, `bookings`, `preferences`, and `otp_codes`.
4. **User Registration & Authentication**:
   - Register and Sign In portal (`auth.html`).
   - Secure password hashing using Node.js `crypto.scrypt` with cryptographic salts (never plain text).
   - Session persistence via signed JWT tokens; users stay logged in across page navigations.
   - Dynamic navigation header reflecting user authentication status.
   - Email verification via 6-digit OTP code flow (`send-otp` and `verify-otp`) with Gmail SMTP integration.
   - Strict 10-digit Indian phone number validation on both client and server.
5. **Bookings & Preferences**:
   - Bookings are saved directly to MongoDB linked to the signed-in user.
   - User search preferences (preferred city, room type, budget, amenities, sort) are saved to database on search/filter.
   - "My Bookings" page loads user bookings directly from MongoDB, with cloud cancellation support.
6. **Password-Protected Admin Portal (`/admin`)**:
   - Protected with `ADMIN_PASSWORD`.
   - Real-time KPI metrics (Registered Users, Total Bookings, Saved Preferences).
   - Live search filter across all records.
   - **Export to CSV** for users, bookings, and preferences.
7. **Custom Sort Dropdown**:
   - Styled dropdown matching the warm earthy Haven theme.
   - Smooth opening/closing animation, hover states, check mark indicator on active selection.
   - Full keyboard accessibility and mobile responsiveness.

---

## Step-by-Step Setup Instructions

### 1. MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account.
2. Create a free **M0 Shared Cluster** (e.g. AWS / Mumbai `ap-south-1`).
3. Under **Security** -> **Database Access**, create a database user (e.g. `myshelter_admin`) and a secure password.
4. Under **Security** -> **Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere** (`0.0.0.0/0`) so Vercel serverless functions can connect.
5. In **Database** -> **Clusters**, click **Connect** -> **Drivers** (Node.js) and copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   ```

---

### 2. Local Environment Configuration

1. In the project root, create a `.env` file (copied from `.env.example`):
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=myshelter
   ADMIN_PASSWORD=admin2026
   JWT_SECRET=your-random-32-char-secret-key
   OTP_TTL_MINUTES=10
   REQUIRE_EMAIL_VERIFICATION=false

   # Optional Gmail SMTP for sending live emails:
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
2. Note on offline testing: If `MONGODB_URI` is omitted during local development, an automatic in-memory fallback activates so you can run and test offline without dependencies.

---

### 3. Running Locally

```bash
# Install dependencies
npm install

# Build static assets
npm run build

# Start the local development server (serves frontend & /api serverless functions)
npm start
```

Visit: `http://localhost:5173`

---

### 4. Vercel Deployment

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com):
   - Click **Add New** -> **Project**.
   - Select your GitHub repository.
   - Framework Preset: **Other**.
   - Root Directory: `./` (leave default).
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
3. Add the following **Environment Variables** in Vercel Project Settings:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `MONGODB_DB_NAME`: `myshelter`.
   - `ADMIN_PASSWORD`: Your admin password (e.g. `admin2026`).
   - `JWT_SECRET`: Any random secret string for JWT signing.
   - `GMAIL_USER`: (Optional) Your Gmail address for sending OTP emails.
   - `GMAIL_APP_PASSWORD`: (Optional) 16-character Google App Password.
4. Click **Deploy**.

---

## Testing

```bash
# Run unit tests
npm test

# Run build
npm run build
```
