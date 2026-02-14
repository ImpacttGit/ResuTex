import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

// TODO: Replace with your actual Firebase project configuration
// For local development with emulators, this might be auto-configured if using /__/firebase/init.js
// but for this standalone file we'll need a placeholder or the init script.
// Assuming we are running this in an environment where we can fetch config or it's hardcoded.
// For now, I'll use a placeholder config. **USER MUST UPDATE THIS**
const firebaseConfig = {
    // apiKey: "...",
    // authDomain: "...",
    // projectId: "...",
    // ...
};

// Try to use the auto-init if available (hosting), otherwise warn
let app;
let functions;

try {
    // If hosted on Firebase Hosting, this fetch works
    const response = await fetch('/__/firebase/init.json');
    const config = await response.json();
    app = initializeApp(config);
    functions = getFunctions(app);

    // Connect to emulators if running locally (optional but good for dev)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const { connectFunctionsEmulator } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js");
        connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    }

} catch (e) {
    console.warn("Could not auto-initialize Firebase. Please set config manually in script.js if not using Hosting.", e);
    // Fallback for non-hosting environment (e.g. just opening HTML file) requires manual config
    // app = initializeApp(firebaseConfig);
    // functions = getFunctions(app);
}

// --- State Management ---
let resumeData = {
    name: "",
    phone: "",
    email: "",
    links: "",
    summary: "",
    experience: [],
    education: [],
    skills: ""
};

let credits = 50; // Sync this with backend in Phase 3

// --- Navigation ---
window.goToApp = function () {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('flex');
    renderPreview();
}

window.goHome = function () {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('flex');
    document.getElementById('landing-page').classList.remove('hidden');
}

// --- Modal Logic ---
window.showUpgradeModal = function () {
    document.getElementById('upgrade-modal').classList.remove('hidden');
}

window.closeModal = function () {
    document.getElementById('upgrade-modal').classList.add('hidden');
}

// --- AI Rewriting ---
window.useAICredit = async function (cost, successMsg) {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;

    // Optimistic UI update or wait for check?
    // Phase 3 will enforce server side checks.

    // Get text to rewrite - strictly for Summary for now based on button placement
    // In a real app we'd pass the target field ID
    const summaryInput = document.getElementById('input-summary');
    const textToRewrite = summaryInput.value;

    if (!textToRewrite) {
        alert("Please enter some text to rewrite first.");
        return;
    }

    try {
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Working...`;
        btn.disabled = true;

        if (!functions) throw new Error("Firebase Functions not initialized");
        const rewriteContent = httpsCallable(functions, 'rewriteContent');

        const result = await rewriteContent({
            text: textToRewrite,
            instruction: "Make it more professional and concise."
        });

        const { rewrittenText } = result.data;

        // Update UI
        summaryInput.value = rewrittenText;
        resumeData.summary = rewrittenText;
        renderPreview();

        credits -= cost; // Visual update only, real source of truth is backend
        document.getElementById('credit-balance').innerText = credits;

        btn.innerHTML = `<i class="fa-solid fa-check"></i> Done`;
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error("Rewrite failed:", error);
        alert("AI Rewrite failed: " + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (error.message.includes("credit")) {
            showUpgradeModal();
        }
    }
}

// --- AI Auto-Scan ---
// Bind the file input listener
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('resume-upload');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
});

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading overlay
    document.getElementById('scan-overlay').classList.remove('hidden');

    try {
        // Convert to Base64
        const base64 = await convertToBase64(file);

        if (!functions) throw new Error("Firebase Functions not initialized");
        const scanResume = httpsCallable(functions, 'scanResume');

        const result = await scanResume({
            fileBase64: base64.split(',')[1], // Remove 'data:application/pdf;base64,' prefix
            mimeType: file.type
        });

        // Merge response into resumeData
        const scannedData = result.data;

        // Basic mapping (assuming strict schema return)
        resumeData = { ...resumeData, ...scannedData };

        updateFormInputs();
        renderPreview();

        // Deduct scan credits (visual)
        credits -= 5;
        document.getElementById('credit-balance').innerText = credits;

    } catch (error) {
        console.error("Scan failed:", error);
        alert("Resume Scan failed: " + error.message);
    } finally {
        document.getElementById('scan-overlay').classList.add('hidden');
        e.target.value = ''; // Reset input
    }
}

function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Keep the old function as a wrapper or just remove it.
// The button now clicks the file input directly.

// --- Form <-> State Sync ---
function updateFormInputs() {
    document.getElementById('input-name').value = resumeData.name || "";
    document.getElementById('input-phone').value = resumeData.phone || "";
    document.getElementById('input-email').value = resumeData.email || "";
    document.getElementById('input-links').value = resumeData.links || "";
    document.getElementById('input-summary').value = resumeData.summary || "";
    document.getElementById('input-skills').value = resumeData.skills || "";

    // Render Experience inputs dynamic list
    const expList = document.getElementById('experience-list');
    expList.innerHTML = (resumeData.experience || []).map((job, index) => `
        <div class="border-l-2 border-indigo-200 pl-3 mb-4">
            <input type="text" value="${job.role || ''}" class="w-full text-sm font-bold border-none bg-transparent focus:ring-0 p-0 mb-1" placeholder="Job Title">
            <input type="text" value="${job.company || ''}" class="w-full text-xs text-gray-500 border-none bg-transparent focus:ring-0 p-0 mb-1" placeholder="Company">
            <input type="text" value="${job.dates || ''}" class="w-full text-xs text-gray-400 border-none bg-transparent focus:ring-0 p-0 mb-2" placeholder="Dates">
            <textarea rows="3" class="w-full text-xs border border-gray-200 rounded p-1">${(job.details || '').replace(/<br>/g, '\n')}</textarea>
        </div>
    `).join('');

    // Render Education inputs dynamic list
    const eduList = document.getElementById('education-list');
    eduList.innerHTML = (resumeData.education || []).map((edu, index) => `
        <div class="border-l-2 border-indigo-200 pl-3 mb-4">
            <input type="text" value="${edu.school || ''}" class="w-full text-sm font-bold border-none bg-transparent focus:ring-0 p-0 mb-1">
            <input type="text" value="${edu.degree || ''}" class="w-full text-xs text-gray-600 border-none bg-transparent focus:ring-0 p-0 mb-1">
            <input type="text" value="${edu.dates || ''}" class="w-full text-xs text-gray-400 border-none bg-transparent focus:ring-0 p-0">
        </div>
    `).join('');
}

// Listen for typing in main inputs
// Note: We need to re-attach listeners if DOM elements are re-created (they aren't here for main inputs)
document.addEventListener('DOMContentLoaded', () => {
    ['name', 'phone', 'email', 'links', 'summary', 'skills'].forEach(field => {
        const el = document.getElementById(`input-${field}`);
        if (el) {
            el.addEventListener('input', (e) => {
                resumeData[field] = e.target.value;
                renderPreview();
            });
        }
    });

    // Initial Render
    renderPreview();
});

// --- Render "LaTeX" Preview ---
function renderPreview() {
    const preview = document.getElementById('preview-page');
    if (!preview) return; // Guard clause

    // HTML Structure simulating LaTeX 'Modern' template
    let html = `
        <!-- Header -->
        <div class="text-center mb-6">
            <div class="latex-h1">${resumeData.name || "Your Name"}</div>
            <div class="text-sm">
                ${resumeData.phone || ""} <span class="mx-1">|</span>
                <a href="#" class="text-blue-800 underline">${resumeData.email || ""}</a> <span class="mx-1">|</span>
                ${resumeData.links || ""}
            </div>
        </div>

        <!-- Summary -->
        ${resumeData.summary ? `
        <div class="latex-section">Summary</div>
        <div class="text-justify mb-2">
            ${resumeData.summary}
        </div>` : ''}

        <!-- Experience -->
        ${(resumeData.experience && resumeData.experience.length > 0) ? `
        <div class="latex-section">Experience</div>
        <div>
            ${resumeData.experience.map(job => `
                <div class="mb-3">
                    <div class="flex justify-between items-baseline">
                        <span class="latex-sub">${job.role}</span>
                        <span class="text-sm italic">${job.dates}</span>
                    </div>
                    <div class="text-sm latex-italic mb-1">${job.company}</div>
                    <div class="text-sm ml-2">
                        ${job.details}
                    </div>
                </div>
            `).join('')}
        </div>` : ''}

        <!-- Education -->
        ${(resumeData.education && resumeData.education.length > 0) ? `
        <div class="latex-section">Education</div>
        <div>
            ${resumeData.education.map(edu => `
                <div class="mb-2">
                    <div class="flex justify-between items-baseline">
                        <span class="latex-sub">${edu.school}</span>
                        <span class="text-sm italic">${edu.dates}</span>
                    </div>
                    <div class="text-sm">${edu.degree}</div>
                    <div class="text-sm text-gray-600 italic">${edu.details}</div>
                </div>
            `).join('')}
        </div>` : ''}

        <!-- Skills -->
        ${resumeData.skills ? `
        <div class="latex-section">Skills</div>
        <div class="text-sm">
            ${resumeData.skills}
        </div>` : ''}
    `;

    preview.innerHTML = html;
}

// --- PDF Generation ---
window.downloadPDF = async function () {
    const { jsPDF } = window.jspdf;
    const preview = document.getElementById('preview-page');

    // Temporarily remove shadow for clean PDF
    const originalShadow = preview.style.boxShadow;
    preview.style.boxShadow = 'none';

    try {
        const canvas = await html2canvas(preview, {
            scale: 2, // Improve resolution
            useCORS: true,
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Subsequent pages
        while (heightLeft > 0) {
            position = heightLeft - imgHeight; // Negative offset to show next part
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save("My_ResuTeX_CV.pdf");

    } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        // Restore styling
        preview.style.boxShadow = originalShadow;
    }
}
