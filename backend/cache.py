"""
نظام Cache بسيط لتحسين أداء API
"""
from functools import lru_cache
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import threading

# In-memory cache dictionary
_cache: Dict[str, tuple] = {}  # key: (value, expiry_time)
_cache_lock = threading.Lock()

# Cache TTL (Time To Live) بالثواني
CACHE_TTL = {
    'products': 300,      # 5 دقائق
    'services': 300,      # 5 دقائق
    'portfolio': 600,    # 10 دقائق
    'dashboard_stats': 60,  # دقيقة واحدة
    'default': 180       # 3 دقائق افتراضي
}

def get_cache_key(prefix: str, *args, **kwargs) -> str:
    """إنشاء مفتاح cache من المعاملات"""
    key_parts = [prefix]
    if args:
        key_parts.extend(str(arg) for arg in args)
    if kwargs:
        key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    return ":".join(key_parts)

def get_from_cache(key: str) -> Optional[Any]:
    """الحصول على قيمة من cache"""
    with _cache_lock:
        if key in _cache:
            value, expiry = _cache[key]
            if datetime.now() < expiry:
                return value
            else:
                # انتهت صلاحية cache
                del _cache[key]
    return None

def set_cache(key: str, value: Any, ttl: int = None) -> None:
    """حفظ قيمة في cache"""
    ttl = ttl or CACHE_TTL.get('default', 180)
    expiry = datetime.now() + timedelta(seconds=ttl)
    with _cache_lock:
        _cache[key] = (value, expiry)

def invalidate_cache(pattern: str = None) -> None:
    """إبطال cache - يمكن تمرير pattern لحذف مفاتيح محددة"""
    with _cache_lock:
        if pattern:
            keys_to_delete = [k for k in _cache.keys() if pattern in k]
            for key in keys_to_delete:
                del _cache[key]
        else:
            _cache.clear()

def clear_cache(key: str) -> None:
    """مسح cache لمفتاح محدد"""
    with _cache_lock:
        if key in _cache:
            del _cache[key]

def cache_response(ttl: int = None, prefix: str = None):
    """Decorator لـ cache استجابات API"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # إنشاء مفتاح cache
            cache_prefix = prefix or func.__name__
            cache_key = get_cache_key(cache_prefix, *args, **kwargs)
            
            # محاولة جلب من cache
            cached_value = get_from_cache(cache_key)
            if cached_value is not None:
                return cached_value
            
            # استدعاء الدالة الأصلية
            result = func(*args, **kwargs)
            
            # حفظ في cache
            cache_ttl = ttl or CACHE_TTL.get(cache_prefix, CACHE_TTL['default'])
            set_cache(cache_key, result, cache_ttl)
            
            return result
        return wrapper
    return decorator

def get_cache_stats() -> Dict[str, Any]:
    """الحصول على إحصائيات cache"""
    with _cache_lock:
        now = datetime.now()
        active_keys = [k for k, (_, expiry) in _cache.items() if now < expiry]
        expired_keys = [k for k, (_, expiry) in _cache.items() if now >= expiry]
        
        return {
            'total_keys': len(_cache),
            'active_keys': len(active_keys),
            'expired_keys': len(expired_keys),
            'memory_usage': 'N/A'  # يمكن إضافة حساب حجم الذاكرة لاحقاً
        }

