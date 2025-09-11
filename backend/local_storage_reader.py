"""
Local Storage Reader for Tauri App
This module provides a way to read localStorage data from the Tauri frontend
"""

import json
import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class LocalStorageReader:
    """
    Reads localStorage data from the Tauri app
    This is a bridge between the Python backend and the frontend's localStorage
    """
    
    def __init__(self, app_data_dir: Optional[str] = None):
        """
        Initialize the localStorage reader
        
        Args:
            app_data_dir: Path to the Tauri app data directory
                         If None, will try to find it automatically
        """
        self.app_data_dir = app_data_dir or self._find_app_data_dir()
    
    def _find_app_data_dir(self) -> str:
        """Find the Tauri app data directory"""
        # Common Tauri app data locations
        possible_paths = [
            # macOS
            os.path.expanduser("~/Library/Application Support/com.navi.app"),
            # Windows
            os.path.expanduser("~/AppData/Roaming/com.navi.app"),
            # Linux
            os.path.expanduser("~/.local/share/com.navi.app"),
            # Development/current directory
            os.path.join(os.path.dirname(__file__), "..", "tauri-desktop", "src-tauri", "target", "debug"),
            # Alternative development path
            os.path.join(os.path.dirname(__file__), "..", "tauri-desktop")
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                logger.info(f"Found app data directory: {path}")
                return path
        
        # Fallback to current directory
        fallback_path = os.path.dirname(__file__)
        logger.warning(f"Could not find app data directory, using fallback: {fallback_path}")
        return fallback_path
    
    def get_regulations_api_key(self) -> Optional[str]:
        """
        Get the regulations.gov API key from localStorage
        This mimics localStorage.getItem('navi-regulations-api-config')
        """
        try:
            # Try to read from a localStorage dump file
            # This would be created by the frontend when the API key is saved
            config_file = os.path.join(self.app_data_dir, "regulations_api_config.json")
            
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    api_key = config.get('apiKey')
                    if api_key:
                        logger.info("Successfully loaded API key from config file")
                        return api_key
            
            # Try to read from Tauri's localStorage equivalent
            # Tauri stores localStorage data in the app's data directory
            tauri_storage_paths = [
                os.path.join(self.app_data_dir, "localStorage", "navi-regulations-api-config.json"),
                os.path.join(self.app_data_dir, "storage", "navi-regulations-api-config.json"),
                os.path.join(self.app_data_dir, "data", "navi-regulations-api-config.json"),
                # Also try the parent directory structure
                os.path.join(os.path.dirname(self.app_data_dir), "com.navi.app", "localStorage", "navi-regulations-api-config.json"),
                os.path.join(os.path.dirname(self.app_data_dir), "com.navi.app", "storage", "navi-regulations-api-config.json"),
            ]
            
            for storage_path in tauri_storage_paths:
                if os.path.exists(storage_path):
                    try:
                        with open(storage_path, 'r') as f:
                            config = json.load(f)
                            api_key = config.get('apiKey')
                            if api_key:
                                logger.info(f"Successfully loaded API key from Tauri storage: {storage_path}")
                                return api_key
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.warning(f"Could not parse config file {storage_path}: {e}")
                        continue
            
            # Try environment variable as fallback
            api_key = os.getenv('NAVI_REGULATIONS_API_KEY')
            if api_key:
                logger.info("Using API key from environment variable")
                return api_key
            
            logger.warning("No API key found in config file, Tauri storage, or environment")
            return None
            
        except Exception as e:
            logger.error(f"Error reading API key: {e}")
            return None
    
    def get_gpt_config(self) -> Dict[str, Any]:
        """
        Get GPT configuration from localStorage
        This mimics localStorage.getItem('gptHost'), localStorage.getItem('gptPort'), etc.
        """
        try:
            config_file = os.path.join(self.app_data_dir, "gpt_config.json")
            
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    return config
            
            # Return defaults if no config file
            return {
                'gptHost': '10.0.4.52',
                'gptPort': '11434',
                'gptModel': 'gpt-oss:20b'
            }
            
        except Exception as e:
            logger.error(f"Error reading GPT config: {e}")
            return {
                'gptHost': '10.0.4.52',
                'gptPort': '11434',
                'gptModel': 'gpt-oss:20b'
            }
    
    def get_embedding_config(self) -> Dict[str, Any]:
        """
        Get embedding configuration from localStorage
        """
        try:
            config_file = os.path.join(self.app_data_dir, "embedding_config.json")
            
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    return config
            
            return {}
            
        except Exception as e:
            logger.error(f"Error reading embedding config: {e}")
            return {}
    
    def save_config(self, config_type: str, config_data: Dict[str, Any]) -> bool:
        """
        Save configuration data (for testing purposes)
        In production, this would be handled by the frontend
        """
        try:
            config_file = os.path.join(self.app_data_dir, f"{config_type}_config.json")
            
            with open(config_file, 'w') as f:
                json.dump(config_data, f, indent=2)
            
            logger.info(f"Saved {config_type} config to {config_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving {config_type} config: {e}")
            return False


# Global instance for easy access
local_storage = LocalStorageReader()

def get_regulations_api_key() -> Optional[str]:
    """
    Convenience function to get the regulations.gov API key
    """
    return local_storage.get_regulations_api_key()

def get_gpt_config() -> Dict[str, Any]:
    """
    Convenience function to get GPT configuration
    """
    return local_storage.get_gpt_config()

def get_embedding_config() -> Dict[str, Any]:
    """
    Convenience function to get embedding configuration
    """
    return local_storage.get_embedding_config()


# Example usage and testing
if __name__ == "__main__":
    # Test the localStorage reader
    print("Testing LocalStorage Reader...")
    
    # Get API key
    api_key = get_regulations_api_key()
    if api_key:
        print(f"✅ API key found: {api_key[:10]}...")
    else:
        print("❌ No API key found")
        print("To set up the API key:")
        print("1. Get a regulations.gov API key from https://api.regulations.gov/")
        print("2. Save it in the frontend Settings")
        print("3. Or set the NAVI_REGULATIONS_API_KEY environment variable")
    
    # Get GPT config
    gpt_config = get_gpt_config()
    print(f"GPT Config: {gpt_config}")
    
    # Get embedding config
    embedding_config = get_embedding_config()
    print(f"Embedding Config: {embedding_config}")
