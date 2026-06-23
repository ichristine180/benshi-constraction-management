import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'RWF'): string {
  return new Intl.NumberFormat('rw-RW', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ' + currency
}

export function formatDate(date: Timestamp | Date | string | null | undefined): string {
  if (!date) return 'N/A'
  try {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'dd/MM/yyyy')
    }
    if (typeof date === 'string') {
      return format(parseISO(date), 'dd/MM/yyyy')
    }
    return format(date, 'dd/MM/yyyy')
  } catch {
    return 'N/A'
  }
}

export function formatDateTime(date: Timestamp | Date | null | undefined): string {
  if (!date) return 'N/A'
  try {
    const d = date instanceof Timestamp ? date.toDate() : date
    return format(d, 'dd/MM/yyyy HH:mm')
  } catch {
    return 'N/A'
  }
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function percentOf(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    planning: 'Planning',
    site_preparation: 'Site Preparation',
    foundation: 'Foundation',
    walls: 'Walls',
    roofing: 'Roofing',
    electrical: 'Electrical',
    plumbing: 'Plumbing',
    finishing: 'Finishing',
    complete: 'Complete',
  }
  return labels[stage] || stage
}

export function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    planning: 'bg-gray-100 text-gray-800',
    site_preparation: 'bg-yellow-100 text-yellow-800',
    foundation: 'bg-orange-100 text-orange-800',
    walls: 'bg-blue-100 text-blue-800',
    roofing: 'bg-purple-100 text-purple-800',
    electrical: 'bg-red-100 text-red-800',
    plumbing: 'bg-cyan-100 text-cyan-800',
    finishing: 'bg-green-100 text-green-800',
    complete: 'bg-emerald-100 text-emerald-800',
  }
  return colors[stage] || 'bg-gray-100 text-gray-800'
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    material_purchase: 'Material Purchase',
    worker_payment: 'Worker Payment',
    equipment_rental: 'Equipment Rental',
    transport: 'Transport',
    utility: 'Utility',
    other_expense: 'Other Expense',
  }
  return labels[type] || type
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    present: 'bg-green-100 text-green-800',
    half_day: 'bg-yellow-100 text-yellow-800',
    absent: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getWorkerRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    mason: 'Mason',
    carpenter: 'Carpenter',
    electrician: 'Electrician',
    helper: 'Helper',
    welder: 'Welder',
    plumber: 'Plumber',
    painter: 'Painter',
    other: 'Other',
  }
  return labels[role] || role
}

export function getFundingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    personal_savings: 'Personal Savings',
    bank_loan: 'Bank Loan',
    salary: 'Salary',
    family_contribution: 'Family Contribution',
    business_income: 'Business Income',
    other: 'Other',
  }
  return labels[type] || type
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
  }
  return labels[method] || method
}
