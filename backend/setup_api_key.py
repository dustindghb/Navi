"""
Setup script for regulations.gov API key
This script helps configure the API key for the regulatory comment analysis system
"""

import json
import os
import sys
from local_storage_reader import LocalStorageReader

def setup_api_key():
    """
    Interactive setup for the regulations.gov API key
    """
    print("=== Regulations.gov API Key Setup ===\n")
    
    print("This script will help you configure the API key for regulatory comment analysis.")
    print("You can get a free API key from: https://api.regulations.gov/\n")
    
    # Check if API key is already configured
    reader = LocalStorageReader()
    existing_key = reader.get_regulations_api_key()
    
    if existing_key:
        print(f"✅ API key is already configured: {existing_key[:10]}...")
        response = input("Do you want to update it? (y/n): ").lower().strip()
        if response != 'y':
            print("API key setup cancelled.")
            return
        print()
    
    # Get API key from user
    print("Please enter your regulations.gov API key:")
    api_key = input("API Key: ").strip()
    
    if not api_key:
        print("❌ No API key provided. Setup cancelled.")
        return
    
    # Validate API key format (basic check)
    if len(api_key) < 10:
        print("❌ API key seems too short. Please check and try again.")
        return
    
    # Save the API key
    config_data = {"apiKey": api_key}
    
    if reader.save_config("regulations_api", config_data):
        print("✅ API key saved successfully!")
        print(f"   Key: {api_key[:10]}...")
        print("   Location: regulations_api_config.json")
    else:
        print("❌ Failed to save API key. Please check permissions.")
        return
    
    # Test the API key
    print("\n🔍 Testing API key...")
    try:
        from regulations_gov_api import RegulationsGovAPI
        api = RegulationsGovAPI()
        result = api.test_api_connection()
        print(f"✅ API key test successful: {result}")
    except Exception as e:
        print(f"❌ API key test failed: {e}")
        print("Please check your API key and try again.")
        return
    
    print("\n🎉 Setup complete! The regulatory comment analysis system is ready to use.")
    print("\nNext steps:")
    print("1. The API key is now configured and ready for GPT-OSS:20b integration")
    print("2. You can test the system by running: python example_integration.py")
    print("3. The 'See More' button in your app will now work with AI analysis")

def check_setup():
    """
    Check if the API key is properly configured
    """
    print("=== Checking API Key Configuration ===\n")
    
    reader = LocalStorageReader()
    api_key = reader.get_regulations_api_key()
    
    if api_key:
        print(f"✅ API key found: {api_key[:10]}...")
        
        # Test the API key
        try:
            from regulations_gov_api import RegulationsGovAPI
            api = RegulationsGovAPI()
            result = api.test_api_connection()
            print(f"✅ API key test successful: {result}")
            return True
        except Exception as e:
            print(f"❌ API key test failed: {e}")
            return False
    else:
        print("❌ No API key found")
        print("\nTo set up the API key:")
        print("1. Get a free API key from https://api.regulations.gov/")
        print("2. Run this script with: python setup_api_key.py")
        return False

def main():
    """
    Main function to handle command line arguments
    """
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "check":
            check_setup()
        elif command == "setup":
            setup_api_key()
        else:
            print("Usage: python setup_api_key.py [check|setup]")
            print("  check  - Check if API key is configured")
            print("  setup  - Set up API key interactively")
    else:
        # Default: check setup
        if not check_setup():
            print("\nWould you like to set up the API key now? (y/n): ", end="")
            response = input().lower().strip()
            if response == 'y':
                setup_api_key()

if __name__ == "__main__":
    main()
