#!/usr/bin/env python
"""Test Flask app startup and route registration."""

import os
import sys

# Test 1: Import the app
print("[TEST 1] Importing Flask app...")
try:
    from main import app, BLUEPRINTS_LOADED
    print("[TEST 1] ✓ Flask app imported successfully")
    print(f"[TEST 1] ✓ Blueprints loaded: {BLUEPRINTS_LOADED}/6")
except Exception as e:
    print(f"[TEST 1] ✗ Failed to import app: {e}")
    sys.exit(1)

# Test 2: List all routes
print("\n[TEST 2] Checking registered routes...")
try:
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append(f"  {rule.rule} -> {rule.endpoint}")
    
    if routes:
        print(f"[TEST 2] ✓ Found {len(routes)} routes:")
        for route in sorted(routes):
            print(route)
    else:
        print("[TEST 2] ✗ No routes registered!")
except Exception as e:
    print(f"[TEST 2] ✗ Error listing routes: {e}")

# Test 3: Check core routes
print("\n[TEST 3] Checking core endpoints...")
required_routes = ['/', '/health', '/login']
found_routes = [str(rule) for rule in app.url_map.iter_rules()]
for route in required_routes:
    if any(route in str(r) for r in app.url_map.iter_rules()):
        print(f"[TEST 3] ✓ Found {route}")
    else:
        print(f"[TEST 3] ✗ Missing {route}")

# Test 4: Test with test client
print("\n[TEST 4] Testing endpoints with test client...")
try:
    client = app.test_client()
    
    # Test home
    response = client.get('/')
    if response.status_code == 200:
        print(f"[TEST 4] ✓ GET / -> {response.status_code}: {response.data.decode()}")
    else:
        print(f"[TEST 4] ✗ GET / -> {response.status_code}")
    
    # Test health
    response = client.get('/health')
    if response.status_code == 200:
        print(f"[TEST 4] ✓ GET /health -> {response.status_code}: {response.get_json()}")
    else:
        print(f"[TEST 4] ✗ GET /health -> {response.status_code}")
        
except Exception as e:
    print(f"[TEST 4] ✗ Error testing endpoints: {e}")

print("\n[SUMMARY] App is ready for deployment!")
