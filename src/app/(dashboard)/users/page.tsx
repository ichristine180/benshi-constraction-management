'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { UserCog, UserPlus, Shield } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { useAuth } from '@/contexts/AuthContext'
import { getAllUsers, updateDocument, COLLECTIONS } from '@/lib/firebase/db'
import { auth } from '@/lib/firebase/config'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { formatDateTime } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import type { UserProfile, UserRole } from '@/lib/types'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Full access to all features' },
  { value: 'site_manager', label: 'Site Manager', description: 'Manage site operations and finances (Kinyarwanda UI)' },
  { value: 'supervisor', label: 'Supervisor', description: 'Record attendance and daily logs (Kinyarwanda UI)' },
]

const roleColors: Record<UserRole, 'purple' | 'info' | 'success'> = {
  owner: 'purple',
  site_manager: 'info',
  supervisor: 'success',
}

export default function UsersPage() {
  const { isOwner, userProfile } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'supervisor' as UserRole })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getAllUsers()
      setUsers(data)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!isOwner) { router.replace('/'); return }
    load()
  }, [isOwner, load, router])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.fullName) return toast.error('Fill all fields')
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      // Use a secondary app instance so creating a user doesn't sign out the current owner
      const { initializeApp, deleteApp } = await import('firebase/app')
      const { getAuth, createUserWithEmailAndPassword: createUser } = await import('firebase/auth')
      const secondaryApp = initializeApp(auth.app.options, 'secondary')
      const secondaryAuth = getAuth(secondaryApp)
      try {
        const credential = await createUser(secondaryAuth, form.email, form.password)
        await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          active: true,
          createdAt: serverTimestamp(),
        })
        toast.success(`User ${form.fullName} created!`)
        setShowModal(false)
        setForm({ fullName: '', email: '', password: '', role: 'supervisor' })
        load()
      } finally {
        await deleteApp(secondaryApp)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create user'
      toast.error(msg.includes('email-already-in-use') ? 'Email already in use' : msg)
    } finally { setSaving(false) }
  }

  const toggleActive = async (user: UserProfile) => {
    await updateDocument(COLLECTIONS.USERS, user.id, { active: !user.active })
    load()
    toast.success(user.active ? 'User deactivated' : 'User activated')
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} users registered</p>
        </div>
        <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
          Create User
        </Button>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-3 gap-4">
        {ROLES.map(r => (
          <Card key={r.value}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary-600" />
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{r.label}</p>
            </div>
            <p className="text-xs text-gray-500">{r.description}</p>
            <p className="text-lg font-bold text-primary-600 mt-2">
              {users.filter(u => u.role === r.value).length}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="All Users" />
        <Table<UserProfile & Record<string, unknown>>
          loading={loading}
          data={users as (UserProfile & Record<string, unknown>)[]}
          emptyMessage="No users found"
          columns={[
            {
              key: 'fullName',
              header: 'Name',
              render: r => (
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{r.fullName}</p>
                  <p className="text-xs text-gray-500">{r.email}</p>
                </div>
              )
            },
            {
              key: 'role',
              header: 'Role',
              render: r => (
                <Badge variant={roleColors[r.role as UserRole]}>
                  {r.role === 'owner' ? 'Owner' : r.role === 'site_manager' ? 'Site Manager' : 'Supervisor'}
                </Badge>
              )
            },
            {
              key: 'active',
              header: 'Status',
              render: r => <Badge variant={r.active ? 'success' : 'default'} dot>{r.active ? 'Active' : 'Inactive'}</Badge>
            },
            { key: 'createdAt', header: 'Created', render: r => formatDateTime(r.createdAt as Timestamp) },
            {
              key: 'actions',
              header: 'Actions',
              render: r => r.id !== userProfile?.id ? (
                <Button
                  size="sm"
                  variant={r.active ? 'danger' : 'success'}
                  onClick={() => toggleActive(r as unknown as UserProfile)}
                >
                  {r.active ? 'Deactivate' : 'Activate'}
                </Button>
              ) : <span className="text-xs text-gray-400">Current user</span>
            },
          ]}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleCreate} icon={<UserPlus className="h-4 w-4" />}>Create User</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
            required
            placeholder="John Doe"
          />
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
            placeholder="john@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required
            placeholder="Min 6 characters"
            hint="The user can change this after login"
          />
          <Select
            label="Role"
            options={ROLES.map(r => ({ value: r.value, label: `${r.label} — ${r.description}` }))}
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}
          />
          <div className={`p-3 rounded-lg text-xs ${form.role === 'site_manager' || form.role === 'supervisor' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'}`}>
            {form.role === 'supervisor' && 'This user will see the interface in Kinyarwanda with limited access to attendance and logs only.'}
            {form.role === 'site_manager' && 'This user will see the interface in Kinyarwanda with access to site operations.'}
            {form.role === 'owner' && 'This user has full access to all features including financial management and user administration.'}
          </div>
        </form>
      </Modal>
    </div>
  )
}
