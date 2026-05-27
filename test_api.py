#!/usr/bin/env python3
"""Test script to verify the koelteplekken API endpoint"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from coolmap import create_app
    
    # Create Flask app
    app = create_app()
    
    # Test the endpoint
    with app.test_client() as client:
        # Test the new backward-compatible endpoint
        print("Testing /api/koelteplekken endpoint...")
        response = client.get('/api/koelteplekken')
        print(f"Status: {response.status_code}")
        
        data = response.get_json()
        if data and 'features' in data:
            feature_count = len(data['features'])
            print(f"✓ Success! Found {feature_count} cooling shelters")
            if feature_count > 0:
                sample = data['features'][0]
                print(f"  Sample location: {sample['properties'].get('name')}")
                coords = sample['geometry']['coordinates']
                print(f"  Coordinates: {coords}")
        else:
            print("✗ Failed: No features in response")
            
        # Test the v1 endpoint for comparison
        print("\nTesting /api/v1/geojson/koelteplekken endpoint...")
        response = client.get('/api/v1/geojson/koelteplekken')
        print(f"Status: {response.status_code}")
        
        data = response.get_json()
        if data and 'features' in data:
            feature_count = len(data['features'])
            print(f"✓ Success! Found {feature_count} cooling shelters")
        else:
            print("✗ Failed: No features in response")
            
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
