// Simplified Tauri commands for Navi
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct Persona {
    pub id: Option<i32>,
    pub name: String,
    pub role: Option<String>,
    pub interests: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Document {
    pub id: i32,
    pub document_id: String,
    pub title: String,
    pub content: String,
    pub agency_id: String,
    pub document_type: Option<String>,
    pub web_comment_link: Option<String>,
    pub web_document_link: Option<String>,
    pub posted_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Comment {
    pub id: Option<i32>,
    pub persona_id: i32,
    pub document_id: String,
    pub title: Option<String>,
    pub content: String,
    pub status: String,
}

// Simple HTTP client for API calls
async fn api_request<T>(url: &str, method: &str, body: Option<&str>) -> Result<T, String> 
where 
    T: for<'de> Deserialize<'de>
{
    let client = reqwest::Client::new();
    let mut request = match method {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PUT" => client.put(url),
        _ => return Err("Unsupported HTTP method".to_string()),
    };

    if let Some(body_data) = body {
        request = request.header("Content-Type", "application/json").body(body_data.to_string());
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    let text = response.text().await.map_err(|e| e.to_string())?;
    
    serde_json::from_str(&text).map_err(|e| e.to_string())
}

// Tauri commands
#[tauri::command]
pub async fn get_documents() -> Result<Vec<Document>, String> {
    api_request::<Vec<Document>>("http://localhost:8001/documents", "GET", None).await
}

#[tauri::command]
pub async fn get_document(document_id: String) -> Result<Document, String> {
    let url = format!("http://localhost:8001/documents/{}", document_id);
    api_request::<Document>(&url, "GET", None).await
}

#[tauri::command]
pub async fn search_documents(query: String) -> Result<HashMap<String, serde_json::Value>, String> {
    let url = format!("http://localhost:8001/documents/search?q={}", query);
    api_request::<HashMap<String, serde_json::Value>>(&url, "GET", None).await
}

#[tauri::command]
pub async fn create_persona(name: String, role: Option<String>, interests: Vec<String>) -> Result<Persona, String> {
    let persona = Persona {
        id: None,
        name,
        role,
        interests,
    };
    
    let body = serde_json::to_string(&persona).map_err(|e| e.to_string())?;
    api_request::<Persona>("http://localhost:8001/personas", "POST", Some(&body)).await
}

#[tauri::command]
pub async fn get_persona(persona_id: i32) -> Result<Persona, String> {
    let url = format!("http://localhost:8001/personas/{}", persona_id);
    api_request::<Persona>(&url, "GET", None).await
}

#[tauri::command]
pub async fn create_comment(persona_id: i32, document_id: String, title: Option<String>, content: String) -> Result<Comment, String> {
    let comment = Comment {
        id: None,
        persona_id,
        document_id,
        title,
        content,
        status: "draft".to_string(),
    };
    
    let body = serde_json::to_string(&comment).map_err(|e| e.to_string())?;
    let url = format!("http://localhost:8001/comments?persona_id={}", persona_id);
    api_request::<Comment>(&url, "POST", Some(&body)).await
}

#[tauri::command]
pub async fn get_comment(comment_id: i32) -> Result<Comment, String> {
    let url = format!("http://localhost:8001/comments/{}", comment_id);
    api_request::<Comment>(&url, "GET", None).await
}

#[tauri::command]
pub async fn check_api_health() -> Result<HashMap<String, String>, String> {
    api_request::<HashMap<String, String>>("http://localhost:8001/health", "GET", None).await
}

#[tauri::command]
pub async fn bulk_insert_documents(documents: Vec<serde_json::Value>) -> Result<HashMap<String, serde_json::Value>, String> {
    let payload = serde_json::json!({
        "documents": documents
    });
    
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    api_request::<HashMap<String, serde_json::Value>>("http://localhost:8001/documents/bulk", "POST", Some(&body)).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            get_documents,
            get_document,
            search_documents,
            create_persona,
            get_persona,
            create_comment,
            get_comment,
            check_api_health,
            bulk_insert_documents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}