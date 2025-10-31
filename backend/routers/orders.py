from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Order, OrderItem, User
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
import uuid
from datetime import datetime

router = APIRouter()

# Pydantic Models
class OrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    service_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    specifications: Optional[dict] = None
    design_files: Optional[List[str]] = None
    dimensions: Optional[dict] = None
    colors: Optional[List[str]] = None

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_whatsapp: Optional[str] = None
    shop_name: Optional[str] = None
    items: List[OrderItemCreate]
    total_amount: Decimal
    final_amount: Decimal
    delivery_type: str = "self"  # self or delivery
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    service_name: Optional[str] = None

# Background task for notifications
async def send_order_notification(order_number: str, customer_name: str, customer_phone: str):
    """Background task to send notifications (can be extended with email/SMS)"""
    print(f"📧 Notification: Order {order_number} created for {customer_name} ({customer_phone})")
    # TODO: Integrate with email/SMS service
    # await email_service.send_order_confirmation(order_number, customer_name, customer_phone)

@router.post("/")
async def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new order"""
    try:
        # Generate unique order number
        order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Create order
        new_order = Order(
            order_number=order_number,
            customer_id=None,  # TODO: Link to User if authenticated
            status="pending",
            total_amount=order_data.total_amount,
            final_amount=order_data.final_amount,
            payment_status="pending",
            delivery_address=order_data.delivery_address if order_data.delivery_type == "delivery" else None,
            notes=order_data.notes
        )
        db.add(new_order)
        db.flush()  # Get the order ID
        
        # Create order items
        for item_data in order_data.items:
            # Prepare specifications JSON
            specs = {}
            if item_data.specifications:
                specs.update(item_data.specifications)
            if item_data.dimensions:
                specs["dimensions"] = item_data.dimensions
            if item_data.colors:
                specs["colors"] = item_data.colors
            
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=item_data.product_id,
                product_name=item_data.service_name or f"Service Item",
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total_price=item_data.total_price,
                specifications=specs if specs else None,
                design_files=item_data.design_files or [],
                status="pending"
            )
            db.add(order_item)
        
        db.commit()
        db.refresh(new_order)
        
        # Add background task for notifications
        background_tasks.add_task(
            send_order_notification,
            order_number,
            order_data.customer_name,
            order_data.customer_phone
        )
        
        return {
            "success": True,
            "order": {
                "id": new_order.id,
                "order_number": new_order.order_number,
                "status": new_order.status,
                "total_amount": float(new_order.total_amount),
                "final_amount": float(new_order.final_amount),
                "created_at": new_order.created_at.isoformat()
            },
            "message": f"تم إنشاء الطلب بنجاح: {order_number}"
        }
    except Exception as e:
        db.rollback()
        print(f"Error creating order: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في إنشاء الطلب: {str(e)}")

@router.get("/")
async def get_orders(db: Session = Depends(get_db)):
    """Get all orders (for authenticated users)"""
    try:
        orders = db.query(Order).order_by(Order.created_at.desc()).limit(100).all()
        return {
            "success": True,
            "orders": [
                {
                    "id": order.id,
                    "order_number": order.order_number,
                    "status": order.status,
                    "total_amount": float(order.total_amount),
                    "final_amount": float(order.final_amount),
                    "payment_status": order.payment_status,
                    "created_at": order.created_at.isoformat() if order.created_at else None
                }
                for order in orders
            ]
        }
    except Exception as e:
        print(f"Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الطلبات: {str(e)}")

@router.get("/{order_id}")
async def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get order by ID with items"""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        
        return {
            "success": True,
            "order": {
                "id": order.id,
                "order_number": order.order_number,
                "status": order.status,
                "total_amount": float(order.total_amount),
                "final_amount": float(order.final_amount),
                "payment_status": order.payment_status,
                "delivery_address": order.delivery_address,
                "notes": order.notes,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "items": [
                    {
                        "id": item.id,
                        "product_name": item.product_name,
                        "quantity": item.quantity,
                        "unit_price": float(item.unit_price),
                        "total_price": float(item.total_price),
                        "specifications": item.specifications,
                        "status": item.status
                    }
                    for item in items
                ]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching order: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الطلب: {str(e)}")