'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Download, FileSpreadsheet, FileText, BarChart3, Users, Package } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import {
  getFundingSources, getTransactions, getBudgetCategories, getWorkers,
  getCollection, COLLECTIONS, getMaterialTransactions
} from '@/lib/firebase/db'
import { formatCurrency, formatDate, getStageLabel, getTransactionTypeLabel } from '@/lib/utils'
import { orderBy } from 'firebase/firestore'
import type { Worker, AttendanceRecord } from '@/lib/types'
import { exportToExcel, exportFinancialReportPDF } from '@/lib/utils/export'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const { isOwner } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState<'financial' | 'workers' | 'materials'>('financial')

  const [financialData, setFinancialData] = useState({
    totalFunds: 0, totalSpent: 0, remaining: 0,
    byCategory: [] as { category: string; amount: number }[],
    byStage: [] as { stage: string; amount: number }[],
  })
  const [workerData, setWorkerData] = useState<{ worker: Worker; days: number; earned: number; paid: number; outstanding: number }[]>([])
  const [materialData, setMaterialData] = useState<{ name: string; unit: string; purchased: number; used: number; remaining: number }[]>([])

  const load = useCallback(async () => {
    try {
      const [sources, transactions, budgetCats, workers, attendance, matTxs, workers2, payments] = await Promise.all([
        getFundingSources(),
        getTransactions(),
        getBudgetCategories(),
        getWorkers(),
        getCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE, [orderBy('date', 'desc')]),
        getMaterialTransactions(),
        getWorkers(true),
        getCollection(COLLECTIONS.WORKER_PAYMENTS, [orderBy('paymentDate', 'desc')]),
      ])

      // Financial
      const totalFunds = sources.reduce((s, f) => s + f.amount, 0)
      const approved = transactions.filter(t => t.status === 'approved')
      const totalSpent = approved.reduce((s, t) => s + t.amount, 0)

      const catMap: Record<string, number> = {}
      const stageMap: Record<string, number> = {}
      approved.forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount
        stageMap[t.stage] = (stageMap[t.stage] || 0) + t.amount
      })

      setFinancialData({
        totalFunds,
        totalSpent,
        remaining: totalFunds - totalSpent,
        byCategory: Object.entries(catMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
        byStage: Object.entries(stageMap).map(([stage, amount]) => ({ stage, amount })).sort((a, b) => b.amount - a.amount),
      })

      // Workers
      const paidByWorker = new Map<string, number>()
      ;(payments as { workerId: string; amount: number }[]).forEach(p => {
        paidByWorker.set(p.workerId, (paidByWorker.get(p.workerId) || 0) + p.amount)
      })
      const attByWorker = new Map<string, AttendanceRecord[]>()
      attendance.forEach(a => {
        if (!attByWorker.has(a.workerId)) attByWorker.set(a.workerId, [])
        attByWorker.get(a.workerId)!.push(a)
      })
      setWorkerData(workers.map(w => {
        const recs = attByWorker.get(w.id) || []
        const days = recs.reduce((d, r) => d + (r.status === 'present' ? 1 : r.status === 'half_day' ? 0.5 : 0), 0)
        const earned = days * w.dailyRate
        const paid = paidByWorker.get(w.id) || 0
        return { worker: w, days, earned, paid, outstanding: Math.max(0, earned - paid) }
      }))

      // Materials
      const matStockMap = new Map<string, { name: string; unit: string; purchased: number; used: number }>()
      matTxs.forEach(tx => {
        if (!matStockMap.has(tx.materialId)) {
          matStockMap.set(tx.materialId, { name: tx.materialName, unit: '', purchased: 0, used: 0 })
        }
        const m = matStockMap.get(tx.materialId)!
        if (tx.transactionType === 'purchase') m.purchased += tx.quantity
        else if (tx.transactionType === 'usage') m.used += tx.quantity
      })
      setMaterialData(Array.from(matStockMap.values()).map(m => ({ ...m, remaining: m.purchased - m.used })))
    } catch { toast.error('Failed to load report data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleExportFinancialPDF = async () => {
    try {
      await exportFinancialReportPDF({
        totalFunds: financialData.totalFunds,
        totalSpent: financialData.totalSpent,
        remaining: financialData.remaining,
        categoryBreakdown: financialData.byCategory,
        transactions: [],
      })
      toast.success('PDF exported!')
    } catch { toast.error('Export failed') }
  }

  const handleExportFinancialExcel = async () => {
    try {
      const rows = [
        { Item: 'Total Funds', Amount: financialData.totalFunds },
        { Item: 'Total Spent', Amount: financialData.totalSpent },
        { Item: 'Remaining', Amount: financialData.remaining },
        ...financialData.byCategory.map(c => ({ Item: c.category, Amount: c.amount })),
      ]
      await exportToExcel(rows, 'financial-report', 'Financial')
      toast.success('Excel exported!')
    } catch { toast.error('Export failed') }
  }

  const handleExportWorkersExcel = async () => {
    try {
      const rows = workerData.map(w => ({
        Name: w.worker.fullName,
        Role: w.worker.role,
        'Daily Rate': w.worker.dailyRate,
        'Worked Days': w.days,
        Earned: w.earned,
        Paid: w.paid,
        Outstanding: w.outstanding,
      }))
      await exportToExcel(rows, 'worker-report', 'Workers')
      toast.success('Excel exported!')
    } catch { toast.error('Export failed') }
  }

  const handleExportMaterialsExcel = async () => {
    try {
      const rows = materialData.map(m => ({
        Material: m.name,
        Purchased: m.purchased,
        Used: m.used,
        Remaining: m.remaining,
      }))
      await exportToExcel(rows, 'materials-report', 'Materials')
      toast.success('Excel exported!')
    } catch { toast.error('Export failed') }
  }

  const tabs = [
    { id: 'financial' as const, label: 'Financial Report', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'workers' as const, label: 'Worker Report', icon: <Users className="h-4 w-4" /> },
    { id: 'materials' as const, label: 'Material Report', icon: <Package className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive project analysis and exports</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === tab.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <>
          {/* Financial Report */}
          {activeReport === 'financial' && (
            <div className="space-y-4">
              <Card>
                <CardHeader
                  title="Financial Summary"
                  actions={
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" icon={<FileText className="h-3.5 w-3.5" />} onClick={handleExportFinancialPDF}>PDF</Button>
                      <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={handleExportFinancialExcel}>Excel</Button>
                    </div>
                  }
                />
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-xs text-gray-500">Total Funds</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">{formatCurrency(financialData.totalFunds)}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <p className="text-xs text-gray-500">Total Spent</p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-400 mt-1">{formatCurrency(financialData.totalSpent)}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className={`text-xl font-bold mt-1 ${financialData.remaining < 0 ? 'text-red-700' : 'text-green-700 dark:text-green-400'}`}>{formatCurrency(financialData.remaining)}</p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader title="Spending by Category" />
                  <div className="space-y-2">
                    {financialData.byCategory.map(c => (
                      <div key={c.category} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{c.category}</span>
                        <span className="font-semibold text-sm">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                    {financialData.byCategory.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No spending data</p>}
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Spending by Stage" />
                  <div className="space-y-2">
                    {financialData.byStage.map(s => (
                      <div key={s.stage} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <Badge variant="info">{getStageLabel(s.stage)}</Badge>
                        <span className="font-semibold text-sm">{formatCurrency(s.amount)}</span>
                      </div>
                    ))}
                    {financialData.byStage.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No stage data</p>}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Worker Report */}
          {activeReport === 'workers' && (
            <Card>
              <CardHeader
                title="Worker Report"
                subtitle={`${workerData.length} workers`}
                actions={
                  <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={handleExportWorkersExcel}>Export Excel</Button>
                }
              />
              <div className="space-y-3">
                {workerData.map(w => (
                  <div key={w.worker.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{w.worker.fullName}</p>
                      <p className="text-xs text-gray-500">{w.worker.role} · {formatCurrency(w.worker.dailyRate)}/day</p>
                    </div>
                    <div className="flex gap-4 text-center text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Days</p>
                        <p className="font-bold">{w.days}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Earned</p>
                        <p className="font-bold">{formatCurrency(w.earned)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="font-bold text-green-600">{formatCurrency(w.paid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Due</p>
                        <p className={`font-bold ${w.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(w.outstanding)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {workerData.length === 0 && <p className="text-center text-gray-400 py-8">No worker data</p>}
              </div>
            </Card>
          )}

          {/* Materials Report */}
          {activeReport === 'materials' && (
            <Card>
              <CardHeader
                title="Materials Report"
                subtitle={`${materialData.length} materials tracked`}
                actions={
                  <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={handleExportMaterialsExcel}>Export Excel</Button>
                }
              />
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left text-xs font-medium text-gray-500 py-2 pr-4">Material</th>
                      <th className="text-right text-xs font-medium text-gray-500 py-2 px-4">Purchased</th>
                      <th className="text-right text-xs font-medium text-gray-500 py-2 px-4">Used</th>
                      <th className="text-right text-xs font-medium text-gray-500 py-2 px-4">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialData.map(m => (
                      <tr key={m.name} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-sm">{m.name}</td>
                        <td className="py-2.5 px-4 text-right text-sm text-green-600">{m.purchased}</td>
                        <td className="py-2.5 px-4 text-right text-sm text-orange-600">{m.used}</td>
                        <td className="py-2.5 px-4 text-right text-sm font-bold">{m.remaining}</td>
                      </tr>
                    ))}
                    {materialData.length === 0 && (
                      <tr><td colSpan={4} className="text-center text-gray-400 py-8">No material transactions</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
