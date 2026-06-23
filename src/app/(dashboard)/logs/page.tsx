'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { PlusCircle, Sun, Cloud, CloudRain, Wind, Zap, BookOpen } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { getDailyLogs, addDocument, COLLECTIONS } from '@/lib/firebase/db'
import { formatDate, getStageLabel } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import { rw } from '@/lib/utils/kinyarwanda'
import type { DailyLog, WeatherCondition, ConstructionStage } from '@/lib/types'
import toast from 'react-hot-toast'

const WEATHERS: { value: WeatherCondition; label: string; labelRw: string; icon: React.ReactNode }[] = [
  { value: 'sunny', label: 'Sunny', labelRw: rw.dailyLogs.sunny, icon: <Sun className="h-5 w-5 text-yellow-500" /> },
  { value: 'cloudy', label: 'Cloudy', labelRw: rw.dailyLogs.cloudy, icon: <Cloud className="h-5 w-5 text-gray-400" /> },
  { value: 'rainy', label: 'Rainy', labelRw: rw.dailyLogs.rainy, icon: <CloudRain className="h-5 w-5 text-blue-400" /> },
  { value: 'windy', label: 'Windy', labelRw: rw.dailyLogs.windy, icon: <Wind className="h-5 w-5 text-teal-400" /> },
  { value: 'stormy', label: 'Stormy', labelRw: rw.dailyLogs.stormy, icon: <Zap className="h-5 w-5 text-purple-400" /> },
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

const blankForm = {
  date: new Date().toISOString().split('T')[0],
  weather: 'sunny' as WeatherCondition,
  workersPresent: '',
  workCompleted: '',
  issuesEncountered: '',
  nextTasks: '',
  stage: 'foundation' as ConstructionStage,
}

export default function DailyLogsPage() {
  const { userProfile, isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor

  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getDailyLogs()
      setLogs(data)
    } catch { toast.error('Failed to load logs') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.workCompleted) return toast.error('Work completed is required')
    setSaving(true)
    try {
      await addDocument<DailyLog>(COLLECTIONS.DAILY_LOGS, {
        date: form.date,
        weather: form.weather,
        workersPresent: parseInt(form.workersPresent) || 0,
        workCompleted: form.workCompleted,
        issuesEncountered: form.issuesEncountered,
        nextTasks: form.nextTasks,
        stage: form.stage,
        photos: [],
        createdBy: userProfile?.id || '',
        createdAt: Timestamp.now(),
      } as Omit<DailyLog, 'id'>)

      toast.success(useKinyarwanda ? rw.dailyLogs.successSaved : 'Daily log saved!')
      setShowModal(false)
      setForm(blankForm)
      load()
    } catch { toast.error('Failed to save log') }
    finally { setSaving(false) }
  }

  const getWeatherInfo = (w: WeatherCondition) => WEATHERS.find(x => x.value === w) || WEATHERS[0]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{useKinyarwanda ? rw.dailyLogs.title : 'Daily Site Logs'}</h1>
          <p className="text-sm text-gray-500 mt-1">{logs.length} {useKinyarwanda ? 'raporo' : 'reports recorded'}</p>
        </div>
        <Button icon={<PlusCircle className="h-4 w-4" />} onClick={() => { setForm(blankForm); setShowModal(true) }}>
          {useKinyarwanda ? rw.dailyLogs.addLog : 'Add Log'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : logs.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{useKinyarwanda ? 'Nta raporo zibonetse' : 'No daily logs yet'}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map(log => {
            const weather = getWeatherInfo(log.weather)
            return (
              <Card key={log.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedLog(log)}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Date + weather */}
                  <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1 flex-shrink-0">
                    <div className="text-center sm:text-left">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{new Date(log.date).getDate()}</p>
                      <p className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {weather.icon}
                      <span className="text-xs text-gray-500">{useKinyarwanda ? weather.labelRw : weather.label}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="info">{getStageLabel(log.stage)}</Badge>
                      <span className="text-xs text-gray-500">{log.workersPresent} {useKinyarwanda ? 'bakozi' : 'workers'}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {useKinyarwanda ? rw.dailyLogs.workCompleted : 'Work Completed'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{log.workCompleted}</p>
                    {log.issuesEncountered && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠ {log.issuesEncountered.slice(0, 80)}{log.issuesEncountered.length > 80 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Log Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={useKinyarwanda ? rw.dailyLogs.addLog : 'Add Daily Log'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{useKinyarwanda ? rw.common.cancel : 'Cancel'}</Button>
            <Button loading={saving} onClick={handleSubmit}>{useKinyarwanda ? rw.common.save : 'Save Log'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-grid">
            <Input label={useKinyarwanda ? rw.dailyLogs.date : 'Date'} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            <Input label={useKinyarwanda ? rw.dailyLogs.workersPresent : 'Workers Present'} type="number" min="0" value={form.workersPresent} onChange={e => setForm(p => ({ ...p, workersPresent: e.target.value }))} placeholder="0" />
          </div>

          {/* Weather selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {useKinyarwanda ? rw.dailyLogs.weather : 'Weather'}
            </label>
            <div className="flex gap-2 flex-wrap">
              {WEATHERS.map(w => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, weather: w.value }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all ${form.weather === w.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
                >
                  {w.icon}
                  <span>{useKinyarwanda ? w.labelRw : w.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Select label={useKinyarwanda ? 'Intambwe' : 'Stage'} options={STAGES} value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value as ConstructionStage }))} />

          <Textarea
            label={useKinyarwanda ? rw.dailyLogs.workCompleted : 'Work Completed'}
            value={form.workCompleted}
            onChange={e => setForm(p => ({ ...p, workCompleted: e.target.value }))}
            rows={3}
            required
            placeholder={useKinyarwanda ? 'Koresha icyo cyabazwe uyu munsi...' : 'Describe what was accomplished today...'}
          />
          <Textarea
            label={useKinyarwanda ? rw.dailyLogs.issues : 'Issues Encountered'}
            value={form.issuesEncountered}
            onChange={e => setForm(p => ({ ...p, issuesEncountered: e.target.value }))}
            rows={2}
            placeholder={useKinyarwanda ? 'Ikibazo cyangwa intambamyi...' : 'Any problems or obstacles...'}
          />
          <Textarea
            label={useKinyarwanda ? rw.dailyLogs.nextTasks : 'Next Tasks'}
            value={form.nextTasks}
            onChange={e => setForm(p => ({ ...p, nextTasks: e.target.value }))}
            rows={2}
            placeholder={useKinyarwanda ? 'Ibikorwa bizaza...' : 'Planned for next day...'}
          />

        </form>
      </Modal>

      {/* Log Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? (useKinyarwanda ? `Raporo ya ${selectedLog.date}` : `Log - ${selectedLog.date}`) : ''}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">{useKinyarwanda ? 'Ikirere' : 'Weather'}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {getWeatherInfo(selectedLog.weather).icon}
                  <span className="font-medium">{useKinyarwanda ? getWeatherInfo(selectedLog.weather).labelRw : getWeatherInfo(selectedLog.weather).label}</span>
                </div>
              </div>
              <div>
                <p className="text-gray-500">{useKinyarwanda ? 'Abakozi' : 'Workers Present'}</p>
                <p className="font-bold text-gray-900 dark:text-white mt-1">{selectedLog.workersPresent}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{useKinyarwanda ? rw.dailyLogs.workCompleted : 'Work Completed'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">{selectedLog.workCompleted}</p>
            </div>

            {selectedLog.issuesEncountered && (
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">⚠ {useKinyarwanda ? rw.dailyLogs.issues : 'Issues'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{selectedLog.issuesEncountered}</p>
              </div>
            )}

            {selectedLog.nextTasks && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{useKinyarwanda ? rw.dailyLogs.nextTasks : 'Next Tasks'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">{selectedLog.nextTasks}</p>
              </div>
            )}

          </div>
        )}
      </Modal>
    </div>
  )
}
