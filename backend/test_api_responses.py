"""
Test script to check actual API responses and image_url formats
Run: python backend/test_api_responses.py
"""
import requests
import json

BASE_URL = "https://khawam-pro-production.up.railway.app/api"

def test_products():
    print("\n📦 Testing Products API...")
    try:
        r = requests.get(f"{BASE_URL}/products/", timeout=10)
        if r.status_code == 200:
            data = r.json()
            print(f"   ✅ Got {len(data)} products")
            for i, p in enumerate(data[:3], 1):
                img = p.get('image_url', '')
                print(f"   Product {i}:")
                print(f"      - ID: {p.get('id')}")
                print(f"      - Name: {p.get('name_ar', '')[:30]}")
                print(f"      - image_url type: {type(img).__name__}")
                print(f"      - image_url starts with: {img[:50] if img else 'EMPTY'}...")
                if img:
                    if img.startswith('data:'):
                        print(f"      ✅ Base64 data URL detected")
                    elif img.startswith('http'):
                        print(f"      ✅ External URL detected")
                    else:
                        print(f"      ⚠️  Relative path or filename: {img}")
                else:
                    print(f"      ❌ Empty image_url")
            return True
        else:
            print(f"   ❌ Status {r.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_portfolio():
    print("\n🎨 Testing Portfolio API...")
    try:
        r = requests.get(f"{BASE_URL}/portfolio/", timeout=10)
        if r.status_code == 200:
            data = r.json()
            print(f"   ✅ Got {len(data)} works")
            for i, w in enumerate(data[:3], 1):
                img = w.get('image_url', '')
                print(f"   Work {i}:")
                print(f"      - ID: {w.get('id')}")
                print(f"      - Title: {w.get('title_ar', '')[:30]}")
                print(f"      - image_url type: {type(img).__name__}")
                print(f"      - image_url starts with: {img[:50] if img else 'EMPTY'}...")
                if img:
                    if img.startswith('data:'):
                        print(f"      ✅ Base64 data URL detected")
                    elif img.startswith('http'):
                        print(f"      ✅ External URL detected")
                    else:
                        print(f"      ⚠️  Relative path or filename: {img}")
                else:
                    print(f"      ❌ Empty image_url")
            return True
        else:
            print(f"   ❌ Status {r.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing API Responses for Image URLs...")
    print(f"📍 Testing: {BASE_URL}\n")
    
    products_ok = test_products()
    portfolio_ok = test_portfolio()
    
    print(f"\n{'='*60}")
    if products_ok and portfolio_ok:
        print("✅ All API endpoints responding")
        print("\n💡 Check image_url formats above")
    else:
        print("❌ Some endpoints failed")
    print(f"{'='*60}\n")

