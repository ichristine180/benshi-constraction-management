'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { CalendarCheck, CheckCircle2, Clock, XCircle, Save } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { getWorkers, getAttendanceByDate, saveAttendance, getCollection, COLLECTIONS } from '@/lib/firebase/db'
import { todayString, formatDate } from '@/lib/utils'
import { rw } from '@/lib/utils/kinyarwanda'
import type { Worker, AttendanceRecord, AttendanceStatus } from '@/lib/types'
import { orderBy } from 'firebase/firestore'
import toast from 'react-hot-toast'

type AttendanceEntry = { worker: Worker; status: AttendanceStatus }

export default function AttendancePage() {
  const { userProfile, isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor

  const [date, setDate] = useState(todayString())
  const [workers, setWorkers] = useState<Worker[]>([])
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record')

  const loadWorkers = useCallback(async () => {
    const data = await getWorkers(true)
    setWorkers(data)
    return data
  }, [])

  const loadAttendance = useCallback(async (selectedDate: string, workerList: Worker[]) => {
    const existing = await getAttendanceByDate(selectedDate)
    const existingMap = new Map(existing.map(r => [r.workerId, r.status]))
    setEntries(workerList.map(w => ({
      worker: w,
      status: existingMap.get(w.id) || 'present',
    })))
  }, [])

  const loadHistory = useCallback(async () => {
    const data = await getCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE, [orderBy('date', 'desc')])
    setHistory(data.slice(0, 50))
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const workerList = await loadWorkers()
        await Promise.all([loadAttendance(date, workerList), loadHistory()])
      } catch { toast.error(useKinyarwanda ? rw.errors.loadFailed : 'Failed to load') }
      finally { setLoading(false) }
    }
    init()
  }, [loadWorkers, loadAttendance, loadHistory, date, useKinyarwanda])

  const setStatus = (workerId: string, status: AttendanceStatus) => {
    setEntries(prev => prev.map(e => e.worker.id === workerId ? { ...e, status } : e))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAttendance(
        entries.map(e => ({
          workerId: e.worker.id,
          workerName: e.worker.fullName,
          date,
          status: e.status,
          recordedBy: userProfile?.id || '',
        }))
      )
      toast.success(useKinyarwanda ? rw.attendance.successSaved : 'Attendance saved!')
      loadHistory()
    } catch { toast.error(useKinyarwanda ? rw.errors.saveFailed : 'Save failed') }
    finally { setSaving(false) }
  }

  const counts = {
    present: entries.filter(e => e.status === 'present').length,
    halfDay: entries.filter(e => e.status === 'half_day').length,
    absent: entries.filter(e => e.status === 'absent').length,
  }

  const statusConfig: Record<AttendanceStatus, { label: string; labelRw: string; icon: React.ReactNode; active: string; badge: 'success' | 'warning' | 'danger' }> = {
    present: { label: 'Present', labelRw: rw.attendance.present, icon: <CheckCircle2 className="h-4 w-4" />, active: 'bg-green-500 text-white', badge: 'success' },
    half_day: { label: 'Half Day', labelRw: rw.attendance.halfDay, icon: <Clock className="h-4 w-4" />, active: 'bg-yellow-500 text-white', badge: 'warning' },
    absent: { label: 'Absent', labelRw: rw.attendance.absent, icon: <XCircle className="h-4 w-4" />, active: 'bg-red-500 text-white', badge: 'danger' },
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {useKinyarwanda ? rw.attendance.title : 'Attendance'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {useKinyarwanda ? 'Andika kwitabira kw\'abakozi buri munsi' : 'Record daily worker attendance'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['record', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'record'
              ? (useKinyarwanda ? rw.attendance.recordTitle : 'Record Attendance')
              : (useKinyarwanda ? rw.attendance.history : 'History')}
          </button>
        ))}
      </div>

      {activeTab === 'record' && (
        <>
          {/* Date picker + summary */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              label={useKinyarwanda ? rw.attendance.date : 'Date'}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-3 items-end">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{counts.present}</p>
                <p className="text-xs text-gray-500">{useKinyarwanda ? rw.attendance.present : 'Present'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{counts.halfDay}</p>
                <p className="text-xs text-gray-500">{useKinyarwanda ? 'Igice' : 'Half Day'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{counts.absent}</p>
                <p className="text-xs text-gray-500">{useKinyarwanda ? rw.attendance.absent : 'Absent'}</p>
              </div>
            </div>
          </div>

          {/* Attendance list */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : workers.length === 0 ? (
            <Card>
              <p className="text-center text-gray-500 py-6">{useKinyarwanda ? 'Nta bakozi babonetse' : 'No active workers found'}</p>
            </Card>
          ) : (
            <Card>
              <div className="space-y-3">
                {entries.map(entry => (
                  <div key={entry.worker.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                        <CalendarCheck className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{entry.worker.fullName}</p>
                        <p className="text-xs text-gray-500">{entry.worker.role}</p>
                      </div>
                    </div>

                    {/* Status buttons */}
                    <div className="flex gap-1.5">
                      {(Object.entries(statusConfig) as [AttendanceStatus, typeof statusConfig[AttendanceStatus]][]).map(([status, config]) => (
                        <button
                          key={status}
                          onClick={() => setStatus(entry.worker.id, status)}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            entry.status === status
                              ? config.active
                              : 'bg-white dark:bg-gray-700 text-gray-500 border border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {config.icon}
                          <span className="hidden sm:inline">
                            {useKinyarwanda ? config.labelRw : config.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button
                  loading={saving}
                  icon={<Save className="h-4 w-4" />}
                  onClick={handleSave}
                >
                  {useKinyarwanda ? rw.attendance.saveAll : 'Save Attendance'}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader title={useKinyarwanda ? rw.attendance.history : 'Attendance History'} />
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-6">{useKinyarwanda ? rw.common.noData : 'No attendance records'}</p>
            ) : (
              history.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.workerName}</p>
                    <p className="text-xs text-gray-500">{r.date}</p>
                  </div>
                  <Badge variant={statusConfig[r.status].badge}>
                    {useKinyarwanda ? statusConfig[r.status].labelRw : statusConfig[r.status].label}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
