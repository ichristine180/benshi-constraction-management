'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { PlusCircle, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import {
  getBudgetCategories, getSpendingByCategory,
  addDocument, updateDocument, deleteDocument, COLLECTIONS
} from '@/lib/firebase/db'
import { formatCurrency, percentOf } from '@/lib/utils'
import type { BudgetCategory } from '@/lib/types'
import toast from 'react-hot-toast'

const DEFAULT_CATEGORIES = [
  'Foundation', 'Bricks', 'Cement', 'Roofing', 'Electrical',
  'Plumbing', 'Doors & Windows', 'Finishing', 'Labor', 'Transport', 'Miscellaneous'
]

export default function BudgetPage() {
  const { isOwner } = useAuth()
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [spendingMap, setSpendingMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BudgetCategory | null>(null)
  const [form, setForm] = useState({ categoryName: '', plannedBudget: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [cats, spending] = await Promise.all([getBudgetCategories(), getSpendingByCategory()])
      setCategories(cats)
      setSpendingMap(spending)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalBudget = categories.reduce((s, c) => s + c.plannedBudget, 0)
  const totalSpent = categories.reduce((s, c) => s + (spendingMap[c.categoryName] || 0), 0)

  const openAdd = () => { setEditing(null); setForm({ categoryName: '', plannedBudget: '' }); setShowModal(true) }
  const openEdit = (c: BudgetCategory) => { setEditing(c); setForm({ categoryName: c.categoryName, plannedBudget: String(c.plannedBudget) }); setShowModal(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.categoryName || !form.plannedBudget) return toast.error('Fill all fields')
    setSaving(true)
    try {
      const data = { categoryName: form.categoryName, plannedBudget: parseFloat(form.plannedBudget) }
      if (editing) {
        await updateDocument(COLLECTIONS.BUDGET_CATEGORIES, editing.id, data)
        toast.success('Updated!')
      } else {
        await addDocument(COLLECTIONS.BUDGET_CATEGORIES, data)
        toast.success('Category added!')
      }
      setShowModal(false)
      load()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return
    await deleteDocument(COLLECTIONS.BUDGET_CATEGORIES, id)
    load()
    toast.success('Deleted')
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget Management</h1>
          <p className="text-sm text-gray-500 mt-1">Plan and track budget by category</p>
        </div>
        {isOwner && (
          <Button icon={<PlusCircle className="h-4 w-4" />} onClick={openAdd}>Add Category</Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalBudget)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(totalSpent)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Remaining</p>
          <p className={`text-xl font-bold mt-1 ${totalBudget - totalSpent < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(totalBudget - totalSpent)}
          </p>
        </Card>
      </div>

      {/* Overall progress */}
      <Card>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Budget Usage</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{percentOf(totalSpent, totalBudget)}%</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${percentOf(totalSpent, totalBudget) > 90 ? 'bg-red-500' : percentOf(totalSpent, totalBudget) > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(100, percentOf(totalSpent, totalBudget))}%` }}
          />
        </div>
      </Card>

      {/* Category cards */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => {
            const spent = spendingMap[cat.categoryName] || 0
            const pct = percentOf(spent, cat.plannedBudget)
            const over = spent > cat.plannedBudget
            return (
              <Card key={cat.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{cat.categoryName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {over && <Badge variant="danger" dot>Over Budget</Badge>}
                      {!over && pct > 80 && <Badge variant="warning" dot>Near Limit</Badge>}
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(cat)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-medium">{formatCurrency(cat.plannedBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Spent</span>
                    <span className={`font-medium ${over ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(spent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remaining</span>
                    <span className={`font-semibold ${over ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(cat.plannedBudget - spent)}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span><span>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </Card>
            )
          })}

          {/* Seed button for empty state */}
          {categories.length === 0 && isOwner && (
            <Card className="sm:col-span-2 lg:col-span-3">
              <div className="text-center py-6">
                <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No budget categories yet</p>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    for (const name of DEFAULT_CATEGORIES) {
                      await addDocument(COLLECTIONS.BUDGET_CATEGORIES, { categoryName: name, plannedBudget: 0 })
                    }
                    load()
                    toast.success('Default categories created!')
                  }}
                >
                  Create Default Categories
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Budget Category' : 'Add Budget Category'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            value={form.categoryName}
            onChange={e => setForm(p => ({ ...p, categoryName: e.target.value }))}
            required
            placeholder="e.g. Foundation"
          />
          <Input
            label="Planned Budget (RWF)"
            type="number"
            min="0"
            value={form.plannedBudget}
            onChange={e => setForm(p => ({ ...p, plannedBudget: e.target.value }))}
            required
            placeholder="0"
          />
        </form>
      </Modal>
    </div>
  )
}
