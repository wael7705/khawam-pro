import React, { ComponentType, Suspense } from 'react'

// Wrapper component to handle recharts compatibility with React 19
// This ensures React is available in the global scope for recharts
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.React = React
}

interface RechartsWrapperProps {
  children: React.ReactNode
}

export const RechartsWrapper: React.FC<RechartsWrapperProps> = ({ children }) => {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>جاري تحميل الرسوم البيانية...</div>}>
      {children}
    </Suspense>
  )
}

