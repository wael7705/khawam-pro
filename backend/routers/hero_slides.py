from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models import HeroSlide
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import aiofiles
from datetime import datetime
from PIL import Image
import io
import base64

router = APIRouter()

# مجلد رفع الصور
UPLOAD_DIR = "uploads/hero_slides"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class HeroSlideCreate(BaseModel):
    image_url: str
    is_logo: bool = False
    is_active: bool = True
    display_order: int = 0

class HeroSlideUpdate(BaseModel):
    image_url: Optional[str] = None
    is_logo: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

@router.get("/hero-slides")
async def get_hero_slides(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    response: Response = None
):
    """جلب جميع سلايدات Hero - بدون cache"""
    try:
        # منع cache من المتصفح
        if response:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        query = """
            SELECT id, image_url, is_logo, is_active, display_order, created_at, updated_at
            FROM hero_slides
            WHERE 1=1
        """
        params = {}
        
        if is_active is not None:
            query += " AND is_active = :is_active"
            params["is_active"] = is_active
        
        query += " ORDER BY is_logo DESC, display_order ASC, id ASC"
        
        result = db.execute(text(query), params).fetchall()
        
        slides = []
        for row in result:
            image_url = row[1] if row[1] else None
            # التأكد من أن image_url موجود ومحفوظ في قاعدة البيانات
            if image_url:
                slides.append({
                    "id": row[0],
                    "image_url": image_url,  # من قاعدة البيانات - يمكن أن يكون base64 data URL أو رابط
                    "is_logo": row[2],
                    "is_active": row[3],
                    "display_order": row[4],
                    "created_at": row[5].isoformat() if row[5] else None,
                    "updated_at": row[6].isoformat() if row[6] else None,
                })
            else:
                # إذا لم يكن هناك image_url، نتجاهل السلايدة
                print(f"⚠️ Warning: Hero slide {row[0]} has no image_url, skipping")
        
        print(f"✅ Retrieved {len(slides)} hero slides from database")
        return {
            "success": True,
            "slides": slides,
            "count": len(slides)
        }
    except Exception as e:
        print(f"Error getting hero slides: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب السلايدات: {str(e)}")

@router.post("/hero-slides")
async def create_hero_slide(
    slide_data: HeroSlideCreate,
    db: Session = Depends(get_db)
):
    """إنشاء سلايدة جديدة"""
    try:
        # التحقق من أن image_url غير فارغ
        if not slide_data.image_url or not slide_data.image_url.strip():
            raise HTTPException(status_code=400, detail="يجب إدخال رابط الصورة")
        
        image_url = slide_data.image_url.strip()
        
        result = db.execute(text("""
            INSERT INTO hero_slides (image_url, is_logo, is_active, display_order)
            VALUES (:image_url, :is_logo, :is_active, :display_order)
            RETURNING id
        """), {
            "image_url": image_url,
            "is_logo": slide_data.is_logo,
            "is_active": slide_data.is_active,
            "display_order": slide_data.display_order
        })
        
        slide_id = result.fetchone()[0]
        db.commit()
        
        return {
            "success": True,
            "message": "تم إنشاء السلايدة بنجاح",
            "slide_id": slide_id
        }
    except Exception as e:
        db.rollback()
        print(f"Error creating hero slide: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في إنشاء السلايدة: {str(e)}")

@router.put("/hero-slides/{slide_id}")
async def update_hero_slide(
    slide_id: int,
    slide_data: HeroSlideUpdate,
    db: Session = Depends(get_db)
):
    """تحديث سلايدة"""
    try:
        # التحقق من وجود السلايدة
        existing = db.execute(text("SELECT id FROM hero_slides WHERE id = :id"), {"id": slide_id}).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="السلايدة غير موجودة")
        
        # جلب الصورة الحالية من قاعدة البيانات لحمايتها
        current_slide = db.execute(text("""
            SELECT image_url FROM hero_slides WHERE id = :id
        """), {"id": slide_id}).fetchone()
        
        current_image_url = current_slide[0] if current_slide else None
        
        # بناء query التحديث
        update_fields = []
        params = {"id": slide_id}
        
        # تحديث image_url فقط إذا كانت قيمة جديدة وغير فارغة
        # إذا لم تُرسل image_url أو كانت فارغة، نحتفظ بالصورة القديمة
        if slide_data.image_url is not None and slide_data.image_url.strip():
            # تحديث الصورة فقط إذا كانت مختلفة
            new_image_url = slide_data.image_url.strip()
            if new_image_url != current_image_url:
                update_fields.append("image_url = :image_url")
                params["image_url"] = new_image_url
        # إذا لم تُرسل image_url أو كانت فارغة، نحتفظ بالصورة القديمة (لا نحدثها)
        
        if slide_data.is_logo is not None:
            update_fields.append("is_logo = :is_logo")
            params["is_logo"] = slide_data.is_logo
        
        if slide_data.is_active is not None:
            update_fields.append("is_active = :is_active")
            params["is_active"] = slide_data.is_active
        
        if slide_data.display_order is not None:
            update_fields.append("display_order = :display_order")
            params["display_order"] = slide_data.display_order
        
        if update_fields:
            update_fields.append("updated_at = NOW()")
            query = f"UPDATE hero_slides SET {', '.join(update_fields)} WHERE id = :id"
            db.execute(text(query), params)
            db.commit()
        
        return {
            "success": True,
            "message": "تم تحديث السلايدة بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating hero slide: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في تحديث السلايدة: {str(e)}")

@router.delete("/hero-slides/{slide_id}")
async def delete_hero_slide(
    slide_id: int,
    db: Session = Depends(get_db)
):
    """حذف سلايدة"""
    try:
        result = db.execute(text("DELETE FROM hero_slides WHERE id = :id"), {"id": slide_id})
        db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="السلايدة غير موجودة")
        
        return {
            "success": True,
            "message": "تم حذف السلايدة بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting hero slide: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في حذف السلايدة: {str(e)}")

@router.post("/hero-slides/reorder")
async def reorder_hero_slides(
    slide_orders: List[dict],  # [{"id": 1, "display_order": 0}, ...]
    db: Session = Depends(get_db)
):
    """إعادة ترتيب السلايدات"""
    try:
        for item in slide_orders:
            db.execute(text("""
                UPDATE hero_slides 
                SET display_order = :display_order, updated_at = NOW()
                WHERE id = :id
            """), {
                "id": item["id"],
                "display_order": item["display_order"]
            })
        
        db.commit()
        
        return {
            "success": True,
            "message": "تم إعادة ترتيب السلايدات بنجاح"
        }
    except Exception as e:
        db.rollback()
        print(f"Error reordering hero slides: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في إعادة ترتيب السلايدات: {str(e)}")

@router.post("/hero-slides/upload")
async def upload_hero_slide_image(file: UploadFile = File(...)):
    """رفع صورة للسلايدة وحفظها كـ base64 في قاعدة البيانات (بدلاً من نظام الملفات)"""
    try:
        import base64
        
        # التحقق من نوع الملف
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
        
        # قراءة محتوى الملف
        content = await file.read()
        
        # التحقق من حجم الملف (حد أقصى 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="حجم الصورة كبير جداً (الحد الأقصى 10MB)")
        
        # ضغط الصورة إذا كانت كبيرة (أكبر من 2MB)
        if len(content) > 2 * 1024 * 1024:
            try:
                # فتح الصورة باستخدام PIL
                img = Image.open(io.BytesIO(content))
                
                # تحويل إلى RGB إذا كانت PNG شفافة
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                # ضغط الصورة
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=85, optimize=True)
                content = output.getvalue()
                file.content_type = 'image/jpeg'
                print(f"✅ Compressed image from {len(content) / 1024 / 1024:.2f}MB to {len(output.getvalue()) / 1024 / 1024:.2f}MB")
            except Exception as compress_error:
                print(f"⚠️ Failed to compress image, using original: {compress_error}")
                # استخدم الملف الأصلي إذا فشل الضغط
        
        # تحويل الصورة إلى base64 data URL
        base64_content = base64.b64encode(content).decode('utf-8')
        mime_type = file.content_type or 'image/jpeg'
        data_url = f"data:{mime_type};base64,{base64_content}"
        
        # إرجاع data URL مباشرة (سيتم حفظه في قاعدة البيانات)
        return {
            "success": True,
            "url": data_url,
            "image_url": data_url,
            "data_url": data_url,
            "mime_type": mime_type,
            "size_bytes": len(content)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading hero slide image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في رفع الصورة: {str(e)}")

