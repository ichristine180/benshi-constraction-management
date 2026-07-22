'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { PlusCircle, CheckCircle, XCircle, X } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { useAuth } from '@/contexts/AuthContext'
import {
  getTransactions, getBudgetCategories, addDocument, updateDocument, COLLECTIONS
} from '@/lib/firebase/db'
import { formatCurrency, formatDate, getTransactionTypeLabel, getStatusColor, getStageLabel } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import { rw } from '@/lib/utils/kinyarwanda'
import type { Transaction, TransactionType, ConstructionStage, TransactionStatus } from '@/lib/types'
import toast from 'react-hot-toast'

const TX_TYPES: { value: TransactionType; label: string; labelRw: string }[] = [
  { value: 'material_purchase', label: 'Material Purchase', labelRw: rw.transactions.materialPurchase },
  { value: 'worker_payment', label: 'Worker Payment', labelRw: rw.transactions.workerPayment },
  { value: 'equipment_rental', label: 'Equipment Rental', labelRw: rw.transactions.equipmentRental },
  { value: 'transport', label: 'Transport', labelRw: rw.transactions.transport },
  { value: 'utility', label: 'Utility', labelRw: rw.transactions.utility },
  { value: 'other_expense', label: 'Other Expense', labelRw: rw.transactions.otherExpense },
]

const STAGES: { value: ConstructionStage; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'site_preparation', label: 'Site Preparation' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'walls', label: 'Walls' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'complete', label: 'Complete' },
]

const blank = {
  transactionType: 'material_purchase' as TransactionType,
  category: '',
  stage: 'foundation' as ConstructionStage,
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function TransactionsPage() {
  const { userProfile, isOwner, isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor
  const canCreate = isOwner || isSiteManager

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    try {
      const [txs, cats] = await Promise.all([getTransactions(), getBudgetCategories()])
      setTransactions(txs)
      setCategories(cats.map(c => ({ value: c.categoryName, label: c.categoryName })))
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = transactions.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !t.category.toLowerCase().includes(search.toLowerCase())) return false
    const txDate = t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date)
    if (dateFrom && txDate < new Date(dateFrom)) return false
    if (dateTo && txDate > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  const hasDateFilter = dateFrom || dateTo
  const clearDates = () => { setDateFrom(''); setDateTo('') }

  const totalAmount = filtered.filter(t => t.status === 'approved').reduce((s, t) => s + t.amount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount || !form.category) return toast.error('Fill required fields')
    setSaving(true)
    try {
      const newTxData: Omit<Transaction, 'id'> = {
        transactionType: form.transactionType,
        category: form.category,
        stage: form.stage,
        amount: parseFloat(form.amount),
        description: form.description,
        date: Timestamp.fromDate(new Date(form.date)),
        status: isOwner ? 'approved' : 'pending',
        createdBy: userProfile?.id || '',
        notes: form.notes,
        createdAt: Timestamp.now(),
      }
      await addDocument<Transaction>(COLLECTIONS.TRANSACTIONS, newTxData)

      toast.success('Transaction recorded!')
      setShowModal(false)
      setForm(blank)
      load()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleApprove = async (tx: Transaction, status: TransactionStatus) => {
    await updateDocument(COLLECTIONS.TRANSACTIONS, tx.id, {
      status,
      approvedBy: userProfile?.id,
    })
    toast.success(status === 'approved' ? 'Approved!' : 'Rejected')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{useKinyarwanda ? rw.transactions.title : 'Transactions'}</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} records · Approved total: {formatCurrency(totalAmount)}</p>
        </div>
        {canCreate && (
          <Button icon={<PlusCircle className="h-4 w-4" />} onClick={() => setShowModal(true)}>
            {useKinyarwanda ? rw.transactions.addTransaction : 'Add Transaction'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={useKinyarwanda ? rw.common.search : 'Search transactions...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 whitespace-nowrap">{useKinyarwanda ? 'Itariki:' : 'Date:'}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              min={dateFrom}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {hasDateFilter && (
              <button
                onClick={clearDates}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="h-3 w-3" />
                {useKinyarwanda ? 'Siba' : 'Clear'}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <Table<Transaction & Record<string, unknown>>
          loading={loading}
          data={filtered as (Transaction & Record<string, unknown>)[]}
          emptyMessage="No transactions found"
          columns={[
            { key: 'date', header: 'Date', render: r => formatDate(r.date as Timestamp) },
            { key: 'description', header: 'Description', render: r => <span className="font-medium max-w-xs truncate block">{r.description}</span> },
            { key: 'category', header: 'Category', render: r => <Badge variant="info">{r.category}</Badge> },
            { key: 'stage', header: 'Stage', render: r => <span className="text-xs text-gray-500">{getStageLabel(r.stage as string)}</span> },
            { key: 'amount', header: 'Amount', render: r => <span className="font-semibold">{formatCurrency(r.amount as number)}</span> },
            {
              key: 'status',
              header: 'Status',
              render: r => (
                <Badge variant={r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}>
                  {useKinyarwanda
                    ? r.status === 'approved' ? rw.transactions.approved
                    : r.status === 'pending' ? rw.transactions.pending
                    : rw.transactions.rejected
                    : r.status as string
                  }
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: r => isOwner && r.status === 'pending' ? (
                <div className="flex gap-1">
                  <button onClick={() => handleApprove(r as unknown as Transaction, 'approved')} className="p-1.5 hover:bg-green-50 rounded text-green-600 hover:text-green-700">
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleApprove(r as unknown as Transaction, 'rejected')} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : null,
            },
          ]}
        />
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(blank) }}
        title={useKinyarwanda ? rw.transactions.addTransaction : 'Add Transaction'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{useKinyarwanda ? rw.common.cancel : 'Cancel'}</Button>
            <Button loading={saving} onClick={handleSubmit}>{useKinyarwanda ? rw.common.save : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-grid">
            <Select
              label={useKinyarwanda ? rw.transactions.type : 'Transaction Type'}
              options={TX_TYPES.map(t => ({ value: t.value, label: useKinyarwanda ? t.labelRw : t.label }))}
              value={form.transactionType}
              onChange={e => setForm(p => ({ ...p, transactionType: e.target.value as TransactionType }))}
              required
            />
            <Select
              label={useKinyarwanda ? rw.transactions.category : 'Category'}
              options={categories}
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="Select category"
              required
            />
          </div>
          <div className="form-grid">
            <Select
              label={useKinyarwanda ? rw.transactions.stage : 'Stage'}
              options={STAGES}
              value={form.stage}
              onChange={e => setForm(p => ({ ...p, stage: e.target.value as ConstructionStage }))}
              required
            />
            <Input
              label={useKinyarwanda ? rw.transactions.amount : 'Amount (RWF)'}
              type="number"
              min="0"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              required
              placeholder="0"
            />
          </div>
          <Input
            label={useKinyarwanda ? rw.common.notes : 'Description'}
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            required
            placeholder="What was purchased / paid for?"
          />
          <Input
            label={useKinyarwanda ? rw.transactions.receipt + ' ' + rw.common.date : 'Date'}
            type="date"
            value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            required
          />
          <Textarea
            label={useKinyarwanda ? rw.common.notes : 'Notes'}
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Additional notes..."
          />
          {!isOwner && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
              {useKinyarwanda ? 'Ibi bizategereza kwemezwa n\'nyir\'inzu' : 'This transaction will require owner approval'}
            </p>
          )}
        </form>
      </Modal>
    </div>
  )
}
