#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to create or reset password for test user 0966320114
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Database setup
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    print("Please set DATABASE_URL environment variable")
    sys.exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Password context
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    default="pbkdf2_sha256",
    pbkdf2_sha256__rounds=320000
)

def normalize_phone(phone: str) -> str:
    """Normalize phone number"""
    if not phone:
        return ""
    phone_clean = ''.join(filter(str.isdigit, phone))
    
    if phone_clean.startswith('0'):
        phone_clean = '963' + phone_clean[1:]
    elif not phone_clean.startswith('963'):
        phone_clean = '963' + phone_clean
    
    return phone_clean

def get_or_create_customer_user_type(db):
    """Get or create customer user type"""
    target_role_ar = "عميل"
    target_role_en = "customer"
    
    existing = db.execute(text("""
        SELECT id, name_ar, type_name
        FROM user_types
        WHERE lower(type_name) = :type_name OR name_ar = :name_ar
        ORDER BY id ASC
        LIMIT 1
    """), {"type_name": target_role_en, "name_ar": target_role_ar}).fetchone()
    
    if existing:
        user_type_id, existing_name_ar, existing_type_name = existing
        return user_type_id, existing_name_ar or target_role_ar
    
    insert_result = db.execute(text("""
        INSERT INTO user_types (type_name, description, permissions, created_at, name_ar)
        VALUES (:type_name, :description, NULL, NOW(), :name_ar)
        RETURNING id, name_ar
    """), {"type_name": target_role_en, "description": target_role_ar, "name_ar": target_role_ar})
    db.commit()
    new_role = insert_result.fetchone()
    return new_role[0], new_role[1] or target_role_ar

def create_or_update_user(phone: str, name: str, password: str, email: str = None):
    """Create or update user"""
    db = SessionLocal()
    try:
        normalized_phone = normalize_phone(phone)
        
        # Check if user exists
        user_row = db.execute(text("""
            SELECT id, name, phone, email
            FROM users
            WHERE phone = :phone
        """), {"phone": normalized_phone}).fetchone()
        
        # Get or create customer user type
        user_type_id, user_type_name = get_or_create_customer_user_type(db)
        
        # Hash password
        password_hash = pwd_context.hash(password)
        
        if user_row:
            # Update existing user
            user_id = user_row[0]
            print(f"Updating existing user: {user_row[1]} (ID: {user_id})")
            db.execute(text("""
                UPDATE users
                SET name = :name,
                    password_hash = :password_hash,
                    email = :email,
                    is_active = true
                WHERE id = :id
            """), {
                "name": name,
                "password_hash": password_hash,
                "email": email,
                "id": user_id
            })
            db.commit()
            print(f"SUCCESS: Updated user {name} ({normalized_phone})")
        else:
            # Create new user
            print(f"Creating new user: {name} ({normalized_phone})")
            db.execute(text("""
                INSERT INTO users (name, phone, email, password_hash, user_type_id, is_active)
                VALUES (:name, :phone, :email, :password_hash, :user_type_id, true)
            """), {
                "name": name,
                "phone": normalized_phone,
                "email": email,
                "password_hash": password_hash,
                "user_type_id": user_type_id
            })
            db.commit()
            print(f"SUCCESS: Created user {name} ({normalized_phone})")
        
        return True
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 70)
    print("Create or Update Test User")
    print("=" * 70)
    
    phone = "0966320114"
    name = "Test Admin"
    password = "admin123"
    email = "test@example.com"
    
    print(f"\nPhone: {phone}")
    print(f"Name: {name}")
    print(f"Password: {password}")
    print(f"Email: {email}")
    
    success = create_or_update_user(phone, name, password, email)
    
    if success:
        print("\n" + "=" * 70)
        print("SUCCESS: User created/updated")
        print("=" * 70)
        print(f"\nYou can now login with:")
        print(f"  Phone: {phone}")
        print(f"  Password: {password}")
    else:
        print("\n" + "=" * 70)
        print("FAILED: Could not create/update user")
        print("=" * 70)

