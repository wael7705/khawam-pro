"""
Script to check if orders exist in database
"""
import sys
import os

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import Order

def check_orders():
    """Check all orders in database"""
    db = next(get_db())
    try:
        orders = db.query(Order).order_by(Order.id.desc()).limit(20).all()
        
        print(f"\n{'='*60}")
        print(f"Total orders found: {len(orders)}")
        print(f"{'='*60}\n")
        
        for order in orders:
            print(f"ID: {order.id}")
            print(f"  Order Number: {order.order_number}")
            print(f"  Status: {order.status}")
            print(f"  Customer: {getattr(order, 'customer_name', 'N/A')}")
            print(f"  Phone: {getattr(order, 'customer_phone', 'N/A')}")
            print(f"  Created: {order.created_at}")
            print()
    finally:
        db.close()

if __name__ == "__main__":
    check_orders()

