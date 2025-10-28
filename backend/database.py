from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Railway provides DATABASE_URL automatically
# For local development, it falls back to default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres@localhost:5432/khawam_local")

# Fix for Railway PostgreSQL connection
if DATABASE_URL.startswith("postgres://"):
    # Railway uses postgres:// but SQLAlchemy needs postgresql://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()