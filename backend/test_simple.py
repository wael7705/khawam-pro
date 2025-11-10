#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple test script for login and registration
"""
import requests
import json
import os
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

BASE_URL = os.getenv("API_BASE_URL", "https://khawam-pro-production.up.railway.app/api")

def test_login(username, password):
    """Test login"""
    print(f"\nTesting login with: {username}")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"username": username, "password": password},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            print(f"SUCCESS: Logged in as {user.get('name')} ({user.get('phone')})")
            print(f"User type: {user.get('user_type', {}).get('name_ar')}")
            return data.get("access_token")
        else:
            error = response.json().get("detail", response.text)
            print(f"FAILED: {error}")
            return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None

def test_register(name, phone, email, password):
    """Test registration"""
    print(f"\nTesting registration: {name} ({phone})")
    try:
        data = {
            "name": name,
            "phone": phone,
            "password": password
        }
        if email:
            data["email"] = email
        
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=data,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            user = result.get("user", {})
            print(f"SUCCESS: Created user {user.get('name')} ({user.get('phone')})")
            return True
        else:
            error = response.json().get("detail", response.text)
            print(f"FAILED: {error}")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_get_orders(token):
    """Test getting orders"""
    print(f"\nTesting get orders")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/orders/",
            headers=headers,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            orders = data.get("orders", [])
            print(f"SUCCESS: Found {len(orders)} orders")
            return orders
        else:
            error = response.json().get("detail", response.text)
            print(f"FAILED: {error}")
            return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None

if __name__ == "__main__":
    print("=" * 70)
    print("Login and Registration Tests")
    print("=" * 70)
    print(f"Base URL: {BASE_URL}")
    
    # Test 1: Login with specified account
    print("\n" + "=" * 70)
    print("Test 1: Login with 0966320114 / admin123")
    print("=" * 70)
    token = test_login("0966320114", "admin123")
    
    if token:
        # Test getting orders
        print("\n" + "=" * 70)
        print("Test: Get orders after login")
        print("=" * 70)
        orders = test_get_orders(token)
        
        # Test login with different phone formats
        print("\n" + "=" * 70)
        print("Test: Login with different phone formats")
        print("=" * 70)
        for phone in ["0966320114", "963966320114", "+963966320114"]:
            test_login(phone, "admin123")
    else:
        print("\nWARNING: Login failed. User may not exist or password is incorrect.")
    
    # Test 2: Register new account
    print("\n" + "=" * 70)
    print("Test 2: Register new account")
    print("=" * 70)
    import random
    test_phone = f"09{random.randint(10000000, 99999999)}"
    test_email = f"test_{random.randint(1000, 9999)}@example.com"
    
    if test_register("Test User", test_phone, test_email, "test123456"):
        # Try to login with new account
        print("\n" + "=" * 70)
        print("Test: Login with new account")
        print("=" * 70)
        test_login(test_phone, "test123456")
    
    print("\n" + "=" * 70)
    print("Tests completed")
    print("=" * 70)

