# -*- coding: utf-8 -*-
"""Check orders in database"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    print("Error: DATABASE_URL not found")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # Count orders
        result = conn.execute(text("SELECT COUNT(*) FROM orders"))
        count = result.scalar()
        print(f"Total orders in database: {count}")
        
        # Get recent orders
        result2 = conn.execute(text("""
            SELECT id, order_number, status, created_at, customer_name, customer_phone
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 10
        """))
        
        print("\nRecent orders:")
        for row in result2:
            print(f"  ID: {row[0]}, Number: {row[1]}, Status: {row[2]}, Created: {row[3]}, Customer: {row[4] or 'N/A'}, Phone: {row[5] or 'N/A'}")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

