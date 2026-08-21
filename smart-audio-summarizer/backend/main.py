import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import librosa
from transformers import pipeline

app = FastAPI(title="Smart Audio Summarizer API")

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

# Initialize models (loading on startup)
print("Loading Whisper Model...")
# Using tiny model for faster execution locally
transcriber = pipeline("automatic-speech-recognition", model="openai/whisper-tiny")

print("Loading Summarization Model...")
# Using distilbart for faster summarization
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
print("Models loaded successfully.")

UPLOAD_DIR = "../uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/summarize")
async def summarize_audio(file: UploadFile = File(...)):
    if not file.filename.endswith(('.mp3', '.wav', '.m4a')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload mp3, wav, or m4a.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # Save the uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Load audio file (librosa handles resampling to 16kHz for whisper)
        print(f"Processing audio: {file.filename}")
        audio, rate = librosa.load(file_path, sr=16000)
        
        # Transcribe
        print("Transcribing...")
        transcription_result = transcriber(audio, generate_kwargs={"task": "transcribe"})
        transcript = transcription_result["text"]
        
        if not transcript or len(transcript.strip()) < 10:
            return {"transcript": transcript, "summary": "Audio is too short or quiet to summarize."}
            
        # Summarize
        print("Summarizing...")
        # handle length limit
        word_count = len(transcript.split())
        max_len = min(130, max(30, int(word_count * 0.5)))
        min_len = min(30, max(10, int(word_count * 0.2)))
        
        # fallback if string is too small
        if word_count < 20:
             return {"transcript": transcript, "summary": transcript}
             
        summary_result = summarizer(transcript, max_length=max_len, min_length=min_len, do_sample=False)
        summary = summary_result[0]["summary_text"]
        
        return {
            "transcript": transcript,
            "summary": summary
        }
    except Exception as e:
        print(f"Error processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)

@app.get("/")
def root():
    return {"message": "API is running. Go to /app to access the frontend."}
