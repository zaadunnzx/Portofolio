const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const scanOverlay = document.getElementById('scanOverlay');
const expenseTableBody = document.getElementById('expenseTableBody');
const statTotal = document.getElementById('statTotal');
const statCount = document.getElementById('statCount');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

let selectedFile = null;

// Drag and drop event listeners
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('bg-slate-100', 'border-blue-400');
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('bg-slate-100', 'border-blue-400');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('bg-slate-100', 'border-blue-400');
    
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
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        showToast('Please upload a valid PNG or JPG image.', true);
        return;
    }

    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        dropzone.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        processBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Update UI
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
    scanOverlay.classList.remove('hidden');
    scanOverlay.classList.add('flex');

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to process receipt');
        }

        const data = await response.json();
        
        showToast(`Added: ${data.data.merchant} - $${data.data.total}`);
        
        // Reset upload area
        setTimeout(() => {
            resetUploadArea();
            fetchExpenses();
        }, 2000);

    } catch (error) {
        showToast(`Error: ${error.message}`, true);
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-magic"></i> Extract Expense';
        scanOverlay.classList.add('hidden');
        scanOverlay.classList.remove('flex');
    }
});

function resetUploadArea() {
    selectedFile = null;
    fileInput.value = '';
    imagePreview.src = '';
    previewContainer.classList.add('hidden');
    scanOverlay.classList.add('hidden');
    scanOverlay.classList.remove('flex');
    processBtn.classList.add('hidden');
    processBtn.disabled = false;
    processBtn.innerHTML = '<i class="fas fa-magic"></i> Extract Expense';
    dropzone.classList.remove('hidden');
}

function showToast(message, isError = false) {
    toastMsg.textContent = message;
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle text-red-400' : 'fa-check-circle text-green-400'}"></i> <span>${message}</span>`;
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function getCategoryIcon(category) {
    const icons = {
        'Food': '<div class="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center"><i class="fas fa-utensils text-xs"></i></div>',
        'Transport': '<div class="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center"><i class="fas fa-car text-xs"></i></div>',
        'Groceries': '<div class="w-8 h-8 rounded-full bg-green-100 text-green-500 flex items-center justify-center"><i class="fas fa-shopping-basket text-xs"></i></div>',
        'Entertainment': '<div class="w-8 h-8 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center"><i class="fas fa-ticket-alt text-xs"></i></div>',
        'Utilities': '<div class="w-8 h-8 rounded-full bg-yellow-100 text-yellow-500 flex items-center justify-center"><i class="fas fa-bolt text-xs"></i></div>'
    };
    return icons[category] || '<div class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><i class="fas fa-tag text-xs"></i></div>';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function fetchExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const expenses = await response.json();
        
        if (expenses.length === 0) {
            expenseTableBody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-slate-400">No expenses recorded yet. Upload a receipt to start.</td></tr>';
            statTotal.textContent = '$0.00';
            statCount.textContent = '0';
            return;
        }

        let html = '';
        let total = 0;

        expenses.forEach(exp => {
            total += exp.total;
            html += `
                <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td class="py-3 font-semibold text-slate-800">${exp.merchant}</td>
                    <td class="py-3">
                        <div class="flex items-center gap-2">
                            ${getCategoryIcon(exp.category)}
                            <span class="text-slate-600">${exp.category}</span>
                        </div>
                    </td>
                    <td class="py-3 text-slate-500">${formatDate(exp.date)}</td>
                    <td class="py-3 font-bold text-slate-800 text-right">$${exp.total.toFixed(2)}</td>
                </tr>
            `;
        });

        expenseTableBody.innerHTML = html;
        statTotal.textContent = '$' + total.toFixed(2);
        statCount.textContent = expenses.length;

    } catch (error) {
        console.error("Error fetching expenses:", error);
    }
}

// Initial fetch
document.addEventListener('DOMContentLoaded', fetchExpenses);
