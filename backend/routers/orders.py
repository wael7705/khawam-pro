from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect, or_, func
from database import get_db
from models import Order, OrderItem, User
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
import uuid
from datetime import datetime
from collections import defaultdict
import json
import os
import base64
import mimetypes
import re
from notifications import order_notifications
import asyncio
from routers.auth import get_current_active_user, get_current_user_optional
from io import BytesIO

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
    delivery_address_details: Optional[str] = None  # بيانات إضافية للعنوان (الطابق، رقم الشقة، ملاحظات)
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
    if 'delivery_address_details' not in current:
        column_statements.append("ADD COLUMN delivery_address_details TEXT")
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

    # إضافة index على customer_phone لتسريع البحث - مهم جداً للأداء
    try:
        # التحقق من وجود index
        indexes = inspector.get_indexes('orders')
        index_names = [idx['name'] for idx in indexes]
        
        if 'idx_orders_customer_phone' not in index_names:
            db.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone)"))
            db.commit()
            print("✅ Created index on orders.customer_phone for performance")
        else:
            print("✅ Index on orders.customer_phone already exists")
    except Exception as index_error:
        print(f"⚠️ Unable to create index on customer_phone: {index_error}")
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

def get_public_base_url(request: Optional[Request] = None) -> str:
    """Get the public base URL for file serving"""
    # Try environment variables first
    base = (
        os.getenv("PUBLIC_BASE_URL")
        or os.getenv("FRONTEND_BASE_URL")
        or os.getenv("API_PUBLIC_BASE_URL")
        or os.getenv("APP_BASE_URL")
        or os.getenv("API_URL")
    )
    
    # If no env variable, try to infer from request
    if not base and request:
        base = str(request.base_url).rstrip('/')
        # Remove /api suffix if present
        if base.endswith('/api'):
            base = base[:-4]
    
    # If still no base, return empty (will use relative URLs)
    return base.rstrip('/') if base else ""

def build_file_url(raw_path: Optional[str], request: Optional[Request] = None) -> str:
    """Build a file URL, checking if file exists locally"""
    if not raw_path:
        return ""
    raw_path = str(raw_path).strip()
    if not raw_path:
        return ""
    if raw_path.startswith("data:"):
        return raw_path
    if raw_path.startswith("http://") or raw_path.startswith("https://"):
        return raw_path
    
    # Check if file exists locally
    if raw_path.startswith("/uploads/"):
        local_path = raw_path.lstrip("/")
        # Normalize path separators for Windows
        local_path = local_path.replace("/", os.sep)
        if os.path.exists(local_path) and os.path.isfile(local_path):
            # File exists, return the URL
            base = get_public_base_url(request)
            if base:
                return f"{base}{raw_path}"
            else:
                # No base URL, return relative path (will work with static file serving)
                return raw_path
        else:
            # File doesn't exist, but return URL anyway (might be on different server)
            base = get_public_base_url(request)
            if base:
                return f"{base}{raw_path}"
            else:
                return raw_path
    
    # For other paths, just build URL
    base = get_public_base_url(request)
    if raw_path.startswith("/"):
        return f"{base}{raw_path}" if base else raw_path
    return f"{base}/{raw_path}" if base else f"/{raw_path}"

def normalize_attachment_entry(
    entry: Any,
    order_id: int,
    order_item_id: Optional[int],
    index: int,
    request: Optional[Request] = None
) -> Optional[Dict[str, Any]]:
    """Normalize an attachment entry and verify file exists if it's a local file"""
    if not entry:
        return None

    filename = None
    raw_path = None
    location = None
    mime_type = None
    size_label = None
    size_in_bytes = None
    file_exists = False

    if isinstance(entry, dict):
        filename = entry.get("filename") or entry.get("name") or entry.get("original_name")
        raw_path = (
            entry.get("url")
            or entry.get("download_url")
            or entry.get("raw_path")
            or entry.get("path")
            or entry.get("file")
            or entry.get("location_url")
        )
        location = entry.get("location") or entry.get("position") or entry.get("side")
        mime_type = entry.get("mime_type") or entry.get("mimetype") or entry.get("content_type")
        size_label = entry.get("size_label")
        size_in_bytes = entry.get("size") or entry.get("size_in_bytes")
        
        # If we have a filename but no path, try to construct it
        if not raw_path and filename:
            # Try to find the file in the order's upload directory
            # This is a fallback - the path should already be set during order creation
            raw_path = f"/uploads/{filename}"
    else:
        raw_path = str(entry).strip()
        filename = os.path.basename(raw_path.split("?")[0]) if raw_path else None

    if not raw_path:
        return None

    # Check if it's a data URL (base64 encoded)
    # Important: If we have a file path in the entry, prefer it over data URL (especially for large files)
    file_path_preferred = None
    if isinstance(entry, dict):
        file_path_preferred = entry.get("raw_path") or entry.get("path") or entry.get("file")
        # Only use if it's not a data URL and looks like a file path
        if file_path_preferred and not str(file_path_preferred).startswith("data:") and (
            str(file_path_preferred).startswith("/uploads/") or 
            str(file_path_preferred).startswith("http://") or 
            str(file_path_preferred).startswith("https://")
        ):
            print(f"✅ Found file path in entry, preferring it over data URL: {file_path_preferred}")
            raw_path = str(file_path_preferred)
    
    if raw_path.startswith("data:"):
        # Check data URL size - large data URLs can cause HTTP/2 protocol errors
        data_url_size = len(raw_path)
        if data_url_size > 100000:  # More than ~100KB
            print(f"⚠️ Large data URL detected ({data_url_size} bytes)")
            # If we have a file path alternative, use it instead
            if file_path_preferred and not str(file_path_preferred).startswith("data:"):
                print(f"✅ Using file path instead of large data URL")
                raw_path = str(file_path_preferred)
                # Process as file path below
            else:
                print(f"⚠️ No file path alternative, using large data URL (may cause performance issues)")
                file_url = raw_path
                file_exists = True
                # Try to extract filename from data URL if not already set
                if not filename:
                    try:
                        header = raw_path.split(",")[0]
                        if "filename=" in header:
                            filename_match = re.search(r'filename=([^;]+)', header)
                            if filename_match:
                                filename = filename_match.group(1)
                    except:
                        pass
                    if not filename:
                        filename = "ملف"
                # Try to get file size from data URL
                if not size_in_bytes:
                    try:
                        encoded = raw_path.split(",", 1)[1]
                        size_in_bytes = len(base64.b64decode(encoded))
                    except:
                        pass
        else:
            # Small data URL, use it directly
            file_url = raw_path
            file_exists = True
            # Try to extract filename from data URL if not already set
            if not filename:
                try:
                    header = raw_path.split(",")[0]
                    if "filename=" in header:
                        filename_match = re.search(r'filename=([^;]+)', header)
                        if filename_match:
                            filename = filename_match.group(1)
                except:
                    pass
                if not filename:
                    filename = "ملف"
            # Try to get file size from data URL
            if not size_in_bytes:
                try:
                    encoded = raw_path.split(",", 1)[1]
                    size_in_bytes = len(base64.b64decode(encoded))
                except:
                    pass
    
    # If we're still processing (not a data URL or we switched to file path), handle file paths
    if not file_url or (raw_path and not raw_path.startswith("data:")):
        if raw_path.startswith("http://") or raw_path.startswith("https://"):
            # External URL, assume it exists
            file_url = raw_path
            file_exists = True
        elif raw_path.startswith("/uploads/"):
            # Local file path - check if it exists
            local_path = raw_path.lstrip("/")
            local_path = local_path.replace("/", os.sep)
            file_exists = os.path.exists(local_path) and os.path.isfile(local_path)
            if file_exists and not size_in_bytes:
                try:
                    size_in_bytes = os.path.getsize(local_path)
                except:
                    pass
            if file_exists and not mime_type:
                mime_type, _ = mimetypes.guess_type(local_path)
            
            # Always build URL (even if file doesn't exist, it might be served by StaticFiles)
            file_url = build_file_url(raw_path, request)
        else:
            # Relative path, assume it might exist
            file_exists = False
            file_url = build_file_url(raw_path, request)

    # Extract filename from path if not set
    if not filename and raw_path:
        if raw_path.startswith("data:"):
            # For data URLs, try to extract filename from header
            try:
                header = raw_path.split(",")[0]
                if "filename=" in header:
                    filename_match = re.search(r'filename=([^;]+)', header)
                    if filename_match:
                        filename = filename_match.group(1)
            except:
                pass
        if not filename:
            filename = os.path.basename(raw_path.split("?")[0])
        if not filename or filename == "/":
            filename = "ملف"

    # Generate file key for identification
    file_key = f"{order_id}-{order_item_id or 'item'}-{index}"

    # Get data_url from entry if available (for fallback or primary use)
    data_url = None
    if isinstance(entry, dict):
        data_url = entry.get("data_url")
        if data_url and not data_url.startswith("data:"):
            data_url = None
    elif isinstance(entry, str) and entry.startswith("data:"):
        data_url = entry
    
    # If raw_path is a data URL and we're using it, also set it as data_url
    # This ensures data_url is always available when we have a data URL
    if raw_path and raw_path.startswith("data:") and file_url == raw_path:
        data_url = raw_path

    # Priority: If file doesn't exist locally and we have data_url, use data_url as primary URL
    # This is crucial for Railway's ephemeral filesystem where files may not persist
    primary_url = file_url
    if not file_exists and data_url and data_url.startswith("data:"):
        print(f"⚠️ File {raw_path} not found locally, using data URL as primary URL")
        primary_url = data_url
        # Also update mime_type from data URL if not set
        if not mime_type:
            try:
                header = data_url.split(",")[0]
                if ";" in header:
                    mime_type = header.split(";")[0].replace("data:", "").strip()
            except:
                pass
    # Also, if file_url is already a data URL, ensure data_url is set to it
    elif file_url and file_url.startswith("data:") and not data_url:
        data_url = file_url

    if not primary_url:
        return None

    return {
        "id": file_key,
        "file_key": file_key,
        "order_item_id": order_item_id,
        "filename": filename or "ملف",
        "raw_path": raw_path,
        "url": primary_url,  # Use data_url if file doesn't exist, otherwise use file_url
        "download_url": primary_url,
        "location": location,
        "mime_type": mime_type,
        "size_label": size_label,
        "size_in_bytes": size_in_bytes,
        "file_exists": file_exists,  # Add flag to indicate if file exists locally
        "data_url": data_url,  # Keep data URL as fallback/primary source
    }
# Background task for notifications
async def send_order_notification(payload: Dict[str, Any]):
    """إرسال إشعارات خلفية (SMS/Email) - يمكن توسيعها لاحقاً."""
    order_number = payload.get("order_number")
    customer_name = payload.get("customer_name")
    customer_phone = payload.get("customer_phone")
    print(f"📧 Notification: Order {order_number} created for {customer_name} ({customer_phone})")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_email_notification_sync, payload)

EMAIL_RECIPIENTS = [email.strip() for email in os.getenv("ORDER_NOTIFICATION_EMAILS", "eyadmrx@gmail.com").split(",") if email.strip()]
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() != "false"
EMAIL_SENDER = os.getenv("EMAIL_FROM") or SMTP_USERNAME or "no-reply@khawam.app"


def _send_email_notification_sync(payload: Dict[str, Any]) -> None:
    if not EMAIL_RECIPIENTS:
        return
    if not (SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD):
        print("⚠️ Email notification skipped: SMTP configuration is incomplete.")
        return

    try:
        from email.message import EmailMessage
        import smtplib

        order_number = payload.get("order_number", "ORD-UNKNOWN")
        customer_name = payload.get("customer_name", "عميل")
        customer_phone = payload.get("customer_phone", "")
        service_name = payload.get("service_name") or "خدمة"
        total_amount = payload.get("final_amount") or payload.get("total_amount") or 0
        items_count = payload.get("items_count") or 0
        created_at = payload.get("created_at")

        subject = f"🚨 طلب جديد: {order_number}"
        body = (
            f"تم استلام طلب جديد.\n\n"
            f"رقم الطلب: {order_number}\n"
            f"اسم العميل: {customer_name}\n"
            f"هاتف العميل: {customer_phone}\n"
            f"الخدمة: {service_name}\n"
            f"عدد العناصر: {items_count}\n"
            f"المبلغ النهائي: {total_amount}\n"
            f"تاريخ الإنشاء: {created_at}\n"
        )

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = EMAIL_SENDER
        msg["To"] = ", ".join(EMAIL_RECIPIENTS)
        msg.set_content(body)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        print(f"📨 Email notification sent to {', '.join(EMAIL_RECIPIENTS)} for order {order_number}")
    except Exception as email_error:
        print(f"⚠️ Failed to send email notification: {email_error}")


def _decode_data_url(data_url: str) -> Optional[Tuple[bytes, str]]:
    if not data_url or not data_url.startswith("data:"):
        return None
    try:
        header, encoded = data_url.split(",", 1)
    except ValueError:
        return None
    mime_type = header.split(";")[0].replace("data:", "") or "application/octet-stream"
    try:
        file_data = base64.b64decode(encoded, validate=True)
    except Exception:
        return None
    extension = mimetypes.guess_extension(mime_type) or ".bin"
    return file_data, extension


def _secure_filename(filename: str) -> str:
    filename = filename or "attachment"
    filename = filename.strip().replace("\\", "/").split("/")[-1]
    filename = re.sub(r"[^A-Za-z0-9.\-_]+", "_", filename)
    if not filename:
        filename = "attachment"
    return filename


def _safe_design_file_list(design_files: Any) -> List[Any]:
    if design_files is None:
        return []
    if isinstance(design_files, list):
        return [entry for entry in design_files if entry is not None]
    if isinstance(design_files, (tuple, set)):
        return [entry for entry in design_files if entry is not None]
    if isinstance(design_files, str):
        try:
            parsed = json.loads(design_files)
            return _safe_design_file_list(parsed)
        except Exception:
            return [design_files]
    if isinstance(design_files, dict):
        return [design_files]
    return [design_files]


def _persist_design_files(
    order_number: str,
    item_index: int,
    design_files: Optional[List[Any]]
) -> List[Any]:
    print(f"📎 _persist_design_files called for order {order_number}, item {item_index}")
    print(f"📎 Input design_files: {design_files}, type: {type(design_files)}, length: {len(design_files) if design_files else 0}")
    
    if not design_files:
        print(f"⚠️ No design_files provided for order {order_number}, item {item_index}")
        return []

    base_dir = os.path.join("uploads", "orders", order_number, f"item-{item_index + 1}")
    os.makedirs(base_dir, exist_ok=True)
    web_base = f"/uploads/orders/{order_number}/item-{item_index + 1}"
    print(f"📁 Base directory: {base_dir}, web_base: {web_base}")

    persisted_entries: List[Any] = []

    for idx, entry in enumerate(design_files):
        try:
            print(f"  Processing entry[{idx}]: type={type(entry)}, value preview={str(entry)[:100] if entry else 'None'}...")
            if isinstance(entry, str):
                if entry.startswith("data:"):
                    print(f"    Found data URL, decoding...")
                    result = _decode_data_url(entry)
                    if not result:
                        print(f"    ⚠️ Failed to decode data URL")
                        continue
                    file_bytes, extension = result
                    filename = _secure_filename(f"attachment-{idx + 1}{extension}")
                    file_path = os.path.join(base_dir, filename)
                    try:
                        with open(file_path, "wb") as file_obj:
                            file_obj.write(file_bytes)
                        # Verify file was written
                        if os.path.exists(file_path) and os.path.getsize(file_path) == len(file_bytes):
                            persisted_entry = {
                                "filename": filename,
                                "url": f"{web_base}/{filename}",
                                "download_url": f"{web_base}/{filename}",
                                "raw_path": f"{web_base}/{filename}",
                                "size_in_bytes": len(file_bytes),
                                "data_url": entry  # Keep original data URL as fallback
                            }
                            persisted_entries.append(persisted_entry)
                            print(f"    ✅ Persisted file: {filename} ({len(file_bytes)} bytes) -> {file_path}")
                            print(f"    ✅ File verified: exists={os.path.exists(file_path)}, size={os.path.getsize(file_path)}")
                        else:
                            print(f"    ❌ File verification failed: {file_path}")
                    except Exception as write_error:
                        print(f"    ❌ Failed to write file {file_path}: {write_error}")
                        import traceback
                        traceback.print_exc()
                else:
                    print(f"    ✅ Keeping string entry as-is: {entry[:50]}...")
                    persisted_entries.append(entry)
                continue

            if isinstance(entry, dict):
                # البحث عن data URL في جميع المفاتيح المحتملة
                data_url = (
                    entry.get("data_url") or 
                    entry.get("url") or 
                    entry.get("download_url") or 
                    entry.get("raw_path") or 
                    entry.get("file") or
                    entry.get("path") or
                    entry.get("href") or
                    entry.get("location_url") or
                    entry.get("src") or
                    entry.get("data")
                )
                saved_entry = dict(entry)
                print(f"    Found dict entry - keys: {list(entry.keys())}, data_url preview: {str(data_url)[:80] if data_url else 'None'}...")

                if data_url and str(data_url).startswith("data:"):
                    print(f"    Found data URL in dict, decoding...")
                    result = _decode_data_url(str(data_url))
                    if result:
                        file_bytes, extension = result
                        filename = _secure_filename(saved_entry.get("filename") or f"attachment-{idx + 1}{extension}")
                        file_path = os.path.join(base_dir, filename)
                        try:
                            with open(file_path, "wb") as file_obj:
                                file_obj.write(file_bytes)
                            # Verify file was written
                            if os.path.exists(file_path) and os.path.getsize(file_path) == len(file_bytes):
                                # تحديث جميع URLs في saved_entry
                                file_url = f"{web_base}/{filename}"
                                saved_entry["url"] = file_url
                                saved_entry["download_url"] = file_url
                                saved_entry["raw_path"] = file_url
                                saved_entry["size_in_bytes"] = len(file_bytes)
                                # احتفظ بـ data_url كنسخة احتياطية إذا لزم الأمر
                                # saved_entry.pop("data_url", None)  # لا تحذف data_url - قد نحتاجه لاحقاً
                                saved_entry.pop("file_key", None)
                                
                                print(f"    ✅ Persisted file from dict: {filename} ({len(file_bytes)} bytes) -> {file_url}")
                                print(f"    ✅ File verified: exists={os.path.exists(file_path)}, size={os.path.getsize(file_path)}")
                            else:
                                print(f"    ❌ File verification failed: {file_path}")
                                # احتفظ بالـ data URL كنسخة احتياطية
                                saved_entry["url"] = data_url
                                saved_entry["download_url"] = data_url
                                saved_entry["raw_path"] = data_url
                        except Exception as write_error:
                            print(f"    ❌ Failed to write file {file_path}: {write_error}")
                            import traceback
                            traceback.print_exc()
                            # احتفظ بالـ data URL كنسخة احتياطية
                            saved_entry["url"] = data_url
                            saved_entry["download_url"] = data_url
                            saved_entry["raw_path"] = data_url
                    else:
                        print(f"    ⚠️ Failed to decode data URL from dict")
                        # إذا فشل decoding، احتفظ بالـ data URL الأصلي
                        if data_url:
                            saved_entry["url"] = data_url
                            saved_entry["download_url"] = data_url
                            saved_entry["raw_path"] = data_url
                elif data_url and isinstance(data_url, str):
                    # إذا كان URL موجود لكن ليس data URL
                    if data_url.startswith("/uploads/"):
                        # رابط موجود بالفعل في uploads
                        saved_entry["url"] = data_url
                        saved_entry["download_url"] = data_url
                        saved_entry["raw_path"] = data_url
                        print(f"    ✅ Using existing upload path: {data_url}")
                    elif data_url.startswith("http://") or data_url.startswith("https://"):
                        # رابط HTTP/HTTPS خارجي
                        saved_entry["url"] = data_url
                        saved_entry["download_url"] = data_url
                        saved_entry["raw_path"] = data_url
                        print(f"    ✅ Using external URL: {data_url[:80]}...")
                    else:
                        # رابط آخر - احتفظ به كما هو
                        saved_entry["url"] = data_url
                        saved_entry["download_url"] = data_url
                        saved_entry["raw_path"] = data_url
                        print(f"    ✅ Keeping dict entry with URL: {data_url[:80]}...")
                else:
                    # إذا لم يكن هناك URL، لكن لدينا filename، جرب إنشاء URL
                    filename = saved_entry.get("filename") or saved_entry.get("name") or saved_entry.get("original_name")
                    if filename:
                        file_url = f"{web_base}/{_secure_filename(filename)}"
                        saved_entry["url"] = file_url
                        saved_entry["download_url"] = file_url
                        saved_entry["raw_path"] = file_url
                        print(f"    ✅ Created URL from filename: {file_url}")
                    else:
                        print(f"    ⚠️ No URL or filename found in dict entry: {list(entry.keys())}")

                # تنظيف المفاتيح غير الضرورية
                saved_entry.pop("file_key", None)
                persisted_entries.append(saved_entry)
            else:
                print(f"    ✅ Keeping entry as-is (type: {type(entry)})")
                persisted_entries.append(entry)
        except Exception as persist_error:
            print(f"⚠️ Failed to persist design file #{idx+1} for order {order_number}: {persist_error}")
            import traceback
            traceback.print_exc()

    print(f"✅ _persist_design_files completed: {len(persisted_entries)} entries persisted")
    return persisted_entries

@router.post("/")
async def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
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
        
        # ربط الطلب بالمستخدم الحالي إذا كان مسجل دخول
        customer_id = None
        if current_user:
            customer_id = current_user.id
            print(f"✅ Order {order_number} linked to user ID: {customer_id}")
        
        order_dict = {
            'order_number': order_number,
            'customer_id': customer_id,
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
        
        # Add delivery_address_details if column exists and value provided
        if 'delivery_address_details' in existing_columns and order_data.delivery_type == "delivery":
            if order_data.delivery_address_details is not None:
                order_dict['delivery_address_details'] = order_data.delivery_address_details
        
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
        
        # متغير لحفظ أول صورة للطلب (لإظهارها في الإشعار)
        first_order_image_url = None
        
        # Create order items using raw SQL
        for item_index, item_data in enumerate(order_data.items):
            # Prepare specifications JSON
            specs = {}
            if item_data.specifications:
                specs.update(item_data.specifications)
            if item_data.dimensions:
                specs["dimensions"] = item_data.dimensions
            if item_data.colors:
                specs["colors"] = item_data.colors
            
            import json
            
            # Collect design_files - من item_data.design_files فقط
            # لا نجمع من specifications.design_files لتجنب التكرار
            design_files_list = _safe_design_file_list(item_data.design_files)
            print(f"📎 Order {order_number}, Item {item_index}: Found {len(design_files_list)} design_files from item_data.design_files")
            
            # نبحث في مفاتيح specifications الأخرى (لكن نتجاهل design_files لتجنب التكرار)
            # فقط المفاتيح الأخرى مثل files, attachments, etc.
            if specs:
                for key, value in specs.items():
                    # نتجاهل design_files لأنها موجودة في design_files column
                    if key == 'design_files':
                        continue
                    if value:
                        # إذا كان المفتاح يحتوي على "file" أو "upload" أو "attachment"
                        key_lower = key.lower()
                        if any(term in key_lower for term in ['file', 'upload', 'attachment', 'image', 'document', 'pdf']):
                            print(f"📎 Order {order_number}, Item {item_index}: Found potential file key '{key}' in specifications")
                            file_entries = _safe_design_file_list(value)
                            if file_entries:
                                print(f"  ✅ Found {len(file_entries)} files in '{key}'")
                                for file_entry in file_entries:
                                    # تجنب التكرار - تحقق من أن الملف غير موجود بالفعل
                                    if file_entry not in design_files_list:
                                        design_files_list.append(file_entry)
                                        print(f"  ✅ Added file from '{key}': {str(file_entry)[:50]}")
                                    else:
                                        print(f"  ⏭️ Skipped duplicate file from '{key}'")
            
            print(f"📎 Order {order_number}, Item {item_index}: Final design_files count: {len(design_files_list)}")
            
            # حفظ أول صورة من design_files_list للإشعار (فقط من أول عنصر)
            if item_index == 0 and not first_order_image_url and design_files_list:
                try:
                    for file_entry in design_files_list:
                        file_url = None
                        if isinstance(file_entry, dict):
                            file_url = file_entry.get('url') or file_entry.get('file_url') or file_entry.get('download_url') or file_entry.get('data_url')
                        elif isinstance(file_entry, str):
                            file_url = file_entry
                        
                        if file_url:
                            # إذا كانت صورة (data URL أو رابط http)
                            if file_url.startswith('data:image') or file_url.startswith('http'):
                                first_order_image_url = file_url
                                break
                except Exception as img_error:
                    print(f"⚠️ Failed to extract image URL from design_files: {img_error}")
            
            # Persist design files to disk
            persisted_design_files = _persist_design_files(
                order_number,
                item_index,
                design_files_list
            )
            print(f"📎 Order {order_number}, Item {item_index}: Persisted {len(persisted_design_files)} design_files")
            
            # إذا لم نجد صورة من data URL، نحاول الحصول على رابط من persisted files
            if item_index == 0 and not first_order_image_url and persisted_design_files:
                try:
                    for file_entry in persisted_design_files:
                        if isinstance(file_entry, dict) and file_entry.get('file_key'):
                            file_key = file_entry.get('file_key')
                            if file_key:
                                # بناء رابط للصورة من الخادم
                                public_base_url = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")
                                if not public_base_url:
                                    domain = os.getenv("RAILWAY_PUBLIC_DOMAIN", "").strip()
                                    if domain:
                                        public_base_url = f"https://{domain}" if not domain.startswith("http") else domain
                                    else:
                                        public_base_url = "https://khawam-pro-production.up.railway.app"
                                first_order_image_url = f"{public_base_url}/api/orders/{order_id}/attachments/{file_key}"
                                break
                except Exception as img_error:
                    print(f"⚠️ Failed to build image URL from persisted files: {img_error}")
            
            # Save design_files in design_files column ONLY
            # لا نضيف design_files إلى specifications لتجنب التكرار
            # الملفات موجودة في design_files column وهذا كافٍ
            design_files_json = json.dumps(persisted_design_files or [])
            
            # إزالة design_files من specifications إذا كانت موجودة لتجنب التكرار
            if 'design_files' in specs:
                # نحتفظ فقط بالملفات الموجودة في specifications إذا لم تكن موجودة في design_files column
                # لكن لتجنب التكرار، نزيل design_files من specifications تماماً
                # لأن الملفات موجودة في design_files column
                removed_from_specs = specs.pop('design_files', None)
                if removed_from_specs:
                    print(f"📎 Removed design_files from specifications to avoid duplication (files are in design_files column)")
            
            # لا نضيف design_files إلى specifications بعد الآن لتجنب التكرار
            
            specs_json = json.dumps(specs) if specs else None
            
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
            "image_url": first_order_image_url,  # صورة الطلب للإشعار (تم استخراجها من design_files)
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
async def get_orders(
    my_orders: bool = Query(False, description="إذا كان True، نفلتر بناءً على customer_id حتى للمديرين"),  # Query parameter للفلترة
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get all orders with their details and items. 
    If user is a customer, only returns their orders.
    If user is admin or employee and my_orders=False, returns all orders.
    If my_orders=True, filters by customer_id even for admins/employees."""
    try:
        import time
        start_time = time.time()
        
        # التأكد من وجود الفهرس على customer_phone (مرة واحدة فقط عند الحاجة)
        # هذا مهم للأداء لكننا نريد أن يكون سريعاً
        try:
            from sqlalchemy import inspect as sql_inspect
            inspector = sql_inspect(db.bind)
            indexes = inspector.get_indexes('orders')
            index_names = [idx['name'] for idx in indexes]
            if 'idx_orders_customer_phone' not in index_names:
                # إنشاء الفهرس إذا لم يكن موجوداً
                db.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone)"))
                db.commit()
                print("✅ Created index on orders.customer_phone")
        except Exception as index_check_error:
            # لا نريد أن نوقف العملية إذا فشل إنشاء الفهرس
            print(f"⚠️ Could not ensure index exists: {index_check_error}")
        
        # تحديد نوع المستخدم - إذا كان "عميل" نفلتر الطلبات
        user_role = None
        customer_phone_variants = []
        
        if current_user:
            # الحصول على نوع المستخدم من قاعدة البيانات مع استخدام cache
            # مع معالجة الأخطاء للتعامل مع حالات user_type_id = None أو فشل الاستعلام
            try:
                if current_user.user_type_id is not None:
                    # استخدام cache function من auth module
                    from routers.auth import _get_user_type_name
                    user_role = _get_user_type_name(current_user.user_type_id, db)
                    
                    if user_role:
                        print(f"✅ Orders API - User role found: {user_role} (user_type_id: {current_user.user_type_id})")
                    else:
                        print(f"⚠️ Orders API - User type not found for user_type_id: {current_user.user_type_id}")
                else:
                    print(f"⚠️ Orders API - user_type_id is None for user {current_user.id}")
            except Exception as user_type_error:
                print(f"❌ Orders API - Error fetching user type: {user_type_error}")
                import traceback
                traceback.print_exc()
                # نستمر في التنفيذ - سنتعامل مع user_role = None كعميل
            
            print(f"⏱️ Orders API - User role lookup: {time.time() - start_time:.2f}s")
            
            # بناء قائمة بأشكال رقم الهاتف الممكنة للبحث
            if current_user.phone:
                try:
                    from routers.auth import normalize_phone
                    normalized_phone = normalize_phone(current_user.phone)
                    customer_phone_variants = [
                        current_user.phone,
                        normalized_phone,
                        '+' + normalized_phone,
                    ]
                    
                    if current_user.phone.startswith('0'):
                        customer_phone_variants.extend([
                            '963' + current_user.phone[1:],
                            '+963' + current_user.phone[1:]
                        ])
                    if current_user.phone.startswith('+963'):
                        customer_phone_variants.append(current_user.phone[1:])
                    if current_user.phone.startswith('963') and not current_user.phone.startswith('+'):
                        customer_phone_variants.append('+' + current_user.phone)
                    
                    print(f"✅ Orders API - Phone variants: {customer_phone_variants}")
                except Exception as phone_error:
                    print(f"❌ Orders API - Error normalizing phone: {phone_error}")
                    # نستخدم رقم الهاتف كما هو إذا فشل التطبيع
                    customer_phone_variants = [current_user.phone] if current_user.phone else []
            else:
                print(f"⚠️ Orders API - User has no phone number")
        
        # جلب الطلبات مع الفلترة
        if not current_user:
            # إذا لم يكن هناك مستخدم مسجل دخول، نرجع خطأ
            raise HTTPException(
                status_code=401,
                detail="يجب تسجيل الدخول لعرض الطلبات"
            )
        
        # تحديد نوع المستخدم والفلترة المناسبة
        orders_query_start = time.time()
        try:
            if user_role == "عميل":
                # للعملاء: فلترة الطلبات حسب customer_id فقط
                # يجب أن تظهر فقط الطلبات التي تخص المستخدم الحالي (customer_id = user.id)
                try:
                    params = {}
                    where_clause = None
                    
                    # إضافة شرط customer_id فقط - هذا هو المعيار الأساسي
                    if current_user and current_user.id:
                        where_clause = "customer_id = :customer_id"
                        params['customer_id'] = current_user.id
                        params['limit'] = 100
                        print(f"✅ Orders API - Filtering by customer_id only: {current_user.id}")
                    else:
                        # إذا لم يكن هناك customer_id، لا نرجع أي طلبات
                        print(f"⚠️ Orders API - Customer has no customer_id, returning empty orders")
                        orders = []
                    
                    if where_clause:
                        # استخدام raw SQL مباشرة - أسرع من ORM
                        orders_result = db.execute(text(f"""
                            SELECT id, order_number, customer_id, customer_name, customer_phone, customer_whatsapp,
                                shop_name, status, total_amount, final_amount, payment_status, delivery_type,
                                delivery_address, delivery_latitude, delivery_longitude, delivery_address_details,
                                notes, staff_notes, paid_amount, remaining_amount, rating, rating_comment,
                                created_at, updated_at
                            FROM orders
                            WHERE {where_clause}
                            ORDER BY created_at DESC
                            LIMIT :limit
                        """), params).fetchall()
                        
                        # تحويل النتائج إلى كائنات Order باستخدام setattr لتجنب أخطاء الأعمدة غير الموجودة
                        orders = []
                        for row in orders_result:
                            order = Order()
                            try:
                                order.id = row[0]
                                order.order_number = row[1]
                                if row[2] is not None:
                                    order.customer_id = row[2]
                                if row[3]:
                                    order.customer_name = row[3]
                                if row[4]:
                                    order.customer_phone = row[4]
                                if row[5]:
                                    order.customer_whatsapp = row[5]
                                if row[6]:
                                    order.shop_name = row[6]
                                if row[7]:
                                    order.status = row[7]
                                if row[8] is not None:
                                    order.total_amount = row[8]
                                if row[9] is not None:
                                    order.final_amount = row[9]
                                if row[10]:
                                    order.payment_status = row[10]
                                if row[11]:
                                    order.delivery_type = row[11]
                                if row[12]:
                                    order.delivery_address = row[12]
                                if row[13] is not None:
                                    try:
                                        order.delivery_latitude = row[13]
                                    except AttributeError:
                                        pass  # العمود قد لا يكون موجوداً
                                if row[14] is not None:
                                    try:
                                        order.delivery_longitude = row[14]
                                    except AttributeError:
                                        pass
                                if row[15]:
                                    try:
                                        order.delivery_address_details = row[15]
                                    except AttributeError:
                                        pass
                                if row[16]:
                                    order.notes = row[16]
                                if row[17]:
                                    try:
                                        order.staff_notes = row[17]
                                    except AttributeError:
                                        pass
                                if row[18] is not None:
                                    try:
                                        order.paid_amount = row[18]
                                    except AttributeError:
                                        pass
                                if row[19] is not None:
                                    try:
                                        order.remaining_amount = row[19]
                                    except AttributeError:
                                        pass
                                if row[20] is not None:
                                    try:
                                        order.rating = row[20]
                                    except AttributeError:
                                        pass
                                if row[21]:
                                    try:
                                        order.rating_comment = row[21]
                                    except AttributeError:
                                        pass
                                if row[22]:
                                    order.created_at = row[22]
                                if len(row) > 23 and row[23]:
                                    try:
                                        order.updated_at = row[23]
                                    except AttributeError:
                                        pass
                                orders.append(order)
                            except Exception as row_error:
                                print(f"⚠️ Error processing order row: {row_error}")
                                import traceback
                                traceback.print_exc()
                                continue
                        
                        if orders:
                            print(f"✅ Orders API - Customer orders query: {time.time() - orders_query_start:.2f}s (found {len(orders)} orders for customer_id: {current_user.id})")
                        else:
                            print(f"⚠️ Orders API - No orders found for customer_id: {current_user.id}")
                except Exception as filter_error:
                    print(f"❌ Orders API - Error filtering customer orders: {filter_error}")
                    import traceback
                    traceback.print_exc()
                    orders = []
            elif user_role in ("مدير", "موظف"):
                # للمديرين والموظفين: 
                # إذا كان my_orders=True، نفلتر بناءً على customer_id (لصفحة "طلباتي")
                # إذا كان my_orders=False، نعرض جميع الطلبات (للوحة التحكم)
                if my_orders:
                    # فلترة بناءً على customer_id - نفس منطق العملاء
                    try:
                        params = {}
                        where_clause = None
                        
                        if current_user and current_user.id:
                            where_clause = "customer_id = :customer_id"
                            params['customer_id'] = current_user.id
                            params['limit'] = 100
                            print(f"✅ Orders API - Admin/Employee filtering by customer_id (my_orders=True): {current_user.id}")
                        else:
                            print(f"⚠️ Orders API - Admin/Employee has no customer_id, returning empty orders")
                            orders = []
                        
                        if where_clause:
                            orders_result = db.execute(text(f"""
                                SELECT id, order_number, customer_id, customer_name, customer_phone, customer_whatsapp,
                                    shop_name, status, total_amount, final_amount, payment_status, delivery_type,
                                    delivery_address, delivery_latitude, delivery_longitude, delivery_address_details,
                                    notes, staff_notes, paid_amount, remaining_amount, rating, rating_comment,
                                    created_at, updated_at
                                FROM orders
                                WHERE {where_clause}
                                ORDER BY created_at DESC
                                LIMIT :limit
                            """), params).fetchall()
                            
                            # تحويل النتائج إلى كائنات Order
                            orders = []
                            for row in orders_result:
                                order = Order()
                                try:
                                    order.id = row[0]
                                    order.order_number = row[1]
                                    if row[2] is not None:
                                        order.customer_id = row[2]
                                    if row[3]:
                                        order.customer_name = row[3]
                                    if row[4]:
                                        order.customer_phone = row[4]
                                    if row[5]:
                                        order.customer_whatsapp = row[5]
                                    if row[6]:
                                        order.shop_name = row[6]
                                    if row[7]:
                                        order.status = row[7]
                                    if row[8] is not None:
                                        order.total_amount = row[8]
                                    if row[9] is not None:
                                        order.final_amount = row[9]
                                    if row[10]:
                                        order.payment_status = row[10]
                                    if row[11]:
                                        order.delivery_type = row[11]
                                    if row[12]:
                                        order.delivery_address = row[12]
                                    if row[13] is not None:
                                        try:
                                            order.delivery_latitude = row[13]
                                        except AttributeError:
                                            pass
                                    if row[14] is not None:
                                        try:
                                            order.delivery_longitude = row[14]
                                        except AttributeError:
                                            pass
                                    if row[15]:
                                        try:
                                            order.delivery_address_details = row[15]
                                        except AttributeError:
                                            pass
                                    if row[16]:
                                        order.notes = row[16]
                                    if row[17]:
                                        try:
                                            order.staff_notes = row[17]
                                        except AttributeError:
                                            pass
                                    if row[18] is not None:
                                        try:
                                            order.paid_amount = row[18]
                                        except AttributeError:
                                            pass
                                    if row[19] is not None:
                                        try:
                                            order.remaining_amount = row[19]
                                        except AttributeError:
                                            pass
                                    if row[20] is not None:
                                        try:
                                            order.rating = row[20]
                                        except AttributeError:
                                            pass
                                    if row[21]:
                                        try:
                                            order.rating_comment = row[21]
                                        except AttributeError:
                                            pass
                                    if row[22]:
                                        order.created_at = row[22]
                                    if len(row) > 23 and row[23]:
                                        try:
                                            order.updated_at = row[23]
                                        except AttributeError:
                                            pass
                                    orders.append(order)
                                except Exception as row_error:
                                    print(f"⚠️ Error processing order row: {row_error}")
                                    continue
                            
                            if orders:
                                print(f"✅ Orders API - Admin/Employee my_orders query: {time.time() - orders_query_start:.2f}s (found {len(orders)} orders for customer_id: {current_user.id})")
                            else:
                                print(f"⚠️ Orders API - No orders found for admin/employee customer_id: {current_user.id}")
                        else:
                            orders = []
                    except Exception as filter_error:
                        print(f"❌ Orders API - Error filtering admin orders by customer_id: {filter_error}")
                        import traceback
                        traceback.print_exc()
                        orders = []
                else:
                    # جلب جميع الطلبات (للوحة التحكم)
                    try:
                        orders_result = db.execute(text("""
                            SELECT id, order_number, customer_id, customer_name, customer_phone, customer_whatsapp,
                                shop_name, status, total_amount, final_amount, payment_status, delivery_type,
                                delivery_address, delivery_latitude, delivery_longitude, delivery_address_details,
                                notes, staff_notes, paid_amount, remaining_amount, rating, rating_comment,
                                created_at, updated_at
                            FROM orders
                            ORDER BY created_at DESC
                            LIMIT 100
                        """)).fetchall()
                    
                    # تحويل النتائج إلى كائنات Order
                    orders = []
                    for row in orders_result:
                        order = Order()
                        try:
                            order.id = row[0]
                            order.order_number = row[1]
                            if row[2] is not None:
                                order.customer_id = row[2]
                            if row[3]:
                                order.customer_name = row[3]
                            if row[4]:
                                order.customer_phone = row[4]
                            if row[5]:
                                order.customer_whatsapp = row[5]
                            if row[6]:
                                order.shop_name = row[6]
                            if row[7]:
                                order.status = row[7]
                            if row[8] is not None:
                                order.total_amount = row[8]
                            if row[9] is not None:
                                order.final_amount = row[9]
                            if row[10]:
                                order.payment_status = row[10]
                            if row[11]:
                                order.delivery_type = row[11]
                            if row[12]:
                                order.delivery_address = row[12]
                            if row[13] is not None:
                                try:
                                    order.delivery_latitude = row[13]
                                except AttributeError:
                                    pass
                            if row[14] is not None:
                                try:
                                    order.delivery_longitude = row[14]
                                except AttributeError:
                                    pass
                            if row[15]:
                                try:
                                    order.delivery_address_details = row[15]
                                except AttributeError:
                                    pass
                            if row[16]:
                                order.notes = row[16]
                            if row[17]:
                                try:
                                    order.staff_notes = row[17]
                                except AttributeError:
                                    pass
                            if row[18] is not None:
                                try:
                                    order.paid_amount = row[18]
                                except AttributeError:
                                    pass
                            if row[19] is not None:
                                try:
                                    order.remaining_amount = row[19]
                                except AttributeError:
                                    pass
                            if row[20] is not None:
                                try:
                                    order.rating = row[20]
                                except AttributeError:
                                    pass
                            if row[21]:
                                try:
                                    order.rating_comment = row[21]
                                except AttributeError:
                                    pass
                            if row[22]:
                                order.created_at = row[22]
                            if len(row) > 23 and row[23]:
                                try:
                                    order.updated_at = row[23]
                                except AttributeError:
                                    pass
                            orders.append(order)
                        except Exception as row_error:
                            print(f"⚠️ Error processing order row: {row_error}")
                            continue
                    
                    print(f"✅ Orders API - Admin/Employee orders query: {time.time() - orders_query_start:.2f}s (found {len(orders)} orders)")
                except Exception as query_error:
                    print(f"❌ Orders API - Error querying admin orders: {query_error}")
                    import traceback
                    traceback.print_exc()
                    orders = []
            else:
                # إذا كان نوع المستخدم غير معروف أو None، نتعامل معه كعميل
                # استخدام customer_id فقط - نفس منطق العملاء
                print(f"⚠️ Orders API - Unknown user role ({user_role}), treating as customer with customer_id filter")
                params = {}
                where_clause = None
                
                # إضافة شرط customer_id فقط
                if current_user and current_user.id:
                    where_clause = "customer_id = :customer_id"
                    params['customer_id'] = current_user.id
                    params['limit'] = 100
                    print(f"✅ Orders API - Unknown role: Filtering by customer_id only: {current_user.id}")
                else:
                    print(f"⚠️ Orders API - Unknown role user has no customer_id, returning empty orders")
                    orders = []
                
                if where_clause:
                    try:
                        orders_result = db.execute(text(f"""
                            SELECT id, order_number, customer_id, customer_name, customer_phone, customer_whatsapp,
                                shop_name, status, total_amount, final_amount, payment_status, delivery_type,
                                delivery_address, delivery_latitude, delivery_longitude, delivery_address_details,
                                notes, staff_notes, paid_amount, remaining_amount, rating, rating_comment,
                                created_at, updated_at
                            FROM orders
                            WHERE {where_clause}
                            ORDER BY created_at DESC
                            LIMIT :limit
                        """), params).fetchall()
                        
                        # تحويل النتائج
                        orders = []
                        for row in orders_result:
                            order = Order()
                            try:
                                order.id = row[0]
                                order.order_number = row[1]
                                if row[2] is not None:
                                    order.customer_id = row[2]
                                if row[3]:
                                    order.customer_name = row[3]
                                if row[4]:
                                    order.customer_phone = row[4]
                                if row[5]:
                                    order.customer_whatsapp = row[5]
                                if row[6]:
                                    order.shop_name = row[6]
                                if row[7]:
                                    order.status = row[7]
                                if row[8] is not None:
                                    order.total_amount = row[8]
                                if row[9] is not None:
                                    order.final_amount = row[9]
                                if row[10]:
                                    order.payment_status = row[10]
                                if row[11]:
                                    order.delivery_type = row[11]
                                if row[12]:
                                    order.delivery_address = row[12]
                                if row[13] is not None:
                                    try:
                                        order.delivery_latitude = row[13]
                                    except AttributeError:
                                        pass
                                if row[14] is not None:
                                    try:
                                        order.delivery_longitude = row[14]
                                    except AttributeError:
                                        pass
                                if row[15]:
                                    try:
                                        order.delivery_address_details = row[15]
                                    except AttributeError:
                                        pass
                                if row[16]:
                                    order.notes = row[16]
                                if row[17]:
                                    try:
                                        order.staff_notes = row[17]
                                    except AttributeError:
                                        pass
                                if row[18] is not None:
                                    try:
                                        order.paid_amount = row[18]
                                    except AttributeError:
                                        pass
                                if row[19] is not None:
                                    try:
                                        order.remaining_amount = row[19]
                                    except AttributeError:
                                        pass
                                if row[20] is not None:
                                    try:
                                        order.rating = row[20]
                                    except AttributeError:
                                        pass
                                if row[21]:
                                    try:
                                        order.rating_comment = row[21]
                                    except AttributeError:
                                        pass
                                if row[22]:
                                    order.created_at = row[22]
                                if len(row) > 23 and row[23]:
                                    try:
                                        order.updated_at = row[23]
                                    except AttributeError:
                                        pass
                                orders.append(order)
                            except Exception:
                                continue
                        
                        if orders:
                            print(f"✅ Orders API - Unknown role customer orders query: {time.time() - orders_query_start:.2f}s (found {len(orders)} orders for customer_id: {current_user.id})")
                        else:
                            print(f"⚠️ Orders API - No orders found for unknown role customer_id: {current_user.id}")
                    except Exception as filter_error:
                        print(f"❌ Orders API - Error filtering unknown role orders: {filter_error}")
                        import traceback
                        traceback.print_exc()
                        orders = []
        except Exception as orders_query_error:
            print(f"❌ Orders API - Unexpected error in orders query: {orders_query_error}")
            import traceback
            traceback.print_exc()
            orders = []
        
        order_ids = [order.id for order in orders]

        items_map: Dict[int, List[OrderItem]] = defaultdict(list)
        if order_ids:
            items_query_start = time.time()
            items = db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).all()
            print(f"⏱️ Orders API - Items query: {time.time() - items_query_start:.2f}s (found {len(items)} items)")
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
            for idx, item in enumerate(items_map.get(order.id, [])):
                specs = item.specifications
                if isinstance(specs, str):
                    try:
                        specs = json.loads(specs)
                    except Exception:
                        specs = {"raw": specs}

                # تحسين الأداء: استخدام design_files كما هي بدون حفظها مرة أخرى
                # هذا يسرع عملية جلب الطلبات بشكل كبير
                design_files_raw = item.design_files
                if design_files_raw is None:
                    design_files = []
                elif isinstance(design_files_raw, str):
                    try:
                        design_files = json.loads(design_files_raw)
                        if not isinstance(design_files, list):
                            design_files = [design_files] if design_files else []
                    except Exception:
                        design_files = []
                elif isinstance(design_files_raw, list):
                    design_files = design_files_raw
                else:
                    design_files = []

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

        total_time = time.time() - start_time
        print(f"⏱️ Orders API - Total time: {total_time:.2f}s (returning {len(orders_payload)} orders)")

        return {
            "success": True,
            "orders": orders_payload
        }
    except Exception as e:
        import traceback
        print(f"❌ Error fetching orders: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الطلبات: {str(e)}")

@router.get("/{order_id}/attachments")
async def get_order_attachments(order_id: int, db: Session = Depends(get_db), request: Request = None):
    """Get all attachments for an order, verifying file existence"""
    try:
        ensure_order_columns(db)
        ensure_order_items_columns(db)

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")

        items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        attachments: List[Dict[str, Any]] = []
        attachments_by_key: Dict[str, Dict[str, Any]] = {}

        for item in items:
            try:
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
                    try:
                        normalized = normalize_attachment_entry(design_entry, order.id, item.id, idx, request)
                        if normalized:
                            # Include attachments that have valid URLs (file URL, download URL, or data URL)
                            if normalized.get("url") or normalized.get("download_url") or normalized.get("data_url"):
                                if normalized.get("file_key"):
                                    attachments_by_key[str(normalized["file_key"])] = normalized
                                normalized["order_item_service_name"] = getattr(item, "product_name", None)
                                attachments.append(normalized)
                            else:
                                print(f"⚠️ Skipping attachment {idx} for item {item.id}: no valid URL found")
                    except Exception as e:
                        print(f"⚠️ Error normalizing attachment entry {idx} for item {item.id}: {e}")
                        import traceback
                        traceback.print_exc()
                        # Continue processing other attachments
                        continue
            except Exception as e:
                print(f"⚠️ Error processing design_files for item {item.id}: {e}")
                import traceback
                traceback.print_exc()
                # Continue processing other items
                continue

        return {
            "success": True,
            "attachments": attachments,
            "count": len(attachments),
            "attachments_map": attachments_by_key,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_order_attachments for order {order_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب المرفقات: {str(e)}")


@router.get("/{order_id}/attachments/{file_key}")
async def download_order_attachment(order_id: int, file_key: str, db: Session = Depends(get_db), request: Request = None):
    """Download an attachment file, serving it directly if it exists locally"""
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
            normalized = normalize_attachment_entry(design_entry, order.id, item.id, idx, request)
            if normalized and str(normalized.get("file_key")) == file_key:
                normalized_entry = normalized
                break
        if normalized_entry:
            break

    if not normalized_entry:
        raise HTTPException(status_code=404, detail="الملف غير موجود لهذا الطلب")

    file_url = normalized_entry.get("url") or normalized_entry.get("download_url")
    raw_path = normalized_entry.get("raw_path")
    filename = normalized_entry.get("filename", "attachment")
    data_url = normalized_entry.get("data_url")  # Get data_url from normalized entry
    
    if not file_url and not data_url:
        raise HTTPException(status_code=400, detail="لا يوجد رابط صالح للملف")

    # Handle data URLs (either from file_url or data_url field)
    data_url_to_use = None
    if file_url and file_url.startswith("data:"):
        data_url_to_use = file_url
    elif raw_path and raw_path.startswith("data:"):
        data_url_to_use = raw_path
    elif data_url and data_url.startswith("data:"):
        data_url_to_use = data_url
    
    if data_url_to_use:
        try:
            header, encoded = data_url_to_use.split(",", 1)
            mime_type = "application/octet-stream"
            if ";" in header:
                mime_type = header.split(";")[0].replace("data:", "") or mime_type
            file_bytes = base64.b64decode(encoded)
            response = StreamingResponse(BytesIO(file_bytes), media_type=mime_type)
            response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            print(f"❌ Error decoding data URL: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="تعذر تحويل الملف من base64")

    # Handle local files - serve them directly if they exist
    if raw_path and raw_path.startswith("/uploads/"):
        local_path = raw_path.lstrip("/")
        local_path = local_path.replace("/", os.sep)
        if os.path.exists(local_path) and os.path.isfile(local_path):
            # File exists locally, serve it directly
            mime_type = normalized_entry.get("mime_type")
            if not mime_type:
                mime_type, _ = mimetypes.guess_type(local_path)
            if not mime_type:
                mime_type = "application/octet-stream"
            
            return FileResponse(
                local_path,
                media_type=mime_type,
                filename=filename,
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        else:
            # File doesn't exist locally - try to use data_url as fallback
            if data_url and data_url.startswith("data:"):
                print(f"⚠️ File {local_path} not found, using data URL fallback")
                try:
                    header, encoded = data_url.split(",", 1)
                    mime_type = "application/octet-stream"
                    if ";" in header:
                        mime_type = header.split(";")[0].replace("data:", "") or mime_type
                    file_bytes = base64.b64decode(encoded)
                    response = StreamingResponse(BytesIO(file_bytes), media_type=mime_type)
                    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
                    return response
                except Exception as e:
                    print(f"❌ Error decoding data URL fallback: {e}")
                    import traceback
                    traceback.print_exc()
                    # Continue to try redirect

    # For external URLs or files that don't exist locally, redirect
    if file_url and (file_url.startswith("http://") or file_url.startswith("https://")):
        return RedirectResponse(file_url, status_code=302)
    
    # For relative paths, try to serve them if they exist
    if raw_path and raw_path.startswith("/uploads/"):
        # File doesn't exist, but we have a path - redirect to the URL
        # This will work if StaticFiles is serving the directory
        if file_url:
            return RedirectResponse(file_url, status_code=302)
    
    # Last resort: if we have data_url, use it
    if data_url and data_url.startswith("data:"):
        print(f"⚠️ Using data URL as last resort")
        try:
            header, encoded = data_url.split(",", 1)
            mime_type = "application/octet-stream"
            if ";" in header:
                mime_type = header.split(";")[0].replace("data:", "") or mime_type
            file_bytes = base64.b64decode(encoded)
            response = StreamingResponse(BytesIO(file_bytes), media_type=mime_type)
            response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            print(f"❌ Error decoding data URL as last resort: {e}")
            import traceback
            traceback.print_exc()
    
    raise HTTPException(status_code=404, detail="الملف غير موجود")

@router.get("/{order_id}/files/{file_path:path}")
async def serve_order_file(order_id: int, file_path: str, db: Session = Depends(get_db)):
    """Serve order files directly from the uploads directory"""
    # Security: Ensure the file path is within uploads/orders directory
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="مسار غير صالح")
    
    # Verify order exists
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # Construct the full file path
    full_path = os.path.join("uploads", "orders", file_path)
    # Normalize path separators
    full_path = os.path.normpath(full_path)
    
    # Security check: ensure path is still within uploads/orders
    if not full_path.startswith(os.path.normpath("uploads/orders")):
        raise HTTPException(status_code=400, detail="مسار غير صالح")
    
    # Check if file exists
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    
    # Get MIME type
    mime_type, _ = mimetypes.guess_type(full_path)
    if not mime_type:
        mime_type = "application/octet-stream"
    
    # Serve the file
    return FileResponse(
        full_path,
        media_type=mime_type,
        filename=os.path.basename(full_path)
    )

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