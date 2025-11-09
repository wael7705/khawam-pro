from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from database import get_db
from models import Order, OrderItem, User
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from decimal import Decimal
import uuid
from datetime import datetime
from collections import defaultdict
import json
import os
from notifications import order_notifications

router = APIRouter()

# Pydantic Models
class OrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    service_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    specifications: Optional[dict] = None
    design_files: Optional[List[Any]] = None
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

def ensure_order_columns(db: Session):
    """Ensure required customer-related columns exist on orders table."""
    try:
        inspector = inspect(db.bind)
        current = {col['name'] for col in inspector.get_columns('orders')}
    except Exception as exc:
        print(f"⚠️ Unable to inspect orders table: {exc}")
        return

    column_statements = []
    if 'customer_name' not in current:
        column_statements.append("ADD COLUMN customer_name VARCHAR(100)")
    if 'customer_phone' not in current:
        column_statements.append("ADD COLUMN customer_phone VARCHAR(20)")
    if 'customer_whatsapp' not in current:
        column_statements.append("ADD COLUMN customer_whatsapp VARCHAR(20)")
    if 'shop_name' not in current:
        column_statements.append("ADD COLUMN shop_name VARCHAR(200)")
    if 'delivery_type' not in current:
        column_statements.append("ADD COLUMN delivery_type VARCHAR(20) DEFAULT 'self'")
    if 'delivery_latitude' not in current:
        column_statements.append("ADD COLUMN delivery_latitude DECIMAL(10, 8)")
    if 'delivery_longitude' not in current:
        column_statements.append("ADD COLUMN delivery_longitude DECIMAL(11, 8)")
    if 'notes' not in current:
        column_statements.append("ADD COLUMN notes TEXT")
    if 'staff_notes' not in current:
        column_statements.append("ADD COLUMN staff_notes TEXT")
    if 'paid_amount' not in current:
        column_statements.append("ADD COLUMN paid_amount DECIMAL(12, 2) DEFAULT 0")
    if 'remaining_amount' not in current:
        column_statements.append("ADD COLUMN remaining_amount DECIMAL(12, 2) DEFAULT 0")
    if 'rating' not in current:
        column_statements.append("ADD COLUMN rating INTEGER")
    if 'rating_comment' not in current:
        column_statements.append("ADD COLUMN rating_comment TEXT")

    for stmt in column_statements:
        try:
            db.execute(text(f"ALTER TABLE orders {stmt}"))
            db.commit()
            print(f"✅ Migration executed: ALTER TABLE orders {stmt}")
        except Exception as exc:
            print(f"⚠️ Unable to execute migration ({stmt}): {exc}")
            db.rollback()

def ensure_order_items_columns(db: Session):
    """Ensure order_items table has JSONB columns for specifications and design_files."""
    try:
        inspector = inspect(db.bind)
        columns = {col['name']: col for col in inspector.get_columns('order_items')}
    except Exception as exc:
        print(f"⚠️ Unable to inspect order_items table: {exc}")
        return

    if 'specifications' not in columns:
        try:
            db.execute(text("ALTER TABLE order_items ADD COLUMN specifications JSONB"))
            db.commit()
            print("✅ Added specifications column (JSONB)")
        except Exception as exc:
            print(f"⚠️ Unable to add specifications column: {exc}")
            db.rollback()
    if 'design_files' not in columns:
        try:
            db.execute(text("ALTER TABLE order_items ADD COLUMN design_files JSONB"))
            db.commit()
            print("✅ Added design_files column (JSONB)")
        except Exception as exc:
            print(f"⚠️ Unable to add design_files column: {exc}")
            db.rollback()
    else:
        design_info = columns.get('design_files')
        if design_info:
            col_type = str(design_info['type']).upper()
            if 'JSON' not in col_type:
                try:
                    if 'TEXT[]' in col_type or 'ARRAY' in col_type:
                        db.execute(text("ALTER TABLE order_items ALTER COLUMN design_files TYPE JSONB USING to_jsonb(design_files)"))
                    else:
                        db.execute(text("ALTER TABLE order_items ALTER COLUMN design_files TYPE JSONB USING design_files::jsonb"))
                    db.commit()
                    print("✅ Converted design_files column to JSONB")
                except Exception as exc:
                    print(f"⚠️ Unable to convert design_files column type: {exc}")
                    db.rollback()

def get_public_base_url() -> str:
    base = (
        os.getenv("PUBLIC_BASE_URL")
        or os.getenv("FRONTEND_BASE_URL")
        or os.getenv("API_PUBLIC_BASE_URL")
        or os.getenv("APP_BASE_URL")
        or ""
    )
    return base.rstrip('/')

def build_file_url(raw_path: Optional[str]) -> str:
    if not raw_path:
        return ""
    raw_path = str(raw_path).strip()
    if not raw_path:
        return ""
    if raw_path.startswith("data:"):
        return raw_path
    if raw_path.startswith("http://") or raw_path.startswith("https://"):
        return raw_path
    base = get_public_base_url()
    if raw_path.startswith("/"):
        return f"{base}{raw_path}" if base else raw_path
    return f"{base}/{raw_path}" if base else raw_path

def normalize_attachment_entry(
    entry: Any,
    order_id: int,
    order_item_id: Optional[int],
    index: int
) -> Optional[Dict[str, any]]:
    if not entry:
        return None

    filename = None
    raw_path = None
    location = None
    mime_type = None
    size_label = None
    size_in_bytes = None

    if isinstance(entry, dict):
        filename = entry.get("filename") or entry.get("name") or entry.get("original_name")
        raw_path = (
            entry.get("url")
            or entry.get("download_url")
            or entry.get("path")
            or entry.get("file")
            or entry.get("location_url")
        )
        location = entry.get("location") or entry.get("position") or entry.get("side")
        mime_type = entry.get("mime_type") or entry.get("mimetype") or entry.get("content_type")
        size_label = entry.get("size_label")
        size_in_bytes = entry.get("size") or entry.get("size_in_bytes")
        if not raw_path and filename:
            raw_path = f"/uploads/{filename}"
    else:
        raw_path = str(entry).strip()
        filename = os.path.basename(raw_path.split("?")[0]) if raw_path else None

    if not raw_path:
        return None

    file_url = build_file_url(raw_path)
    if not file_url:
        return None

    return {
        "id": f"{order_id}-{order_item_id or 'item'}-{index}",
        "order_item_id": order_item_id,
        "filename": filename or "ملف",
        "raw_path": raw_path,
        "url": file_url,
        "download_url": file_url,
        "location": location,
        "mime_type": mime_type,
        "size_label": size_label,
        "size_in_bytes": size_in_bytes,
    }
# Background task for notifications
async def send_order_notification(payload: Dict[str, Any]):
    """إرسال إشعارات خلفية (SMS/Email) - يمكن توسيعها لاحقاً."""
    order_number = payload.get("order_number")
    customer_name = payload.get("customer_name")
    customer_phone = payload.get("customer_phone")
    print(f"📧 Notification: Order {order_number} created for {customer_name} ({customer_phone})")
    # TODO: Integrate with email/SMS service
    # await email_service.send_order_confirmation(...)

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
        
        ensure_order_columns(db)
        
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
        
        ensure_order_items_columns(db)
        
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
            
            # Insert order item using raw SQL with proper JSONB casting
            # Use CAST instead of ::jsonb in VALUES to avoid SQL syntax error
            db.execute(text("""
                INSERT INTO order_items 
                (order_id, product_id, product_name, quantity, unit_price, total_price, 
                 specifications, design_files, status)
                VALUES 
                (:order_id, :product_id, :product_name, :quantity, :unit_price, :total_price,
                 CAST(:specifications AS jsonb), CAST(:design_files AS jsonb), :status)
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
        
        first_item = order_data.items[0] if order_data.items else None
        notification_payload: Dict[str, Any] = {
            "order_id": order_result[0],
            "order_number": order_number,
            "customer_name": order_data.customer_name,
            "customer_phone": order_data.customer_phone,
            "total_amount": float(order_data.total_amount),
            "final_amount": float(order_data.final_amount),
            "delivery_type": order_data.delivery_type,
            "service_name": order_data.service_name or (first_item.service_name if first_item else None),
            "items_count": len(order_data.items),
            "created_at": order_result[14].isoformat() if order_result[14] else datetime.utcnow().isoformat(),
        }

        # Add background task for external notifications (email/SMS)
        background_tasks.add_task(send_order_notification, notification_payload)

        # بث الإشعار الفوري للموظفين عبر WebSocket
        try:
            await order_notifications.broadcast({
                "event": "order_created",
                "data": notification_payload
            })
        except Exception as notify_error:
            print(f"⚠️ Failed to broadcast order notification: {notify_error}")
        
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
    """Get all orders with their details and items"""
    try:
        ensure_order_columns(db)
        ensure_order_items_columns(db)
        orders = db.query(Order).order_by(Order.created_at.desc()).limit(100).all()
        order_ids = [order.id for order in orders]

        items_map: Dict[int, List[OrderItem]] = defaultdict(list)
        if order_ids:
            items = db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).all()
            for item in items:
                items_map[item.order_id].append(item)

        def serialize_decimal(value):
            if value is None:
                return None
            try:
                return float(value)
            except Exception:
                return value

        orders_payload = []
        for order in orders:
            order_items_payload = []
            for item in items_map.get(order.id, []):
                specs = item.specifications
                if isinstance(specs, str):
                    try:
                        specs = json.loads(specs)
                    except Exception:
                        specs = {"raw": specs}

                design_files = item.design_files
                if isinstance(design_files, str):
                    try:
                        design_files = json.loads(design_files)
                    except Exception:
                        design_files = [design_files]
                if design_files is None:
                    design_files = []
                if isinstance(design_files, list):
                    normalized_files = []
                    for design_item in design_files:
                        if isinstance(design_item, dict):
                            normalized_files.append(design_item)
                        else:
                            normalized_files.append({"filename": str(design_item)})
                    design_files = normalized_files

                order_items_payload.append({
                    "id": item.id,
                    "service_name": getattr(item, "product_name", None),
                    "quantity": item.quantity,
                    "unit_price": serialize_decimal(item.unit_price),
                    "total_price": serialize_decimal(item.total_price),
                    "specifications": specs,
                    "design_files": design_files,
                    "status": item.status,
                    "created_at": item.created_at.isoformat() if item.created_at else None
                })

            orders_payload.append({
                "id": order.id,
                "order_number": order.order_number,
                "status": order.status,
                "total_amount": serialize_decimal(order.total_amount),
                "final_amount": serialize_decimal(order.final_amount),
                "payment_status": order.payment_status,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "updated_at": order.updated_at.isoformat() if getattr(order, "updated_at", None) else None,
                "customer_name": order.customer_name,
                "customer_phone": order.customer_phone,
                "customer_whatsapp": order.customer_whatsapp,
                "shop_name": order.shop_name,
                "delivery_type": order.delivery_type,
                "delivery_address": order.delivery_address,
                "delivery_latitude": serialize_decimal(getattr(order, "delivery_latitude", None)),
                "delivery_longitude": serialize_decimal(getattr(order, "delivery_longitude", None)),
                "notes": order.notes,
                "items": order_items_payload
            })

        return {
            "success": True,
            "orders": orders_payload
        }
    except Exception as e:
        print(f"Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الطلبات: {str(e)}")

@router.get("/{order_id}/attachments")
async def get_order_attachments(order_id: int, db: Session = Depends(get_db)):
    ensure_order_columns(db)
    ensure_order_items_columns(db)

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")

    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    attachments: List[Dict[str, Any]] = []
    attachments_by_key: Dict[str, Dict[str, Any]] = {}

    for item in items:
        design_files = item.design_files
        if not design_files:
            continue

        if isinstance(design_files, str):
            try:
                design_files = json.loads(design_files)
            except Exception:
                design_files = [design_files]

        if not isinstance(design_files, list):
            design_files = [design_files]

        for idx, design_entry in enumerate(design_files):
            normalized = normalize_attachment_entry(design_entry, order.id, item.id, idx)
            if normalized:
                if normalized.get("file_key"):
                    attachments_by_key[str(normalized["file_key"])] = normalized
                normalized["order_item_service_name"] = getattr(item, "product_name", None)
                attachments.append(normalized)

    return {
        "success": True,
        "attachments": attachments,
        "count": len(attachments),
        "attachments_map": attachments_by_key,
    }


@router.get("/{order_id}/attachments/{file_key}")
async def download_order_attachment(order_id: int, file_key: str, db: Session = Depends(get_db)):
    ensure_order_columns(db)
    ensure_order_items_columns(db)

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")

    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()

    normalized_entry: Optional[Dict[str, Any]] = None

    for item in items:
        design_files = item.design_files
        if not design_files:
            continue

        if isinstance(design_files, str):
            try:
                design_files = json.loads(design_files)
            except Exception:
                design_files = [design_files]

        if not isinstance(design_files, list):
            design_files = [design_files]

        for idx, design_entry in enumerate(design_files):
            normalized = normalize_attachment_entry(design_entry, order.id, item.id, idx)
            if normalized and str(normalized.get("file_key")) == file_key:
                normalized_entry = normalized
                break
        if normalized_entry:
            break

    if not normalized_entry:
        raise HTTPException(status_code=404, detail="الملف غير موجود لهذا الطلب")

    file_url = normalized_entry.get("url") or normalized_entry.get("download_url")
    if not file_url:
        raise HTTPException(status_code=400, detail="لا يوجد رابط صالح للملف")

    if file_url.startswith("data:"):
        try:
            import base64
            header, encoded = file_url.split(",", 1)
            mime_type = "application/octet-stream"
            if ";" in header:
                mime_type = header.split(";")[0].replace("data:", "") or mime_type
            file_bytes = base64.b64decode(encoded)
            response = StreamingResponse(BytesIO(file_bytes), media_type=mime_type)
            response.headers["Content-Disposition"] = f'attachment; filename="{normalized_entry.get("filename", "attachment")}"'
            return response
        except Exception:
            raise HTTPException(status_code=500, detail="تعذر تحويل الملف من base64")

    return RedirectResponse(file_url, status_code=302)

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