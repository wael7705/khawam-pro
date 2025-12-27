import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'

export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  // Include search/hash so changing query also resets if it was the trigger
  const resetKey = `${location.pathname}${location.search}${location.hash}`
  return <ErrorBoundary resetKey={resetKey}>{children}</ErrorBoundary>
}


