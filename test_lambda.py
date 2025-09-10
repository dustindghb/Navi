#!/usr/bin/env python3
"""
Test script to debug Lambda function and API Gateway
"""
import requests
import json
import sys

def test_endpoints():
    base_url = "https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod"
    
    # Test different endpoint variations
    test_urls = [
        f"{base_url}",
        f"{base_url}/",
        f"{base_url}?limit=1&offset=0",
        f"{base_url}/?limit=1&offset=0",
        f"{base_url}/documents",
        f"{base_url}/documents?limit=1&offset=0",
    ]
    
    print("🔍 Testing API Gateway endpoints...")
    print("=" * 60)
    
    for i, url in enumerate(test_urls, 1):
        print(f"\n{i}. Testing: {url}")
        try:
            response = requests.get(url, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   ✅ SUCCESS! Response: {json.dumps(data, indent=2)[:200]}...")
                    return url  # Return the working URL
                except json.JSONDecodeError:
                    print(f"   Response (not JSON): {response.text[:200]}...")
            else:
                print(f"   ❌ Error: {response.text[:200]}...")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Request failed: {e}")
    
    return None

def test_lambda_direct():
    """Test if we can call the Lambda function directly (if you have AWS CLI configured)"""
    print("\n🔧 Testing Lambda function directly...")
    print("=" * 60)
    
    # This would require AWS CLI to be configured
    import subprocess
    
    try:
        # Test if AWS CLI is available
        result = subprocess.run(['aws', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ AWS CLI available: {result.stdout.strip()}")
            
            # Try to invoke the Lambda function directly
            print("\nTrying to invoke Lambda function directly...")
            # You'll need to replace 'your-function-name' with your actual function name
            lambda_result = subprocess.run([
                'aws', 'lambda', 'invoke',
                '--function-name', 'your-function-name',  # Replace with actual function name
                '--payload', '{"httpMethod": "GET", "queryStringParameters": {"limit": "1", "offset": "0"}}',
                'response.json'
            ], capture_output=True, text=True)
            
            if lambda_result.returncode == 0:
                print("✅ Lambda function invoked successfully")
                try:
                    with open('response.json', 'r') as f:
                        response_data = json.load(f)
                    print(f"Response: {json.dumps(response_data, indent=2)}")
                except Exception as e:
                    print(f"Error reading response: {e}")
            else:
                print(f"❌ Lambda invocation failed: {lambda_result.stderr}")
        else:
            print("❌ AWS CLI not available")
            
    except FileNotFoundError:
        print("❌ AWS CLI not installed")
    except Exception as e:
        print(f"❌ Error testing Lambda: {e}")

def main():
    print("🚀 Lambda Function Debug Tool")
    print("=" * 60)
    
    # Test API Gateway endpoints
    working_url = test_endpoints()
    
    if working_url:
        print(f"\n✅ Found working endpoint: {working_url}")
        print("\n📝 Update your Settings.tsx with this URL:")
        print(f"   const baseUrl = '{working_url.split('?')[0]}';")
    else:
        print("\n❌ No working endpoints found")
        print("\n🔧 Possible issues:")
        print("   1. Lambda function not deployed")
        print("   2. API Gateway not configured")
        print("   3. Wrong endpoint URL")
        print("   4. Lambda function has errors")
        
        # Test Lambda directly
        test_lambda_direct()

if __name__ == "__main__":
    main()
