'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { PlusCircle, Trash2, PiggyBank } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { useAuth } from '@/contexts/AuthContext'
import { getCollection, addDocument, deleteDocument, COLLECTIONS } from '@/lib/firebase/db'
import { formatCurrency, formatDate, getFundingTypeLabel } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import type { FundingSource } from '@/lib/types'
import toast from 'react-hot-toast'

const FUNDING_TYPES = [
  { value: 'personal_savings', label: 'Personal Savings' },
  { value: 'bank_loan', label: 'Bank Loan' },
  { value: 'salary', label: 'Salary' },
  { value: 'family_contribution', label: 'Family Contribution' },
  { value: 'business_income', label: 'Business Income' },
  { value: 'other', label: 'Other' },
]

const initialForm = {
  sourceName: '',
  sourceType: 'personal_savings' as const,
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function FundingPage() {
  const { userProfile, isOwner } = useAuth()
  const [sources, setSources] = useState<FundingSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const loadSources = useCallback(async () => {
    try {
      const data = await getCollection<FundingSource>(COLLECTIONS.FUNDING_SOURCES, [])
      setSources(data.sort((a, b) => b.date?.toMillis?.() - a.date?.toMillis?.()))
    } catch {
      toast.error('Failed to load funding sources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSources() }, [loadSources])

  const totalFunds = sources.reduce((s, f) => s + f.amount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.sourceName || !form.amount) return toast.error('Fill all required fields')
    setSaving(true)
    try {
      await addDocument<FundingSource>(COLLECTIONS.FUNDING_SOURCES, {
        sourceName: form.sourceName,
        sourceType: form.sourceType,
        amount: parseFloat(form.amount),
        date: Timestamp.fromDate(new Date(form.date)),
        notes: form.notes,
        createdBy: userProfile?.id || '',
      } as Omit<FundingSource, 'id'>)

      toast.success('Funding source added!')
      setShowModal(false)
      setForm(initialForm)
      loadSources()
    } catch {
      toast.error('Failed to add funding source')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this funding source?')) return
    try {
      await deleteDocument(COLLECTIONS.FUNDING_SOURCES, id)
      setSources(prev => prev.filter(s => s.id !== id))
      toast.success('Deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const byType = FUNDING_TYPES.map(t => ({
    type: t.label,
    total: sources.filter(s => s.sourceType === t.value).reduce((s, f) => s + f.amount, 0),
  })).filter(t => t.total > 0)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Funding Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track all sources of project funding</p>
        </div>
        {isOwner && (
          <Button icon={<PlusCircle className="h-4 w-4" />} onClick={() => setShowModal(true)}>
            Add Funding Source
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <PiggyBank className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Funds</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalFunds)}</p>
            </div>
          </div>
        </Card>
        {byType.map(t => (
          <Card key={t.type}>
            <p className="text-sm text-gray-500">{t.type}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(t.total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{((t.total / totalFunds) * 100).toFixed(1)}% of total</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader title="Funding Sources" subtitle={`${sources.length} sources recorded`} />
        <Table<FundingSource & Record<string, unknown>>
          loading={loading}
          data={sources as (FundingSource & Record<string, unknown>)[]}
          emptyMessage="No funding sources yet. Add your first funding source."
          columns={[
            { key: 'sourceName', header: 'Source Name', render: r => <span className="font-medium">{r.sourceName}</span> },
            { key: 'sourceType', header: 'Type', render: r => <Badge variant="info">{getFundingTypeLabel(r.sourceType)}</Badge> },
            { key: 'amount', header: 'Amount', render: r => <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(r.amount)}</span> },
            { key: 'date', header: 'Date', render: r => formatDate(r.date as Timestamp) },
            { key: 'notes', header: 'Notes', render: r => <span className="text-gray-500 truncate max-w-xs block">{r.notes || '—'}</span> },
            {
              key: 'actions',
              header: 'Actions',
              render: r => isOwner ? (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id as string)} icon={<Trash2 className="h-4 w-4 text-red-500" />} />
              ) : null,
            },
          ]}
        />
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(initialForm) }}
        title="Add Funding Source"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Source Name" value={form.sourceName} onChange={e => setForm(p => ({ ...p, sourceName: e.target.value }))} required placeholder="e.g. Personal Savings" />
          <Select
            label="Source Type"
            options={FUNDING_TYPES}
            value={form.sourceType}
            onChange={e => setForm(p => ({ ...p, sourceType: e.target.value as typeof form.sourceType }))}
            required
          />
          <Input label="Amount (RWF)" type="number" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required placeholder="0" />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
        </form>
      </Modal>
    </div>
  )
}
