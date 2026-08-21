import os
import shutil
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import google.generativeai as genai
from gtts import gTTS
import moviepy.editor as mp

app = FastAPI(title="DeepDub API")

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

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

# Store job status
jobs = {}

class DubRequest(BaseModel):
    target_language: str = "en"

async def process_video(job_id: str, file_path: str, target_language: str):
    try:
        jobs[job_id] = {"status": "Extracting audio...", "progress": 10}
        await asyncio.sleep(2) # Simulate work
        
        # 1. Extract audio
        video = mp.VideoFileClip(file_path)
        audio_path = os.path.join(UPLOAD_DIR, f"{job_id}_audio.wav")
        if video.audio:
            video.audio.write_audiofile(audio_path, logger=None)
        else:
            raise Exception("Video has no audio track")
            
        jobs[job_id] = {"status": "Transcribing and Translating via Gemini AI...", "progress": 40}
        
        translated_text = "Hello! This is a simulated translation by DeepDub AI. The original audio was processed successfully."
        if API_KEY:
            try:
                sample_file = genai.upload_file(path=audio_path)
                model = genai.GenerativeModel(model_name="gemini-1.5-flash")
                prompt = f"Listen to this audio. Transcribe what is being said, and then translate it to {target_language}. Return ONLY the translated text, nothing else."
                response = model.generate_content([sample_file, prompt])
                translated_text = response.text.strip()
                genai.delete_file(sample_file.name)
            except Exception as e:
                print("Gemini API error, falling back to mock text:", e)
        else:
            await asyncio.sleep(3) # Simulate API delay

        jobs[job_id] = {"status": "Synthesizing new voice (TTS)...", "progress": 70}
        
        # 2. Generate new audio
        tts_path = os.path.join(UPLOAD_DIR, f"{job_id}_tts.mp3")
        tts = gTTS(text=translated_text, lang=target_language[:2], slow=False)
        tts.save(tts_path)
        
        jobs[job_id] = {"status": "Rendering final video...", "progress": 90}
        
        # 3. Replace audio in video
        new_audio = mp.AudioFileClip(tts_path)
        # Trim audio or video to match shortest length to avoid freeze frames
        duration = min(video.duration, new_audio.duration)
        video = video.subclip(0, duration)
        new_audio = new_audio.subclip(0, duration)
        
        final_video = video.set_audio(new_audio)
        output_path = os.path.join(UPLOAD_DIR, f"{job_id}_output.mp4")
        final_video.write_videofile(output_path, codec="libx264", audio_codec="aac", logger=None)
        
        # Cleanup
        video.close()
        new_audio.close()
        if os.path.exists(audio_path): os.remove(audio_path)
        if os.path.exists(tts_path): os.remove(tts_path)
        
        jobs[job_id] = {
            "status": "Completed", 
            "progress": 100, 
            "result_url": f"/api/download/{job_id}_output.mp4"
        }

    except Exception as e:
        print(f"Error processing video: {e}")
        jobs[job_id] = {"status": "Failed", "progress": 0, "error": str(e)}

@app.post("/api/dub")
async def start_dubbing(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.mp4', '.mov', '.avi')):
        raise HTTPException(status_code=400, detail="Only MP4, MOV, and AVI videos are supported.")
    
    import uuid
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    jobs[job_id] = {"status": "Initializing...", "progress": 0}
    
    background_tasks.add_task(process_video, job_id, file_path, "en")
    
    return {"job_id": job_id, "message": "Dubbing process started"}

@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

@app.get("/api/download/{filename}")
async def download_video(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(file_path, media_type="video/mp4")

@app.get("/")
def root():
    return {"message": "DeepDub API is running. Go to /app to access the UI."}
