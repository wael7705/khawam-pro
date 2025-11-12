from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
import requests
import os
import base64
import aiofiles
from PIL import Image, ImageDraw
import io
from typing import Optional

router = APIRouter()
REMOVE_BG_API_KEY = os.getenv("REMOVE_BG_API_KEY", "QP2YU5oSDaLwXpzDRKv4fjo9")

if not REMOVE_BG_API_KEY:
    print("⚠️ REMOVE_BG_API_KEY is not set. remove.bg integration will fail until provided.")

# وظيفة ضغط الصور
def compress_image(image: Image.Image, max_size_mb: float = 5.0, quality: int = 85) -> io.BytesIO:
    """
    ضغط الصورة لتقليل حجمها
    max_size_mb: الحد الأقصى للحجم بالميجابايت
    quality: جودة الضغط (0-100)
    """
    output = io.BytesIO()
    format = image.format or 'JPEG'
    
    # إذا كانت الصورة PNG، نحولها إلى JPEG للضغط الأفضل
    if format == 'PNG' and image.mode in ('RGBA', 'LA', 'P'):
        # إنشاء خلفية بيضاء للصور الشفافة
        background = Image.new('RGB', image.size, (255, 255, 255))
        if image.mode == 'P':
            image = image.convert('RGBA')
        background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
        image = background
        format = 'JPEG'
    
    # محاولة الضغط
    quality_level = quality
    while True:
        output.seek(0)
        output.truncate(0)
        
        if format == 'JPEG':
            image.save(output, format='JPEG', quality=quality_level, optimize=True)
        else:
            image.save(output, format=format, quality=quality_level, optimize=True)
        
        size_mb = output.tell() / (1024 * 1024)
        
        if size_mb <= max_size_mb or quality_level <= 20:
            break
        
        quality_level -= 10
    
    output.seek(0)
    return output

# وظيفة تحويل الصورة إلى base64
def image_to_base64(image: Image.Image, format: str = 'PNG') -> str:
    """تحويل الصورة إلى base64 string"""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    buffer.seek(0)
    img_data = base64.b64encode(buffer.read()).decode('utf-8')
    return f"data:image/{format.lower()};base64,{img_data}"

@router.post("/remove-background")
async def remove_background(file: UploadFile = File(...)):
    try:
        # قراءة الصورة
        file_content = await file.read()
        image = Image.open(io.BytesIO(file_content))
        
        # ضغط الصورة قبل الإرسال لـ remove.bg (حد أقصى 5MB)
        compressed_image = compress_image(image, max_size_mb=5.0, quality=85)
        compressed_image.seek(0)
        
        # Call remove.bg API مع الصورة المضغوطة
        response = requests.post(
            'https://api.remove.bg/v1.0/removebg',
            files={'image_file': compressed_image},
            data={'size': 'auto'},
            headers={'X-Api-Key': REMOVE_BG_API_KEY},
        )
        
        if response.status_code == 200:
            # قراءة الصورة الناتجة
            result_image = Image.open(io.BytesIO(response.content))
            
            # تحويل إلى base64
            img_data = image_to_base64(result_image, format='PNG')
            
            return {"success": True, "image": img_data}
        else:
            error_detail = response.text if hasattr(response, 'text') else "Unknown error"
            raise HTTPException(status_code=response.status_code, detail=f"Failed to remove background: {error_detail}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/passport-photos")
async def create_passport_photos(file: UploadFile = File(...)):
    """
    إنشاء صور شخصية: إزالة الخلفية + تحويل الحجم إلى 3.5*4.8 سم (4.8 هو الارتفاع)
    + إضافة stroke + قالب 8 صور (2 صفوف × 4 أعمدة)
    """
    try:
        # قراءة الصورة
        file_content = await file.read()
        original_image = Image.open(io.BytesIO(file_content))
        
        # ضغط الصورة قبل الإرسال لـ remove.bg
        compressed_image = compress_image(original_image, max_size_mb=5.0, quality=85)
        compressed_image.seek(0)
        
        # إزالة الخلفية باستخدام remove.bg
        response = requests.post(
            'https://api.remove.bg/v1.0/removebg',
            files={'image_file': compressed_image},
            data={'size': 'auto'},
            headers={'X-Api-Key': REMOVE_BG_API_KEY},
        )
        
        if response.status_code != 200:
            error_detail = response.text if hasattr(response, 'text') else "Unknown error"
            raise HTTPException(status_code=response.status_code, detail=f"Failed to remove background: {error_detail}")
        
        # قراءة الصورة بعد إزالة الخلفية
        no_bg_image = Image.open(io.BytesIO(response.content))
        
        # تحويل الحجم إلى 3.5*4.8 سم
        # 1 سم = 37.8 بكسل (300 DPI)
        # 3.5 سم = 132.3 بكسل
        # 4.8 سم = 181.44 بكسل
        target_width = int(3.5 * 37.8)  # 132 بكسل
        target_height = int(4.8 * 37.8)  # 181 بكسل
        
        # حساب النسبة للحفاظ على الأبعاد
        img_width, img_height = no_bg_image.size
        aspect_ratio = img_width / img_height
        target_aspect = target_width / target_height
        
        # إذا كانت الصورة أوسع من المطلوب، نضبط العرض
        if aspect_ratio > target_aspect:
            new_width = target_width
            new_height = int(target_width / aspect_ratio)
        else:
            new_height = target_height
            new_width = int(target_height * aspect_ratio)
        
        # تغيير الحجم مع الحفاظ على الجودة
        resized_image = no_bg_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # إنشاء صورة جديدة بالحجم المطلوب مع خلفية بيضاء
        single_photo = Image.new('RGB', (target_width, target_height), (255, 255, 255))
        
        # وضع الصورة في المنتصف
        x_offset = (target_width - new_width) // 2
        y_offset = (target_height - new_height) // 2
        
        # إذا كانت الصورة شفافة، نحتاج لدمجها بشكل صحيح
        if resized_image.mode == 'RGBA':
            single_photo.paste(resized_image, (x_offset, y_offset), resized_image)
        else:
            single_photo.paste(resized_image, (x_offset, y_offset))
        
        # إضافة stroke (حدود) حول الصورة
        stroke_width = 3  # عرض الحدود بالبكسل
        stroke_color = (0, 0, 0)  # لون أسود
        
        # إنشاء صورة أكبر لتضمين الحدود
        photo_with_stroke = Image.new('RGB', 
                                     (target_width + stroke_width * 2, 
                                      target_height + stroke_width * 2), 
                                     (255, 255, 255))
        
        # وضع الصورة الأصلية أولاً
        photo_with_stroke.paste(single_photo, (stroke_width, stroke_width))
        
        # رسم الحدود حول الصورة
        draw = ImageDraw.Draw(photo_with_stroke)
        # رسم مستطيل كحدود حول الصورة
        draw.rectangle(
            [(stroke_width, stroke_width), 
             (target_width + stroke_width - 1, target_height + stroke_width - 1)],
            outline=stroke_color,
            width=stroke_width
        )
        
        # إنشاء قالب 8 صور (2 صفوف × 4 أعمدة)
        rows = 2
        cols = 4
        spacing = 10  # المسافة بين الصور بالبكسل
        
        # حساب أبعاد القالب
        photo_width_with_stroke = target_width + stroke_width * 2
        photo_height_with_stroke = target_height + stroke_width * 2
        
        template_width = cols * photo_width_with_stroke + (cols - 1) * spacing
        template_height = rows * photo_height_with_stroke + (rows - 1) * spacing
        
        # إنشاء القالب بخلفية بيضاء
        template = Image.new('RGB', (template_width, template_height), (255, 255, 255))
        
        # وضع 8 نسخ من الصورة في القالب
        for row in range(rows):
            for col in range(cols):
                x_pos = col * (photo_width_with_stroke + spacing)
                y_pos = row * (photo_height_with_stroke + spacing)
                template.paste(photo_with_stroke, (x_pos, y_pos))
        
        # تحويل إلى base64
        img_data = image_to_base64(template, format='PNG')
        
        return {"success": True, "image": img_data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/crop-rotate")
async def crop_rotate(
    file: UploadFile = File(...),
    angle: int = Form(0),
    x: Optional[int] = Form(None),
    y: Optional[int] = Form(None),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None)
):
    """
    قص وتدوير الصورة
    angle: زاوية التدوير بالدرجات
    x, y, width, height: إحداثيات القص (اختياري)
    """
    try:
        # قراءة الصورة
        file_content = await file.read()
        image = Image.open(io.BytesIO(file_content))
        
        # تدوير الصورة
        if angle != 0:
            # تحويل إلى RGBA للدعم الكامل للشفافية
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            image = image.rotate(-angle, expand=True, fillcolor=(255, 255, 255, 0))
        
        # قص الصورة إذا تم تحديد الإحداثيات
        if x is not None and y is not None and width is not None and height is not None:
            image = image.crop((x, y, x + width, y + height))
        
        # تحويل إلى base64
        img_data = image_to_base64(image, format='PNG')
        
        return {"success": True, "image": img_data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/apply-filter")
async def apply_filter(
    file: UploadFile = File(...),
    brightness: int = Form(100),
    contrast: int = Form(100),
    saturation: int = Form(100)
):
    """
    تطبيق الفلاتر على الصورة
    brightness: السطوع (0-200)
    contrast: التباين (0-200)
    saturation: التشبع (0-200)
    """
    try:
        # قراءة الصورة
        file_content = await file.read()
        image = Image.open(io.BytesIO(file_content))
        
        # تحويل إلى RGB إذا كانت الصورة في وضع آخر
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        from PIL import ImageEnhance
        
        # تطبيق السطوع
        if brightness != 100:
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(brightness / 100.0)
        
        # تطبيق التباين
        if contrast != 100:
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(contrast / 100.0)
        
        # تطبيق التشبع
        if saturation != 100:
            enhancer = ImageEnhance.Color(image)
            image = enhancer.enhance(saturation / 100.0)
        
        # تحويل إلى base64
        img_data = image_to_base64(image, format='PNG')
        
        return {"success": True, "image": img_data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))