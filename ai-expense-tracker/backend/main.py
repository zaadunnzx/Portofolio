import os
import shutil
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import google.generativeai as genai
from pydantic import BaseModel
from typing import List

from database import get_db, Expense

app = FastAPI(title="AI Expense Tracker API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the frontend directory
app.mount("/app", StaticFiles(directory="../frontend", html=True), name="frontend")

UPLOAD_DIR = "../uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Configure Gemini API
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
    
class ExpenseResponse(BaseModel):
    id: int
    merchant: str
    total: float
    category: str
    date: str
    
    class Config:
        orm_mode = True

@app.post("/api/upload")
async def upload_receipt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Only PNG and JPEG images are supported.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Extract data using Gemini
        if API_KEY:
            sample_file = genai.upload_file(path=file_path, display_name=file.filename)
            model = genai.GenerativeModel(model_name="gemini-1.5-flash")
            prompt = """
            Analyze this receipt image. Extract the following information and return ONLY a valid JSON object without any markdown formatting.
            - "merchant": Name of the store or merchant.
            - "total": The final total amount paid (as a float, no currency symbols).
            - "category": Categorize this expense into one of: "Food", "Transport", "Groceries", "Entertainment", "Utilities", "Other".
            Example: {"merchant": "Starbucks", "total": 15.50, "category": "Food"}
            """
            response = model.generate_content([sample_file, prompt])
            
            # Parse JSON safely
            response_text = response.text.replace('```json', '').replace('```', '').strip()
            data = json.loads(response_text)
            
            merchant = data.get("merchant", "Unknown Merchant")
            total = float(data.get("total", 0.0))
            category = data.get("category", "Other")
            
            # Clean up the file from Gemini
            genai.delete_file(sample_file.name)
        else:
            # Mock mode if no API key
            merchant = "Mock Store (No API Key)"
            total = 125.50
            category = "Groceries"

        # Save to database
        db_expense = Expense(merchant=merchant, total=total, category=category)
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        
        return {
            "message": "Receipt processed successfully",
            "data": {
                "id": db_expense.id,
                "merchant": db_expense.merchant,
                "total": db_expense.total,
                "category": db_expense.category
            }
        }
        
    except Exception as e:
        print(f"Error processing receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.get("/api/expenses")
async def get_expenses(db: Session = Depends(get_db)):
    expenses = db.query(Expense).order_by(Expense.date.desc()).all()
    return [{"id": e.id, "merchant": e.merchant, "total": e.total, "category": e.category, "date": str(e.date)} for e in expenses]

@app.get("/")
def root():
    return {"message": "AI Expense Tracker API is running. Go to /app to access the UI."}
