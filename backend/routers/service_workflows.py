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

