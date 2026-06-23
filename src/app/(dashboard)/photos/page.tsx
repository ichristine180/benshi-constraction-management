'use client'

import { ImageIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { rw } from '@/lib/utils/kinyarwanda'

export default function PhotosPage() {
  const { isSiteManager, isSupervisor } = useAuth()
  const useKinyarwanda = isSiteManager || isSupervisor

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">{useKinyarwanda ? rw.photos.title : 'Photo Gallery'}</h1>
      </div>
      <Card>
        <div className="text-center py-16">
          <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {useKinyarwanda ? 'Amafoto ntabwo aboneka ubu' : 'Photo uploads are not available'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {useKinyarwanda ? 'Firebase Storage ntiyafunguwe' : 'Enable Firebase Storage to use this feature'}
          </p>
        </div>
      </Card>
    </div>
  )
}
