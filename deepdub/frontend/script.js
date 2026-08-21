const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const processBtn = document.getElementById('processBtn');
const langSelect = document.getElementById('langSelect');
const terminal = document.getElementById('terminal');

const originalVideo = document.getElementById('originalVideo');
const originalPlaceholder = document.getElementById('originalPlaceholder');
const processedVideo = document.getElementById('processedVideo');
const processedPlaceholder = document.getElementById('processedPlaceholder');
const processingOverlay = document.getElementById('processingOverlay');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const actionBar = document.getElementById('actionBar');
const actionPlaceholder = document.getElementById('actionPlaceholder');
const downloadBtn = document.getElementById('downloadBtn');

let selectedFile = null;
let pollInterval = null;

function logTerminal(message, type = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    const div = document.createElement('div');
    
    let colorClass = 'text-white/80';
    if (type === 'success') colorClass = 'text-brandLime';
    if (type === 'error') colorClass = 'text-red-500';
    if (type === 'action') colorClass = 'text-brandBlue';
    if (type === 'warning') colorClass = 'text-yellow-400';

    div.innerHTML = `<span class="text-gray-500">[${time}]</span> <span class="${colorClass}">${message}</span>`;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
}

// Drag and drop handlers
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-brandBlue/30', 'bg-cream');
    dropzone.classList.add('border-brandBlue', 'bg-brandBlue/10');
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-brandBlue/30', 'bg-cream');
    dropzone.classList.remove('border-brandBlue', 'bg-brandBlue/10');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-brandBlue/30', 'bg-cream');
    dropzone.classList.remove('border-brandBlue', 'bg-brandBlue/10');
    if (e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
    }
});

function handleFileSelection(file) {
    if (!file.type.startsWith('video/')) {
        logTerminal('ERROR: Invalid format. Please upload a video file.', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        logTerminal('ERROR: File size exceeds 50MB limit.', 'error');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    
    dropzone.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    fileInfo.classList.add('flex');
    
    // Enable Process Button
    processBtn.disabled = false;
    processBtn.classList.remove('bg-white/20', 'text-white/50', 'cursor-not-allowed');
    processBtn.classList.add('bg-brandLime', 'text-textDark', 'shadow-[4px_4px_0_#3B3BE0]', 'hover:bg-brandBlue', 'hover:text-white', 'active:translate-y-1', 'active:translate-x-1', 'active:shadow-[0_0_0_#3B3BE0]', 'cursor-pointer');

    // Show preview
    const fileURL = URL.createObjectURL(file);
    originalVideo.src = fileURL;
    originalVideo.classList.remove('hidden');
    originalPlaceholder.classList.add('hidden');
    
    logTerminal(`Video loaded: ${file.name} (${(file.size / (1024*1024)).toFixed(2)} MB)`, 'action');
}

removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    
    fileInfo.classList.add('hidden');
    fileInfo.classList.remove('flex');
    dropzone.classList.remove('hidden');
    
    // Disable Process Button
    processBtn.disabled = true;
    processBtn.classList.add('bg-white/20', 'text-white/50', 'cursor-not-allowed');
    processBtn.classList.remove('bg-brandLime', 'text-textDark', 'shadow-[4px_4px_0_#3B3BE0]', 'hover:bg-brandBlue', 'hover:text-white', 'active:translate-y-1', 'active:translate-x-1', 'active:shadow-[0_0_0_#3B3BE0]', 'cursor-pointer');
    
    originalVideo.src = '';
    originalVideo.classList.add('hidden');
    originalPlaceholder.classList.remove('hidden');
    
    logTerminal('Media removed from buffer.', 'warning');
});

processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const targetLang = langSelect.value;
    const langName = langSelect.options[langSelect.selectedIndex].text;
    
    logTerminal(`Initializing translation pipeline -> Target: ${langName}`, 'action');
    
    // UI Loading state
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> PROCESSING...';
    processBtn.classList.add('bg-white/20', 'text-white/50', 'cursor-not-allowed');
    processBtn.classList.remove('bg-brandLime', 'text-textDark', 'shadow-[4px_4px_0_#3B3BE0]', 'hover:bg-brandBlue', 'hover:text-white', 'active:translate-y-1', 'active:translate-x-1', 'active:shadow-[0_0_0_#3B3BE0]', 'cursor-pointer');
    
    processedPlaceholder.classList.add('hidden');
    processingOverlay.classList.remove('hidden');
    processingOverlay.classList.add('flex');
    
    if(actionBar) actionBar.classList.add('hidden');
    if(actionPlaceholder) actionPlaceholder.classList.remove('hidden');
    
    processedVideo.classList.add('hidden');
    processedVideo.src = '';
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        logTerminal(`Uplinking data to DeepDub servers...`, 'info');
        const response = await fetch(`/api/dub?target_language=${targetLang}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to start dubbing job');
        const data = await response.json();
        
        logTerminal(`Job UUID assigned: ${data.job_id}`, 'success');
        
        // Start polling status
        pollJobStatus(data.job_id);

    } catch (error) {
        logTerminal(`CRITICAL ERROR: ${error.message}`, 'error');
        resetProcessBtn();
    }
});

function pollJobStatus(jobId) {
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/status/${jobId}`);
            if (!res.ok) throw new Error('Lost connection to job status');
            
            const data = await res.json();
            
            // Update UI
            progressText.textContent = `${data.status.toUpperCase()} ${data.progress}%`;
            progressBar.style.width = `${data.progress}%`;
            
            // Avoid logging the exact same status repeatedly
            if (!window.lastStatus || window.lastStatus !== data.status) {
                logTerminal(`>> ${data.status}`);
                window.lastStatus = data.status;
            }

            if (data.status === 'Completed') {
                clearInterval(pollInterval);
                finishProcessing(data.result_url);
            } else if (data.status === 'Failed') {
                clearInterval(pollInterval);
                logTerminal(`JOB FAILED: ${data.error}`, 'error');
                resetProcessBtn();
            }
            
        } catch (error) {
            console.error(error);
        }
    }, 1500);
}

function finishProcessing(videoUrl) {
    logTerminal('Rendering complete. Media is ready for playback.', 'success');
    
    processingOverlay.classList.add('hidden');
    processingOverlay.classList.remove('flex');
    
    processedVideo.src = videoUrl;
    processedVideo.classList.remove('hidden');
    
    if(actionBar) {
        actionBar.classList.remove('hidden');
        actionBar.classList.add('flex');
    }
    if(actionPlaceholder) actionPlaceholder.classList.add('hidden');
    
    downloadBtn.href = videoUrl;
    
    resetProcessBtn();
}

function resetProcessBtn() {
    processBtn.disabled = false;
    processBtn.innerHTML = `
        <span id="btnText">INITIALIZE</span>
    `;
    processBtn.classList.remove('bg-white/20', 'text-white/50', 'cursor-not-allowed');
    processBtn.classList.add('bg-brandLime', 'text-textDark', 'shadow-[4px_4px_0_#3B3BE0]', 'hover:bg-brandBlue', 'hover:text-white', 'active:translate-y-1', 'active:translate-x-1', 'active:shadow-[0_0_0_#3B3BE0]', 'cursor-pointer');
}
