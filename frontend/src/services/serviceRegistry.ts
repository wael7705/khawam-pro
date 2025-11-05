/**
 * Service Registry - تسجيل جميع الخدمات
 * كل خدمة لها منطقها الخاص ومراحلها
 */
import type React from 'react'
import { PrintingService } from './printing/PrintingService'
import { LecturePrintingService } from './lecture-printing/LecturePrintingService'

export interface ServiceHandler {
  // معرف الخدمة (اسمها أو ID)
  id: string | number
  name: string // اسم الخدمة بالعربي
  
  // دالة لفحص ما إذا كانت هذه الخدمة تطابق
  matches: (serviceName: string, serviceId?: number) => boolean
  
  // دالة لعرض محتوى المرحلة
  renderStep: (stepNumber: number, stepType: string, stepConfig: any, serviceData: any, handlers: any) => React.ReactElement | null
  
  // دالة لتحضير البيانات للإرسال
  prepareOrderData: (serviceData: any, baseOrderData: any) => any
  
  // دالة لحساب السعر
  calculatePrice: (serviceData: any) => Promise<number>
  
  // دالة للحصول على المواصفات
  getSpecifications: (serviceData: any) => any
}

// تسجيل الخدمات
// ملاحظة: LecturePrintingService يجب أن يكون أولاً لأنه أكثر تحديداً
const registeredServices: ServiceHandler[] = [
  LecturePrintingService,  // يجب أن يكون أولاً لأنه يطابق على "محاضرات"
  PrintingService
]

/**
 * البحث عن خدمة تطابق اسم أو ID الخدمة
 */
export function findServiceHandler(serviceName: string, serviceId?: number): ServiceHandler | null {
  for (const service of registeredServices) {
    if (service.matches(serviceName, serviceId)) {
      return service
    }
  }
  return null
}

/**
 * الحصول على جميع الخدمات المسجلة
 */
export function getAllRegisteredServices(): ServiceHandler[] {
  return registeredServices
}

