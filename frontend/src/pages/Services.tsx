import { useState, useEffect } from 'react'
import { servicesAPI } from '../lib/api'
import OrderModal from '../components/OrderModal'
import './Services.css'

interface Service {
  id: number
  name_ar: string
  name_en: string
  description_ar?: string
  icon?: string
  base_price: number
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadServices()
  }, [])

  // Check if we should reopen order modal after returning from location picker
  useEffect(() => {
    // Only check once when component mounts or services are loaded
    const shouldReopen = localStorage.getItem('shouldReopenOrderModal')
    const serviceName = localStorage.getItem('orderModalService')
    
    if (shouldReopen === 'true' && serviceName && services.length > 0 && !isModalOpen) {
      // Find the service by name
      const service = services.find(s => s.name_ar === serviceName)
      if (service) {
        setSelectedService(service)
        setIsModalOpen(true)
        // DON'T clear the flag here - let OrderModal handle it after restoring state
      }
    }
  }, [services, isModalOpen])

  const loadServices = async () => {
    try {
      const response = await servicesAPI.getAll()
      setServices(response.data)
    } catch (error) {
      console.error('Error loading services:', error)
      setServices([
        { id: 1, name_ar: 'طباعة البوسترات', name_en: 'Poster Printing', base_price: 2000 },
        { id: 2, name_ar: 'طباعة الفليكس', name_en: 'Flex Printing', base_price: 3000 },
        { id: 3, name_ar: 'البانرات الإعلانية', name_en: 'Advertising Banners', base_price: 5000 },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleOrder = (service: Service) => {
    setSelectedService(service)
    setIsModalOpen(true)
  }

  return (
    <div className="services-page section">
      <div className="container">
        <h1 className="page-title">خدماتنا</h1>
        <p className="page-subtitle">نقدم لكم أعرق وأحسن الخدمات</p>

        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <div className="services-grid">
            {services.map((service) => (
              <div key={service.id} className="service-card">
                <div className="service-icon">{service.icon || '📄'}</div>
                <h3>{service.name_ar}</h3>
                {service.description_ar && <p>{service.description_ar}</p>}
                <div className="service-price">من {service.base_price} ل.س</div>
                <button
                  className="btn btn-primary"
                  onClick={() => handleOrder(service)}
                >
                  اطلب الآن
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedService && (
        <OrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          serviceName={selectedService.name_ar}
          serviceId={selectedService.id}
        />
      )}
    </div>
  )
}

