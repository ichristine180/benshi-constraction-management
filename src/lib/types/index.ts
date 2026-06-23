import { Timestamp } from 'firebase/firestore'

export type UserRole = 'owner' | 'site_manager' | 'supervisor'

export interface UserProfile {
  id: string
  fullName: string
  email: string
  role: UserRole
  createdAt: Timestamp
  active: boolean
}

export type FundingSourceType =
  | 'personal_savings'
  | 'bank_loan'
  | 'salary'
  | 'family_contribution'
  | 'business_income'
  | 'other'

export interface FundingSource {
  id: string
  sourceName: string
  sourceType: FundingSourceType
  amount: number
  date: Timestamp
  notes: string
  attachmentUrl?: string
  createdBy: string
  createdAt: Timestamp
}

export interface BudgetCategory {
  id: string
  categoryName: string
  plannedBudget: number
  createdAt: Timestamp
}

export type ConstructionStage =
  | 'planning'
  | 'site_preparation'
  | 'foundation'
  | 'walls'
  | 'roofing'
  | 'electrical'
  | 'plumbing'
  | 'finishing'
  | 'complete'

export interface ProjectStage {
  id: string
  stage: ConstructionStage
  stageName: string
  startDate?: Timestamp
  endDate?: Timestamp
  isCurrent: boolean
  notes: string
}

export type TransactionType =
  | 'material_purchase'
  | 'worker_payment'
  | 'equipment_rental'
  | 'transport'
  | 'utility'
  | 'other_expense'

export type TransactionStatus = 'pending' | 'approved' | 'rejected'

export interface Transaction {
  id: string
  transactionType: TransactionType
  category: string
  stage: ConstructionStage
  amount: number
  description: string
  date: Timestamp
  receiptImageUrl?: string
  createdBy: string
  approvedBy?: string
  status: TransactionStatus
  createdAt: Timestamp
  notes?: string
}

export type MaterialUnit = 'bags' | 'pieces' | 'tonnes' | 'litres' | 'meters' | 'sqm' | 'kg' | 'units'

export interface Material {
  id: string
  name: string
  unit: MaterialUnit
  currentStock: number
  minimumStock: number
  unitPrice: number
  createdAt: Timestamp
}

export type MaterialTransactionType = 'purchase' | 'usage' | 'adjustment'

export interface MaterialTransaction {
  id: string
  materialId: string
  materialName: string
  transactionType: MaterialTransactionType
  quantity: number
  unitPrice?: number
  totalCost?: number
  stage?: ConstructionStage
  supplier?: string
  notes: string
  date: Timestamp
  createdBy: string
  receiptUrl?: string
}

export type WorkerRole = 'mason' | 'carpenter' | 'electrician' | 'helper' | 'welder' | 'plumber' | 'painter' | 'other'

export interface Worker {
  id: string
  fullName: string
  phone: string
  role: WorkerRole
  dailyRate: number
  active: boolean
  createdAt: Timestamp
}

export type AttendanceStatus = 'present' | 'half_day' | 'absent'

export interface AttendanceRecord {
  id: string
  workerId: string
  workerName: string
  date: string
  status: AttendanceStatus
  recordedBy: string
  createdAt: Timestamp
}

export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer'

export interface WorkerPayment {
  id: string
  workerId: string
  workerName: string
  amount: number
  paymentDate: Timestamp
  paymentMethod: PaymentMethod
  periodStart?: string
  periodEnd?: string
  notes: string
  createdBy: string
  transactionId?: string
}

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'stormy'

export interface DailyLog {
  id: string
  date: string
  weather: WeatherCondition
  workersPresent: number
  workCompleted: string
  issuesEncountered: string
  nextTasks: string
  photos: string[]
  stage: ConstructionStage
  createdBy: string
  createdAt: Timestamp
}

export interface Photo {
  id: string
  url: string
  caption: string
  stage: ConstructionStage
  date: Timestamp
  uploadedBy: string
  dailyLogId?: string
  thumbnailUrl?: string
}

export type NotificationType =
  | 'budget_exceeded'
  | 'low_stock'
  | 'payment_due'
  | 'low_balance'
  | 'pending_approval'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: Timestamp
  relatedId?: string
}

export interface DashboardStats {
  totalBudget: number
  totalFunds: number
  totalSpent: number
  remainingBalance: number
  currentStage: ConstructionStage
  workersToday: number
  outstandingPayments: number
  lowStockCount: number
}
