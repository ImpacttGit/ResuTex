import { monitorAuthState, saveResume, getResume, logoutUser, updateUserProfile } from './firebase-app.js';
let currentUser = null;
let resumeData = {
    name: "John Doe",
    phone: "+1 (555) 010-9999",
    email: "john.doe@example.com",
    links: "linkedin.com/in/johndoe | github.com/johndoe",
    summary: "Experienced software engineer with a proven track record of delivering high-quality web applications. Skilled in modern JavaScript frameworks, cloud infrastructure, and agile methodologies.",
    experience: [
        { role: "Senior Developer", company: "Tech Corp", dates: "2023 - Present", details: "- Led a team of 5 developers in rebuilding the core platform.\n- Improved system performance by 30% through code optimization.\n- Implemented CI/CD pipelines reducing deployment time by 50%." },
        { role: "Software Engineer", company: "StartUp Inc", dates: "2021 - 2023", details: "- Developed key features for the MVP using React and Node.js.\n- Collaborated with product managers to define requirements.\n- Participated in daily stand-ups and code reviews." }
    ],
    education: [
        { school: "State University", degree: "B.S. Computer Science", dates: "2017 - 2021", details: "Magna Cum Laude, GPA 3.9/4.0" }
    ],
    skills: "JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Git"
};
let credits = 50; // Assuming this was the default

// --- GLOBAL WINDOW FUNCTIONS ---
window.logoutUser = logoutUser;
window.toggleProfileMenu = () => document.getElementById('profile-menu')?.classList.toggle('hidden');

// Close dropdown if clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('profile-menu');
    const btn = document.querySelector('button[onclick="toggleProfileMenu()"]');
    if (menu && !menu.classList.contains('hidden') && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

window.goToApp = function () {
    if (!currentUser) {
        window.location.href = "signup.html";
    } else {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-view').classList.remove('hidden');
        document.getElementById('app-view').classList.add('flex');
        window.showEditorView();
        renderPreview();
    }
};

window.goHome = function () {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('flex');
    document.getElementById('landing-page').classList.remove('hidden');
};

window.viewPlans = function () {
    window.location.href = 'plans.html';
};

// --- SETTINGS MODAL LOGIC ---
window.openSettingsModal = function () {
    document.getElementById('settings-modal').classList.remove('hidden');
    document.getElementById('profile-menu').classList.add('hidden'); // Close menu
    if (currentUser) {
        document.getElementById('settings-display-name').value = currentUser.displayName || "";
        if (currentUser.photoURL) {
            document.getElementById('settings-preview-img').src = currentUser.photoURL;
            document.getElementById('settings-preview-img').classList.remove('hidden');
            document.getElementById('settings-preview-icon').classList.add('hidden');
        } else {
            document.getElementById('settings-preview-img').classList.add('hidden');
            document.getElementById('settings-preview-icon').classList.remove('hidden');
        }
    }
};

window.closeSettingsModal = function () {
    document.getElementById('settings-modal').classList.add('hidden');
};

window.saveProfileSettings = async function () {
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    const name = document.getElementById('settings-display-name').value;
    const fileInput = document.getElementById('settings-file-input');
    let photoURL = currentUser.photoURL;
    try {
        // Handle Image Upload (Convert to Base64 for simplicity without Storage bucket)
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            photoURL = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }
        await updateUserProfile(currentUser, name, photoURL);

        // Update UI immediately
        document.getElementById('nav-user-name').textContent = name;
        if (photoURL) {
            document.getElementById('nav-user-photo').src = photoURL;
            document.getElementById('nav-user-photo').classList.remove('hidden');
            document.getElementById('nav-user-icon').classList.add('hidden');
        } else {
            document.getElementById('nav-user-photo').classList.add('hidden');
            document.getElementById('nav-user-icon').classList.remove('hidden');
        }

        window.closeSettingsModal();
        alert("Profile updated!");
    } catch (error) {
        console.error(error);
        alert("Error updating profile: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

window.loadPhotoPreview = function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('settings-preview-img').src = e.target.result;
            document.getElementById('settings-preview-img').classList.remove('hidden');
            document.getElementById('settings-preview-icon').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
};

// ... (Keep existing functions: showEditorView, showTemplatesView, etc.) ...
window.showEditorView = () => {
    document.getElementById('templates-view').classList.add('hidden');
    document.querySelector('#app-view > main').classList.remove('hidden');
    setActiveNavLink('editor-link');
    removeActiveNavLink('templates-link');
};

window.showTemplatesView = () => {
    document.querySelector('#app-view > main').classList.add('hidden');
    document.getElementById('templates-view').classList.remove('hidden');
    renderTemplates();
    setActiveNavLink('templates-link');
    removeActiveNavLink('editor-link');
};

window.showUpgradeModal = () => document.getElementById('upgrade-modal').classList.remove('hidden');
window.closeModal = () => document.getElementById('upgrade-modal').classList.add('hidden');
window.triggerAIScan = () => alert("AI Scan coming soon!");
window.downloadPDF = function () {
    // Alert user about best practice
    alert("Pro Tip: For the best quality (selectable text), choose 'Save as PDF' as the destination in the print dialog.");
    window.print();
};

// --- SAMPLE DATA & AUTOSAVE ---
window.loadSampleData = function () {
    if (confirm("This will overwrite your current fields. Continue?")) {
        // Generic "John Doe" data
        resumeData = {
            name: "John Doe",
            phone: "+1 (555) 123-4567",
            email: "john.doe@email.com",
            links: "linkedin.com/in/johndoe | github.com/johndoe",
            summary: "Results-oriented Software Engineer with experience in scalable architecture and distributed systems. Passionate about clean code and automation.",
            experience: [
                { role: "Senior Engineer", company: "Tech Solutions Inc.", dates: "2021-Present", details: "• Architected microservices reducing latency by 40%.\n• Mentored junior developers and led code reviews." },
                { role: "Software Developer", company: "Startup Co.", dates: "2018-2021", details: "• Built full-stack features using React and Node.js.\n• Optimized database queries improving load times by 2x." }
            ],
            education: [
                { school: "State University", degree: "B.S. Computer Science", dates: "2014-2018", details: "Dean's List, GPA 3.8/4.0" }
            ],
            skills: "JavaScript, Python, Go, Docker, AWS, SQL, NoSQL"
        };
        updateFormInputs();
        renderPreview();
        saveToLocal(); // Auto-save sample data
    }
};

function saveToLocal() {
    localStorage.setItem('resutex_data', JSON.stringify(resumeData));
}

function restoreFromLocal() {
    const saved = localStorage.getItem('resutex_data');
    if (saved) {
        try {
            resumeData = Object.assign({}, resumeData, JSON.parse(saved)); // Merge to keep defaults if missing keys
            updateFormInputs();
            renderPreview();
        } catch (e) { console.error("Could not load save", e); }
    }

    // Restore Privacy Settings
    // Restore Privacy Settings
    const privacySettings = JSON.parse(localStorage.getItem('resutex_privacy') || '{}');

    ['name', 'email', 'phone', 'links'].forEach(field => {
        if (privacySettings[field]) {
            document.getElementById('preview-page').classList.add(`blur-${field}`);
            const checkbox = document.getElementById(`blur-${field}-check`);
            if (checkbox) checkbox.checked = true;
        }
    });

    // Restore other settings
    if (localStorage.getItem('resutex_dark') === 'true') {
        document.documentElement.classList.add('dark');
    }

    const savedJobDesc = localStorage.getItem('resutex_job_desc');
    if (savedJobDesc && document.getElementById('job-desc-input')) {
        document.getElementById('job-desc-input').value = savedJobDesc;
    }
}

// --- PRIVACY & UI LOGIC ---
window.togglePrivacyModal = function () {
    const modal = document.getElementById('privacy-settings-modal');
    modal.classList.toggle('hidden');
};

window.toggleSpecificBlur = function (field) {
    const preview = document.getElementById('preview-page');
    const isChecked = document.getElementById(`blur-${field}-check`).checked;

    // Toggle class like 'blur-name', 'blur-email'
    if (isChecked) {
        preview.classList.add(`blur-${field}`);
    } else {
        preview.classList.remove(`blur-${field}`);
    }

    // Save settings
    const settings = JSON.parse(localStorage.getItem('resutex_privacy') || '{}');
    settings[field] = isChecked;
    localStorage.setItem('resutex_privacy', JSON.stringify(settings));
};

window.scrollToPreview = function () {
    document.getElementById('app-view').scrollIntoView({ behavior: 'smooth' });
};

window.toggleDarkMode = function () {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('resutex_dark', document.documentElement.classList.contains('dark'));
};

window.toggleJobPanel = function () {
    const panel = document.getElementById('job-desc-panel');
    if (panel) {
        if (panel.classList.contains('translate-x-full')) {
            panel.classList.remove('translate-x-full');
        } else {
            panel.classList.add('translate-x-full');
        }
    }
};

// --- DATA PORTABILITY ---
window.exportJSON = function () {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resumeData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "my_resume.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

window.importJSON = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm("Replace current resume with imported data?")) {
                resumeData = imported;
                updateFormInputs();
                renderPreview();
                saveToLocal();
                alert("Import successful!");
            }
        } catch (err) {
            console.error(err);
            alert("Invalid JSON file.");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
};

window.loadTemplate = async function (templateName) {
    try {
        const response = await fetch(`../../templates/${templateName}.json`);
        if (!response.ok) {
            console.error("Fetch response status:", response.status, response.statusText);
            throw new Error(`Failed to load template ${templateName}: ${response.statusText}`);
        }
        const templateData = await response.json();

        // Update resumeData with template data
        // Merge deeply or replace based on desired behavior. For now, a shallow merge/replace for top-level keys.
        resumeData = { ...resumeData, ...templateData };

        // Save to Firestore if user is logged in
        if (currentUser) {
            await saveResume(currentUser.uid, resumeData);
        }

        updateFormInputs(); // Update form fields
        renderPreview();    // Update preview
        window.showEditorView(); // Go back to editor
        alert(`Template '${templateName}' loaded successfully!`);

    } catch (error) {
        console.error("Error loading template:", error);
        alert("Could not load template. Please try again.");
    }
};


// --- INTERNAL ---
function setActiveNavLink(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('bg-gray-800', 'border-r-4', 'border-indigo-500');
        element.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-800');
    }
}

function removeActiveNavLink(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('bg-gray-800', 'border-r-4', 'border-indigo-500');
        element.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-800');
    }
}
function renderTemplates() {
    const list = document.getElementById('templates-list');
    if (list && window.templates) {
        list.innerHTML = window.templates.map(t => `
            <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <img src="${t.image}" alt="${t.title} Template Preview" class="w-full h-48 object-cover border-b border-gray-200">
                <div class="p-4">
                    <h3 class="font-bold text-xl text-gray-900 mb-2">${t.title}</h3>
                    <button onclick="loadTemplate('${t.name}')" class="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition">
                        Select Template
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function updateFormInputs() {
    ['name', 'phone', 'email', 'links', 'summary', 'skills'].forEach(f => {
        const el = document.getElementById('input-' + f);
        if (el) el.value = resumeData[f] || "";
    });
}

// --- RENDER PREVIEW (Updated for Privacy Spans) ---
function renderPreview() {
    const previewContainer = document.getElementById('preview-content');
    if (!previewContainer) return;

    // Helper to wrap text in privacy spans
    const wrap = (text, type) => `<span class="sensitive-${type}">${text || ''}</span>`;

    let html = `
        <div class="text-center border-b pb-4 mb-4">
            <h1 class="text-3xl font-bold uppercase tracking-wide text-gray-900 mb-1">${wrap(resumeData.name, 'name')}</h1>
            <div class="text-sm text-gray-600">
                ${wrap(resumeData.email, 'email')} | ${wrap(resumeData.phone, 'phone')} | ${wrap(resumeData.links, 'links')}
            </div>
        </div>
        
        <div class="mb-4">
            <p class="text-sm text-gray-700 leading-relaxed">${resumeData.summary}</p>
        </div>

        <div class="mb-4">
            <h2 class="text-lg font-bold text-gray-800 border-b-2 border-gray-300 mb-2 uppercase tracking-wider">Experience</h2>
            <div class="space-y-3">
    `;

    resumeData.experience.forEach(exp => {
        html += `
            <div>
                <div class="flex justify-between items-baseline mb-1">
                    <h3 class="font-bold text-gray-800 text-sm">${exp.role}</h3>
                    <span class="text-xs text-gray-500 font-medium">${exp.dates}</span>
                </div>
                <div class="text-sm text-gray-700 italic mb-1">${exp.company}</div>
                <ul class="list-disc list-inside text-xs text-gray-600 space-y-0.5 ml-1">
                    ${exp.details.split('\n').map(d => `<li>${d.replace(/^•\s*/, '')}</li>`).join('')}
                </ul>
            </div>
        `;
    });

    html += `
            </div>
        </div>

        <div class="mb-4">
            <h2 class="text-lg font-bold text-gray-800 border-b-2 border-gray-300 mb-2 uppercase tracking-wider">Education</h2>
    `;

    resumeData.education.forEach(edu => {
        html += `
            <div class="mb-2">
                <div class="flex justify-between items-baseline">
                    <h3 class="font-bold text-gray-800 text-sm">${edu.school}</h3>
                    <span class="text-xs text-gray-500">${edu.dates}</span>
                </div>
                <div class="text-xs text-gray-700">${edu.degree}</div>
                <div class="text-xs text-gray-500 italic">${edu.details}</div>
            </div>
        `;
    });

    html += `
        </div>

        <div>
            <h2 class="text-lg font-bold text-gray-800 border-b-2 border-gray-300 mb-2 uppercase tracking-wider">Skills</h2>
            <p class="text-xs text-gray-700 leading-relaxed">${resumeData.skills}</p>
        </div>
    `;

    previewContainer.innerHTML = html;
}


// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    monitorAuthState(async (user) => {
        if (user) {
            currentUser = user;
            // UI Updates
            if (document.getElementById('nav-guest')) document.getElementById('nav-guest').classList.add('hidden');
            if (document.getElementById('nav-user')) document.getElementById('nav-user').classList.remove('hidden');
            if (document.getElementById('nav-user-name')) document.getElementById('nav-user-name').textContent = user.displayName || "User";
            if (document.getElementById('nav-user-email')) document.getElementById('nav-user-email').textContent = user.email;

            // Profile Pic
            if (user.photoURL) {
                const pic = document.getElementById('nav-user-photo');
                if (pic) {
                    pic.src = user.photoURL;
                    pic.classList.remove('hidden');
                }
                if (document.getElementById('nav-user-icon')) document.getElementById('nav-user-icon').classList.add('hidden');
            } else {
                if (document.getElementById('nav-user-photo')) document.getElementById('nav-user-photo').classList.add('hidden');
                if (document.getElementById('nav-user-icon')) document.getElementById('nav-user-icon').classList.remove('hidden');
            }

            // Load Data
            const saved = await getResume(user.uid);
            if (saved && saved.data()) {
                resumeData = { ...resumeData, ...saved.data() };
                updateFormInputs();
                renderPreview();
                saveToLocal(); // Sync cloud data to local
            }
        } else {
            currentUser = null;
            if (document.getElementById('nav-guest')) document.getElementById('nav-guest').classList.remove('hidden');
            if (document.getElementById('nav-user')) document.getElementById('nav-user').classList.add('hidden');

            // If guest, try to restore local work
            restoreFromLocal();
        }
    });

    // Job Description Persistence
    const jobInput = document.getElementById('job-desc-input');
    if (jobInput) {
        jobInput.addEventListener('input', (e) => {
            localStorage.setItem('resutex_job_desc', e.target.value);
        });
    }

    // Inputs with Autosave
    ['name', 'phone', 'email', 'links', 'summary', 'skills'].forEach(f => {
        const input = document.getElementById('input-' + f);
        if (input) {
            input.addEventListener('input', (e) => {
                resumeData[f] = e.target.value;
                renderPreview();
                saveToLocal();
                if (currentUser) saveResume(currentUser.uid, resumeData);
            });
        }
    });
});
