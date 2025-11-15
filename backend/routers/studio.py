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

# ثابت DPI للطباعة
PRINT_DPI = 300

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
            image.save(output, format='JPEG', quality=quality_level, optimize=True, dpi=(PRINT_DPI, PRINT_DPI))
        else:
            image.save(output, format=format, quality=quality_level, optimize=True, dpi=(PRINT_DPI, PRINT_DPI))
        
        size_mb = output.tell() / (1024 * 1024)
        
        if size_mb <= max_size_mb or quality_level <= 20:
            break
        
        quality_level -= 10
    
    output.seek(0)
    return output

# وظيفة تحويل الصورة إلى base64
def image_to_base64(image: Image.Image, format: str = 'PNG', dpi: int = PRINT_DPI) -> str:
    """
    تحويل الصورة إلى base64 string مع الحفاظ على DPI للطباعة
    format: صيغة الصورة (PNG, JPEG)
    dpi: دقة الصورة (افتراضي 300 DPI للطباعة)
    """
    buffer = io.BytesIO()
    
    # حفظ الصورة مع DPI = 300 للطباعة
    # PIL يحفظ DPI في metadata تلقائياً
    save_kwargs = {
        'dpi': (dpi, dpi),
        'optimize': True
    }
    
    if format.upper() == 'PNG':
        # PNG يدعم DPI في metadata
        image.save(buffer, format='PNG', **save_kwargs)
    elif format.upper() == 'JPEG' or format.upper() == 'JPG':
        # JPEG يدعم DPI في EXIF
        save_kwargs['quality'] = 95
        image.save(buffer, format='JPEG', **save_kwargs)
    else:
        # للصيغ الأخرى
        save_kwargs['quality'] = 95
        image.save(buffer, format=format, **save_kwargs)
    
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
            
            # تحويل إلى base64 مع DPI = 300 للطباعة
            img_data = image_to_base64(result_image, format='PNG', dpi=PRINT_DPI)
            
            return {"success": True, "image": img_data}
        else:
            error_detail = response.text if hasattr(response, 'text') else "Unknown error"
            raise HTTPException(status_code=response.status_code, detail=f"Failed to remove background: {error_detail}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/passport-photos")
async def create_passport_photos(file: UploadFile = File(...)):
    """
    إنشاء صور شخصية: إزالة الخلفية + تحويل الحجم إلى 3.5 سم (عرض) × 4.8 سم (ارتفاع) بالضبط
    + قالب 8 صور (2 صفوف × 4 أعمدة) مع خطوط قص 1px بين الصور
    الأبعاد الدقيقة: 3.5 سم = 413 بكسل، 4.8 سم = 567 بكسل عند 300 DPI
    """
    try:
        # قراءة الصورة
        file_content = await file.read()
        original_image = Image.open(io.BytesIO(file_content))
        
        # التحقق من أن الصورة بالضبط 3.5 × 4.8 سم (413 × 567 بكسل عند 300 DPI)
        pixels_per_cm = PRINT_DPI / 2.54
        expected_width = int(3.5 * pixels_per_cm + 0.5)  # 413 بكسل
        expected_height = int(4.8 * pixels_per_cm + 0.5)  # 567 بكسل
        
        img_width, img_height = original_image.size
        
        # إذا كانت الصورة بالضبط 3.5 × 4.8 سم، نستخدمها مباشرة (تم قصها مسبقاً)
        if abs(img_width - expected_width) <= 2 and abs(img_height - expected_height) <= 2:
            # الصورة مقطوعة بالفعل بالضبط 3.5 × 4.8 سم - نستخدمها مباشرة
            target_width = expected_width
            target_height = expected_height
            single_photo = Image.new('RGB', (target_width, target_height), (255, 255, 255))
            if original_image.mode == 'RGBA':
                single_photo.paste(original_image, (0, 0), original_image)
            else:
                single_photo.paste(original_image, (0, 0))
        else:
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
            
            # تحويل الحجم إلى 3.5 سم (عرض) × 4.8 سم (ارتفاع) بجودة 300 DPI
            target_width = int(3.5 * pixels_per_cm + 0.5)  # 413 بكسل بالضبط عند 300 DPI
            target_height = int(4.8 * pixels_per_cm + 0.5)  # 567 بكسل بالضبط عند 300 DPI
            
            # حساب النسبة للحفاظ على الأبعاد الأصلية للصورة
            # الهدف: ملء الصورة في إطار 3.5 سم × 4.8 سم بالضبط مع الحفاظ على النسبة
            # نستخدم "cover" strategy: نكبر الصورة لتملأ الإطار بالكامل ثم نستخدم crop
            img_width, img_height = no_bg_image.size
            aspect_ratio = img_width / img_height
            target_aspect = target_width / target_height  # 3.5 / 4.8 = 0.729
            
            # حساب الحجم المطلوب لملء الإطار بالكامل
            # نكبر الصورة بحيث تغطي الإطار بالكامل (أكبر من الإطار)
            if aspect_ratio > target_aspect:
                # الصورة أوسع من المطلوب - نكبرها بناءً على الارتفاع
                # نريد أن يكون الارتفاع = target_height بالضبط
                scale = target_height / img_height
                new_width = int(img_width * scale + 0.5)
                new_height = target_height
            else:
                # الصورة أطول من المطلوب - نكبرها بناءً على العرض
                # نريد أن يكون العرض = target_width بالضبط
                scale = target_width / img_width
                new_width = target_width
                new_height = int(img_height * scale + 0.5)
            
            # التأكد من أن الحجم الجديد أكبر من أو يساوي الحجم المطلوب
            if new_width < target_width:
                new_width = target_width
                scale = new_width / img_width
                new_height = int(img_height * scale + 0.5)
            if new_height < target_height:
                new_height = target_height
                scale = new_height / img_height
                new_width = int(img_width * scale + 0.5)
            
            # تغيير الحجم مع الحفاظ على الجودة (LANCZOS للجودة العالية)
            resized_image = no_bg_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # قص الصورة من المنتصف للحصول على الأبعاد الدقيقة 3.5 × 4.8 سم
            left = (new_width - target_width) // 2
            top = (new_height - target_height) // 2
            right = left + target_width
            bottom = top + target_height
            
            # التأكد من أن الإحداثيات صحيحة
            left = max(0, min(left, new_width - target_width))
            top = max(0, min(top, new_height - target_height))
            right = left + target_width
            bottom = top + target_height
            
            cropped_image = resized_image.crop((left, top, right, bottom))
            
            # التأكد من أن الصورة المقطوعة بالضبط target_width × target_height
            if cropped_image.size[0] != target_width or cropped_image.size[1] != target_height:
                # إعادة ضبط الحجم إذا لزم الأمر
                cropped_image = cropped_image.resize((target_width, target_height), Image.Resampling.LANCZOS)
            
            # إنشاء صورة جديدة بالحجم المطلوب بالضبط: 3.5 سم × 4.8 سم
            single_photo = Image.new('RGB', (target_width, target_height), (255, 255, 255))
            
            # وضع الصورة المقطوعة (التي هي بالضبط target_width × target_height)
            if cropped_image.mode == 'RGBA':
                single_photo.paste(cropped_image, (0, 0), cropped_image)
            else:
                single_photo.paste(cropped_image, (0, 0))
        
        # إنشاء قالب 8 صور (2 صفوف × 4 أعمدة)
        # القالب يجب أن يكون بالضبط: 14 سم عرض × 9.6 سم ارتفاع
        rows = 2
        cols = 4
        
        # حساب أبعاد القالب بالضبط: 14 سم × 9.6 سم
        template_width_cm = 14.0
        template_height_cm = 9.6
        template_width = int(template_width_cm * pixels_per_cm + 0.5)  # 1654 بكسل عند 300 DPI
        template_height = int(template_height_cm * pixels_per_cm + 0.5)  # 1134 بكسل عند 300 DPI
        
        # حساب خطوط القص بين الصور
        # 3 خطوط عمودية بين 4 أعمدة، 1 خط أفقي بين صفين
        cut_line_width = 1  # خط القص بسماكة 1px
        
        # حساب المساحة المتاحة للصور (بعد خصم خطوط القص)
        # القالب = 14 سم × 9.6 سم بالضبط
        # كل صورة = 3.5 سم × 4.8 سم بالضبط
        # 4 صور × 3.5 سم = 14 سم (مع 3 خطوط قص بينها)
        # 2 صفوف × 4.8 سم = 9.6 سم (مع 1 خط قص بينهما)
        total_cut_lines_width = (cols - 1) * cut_line_width  # 3px
        total_cut_lines_height = (rows - 1) * cut_line_width  # 1px
        
        # حساب حجم كل صورة في القالب
        # يجب أن تكون الصور بالضبط target_width × target_height
        # لكن مع خطوط القص، يجب أن نتحقق من أن القالب = 14 × 9.6 سم
        # 4 × 3.5 سم = 14 سم، 2 × 4.8 سم = 9.6 سم
        # مع خطوط القص: (4 × 3.5) + (3 × 1px) = 14 سم + 3px
        # لكن 1px عند 300 DPI = 0.00847 سم (صغير جداً)
        # لذلك يمكننا تجاهل خطوط القص في الحساب أو تضمينها
        
        # استخدام target_width و target_height للصور (3.5 × 4.8 سم)
        photo_width_in_template = target_width
        photo_height_in_template = target_height
        
        # التحقق من أن القالب بالضبط 14 × 9.6 سم
        # حساب القالب الفعلي مع خطوط القص
        calculated_template_width = cols * photo_width_in_template + (cols - 1) * cut_line_width
        calculated_template_height = rows * photo_height_in_template + (rows - 1) * cut_line_width
        
        # إذا كان هناك فرق بسيط، نضبط القالب ليكون بالضبط 14 × 9.6 سم
        if abs(calculated_template_width - template_width) > 1 or abs(calculated_template_height - template_height) > 1:
            # ضبط حجم الصور قليلاً لتناسب القالب بالضبط
            available_width = template_width - total_cut_lines_width
            available_height = template_height - total_cut_lines_height
            photo_width_in_template = available_width // cols
            photo_height_in_template = available_height // rows
            
            # إعادة ضبط حجم الصورة لتناسب القالب
            single_photo = single_photo.resize((photo_width_in_template, photo_height_in_template), Image.Resampling.LANCZOS)
        
        # إنشاء القالب بخلفية بيضاء بالضبط 14 سم × 9.6 سم
        template = Image.new('RGB', (template_width, template_height), (255, 255, 255))
        draw = ImageDraw.Draw(template)
        
        # وضع 8 نسخ من الصورة في القالب
        for row in range(rows):
            for col in range(cols):
                # حساب موضع الصورة
                x_pos = col * (photo_width_in_template + cut_line_width)
                y_pos = row * (photo_height_in_template + cut_line_width)
                
                # وضع الصورة
                template.paste(single_photo, (x_pos, y_pos))
        
        # رسم خطوط القص السوداء بين الصور (1px)
        cut_line_color = (0, 0, 0)  # أسود
        
        # رسم الخطوط العمودية بين الأعمدة
        for col in range(1, cols):
            x_line = col * photo_width_in_template + (col - 1) * cut_line_width
            draw.rectangle(
                [x_line, 0, x_line + cut_line_width - 1, template_height - 1],
                fill=cut_line_color
            )
        
        # رسم الخطوط الأفقية بين الصفوف
        for row in range(1, rows):
            y_line = row * photo_height_in_template + (row - 1) * cut_line_width
            draw.rectangle(
                [0, y_line, template_width - 1, y_line + cut_line_width - 1],
                fill=cut_line_color
            )
        
        # تحويل إلى base64 مع DPI = 300 للطباعة
        img_data = image_to_base64(template, format='PNG', dpi=PRINT_DPI)
        
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
        
        # تحويل إلى base64 مع DPI = 300 للطباعة
        img_data = image_to_base64(image, format='PNG', dpi=PRINT_DPI)
        
        return {"success": True, "image": img_data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-dpi")
async def add_dpi(file: UploadFile = File(...)):
    """
    إضافة DPI = 300 للصورة (للاستخدام عند التحميل من frontend)
    """
    try:
        # قراءة الصورة
        file_content = await file.read()
        image = Image.open(io.BytesIO(file_content))
        
        # تحويل إلى base64 مع DPI = 300 للطباعة
        img_data = image_to_base64(image, format='PNG', dpi=PRINT_DPI)
        
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
        
        # تحويل إلى base64 مع DPI = 300 للطباعة
        img_data = image_to_base64(image, format='PNG', dpi=PRINT_DPI)
        
        return {"success": True, "image": img_data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))