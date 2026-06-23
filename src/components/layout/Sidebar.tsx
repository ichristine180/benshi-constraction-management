'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, DollarSign, PiggyBank, Receipt, Package,
  Users, CalendarCheck, CreditCard, BookOpen, Image,
  BarChart3, Settings, HardHat, UserCog, Bell, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { rw } from '@/lib/utils/kinyarwanda'

interface NavItem {
  href: string
  label: string
  labelRw?: string
  icon: React.ReactNode
  roles: ('owner' | 'site_manager' | 'supervisor')[]
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    labelRw: rw.nav.dashboard,
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['owner', 'site_manager', 'supervisor'],
  },
  {
    href: '/funding',
    label: 'Funding',
    icon: <PiggyBank className="h-5 w-5" />,
    roles: ['owner'],
  },
  {
    href: '/budget',
    label: 'Budget',
    icon: <DollarSign className="h-5 w-5" />,
    roles: ['owner'],
  },
  {
    href: '/transactions',
    label: 'Transactions',
    labelRw: rw.nav.transactions,
    icon: <Receipt className="h-5 w-5" />,
    roles: ['owner', 'site_manager'],
  },
  {
    href: '/materials',
    label: 'Materials',
    labelRw: rw.nav.materials,
    icon: <Package className="h-5 w-5" />,
    roles: ['owner', 'site_manager'],
  },
  {
    href: '/workers',
    label: 'Workers',
    labelRw: rw.nav.workers,
    icon: <HardHat className="h-5 w-5" />,
    roles: ['owner', 'site_manager'],
  },
  {
    href: '/attendance',
    label: 'Attendance',
    labelRw: rw.nav.attendance,
    icon: <CalendarCheck className="h-5 w-5" />,
    roles: ['owner', 'site_manager', 'supervisor'],
  },
  {
    href: '/payroll',
    label: 'Payroll',
    labelRw: rw.nav.payroll,
    icon: <CreditCard className="h-5 w-5" />,
    roles: ['owner', 'site_manager'],
  },
  {
    href: '/logs',
    label: 'Daily Logs',
    labelRw: rw.nav.dailyLogs,
    icon: <BookOpen className="h-5 w-5" />,
    roles: ['owner', 'site_manager', 'supervisor'],
  },
  {
    href: '/photos',
    label: 'Photos',
    labelRw: rw.nav.photos,
    icon: <Image className="h-5 w-5" />,
    roles: ['owner', 'site_manager', 'supervisor'],
  },
  {
    href: '/reports',
    label: 'Reports',
    labelRw: rw.nav.reports,
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['owner'],
  },
  {
    href: '/users',
    label: 'Users',
    icon: <UserCog className="h-5 w-5" />,
    roles: ['owner'],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { userProfile, isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor

  const allowedItems = navItems.filter(item =>
    userProfile?.role && item.roles.includes(userProfile.role)
  )

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-30 h-full w-64 bg-gray-900 flex flex-col transition-transform duration-300 ease-in-out',
        'lg:translate-x-0 lg:static lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-construction-500 rounded-lg">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Construction</p>
              <p className="text-xs text-gray-400">Manager</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-xs text-gray-400">{useKinyarwanda ? 'Wakiriye' : 'Signed in as'}</p>
          <p className="text-sm font-medium text-white truncate">{userProfile?.fullName}</p>
          <span className="inline-flex mt-1 text-xs px-2 py-0.5 rounded-full bg-construction-500/20 text-construction-400 font-medium">
            {userProfile?.role === 'owner' ? 'Owner' :
             userProfile?.role === 'site_manager' ? (useKinyarwanda ? 'Umuyobozi w\'Akarere' : 'Site Manager') :
             useKinyarwanda ? 'Umuringa' : 'Supervisor'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {allowedItems.map(item => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                )}
              >
                {item.icon}
                <span>{useKinyarwanda && item.labelRw ? item.labelRw : item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-gray-700">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span>{useKinyarwanda ? rw.nav.settings : 'Settings'}</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
