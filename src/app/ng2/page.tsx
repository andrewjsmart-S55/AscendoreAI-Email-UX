'use client'

import NG2Interface from '@/components/NG2/NG2Interface'
import ProtectedRoute from '@/components/Auth/ProtectedRoute'

export default function NG2Page() {
  return (
    <ProtectedRoute>
      <NG2Interface />
    </ProtectedRoute>
  )
}