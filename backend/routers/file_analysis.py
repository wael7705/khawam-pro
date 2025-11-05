"""
Router لتحليل الملفات (PDF, Word) لعد الصفحات
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import os
import tempfile

router = APIRouter()

async def count_pdf_pages(file_path: str) -> int:
    """عد صفحات ملف PDF"""
    try:
        import PyPDF2
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            return len(pdf_reader.pages)
    except Exception as e:
        print(f"Error counting PDF pages: {e}")
        raise HTTPException(status_code=400, detail=f"خطأ في قراءة ملف PDF: {str(e)}")

async def count_word_pages(file_path: str) -> int:
    """عد صفحات ملف Word"""
    try:
        from docx import Document
        doc = Document(file_path)
        # تقدير عدد الصفحات بناءً على عدد الفقرات والأسطر
        # كل ~50 سطر = صفحة واحدة تقريباً
        total_lines = sum(len(para.text.split('\n')) for para in doc.paragraphs)
        pages = max(1, int(total_lines / 50))
        return pages
    except Exception as e:
        print(f"Error counting Word pages: {e}")
        raise HTTPException(status_code=400, detail=f"خطأ في قراءة ملف Word: {str(e)}")

@router.post("/analyze-files")
async def analyze_files(files: List[UploadFile] = File(...)):
    """
    تحليل الملفات (PDF/Word) لعد الصفحات
    """
    try:
        total_pages = 0
        file_analysis = []
        
        for file in files:
            # حفظ الملف مؤقتاً
            suffix = os.path.splitext(file.filename)[1].lower()
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_path = tmp_file.name
            
            try:
                pages = 0
                if suffix == '.pdf':
                    pages = await count_pdf_pages(tmp_path)
                elif suffix in ['.doc', '.docx']:
                    pages = await count_word_pages(tmp_path)
                else:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"نوع الملف غير مدعوم: {suffix}. الملفات المدعومة: PDF, DOC, DOCX"
                    )
                
                total_pages += pages
                file_analysis.append({
                    "filename": file.filename,
                    "pages": pages,
                    "file_type": suffix
                })
            finally:
                # حذف الملف المؤقت
                try:
                    os.unlink(tmp_path)
                except:
                    pass
        
        return {
            "success": True,
            "total_pages": total_pages,
            "files": file_analysis
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error analyzing files: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في تحليل الملفات: {str(e)}")

