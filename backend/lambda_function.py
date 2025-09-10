import os
import json
import boto3
import logging
from typing import Dict, List, Optional, Any

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize S3 client
try:
    s3 = boto3.client("s3")
    BUCKET_NAME = os.environ.get("BUCKET_NAME")
    PREFIX = os.environ.get("PREFIX", "")

    if not BUCKET_NAME:
        raise ValueError("BUCKET_NAME environment variable is required")

    logger.info(f"Initialized with BUCKET_NAME: {BUCKET_NAME}, PREFIX: {PREFIX}")
except Exception as e:
    logger.error(f"Failed to initialize: {str(e)}")
    raise

def _response(status: int, body: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Create standardized API Gateway response"""
    base_headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,OPTIONS"
    }
    
    if headers:
        base_headers.update(headers)
    
    return {
        "statusCode": status,
        "headers": base_headers,
        "body": json.dumps(body, default=str)
    }

def _list_json_keys(limit: Optional[int] = None, offset: int = 0) -> List[str]:
    """List all JSON keys in the S3 bucket with pagination support"""
    try:
        logger.info(f"Listing JSON keys with prefix: '{PREFIX}', limit: {limit}, offset: {offset}")
        keys = []
        paginator = s3.get_paginator("list_objects_v2")

        for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=PREFIX):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if key.lower().endswith(".json"):
                    keys.append(key)
                    if limit and len(keys) >= limit + offset:
                        logger.info(f"Reached limit of {limit + offset} keys")
                        return keys[offset:offset + limit] if limit else keys[offset:]

        logger.info(f"Found {len(keys)} JSON keys total")
        return keys[offset:offset + limit] if limit else keys[offset:]
    except Exception as e:
        logger.error(f"Error listing JSON keys: {str(e)}")
        raise

def _get_object_json(key: str) -> Dict[str, Any]:
    """Retrieve and parse JSON object from S3"""
    try:
        logger.info(f"Retrieving object: {key}")
        obj = s3.get_object(Bucket=BUCKET_NAME, Key=key)
        body = obj["Body"].read()

        try:
            data = json.loads(body)
            logger.info(f"Successfully parsed JSON for key: {key}")
            return data
        except json.JSONDecodeError:
            # Fallback for JSONL
            logger.info(f"JSON decode failed, trying JSONL format for key: {key}")
            lines = [json.loads(l) for l in body.splitlines() if l.strip()]
            logger.info(f"Successfully parsed JSONL with {len(lines)} lines for key: {key}")
            return {"items": lines, "format": "jsonl"}
    except Exception as e:
        logger.error(f"Error retrieving object {key}: {str(e)}")
        raise

def _get_many_objects_json(keys: List[str]) -> List[Dict[str, Any]]:
    """Retrieve multiple JSON objects from S3"""
    try:
        logger.info(f"Retrieving {len(keys)} objects")
        results = []
        for k in keys:
            try:
                data = _get_object_json(k)
                results.append({"key": k, "data": data})
            except s3.exceptions.NoSuchKey:
                logger.warning(f"Object not found: {k}")
                results.append({"key": k, "error": "NoSuchKey"})
            except Exception as e:
                logger.error(f"Error retrieving object {k}: {str(e)}")
                results.append({"key": k, "error": str(e)})
        logger.info(f"Successfully retrieved {len(results)} objects")
        return results
    except Exception as e:
        logger.error(f"Error in _get_many_objects_json: {str(e)}")
        raise

def _extract_document_data(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract and format document data for API response"""
    try:
        logger.info(f"Extracting document data from {len(items)} items")
        documents = []
        
        for item in items:
            if "error" in item:
                logger.warning(f"Skipping item with error: {item}")
                continue
                
            data = item.get("data", {})
            logger.debug(f"Processing item with key: {item.get('key', 'unknown')}, data type: {type(data)}")
            
            if isinstance(data, dict) and "format" in data and data["format"] == "jsonl":
                # Handle JSONL format
                logger.debug(f"Processing JSONL format with {len(data.get('items', []))} records")
                for record in data.get("items", []):
                    if isinstance(record, dict):
                        document = _format_document(record, item["key"])
                        documents.append(document)
                        logger.debug(f"Added document: {document.get('documentId', 'unknown')}")
            elif isinstance(data, dict) and "embedding" in data:
                # Handle single JSON object
                logger.debug(f"Processing single JSON object")
                document = _format_document(data, item["key"])
                documents.append(document)
                logger.debug(f"Added document: {document.get('documentId', 'unknown')}")
            else:
                logger.warning(f"No valid document data found in item with key: {item.get('key', 'unknown')}")
        
        logger.info(f"Extracted {len(documents)} documents")
        return documents
    except Exception as e:
        logger.error(f"Error extracting document data: {str(e)}", exc_info=True)
        raise

def _format_document(data: Dict[str, Any], key: str) -> Dict[str, Any]:
    """Format individual document for API response"""
    return {
        "documentId": data.get("documentId", ""),
        "title": data.get("title", ""),
        "content": data.get("content", ""),
        "docketId": data.get("docketId", ""),
        "agencyId": data.get("agencyId", ""),
        "documentType": data.get("documentType", ""),
        "webDocumentLink": data.get("webDocumentLink", ""),
        "webDocketLink": data.get("webDocketLink", ""),
        "webCommentLink": data.get("webCommentLink", ""),
        "embedding": data.get("embedding", []),
        "s3Key": key,
        "metadata": {
            "hasEmbedding": bool(data.get("embedding")),
            "embeddingLength": len(data.get("embedding", [])),
            "contentLength": len(data.get("content", ""))
        }
    }

def _get_total_count() -> int:
    """Get total count of JSON objects in bucket"""
    try:
        count = 0
        paginator = s3.get_paginator("list_objects_v2")
        
        for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=PREFIX):
            for obj in page.get("Contents", []):
                if obj["Key"].lower().endswith(".json"):
                    count += 1
        
        logger.info(f"Total JSON objects in bucket: {count}")
        return count
    except Exception as e:
        logger.error(f"Error getting total count: {str(e)}")
        return 0

def _validate_pagination_params(limit: Optional[int], offset: int) -> tuple[Optional[int], int]:
    """Validate and sanitize pagination parameters"""
    # Set reasonable defaults and limits
    if limit is not None:
        if limit <= 0:
            limit = 10
        elif limit > 1000:  # Prevent excessive memory usage
            limit = 1000
    
    if offset < 0:
        offset = 0
    
    return limit, offset

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler function"""
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Handle CORS preflight
        if event.get("httpMethod") == "OPTIONS":
            return _response(200, {"message": "CORS preflight successful"})
        
        params = event.get("queryStringParameters") or {}
        logger.info(f"Query parameters: {params}")

        # Parse pagination parameters
        limit = None
        offset = 0
        
        if "limit" in params:
            try:
                limit = int(params["limit"])
            except ValueError:
                logger.warning(f"Invalid limit parameter: {params['limit']}")
        
        if "offset" in params:
            try:
                offset = int(params["offset"])
            except ValueError:
                logger.warning(f"Invalid offset parameter: {params['offset']}")
        
        # Validate pagination parameters
        limit, offset = _validate_pagination_params(limit, offset)
        
        # Get total count for pagination metadata
        total_count = _get_total_count()
        
        try:
            logger.info("Fetching documents from S3")
            keys = _list_json_keys(limit=limit, offset=offset)
            logger.info(f"Found {len(keys)} keys to process")
            
            if not keys:
                logger.info("No keys found, returning empty response")
                return _response(200, {
                    "success": True,
                    "data": {
                        "documents": [],
                        "pagination": {
                            "limit": limit,
                            "offset": offset,
                            "total": total_count,
                            "has_more": False,
                            "current_page_size": 0
                        }
                    },
                    "message": "No documents found"
                })
            
            logger.info(f"Fetching data for {len(keys)} keys")
            items = _get_many_objects_json(keys)
            logger.info(f"Retrieved {len(items)} items from S3")
            
            logger.info("Extracting document data")
            documents = _extract_document_data(items)
            logger.info(f"Extracted {len(documents)} documents")
            
            # Calculate pagination metadata
            has_more = (offset + len(documents)) < total_count if total_count > 0 else False
            
            response_data = {
                "success": True,
                "data": {
                    "documents": documents,
                    "pagination": {
                        "limit": limit,
                        "offset": offset,
                        "total": total_count,
                        "has_more": has_more,
                        "current_page_size": len(documents)
                    }
                },
                "message": f"Successfully retrieved {len(documents)} documents"
            }
            
            logger.info(f"Returning response with {len(documents)} documents")
            return _response(200, response_data)
            
        except Exception as e:
            logger.error(f"Error fetching documents: {str(e)}", exc_info=True)
            return _response(500, {
                "success": False,
                "error": f"Internal server error: {str(e)}",
                "message": "Failed to retrieve documents from S3"
            })

    except Exception as e:
        logger.error(f"Unexpected error in handler: {str(e)}", exc_info=True)
        return _response(500, {
            "success": False,
            "error": f"Internal server error: {str(e)}",
            "message": "An unexpected error occurred"
        })

# Optional wrapper for different runtime expectations
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Alternative entry point for Lambda runtime"""
    return handler(event, context)
