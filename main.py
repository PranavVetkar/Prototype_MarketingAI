import os
import json
from typing import Optional
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiofiles

from google import genai
from google.genai.errors import APIError

load_dotenv()

app = FastAPI(title="Creative Marketing AI Demo API")

DEFAULT_ADMIN_EMAIL = "admin@demo.com"
DEFAULT_ADMIN_PASSWORD = "password123"
DEFAULT_ADMIN_UID = "DEMO_UID_001"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("FATAL: GEMINI_API_KEY not found in .env file.")
    exit()
try:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"FATAL: Gemini Client initialization failed: {e}")
    exit()

class LoginRequest(BaseModel):
    email: str
    password: str

class GenerateTaskRequest(BaseModel):
    uid: str
    prompt: str
    audience: str
    image_base64: Optional[str] = None

@app.get("/", response_class=HTMLResponse)
async def index():
    """Reads index.html from the root directory and serves it."""
    try:
        async with aiofiles.open('index.html', mode='r') as f:
            content = await f.read()
        return content
    except FileNotFoundError:
        return HTMLResponse("Error: index.html not found.", status_code=500)


@app.post("/api/login")
async def api_login(data: LoginRequest):
    """Checks credentials against the hardcoded admin user."""
    if data.email == DEFAULT_ADMIN_EMAIL and data.password == DEFAULT_ADMIN_PASSWORD:
        return JSONResponse({
            "success": True, 
            "message": "Demo Login successful.", 
            "uid": DEFAULT_ADMIN_UID
        }, status_code=200)
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials. Use admin@demo.com / password123.")

@app.post("/api/register")
async def api_register():
    raise HTTPException(status_code=403, detail="Registration disabled in demo mode.")

@app.post("/api/update_password")
async def api_update_password():
    raise HTTPException(status_code=403, detail="Password update disabled in demo mode.")

@app.get("/api/tasks/{uid}")
async def api_get_tasks(uid: str):
    """Returns an empty history, as we skip the database."""
    return JSONResponse({"success": True, "tasks": []}, status_code=200)

@app.post("/api/generate_task")
async def api_generate_task(data: GenerateTaskRequest):
    if data.uid != DEFAULT_ADMIN_UID:
        raise HTTPException(status_code=403, detail="Unauthorized access.")
        
    system_instruction = (
        "You are a 'Creative Marketing AI' expert. Your task is to generate highly "
        "engaging and creative marketing content. Based on the product/service prompt "
        "and the target audience, create the following four outputs in JSON format: "
        "1. a video script (for Instagram/YouTube Shorts), "
        "2. a poster content block (a catchy headline and short body text), "
        "3. an email content body, and "
        "4. a brand tagline (short, memorable)."
    )
    user_prompt = f"Product/Service: {data.prompt}. Target Audience: {data.audience}."

    try:
        generation_config = {
            "temperature": 0.8,
            "system_instruction": system_instruction, 
            "response_mime_type": "application/json",
            "response_schema": {
                "type": "object",
                "properties": {
                    "video_script": {"type": "string", "description": "The Instagram Reel/Shorts script."},
                    "poster_content": {"type": "string", "description": "The poster headline and body content."},
                    "email_content": {"type": "string", "description": "The body content for a marketing email."},
                    "tagline": {"type": "string", "description": "The brand's catchy tagline."}
                },
                "required": ["video_script", "poster_content", "email_content", "tagline"]
            },
        }

        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[user_prompt],
            config=generation_config
        )

        marketing_outputs = json.loads(response.text)

    except APIError as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI generated invalid content structure.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

    return JSONResponse({
        "success": True,
        "message": "Task generated successfully (not saved to DB).",
        "task_id": "DEMO_TASK_" + os.urandom(4).hex(),
        "output": marketing_outputs
    }, status_code=200)

if __name__ == "__main__":
    uvicorn.run("app_basic:app", host="127.0.0.1", port=8000, reload=True)