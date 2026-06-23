'use client'

import React, { useState } from 'react'
import { Settings, HardHat, Bell, Moon, Sun, Globe } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { updateDocument, COLLECTIONS } from '@/lib/firebase/db'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { userProfile, isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [nameForm, setNameForm] = useState(userProfile?.fullName || '')
  const [savingName, setSavingName] = useState(false)

  const handleUpdateName = async () => {
    if (!nameForm.trim() || !userProfile) return
    setSavingName(true)
    try {
      await updateDocument(COLLECTIONS.USERS, userProfile.id, { fullName: nameForm })
      toast.success(useKinyarwanda ? 'Amazina yarahinduwe!' : 'Name updated!')
    } catch { toast.error('Update failed') }
    finally { setSavingName(false) }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.next !== passwordForm.confirm) return toast.error('Passwords do not match')
    if (passwordForm.next.length < 6) return toast.error('Password must be at least 6 characters')
    setSavingPw(true)
    try {
      const user = auth.currentUser
      if (!user || !user.email) return
      const cred = EmailAuthProvider.credential(user.email, passwordForm.current)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, passwordForm.next)
      setPasswordForm({ current: '', next: '', confirm: '' })
      toast.success(useKinyarwanda ? 'Ijambobanga ryahinduwe!' : 'Password updated!')
    } catch {
      toast.error(useKinyarwanda ? 'Ijambobanga rya none si ryo' : 'Current password is incorrect')
    } finally { setSavingPw(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">{useKinyarwanda ? 'Igenamiterere' : 'Settings'}</h1>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader title={useKinyarwanda ? 'Amakuru Yawe' : 'Profile'} />
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary-100 dark:bg-primary-900/30 rounded-full">
              <HardHat className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{userProfile?.fullName}</p>
              <p className="text-sm text-gray-500">{userProfile?.email}</p>
              <p className="text-xs text-gray-400 capitalize">{userProfile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={nameForm}
              onChange={e => setNameForm(e.target.value)}
              placeholder={useKinyarwanda ? 'Amazina Yuzuye' : 'Full Name'}
              className="flex-1"
            />
            <Button loading={savingName} onClick={handleUpdateName} variant="secondary">
              {useKinyarwanda ? 'Hindura' : 'Update'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader title={useKinyarwanda ? 'Hindura Ijambobanga' : 'Change Password'} />
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <Input
            label={useKinyarwanda ? 'Ijambobanga rya None' : 'Current Password'}
            type="password"
            value={passwordForm.current}
            onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
            required
          />
          <Input
            label={useKinyarwanda ? 'Ijambobanga Rishya' : 'New Password'}
            type="password"
            value={passwordForm.next}
            onChange={e => setPasswordForm(p => ({ ...p, next: e.target.value }))}
            required
          />
          <Input
            label={useKinyarwanda ? 'Emeza Ijambobanga Rishya' : 'Confirm New Password'}
            type="password"
            value={passwordForm.confirm}
            onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
            required
          />
          <Button type="submit" loading={savingPw}>
            {useKinyarwanda ? 'Hindura Ijambobanga' : 'Update Password'}
          </Button>
        </form>
      </Card>

      {/* Interface info */}
      {(isSiteManager || isSupervisor) && (
        <Card>
          <CardHeader title="Ururimi / Language" />
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Globe className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Kinyarwanda</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Uyu mushingwa ukoresha Ikinyarwanda nk&apos;ururimi rw&apos;ibanze</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
