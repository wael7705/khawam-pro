"""
Test script to verify image URLs in database and their actual existence on server.
Run: python backend/test_image_urls.py
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import requests

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "https://khawam-pro-production.up.railway.app").strip().rstrip("/")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def check_file_exists(url: str) -> tuple[bool, int]:
    """Check if a URL returns 200 OK"""
    try:
        resp = requests.head(url, timeout=10, allow_redirects=True)
        return resp.status_code == 200, resp.status_code
    except Exception as e:
        return False, 0

def test_products():
    print("\n📦 Testing Products...")
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, name_ar, image_url FROM products WHERE image_url IS NOT NULL AND image_url != ''")).fetchall()
        print(f"   Found {len(rows)} products with images")
        issues = []
        for r in rows:
            pid, name, img_url = r
            if img_url and not img_url.startswith('http'):
                img_url = f"{PUBLIC_BASE_URL}{img_url if img_url.startswith('/') else '/' + img_url}"
            if img_url.startswith('http'):
                exists, status = check_file_exists(img_url)
                if not exists:
                    issues.append((pid, name, img_url, status))
                    print(f"   ❌ Product {pid} ({name[:30]}): {img_url} → {status}")
        if not issues:
            print(f"   ✅ All {len(rows)} product images are accessible")
        return issues

def test_portfolio_works():
    print("\n🎨 Testing Portfolio Works...")
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, title_ar, image_url FROM portfolio_works WHERE image_url IS NOT NULL AND image_url != ''")).fetchall()
        print(f"   Found {len(rows)} works with images")
        issues = []
        for r in rows:
            wid, title, img_url = r
            if img_url and not img_url.startswith('http'):
                img_url = f"{PUBLIC_BASE_URL}{img_url if img_url.startswith('/') else '/' + img_url}"
            if img_url.startswith('http'):
                exists, status = check_file_exists(img_url)
                if not exists:
                    issues.append((wid, title, img_url, status))
                    print(f"   ❌ Work {wid} ({title[:30]}): {img_url} → {status}")
        if not issues:
            print(f"   ✅ All {len(rows)} work images are accessible")
        return issues

def test_images_column():
    print("\n🔍 Checking portfolio_works.images column...")
    with engine.connect() as conn:
        check = text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name='portfolio_works' AND column_name='images'
        """)
        exists = conn.execute(check).fetchone()
        if exists:
            print("   ✅ Column 'images' exists in portfolio_works")
            return True
        else:
            print("   ❌ Column 'images' does NOT exist in portfolio_works")
            print("   💡 Run: POST /api/admin/maintenance/ensure-portfolio-images-column")
            return False

if __name__ == "__main__":
    print("🧪 Testing Image URLs in Database...")
    print(f"📍 Base URL: {PUBLIC_BASE_URL}\n")
    
    # Check column existence
    has_images_col = test_images_column()
    
    # Test products
    product_issues = test_products()
    
    # Test portfolio works
    work_issues = test_portfolio_works()
    
    # Summary
    total_issues = len(product_issues) + len(work_issues)
    print(f"\n{'='*60}")
    if total_issues == 0 and has_images_col:
        print("✅ ALL TESTS PASSED - Ready for deployment!")
    else:
        print(f"❌ Found {total_issues} broken image URLs")
        if not has_images_col:
            print("   - portfolio_works.images column is missing")
        if product_issues:
            print(f"   - {len(product_issues)} product images are broken")
        if work_issues:
            print(f"   - {len(work_issues)} work images are broken")
        print("\n💡 Fix by:")
        print("   1. Upload missing images via /api/admin/upload")
        print("   2. Update image_url in database with returned URLs")
        print("   3. Run /api/admin/maintenance/ensure-portfolio-images-column")
    print(f"{'='*60}\n")

