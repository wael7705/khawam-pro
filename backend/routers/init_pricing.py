"""
Router لتهيئة جدول pricing_rules في قاعدة البيانات
"""
from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter()

@router.get("/init-pricing-table")
@router.post("/init-pricing-table")
async def init_pricing_table():
    """إنشاء جدول pricing_rules إذا لم يكن موجوداً"""
    conn = None
    try:
        conn = engine.connect()
        
        # التحقق من وجود الجدول
        check_table = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'pricing_rules'
            )
        """)).fetchone()
        
        if check_table and check_table[0]:
            # الجدول موجود - التحقق من الأعمدة
            check_columns = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'pricing_rules'
            """)).fetchall()
            
            existing_columns = [col[0] for col in check_columns]
            
            # إضافة الأعمدة المفقودة
            if 'name_ar' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN name_ar VARCHAR(200)"))
            
            if 'name_en' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN name_en VARCHAR(200)"))
            
            if 'description_ar' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN description_ar TEXT"))
            
            if 'description_en' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN description_en TEXT"))
            
            if 'calculation_type' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN calculation_type VARCHAR(20)"))
            
            if 'base_price' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN base_price DECIMAL(10, 4)"))
            
            if 'price_multipliers' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN price_multipliers JSONB"))
            
            if 'specifications' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN specifications JSONB"))
            
            if 'unit' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN unit VARCHAR(50)"))
            
            if 'is_active' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN is_active BOOLEAN DEFAULT true"))
            
            if 'display_order' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN display_order INTEGER DEFAULT 0"))
            
            if 'created_at' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
            
            if 'updated_at' not in existing_columns:
                conn.execute(text("ALTER TABLE pricing_rules ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()"))
            
            conn.commit()
            
            return {
                "success": True,
                "message": "تم تحديث جدول pricing_rules بنجاح",
                "existing": True
            }
        else:
            # إنشاء الجدول
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pricing_rules (
                    id SERIAL PRIMARY KEY,
                    name_ar VARCHAR(200) NOT NULL,
                    name_en VARCHAR(200),
                    description_ar TEXT,
                    description_en TEXT,
                    calculation_type VARCHAR(20) NOT NULL,
                    base_price DECIMAL(10, 4) NOT NULL,
                    price_multipliers JSONB,
                    specifications JSONB,
                    unit VARCHAR(50),
                    is_active BOOLEAN DEFAULT true,
                    display_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            
            conn.commit()
            
            return {
                "success": True,
                "message": "تم إنشاء جدول pricing_rules بنجاح",
                "existing": False
            }
        
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except:
                pass
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

