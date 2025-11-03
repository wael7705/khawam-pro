"""
Simple and direct setup endpoint that uses raw SQL to guarantee execution
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine
from models import User, UserType
from routers.auth import get_password_hash, normalize_phone
import os

router = APIRouter()

@router.get("/force-reset")
@router.post("/force-reset")
async def force_reset_users(db: Session = Depends(get_db)):
    """
    Force reset all users using raw SQL - GUARANTEED to work
    This bypasses ORM and uses direct SQL statements
    """
    try:
        print("=" * 70)
        print("🔥 FORCE RESET: Using raw SQL for guaranteed execution")
        print("=" * 70)
        
        with engine.begin() as conn:  # begin() = transaction that auto-commits
            # Step 1: Delete all order_items
            print("\n1️⃣ Deleting order_items...")
            conn.execute(text("DELETE FROM order_items"))
            print("   ✅ Done")
            
            # Step 2: Delete all orders
            print("\n2️⃣ Deleting orders...")
            result = conn.execute(text("DELETE FROM orders"))
            orders_deleted = result.rowcount
            print(f"   ✅ Deleted {orders_deleted} orders")
            
            # Step 3: Delete studio_projects (if table exists)
            print("\n3️⃣ Deleting studio_projects...")
            try:
                result = conn.execute(text("DELETE FROM studio_projects"))
                studio_deleted = result.rowcount
                print(f"   ✅ Deleted {studio_deleted} studio projects")
            except Exception as e:
                print(f"   ⚠️  No studio_projects table or already empty: {e}")
                studio_deleted = 0
            
            # Step 4: Delete all users
            print("\n4️⃣ Deleting users...")
            result = conn.execute(text("DELETE FROM users"))
            users_deleted = result.rowcount
            print(f"   ✅ Deleted {users_deleted} users")
            
            print("\n" + "=" * 70)
            print("✅ Database cleared successfully!")
            print("=" * 70)
        
        # Step 4: Create user types if needed
        print("\n4️⃣ Ensuring user types exist...")
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        if not admin_type:
            admin_type = UserType(name_ar="مدير", name_en="admin", permissions={"all": True})
            db.add(admin_type)
            
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        if not employee_type:
            employee_type = UserType(name_ar="موظف", name_en="employee", permissions={"orders": True, "products": True, "services": True})
            db.add(employee_type)
            
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        if not customer_type:
            customer_type = UserType(name_ar="عميل", name_en="customer", permissions={"orders": True, "view": True})
            db.add(customer_type)
        
        db.commit()
        
        # Refresh
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        print("   ✅ User types ready")
        
        # Step 5: Create default users
        print("\n5️⃣ Creating default users with password hashes...")
        created_users = []
        
        # Admin 1
        phone1 = normalize_phone("0966320114")
        user1 = User(
            name="مدير 1",
            phone=phone1,
            password_hash=get_password_hash("admin123"),
            user_type_id=admin_type.id,
            is_active=True
        )
        db.add(user1)
        created_users.append(f"مدير 1 ({phone1})")
        print(f"   ✅ Admin 1: {phone1} / admin123")
        
        # Admin 2
        phone2 = normalize_phone("+963955773227")
        user2 = User(
            name="مدير 2",
            phone=phone2,
            password_hash=get_password_hash("khawam-p"),
            user_type_id=admin_type.id,
            is_active=True
        )
        db.add(user2)
        created_users.append(f"مدير 2 ({phone2})")
        print(f"   ✅ Admin 2: {phone2} / khawam-p")
        
        # Employees
        for i in range(1, 4):
            email = f"khawam-{i}@gmail.com"
            user = User(
                name=f"موظف {i}",
                email=email,
                password_hash=get_password_hash(f"khawam-{i}"),
                user_type_id=employee_type.id,
                is_active=True
            )
            db.add(user)
            created_users.append(f"موظف {i} ({email})")
            print(f"   ✅ Employee {i}: {email} / khawam-{i}")
        
        # Customer
        customer_user = User(
            name="عميل تجريبي",
            email="customer@gmail.com",
            password_hash=get_password_hash("963214"),
            user_type_id=customer_type.id,
            is_active=True
        )
        db.add(customer_user)
        created_users.append("عميل تجريبي (customer@gmail.com)")
        print(f"   ✅ Customer: customer@gmail.com / 963214")
        
        # Commit users
        db.commit()
        print(f"\n💾 All {len(created_users)} users created successfully!")
        
        # Verify
        all_users = db.query(User).all()
        users_without_password = [u for u in all_users if not u.password_hash]
        
        print("\n" + "=" * 70)
        print("📊 FINAL STATUS:")
        print("=" * 70)
        print(f"   Deleted orders: {orders_deleted}")
        print(f"   Deleted users: {users_deleted}")
        print(f"   Created users: {len(created_users)}")
        print(f"   Total users now: {len(all_users)}")
        print(f"   Users without password: {len(users_without_password)}")
        
        if users_without_password:
            print("\n⚠️  WARNING: Some users don't have passwords!")
        else:
            print("\n✅ SUCCESS: All users have password hashes!")
        
        print("=" * 70 + "\n")
        
        return {
            "success": True,
            "deleted_orders": orders_deleted,
            "deleted_users": users_deleted,
            "created_users": len(created_users),
            "created_user_list": created_users,
            "total_users_now": len(all_users),
            "all_users_have_passwords": len(users_without_password) == 0,
            "message": f"تم حذف {orders_deleted} طلب و {users_deleted} مستخدم وإنشاء {len(created_users)} مستخدم جديد بنجاح"
        }
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ: {str(e)}")

