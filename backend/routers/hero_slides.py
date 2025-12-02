from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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
    db: Session = Depends(get_db)
):
    """جلب جميع سلايدات Hero"""
    try:
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
            slides.append({
                "id": row[0],
                "image_url": row[1],
                "is_logo": row[2],
                "is_active": row[3],
                "display_order": row[4],
                "created_at": row[5].isoformat() if row[5] else None,
                "updated_at": row[6].isoformat() if row[6] else None,
            })
        
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
        result = db.execute(text("""
            INSERT INTO hero_slides (image_url, is_logo, is_active, display_order)
            VALUES (:image_url, :is_logo, :is_active, :display_order)
            RETURNING id
        """), {
            "image_url": slide_data.image_url,
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
        
        # بناء query التحديث
        update_fields = []
        params = {"id": slide_id}
        
        if slide_data.image_url is not None:
            update_fields.append("image_url = :image_url")
            params["image_url"] = slide_data.image_url
        
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
    """رفع صورة للسلايدة وحفظها في مجلد uploads/hero_slides"""
    try:
        # التحقق من نوع الملف
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
        
        # قراءة محتوى الملف
        content = await file.read()
        
        # التحقق من حجم الملف (حد أقصى 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="حجم الصورة كبير جداً (الحد الأقصى 10MB)")
        
        # تحديد امتداد الملف
        ext = os.path.splitext(file.filename or 'image.jpg')[1] or '.jpg'
        if ext.lower() not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
            ext = '.jpg'
        
        # إنشاء اسم ملف فريد
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # حفظ الملف
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # إرجاع المسار النسبي
        relative_url = f"/uploads/hero_slides/{filename}"
        
        # الحصول على URL المطلق
        base_url = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")
        if not base_url:
            domain = os.getenv("RAILWAY_PUBLIC_DOMAIN", "").strip()
            if domain:
                base_url = f"https://{domain}" if not domain.startswith("http") else domain
            else:
                base_url = "https://khawam-pro-production.up.railway.app"
        
        absolute_url = f"{base_url}{relative_url}"
        
        return {
            "success": True,
            "url": absolute_url,
            "image_url": absolute_url,
            "relative_url": relative_url,
            "filename": filename
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading hero slide image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في رفع الصورة: {str(e)}")

