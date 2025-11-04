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
    delivery_latitude: Optional[Decimal] = None
    delivery_longitude: Optional[Decimal] = None
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
        # Generate unique order number: ORDYYMMDD-xxx
        date_str = datetime.now().strftime('%y%m%d')
        random_suffix = uuid.uuid4().hex[:3].upper()
        order_number = f"ORD{date_str}-{random_suffix}"
        
        # Check and add missing columns if they don't exist
        from sqlalchemy import text, inspect
        
        # Check and add missing columns using safer approach
        try:
            inspector = inspect(db.bind)
            current_columns = [col['name'] for col in inspector.get_columns('orders')]
            
            # Add delivery_latitude if missing
            if 'delivery_latitude' not in current_columns:
                try:
                    db.execute(text("ALTER TABLE orders ADD COLUMN delivery_latitude DECIMAL(10, 8)"))
                    db.commit()
                    print("✅ Added delivery_latitude column")
                except Exception as e:
                    print(f"Warning: Could not add delivery_latitude: {e}")
                    db.rollback()
            
            # Add delivery_longitude if missing
            if 'delivery_longitude' not in current_columns:
                try:
                    db.execute(text("ALTER TABLE orders ADD COLUMN delivery_longitude DECIMAL(11, 8)"))
                    db.commit()
                    print("✅ Added delivery_longitude column")
                except Exception as e:
                    print(f"Warning: Could not add delivery_longitude: {e}")
                    db.rollback()
            
            # Add rating if missing
            if 'rating' not in current_columns:
                try:
                    db.execute(text("ALTER TABLE orders ADD COLUMN rating INTEGER"))
                    db.commit()
                    print("✅ Added rating column")
                except Exception as e:
                    print(f"Warning: Could not add rating: {e}")
                    db.rollback()
            
            # Add rating_comment if missing
            if 'rating_comment' not in current_columns:
                try:
                    db.execute(text("ALTER TABLE orders ADD COLUMN rating_comment TEXT"))
                    db.commit()
                    print("✅ Added rating_comment column")
                except Exception as e:
                    print(f"Warning: Could not add rating_comment: {e}")
                    db.rollback()
        except Exception as e:
            print(f"Error checking/adding columns: {e}")
            # Continue anyway - we'll handle missing columns in order_dict
        
        # Create order - use SQL directly to avoid SQLAlchemy trying to insert into non-existent columns
        # First, check which columns actually exist
        inspector = inspect(db.bind)
        existing_columns = [col['name'] for col in inspector.get_columns('orders')]
        
        # Build order_dict with only existing columns
        # حساب المبالغ للتقسيط (في البداية المبلغ المدفوع = 0)
        paid_amount = 0.0  # يبدأ من 0 عند إنشاء الطلب
        remaining_amount = float(order_data.final_amount) - paid_amount
        
        order_dict = {
            'order_number': order_number,
            'customer_id': None,
            'customer_name': order_data.customer_name,
            'customer_phone': order_data.customer_phone,
            'customer_whatsapp': order_data.customer_whatsapp or order_data.customer_phone,
            'shop_name': order_data.shop_name,
            'status': 'pending',
            'total_amount': order_data.total_amount,
            'final_amount': order_data.final_amount,
            'payment_status': 'pending',  # سيتم تحديثه تلقائياً عند الدفع
            'delivery_type': order_data.delivery_type,
            'delivery_address': order_data.delivery_address if order_data.delivery_type == "delivery" else None,
            'notes': order_data.notes
        }
        
        # إضافة حقول التقسيط إذا كانت موجودة
        if 'paid_amount' in existing_columns:
            order_dict['paid_amount'] = paid_amount
        if 'remaining_amount' in existing_columns:
            order_dict['remaining_amount'] = remaining_amount
        if 'payment_method' in existing_columns:
            order_dict['payment_method'] = 'sham_cash'  # افتراضي
        
        # Add delivery coordinates only if column exists and value provided
        if 'delivery_latitude' in existing_columns and order_data.delivery_type == "delivery":
            if order_data.delivery_latitude is not None:
                order_dict['delivery_latitude'] = order_data.delivery_latitude
        
        if 'delivery_longitude' in existing_columns and order_data.delivery_type == "delivery":
            if order_data.delivery_longitude is not None:
                order_dict['delivery_longitude'] = order_data.delivery_longitude
        
        # Create order using raw SQL to avoid SQLAlchemy trying to insert into non-existent columns
        # Build INSERT statement with only existing columns
        columns_list = []
        values_dict = {}
        
        for key, value in order_dict.items():
            if key in existing_columns:
                columns_list.append(key)
                values_dict[key] = value
        
        # Build parameterized SQL query
        columns_str = ', '.join(columns_list)
        placeholders = ', '.join([f':{col}' for col in columns_list])
        
        sql_query = f"""
            INSERT INTO orders ({columns_str})
            VALUES ({placeholders})
            RETURNING id
        """
        
        # Execute SQL and get the order ID
        result = db.execute(text(sql_query), values_dict)
        order_id = result.scalar()
        db.commit()
        
        # Get order data using raw SQL to avoid ORM issues with missing columns
        order_result = db.execute(text("""
            SELECT 
                id, order_number, customer_id, customer_name, customer_phone, customer_whatsapp,
                shop_name, status, total_amount, final_amount, payment_status, delivery_type,
                delivery_address, notes, created_at
            FROM orders
            WHERE id = :order_id
        """), {"order_id": order_id}).fetchone()
        
        # Create a simple order object for response
        order_dict_response = {
            "id": order_result[0],
            "order_number": order_result[1],
            "status": order_result[7],
            "total_amount": float(order_result[8]) if order_result[8] else 0.0,
            "final_amount": float(order_result[9]) if order_result[9] else 0.0,
            "created_at": order_result[14].isoformat() if order_result[14] else None
        }
        
        # Create order items using raw SQL
        for item_data in order_data.items:
            # Prepare specifications JSON
            specs = {}
            if item_data.specifications:
                specs.update(item_data.specifications)
            if item_data.dimensions:
                specs["dimensions"] = item_data.dimensions
            if item_data.colors:
                specs["colors"] = item_data.colors
            
            import json
            specs_json = json.dumps(specs) if specs else None
            design_files_json = json.dumps(item_data.design_files or [])
            
            # Get product name if product_id is provided
            product_name = item_data.service_name or "Service Item"
            if item_data.product_id:
                try:
                    product_result = db.execute(text("""
                        SELECT name_ar FROM products WHERE id = :product_id
                    """), {"product_id": item_data.product_id}).fetchone()
                    if product_result:
                        product_name = product_result[0]
                except:
                    pass
            
            # Insert order item using raw SQL
            db.execute(text("""
                INSERT INTO order_items 
                (order_id, product_id, product_name, quantity, unit_price, total_price, 
                 specifications, design_files, status)
                VALUES 
                (:order_id, :product_id, :product_name, :quantity, :unit_price, :total_price,
                 :specifications::jsonb, :design_files::jsonb, :status)
            """), {
                "order_id": order_id,
                "product_id": item_data.product_id,
                "product_name": product_name,
                "quantity": item_data.quantity,
                "unit_price": float(item_data.unit_price),
                "total_price": float(item_data.total_price),
                "specifications": specs_json,
                "design_files": design_files_json,
                "status": "pending"
            })
        
        db.commit()
        
        # Add background task for notifications
        background_tasks.add_task(
            send_order_notification,
            order_number,
            order_data.customer_name,
            order_data.customer_phone
        )
        
        return {
            "success": True,
            "order": order_dict_response,
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
        
        # Safely get rating fields
        rating = None
        rating_comment = None
        try:
            rating = getattr(order, 'rating', None)
            if rating is not None:
                rating = int(rating)
        except:
            pass
        try:
            rating_comment = getattr(order, 'rating_comment', None)
        except:
            pass
        
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
                "rating": rating,
                "rating_comment": rating_comment,
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الطلب: {str(e)}")