const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loading = document.getElementById('loading');
const currentLetterEl = document.getElementById('currentLetter');
const translatedTextEl = document.getElementById('translatedText');
const flashOverlay = document.getElementById('flashOverlay');

// Buttons
const addSpaceBtn = document.getElementById('addSpaceBtn');
const backspaceBtn = document.getElementById('backspaceBtn');
const speakBtn = document.getElementById('speakBtn');
const clearBtn = document.getElementById('clearBtn');

let fullText = "";
let lastDetectedLetter = "";
let letterDetectStartTime = 0;
const DETECTION_DELAY = 1500; // ms to hold a sign before it types

// Initialize SpeechSynthesis
const synth = window.speechSynthesis;

// ---------------------------------------------------------
// ASL HEURISTICS (Finger state array: [Thumb, Index, Middle, Ring, Pinky])
// 1 = Extended, 0 = Folded
// Note: This is a simplified heuristic model for a portfolio MVP.
// ---------------------------------------------------------
const ASL_DICTIONARY = {
    'A': [1, 0, 0, 0, 0], // Thumb out, others folded
    'B': [0, 1, 1, 1, 1], // Thumb folded, 4 fingers straight up
    'V': [0, 1, 1, 0, 0], // Index and Middle up (Peace)
    'W': [0, 1, 1, 1, 0], // Index, Middle, Ring up
    'L': [1, 1, 0, 0, 0], // Thumb and Index up
    'Y': [1, 0, 0, 0, 1], // Thumb and Pinky up
    'I': [0, 0, 0, 0, 1]  // Only Pinky up
};

function checkFingerStates(landmarks) {
    // MediaPipe Hand Landmarks:
    // Thumb: 1, 2, 3, 4 (4 is tip)
    // Index: 5, 6, 7, 8 (8 is tip)
    // Middle: 9, 10, 11, 12 (12 is tip)
    // Ring: 13, 14, 15, 16 (16 is tip)
    // Pinky: 17, 18, 19, 20 (20 is tip)

    const isFingerExtended = (tip, pip) => landmarks[tip].y < landmarks[pip].y;
    // Thumb is trickier (moves horizontally), we check x axis relative to palm
    const isThumbExtended = (landmarks[4].x < landmarks[3].x) ? 1 : 0; 

    return [
        isThumbExtended,
        isFingerExtended(8, 6) ? 1 : 0,
        isFingerExtended(12, 10) ? 1 : 0,
        isFingerExtended(16, 14) ? 1 : 0,
        isFingerExtended(20, 18) ? 1 : 0
    ];
}

function matchSign(states) {
    for (const [letter, expectedStates] of Object.entries(ASL_DICTIONARY)) {
        let match = true;
        for (let i = 0; i < 5; i++) {
            if (states[i] !== expectedStates[i]) {
                match = false;
                break;
            }
        }
        if (match) return letter;
    }
    return "-"; // No match
}

function onResults(results) {
    // Hide loading screen on first frame
    if (loading.style.display !== 'none') {
        loading.style.display = 'none';
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            
            // 1. Draw Hand Skeleton (Neobrutalism Style)
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#1A1A1A', lineWidth: 5});
            drawLandmarks(canvasCtx, landmarks, {color: '#C6F045', lineWidth: 2, fillColor: '#3B3BE0', radius: 5});

            // 2. Detect Sign
            const states = checkFingerStates(landmarks);
            const letter = matchSign(states);
            currentLetterEl.innerText = letter;

            // 3. Logic to 'Type' the letter if held
            if (letter !== "-") {
                if (letter === lastDetectedLetter) {
                    if (Date.now() - letterDetectStartTime > DETECTION_DELAY) {
                        typeLetter(letter);
                        letterDetectStartTime = Date.now(); // Reset timer to prevent spam
                    }
                } else {
                    lastDetectedLetter = letter;
                    letterDetectStartTime = Date.now();
                }
            } else {
                lastDetectedLetter = "";
            }
        }
    } else {
        currentLetterEl.innerText = "-";
        lastDetectedLetter = "";
    }
    canvasCtx.restore();
}

function typeLetter(letter) {
    fullText += letter;
    updateTextUI();
    
    // Flash effect
    flashOverlay.classList.remove('opacity-0');
    setTimeout(() => {
        flashOverlay.classList.add('opacity-0');
    }, 150);
}

function updateTextUI() {
    translatedTextEl.innerText = fullText;
}

// MediaPipe Setup
const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});
hands.setOptions({
  maxNumHands: 1, // Focus on 1 hand for clearer detection
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
hands.onResults(onResults);

// Setup Camera
const camera = new Camera(videoElement, {
  onFrame: async () => {
    // Resize canvas to match video stream
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    await hands.send({image: videoElement});
  },
  width: 640,
  height: 480
});
camera.start();

// UI Controls
addSpaceBtn.addEventListener('click', () => {
    fullText += " ";
    updateTextUI();
});

backspaceBtn.addEventListener('click', () => {
    fullText = fullText.slice(0, -1);
    updateTextUI();
});

clearBtn.addEventListener('click', () => {
    fullText = "";
    updateTextUI();
});

// Text-to-Speech
speakBtn.addEventListener('click', () => {
    if (fullText.trim() === "") return;
    
    // Animate button
    speakBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SPEAKING...';
    
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'en-US';
    
    utterance.onend = () => {
        speakBtn.innerHTML = '<i class="fas fa-bullhorn"></i> SPEAK NOW';
    };
    
    synth.speak(utterance);
});
