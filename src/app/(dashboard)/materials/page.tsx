'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { PlusCircle, Pencil, ShoppingCart, Wrench, AlertTriangle, Package } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { useAuth } from '@/contexts/AuthContext'
import {
  getMaterials, getMaterialTransactions, addDocument, updateDocument,
  updateMaterialStock, COLLECTIONS
} from '@/lib/firebase/db'
import { formatCurrency, formatDate, getStageLabel } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import { rw } from '@/lib/utils/kinyarwanda'
import type { Material, MaterialTransaction, MaterialTransactionType, MaterialUnit, ConstructionStage } from '@/lib/types'
import toast from 'react-hot-toast'

const UNITS: { value: MaterialUnit; label: string }[] = [
  { value: 'bags', label: 'Bags (Amasaho)' },
  { value: 'pieces', label: 'Pieces (Ibikingi)' },
  { value: 'tonnes', label: 'Tonnes (Tone)' },
  { value: 'litres', label: 'Litres (Litiro)' },
  { value: 'meters', label: 'Meters (Metero)' },
  { value: 'sqm', label: 'Square Meters (m²)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'units', label: 'Units' },
]

const STAGES: { value: ConstructionStage; label: string }[] = [
  { value: 'foundation', label: 'Foundation' }, { value: 'walls', label: 'Walls' },
  { value: 'roofing', label: 'Roofing' }, { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' }, { value: 'finishing', label: 'Finishing' },
]

export default function MaterialsPage() {
  const { userProfile, isOwner, isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor
  const canEdit = isOwner || isSiteManager

  const [materials, setMaterials] = useState<Material[]>([])
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions' | 'add'>('inventory')

  // Add material form
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [materialForm, setMaterialForm] = useState({ name: '', unit: 'bags' as MaterialUnit, currentStock: '', minimumStock: '10', unitPrice: '' })

  // Transaction form
  const [showTxModal, setShowTxModal] = useState(false)
  const [txType, setTxType] = useState<'purchase' | 'usage'>('purchase')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [txForm, setTxForm] = useState({ quantity: '', unitPrice: '', supplier: '', stage: 'foundation' as ConstructionStage, notes: '', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [mats, txs] = await Promise.all([getMaterials(), getMaterialTransactions()])
      setMaterials(mats)
      setTransactions(txs)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const lowStockItems = materials.filter(m => m.currentStock <= m.minimumStock)

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialForm.name) return toast.error('Material name required')
    setSaving(true)
    try {
      const data = {
        name: materialForm.name,
        unit: materialForm.unit,
        currentStock: parseFloat(materialForm.currentStock) || 0,
        minimumStock: parseFloat(materialForm.minimumStock) || 10,
        unitPrice: parseFloat(materialForm.unitPrice) || 0,
      }
      if (editingMaterial) {
        await updateDocument(COLLECTIONS.MATERIALS, editingMaterial.id, data)
        toast.success('Updated!')
      } else {
        await addDocument(COLLECTIONS.MATERIALS, data)
        toast.success('Material added!')
      }
      setShowMaterialModal(false)
      load()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMaterial || !txForm.quantity) return toast.error('Fill required fields')
    setSaving(true)
    try {
      const mat = materials.find(m => m.id === selectedMaterial)
      if (!mat) return
      const qty = parseFloat(txForm.quantity)
      const unitPrice = parseFloat(txForm.unitPrice) || mat.unitPrice

      const txData: Omit<MaterialTransaction, 'id'> = {
        materialId: mat.id,
        materialName: mat.name,
        transactionType: txType,
        quantity: qty,
        unitPrice,
        notes: txForm.notes,
        date: Timestamp.fromDate(new Date(txForm.date)),
        createdBy: userProfile?.id || '',
        ...(txType === 'purchase' && { totalCost: qty * unitPrice }),
        ...(txType === 'purchase' && txForm.supplier && { supplier: txForm.supplier }),
        ...(txType === 'usage' && txForm.stage && { stage: txForm.stage }),
      }

      await addDocument<MaterialTransaction>(COLLECTIONS.MATERIAL_TRANSACTIONS, txData)

      // Update stock
      const delta = txType === 'purchase' ? qty : -qty
      await updateMaterialStock(selectedMaterial, delta)

      toast.success(txType === 'purchase' ? (useKinyarwanda ? 'Kugura byabitswe!' : 'Purchase recorded!') : (useKinyarwanda ? 'Ikoreshwa ryabitswe!' : 'Usage recorded!'))
      setShowTxModal(false)
      load()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const materialOptions = materials.map(m => ({ value: m.id, label: `${m.name} (${m.currentStock} ${m.unit})` }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{useKinyarwanda ? rw.materials.title : 'Materials'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {materials.length} materials · {lowStockItems.length} low stock
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={<ShoppingCart className="h-4 w-4" />} onClick={() => { setTxType('purchase'); setShowTxModal(true) }}>
              {useKinyarwanda ? rw.materials.recordPurchase : 'Record Purchase'}
            </Button>
            <Button variant="outline" icon={<Wrench className="h-4 w-4" />} onClick={() => { setTxType('usage'); setShowTxModal(true) }}>
              {useKinyarwanda ? rw.materials.recordUsage : 'Record Usage'}
            </Button>
            <Button icon={<PlusCircle className="h-4 w-4" />} onClick={() => { setEditingMaterial(null); setMaterialForm({ name: '', unit: 'bags', currentStock: '', minimumStock: '10', unitPrice: '' }); setShowMaterialModal(true) }}>
              {useKinyarwanda ? rw.materials.addMaterial : 'Add Material'}
            </Button>
          </div>
        )}
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="font-semibold text-red-800 dark:text-red-300">
              {useKinyarwanda ? 'Ibikoresho Biri Buke!' : 'Low Stock Alert!'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(m => (
              <Badge key={m.id} variant="danger" dot>{m.name}: {m.currentStock} {m.unit}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['inventory', 'transactions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'inventory'
              ? (useKinyarwanda ? 'Ububiko' : 'Inventory')
              : (useKinyarwanda ? 'Amateka' : 'Transactions')}
          </button>
        ))}
      </div>

      {activeTab === 'inventory' && (
        loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map(m => {
            const isLow = m.currentStock <= m.minimumStock
            const txs = transactions.filter(t => t.materialId === m.id)
            const totalPurchased = txs.filter(t => t.transactionType === 'purchase').reduce((s, t) => s + t.quantity, 0)
            const totalUsed = txs.filter(t => t.transactionType === 'usage').reduce((s, t) => s + t.quantity, 0)

            return (
              <Card key={m.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isLow ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      <Package className={`h-5 w-5 ${isLow ? 'text-red-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{m.name}</p>
                      {isLow && <Badge variant="danger" dot>{useKinyarwanda ? 'Buke' : 'Low Stock'}</Badge>}
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => { setEditingMaterial(m); setMaterialForm({ name: m.name, unit: m.unit, currentStock: String(m.currentStock), minimumStock: String(m.minimumStock), unitPrice: String(m.unitPrice) }); setShowMaterialModal(true) }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">{useKinyarwanda ? 'Yaguriwe' : 'Purchased'}</p>
                      <p className="font-bold text-gray-900 dark:text-white">{totalPurchased}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{useKinyarwanda ? 'Yakoreshejwe' : 'Used'}</p>
                      <p className="font-bold text-gray-900 dark:text-white">{totalUsed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{useKinyarwanda ? 'Isigaye' : 'Stock'}</p>
                      <p className={`font-bold ${isLow ? 'text-red-600' : 'text-green-600'}`}>{m.currentStock}</p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{useKinyarwanda ? 'Ingano' : 'Unit'}</span>
                    <span className="font-medium">{m.unit}</span>
                  </div>
                  {m.unitPrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{useKinyarwanda ? 'Igiciro/Igice' : 'Unit Price'}</span>
                      <span className="font-medium">{formatCurrency(m.unitPrice)}</span>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
          {materials.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-3">
              <div className="text-center py-6">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{useKinyarwanda ? 'Nta bikoresho bibonetse' : 'No materials yet'}</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <Card>
          <Table<MaterialTransaction & Record<string, unknown>>
            loading={loading}
            data={transactions as (MaterialTransaction & Record<string, unknown>)[]}
            emptyMessage="No material transactions yet"
            columns={[
              { key: 'date', header: 'Date', render: r => formatDate(r.date as Timestamp) },
              { key: 'materialName', header: 'Material', render: r => <span className="font-medium">{r.materialName}</span> },
              {
                key: 'transactionType',
                header: 'Type',
                render: r => <Badge variant={r.transactionType === 'purchase' ? 'success' : r.transactionType === 'usage' ? 'warning' : 'info'}>
                  {r.transactionType === 'purchase' ? (useKinyarwanda ? 'Kugura' : 'Purchase') : r.transactionType === 'usage' ? (useKinyarwanda ? 'Ikoreshwa' : 'Usage') : 'Adjustment'}
                </Badge>,
              },
              { key: 'quantity', header: 'Qty', render: r => `${r.quantity}` },
              { key: 'totalCost', header: 'Cost', render: r => r.totalCost ? formatCurrency(r.totalCost as number) : '—' },
              { key: 'supplier', header: 'Supplier', render: r => r.supplier || '—' },
              { key: 'notes', header: 'Notes', render: r => <span className="text-gray-500 text-xs truncate max-w-xs block">{r.notes || '—'}</span> },
            ]}
          />
        </Card>
      )}

      {/* Add/Edit Material Modal */}
      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title={editingMaterial ? (useKinyarwanda ? 'Hindura Ikigoresho' : 'Edit Material') : (useKinyarwanda ? rw.materials.addMaterial : 'Add Material')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowMaterialModal(false)}>{useKinyarwanda ? rw.common.cancel : 'Cancel'}</Button>
            <Button loading={saving} onClick={handleSaveMaterial}>{useKinyarwanda ? rw.common.save : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={handleSaveMaterial} className="space-y-4">
          <Input label={useKinyarwanda ? rw.materials.name : 'Material Name'} value={materialForm.name} onChange={e => setMaterialForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Cement" />
          <div className="form-grid">
            <Select label={useKinyarwanda ? rw.materials.unit : 'Unit'} options={UNITS} value={materialForm.unit} onChange={e => setMaterialForm(p => ({ ...p, unit: e.target.value as MaterialUnit }))} required />
            <Input label={useKinyarwanda ? rw.materials.currentStock : 'Initial Stock'} type="number" min="0" value={materialForm.currentStock} onChange={e => setMaterialForm(p => ({ ...p, currentStock: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-grid">
            <Input label={useKinyarwanda ? 'Ingano y\'Ibura' : 'Minimum Stock'} type="number" min="0" value={materialForm.minimumStock} onChange={e => setMaterialForm(p => ({ ...p, minimumStock: e.target.value }))} />
            <Input label={useKinyarwanda ? rw.materials.unitPrice : 'Unit Price (RWF)'} type="number" min="0" value={materialForm.unitPrice} onChange={e => setMaterialForm(p => ({ ...p, unitPrice: e.target.value }))} placeholder="0" />
          </div>
        </form>
      </Modal>

      {/* Purchase/Usage Modal */}
      <Modal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        title={txType === 'purchase' ? (useKinyarwanda ? rw.materials.recordPurchase : 'Record Purchase') : (useKinyarwanda ? rw.materials.recordUsage : 'Record Usage')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTxModal(false)}>{useKinyarwanda ? rw.common.cancel : 'Cancel'}</Button>
            <Button loading={saving} onClick={handleTransaction} variant={txType === 'purchase' ? 'primary' : 'secondary'}>
              {useKinyarwanda ? rw.common.save : 'Save'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleTransaction} className="space-y-4">
          <div className="flex gap-2 mb-2">
            {(['purchase', 'usage'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTxType(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${txType === t ? (t === 'purchase' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white') : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>
                {t === 'purchase' ? (useKinyarwanda ? 'Kugura' : 'Purchase') : (useKinyarwanda ? 'Ikoreshwa' : 'Usage')}
              </button>
            ))}
          </div>
          <Select label={useKinyarwanda ? 'Ikigoresho' : 'Material'} options={materialOptions} value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)} placeholder="Select material" required />
          <div className="form-grid">
            <Input label={useKinyarwanda ? rw.materials.quantity : 'Quantity'} type="number" min="0.1" step="0.1" value={txForm.quantity} onChange={e => setTxForm(p => ({ ...p, quantity: e.target.value }))} required placeholder="0" />
            {txType === 'purchase' && <Input label={useKinyarwanda ? 'Igiciro/Igice (RWF)' : 'Unit Price (RWF)'} type="number" min="0" value={txForm.unitPrice} onChange={e => setTxForm(p => ({ ...p, unitPrice: e.target.value }))} placeholder="0" />}
          </div>
          {txType === 'purchase' && (
            <Input label={useKinyarwanda ? rw.materials.supplier : 'Supplier'} value={txForm.supplier} onChange={e => setTxForm(p => ({ ...p, supplier: e.target.value }))} placeholder="Supplier name" />
          )}
          {txType === 'usage' && (
            <Select label={useKinyarwanda ? rw.materials.stage : 'Stage'} options={STAGES} value={txForm.stage} onChange={e => setTxForm(p => ({ ...p, stage: e.target.value as ConstructionStage }))} />
          )}
          <Input label={useKinyarwanda ? rw.common.date : 'Date'} type="date" value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))} required />
          <Textarea label={useKinyarwanda ? rw.common.notes : 'Notes'} value={txForm.notes} onChange={e => setTxForm(p => ({ ...p, notes: e.target.value }))} />
        </form>
      </Modal>
    </div>
  )
}
