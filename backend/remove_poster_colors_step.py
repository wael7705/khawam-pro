"""
سكريبت لحذف مرحلة اختيار الألوان من خدمة طباعة البوسترات
"""
import asyncio
from sqlalchemy import text
from database import engine

async def remove_poster_colors_step():
    """حذف مرحلة اختيار الألوان من خدمة طباعة البوسترات وإعادة ترقيم الخطوات"""
    conn = None
    try:
        print("=" * 80)
        print("🔧 [REMOVE_COLORS] Starting removal of colors step from poster printing service...")
        print("=" * 80)
        
        conn = engine.connect()
        
        # 1. البحث عن خدمة طباعة البوسترات
        print("🔍 [REMOVE_COLORS] Searching for poster printing service...")
        service_result = conn.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%طباعة البوسترات%' OR name_ar LIKE '%بوستر%'
            LIMIT 1
        """)).fetchone()
        
        if not service_result:
            print("❌ [REMOVE_COLORS] Poster printing service not found!")
            return False
        
        service_id = service_result[0]
        service_name = service_result[1]
        print(f"✅ [REMOVE_COLORS] Found service: ID={service_id}, Name={service_name}")
        
        # 2. البحث عن مرحلة اختيار الألوان
        print("🔍 [REMOVE_COLORS] Searching for colors step...")
        colors_step = conn.execute(text("""
            SELECT id, step_number, step_name_ar 
            FROM service_workflows 
            WHERE service_id = :service_id AND step_type = 'colors' AND is_active = true
        """), {"service_id": service_id}).fetchone()
        
        if not colors_step:
            print("⚠️ [REMOVE_COLORS] Colors step not found - may already be removed")
            return True
        
        colors_step_id = colors_step[0]
        colors_step_number = colors_step[1]
        print(f"✅ [REMOVE_COLORS] Found colors step: ID={colors_step_id}, Step Number={colors_step_number}")
        
        # 3. حذف مرحلة الألوان
        print(f"🗑️ [REMOVE_COLORS] Deleting colors step (ID: {colors_step_id})...")
        conn.execute(text("""
            DELETE FROM service_workflows 
            WHERE id = :step_id
        """), {"step_id": colors_step_id})
        conn.commit()
        print(f"✅ [REMOVE_COLORS] Colors step deleted successfully")
        
        # 4. إعادة ترقيم الخطوات المتبقية
        print("🔄 [REMOVE_COLORS] Renumbering remaining steps...")
        remaining_steps = conn.execute(text("""
            SELECT id, step_number 
            FROM service_workflows 
            WHERE service_id = :service_id AND is_active = true
            ORDER BY step_number ASC
        """), {"service_id": service_id}).fetchall()
        
        new_step_number = 1
        for step in remaining_steps:
            step_id, old_step_number = step
            if old_step_number != new_step_number:
                conn.execute(text("""
                    UPDATE service_workflows 
                    SET step_number = :new_step, updated_at = NOW()
                    WHERE id = :step_id
                """), {
                    "step_id": step_id,
                    "new_step": new_step_number
                })
                print(f"  ✅ Step {old_step_number} → {new_step_number}")
            new_step_number += 1
        
        conn.commit()
        print(f"✅ [REMOVE_COLORS] Renumbered {len(remaining_steps)} steps")
        
        # 5. التحقق من النتيجة
        final_steps = conn.execute(text("""
            SELECT step_number, step_name_ar, step_type 
            FROM service_workflows 
            WHERE service_id = :service_id AND is_active = true
            ORDER BY step_number ASC
        """), {"service_id": service_id}).fetchall()
        
        print("=" * 80)
        print(f"✅ [REMOVE_COLORS] Final workflow steps for poster printing:")
        for step in final_steps:
            print(f"  Step {step[0]}: {step[1]} (type: {step[2]})")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print("=" * 80)
        print(f"❌ [REMOVE_COLORS] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 80)
        if conn:
            try:
                conn.rollback()
            except:
                pass
        return False
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

if __name__ == "__main__":
    asyncio.run(remove_poster_colors_step())

