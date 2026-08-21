const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileName');
const processBtn = document.getElementById('processBtn');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const noResultsDiv = document.getElementById('no-results');
const transcriptText = document.getElementById('transcriptText');
const summaryText = document.getElementById('summaryText');

let selectedFile = null;

// Drag and drop event listeners
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('bg-gray-100', 'border-brand-yellow');
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('bg-gray-100', 'border-brand-yellow');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('bg-gray-100', 'border-brand-yellow');
    
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
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4'];
    // loose validation based on extension if type is empty
    const validExtensions = ['.mp3', '.wav', '.m4a'];
    
    const isValid = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValid) {
        alert('Please upload a valid audio file (MP3, WAV, M4A).');
        return;
    }

    selectedFile = file;
    fileNameDisplay.innerHTML = `<i class="fas fa-file-audio mr-2 text-brand-green"></i> ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    fileNameDisplay.classList.remove('hidden');
    processBtn.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
}

processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Update UI
    processBtn.classList.add('hidden');
    dropzone.parentElement.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');

    try {
        const response = await fetch('/api/summarize', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to process audio');
        }

        const data = await response.json();
        
        // Display results
        transcriptText.textContent = data.transcript;
        summaryText.textContent = data.summary;
        
        loadingDiv.classList.add('hidden');
        resultsDiv.classList.remove('hidden');
        if (noResultsDiv) noResultsDiv.classList.add('hidden');
        
        // Show upload again
        dropzone.parentElement.classList.remove('hidden');

    } catch (error) {
        alert(`Error: ${error.message}`);
        loadingDiv.classList.add('hidden');
        dropzone.parentElement.classList.remove('hidden');
        processBtn.classList.remove('hidden');
    }
});
