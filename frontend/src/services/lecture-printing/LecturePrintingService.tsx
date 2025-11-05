/**
 * خدمة طباعة المحاضرات
 * منطق ومراحل خدمة طباعة المحاضرات
 */
import { PrintingService } from '../printing/PrintingService'
import type { ServiceHandler } from '../serviceRegistry'

export const LecturePrintingService: ServiceHandler = {
  id: 'lecture-printing',
  name: 'طباعة محاضرات',
  
  matches: (serviceName: string, _serviceId?: number) => {
    // تطابق على اسم الخدمة
    return serviceName.includes('محاضرات') || 
           serviceName.toLowerCase().includes('lecture')
  },
  
  // استخدام نفس منطق خدمة الطباعة العامة - يدعم جميع المراحل المطلوبة
  renderStep: PrintingService.renderStep,
  
  prepareOrderData: PrintingService.prepareOrderData,
  
  calculatePrice: PrintingService.calculatePrice,
  
  getSpecifications: PrintingService.getSpecifications
}

