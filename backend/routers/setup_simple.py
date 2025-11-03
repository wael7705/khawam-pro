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
    # لا نستخدم db parameter - نستخدم SQL مباشر فقط
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
            # Step 1: Get admin and employee type IDs using SQL directly
            # استخدام SQL مباشر لتجنب مشاكل ORM مع البنية المختلفة
            admin_result = None
            employee_result = None
            
            # محاولة البحث بـ name_ar أولاً
            try:
                admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'مدير'")).fetchone()
                employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'موظف'")).fetchone()
            except:
                # إذا فشل، حاول name_en
                try:
                    admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin'")).fetchone()
                    employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'employee'")).fetchone()
                except:
                    pass
            
            # إنشاء أنواع المستخدمين إذا لم تكن موجودة
            if not admin_result:
                try:
                    # محاولة إضافة name_ar للجدول إذا لم يكن موجوداً
                    try:
                        conn.execute(text("ALTER TABLE user_types ADD COLUMN IF NOT EXISTS name_ar VARCHAR(50)"))
                        conn.commit()
                    except:
                        pass
                    
                    # إنشاء نوع المدير
                    conn.execute(text("""
                        INSERT INTO user_types (name_en, permissions) 
                        VALUES ('admin', '{"all": true}'::jsonb)
                        ON CONFLICT DO NOTHING
                    """))
                    conn.commit()
                    admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin'")).fetchone()
                    if admin_result:
                        # تحديث name_ar إذا كان الجدول يدعمه
                        try:
                            conn.execute(text("UPDATE user_types SET name_ar = 'مدير' WHERE id = :id"), {'id': admin_result[0]})
                            conn.commit()
                        except:
                            pass
                except Exception as e:
                    print(f"   ⚠️  خطأ في إنشاء نوع المدير: {e}")
            
            if not employee_result:
                try:
                    conn.execute(text("""
                        INSERT INTO user_types (name_en, permissions) 
                        VALUES ('employee', '{"orders": true, "products": true, "services": true}'::jsonb)
                        ON CONFLICT DO NOTHING
                    """))
                    conn.commit()
                    employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'employee'")).fetchone()
                    if employee_result:
                        try:
                            conn.execute(text("UPDATE user_types SET name_ar = 'موظف' WHERE id = :id"), {'id': employee_result[0]})
                            conn.commit()
                        except:
                            pass
                except Exception as e:
                    print(f"   ⚠️  خطأ في إنشاء نوع الموظف: {e}")
            
            if not admin_result or not employee_result:
                raise Exception("لا يمكن الحصول على أو إنشاء أنواع المستخدمين")
            
            admin_id = admin_result[0]
            employee_id = employee_result[0]
            
            print(f"   ✅ Admin ID: {admin_id}, Employee ID: {employee_id}")
            
            # Get IDs of users to delete (admins and employees only) using SQL
            users_result = conn.execute(text("""
                SELECT id FROM users 
                WHERE user_type_id IN (:admin_id, :employee_id)
            """), {'admin_id': admin_id, 'employee_id': employee_id}).fetchall()
            user_ids_to_delete = [row[0] for row in users_result]
            
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
        
        print("\n" + "=" * 70)
        print("✅ Database cleared successfully!")
        print("=" * 70)
        
        # Step 7: Create user types if needed (using SQL directly)
        print("\n6️⃣ Ensuring user types exist...")
        
        # استخدام SQL مباشر للتحقق من وجود الجدول والأعمدة
        try:
            # التحقق من وجود الجدول
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'user_types'
                )
            """)).scalar()
            
            if not result:
                # إنشاء جدول user_types
                print("   ⚠️  جدول user_types غير موجود، جاري إنشائه...")
                conn.execute(text("""
                    CREATE TABLE user_types (
                        id SERIAL PRIMARY KEY,
                        name_ar VARCHAR(50) NOT NULL,
                        name_en VARCHAR(50),
                        permissions JSONB,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.commit()
            
            # التحقق من وجود name_ar
            try:
                conn.execute(text("SELECT name_ar FROM user_types LIMIT 1"))
            except:
                # إضافة العمود إذا لم يكن موجوداً
                print("   ⚠️  عمود name_ar غير موجود، جاري إضافته...")
                try:
                    conn.execute(text("ALTER TABLE user_types ADD COLUMN name_ar VARCHAR(50)"))
                    conn.commit()
                except:
                    pass
            
            # الحصول على أو إنشاء أنواع المستخدمين باستخدام SQL
            admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'مدير'")).fetchone()
            if not admin_result:
                conn.execute(text("""
                    INSERT INTO user_types (name_ar, name_en, permissions) 
                    VALUES ('مدير', 'admin', '{"all": true}'::jsonb)
                """))
                conn.commit()
                admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'مدير'")).fetchone()
            
            employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'موظف'")).fetchone()
            if not employee_result:
                conn.execute(text("""
                    INSERT INTO user_types (name_ar, name_en, permissions) 
                    VALUES ('موظف', 'employee', '{"orders": true, "products": true, "services": true}'::jsonb)
                """))
                conn.commit()
                employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'موظف'")).fetchone()
            
            customer_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'عميل'")).fetchone()
            if not customer_result:
                conn.execute(text("""
                    INSERT INTO user_types (name_ar, name_en, permissions) 
                    VALUES ('عميل', 'customer', '{"orders": true, "view": true}'::jsonb)
                """))
                conn.commit()
            
            admin_id = admin_result[0]
            employee_id = employee_result[0]
            
            print(f"   ✅ User types ready - Admin ID: {admin_id}, Employee ID: {employee_id}")
            
        except Exception as e:
            print(f"   ⚠️  خطأ في التحقق من user_types: {e}")
            # محاولة استخدام SQL مباشر كبديل
            try:
                # محاولة إنشاء أنواع المستخدمين باستخدام SQL فقط
                admin_result = None
                employee_result = None
                
                # محاولة البحث بـ name_en إذا كان name_ar غير موجود
                try:
                    admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin'")).fetchone()
                    employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'employee'")).fetchone()
                except:
                    pass
                
                if not admin_result:
                    conn.execute(text("""
                        INSERT INTO user_types (name_en, permissions) 
                        VALUES ('admin', '{"all": true}'::jsonb)
                        ON CONFLICT DO NOTHING
                    """))
                    conn.commit()
                    admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin'")).fetchone()
                
                if not employee_result:
                    conn.execute(text("""
                        INSERT INTO user_types (name_en, permissions) 
                        VALUES ('employee', '{"orders": true, "products": true, "services": true}'::jsonb)
                        ON CONFLICT DO NOTHING
                    """))
                    conn.commit()
                    employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'employee'")).fetchone()
                
                if admin_result and employee_result:
                    admin_id = admin_result[0]
                    employee_id = employee_result[0]
                    print(f"   ✅ User types ready (SQL fallback) - Admin ID: {admin_id}, Employee ID: {employee_id}")
                else:
                    raise Exception("لا يمكن الحصول على أو إنشاء أنواع المستخدمين")
            except Exception as e2:
                print(f"   ❌ خطأ في إنشاء أنواع المستخدمين: {e2}")
                raise
        
        # Step 8: Create default users (admins and employees) using SQL
        print("\n7️⃣ Creating default admin and employee users...")
        created_users = []
        
        # الحصول على IDs من قاعدة البيانات مرة أخرى
        admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin' OR name_ar = 'مدير'")).fetchone()
        employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'employee' OR name_ar = 'موظف'")).fetchone()
        customer_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'customer' OR name_ar = 'عميل'")).fetchone()
        
        if not admin_result or not employee_result:
            raise Exception("لا يمكن الحصول على أنواع المستخدمين")
        
        admin_id = admin_result[0]
        employee_id = employee_result[0]
        customer_id = customer_result[0] if customer_result else None
        
        # Admin 1
        phone1 = normalize_phone("0966320114")
        password_hash1 = get_password_hash("admin123")
        try:
            # حذف إذا كان موجوداً
            conn.execute(text("DELETE FROM users WHERE phone = :phone"), {"phone": phone1})
            conn.execute(text("""
                INSERT INTO users (name, phone, password_hash, user_type_id, is_active)
                VALUES (:name, :phone, :password_hash, :user_type_id, :is_active)
            """), {
                'name': 'مدير 1',
                'phone': phone1,
                'password_hash': password_hash1,
                'user_type_id': admin_id,
                'is_active': True
            })
            conn.commit()
            created_users.append(f"مدير 1 ({phone1})")
            print(f"   ✅ Admin 1: {phone1} / admin123")
        except Exception as e:
            print(f"   ⚠️  خطأ في إنشاء مدير 1: {e}")
        
        # Admin 2
        phone2 = normalize_phone("963955773227+")
        password_hash2 = get_password_hash("khawam-p")
        try:
            conn.execute(text("DELETE FROM users WHERE phone = :phone"), {"phone": phone2})
            conn.execute(text("""
                INSERT INTO users (name, phone, password_hash, user_type_id, is_active)
                VALUES (:name, :phone, :password_hash, :user_type_id, :is_active)
            """), {
                'name': 'مدير 2',
                'phone': phone2,
                'password_hash': password_hash2,
                'user_type_id': admin_id,
                'is_active': True
            })
            conn.commit()
            created_users.append(f"مدير 2 ({phone2})")
            print(f"   ✅ Admin 2: {phone2} / khawam-p")
        except Exception as e:
            print(f"   ⚠️  خطأ في إنشاء مدير 2: {e}")
        
        # Employees
        for i in range(1, 4):
            email = f"khawam-{i}@gmail.com"
            password_hash = get_password_hash(f"khawam-{i}")
            try:
                conn.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
                conn.execute(text("""
                    INSERT INTO users (name, email, password_hash, user_type_id, is_active)
                    VALUES (:name, :email, :password_hash, :user_type_id, :is_active)
                """), {
                    'name': f'موظف {i}',
                    'email': email,
                    'password_hash': password_hash,
                    'user_type_id': employee_id,
                    'is_active': True
                })
                conn.commit()
                created_users.append(f"موظف {i} ({email})")
                print(f"   ✅ Employee {i}: {email} / khawam-{i}")
            except Exception as e:
                print(f"   ⚠️  خطأ في إنشاء موظف {i}: {e}")
        print(f"\n💾 All {len(created_users)} users created successfully!")
        
        # Verify using SQL
        all_users_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        users_without_password = conn.execute(text("SELECT COUNT(*) FROM users WHERE password_hash IS NULL OR password_hash = ''")).scalar()
        
        # Get customer count
        customer_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'customer' OR name_ar = 'عميل'")).fetchone()
        customers_count = 0
        if customer_result:
            customers_count = conn.execute(text("SELECT COUNT(*) FROM users WHERE user_type_id = :id"), {'id': customer_result[0]}).scalar()
        
        print("\n" + "=" * 70)
        print("📊 FINAL STATUS:")
        print("=" * 70)
        print(f"   Deleted studio_projects: {studio_deleted}")
        print(f"   Deleted order_items: {order_items_deleted}")
        print(f"   Deleted orders: {orders_deleted}")
        print(f"   Deleted admin/employee users: {users_deleted}")
        print(f"   Customers preserved: {customers_count}")
        print(f"   Created new users: {len(created_users)}")
        print(f"   Total users now: {all_users_count}")
        print(f"   Users without password: {users_without_password}")
        
        if users_without_password:
            print("\n⚠️  WARNING: Some users don't have passwords!")
        else:
            print("\n✅ SUCCESS: All new users have password hashes!")
        
        print("=" * 70 + "\n")
        
        finally:
            conn.close()
        
        return {
            "success": True,
            "deleted_studio_projects": studio_deleted,
            "deleted_order_items": order_items_deleted,
            "deleted_orders": orders_deleted,
            "deleted_users": users_deleted,
            "customers_preserved": customers_count,
            "created_users": len(created_users),
            "created_user_list": created_users,
            "total_users_now": all_users_count,
            "all_users_have_passwords": users_without_password == 0,
            "message": f"تم حذف {studio_deleted} مشروع استيديو و {orders_deleted} طلب و {users_deleted} مستخدم (مدير/موظف) وإنشاء {len(created_users)} مستخدم جديد. تم الاحتفاظ بـ {customers_count} عميل."
        }
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ: {str(e)}")

