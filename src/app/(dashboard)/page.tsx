'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  DollarSign, TrendingDown, Wallet, BarChart2,
  Users, AlertTriangle, Package, Receipt, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { StatCard, Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import {
  getTotalFunds, getTotalSpent, getBudgetCategories, getTransactions,
  getMaterials, getWorkers, getAttendanceByDate, getWorkerPayments,
  getFundingSources
} from '@/lib/firebase/db'
import { formatCurrency, formatDate, getStageLabel, todayString } from '@/lib/utils'
import { rw } from '@/lib/utils/kinyarwanda'
import type { Transaction, Material, Worker } from '@/lib/types'

const STAGE_ORDER = ['planning','site_preparation','foundation','walls','roofing','electrical','plumbing','finishing','complete']
const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899']

export default function DashboardPage() {
  const { userProfile, isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor

  const [stats, setStats] = useState({
    totalFunds: 0, totalSpent: 0, totalBudget: 0,
    workersToday: 0, outstandingPayments: 0, lowStockCount: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [categorySpending, setCategorySpending] = useState<{ name: string; budget: number; spent: number }[]>([])
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([])
  const [lowStockItems, setLowStockItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [totalFunds, totalSpent, budgetCats, txs, materials, workers, attendance, payments, sources] = await Promise.all([
        getTotalFunds(),
        getTotalSpent(),
        getBudgetCategories(),
        getTransactions(),
        getMaterials(),
        getWorkers(true),
        getAttendanceByDate(todayString()),
        getWorkerPayments(),
        getFundingSources(),
      ])

      const lowStock = materials.filter(m => m.currentStock <= m.minimumStock)
      const presentToday = attendance.filter(a => a.status === 'present' || a.status === 'half_day').length

      // Calculate outstanding payments
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
      const totalEarned = workers.reduce((s, w) => {
        const workerAttendance = attendance.filter(a => a.workerId === w.id)
        const days = workerAttendance.reduce((d, a) => d + (a.status === 'present' ? 1 : a.status === 'half_day' ? 0.5 : 0), 0)
        return s + days * w.dailyRate
      }, 0)

      const totalBudget = budgetCats.reduce((s, c) => s + c.plannedBudget, 0)

      setStats({
        totalFunds,
        totalSpent,
        totalBudget,
        workersToday: presentToday,
        outstandingPayments: Math.max(0, totalEarned - totalPaid),
        lowStockCount: lowStock.length,
      })

      setLowStockItems(lowStock.slice(0, 3))
      setRecentTransactions(txs.slice(0, 6))

      // Category spending chart
      const approvedTxs = txs.filter(t => t.status === 'approved')
      const spendingMap: Record<string, number> = {}
      approvedTxs.forEach(t => {
        spendingMap[t.category] = (spendingMap[t.category] || 0) + t.amount
      })
      const catChart = budgetCats.map(c => ({
        name: c.categoryName,
        budget: c.plannedBudget,
        spent: spendingMap[c.categoryName] || 0,
      }))
      setCategorySpending(catChart)

      // Pie chart — spending by category
      const pieItems = Object.entries(spendingMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }))
      setPieData(pieItems)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const remaining = stats.totalFunds - stats.totalSpent

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="page-title">
          {useKinyarwanda ? rw.dashboard.title : 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {useKinyarwanda ? `${rw.dashboard.welcomeBack}, ${userProfile?.fullName}` : `Welcome back, ${userProfile?.fullName}`}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={useKinyarwanda ? 'Ingengo Yose' : 'Total Budget'}
          value={formatCurrency(stats.totalBudget)}
          icon={<BarChart2 className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={useKinyarwanda ? 'Amafaranga Afite' : 'Available Funds'}
          value={formatCurrency(stats.totalFunds)}
          icon={<Wallet className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title={useKinyarwanda ? 'Amafaranga Agiye' : 'Total Spent'}
          value={formatCurrency(stats.totalSpent)}
          icon={<TrendingDown className="h-5 w-5" />}
          color="orange"
        />
        <StatCard
          title={useKinyarwanda ? 'Amafaranga Asigaye' : 'Remaining'}
          value={formatCurrency(remaining)}
          icon={<DollarSign className="h-5 w-5" />}
          color={remaining < 0 ? 'red' : 'purple'}
        />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title={useKinyarwanda ? rw.dashboard.workersToday : 'Workers Today'}
          value={stats.workersToday}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={useKinyarwanda ? 'Ubwishyu Busigaye' : 'Outstanding Pay'}
          value={formatCurrency(stats.outstandingPayments)}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="orange"
        />
        <StatCard
          title={useKinyarwanda ? 'Ibikoresho Buke' : 'Low Stock Items'}
          value={stats.lowStockCount}
          icon={<Package className="h-5 w-5" />}
          color={stats.lowStockCount > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget vs Actual */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={useKinyarwanda ? 'Ingengo vs Amafaranga Agiye' : 'Budget vs Actual Spending'}
          />
          {categorySpending.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No budget data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categorySpending} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="budget" fill="#bfdbfe" radius={[4,4,0,0]} name="Budget" />
                <Bar dataKey="spent" fill="#3b82f6" radius={[4,4,0,0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Spending breakdown pie */}
        <Card>
          <CardHeader title={useKinyarwanda ? 'Amafaranga ku Icyiciro' : 'Spending Breakdown'} />
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No spending data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <Card>
          <CardHeader
            title={useKinyarwanda ? 'Ibikorwa Biheruka' : 'Recent Transactions'}
            actions={
              <Link href="/transactions" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
            ) : (
              recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                      <Receipt className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(tx.date)} · {tx.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(tx.amount)}</span>
                    <Badge variant={tx.status === 'approved' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Low stock + alerts */}
        <Card>
          <CardHeader
            title={useKinyarwanda ? 'Imenyesha' : 'Alerts & Low Stock'}
            actions={
              <Link href="/materials" className="text-xs text-primary-600 flex items-center gap-1 font-medium">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {lowStockItems.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">
              All materials are well stocked
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-red-600">
                        {useKinyarwanda ? 'Isigaye:' : 'Remaining:'} {m.currentStock} {m.unit}
                        {' · '}{useKinyarwanda ? 'Ibura:' : 'Min:'} {m.minimumStock} {m.unit}
                      </p>
                    </div>
                  </div>
                  <Badge variant="danger" dot>{useKinyarwanda ? 'Buke' : 'Low'}</Badge>
                </div>
              ))}
            </div>
          )}

          {remaining < stats.totalBudget * 0.1 && (
            <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                  {useKinyarwanda ? 'Amafaranga ari make! Isigaye:' : 'Low cash balance! Remaining:'} {formatCurrency(remaining)}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
