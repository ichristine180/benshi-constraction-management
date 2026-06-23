'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { CreditCard, DollarSign, AlertTriangle } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import {
  getWorkers, getWorkerPayments, getCollection, addDocument, COLLECTIONS
} from '@/lib/firebase/db'
import { formatCurrency, formatDate, getWorkerRoleLabel, getPaymentMethodLabel } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import { rw } from '@/lib/utils/kinyarwanda'
import type { Worker, WorkerPayment, AttendanceRecord, PaymentMethod } from '@/lib/types'
import { where, orderBy } from 'firebase/firestore'
import toast from 'react-hot-toast'

interface PayrollSummary {
  worker: Worker
  totalDays: number
  totalEarned: number
  totalPaid: number
  outstanding: number
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; labelRw: string }[] = [
  { value: 'cash', label: 'Cash', labelRw: rw.payroll.cash },
  { value: 'mobile_money', label: 'Mobile Money', labelRw: rw.payroll.mobileMoney },
  { value: 'bank_transfer', label: 'Bank Transfer', labelRw: rw.payroll.bankTransfer },
]

export default function PayrollPage() {
  const { userProfile, isOwner, isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor
  const canPay = isOwner || isSiteManager

  const [summaries, setSummaries] = useState<PayrollSummary[]>([])
  const [payments, setPayments] = useState<WorkerPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<PayrollSummary | null>(null)
  const [form, setForm] = useState({ amount: '', paymentMethod: 'cash' as PaymentMethod, notes: '', paymentDate: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary')

  const load = useCallback(async () => {
    try {
      const [workers, allPayments, attendanceRec] = await Promise.all([
        getWorkers(true),
        getWorkerPayments(),
        getCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE, [orderBy('date', 'desc')]),
      ])

      const paymentsByWorker = new Map<string, number>()
      allPayments.forEach(p => {
        paymentsByWorker.set(p.workerId, (paymentsByWorker.get(p.workerId) || 0) + p.amount)
      })

      const attendanceByWorker = new Map<string, AttendanceRecord[]>()
      attendanceRec.forEach(a => {
        if (!attendanceByWorker.has(a.workerId)) attendanceByWorker.set(a.workerId, [])
        attendanceByWorker.get(a.workerId)!.push(a)
      })

      const sums: PayrollSummary[] = workers.map(w => {
        const records = attendanceByWorker.get(w.id) || []
        const days = records.reduce((d, r) => d + (r.status === 'present' ? 1 : r.status === 'half_day' ? 0.5 : 0), 0)
        const earned = days * w.dailyRate
        const paid = paymentsByWorker.get(w.id) || 0
        return { worker: w, totalDays: days, totalEarned: earned, totalPaid: paid, outstanding: Math.max(0, earned - paid) }
      })

      setSummaries(sums)
      setPayments(allPayments)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totals = summaries.reduce((acc, s) => ({
    earned: acc.earned + s.totalEarned,
    paid: acc.paid + s.totalPaid,
    outstanding: acc.outstanding + s.outstanding,
  }), { earned: 0, paid: 0, outstanding: 0 })

  const openPayment = (summary: PayrollSummary) => {
    setSelectedWorker(summary)
    setForm({ amount: String(summary.outstanding), paymentMethod: 'cash', notes: '', paymentDate: new Date().toISOString().split('T')[0] })
    setShowModal(true)
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorker || !form.amount) return
    setSaving(true)
    try {
      await addDocument<WorkerPayment>(COLLECTIONS.WORKER_PAYMENTS, {
        workerId: selectedWorker.worker.id,
        workerName: selectedWorker.worker.fullName,
        amount: parseFloat(form.amount),
        paymentDate: Timestamp.fromDate(new Date(form.paymentDate)),
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        createdBy: userProfile?.id || '',
      } as Omit<WorkerPayment, 'id'>)
      toast.success(useKinyarwanda ? rw.payroll.successPaid : 'Payment recorded!')
      setShowModal(false)
      load()
    } catch { toast.error('Failed to record payment') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{useKinyarwanda ? rw.payroll.title : 'Payroll'}</h1>
          <p className="text-sm text-gray-500 mt-1">{useKinyarwanda ? 'Ubwishyu bw\'abakozi' : 'Track worker earnings and payments'}</p>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-gray-500">{useKinyarwanda ? 'Bose Bakwiriye' : 'Total Earned'}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totals.earned)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">{useKinyarwanda ? 'Byishyuwe' : 'Total Paid'}</p>
          <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(totals.paid)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">{useKinyarwanda ? 'Bisigaye' : 'Outstanding'}</p>
          <p className={`text-lg font-bold mt-1 ${totals.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(totals.outstanding)}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['summary', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab === 'summary' ? (useKinyarwanda ? 'Incamake' : 'Summary') : (useKinyarwanda ? 'Amateka' : 'Payment History')}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> :
        <div className="space-y-3">
          {summaries.map(s => (
            <Card key={s.worker.id}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{s.worker.fullName}</p>
                    <p className="text-xs text-gray-500">{getWorkerRoleLabel(s.worker.role)} · {formatCurrency(s.worker.dailyRate)}/{useKinyarwanda ? 'umunsi' : 'day'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{useKinyarwanda ? 'Iminsi' : 'Days'}</p>
                    <p className="font-bold text-gray-900 dark:text-white">{s.totalDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{useKinyarwanda ? 'Akwiriye' : 'Earned'}</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(s.totalEarned)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{useKinyarwanda ? 'Wishyuwe' : 'Paid'}</p>
                    <p className="font-bold text-green-600">{formatCurrency(s.totalPaid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{useKinyarwanda ? 'Bisigaye' : 'Due'}</p>
                    <p className={`font-bold ${s.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(s.outstanding)}</p>
                  </div>

                  {canPay && s.outstanding > 0 && (
                    <Button size="sm" onClick={() => openPayment(s)} icon={<DollarSign className="h-3.5 w-3.5" />}>
                      {useKinyarwanda ? 'Ishyura' : 'Pay'}
                    </Button>
                  )}
                  {s.outstanding === 0 && (
                    <Badge variant="success">{useKinyarwanda ? 'Byishyuwe' : 'Paid Up'}</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {summaries.length === 0 && (
            <Card>
              <p className="text-center text-gray-500 py-8">{useKinyarwanda ? 'Nta bakozi babonetse' : 'No workers found'}</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{useKinyarwanda ? 'Nta mbwishyu ziboneka' : 'No payments yet'}</p>
            ) : (
              payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{p.workerName}</p>
                    <p className="text-xs text-gray-500">{formatDate(p.paymentDate)} · {getPaymentMethodLabel(p.paymentMethod)}</p>
                    {p.notes && <p className="text-xs text-gray-400">{p.notes}</p>}
                  </div>
                  <p className="font-bold text-green-600">{formatCurrency(p.amount)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={useKinyarwanda ? rw.payroll.makePayment : `Pay ${selectedWorker?.worker.fullName}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{useKinyarwanda ? rw.common.cancel : 'Cancel'}</Button>
            <Button loading={saving} onClick={handlePay} variant="success" icon={<DollarSign className="h-4 w-4" />}>
              {useKinyarwanda ? 'Ishyura' : 'Record Payment'}
            </Button>
          </>
        }
      >
        {selectedWorker && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{selectedWorker.worker.fullName}</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                {useKinyarwanda ? 'Isigaye kwishyurwa:' : 'Outstanding:'} {formatCurrency(selectedWorker.outstanding)}
              </p>
            </div>
            <form onSubmit={handlePay} className="space-y-4">
              <Input
                label={useKinyarwanda ? 'Umubare w\'Amafaranga (RWF)' : 'Amount (RWF)'}
                type="number"
                min="0"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                required
              />
              <Select
                label={useKinyarwanda ? rw.payroll.paymentMethod : 'Payment Method'}
                options={PAYMENT_METHODS.map(m => ({ value: m.value, label: useKinyarwanda ? m.labelRw : m.label }))}
                value={form.paymentMethod}
                onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}
              />
              <Input
                label={useKinyarwanda ? rw.payroll.paymentDate : 'Payment Date'}
                type="date"
                value={form.paymentDate}
                onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))}
              />
              <Textarea
                label={useKinyarwanda ? rw.common.notes : 'Notes'}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}
