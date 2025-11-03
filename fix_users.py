"""
Script to fix users in database - removes old users and creates new ones with proper password hashes
Run this script to clean up the database and create default users
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, UserType, Order, OrderItem, Base
from routers.auth import get_password_hash, normalize_phone

def fix_users():
    """Remove all existing users and create new default users with proper password hashes"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        print("=" * 60)
        print("🔄 Starting user database fix...")
        print("=" * 60)
        
        # 1. Delete all related data first (Orders, OrderItems)
        print("\n🔗 Checking related data...")
        
        all_orders = db.query(Order).all()
        orders_count = len(all_orders)
        
        if orders_count > 0:
            print(f"📦 Found {orders_count} order(s) related to users")
            print(f"🗑️  Deleting related order items and orders...")
            
            # Delete OrderItems first
            for order in all_orders:
                order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
                for item in order_items:
                    db.delete(item)
            
            # Then delete Orders
            for order in all_orders:
                print(f"   - Deleting order {order.id} (Customer ID: {order.customer_id})")
                db.delete(order)
            
            db.commit()
            print(f"✅ Deleted {orders_count} order(s) and related items")
        else:
            print("ℹ️  No related orders found")
        
        # 2. Delete all existing users
        all_users = db.query(User).all()
        deleted_count = len(all_users)
        
        if deleted_count > 0:
            print(f"\n🗑️  Deleting {deleted_count} existing user(s)...")
            for user in all_users:
                print(f"   - {user.name} (ID: {user.id}, Email: {user.email}, Phone: {user.phone})")
                db.delete(user)
            db.commit()
            print(f"✅ Deleted {deleted_count} user(s)")
        else:
            print("ℹ️  No existing users to delete")
        
        # 3. Ensure UserTypes exist
        print("\n📋 Checking user types...")
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        
        if not admin_type:
            print("   Creating 'مدير' user type...")
            admin_type = UserType(name_ar="مدير", name_en="admin", permissions={"all": True})
            db.add(admin_type)
            
        if not employee_type:
            print("   Creating 'موظف' user type...")
            employee_type = UserType(name_ar="موظف", name_en="employee", permissions={"orders": True, "products": True, "services": True})
            db.add(employee_type)
            
        if not customer_type:
            print("   Creating 'عميل' user type...")
            customer_type = UserType(name_ar="عميل", name_en="customer", permissions={"orders": True, "view": True})
            db.add(customer_type)
        
        db.commit()
        
        # Refresh to get IDs
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        
        print("✅ User types ready")
        
        # 4. Create default users with password hashes
        print("\n🆕 Creating default users...")
        
        # Admin 1
        phone1 = normalize_phone("0966320114")
        password_hash1 = get_password_hash("admin123")
        user1 = User(
            name="مدير 1",
            phone=phone1,
            password_hash=password_hash1,
            user_type_id=admin_type.id,
            is_active=True
        )
        db.add(user1)
        print(f"✅ Admin 1: {phone1} / admin123 (Hash length: {len(password_hash1)})")
        
        # Admin 2
        phone2 = normalize_phone("+963955773227")
        password_hash2 = get_password_hash("khawam-p")
        user2 = User(
            name="مدير 2",
            phone=phone2,
            password_hash=password_hash2,
            user_type_id=admin_type.id,
            is_active=True
        )
        db.add(user2)
        print(f"✅ Admin 2: {phone2} / khawam-p (Hash length: {len(password_hash2)})")
        
        # Employees
        for i in range(1, 4):
            email = f"khawam-{i}@gmail.com"
            password_hash = get_password_hash(f"khawam-{i}")
            user = User(
                name=f"موظف {i}",
                email=email,
                password_hash=password_hash,
                user_type_id=employee_type.id,
                is_active=True
            )
            db.add(user)
            print(f"✅ Employee {i}: {email} / khawam-{i} (Hash length: {len(password_hash)})")
        
        # Customer
        customer_email = "customer@gmail.com"
        customer_password_hash = get_password_hash("963214")
        customer_user = User(
            name="عميل تجريبي",
            email=customer_email,
            password_hash=customer_password_hash,
            user_type_id=customer_type.id,
            is_active=True
        )
        db.add(customer_user)
        print(f"✅ Customer: {customer_email} / 963214 (Hash length: {len(customer_password_hash)})")
        
        # 5. Commit all changes
        db.commit()
        print("\n💾 All changes committed to database")
        
        # 6. Verify
        print("\n🔍 Verifying users...")
        all_users = db.query(User).all()
        users_without_password = [u for u in all_users if not u.password_hash]
        
        print(f"\n📊 Summary:")
        print(f"   Deleted orders: {orders_count}")
        print(f"   Total users: {len(all_users)}")
        print(f"   Users without password: {len(users_without_password)}")
        
        if users_without_password:
            print("\n⚠️  WARNING: Some users don't have password hashes:")
            for u in users_without_password:
                print(f"   - {u.name} (ID: {u.id})")
        else:
            print("\n✅ All users have password hashes!")
        
        print("\n" + "=" * 60)
        print("✅ Database fix completed successfully!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        db.close()

if __name__ == "__main__":
    success = fix_users()
    sys.exit(0 if success else 1)

