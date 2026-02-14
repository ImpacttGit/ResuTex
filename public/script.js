import { onAuthStateChanged, signOut, getDoc, doc, setDoc, auth, db } from './firebase-app.js';

let resumeData = {};
let currentUser = null;

// Functions
const toggleProfileMenu = () => {
    const menu = document.getElementById('profile-menu');
    if (menu) menu.classList.toggle('hidden');
};

const logoutUser = () => {
    signOut(auth);
};

const showEditorView = () => {
    document.getElementById('templates-view').classList.add('hidden');
    document.querySelector('#app-view > main').classList.remove('hidden');
    document.getElementById('editor-link').classList.add('bg-gray-800', 'border-r-4', 'border-indigo-500');
    document.getElementById('templates-link').classList.remove('bg-gray-800', 'border-r-4', 'border-indigo-500');
};

const showTemplatesView = () => {
    document.querySelector('#app-view > main').classList.add('hidden');
    document.getElementById('templates-view').classList.remove('hidden');
    document.getElementById('templates-link').classList.add('bg-gray-800', 'border-r-4', 'border-indigo-500');
    document.getElementById('editor-link').classList.remove('bg-gray-800', 'border-r-4', 'border-indigo-500');
};

const goHome = () => {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('flex');
    document.getElementById('landing-page').classList.remove('hidden');
};

const showUpgradeModal = () => {
    document.getElementById('upgrade-modal').classList.remove('hidden');
};

const closeModal = () => {
    document.getElementById('upgrade-modal').classList.add('hidden');
};

const triggerAIScan = () => {
    document.getElementById('scan-overlay').classList.remove('hidden');
    
    // Simulate 2 second delay for parsing
    setTimeout(() => {
        // Populate with dummy data
        resumeData = {
            name: "Aidan Blakley",
            phone: "+44 7342 256745",
            email: "aidan170206@icloud.com",
            links: "LinkedIn | GitHub",
            summary: "Aspiring Aerospace Engineering student...",
            experience: [],
            education: [],
            skills: "Python, Bot Development, Process Automation, Shopify, Microsoft Office Suite, Google Workspace."
        };

        updateFormInputs();
        renderPreview();
        document.getElementById('scan-overlay').classList.add('hidden');
        
    }, 2000);
};

const downloadPDF = async () => {
    const downloadBtn = document.getElementById('download-pdf-btn');
    const originalBtnText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...`;
    downloadBtn.disabled = true;

    const { jsPDF } = window.jspdf;
    const content = document.getElementById('preview-page');
    
    const originalStyle = content.style.cssText;
    content.style.width = '190mm';
    content.style.padding = '0';

    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        await doc.html(content, {
            callback: function(doc) {
                doc.save('resume.pdf');
                content.style.cssText = originalStyle;
            },
            margin: [10, 10, 10, 10],
            autoPaging: 'text',
            width: 190,
            windowWidth: 980
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Sorry, there was an error generating the PDF. Please try again.");
        content.style.cssText = originalStyle;
    } finally {
        downloadBtn.innerHTML = originalBtnText;
        downloadBtn.disabled = false;
    }
};


// Event Listeners
document.addEventListener('DOMContentLoaded', () => { 
    onAuthStateChanged(auth, async (user) => { 
        const navGuest = document.getElementById('nav-guest'); 
        const navUser = document.getElementById('nav-user'); 
        const landingPage = document.getElementById('landing-page'); 
        const appView = document.getElementById('app-view');

        if (user) {
            currentUser = user;
            // LOGGED IN
            if (navGuest) navGuest.classList.add('hidden');
            if (navUser) {
                navUser.classList.remove('hidden');
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if(userDoc.exists()){
                    const userData = userDoc.data();
                    document.getElementById('nav-user-name').textContent = userData.name;
                }
                document.getElementById('nav-user-email').textContent = user.email;
            }
            // Show App View
            if (landingPage) landingPage.classList.add('hidden');
            if (appView) {
                appView.classList.remove('hidden');
                appView.classList.add('flex');
            }
            // Load Data
            const savedData = await getDoc(doc(db, "users", user.uid, "resumes", "currentDraft"));
            if (savedData.exists()) {
                resumeData = savedData.data();
            }
            updateFormInputs();
            renderPreview();
            
        } else {
            currentUser = null;
            // LOGGED OUT
            if (navGuest) navGuest.classList.remove('hidden');
            if (navUser) navUser.classList.add('hidden');
            // Show Landing Page
            if (landingPage) landingPage.classList.remove('hidden');
            if (appView) {
                appView.classList.add('hidden');
                appView.classList.remove('flex');
            }
        }
    });

    // Add event listeners
    document.getElementById('user-menu-button')?.addEventListener('click', toggleProfileMenu);
    document.getElementById('logout-button')?.addEventListener('click', logoutUser);
    document.getElementById('go-home-btn')?.addEventListener('click', goHome);
    document.getElementById('upgrade-btn')?.addEventListener('click', showUpgradeModal);
    document.getElementById('editor-link')?.addEventListener('click', showEditorView);
    document.getElementById('templates-link')?.addEventListener('click', showTemplatesView);
    document.getElementById('exit-btn')?.addEventListener('click', goHome);
    document.getElementById('ai-scan-btn')?.addEventListener('click', triggerAIScan);
    document.getElementById('download-pdf-btn')?.addEventListener('click', downloadPDF);
    document.getElementById('back-to-editor-btn')?.addEventListener('click', showEditorView);
    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
});

function autoSave() {
    if (currentUser) {
        setDoc(doc(db, "users", currentUser.uid, "resumes", "currentDraft"), resumeData);
    }
}

function updateFormInputs() {
    if(!resumeData) return;
    document.getElementById('input-name').value = resumeData.name || '';
    document.getElementById('input-phone').value = resumeData.phone || '';
    document.getElementById('input-email').value = resumeData.email || '';
    document.getElementById('input-links').value = resumeData.links || '';
    document.getElementById('input-summary').value = resumeData.summary || '';
    document.getElementById('input-skills').value = resumeData.skills || '';
    
    const expList = document.getElementById('experience-list');
    if(expList) {
        expList.innerHTML = (resumeData.experience || []).map((job, index) => `
            <div class="border-l-2 border-indigo-200 pl-3 mb-4">
                <input type="text" value="${job.role || ''}" oninput="updateExperience(${index}, 'role', this.value)" class="w-full text-sm font-bold border-none bg-transparent focus:ring-0 p-0 mb-1" placeholder="Job Title">
                <input type="text" value="${job.company || ''}" oninput="updateExperience(${index}, 'company', this.value)" class="w-full text-xs text-gray-500 border-none bg-transparent focus:ring-0 p-0 mb-1" placeholder="Company">
                <input type="text" value="${job.dates || ''}" oninput="updateExperience(${index}, 'dates', this.value)" class="w-full text-xs text-gray-400 border-none bg-transparent focus:ring-0 p-0 mb-2" placeholder="Dates">
                <textarea rows="3" oninput="updateExperience(${index}, 'details', this.value)" class="w-full text-xs border border-gray-200 rounded p-1">${(job.details || '').replace(/<br>/g, '\n')}</textarea>
            </div>
        `).join('');
    }

    const eduList = document.getElementById('education-list');
    if(eduList) {
        eduList.innerHTML = (resumeData.education || []).map((edu, index) => `
            <div class="border-l-2 border-indigo-200 pl-3 mb-4">
                <input type="text" value="${edu.school || ''}" oninput="updateEducation(${index}, 'school', this.value)" class="w-full text-sm font-bold border-none bg-transparent focus:ring-0 p-0 mb-1">
                <input type="text" value="${edu.degree || ''}" oninput="updateEducation(${index}, 'degree', this.value)" class="w-full text-xs text-gray-600 border-none bg-transparent focus:ring-0 p-0 mb-1">
                <input type="text" value="${edu.dates || ''}" oninput="updateEducation(${index}, 'dates', this.value)" class="w-full text-xs text-gray-400 border-none bg-transparent focus:ring-0 p-0">
            </div>
        `).join('');
    }
}

function renderPreview() {
    if(!resumeData) return;
    const preview = document.getElementById('preview-page');
    if(!preview) return;
    
    let html = `
        <div class="text-center mb-6">
            <div class="latex-h1">${resumeData.name || "Your Name"}</div>
            <div class="text-sm">
                ${resumeData.phone || ''} <span class="mx-1">|</span>
                <a href="#" class="text-blue-800 underline">${resumeData.email || ''}</a> <span class="mx-1">|</span>
                ${resumeData.links || ''}
            </div>
        </div>
        ${resumeData.summary ? `
        <div class="latex-section">Summary</div>
        <div class="text-justify mb-2">
            ${resumeData.summary}
        </div>` : ''}
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
                    <div class="text-sm text-gray-600 italic">${edu.details || ''}</div>
                </div>
            `).join('')}
        </div>` : ''}
        ${resumeData.skills ? `
        <div class="latex-section">Skills</div>
        <div class="text-sm">
            ${resumeData.skills}
        </div>` : ''}
    `;
    preview.innerHTML = html;
}