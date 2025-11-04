import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'
import { workflowsAPI, servicesAPI } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import './WorkflowsManagement.css'

interface Workflow {
  id: number
  service_id: number
  step_number: number
  step_name_ar: string
  step_name_en?: string
  step_description_ar?: string
  step_type: string
  step_config?: any
  display_order: number
  is_active: boolean
}

interface Service {
  id: number
  name_ar: string
  name_en?: string
}

export default function WorkflowsManagement() {
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [formData, setFormData] = useState({
    step_number: 1,
    step_name_ar: '',
    step_name_en: '',
    step_description_ar: '',
    step_type: 'quantity',
    step_config: {},
    display_order: 0,
    is_active: true
  })

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    if (selectedServiceId) {
      loadWorkflows(selectedServiceId)
    } else {
      setWorkflows([])
    }
  }, [selectedServiceId])

  const loadServices = async () => {
    try {
      const response = await servicesAPI.getAll()
      setServices(response.data)
      if (response.data.length > 0 && !selectedServiceId) {
        setSelectedServiceId(response.data[0].id)
      }
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWorkflows = async (serviceId: number) => {
    try {
      setLoading(true)
      const response = await workflowsAPI.getServiceWorkflow(serviceId)
      if (response.data.success) {
        setWorkflows(response.data.workflows.sort((a: Workflow, b: Workflow) => a.step_number - b.step_number))
      }
    } catch (error) {
      console.error('Error loading workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedServiceId) return

    try {
      const workflowData = {
        ...formData,
        service_id: selectedServiceId
      }

      if (editingWorkflow) {
        await workflowsAPI.updateWorkflow(editingWorkflow.id, workflowData)
      } else {
        await workflowsAPI.createWorkflow(workflowData)
      }

      await loadWorkflows(selectedServiceId)
      setIsAdding(false)
      setEditingWorkflow(null)
      setFormData({
        step_number: workflows.length + 1,
        step_name_ar: '',
        step_name_en: '',
        step_description_ar: '',
        step_type: 'quantity',
        step_config: {},
        display_order: 0,
        is_active: true
      })
    } catch (error: any) {
      console.error('Error saving workflow:', error)
      alert('خطأ في حفظ المرحلة: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المرحلة؟')) return

    try {
      await workflowsAPI.deleteWorkflow(id)
      if (selectedServiceId) {
        await loadWorkflows(selectedServiceId)
      }
    } catch (error: any) {
      console.error('Error deleting workflow:', error)
      alert('خطأ في حذف المرحلة: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow)
    setFormData({
      step_number: workflow.step_number,
      step_name_ar: workflow.step_name_ar,
      step_name_en: workflow.step_name_en || '',
      step_description_ar: workflow.step_description_ar || '',
      step_type: workflow.step_type,
      step_config: workflow.step_config || {},
      display_order: workflow.display_order,
      is_active: workflow.is_active
    })
    setIsAdding(true)
  }

  const stepTypes = [
    { value: 'quantity', label: 'الكمية' },
    { value: 'files', label: 'رفع الملفات' },
    { value: 'dimensions', label: 'الأبعاد' },
    { value: 'colors', label: 'الألوان' },
    { value: 'pages', label: 'الصفحات' },
    { value: 'print_options', label: 'خيارات الطباعة' },
    { value: 'customer_info', label: 'معلومات العميل' },
    { value: 'delivery', label: 'التوصيل' }
  ]

  const selectedService = services.find(s => s.id === selectedServiceId)

  return (
    <div className="workflows-management">
      <div className="section-header">
        <div>
          <h1>إدارة مراحل الخدمات</h1>
          <p>تحديد مراحل الطلب لكل خدمة</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/services')}>
          <ArrowLeft size={20} />
          العودة إلى الخدمات
        </button>
      </div>

      <div className="workflows-content">
        <div className="service-selector">
          <label>اختر الخدمة:</label>
          <select
            value={selectedServiceId || ''}
            onChange={(e) => setSelectedServiceId(parseInt(e.target.value))}
            className="form-input"
          >
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name_ar}
              </option>
            ))}
          </select>
        </div>

        {selectedService && (
          <>
            <div className="workflows-header">
              <h2>مراحل خدمة: {selectedService.name_ar}</h2>
              <button className="btn btn-primary" onClick={() => {
                setIsAdding(true)
                setEditingWorkflow(null)
                setFormData({
                  step_number: workflows.length + 1,
                  step_name_ar: '',
                  step_name_en: '',
                  step_description_ar: '',
                  step_type: 'quantity',
                  step_config: {},
                  display_order: 0,
                  is_active: true
                })
              }}>
                <Plus size={20} />
                إضافة مرحلة
              </button>
            </div>

            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : (
              <div className="workflows-list">
                {workflows.length === 0 ? (
                  <div className="empty-state">
                    <p>لا توجد مراحل لهذه الخدمة. قم بإضافة مرحلة جديدة.</p>
                  </div>
                ) : (
                  workflows.map(workflow => (
                    <div key={workflow.id} className="workflow-card">
                      <div className="workflow-header">
                        <div className="workflow-number">{workflow.step_number}</div>
                        <div className="workflow-info">
                          <h3>{workflow.step_name_ar}</h3>
                          {workflow.step_description_ar && (
                            <p>{workflow.step_description_ar}</p>
                          )}
                          <div className="workflow-meta">
                            <span className="badge">{stepTypes.find(t => t.value === workflow.step_type)?.label || workflow.step_type}</span>
                            {!workflow.is_active && <span className="badge inactive">معطل</span>}
                          </div>
                        </div>
                      </div>
                      <div className="workflow-actions">
                        <button className="icon-btn" onClick={() => handleEdit(workflow)}>
                          <Edit size={18} />
                        </button>
                        <button className="icon-btn delete" onClick={() => handleDelete(workflow.id)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(isAdding || editingWorkflow) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); setEditingWorkflow(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingWorkflow ? 'تعديل مرحلة' : 'إضافة مرحلة جديدة'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>رقم المرحلة *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.step_number}
                  onChange={(e) => setFormData({ ...formData, step_number: parseInt(e.target.value) })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>اسم المرحلة (عربي) *</label>
                <input
                  type="text"
                  value={formData.step_name_ar}
                  onChange={(e) => setFormData({ ...formData, step_name_ar: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>اسم المرحلة (إنجليزي)</label>
                <input
                  type="text"
                  value={formData.step_name_en}
                  onChange={(e) => setFormData({ ...formData, step_name_en: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>وصف المرحلة (عربي)</label>
                <textarea
                  value={formData.step_description_ar}
                  onChange={(e) => setFormData({ ...formData, step_description_ar: e.target.value })}
                  className="form-input"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>نوع المرحلة *</label>
                <select
                  value={formData.step_type}
                  onChange={(e) => setFormData({ ...formData, step_type: e.target.value })}
                  className="form-input"
                  required
                >
                  {stepTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>ترتيب العرض</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  {' '}نشط
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingWorkflow(null) }}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingWorkflow ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

