import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore'
import { db } from './config'
import type {
  UserProfile,
  FundingSource,
  BudgetCategory,
  Transaction,
  Material,
  MaterialTransaction,
  Worker,
  AttendanceRecord,
  WorkerPayment,
  DailyLog,
  Photo,
  AppNotification,
  AttendanceStatus,
} from '../types'

export const COLLECTIONS = {
  USERS: 'users',
  FUNDING_SOURCES: 'funding_sources',
  BUDGET_CATEGORIES: 'budget_categories',
  CONSTRUCTION_STAGES: 'construction_stages',
  TRANSACTIONS: 'transactions',
  MATERIALS: 'materials',
  MATERIAL_TRANSACTIONS: 'material_transactions',
  WORKERS: 'workers',
  ATTENDANCE: 'attendance',
  WORKER_PAYMENTS: 'worker_payments',
  DAILY_LOGS: 'daily_logs',
  PHOTOS: 'photos',
  NOTIFICATIONS: 'notifications',
} as const

// Generic helpers
export async function getCollection<T>(collectionName: string, constraints: QueryConstraint[] = []): Promise<T[]> {
  const q = constraints.length > 0
    ? query(collection(db, collectionName), ...constraints)
    : query(collection(db, collectionName))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const docRef = doc(db, collectionName, id)
  const snapshot = await getDoc(docRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as T
}

export async function addDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateDocument(collectionName: string, id: string, data: Record<string, unknown>): Promise<void> {
  const docRef = doc(db, collectionName, id)
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id)
  await deleteDoc(docRef)
}

// Users
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return getDocument<UserProfile>(COLLECTIONS.USERS, uid)
}

export async function getAllUsers(): Promise<UserProfile[]> {
  return getCollection<UserProfile>(COLLECTIONS.USERS, [orderBy('createdAt', 'desc')])
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, 'id' | 'createdAt'>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  await updateDoc(docRef, { ...data, createdAt: serverTimestamp() }).catch(async () => {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(docRef, { ...data, createdAt: serverTimestamp() })
  })
}

// Funding Sources
export async function getFundingSources(): Promise<FundingSource[]> {
  return getCollection<FundingSource>(COLLECTIONS.FUNDING_SOURCES, [orderBy('date', 'desc')])
}

export async function getTotalFunds(): Promise<number> {
  const sources = await getFundingSources()
  return sources.reduce((sum, s) => sum + s.amount, 0)
}

// Budget Categories
export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  return getCollection<BudgetCategory>(COLLECTIONS.BUDGET_CATEGORIES, [orderBy('categoryName', 'asc')])
}

// Transactions
export async function getTransactions(constraints: QueryConstraint[] = []): Promise<Transaction[]> {
  const defaultConstraints = [orderBy('date', 'desc'), ...constraints]
  return getCollection<Transaction>(COLLECTIONS.TRANSACTIONS, defaultConstraints)
}

export async function getTotalSpent(): Promise<number> {
  const transactions = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS, [
    where('status', '==', 'approved'),
  ])
  return transactions.reduce((sum, t) => sum + t.amount, 0)
}

export async function getSpendingByCategory(): Promise<Record<string, number>> {
  const transactions = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS, [
    where('status', '==', 'approved'),
  ])
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)
}

// Materials
export async function getMaterials(): Promise<Material[]> {
  return getCollection<Material>(COLLECTIONS.MATERIALS, [orderBy('name', 'asc')])
}

export async function getLowStockMaterials(): Promise<Material[]> {
  const materials = await getMaterials()
  return materials.filter(m => m.currentStock <= m.minimumStock)
}

export async function updateMaterialStock(materialId: string, quantityChange: number): Promise<void> {
  const docRef = doc(db, COLLECTIONS.MATERIALS, materialId)
  await updateDoc(docRef, { currentStock: increment(quantityChange) })
}

export async function getMaterialTransactions(materialId?: string): Promise<MaterialTransaction[]> {
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')]
  if (materialId) constraints.push(where('materialId', '==', materialId))
  return getCollection<MaterialTransaction>(COLLECTIONS.MATERIAL_TRANSACTIONS, constraints)
}

// Workers
export async function getWorkers(activeOnly = false): Promise<Worker[]> {
  const constraints: QueryConstraint[] = [orderBy('fullName', 'asc')]
  if (activeOnly) constraints.push(where('active', '==', true))
  return getCollection<Worker>(COLLECTIONS.WORKERS, constraints)
}

// Attendance
export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  return getCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE, [
    where('date', '==', date),
  ])
}

export async function getAttendanceByWorker(workerId: string): Promise<AttendanceRecord[]> {
  return getCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE, [
    where('workerId', '==', workerId),
    orderBy('date', 'desc'),
  ])
}

export async function saveAttendance(records: Omit<AttendanceRecord, 'id' | 'createdAt'>[]): Promise<void> {
  const batch = writeBatch(db)
  const existing = await getAttendanceByDate(records[0]?.date || '')
  const existingMap = new Map(existing.map(r => [r.workerId, r.id]))

  for (const record of records) {
    const existingId = existingMap.get(record.workerId)
    if (existingId) {
      const docRef = doc(db, COLLECTIONS.ATTENDANCE, existingId)
      batch.update(docRef, { status: record.status, recordedBy: record.recordedBy })
    } else {
      const docRef = doc(collection(db, COLLECTIONS.ATTENDANCE))
      batch.set(docRef, { ...record, createdAt: serverTimestamp() })
    }
  }
  await batch.commit()
}

export async function getWorkerAttendanceSummary(
  workerId: string,
  startDate: string,
  endDate: string
): Promise<{ totalDays: number; presentDays: number; halfDays: number; absentDays: number }> {
  const records = await getCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE, [
    where('workerId', '==', workerId),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
  ])

  let presentDays = 0
  let halfDays = 0
  let absentDays = 0

  for (const r of records) {
    if (r.status === 'present') presentDays++
    else if (r.status === 'half_day') halfDays++
    else absentDays++
  }

  return { totalDays: records.length, presentDays, halfDays, absentDays }
}

// Worker Payments
export async function getWorkerPayments(workerId?: string): Promise<WorkerPayment[]> {
  const constraints: QueryConstraint[] = [orderBy('paymentDate', 'desc')]
  if (workerId) constraints.push(where('workerId', '==', workerId))
  return getCollection<WorkerPayment>(COLLECTIONS.WORKER_PAYMENTS, constraints)
}

export async function getWorkerTotalPaid(workerId: string): Promise<number> {
  const payments = await getWorkerPayments(workerId)
  return payments.reduce((sum, p) => sum + p.amount, 0)
}

// Daily Logs
export async function getDailyLogs(): Promise<DailyLog[]> {
  return getCollection<DailyLog>(COLLECTIONS.DAILY_LOGS, [orderBy('date', 'desc')])
}

// Photos
export async function getPhotos(stage?: string): Promise<Photo[]> {
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')]
  if (stage) constraints.push(where('stage', '==', stage))
  return getCollection<Photo>(COLLECTIONS.PHOTOS, constraints)
}

// Notifications
export async function getNotifications(unreadOnly = false): Promise<AppNotification[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(50)]
  if (unreadOnly) constraints.push(where('isRead', '==', false))
  return getCollection<AppNotification>(COLLECTIONS.NOTIFICATIONS, constraints)
}

export async function markNotificationRead(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, id)
  await updateDoc(docRef, { isRead: true })
}

export { where, orderBy, limit, Timestamp, onSnapshot, serverTimestamp }
