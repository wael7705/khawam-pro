import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Services from './pages/Services'
import Products from './pages/Products'
import Portfolio from './pages/Portfolio'
import WorkDetail from './pages/WorkDetail'
import Contact from './pages/Contact'
import Studio from './pages/Studio'
import Dashboard from './pages/Dashboard'
import Footer from './components/Footer'
import './App.css'

function App() {
  const location = useLocation()
  const hideFooterPaths = ['/products']
  const hideAllPaths = ['/dashboard']
  const shouldHideFooter = hideFooterPaths.includes(location.pathname)
  const shouldHideAll = hideAllPaths.some(path => location.pathname.startsWith(path))

  return (
    <div className="app">
      {!shouldHideAll && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/products" element={<Products />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/work/:id" element={<WorkDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Routes>
      </main>
      {!shouldHideFooter && !shouldHideAll && <Footer />}
    </div>
  )
}

export default App