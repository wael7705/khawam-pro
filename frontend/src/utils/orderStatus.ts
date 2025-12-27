export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'shipping'
  | 'awaiting_pickup'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'archived'

export type DeliveryType = 'delivery' | 'self' | string

/**
 * Returns the allowed *next* statuses for a given order.
 * We intentionally keep this conservative to prevent invalid transitions from the UI.
 */
export function getAllowedNextStatuses(current: OrderStatus, deliveryType: DeliveryType): OrderStatus[] {
  const isDelivery = deliveryType === 'delivery'
  const isSelf = deliveryType === 'self'

  switch (current) {
    case 'pending':
      // In this app "accept" moves directly to preparing
      return ['preparing', 'rejected', 'cancelled']
    case 'accepted':
      return ['preparing', 'rejected', 'cancelled']
    case 'preparing':
      if (isDelivery) return ['shipping', 'cancelled']
      if (isSelf) return ['awaiting_pickup', 'cancelled']
      return ['shipping', 'awaiting_pickup', 'cancelled']
    case 'shipping':
      return ['completed', 'cancelled']
    case 'awaiting_pickup':
      return ['completed', 'cancelled']
    case 'completed':
      return []
    case 'cancelled':
    case 'rejected':
      return []
    case 'archived':
      return []
    default:
      return []
  }
}

export function getStatusOptionsForOrder(order: { status: string; delivery_type?: string }): OrderStatus[] {
  const current = order.status as OrderStatus
  const deliveryType = order.delivery_type || ''
  const next = getAllowedNextStatuses(current, deliveryType)
  // Always include the current status so the select doesn't break
  const options = [current, ...next]
  // Dedupe
  return Array.from(new Set(options))
}


