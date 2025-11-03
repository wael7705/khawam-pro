# Fix Database - PowerShell Script
# Use DATABASE_URL from Railway Variables

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Database Fix Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get DATABASE_URL
Write-Host "1. We need DATABASE_URL from Railway..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Go to Railway Dashboard:" -ForegroundColor White
Write-Host "   -> Postgres Service -> Variables tab" -ForegroundColor White
Write-Host "   -> Copy DATABASE_URL value" -ForegroundColor White
Write-Host ""
Write-Host "   Or enter DATABASE_URL here:" -ForegroundColor Yellow
$DATABASE_URL = Read-Host "   DATABASE_URL"

if ([string]::IsNullOrWhiteSpace($DATABASE_URL)) {
    Write-Host ""
    Write-Host "Error: DATABASE_URL is required!" -ForegroundColor Red
    exit 1
}

# Fix postgres:// to postgresql://
if ($DATABASE_URL -like "postgres://*") {
    $DATABASE_URL = $DATABASE_URL -replace "postgres://", "postgresql://"
}

Write-Host ""
Write-Host "Got DATABASE_URL" -ForegroundColor Green
Write-Host ""

# Step 2: Create temporary Python script
$pythonScript = @"
import sys
import os
from sqlalchemy import create_engine, text

DATABASE_URL = "$DATABASE_URL"

print("=" * 70)
print("Starting database fix...")
print("=" * 70)

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    
    # Test connection
    with engine.connect() as test_conn:
        test_conn.execute(text("SELECT 1"))
    print("Connected to database")
    
    print("\nDeleting all related data...")
    
    # Delete in separate transactions
    with engine.connect() as conn:
        # Delete order_items
        print("\n1. Deleting order_items...")
        conn.execute(text("DELETE FROM order_items"))
        conn.commit()
        print("   Done")
        
        # Delete orders
        print("\n2. Deleting orders...")
        result = conn.execute(text("DELETE FROM orders"))
        orders_deleted = result.rowcount
        conn.commit()
        print(f"   Deleted {orders_deleted} orders")
        
        # Delete studio_projects if exists
        print("\n3. Deleting studio_projects...")
        try:
            result = conn.execute(text("DELETE FROM studio_projects"))
            studio_deleted = result.rowcount
            conn.commit()
            print(f"   Deleted {studio_deleted} studio projects")
        except Exception as e:
            conn.rollback()
            print(f"   No studio_projects table")
            studio_deleted = 0
        
        # Delete users
        print("\n4. Deleting users...")
        result = conn.execute(text("DELETE FROM users"))
        users_deleted = result.rowcount
        conn.commit()
        print(f"   Deleted {users_deleted} users")
        
        print("\nDatabase cleared successfully!")
    
    # Create new users
    print("\n" + "=" * 70)
    print("Creating new users...")
    print("=" * 70)
    
    # Import
    sys.path.insert(0, 'backend')
    from models import User, UserType
    from routers.auth import get_password_hash, normalize_phone
    from sqlalchemy.orm import sessionmaker
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create UserTypes
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
        
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        
        # Create users
        users_to_create = [
            ("مدير 1", normalize_phone("0966320114"), None, "admin123", admin_type.id),
            ("مدير 2", normalize_phone("+963955773227"), None, "khawam-p", admin_type.id),
            ("موظف 1", None, "khawam-1@gmail.com", "khawam-1", employee_type.id),
            ("موظف 2", None, "khawam-2@gmail.com", "khawam-2", employee_type.id),
            ("موظف 3", None, "khawam-3@gmail.com", "khawam-3", employee_type.id),
            ("عميل تجريبي", None, "customer@gmail.com", "963214", customer_type.id),
        ]
        
        created = 0
        for name, phone, email, password, user_type_id in users_to_create:
            user = User(
                name=name,
                phone=phone,
                email=email,
                password_hash=get_password_hash(password),
                user_type_id=user_type_id,
                is_active=True
            )
            db.add(user)
            created += 1
            identifier = phone or email
            print(f"   Created: {name} ({identifier})")
        
        db.commit()
        
        # Verify
        all_users = db.query(User).all()
        users_without_password = [u for u in all_users if not u.password_hash]
        
        print("\n" + "=" * 70)
        print("Result:")
        print(f"   Deleted {users_deleted} old users")
        print(f"   Created {created} new users")
        print(f"   Total: {len(all_users)} users")
        if len(users_without_password) == 0:
            print(f"   All users have password hashes!")
        print("=" * 70)
        print("\nDatabase fixed successfully!")
        
    finally:
        db.close()
        
except Exception as e:
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
"@

# Save temporary script
$tempScript = "temp_fix_db.py"
$pythonScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host ""
Write-Host "2. Running fix script..." -ForegroundColor Yellow
Write-Host ""

# Run script
python $tempScript
$exitCode = $LASTEXITCODE

# Delete temporary script
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "Done!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now login with:" -ForegroundColor White
    Write-Host "  - Admin 1: 0966320114 / admin123" -ForegroundColor Cyan
    Write-Host "  - Admin 2: +963955773227 / khawam-p" -ForegroundColor Cyan
    Write-Host "  - Employee 1: khawam-1@gmail.com / khawam-1" -ForegroundColor Cyan
    Write-Host "  - Employee 2: khawam-2@gmail.com / khawam-2" -ForegroundColor Cyan
    Write-Host "  - Employee 3: khawam-3@gmail.com / khawam-3" -ForegroundColor Cyan
    Write-Host "  - Customer: customer@gmail.com / 963214" -ForegroundColor Cyan
} else {
    Write-Host "Error occurred!" -ForegroundColor Red
    Write-Host "Check the error message above." -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
