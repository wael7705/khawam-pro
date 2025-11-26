from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Railway provides DATABASE_URL automatically as an environment variable
# Get DATABASE_URL from environment (Railway sets this automatically)
# Try multiple environment variable names for compatibility
DATABASE_URL = (
    os.environ.get("DATABASE_URL") or 
    os.environ.get("POSTGRES_URL") or 
    os.environ.get("PGDATABASE") or
    os.getenv("DATABASE_URL", "")
)

if not DATABASE_URL:
    # Fallback for local development only
    DATABASE_URL = "postgresql://postgres@localhost:5432/khawam_local"
    print("⚠️ Warning: Using default localhost DATABASE_URL for local development")
    print("⚠️ Make sure DATABASE_URL is set on Railway!")

# Fix for Railway PostgreSQL connection
# Railway sometimes provides postgres:// instead of postgresql://
# Also handle postgresql+psycopg2:// format
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        # SQLAlchemy needs postgresql:// not postgres://
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        print("✅ Fixed postgres:// to postgresql://")
    elif DATABASE_URL.startswith("postgresql+psycopg2://"):
        # Remove psycopg2 driver specification if present
        DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)
        print("✅ Fixed postgresql+psycopg2:// to postgresql://")

# Print connection info (without sensitive data)
if DATABASE_URL:
    # Hide password in logs
    safe_url = DATABASE_URL
    try:
        if "@" in safe_url:
            parts = safe_url.split("@")
            if ":" in parts[0]:
                user_pass = parts[0].split(":")
                if len(user_pass) > 1:
                    safe_url = f"{user_pass[0]}:***@{parts[1]}"
        print(f"📊 Database URL: {safe_url[:80]}...")
    except Exception as e:
        print(f"📊 Database URL configured (password hidden)")

# Create engine with connection pooling and error handling
# على Railway، قد تكون قاعدة البيانات غير جاهزة مباشرة
# لذلك نستخدم pool_pre_ping=True لإعادة المحاولة تلقائياً
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using - سيحاول إعادة الاتصال تلقائياً
        pool_recycle=300,    # Recycle connections after 5 minutes
        pool_size=5,         # Number of connections to maintain
        max_overflow=10,     # Maximum number of connections to create beyond pool_size
        echo=False,
        connect_args={
            "connect_timeout": 10,  # Timeout for connection attempts
            "options": "-c statement_timeout=30000"  # 30 second timeout for queries
        }
    )
    print("✅ Database engine created successfully")
except Exception as e:
    print(f"⚠️ WARNING: Failed to create database engine with full options: {str(e)[:200]}")
    import traceback
    traceback.print_exc()
    # على Railway، قد تكون قاعدة البيانات غير جاهزة بعد
    # نحاول إنشاء engine بسيط - سيتم إعادة المحاولة لاحقاً
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,  # هذا مهم - سيحاول إعادة الاتصال تلقائياً
            echo=False,
            connect_args={"connect_timeout": 5}
        )
        print("⚠️ Created basic database engine - connection will be retried on first use")
    except Exception as e2:
        print(f"❌ CRITICAL: Cannot create database engine: {str(e2)[:200]}")
        # على Railway، إذا كان DATABASE_URL موجود لكن الاتصال فشل،
        # نرفع الخطأ فقط إذا كنا متأكدين أن المشكلة ليست مؤقتة
        # لكن نعطي رسالة واضحة
        if not DATABASE_URL or DATABASE_URL == "postgresql://postgres@localhost:5432/khawam_local":
            raise RuntimeError(f"Database connection failed. Please check DATABASE_URL environment variable on Railway.")
        else:
            # DATABASE_URL موجود - المشكلة قد تكون مؤقتة
            # نحاول المتابعة - pool_pre_ping سيحاول إعادة الاتصال
            print("⚠️ Continuing despite database engine creation error - will retry on first use")
            engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,
                echo=False,
                connect_args={"connect_timeout": 3}
            )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()