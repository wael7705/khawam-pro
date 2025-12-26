// Types for order notifications
export interface OrderNotification {
  event: string
  data: {
    order_id: number
    order_number: string
    customer_name: string
    customer_phone: string
    total_amount: number
    final_amount: number
    delivery_type: string
    status?: string
    service_name?: string
    items_count: number
    created_at: string
    image_url?: string
  }
}

// Interface للبanner - بنية مسطحة
export interface OrderNotificationDisplay {
  id: string
  orderId: number
  orderNumber: string
  customerName: string
  customerPhone: string
  totalAmount: number
  finalAmount: number
  deliveryType: string
  status?: string
  serviceName?: string
  itemsCount: number
  createdAt: string
  imageUrl?: string
}

