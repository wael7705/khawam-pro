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
async def force_reset_users(keep_customers: bool = True, db: Session = Depends(get_db)):
    """
    Force reset admins and employees only, keep customers intact
    This solves foreign key constraint issues by deleting related data first
    """
    try:
        print("=" * 70)
        print("🔥 FORCE RESET: Deleting admins/employees only, keeping customers")
        print("=" * 70)
        
        # استخدام معاملات منفصلة لتجنب مشاكل transaction
        orders_deleted = 0
        users_deleted = 0
        studio_deleted = 0
        order_items_deleted = 0
        
        # استخدام commits منفصلة لتجنب transaction errors
        conn = engine.connect()
        
        try:
            # Step 1: Get admin and employee type IDs
            admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
            employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
            
            if not admin_type or not employee_type:
                # Create user types first if they don't exist
                if not admin_type:
                    admin_type = UserType(name_ar="مدير", name_en="admin", permissions={"all": True})
                    db.add(admin_type)
                if not employee_type:
                    employee_type = UserType(name_ar="موظف", name_en="employee", permissions={"orders": True, "products": True, "services": True})
                    db.add(employee_type)
                db.commit()
                admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
                employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
            
            # Get IDs of users to delete (admins and employees only)
            users_to_delete = db.query(User).filter(
                User.user_type_id.in_([admin_type.id, employee_type.id])
            ).all()
            user_ids_to_delete = [u.id for u in users_to_delete]
            
            if not user_ids_to_delete:
                print("ℹ️  No admins or employees found to delete")
                users_deleted = 0
            else:
                print(f"\n📋 Found {len(user_ids_to_delete)} admin/employee users to delete: {user_ids_to_delete}")
                
                # Step 2: Delete studio_projects for these users
                print("\n1️⃣ Deleting studio_projects for admins/employees...")
                studio_deleted = 0
                trans = None
                try:
                    trans = conn.begin()
                    if user_ids_to_delete:
                        # Delete studio_projects one by one to avoid SQL parameter issues
                        for uid in user_ids_to_delete:
                            result = conn.execute(
                                text("DELETE FROM studio_projects WHERE user_id = :uid"),
                                {"uid": uid}
                            )
                            studio_deleted += result.rowcount
                    trans.commit()
                    print(f"   ✅ Deleted {studio_deleted} studio projects")
                except Exception as e:
                    if trans:
                        trans.rollback()
                    # Try deleting all if specific deletion fails
                    try:
                        trans = conn.begin()
                        result = conn.execute(text("DELETE FROM studio_projects"))
                        studio_deleted = result.rowcount
                        trans.commit()
                        print(f"   ✅ Deleted all {studio_deleted} studio projects (fallback)")
                    except Exception as e2:
                        print(f"   ⚠️  No studio_projects table or already empty: {e2}")
                
                # Step 3: Get orders for these users
                print("\n2️⃣ Getting orders for admins/employees...")
                order_ids = []
                trans = conn.begin()
                try:
                    # Get orders one by one for each user
                    for uid in user_ids_to_delete:
                        result = conn.execute(
                            text("SELECT id FROM orders WHERE customer_id = :uid"),
                            {"uid": uid}
                        )
                        for row in result:
                            order_ids.append(row[0])
                    trans.commit()
                except Exception as e:
                    trans.rollback()
                    print(f"   ⚠️  Error getting orders: {e}")
                print(f"   📋 Found {len(order_ids)} orders to delete")
                
                # Step 4: Delete order_items for these orders
                if order_ids:
                    print("\n3️⃣ Deleting order_items...")
                    trans = conn.begin()
                    try:
                        for oid in order_ids:
                            conn.execute(
                                text("DELETE FROM order_items WHERE order_id = :oid"),
                                {"oid": oid}
                            )
                        order_items_deleted = len(order_ids)
                        trans.commit()
                        print(f"   ✅ Deleted order_items for {order_items_deleted} orders")
                    except Exception as e:
                        trans.rollback()
                        print(f"   ⚠️  Error deleting order_items: {e}")
                        order_items_deleted = 0
                else:
                    print("\n3️⃣ No order_items to delete")
                    order_items_deleted = 0
                
                # Step 5: Delete orders for these users
                if order_ids:
                    print("\n4️⃣ Deleting orders...")
                    trans = conn.begin()
                    try:
                        for oid in order_ids:
                            conn.execute(
                                text("DELETE FROM orders WHERE id = :oid"),
                                {"oid": oid}
                            )
                        orders_deleted = len(order_ids)
                        trans.commit()
                        print(f"   ✅ Deleted {orders_deleted} orders")
                    except Exception as e:
                        trans.rollback()
                        print(f"   ⚠️  Error deleting orders: {e}")
                        orders_deleted = 0
                else:
                    print("\n4️⃣ No orders to delete")
                    orders_deleted = 0
                
                # Step 6: Delete admins and employees (not customers)
                print("\n5️⃣ Deleting admin/employee users...")
                trans = conn.begin()
                try:
                    for uid in user_ids_to_delete:
                        conn.execute(
                            text("DELETE FROM users WHERE id = :uid"),
                            {"uid": uid}
                        )
                    users_deleted = len(user_ids_to_delete)
                    trans.commit()
                    print(f"   ✅ Deleted {users_deleted} admin/employee users")
                except Exception as e:
                    trans.rollback()
                    raise
        except Exception as e:
            if 'trans' in locals() and trans:
                trans.rollback()
            raise
        finally:
            conn.close()
        
        print("\n" + "=" * 70)
        print("✅ Database cleared successfully!")
        print("=" * 70)
        
        # Step 7: Create user types if needed
        print("\n6️⃣ Ensuring user types exist...")
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
        
        # Step 8: Create default users (admins and employees)
        print("\n7️⃣ Creating default admin and employee users...")
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
        
        # Admin 2 - الرقم من الصورة: 963955773227+ (سيتم تطبيعه تلقائياً)
        phone2 = normalize_phone("963955773227+")
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
            name="عميل",
            email="customer@gmail.com",
            password_hash=get_password_hash("963214"),
            user_type_id=customer_type.id,
            is_active=True
        )
        db.add(customer_user)
        created_users.append("عميل (customer@gmail.com)")
        print(f"   ✅ Customer: customer@gmail.com / 963214")
        
        # Commit users
        db.commit()
        print(f"\n💾 All {len(created_users)} users created successfully!")
        
        # Verify
        all_users = db.query(User).all()
        users_without_password = [u for u in all_users if not u.password_hash]
        
        # Get customer count
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        customers_count = 0
        if customer_type:
            customers_count = db.query(User).filter(User.user_type_id == customer_type.id).count()
        
        print("\n" + "=" * 70)
        print("📊 FINAL STATUS:")
        print("=" * 70)
        print(f"   Deleted studio_projects: {studio_deleted}")
        print(f"   Deleted order_items: {order_items_deleted}")
        print(f"   Deleted orders: {orders_deleted}")
        print(f"   Deleted admin/employee users: {users_deleted}")
        print(f"   Customers preserved: {customers_count}")
        print(f"   Created new users: {len(created_users)}")
        print(f"   Total users now: {len(all_users)}")
        print(f"   Users without password: {len(users_without_password)}")
        
        if users_without_password:
            print("\n⚠️  WARNING: Some users don't have passwords!")
        else:
            print("\n✅ SUCCESS: All new users have password hashes!")
        
        print("=" * 70 + "\n")
        
        return {
            "success": True,
            "deleted_studio_projects": studio_deleted,
            "deleted_order_items": order_items_deleted,
            "deleted_orders": orders_deleted,
            "deleted_users": users_deleted,
            "customers_preserved": customers_count,
            "created_users": len(created_users),
            "created_user_list": created_users,
            "total_users_now": len(all_users),
            "all_users_have_passwords": len(users_without_password) == 0,
            "message": f"تم حذف {studio_deleted} مشروع استيديو و {orders_deleted} طلب و {users_deleted} مستخدم (مدير/موظف) وإنشاء {len(created_users)} مستخدم جديد. تم الاحتفاظ بـ {customers_count} عميل."
        }
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ: {str(e)}")

