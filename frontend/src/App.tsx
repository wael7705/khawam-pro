import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Services from './pages/Services'
import Portfolio from './pages/Portfolio'
import WorkDetail from './pages/WorkDetail'
import Contact from './pages/Contact'
import Studio from './pages/Studio'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import LocationPickerPage from './pages/LocationPickerPage'
import RateOrderPage from './pages/RateOrderPage'
import Orders from './pages/Orders'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastContainer } from './components/Toast'
import { subscribe, getToasts, removeToast } from './utils/toast'
import type { Toast } from './utils/toast'
import { initAnalytics, stopTimeTracking } from './utils/analytics'
import './App.css'

function App() {
  const location = useLocation()
  const [toasts, setToasts] = useState<Toast[]>([])
  const hideAllPaths = ['/dashboard', '/location-picker', '/rate-order', '/login', '/register']
  const shouldHideFooter = location.pathname !== '/'
  const shouldHideAll = hideAllPaths.some(path => location.pathname.startsWith(path))

  useEffect(() => {
    // Subscribe to toast updates
    const unsubscribe = subscribe((newToasts) => {
      setToasts(newToasts)
    })
    
    // Initialize with existing toasts
    setToasts(getToasts())
    
    // Initialize analytics (only on public pages)
    if (!location.pathname.startsWith('/dashboard') && 
        !location.pathname.startsWith('/login') && 
        !location.pathname.startsWith('/register')) {
      initAnalytics()
    }
    
    return () => {
      unsubscribe()
      // Stop time tracking on unmount
      if (!location.pathname.startsWith('/dashboard')) {
        stopTimeTracking(location.pathname)
      }
    }
  }, [location.pathname])

  return (
    <div className="app">
      {!shouldHideAll && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/work/:id" element={<WorkDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/location-picker" element={<LocationPickerPage />} />
          <Route path="/rate-order/:id" element={<RateOrderPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Routes>
      </main>
      {!shouldHideFooter && !shouldHideAll && <Footer />}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

export default App