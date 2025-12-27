"""
Analytics router for tracking visitors and page views
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_, or_, inspect as sql_inspect
from database import get_db
from models import VisitorTracking, PageView, User
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from routers.auth import get_current_active_user, get_current_user_optional

router = APIRouter()

class TrackVisitRequest(BaseModel):
    session_id: str
    page_path: str
    referrer: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    entry_page: bool = False
    exit_page: bool = False

class TrackPageViewRequest(BaseModel):
    session_id: str
    page_path: str
    time_spent: int = 0
    scroll_depth: int = 0
    actions: Optional[Dict[str, Any]] = None

def parse_user_agent(user_agent: Optional[str]) -> Dict[str, Optional[str]]:
    """Parse user agent to extract browser and OS"""
    if not user_agent:
        return {"browser": None, "os": None, "device_type": None}
    
    user_agent_lower = user_agent.lower()
    
    # Detect browser
    browser = None
    if "chrome" in user_agent_lower and "edg" not in user_agent_lower:
        browser = "Chrome"
    elif "firefox" in user_agent_lower:
        browser = "Firefox"
    elif "safari" in user_agent_lower and "chrome" not in user_agent_lower:
        browser = "Safari"
    elif "edg" in user_agent_lower:
        browser = "Edge"
    elif "opera" in user_agent_lower:
        browser = "Opera"
    
    # Detect OS
    os_name = None
    if "windows" in user_agent_lower:
        os_name = "Windows"
    elif "mac" in user_agent_lower or "darwin" in user_agent_lower:
        os_name = "macOS"
    elif "linux" in user_agent_lower:
        os_name = "Linux"
    elif "android" in user_agent_lower:
        os_name = "Android"
    elif "ios" in user_agent_lower or "iphone" in user_agent_lower or "ipad" in user_agent_lower:
        os_name = "iOS"
    
    # Detect device type
    device_type = None
    if "mobile" in user_agent_lower or "android" in user_agent_lower or "iphone" in user_agent_lower:
        device_type = "mobile"
    elif "tablet" in user_agent_lower or "ipad" in user_agent_lower:
        device_type = "tablet"
    else:
        device_type = "desktop"
    
    return {"browser": browser, "os": os_name, "device_type": device_type}

@router.post("/track")
async def track_visit(
    request: TrackVisitRequest,
    request_obj: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Track a visitor visit"""
    try:
        # Get IP address from request
        ip_address = request_obj.client.host if request_obj.client else None
        if not ip_address or ip_address == "127.0.0.1":
            # Try to get from headers (for Railway/proxy)
            forwarded_for = request_obj.headers.get("X-Forwarded-For")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            else:
                real_ip = request_obj.headers.get("X-Real-IP")
                if real_ip:
                    ip_address = real_ip
        
        if not request.ip_address:
            request.ip_address = ip_address
        
        # التحقق من وجود جدول visitor_tracking
        inspector = sql_inspect(db.bind)
        # SQLAlchemy returns a list of table names (strings)
        tables = list(inspector.get_table_names())
        
        if 'visitor_tracking' not in tables:
            # الجدول غير موجود - محاولة إنشائه تلقائياً
            print("⚠️ visitor_tracking table not found - attempting to create...")
            try:
                from sqlalchemy import text
                db.execute(text("""
                    CREATE TABLE IF NOT EXISTS visitor_tracking (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(255) NOT NULL,
                        user_id INTEGER REFERENCES users(id),
                        page_path VARCHAR(500) NOT NULL,
                        referrer TEXT,
                        user_agent TEXT,
                        device_type VARCHAR(50),
                        browser VARCHAR(100),
                        os VARCHAR(100),
                        ip_address VARCHAR(45),
                        country VARCHAR(100),
                        city VARCHAR(100),
                        time_on_page INTEGER DEFAULT 0,
                        exit_page BOOLEAN DEFAULT FALSE,
                        entry_page BOOLEAN DEFAULT FALSE,
                        visit_count INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                db.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_visitor_tracking_session_id 
                    ON visitor_tracking(session_id)
                """))
                db.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_visitor_tracking_created_at 
                    ON visitor_tracking(created_at)
                """))
                db.commit()
                print("✅ visitor_tracking table created successfully")
            except Exception as create_error:
                db.rollback()
                print(f"⚠️ Failed to create visitor_tracking table: {create_error}")
                return {"success": True, "message": "Tracking table not available", "visitor_id": None}
        
        # Parse user agent if not provided
        if not request.browser or not request.os:
            parsed = parse_user_agent(request.user_agent)
            if not request.browser:
                request.browser = parsed["browser"]
            if not request.os:
                request.os = parsed["os"]
            if not request.device_type:
                request.device_type = parsed["device_type"]
        
        # Check if visitor exists
        existing_visitor = db.query(VisitorTracking).filter(
            VisitorTracking.session_id == request.session_id
        ).order_by(VisitorTracking.created_at.desc()).first()
        
        visit_count = 1
        if existing_visitor:
            visit_count = existing_visitor.visit_count + 1
        
        # Create new visitor tracking entry
        visitor = VisitorTracking(
            session_id=request.session_id,
            user_id=current_user.id if current_user else None,
            page_path=request.page_path,
            referrer=request.referrer,
            user_agent=request.user_agent,
            device_type=request.device_type,
            browser=request.browser,
            os=request.os,
            ip_address=request.ip_address,
            country=request.country,
            city=request.city,
            entry_page=request.entry_page,
            exit_page=request.exit_page,
            visit_count=visit_count
        )
        
        db.add(visitor)
        db.commit()
        db.refresh(visitor)
        
        return {"success": True, "visitor_id": visitor.id}
    except Exception as e:
        db.rollback()
        # لا نرفع خطأ - نرجع success لتجنب كسر الموقع
        # Analytics ليس حرجاً - الموقع يجب أن يعمل حتى لو فشل التتبع
        print(f"⚠️ Error tracking visit (non-critical): {str(e)}")
        import traceback
        traceback.print_exc()
        # إرجاع success حتى لو فشل - Analytics ليس حرجاً
        return {"success": True, "message": "Tracking failed but site continues", "error": str(e)[:100]}

@router.post("/page-view")
async def track_page_view(
    request: TrackPageViewRequest,
    db: Session = Depends(get_db)
):
    """Track a page view"""
    try:
        # التحقق من وجود جدول page_views
        inspector = sql_inspect(db.bind)
        tables = list(inspector.get_table_names())
        
        if 'page_views' not in tables:
            # الجدول غير موجود - محاولة إنشائه تلقائياً
            print("⚠️ page_views table not found - attempting to create...")
            try:
                from sqlalchemy import text
                db.execute(text("""
                    CREATE TABLE IF NOT EXISTS page_views (
                        id SERIAL PRIMARY KEY,
                        visitor_id INTEGER REFERENCES visitor_tracking(id),
                        session_id VARCHAR(255) NOT NULL,
                        page_path VARCHAR(500) NOT NULL,
                        time_spent INTEGER DEFAULT 0,
                        scroll_depth INTEGER DEFAULT 0,
                        actions JSONB,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                db.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_page_views_session_id 
                    ON page_views(session_id)
                """))
                db.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_page_views_created_at 
                    ON page_views(created_at)
                """))
                db.commit()
                print("✅ page_views table created successfully")
            except Exception as create_error:
                db.rollback()
                print(f"⚠️ Failed to create page_views table: {create_error}")
                return {"success": True, "message": "Page views table not available", "page_view_id": None}
        
        # Get visitor_id from session_id
        visitor = db.query(VisitorTracking).filter(
            VisitorTracking.session_id == request.session_id
        ).order_by(VisitorTracking.created_at.desc()).first()
        
        visitor_id = visitor.id if visitor else None
        
        page_view = PageView(
            visitor_id=visitor_id,
            session_id=request.session_id,
            page_path=request.page_path,
            time_spent=request.time_spent,
            scroll_depth=request.scroll_depth,
            actions=request.actions
        )
        
        db.add(page_view)
        db.commit()
        db.refresh(page_view)
        
        return {"success": True, "page_view_id": page_view.id}
    except Exception as e:
        db.rollback()
        # لا نرفع خطأ - Analytics ليس حرجاً
        print(f"⚠️ Error tracking page view (non-critical): {str(e)}")
        # إرجاع success حتى لو فشل
        return {"success": True, "message": "Tracking failed but site continues", "error": str(e)[:100]}

@router.get("/stats")
async def get_analytics_stats(
    period: str = Query("day", description="Period: day, week, month"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get analytics statistics"""
    try:
        # التحقق من وجود الجداول
        inspector = sql_inspect(db.bind)
        tables = list(inspector.get_table_names())
        
        if 'visitor_tracking' not in tables or 'page_views' not in tables:
            # الجداول غير موجودة - إرجاع بيانات فارغة
            return {
                "period": period,
                "total_visitors": 0,
                "total_page_views": 0,
                "unique_pages": 0,
                "average_time_on_site": 0,
                "message": "Analytics tables not available - run migration first"
            }
        
        # Calculate date range
        now = datetime.now()
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=1)
        
        # Total visitors
        total_visitors = db.query(func.count(func.distinct(VisitorTracking.session_id))).filter(
            VisitorTracking.created_at >= start_date
        ).scalar() or 0
        
        # Total page views
        total_page_views = db.query(func.count(PageView.id)).filter(
            PageView.created_at >= start_date
        ).scalar() or 0
        
        # Unique pages
        unique_pages = db.query(func.count(func.distinct(PageView.page_path))).filter(
            PageView.created_at >= start_date
        ).scalar() or 0
        
        # Average time on site
        avg_time = db.query(func.avg(PageView.time_spent)).filter(
            PageView.created_at >= start_date
        ).scalar() or 0
        
        return {
            "period": period,
            "total_visitors": total_visitors,
            "total_page_views": total_page_views,
            "unique_pages": unique_pages,
            "average_time_on_site": round(float(avg_time), 2) if avg_time else 0
        }
    except Exception as e:
        print(f"⚠️ Error getting analytics stats: {str(e)}")
        import traceback
        traceback.print_exc()
        # إرجاع بيانات فارغة بدلاً من رفع خطأ
        return {
            "period": period,
            "total_visitors": 0,
            "total_page_views": 0,
            "unique_pages": 0,
            "average_time_on_site": 0,
            "error": str(e)[:100]
        }

@router.get("/exit-rates")
async def get_exit_rates(
    period: str = Query("day", description="Period: day, week, month"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get exit rates by page"""
    try:
        # التحقق من وجود الجدول
        inspector = sql_inspect(db.bind)
        tables = list(inspector.get_table_names())
        
        if 'visitor_tracking' not in tables:
            return {"period": period, "exit_rates": [], "message": "Analytics table not available"}
        
        # Calculate date range
        now = datetime.now()
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=1)
        
        # Get exit rates by page
        exit_stats = db.execute(text("""
            SELECT 
                page_path,
                COUNT(*) as total_visits,
                SUM(CASE WHEN exit_page = true THEN 1 ELSE 0 END) as exits,
                ROUND(
                    (SUM(CASE WHEN exit_page = true THEN 1 ELSE 0 END)::float / COUNT(*)::float) * 100, 
                    2
                ) as exit_rate
            FROM visitor_tracking
            WHERE created_at >= :start_date
            GROUP BY page_path
            ORDER BY exit_rate DESC
        """), {"start_date": start_date}).fetchall()
        
        result = []
        for row in exit_stats:
            result.append({
                "page_path": row[0],
                "total_visits": row[1],
                "exits": row[2],
                "exit_rate": float(row[3]) if row[3] else 0
            })
        
        return {"period": period, "exit_rates": result}
    except Exception as e:
        print(f"⚠️ Error getting exit rates: {str(e)}")
        import traceback
        traceback.print_exc()
        # إرجاع بيانات فارغة بدلاً من رفع خطأ
        return {"period": period, "exit_rates": [], "error": str(e)[:100]}

@router.get("/pages")
async def get_page_stats(
    period: str = Query("day", description="Period: day, week, month"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get statistics for each page"""
    try:
        # التحقق من وجود الجدول
        inspector = sql_inspect(db.bind)
        tables = list(inspector.get_table_names())
        
        if 'page_views' not in tables:
            return {"period": period, "pages": [], "message": "Analytics table not available"}
        
        # Calculate date range
        now = datetime.now()
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=1)
        
        # Get page statistics
        page_stats = db.execute(text("""
            SELECT 
                page_path,
                COUNT(*) as views,
                AVG(time_spent) as avg_time_spent,
                AVG(scroll_depth) as avg_scroll_depth
            FROM page_views
            WHERE created_at >= :start_date
            GROUP BY page_path
            ORDER BY views DESC
        """), {"start_date": start_date}).fetchall()
        
        result = []
        for row in page_stats:
            result.append({
                "page_path": row[0],
                "views": row[1],
                "avg_time_spent": round(float(row[2]), 2) if row[2] else 0,
                "avg_scroll_depth": round(float(row[3]), 2) if row[3] else 0
            })
        
        return {"period": period, "pages": result}
    except Exception as e:
        print(f"⚠️ Error getting page stats: {str(e)}")
        import traceback
        traceback.print_exc()
        # إرجاع بيانات فارغة بدلاً من رفع خطأ
        return {"period": period, "pages": [], "error": str(e)[:100]}

@router.get("/visitors")
async def get_visitor_count(
    period: str = Query("day", description="Period: day, week, month"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get visitor count"""
    try:
        # التحقق من وجود الجدول
        inspector = sql_inspect(db.bind)
        tables = list(inspector.get_table_names())
        
        if 'visitor_tracking' not in tables:
            return {
                "period": period,
                "unique_visitors": 0,
                "total_visits": 0,
                "message": "Analytics table not available"
            }
        
        # Calculate date range
        now = datetime.now()
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=1)
        
        # Get unique visitors
        unique_visitors = db.query(func.count(func.distinct(VisitorTracking.session_id))).filter(
            VisitorTracking.created_at >= start_date
        ).scalar() or 0
        
        # Get total visits
        total_visits = db.query(func.count(VisitorTracking.id)).filter(
            VisitorTracking.created_at >= start_date
        ).scalar() or 0
        
        return {
            "period": period,
            "unique_visitors": unique_visitors,
            "total_visits": total_visits
        }
    except Exception as e:
        print(f"⚠️ Error getting visitor count: {str(e)}")
        import traceback
        traceback.print_exc()
        # إرجاع بيانات فارغة بدلاً من رفع خطأ
        return {
            "period": period,
            "unique_visitors": 0,
            "total_visits": 0,
            "error": str(e)[:100]
        }

@router.get("/funnels")
async def get_funnel_analysis(
    period: str = Query("day", description="Period: day, week, month"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get funnel analysis - user journey through the site"""
    try:
        # التحقق من وجود الجداول
        inspector = sql_inspect(db.bind)
        tables = list(inspector.get_table_names())
        
        if 'visitor_tracking' not in tables or 'page_views' not in tables:
            return {
                "period": period,
                "funnel": [],
                "message": "Analytics tables not available"
            }
        
        # Calculate date range
        now = datetime.now()
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=1)
        
        # Get common page paths
        common_paths = ["/", "/services", "/portfolio", "/contact", "/orders"]
        
        # Get visitor flow
        funnel_data = []
        for i, path in enumerate(common_paths):
            if i == 0:
                # Entry point
                count = db.query(func.count(func.distinct(VisitorTracking.session_id))).filter(
                    and_(
                        VisitorTracking.page_path == path,
                        VisitorTracking.entry_page == True,
                        VisitorTracking.created_at >= start_date
                    )
                ).scalar() or 0
            else:
                # Subsequent pages
                count = db.query(func.count(func.distinct(PageView.session_id))).filter(
                    and_(
                        PageView.page_path == path,
                        PageView.created_at >= start_date
                    )
                ).scalar() or 0
            
            funnel_data.append({
                "page": path,
                "visitors": count
            })
        
        return {"period": period, "funnel": funnel_data}
    except Exception as e:
        print(f"⚠️ Error getting funnel analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        # إرجاع بيانات فارغة بدلاً من رفع خطأ
        return {"period": period, "funnel": [], "error": str(e)[:100]}

