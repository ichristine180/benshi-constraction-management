# 🏗️ Construction Budget & Site Management System

A complete web application for managing a personal house construction project built with Next.js 15, Firebase, and TypeScript.

## Features

- **Dashboard** — Real-time overview of finances, workers, materials, and alerts
- **Funding Management** — Track all money sources (savings, loans, salary top-ups)
- **Budget Management** — Plan and monitor spending by category with visual progress bars
- **Transaction Tracking** — Record all expenses with receipt uploads and approval workflow
- **Materials Management** — Track purchases, usage, and stock levels with low-stock alerts
- **Worker Management** — Manage worker profiles with roles and daily rates
- **Attendance Tracking** — Daily attendance with Present / Half Day / Absent status
- **Payroll** — Auto-calculate earnings from attendance and track payments
- **Daily Site Logs** — Weather, work completed, issues, and next tasks with photos
- **Photo Gallery** — Site progress photos organized by construction stage
- **Reports** — Financial, worker, and materials reports with PDF/Excel export
- **User Management** — Multi-role access control (Owner / Site Manager / Supervisor)
- **Dark Mode** — Full dark mode support
- **Kinyarwanda UI** — Site Manager and Supervisor see the interface in Kinyarwanda

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Charts**: Recharts
- **Export**: jsPDF + jspdf-autotable, XLSX
- **Deployment**: Vercel

## User Roles

| Role | Description |
|------|-------------|
| **Owner** | Full access — financials, users, approvals, all reports |
| **Site Manager** | Site operations — purchases, attendance, payroll, materials (Kinyarwanda UI) |
| **Supervisor** | Limited — attendance, daily logs, photos (Kinyarwanda UI) |

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo>
cd construction-manager
npm install
```

### 2. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Enable **Cloud Firestore** (start in production mode)
5. Enable **Firebase Storage**
6. Go to Project Settings → General → Your apps → Web App
7. Copy the config values

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

### 4. Deploy Firestore Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules,firestore:indexes
```

Or copy `firestore.rules` and `firestore.indexes.json` manually in the Firebase Console.

### 5. Create Your Owner Account

In Firebase Console → Authentication → Add user:
- Email: your-email@example.com
- Password: your-secure-password

Then in Firestore → Collection `users` → New document:
- **Document ID**: (copy your Firebase Auth UID)
- Fields:
  ```
  fullName: "Your Name"
  email: "your-email@example.com"
  role: "owner"
  active: true
  createdAt: (timestamp)
  ```

### 6. Seed Default Data (Optional)

Download your service account key from Firebase Console → Project Settings → Service Accounts → Generate new private key. Save as `serviceAccountKey.json` in project root, then:

```bash
npm install firebase-admin
node scripts/seed.js
```

This creates default budget categories, materials, and construction stages.

### 7. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your owner account.

## Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add all environment variables from `.env.local`
4. Deploy!

## Firestore Schema

### Collections

```
users/
  {uid}
    fullName: string
    email: string
    role: "owner" | "site_manager" | "supervisor"
    active: boolean
    createdAt: timestamp

funding_sources/
  {id}
    sourceName: string
    sourceType: "personal_savings" | "bank_loan" | "salary" | ...
    amount: number
    date: timestamp
    notes: string
    attachmentUrl?: string
    createdBy: string

budget_categories/
  {id}
    categoryName: string
    plannedBudget: number

transactions/
  {id}
    transactionType: "material_purchase" | "worker_payment" | ...
    category: string
    stage: string
    amount: number
    description: string
    date: timestamp
    receiptImageUrl?: string
    createdBy: string
    approvedBy?: string
    status: "pending" | "approved" | "rejected"

materials/
  {id}
    name: string
    unit: string
    currentStock: number
    minimumStock: number
    unitPrice: number

material_transactions/
  {id}
    materialId: string
    materialName: string
    transactionType: "purchase" | "usage" | "adjustment"
    quantity: number
    unitPrice?: number
    totalCost?: number
    stage?: string
    supplier?: string
    notes: string
    date: timestamp
    createdBy: string

workers/
  {id}
    fullName: string
    phone: string
    role: "mason" | "carpenter" | "electrician" | ...
    dailyRate: number
    active: boolean

attendance/
  {id}
    workerId: string
    workerName: string
    date: string (YYYY-MM-DD)
    status: "present" | "half_day" | "absent"
    recordedBy: string

worker_payments/
  {id}
    workerId: string
    workerName: string
    amount: number
    paymentDate: timestamp
    paymentMethod: "cash" | "mobile_money" | "bank_transfer"
    notes: string
    createdBy: string

daily_logs/
  {id}
    date: string (YYYY-MM-DD)
    weather: "sunny" | "cloudy" | "rainy" | "windy" | "stormy"
    workersPresent: number
    workCompleted: string
    issuesEncountered: string
    nextTasks: string
    photos: string[]
    stage: string
    createdBy: string

photos/
  {id}
    url: string
    caption: string
    stage: string
    date: timestamp
    uploadedBy: string

notifications/
  {id}
    type: string
    title: string
    message: string
    isRead: boolean
    createdAt: timestamp
```

## Creating More Users

1. Login as Owner
2. Go to **Users** section in the sidebar
3. Click **Create User** — set name, email, password, and role
4. The user can login and will see the appropriate interface based on their role

**Note**: Site Managers and Supervisors see the interface in **Kinyarwanda**.

## Currency

All amounts are in **RWF** (Rwandan Franc). The system formats numbers as `1,000,000 RWF`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # All protected pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── funding/           # Funding sources
│   │   ├── budget/            # Budget categories
│   │   ├── transactions/      # Expense tracking
│   │   ├── materials/         # Materials inventory
│   │   ├── workers/           # Worker management
│   │   ├── attendance/        # Daily attendance
│   │   ├── payroll/           # Payroll & payments
│   │   ├── logs/              # Daily site logs
│   │   ├── photos/            # Photo gallery
│   │   ├── reports/           # Reports & exports
│   │   └── users/             # User management (owner only)
│   └── api/seed/              # Seed endpoint (dev only)
├── components/
│   ├── ui/                    # Button, Card, Modal, Table, etc.
│   └── layout/                # Sidebar, Header
├── contexts/                  # AuthContext
├── lib/
│   ├── firebase/              # Firebase config, db helpers, storage
│   ├── types/                 # TypeScript types
│   └── utils/                 # Formatters, Kinyarwanda translations, export
└── middleware.ts               # Route protection
```

## License

Private project — all rights reserved.
# benshi-constraction-management
