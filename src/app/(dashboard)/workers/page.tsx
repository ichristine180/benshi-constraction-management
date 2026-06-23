'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { PlusCircle, Pencil, HardHat, Phone, UserCheck, UserX } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { getWorkers, addDocument, updateDocument, COLLECTIONS } from '@/lib/firebase/db'
import { formatCurrency, getWorkerRoleLabel } from '@/lib/utils'
import { rw } from '@/lib/utils/kinyarwanda'
import type { Worker, WorkerRole } from '@/lib/types'
import toast from 'react-hot-toast'

const ROLES: { value: WorkerRole; label: string }[] = [
  { value: 'mason', label: 'Mason (Umunyamakara)' },
  { value: 'carpenter', label: 'Carpenter (Umubaji)' },
  { value: 'electrician', label: 'Electrician (Amashanyarazi)' },
  { value: 'helper', label: 'Helper (Umufasha)' },
  { value: 'welder', label: 'Welder (Gusoma Metali)' },
  { value: 'plumber', label: 'Plumber (Amazi)' },
  { value: 'painter', label: 'Painter (Isura)' },
  { value: 'other', label: 'Other (Ikindi)' },
]

const blankForm = { fullName: '', phone: '', role: 'mason' as WorkerRole, dailyRate: '', active: true }

export default function WorkersPage() {
  const { isSiteManager, isSupervisor, isOwner } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor
  const canEdit = isOwner || isSiteManager

  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Worker | null>(null)
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const load = useCallback(async () => {
    try {
      const data = await getWorkers()
      setWorkers(data)
    } catch { toast.error('Failed to load workers') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = workers.filter(w =>
    filter === 'all' ? true : filter === 'active' ? w.active : !w.active
  )

  const openAdd = () => { setEditing(null); setForm(blankForm); setShowModal(true) }
  const openEdit = (w: Worker) => {
    setEditing(w)
    setForm({ fullName: w.fullName, phone: w.phone, role: w.role, dailyRate: String(w.dailyRate), active: w.active })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.dailyRate) return toast.error('Fill required fields')
    setSaving(true)
    try {
      const data = {
        fullName: form.fullName,
        phone: form.phone,
        role: form.role,
        dailyRate: parseFloat(form.dailyRate),
        active: form.active,
      }
      if (editing) {
        await updateDocument(COLLECTIONS.WORKERS, editing.id, data)
        toast.success('Worker updated!')
      } else {
        await addDocument(COLLECTIONS.WORKERS, data)
        toast.success('Worker added!')
      }
      setShowModal(false)
      load()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{useKinyarwanda ? rw.workers.title : 'Workers'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {workers.filter(w => w.active).length} {useKinyarwanda ? 'bakora' : 'active'} · {workers.length} {useKinyarwanda ? 'bose' : 'total'}
          </p>
        </div>
        {canEdit && (
          <Button icon={<PlusCircle className="h-4 w-4" />} onClick={openAdd}>
            {useKinyarwanda ? rw.workers.addWorker : 'Add Worker'}
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            {f === 'all' ? (useKinyarwanda ? 'Bose' : 'All') : f === 'active' ? (useKinyarwanda ? rw.workers.active : 'Active') : (useKinyarwanda ? rw.workers.inactive : 'Inactive')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-3">
              <div className="text-center py-8">
                <HardHat className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{useKinyarwanda ? 'Nta bakozi babonetse' : 'No workers found'}</p>
              </div>
            </Card>
          )}
          {filtered.map(w => (
            <Card key={w.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${w.active ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <HardHat className={`h-5 w-5 ${w.active ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{w.fullName}</p>
                    <p className="text-sm text-gray-500">{getWorkerRoleLabel(w.role)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={w.active ? 'success' : 'default'} dot>
                    {w.active ? (useKinyarwanda ? 'Akora' : 'Active') : (useKinyarwanda ? 'Ntakora' : 'Inactive')}
                  </Badge>
                  {canEdit && (
                    <button onClick={() => openEdit(w)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {w.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4" />
                    <span>{w.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{useKinyarwanda ? 'Umushahara/Umunsi' : 'Daily Rate'}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(w.dailyRate)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? (useKinyarwanda ? rw.workers.editWorker : 'Edit Worker') : (useKinyarwanda ? rw.workers.addWorker : 'Add Worker')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{useKinyarwanda ? rw.common.cancel : 'Cancel'}</Button>
            <Button loading={saving} onClick={handleSubmit}>{useKinyarwanda ? rw.common.save : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={useKinyarwanda ? rw.workers.fullName : 'Full Name'}
            value={form.fullName}
            onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
            required
            placeholder="John Doe"
          />
          <Input
            label={useKinyarwanda ? rw.workers.phone : 'Phone'}
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            placeholder="078xxxxxxx"
          />
          <Select
            label={useKinyarwanda ? rw.workers.role : 'Role'}
            options={ROLES}
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value as WorkerRole }))}
            required
          />
          <Input
            label={useKinyarwanda ? rw.workers.dailyRate : 'Daily Rate (RWF)'}
            type="number"
            min="0"
            value={form.dailyRate}
            onChange={e => setForm(p => ({ ...p, dailyRate: e.target.value }))}
            required
            placeholder="5000"
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {useKinyarwanda ? 'Akora ubu' : 'Currently Active'}
            </label>
          </div>
        </form>
      </Modal>
    </div>
  )
}
