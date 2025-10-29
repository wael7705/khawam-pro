"""
Test script to verify portfolio endpoint works
Run: python backend/test_portfolio_endpoint.py
"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("VITE_API_URL", "https://khawam-pro-production.up.railway.app/api")

def test_portfolio_endpoints():
    print("\n" + "="*60)
    print("🧪 Testing Portfolio Endpoints")
    print("="*60 + "\n")
    
    # Test 1: Get all works
    print("1️⃣ Testing GET /portfolio/")
    try:
        response = requests.get(f"{BASE_URL}/portfolio/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Found {len(data)} works")
            if len(data) > 0:
                print(f"   📋 First work: {data[0].get('title_ar', 'N/A')}")
                for i, work in enumerate(data[:3], 1):
                    print(f"      {i}. {work.get('title_ar')} (ID: {work.get('id')})")
            else:
                print("   ⚠️  No works found in database")
        else:
            print(f"   ❌ Failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Get featured works
    print("\n2️⃣ Testing GET /portfolio/featured")
    try:
        response = requests.get(f"{BASE_URL}/portfolio/featured")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Found {len(data)} featured works")
            if len(data) > 0:
                for i, work in enumerate(data[:3], 1):
                    print(f"      {i}. {work.get('title_ar')} (ID: {work.get('id')})")
            else:
                print("   ⚠️  No featured works found")
        else:
            print(f"   ❌ Failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "="*60)
    print("✅ Testing completed!")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_portfolio_endpoints()
