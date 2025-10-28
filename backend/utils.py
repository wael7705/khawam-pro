"""
Utility functions for error handling, validation, and logging
"""
import logging
from typing import Dict, Any
from fastapi import HTTPException

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def handle_error(error: Exception, operation: str) -> HTTPException:
    """
    Handle and log errors with standardized HTTP exceptions
    """
    error_message = str(error)
    logger.error(f"{operation}: {error_message}")
    
    # Database errors
    if "connection" in error_message.lower():
        return HTTPException(
            status_code=503,
            detail="قاعدة البيانات غير متاحة حالياً"
        )
    
    if "duplicate" in error_message.lower() or "unique" in error_message.lower():
        return HTTPException(
            status_code=400,
            detail="العنصر موجود مسبقاً"
        )
    
    if "foreign key" in error_message.lower():
        return HTTPException(
            status_code=400,
            detail="لا يمكن حذف العنصر لأنه مرتبط بعناصر أخرى"
        )
    
    # Default error
    return HTTPException(
        status_code=500,
        detail=f"حدث خطأ أثناء {operation}"
    )

def validate_price(price: float) -> float:
    """Validate price is positive"""
    if price <= 0:
        raise ValueError("السعر يجب أن يكون أكبر من صفر")
    return price

def validate_string(value: str, field_name: str, min_length: int = 1, max_length: int = 200) -> str:
    """Validate string fields"""
    if not value or not value.strip():
        raise ValueError(f"{field_name} لا يمكن أن يكون فارغاً")
    
    if len(value) < min_length:
        raise ValueError(f"{field_name} قصير جداً")
    
    if len(value) > max_length:
        raise ValueError(f"{field_name} طويل جداً")
    
    return value.strip()

def success_response(data: Any = None, message: str = "تمت العملية بنجاح") -> Dict[str, Any]:
    """Standard success response"""
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return response

def paginate_query(query, page: int = 1, page_size: int = 20):
    """Add pagination to query"""
    skip = (page - 1) * page_size
    total = query.count()
    items = query.offset(skip).limit(page_size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

