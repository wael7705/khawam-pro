#!/usr/bin/env python3
"""
سكريبت اختبار للتحقق من صحة syntax جميع ملفات Python
"""
import py_compile
import sys
import os

def test_file(file_path):
    """اختبار ملف Python واحد"""
    try:
        py_compile.compile(file_path, doraise=True)
        print(f"✅ {file_path}: OK")
        return True
    except py_compile.PyCompileError as e:
        print(f"❌ {file_path}: {e}")
        return False
    except Exception as e:
        print(f"⚠️ {file_path}: {e}")
        return False

def main():
    """اختبار جميع ملفات Python المهمة"""
    files_to_test = [
        "main.py",
        "routers/orders.py",
        "routers/admin.py",
        "routers/auth.py",
        "routers/notifications.py",
        "database.py",
        "models.py",
    ]
    
    print("🧪 Testing Python syntax...")
    print("=" * 60)
    
    all_passed = True
    for file_path in files_to_test:
        if os.path.exists(file_path):
            if not test_file(file_path):
                all_passed = False
        else:
            print(f"⚠️ {file_path}: File not found")
    
    print("=" * 60)
    if all_passed:
        print("✅ All syntax checks passed!")
        return 0
    else:
        print("❌ Some syntax checks failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())

