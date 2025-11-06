"""
API endpoints for managing service workflows (مراحل الطلب لكل خدمة)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from decimal import Decimal

router = APIRouter()

# Pydantic models
class ServiceWorkflowCreate(BaseModel):
    service_id: int
    step_number: int
    step_name_ar: str
    step_name_en: Optional[str] = None
    step_description_ar: Optional[str] = None
    step_description_en: Optional[str] = None
    step_type: str  # dimensions, colors, files, quantity, pages, print_options, customer_info, delivery
    step_config: Optional[Dict[str, Any]] = None
    display_order: int = 0
    is_active: bool = True

class ServiceWorkflowUpdate(BaseModel):
    step_number: Optional[int] = None
    step_name_ar: Optional[str] = None
    step_name_en: Optional[str] = None
    step_description_ar: Optional[str] = None
    step_description_en: Optional[str] = None
    step_type: Optional[str] = None
    step_config: Optional[Dict[str, Any]] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

@router.get("/service/{service_id}/workflow")
async def get_service_workflow(service_id: int, db: Session = Depends(get_db)):
    """الحصول على جميع مراحل خدمة معينة"""
    try:
        result = db.execute(text("""
            SELECT 
                id, service_id, step_number, step_name_ar, step_name_en,
                step_description_ar, step_description_en, step_type,
                step_config, display_order, is_active,
                created_at, updated_at
            FROM service_workflows
            WHERE service_id = :service_id AND is_active = true
            ORDER BY step_number ASC, display_order ASC
        """), {"service_id": service_id})
        
        workflows = []
        for row in result:
            workflows.append({
                "id": row[0],
                "service_id": row[1],
                "step_number": row[2],
                "step_name_ar": row[3],
                "step_name_en": row[4],
                "step_description_ar": row[5],
                "step_description_en": row[6],
                "step_type": row[7],
                "step_config": row[8] if row[8] else {},
                "display_order": row[9],
                "is_active": row[10],
                "created_at": str(row[11]) if row[11] else None,
                "updated_at": str(row[12]) if row[12] else None,
            })
        
        return {
            "success": True,
            "workflows": workflows
        }
    except Exception as e:
        print(f"Error getting service workflow: {e}")
        return {
            "success": False,
            "error": str(e),
            "workflows": []
        }

@router.get("/workflow/{workflow_id}")
async def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """الحصول على مرحلة محددة"""
    try:
        result = db.execute(text("""
            SELECT 
                id, service_id, step_number, step_name_ar, step_name_en,
                step_description_ar, step_description_en, step_type,
                step_config, display_order, is_active,
                created_at, updated_at
            FROM service_workflows
            WHERE id = :workflow_id
        """), {"workflow_id": workflow_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        return {
            "success": True,
            "workflow": {
                "id": result[0],
                "service_id": result[1],
                "step_number": result[2],
                "step_name_ar": result[3],
                "step_name_en": result[4],
                "step_description_ar": result[5],
                "step_description_en": result[6],
                "step_type": result[7],
                "step_config": result[8] if result[8] else {},
                "display_order": result[9],
                "is_active": result[10],
                "created_at": str(result[11]) if result[11] else None,
                "updated_at": str(result[12]) if result[12] else None,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflow")
async def create_workflow(workflow: ServiceWorkflowCreate, db: Session = Depends(get_db)):
    """إنشاء مرحلة جديدة"""
    try:
        import json
        step_config_json = json.dumps(workflow.step_config) if workflow.step_config else None
        
        db.execute(text("""
            INSERT INTO service_workflows 
            (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
             step_description_en, step_type, step_config, display_order, is_active)
            VALUES 
            (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
             :step_description_en, :step_type, :step_config::jsonb, :display_order, :is_active)
            RETURNING id
        """), {
            "service_id": workflow.service_id,
            "step_number": workflow.step_number,
            "step_name_ar": workflow.step_name_ar,
            "step_name_en": workflow.step_name_en,
            "step_description_ar": workflow.step_description_ar,
            "step_description_en": workflow.step_description_en,
            "step_type": workflow.step_type,
            "step_config": step_config_json,
            "display_order": workflow.display_order,
            "is_active": workflow.is_active
        })
        
        db.commit()
        
        return {
            "success": True,
            "message": "تم إنشاء المرحلة بنجاح"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/workflow/{workflow_id}")
async def update_workflow(workflow_id: int, workflow: ServiceWorkflowUpdate, db: Session = Depends(get_db)):
    """تحديث مرحلة موجودة"""
    try:
        import json
        
        # بناء استعلام UPDATE ديناميكي
        update_fields = []
        params = {"workflow_id": workflow_id}
        
        if workflow.step_number is not None:
            update_fields.append("step_number = :step_number")
            params["step_number"] = workflow.step_number
        
        if workflow.step_name_ar is not None:
            update_fields.append("step_name_ar = :step_name_ar")
            params["step_name_ar"] = workflow.step_name_ar
        
        if workflow.step_name_en is not None:
            update_fields.append("step_name_en = :step_name_en")
            params["step_name_en"] = workflow.step_name_en
        
        if workflow.step_description_ar is not None:
            update_fields.append("step_description_ar = :step_description_ar")
            params["step_description_ar"] = workflow.step_description_ar
        
        if workflow.step_description_en is not None:
            update_fields.append("step_description_en = :step_description_en")
            params["step_description_en"] = workflow.step_description_en
        
        if workflow.step_type is not None:
            update_fields.append("step_type = :step_type")
            params["step_type"] = workflow.step_type
        
        if workflow.step_config is not None:
            update_fields.append("step_config = :step_config::jsonb")
            params["step_config"] = json.dumps(workflow.step_config)
        
        if workflow.display_order is not None:
            update_fields.append("display_order = :display_order")
            params["display_order"] = workflow.display_order
        
        if workflow.is_active is not None:
            update_fields.append("is_active = :is_active")
            params["is_active"] = workflow.is_active
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="لا توجد حقول للتحديث")
        
        update_fields.append("updated_at = NOW()")
        
        db.execute(text(f"""
            UPDATE service_workflows
            SET {', '.join(update_fields)}
            WHERE id = :workflow_id
        """), params)
        
        db.commit()
        
        return {
            "success": True,
            "message": "تم تحديث المرحلة بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/workflow/{workflow_id}")
async def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """حذف مرحلة"""
    try:
        result = db.execute(text("""
            DELETE FROM service_workflows
            WHERE id = :workflow_id
            RETURNING id
        """), {"workflow_id": workflow_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        db.commit()
        
        return {
            "success": True,
            "message": "تم حذف المرحلة بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/setup-lecture-printing")
async def setup_lecture_printing_service(db: Session = Depends(get_db)):
    """إعداد خدمة طباعة المحاضرات مع مراحلها"""
    print("=" * 80)
    print("🔧 [SETUP] Starting lecture printing service setup...")
    print("=" * 80)
    
    try:
        import json
        
        # 1. التحقق من وجود الخدمة أو إنشائها
        print("🔍 [SETUP] Searching for existing service...")
        existing_service = db.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%طباعة محاضرات%' OR name_ar LIKE '%محاضرات%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            service_name = existing_service[1] if len(existing_service) > 1 else "N/A"
            print(f"✅ [SETUP] Found existing service: ID={service_id}, Name={service_name}")
            
            # حذف المراحل القديمة
            deleted_count = db.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), 
                      {"service_id": service_id}).rowcount
            db.commit()
            print(f"🗑️ [SETUP] Deleted {deleted_count} old workflows")
        else:
            print("📝 [SETUP] Service not found, creating new service...")
            # إنشاء الخدمة الجديدة
            result = db.execute(text("""
                INSERT INTO services 
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "طباعة محاضرات",
                "name_en": "Lecture Printing",
                "description_ar": "خدمة طباعة المحاضرات مع خيارات متعددة للقياس والجودة",
                "icon": "📚",
                "base_price": 100.0,
                "is_visible": True,
                "is_active": True,
                "display_order": 1
            })
            service_id = result.scalar()
            db.commit()
            print(f"✅ [SETUP] Created new service with ID: {service_id}")
        
        # 2. إضافة المراحل المخصصة لخدمة طباعة المحاضرات
        print(f"📋 [SETUP] Adding workflows for service_id={service_id}...")
        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "رفع الملفات وعدد النسخ",
                "step_name_en": "Upload Files and Quantity",
                "step_description_ar": "قم برفع ملفات المحاضرات (PDF أو Word) وحدد عدد النسخ المطلوبة",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "multiple": True,
                    "accept": "application/pdf,.pdf,.doc,.docx",
                    "analyze_pages": True,
                    "show_quantity": True
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "إعدادات الطباعة",
                "step_name_en": "Print Settings",
                "step_description_ar": "اختر قياس الورق، نوع الطباعة، الجودة، وعدد الوجوه",
                "step_type": "print_options",
                "step_config": {
                    "required": True,
                    "paper_sizes": ["A4", "B5"],
                    "paper_size": "A4",
                    "quality_options": {
                        "color": {
                            "standard": "طباعة عادية",
                            "laser": "دقة عالية (ليزرية)"
                        }
                    },
                    "hide_dimensions": True  # إخفاء الأبعاد
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "ملاحظات إضافية",
                "step_name_en": "Additional Notes",
                "step_description_ar": "أضف أي ملاحظات إضافية حول طلبك",
                "step_type": "notes",
                "step_config": {
                    "required": False,
                    "hide_work_type": True  # إخفاء نوع العمل
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "معلوماتك واختيار نوع الاستلام",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["whatsapp_optional", "load_from_account"]  # استيراد من الحساب
                }
            },
            {
                "step_number": 5,
                "step_name_ar": "الفاتورة والملخص",
                "step_name_en": "Invoice and Summary",
                "step_description_ar": "راجع تفاصيل طلبك وأكد الإرسال",
                "step_type": "invoice",
                "step_config": {
                    "required": True
                }
            }
        ]
        
        for workflow in workflows:
            try:
                print(f"  ➕ [SETUP] Adding step {workflow['step_number']}: {workflow['step_name_ar']} (type: {workflow['step_type']})")
                db.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                     step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, :step_config::jsonb, :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": json.dumps(workflow["step_config"]),
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"  ✅ [SETUP] Step {workflow['step_number']} added successfully")
            except Exception as step_error:
                print(f"  ❌ [SETUP] Error adding step {workflow['step_number']}: {str(step_error)}")
                raise
        
        db.commit()
        print(f"✅ [SETUP] Committed {len(workflows)} workflows to database")
        
        # التحقق من أن المراحل تم إضافتها
        verify_count = db.execute(text("""
            SELECT COUNT(*) FROM service_workflows WHERE service_id = :service_id
        """), {"service_id": service_id}).scalar()
        print(f"🔍 [SETUP] Verification: {verify_count} workflows found in database for service_id={service_id}")
        
        print("=" * 80)
        print(f"✅ [SETUP] Setup completed successfully! Service ID: {service_id}, Workflows: {verify_count}")
        print("=" * 80)
        
        return {
            "success": True,
            "message": "تم إعداد خدمة طباعة المحاضرات بنجاح",
            "service_id": service_id,
            "workflows_count": verify_count
        }
    except Exception as e:
        print("=" * 80)
        print(f"❌ [SETUP] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 80)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"خطأ في إعداد الخدمة: {str(e)}")

