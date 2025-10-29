from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Railway provides DATABASE_URL automatically as an environment variable
# Get DATABASE_URL from environment (Railway sets this automatically)
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    # Try getting it from .env file (for local development)
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    
if not DATABASE_URL:
    # Fallback for local development only
    DATABASE_URL = "postgresql://postgres@localhost:5432/khawam_local"
    print("⚠️ Warning: Using default localhost DATABASE_URL. Make sure DATABASE_URL is set on Railway!")

# Fix for Railway PostgreSQL connection
# Railway sometimes provides postgres:// instead of postgresql://
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy needs postgresql:// not postgres://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Print connection info (without sensitive data)
if DATABASE_URL:
    # Hide password in logs
    safe_url = DATABASE_URL
    if "@" in safe_url:
        parts = safe_url.split("@")
        if ":" in parts[0]:
            user_pass = parts[0].split(":")
            if len(user_pass) > 1:
                safe_url = f"{user_pass[0]}:***@{parts[1]}"
    print(f"📊 Database URL: {safe_url[:50]}...")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=300,    # Recycle connections after 5 minutes
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()