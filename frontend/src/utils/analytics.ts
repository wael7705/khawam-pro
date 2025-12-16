/**
 * Analytics tracking utility
 * Tracks page views, user behavior, and exit rates
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api'

// Generate or get session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Track page view
export async function trackPageView(pagePath: string, timeSpent: number = 0, scrollDepth: number = 0) {
  try {
    const sessionId = getSessionId()
    
    await fetch(`${API_BASE_URL}/analytics/page-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        page_path: pagePath,
        time_spent: timeSpent,
        scroll_depth: scrollDepth,
      }),
    })
  } catch (error) {
    console.warn('Failed to track page view:', error)
  }
}

// Track visit
export async function trackVisit(
  pagePath: string,
  referrer: string | null = null,
  entryPage: boolean = false,
  exitPage: boolean = false
) {
  try {
    const sessionId = getSessionId()
    const userAgent = navigator.userAgent
    
    // Get IP address (will be set by backend)
    const response = await fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        page_path: pagePath,
        referrer: referrer,
        user_agent: userAgent,
        entry_page: entryPage,
        exit_page: exitPage,
      }),
    })
    
    return await response.json()
  } catch (error) {
    console.warn('Failed to track visit:', error)
  }
}

// Track scroll depth
let scrollDepthTracked = 0
export function trackScrollDepth() {
  const maxScroll = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight
  )
  
  const currentScroll = window.scrollY + window.innerHeight
  const depth = Math.round((currentScroll / maxScroll) * 100)
  
  // Track at 25%, 50%, 75%, 100%
  if (depth >= 25 && scrollDepthTracked < 25) {
    scrollDepthTracked = 25
    trackPageView(window.location.pathname, 0, 25)
  } else if (depth >= 50 && scrollDepthTracked < 50) {
    scrollDepthTracked = 50
    trackPageView(window.location.pathname, 0, 50)
  } else if (depth >= 75 && scrollDepthTracked < 75) {
    scrollDepthTracked = 75
    trackPageView(window.location.pathname, 0, 75)
  } else if (depth >= 100 && scrollDepthTracked < 100) {
    scrollDepthTracked = 100
    trackPageView(window.location.pathname, 0, 100)
  }
}

// Track time on page
let pageStartTime = Date.now()
let timeTrackingInterval: number | null = null

export function startTimeTracking(pagePath: string) {
  pageStartTime = Date.now()
  scrollDepthTracked = 0
  
  // Track scroll depth
  window.addEventListener('scroll', trackScrollDepth, { passive: true })
  
  // Track time spent every 10 seconds
  timeTrackingInterval = window.setInterval(() => {
    const timeSpent = Math.floor((Date.now() - pageStartTime) / 1000)
    trackPageView(pagePath, timeSpent, scrollDepthTracked)
  }, 10000)
}

export function stopTimeTracking(pagePath: string) {
  if (timeTrackingInterval) {
    clearInterval(timeTrackingInterval)
    timeTrackingInterval = null
  }
  
  window.removeEventListener('scroll', trackScrollDepth)
  
  const timeSpent = Math.floor((Date.now() - pageStartTime) / 1000)
  trackPageView(pagePath, timeSpent, scrollDepthTracked)
  
  // Track exit
  trackVisit(pagePath, document.referrer || null, false, true)
}

// Initialize analytics
export function initAnalytics() {
  const pagePath = window.location.pathname
  const referrer = document.referrer || null
  
  // Track entry
  trackVisit(pagePath, referrer, true, false)
  
  // Start time tracking
  startTimeTracking(pagePath)
  
  // Track exit on page unload
  window.addEventListener('beforeunload', () => {
    stopTimeTracking(pagePath)
  })
  
  // Track page changes (for SPA)
  window.addEventListener('popstate', () => {
    stopTimeTracking(pagePath)
    const newPath = window.location.pathname
    trackVisit(newPath, pagePath, true, false)
    startTimeTracking(newPath)
  })
}

