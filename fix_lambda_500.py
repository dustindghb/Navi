#!/usr/bin/env python3
"""
Quick fix script for Lambda 500 errors
"""
import subprocess
import json
import sys

def run_command(command, description):
    """Run a command and return the result"""
    print(f"\n🔧 {description}")
    print(f"Command: {command}")
    print("-" * 40)
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Success: {result.stdout}")
            return result.stdout
        else:
            print(f"❌ Error: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def check_lambda_function():
    """Check if Lambda function exists and get its details"""
    print("🔍 Checking Lambda function...")
    
    # List all Lambda functions
    result = run_command(
        "aws lambda list-functions --query 'Functions[].{Name:FunctionName,Runtime:Runtime,LastModified:LastModified}' --output table",
        "Listing Lambda functions"
    )
    
    if result:
        print("Available Lambda functions:")
        print(result)

def check_environment_variables():
    """Check Lambda function environment variables"""
    print("\n🔍 Checking environment variables...")
    
    # You'll need to replace 'your-function-name' with your actual function name
    function_name = input("Enter your Lambda function name: ").strip()
    
    if not function_name:
        print("❌ No function name provided")
        return
    
    result = run_command(
        f"aws lambda get-function-configuration --function-name {function_name} --query 'Environment.Variables'",
        f"Getting environment variables for {function_name}"
    )
    
    if result:
        try:
            env_vars = json.loads(result)
            if env_vars:
                print("Current environment variables:")
                for key, value in env_vars.items():
                    print(f"  {key}: {value}")
            else:
                print("❌ No environment variables set")
        except json.JSONDecodeError:
            print("❌ Could not parse environment variables")

def set_environment_variables():
    """Set required environment variables"""
    print("\n🔧 Setting environment variables...")
    
    function_name = input("Enter your Lambda function name: ").strip()
    bucket_name = input("Enter your S3 bucket name: ").strip()
    prefix = input("Enter S3 prefix (optional, press Enter to skip): ").strip()
    
    if not function_name or not bucket_name:
        print("❌ Function name and bucket name are required")
        return
    
    # Build environment variables
    env_vars = f"BUCKET_NAME={bucket_name}"
    if prefix:
        env_vars += f",PREFIX={prefix}"
    
    result = run_command(
        f"aws lambda update-function-configuration --function-name {function_name} --environment Variables='{{{env_vars}}}'",
        f"Setting environment variables for {function_name}"
    )
    
    if result:
        print("✅ Environment variables set successfully")

def check_lambda_logs():
    """Check recent Lambda function logs"""
    print("\n🔍 Checking Lambda function logs...")
    
    function_name = input("Enter your Lambda function name: ").strip()
    
    if not function_name:
        print("❌ No function name provided")
        return
    
    # Get recent logs
    result = run_command(
        f"aws logs tail /aws/lambda/{function_name} --since 1h",
        f"Getting recent logs for {function_name}"
    )
    
    if result:
        print("Recent logs:")
        print(result)
    else:
        print("No recent logs found or log group doesn't exist")

def redeploy_lambda():
    """Redeploy the Lambda function"""
    print("\n🔧 Redeploying Lambda function...")
    
    function_name = input("Enter your Lambda function name: ").strip()
    
    if not function_name:
        print("❌ No function name provided")
        return
    
    # Package the function
    print("Packaging Lambda function...")
    result = run_command(
        "zip -r lambda-deployment.zip lambda_function.py",
        "Creating deployment package"
    )
    
    if not result:
        print("❌ Failed to create deployment package")
        return
    
    # Deploy the function
    result = run_command(
        f"aws lambda update-function-code --function-name {function_name} --zip-file fileb://lambda-deployment.zip",
        f"Deploying to {function_name}"
    )
    
    if result:
        print("✅ Lambda function deployed successfully")

def main():
    print("🚀 Lambda 500 Error Fix Tool")
    print("=" * 60)
    
    while True:
        print("\nChoose an option:")
        print("1. Check Lambda function")
        print("2. Check environment variables")
        print("3. Set environment variables")
        print("4. Check Lambda logs")
        print("5. Redeploy Lambda function")
        print("6. Exit")
        
        choice = input("\nEnter your choice (1-6): ").strip()
        
        if choice == "1":
            check_lambda_function()
        elif choice == "2":
            check_environment_variables()
        elif choice == "3":
            set_environment_variables()
        elif choice == "4":
            check_lambda_logs()
        elif choice == "5":
            redeploy_lambda()
        elif choice == "6":
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
