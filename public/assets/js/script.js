import { monitorAuthState, saveResume, getResume, createResume, getUserResumes, deleteResume, logoutUser, updateUserProfile, resetUserPassword, getUserProfile, updateUserTier, updateUserCredits } from './firebase-app.js?v=3';
let currentUser = null;
let currentUserProfile = null;
let currentResumeId = null;
let allResumes = [];
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
let isAdvancedMode = false;
let customLatexCode = "";
let credits = 0; // Will be synced from Firestore

// --- GLOBAL WINDOW FUNCTIONS ---
window.logoutUser = logoutUser;
window.toggleProfileMenu = () => document.getElementById('profile-menu')?.classList.toggle('hidden');

let _advancedDebounce = null;
window.recompileLatexDebounced = function () {
    clearTimeout(_advancedDebounce);
    _advancedDebounce = setTimeout(window.recompileLatex, 500);
};

window.recompileLatex = function () {
    // Disabled rendering for Code Editor mode as per user request.
    // Swapping back to Simple Mode will re-enable preview from form data.
    renderPreview();
};

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

window.triggerPasswordReset = async function () {
    if (!currentUser || !currentUser.email) return;
    if (confirm(`Send a password reset email to ${currentUser.email}?`)) {
        try {
            await resetUserPassword(currentUser.email);
            alert("Email sent! Check your inbox to reset your password.");
        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        }
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

// --- RESUME MANAGEMENT ---
window.loadResumes = async function () {
    if (!currentUser) return;
    try {
        const sidebarList = document.getElementById('resume-sidebar-list');
        if (sidebarList) sidebarList.innerHTML = '<div class="text-xs text-gray-500 italic px-2">Loading...</div>';

        let resumes = [];
        try {
            resumes = await getUserResumes(currentUser.uid);
        } catch (queryErr) {
            console.warn("Could not query resumes (new user?), creating default.", queryErr);
            resumes = [];
        }
        allResumes = resumes;

        // If no resumes, create a default one
        if (allResumes.length === 0) {
            // Check for legacy data to migrate or just start fresh
            try {
                const legacyDoc = await getResume(currentUser.uid, "currentDraft");
                if (legacyDoc.exists()) {
                    const legacyData = legacyDoc.data();
                    const newId = await createResume(currentUser.uid, { ...legacyData, title: legacyData.name || "My Resume" });
                    currentResumeId = newId;
                    resumeData = legacyData;
                    allResumes = [{ id: newId, ...legacyData }];
                } else {
                    throw new Error("no legacy");
                }
            } catch (_) {
                // Create brand new
                const defaultData = { ...resumeData, title: "My First Resume" };
                const newId = await createResume(currentUser.uid, defaultData);
                currentResumeId = newId;
                resumeData = defaultData;
                allResumes = [{ id: newId, ...defaultData }];
            }
        } else {
            // Select most recently updated or first
            if (!currentResumeId) {
                currentResumeId = allResumes[0].id;
                resumeData = allResumes[0];
            }
        }

        renderResumeList();
        updateFormInputs();
        renderPreview();
        saveToLocal();

    } catch (e) {
        console.error("Error loading resumes:", e);
        // Don't alert — just use local data fallback
        restoreFromLocal();
    }
};

window.renderResumeList = function () {
    const list = document.getElementById('resume-sidebar-list');
    if (!list) return;

    if (allResumes.length === 0) {
        list.innerHTML = '<div class="text-xs text-gray-500 italic px-2">No resumes found.</div>';
        return;
    }

    list.innerHTML = allResumes.map(res => `
        <div class="flex items-center justify-between group p-2 rounded cursor-pointer ${res.id === currentResumeId ? 'bg-indigo-900 text-white' : 'hover:bg-gray-800 text-gray-300'}" onclick="switchResume('${res.id}')">
            <div class="truncate text-xs font-medium flex-1">
                ${res.title || res.name || "Untitled Resume"}
            </div>
            ${allResumes.length > 1 ? `
            <button onclick="deleteResumeUI(event, '${res.id}')" class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition px-1" title="Delete">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
            </button>
            ` : ''}
        </div>
    `).join('');
};

window.switchResume = async function (id) {
    if (id === currentResumeId) return;

    // Auto-save current before switching? 
    // We autosave on input, so it should be fine, but good to ensure.
    if (currentUser) await saveResume(currentUser.uid, resumeData, currentResumeId);

    const target = allResumes.find(r => r.id === id);
    if (target) {
        currentResumeId = id;
        // Fetch fresh data to be safe, or use cached from list if we trust it
        // Better to fetch to get full details if list only had summary
        const freshDoc = await getResume(currentUser.uid, id);
        if (freshDoc.exists()) {
            resumeData = freshDoc.data();
        } else {
            resumeData = target;
        }

        renderResumeList();
        updateFormInputs();
        renderPreview();
        saveToLocal();
    }
};

window.createNewResumeUI = async function () {
    if (!currentUser) return alert("Please sign in to create resumes.");

    const name = prompt("Enter a name for your new resume:", "My New Resume");
    if (!name) return;

    try {
        // Start with a clean slate or copy current? Let's start with clean/default structure but keep user contact info
        const baseData = {
            name: name,
            email: currentUser.email || "",
            phone: "",
            links: "",
            summary: "",
            experience: [],
            education: [],
            skills: ""
        };

        // Or copy current contact info if available
        if (resumeData) {
            baseData.name = name; // Resume Name, not User Name. Wait, the form has a Name field too.
            // Let's disambiguate Resume Name vs Person Name. 
            // The resumeData.name is usually the Person's Name. 
            // We need a metadata field for the Resume Title.
            // For now, let's assume the user wants to duplicate their contact info at least.
            baseData.name = resumeData.name;
            baseData.email = resumeData.email;
            baseData.phone = resumeData.phone;
            baseData.links = resumeData.links;
        }

        // Properly we should have a separate 'title' field for the resume document, but let's use the doc name for now or add a custom field.
        // Let's add 'title' to the object.
        baseData.title = name; // Internal title

        const newId = await createResume(currentUser.uid, baseData);
        allResumes.unshift({ id: newId, ...baseData });
        currentResumeId = newId;
        resumeData = baseData;

        renderResumeList();
        updateFormInputs();
        renderPreview();
        saveToLocal();

    } catch (e) {
        console.error(e);
        alert("Error creating resume.");
    }
};

window.deleteResumeUI = async function (e, id) {
    e.stopPropagation(); // Prevent switching
    if (!confirm("Are you sure you want to delete this resume? This cannot be undone.")) return;

    try {
        await deleteResume(currentUser.uid, id);
        allResumes = allResumes.filter(r => r.id !== id);

        // If we deleted the current one, switch to another
        if (id === currentResumeId) {
            if (allResumes.length > 0) {
                await switchResume(allResumes[0].id);
            } else {
                // Should force create a new one or show empty state
                // For simplicity, create a default
                window.location.reload();
            }
        } else {
            renderResumeList();
        }
    } catch (err) {
        console.error(err);
        alert("Failed to delete resume.");
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
window.triggerAIScan = () => alert("AI Scan coming soon! This will allow you to upload an existing PDF and have it auto-filled here.");

window.useAICredit = (event, amount, successMsg) => {
    if (credits < amount) {
        window.showUpgradeModal();
        return;
    }
    // Simulate AI Work
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Thinking...';
    btn.disabled = true;

    setTimeout(async () => {
        credits -= amount;
        document.getElementById('credit-balance').textContent = credits;

        // Sync to Firestore
        if (currentUser) {
            await updateUserCredits(currentUser.uid, credits);
        }

        alert(successMsg + " (Credits synced to Firestore)");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }, 1500);
};

window.addExperience = () => {
    resumeData.experience.push({ role: "", company: "", dates: "", details: "" });
    renderExperienceFields();
    renderPreview();
    saveToLocal();
    if (currentUser) saveResume(currentUser.uid, resumeData, currentResumeId);
};

window.removeExperience = (index) => {
    resumeData.experience.splice(index, 1);
    renderExperienceFields();
    renderPreview();
    saveToLocal();
    if (currentUser) saveResume(currentUser.uid, resumeData, currentResumeId);
};

window.addEducation = () => {
    resumeData.education.push({ school: "", degree: "", dates: "", details: "" });
    renderEducationFields();
    renderPreview();
    saveToLocal();
    if (currentUser) saveResume(currentUser.uid, resumeData, currentResumeId);
};

window.removeEducation = (index) => {
    resumeData.education.splice(index, 1);
    renderEducationFields();
    renderPreview();
    saveToLocal();
    if (currentUser) saveResume(currentUser.uid, resumeData, currentResumeId);
};

function renderExperienceFields() {
    const list = document.getElementById('experience-list');
    if (!list) return;
    list.innerHTML = resumeData.experience.map((exp, i) => `
        <div class="p-3 bg-white border border-gray-200 rounded relative group">
            <button onclick="removeExperience(${i})" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
            <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                    <input type="text" value="${exp.role}" oninput="updateExp(${i}, 'role', this.value)" placeholder="Role/Title" class="w-full text-sm font-bold border-b border-transparent focus:border-indigo-500 outline-none">
                </div>
                <input type="text" value="${exp.company}" oninput="updateExp(${i}, 'company', this.value)" placeholder="Company" class="w-full text-xs border-b border-transparent focus:border-indigo-500 outline-none">
                <input type="text" value="${exp.dates}" oninput="updateExp(${i}, 'dates', this.value)" placeholder="Dates (e.g. 2021-2023)" class="w-full text-xs border-b border-transparent focus:border-indigo-500 outline-none">
                <textarea oninput="updateExp(${i}, 'details', this.value)" placeholder="Bullet points (use new lines)" class="col-span-2 w-full text-xs p-1 bg-gray-50 border border-gray-100 rounded focus:border-indigo-500 outline-none" rows="3">${exp.details}</textarea>
            </div>
        </div>
    `).join('');
}

function renderEducationFields() {
    const list = document.getElementById('education-list');
    if (!list) return;
    list.innerHTML = resumeData.education.map((edu, i) => `
        <div class="p-3 bg-white border border-gray-200 rounded relative group">
            <button onclick="removeEducation(${i})" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
            <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                    <input type="text" value="${edu.school}" oninput="updateEdu(${i}, 'school', this.value)" placeholder="School/University" class="w-full text-sm font-bold border-b border-transparent focus:border-indigo-500 outline-none">
                </div>
                <input type="text" value="${edu.degree}" oninput="updateEdu(${i}, 'degree', this.value)" placeholder="Degree" class="w-full text-xs border-b border-transparent focus:border-indigo-500 outline-none">
                <input type="text" value="${edu.dates}" oninput="updateEdu(${i}, 'dates', this.value)" placeholder="Dates" class="w-full text-xs border-b border-transparent focus:border-indigo-500 outline-none">
                <textarea oninput="updateEdu(${i}, 'details', this.value)" placeholder="Additional info (GPA, awards...)" class="col-span-2 w-full text-xs p-1 bg-gray-50 border border-gray-100 rounded focus:border-indigo-500 outline-none" rows="2">${edu.details}</textarea>
            </div>
        </div>
    `).join('');
}

window.updateExp = (index, field, value) => {
    resumeData.experience[index][field] = value;
    renderPreview();
    saveToLocal();
    // Debounce cloud save if needed, but for now:
    if (currentUser) saveResume(currentUser.uid, resumeData, currentResumeId);
};

window.updateEdu = (index, field, value) => {
    resumeData.education[index][field] = value;
    renderPreview();
    saveToLocal();
    if (currentUser) saveResume(currentUser.uid, resumeData, currentResumeId);
};
window.downloadPDF = function () {
    const tier = currentUserProfile?.tier || 'free';
    if (tier === 'free') {
        alert("High-quality LaTeX PDF export is a premium feature! We've opened the print dialog for you instead. Upgrade to Job Hunter or Student for professional PDF generation.");
        window.print();
        return;
    }

    // 1. Get Source
    let tex;
    if (isAdvancedMode) {
        tex = document.getElementById('latex-code-input').value;
    } else {
        tex = generateLaTeXSource(false, true); // Real preamble for High Quality
    }

    // 2. Alert user
    const btn = document.getElementById('download-pdf-btn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Compiling...';
    btn.disabled = true;

    try {
        // 3. Submit to hidden cloud form
        document.getElementById('cloud-latex-text').value = tex;
        document.getElementById('cloud-latex-form').submit();

        // 4. Reset button after a delay
        setTimeout(() => {
            btn.innerHTML = original;
            btn.disabled = false;
            alert("Your high-quality PDF is being generated. It will open in a new tab shortly.");
        }, 3000);
    } catch (e) {
        console.error(e);
        alert("Cloud compilation failed. Falling back to local print.");
        window.print();
        btn.innerHTML = original;
        btn.disabled = false;
    }
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

    initPrivacySettings();

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
window.toggleMasterPrivacy = function () {
    const isChecked = document.getElementById('privacy-master-switch').checked;
    localStorage.setItem('resutex_privacy_master', isChecked);
    renderPreview();
};

window.togglePrivacyModal = function () {
    const modal = document.getElementById('privacy-settings-modal');
    modal.classList.toggle('hidden');
};

window.toggleSpecificBlur = function (field) {
    const isChecked = document.getElementById(`blur-${field}-check`).checked;

    // Save settings
    const settings = JSON.parse(localStorage.getItem('resutex_privacy') || '{}');
    settings[field] = isChecked;
    localStorage.setItem('resutex_privacy', JSON.stringify(settings));

    // Re-render preview to apply mask (only if master is ON)
    renderPreview();
};

function initPrivacySettings() {
    // 1. Restore Master Switch
    const masterState = localStorage.getItem('resutex_privacy_master') === 'true';
    const masterSwitch = document.getElementById('privacy-master-switch');
    if (masterSwitch) {
        masterSwitch.checked = masterState;
        // Update styling instantly
        if (masterState) {
            masterSwitch.classList.add('right-0', 'border-indigo-600');
            masterSwitch.nextElementSibling.classList.add('bg-indigo-600'); // Label
        }
    }

    // 2. Restore Checkboxes
    const privacySettings = JSON.parse(localStorage.getItem('resutex_privacy') || '{}');
    const isFirstLoad = Object.keys(privacySettings).length === 0;

    ['name', 'email', 'phone', 'links'].forEach(field => {
        const checkbox = document.getElementById(`blur-${field}-check`);
        if (!checkbox) return;

        // Visual Sync
        if (!isFirstLoad) {
            checkbox.checked = !!privacySettings[field];
        } else {
            // Default to checked if first load, so if they turn on Master, everything hides
            checkbox.checked = true;
            // Save this default state
            privacySettings[field] = true;
        }
    });

    if (isFirstLoad) {
        localStorage.setItem('resutex_privacy', JSON.stringify(privacySettings));
    }
}

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

// --- ADVANCED MODE LOGIC ---
window.toggleAdvancedMode = function () {
    const toggle = document.getElementById('advanced-mode-switch');
    const isEntering = toggle.checked;

    // 1. Tier Check
    const tier = currentUserProfile?.tier || 'free';
    if (tier === 'free') {
        toggle.checked = false;
        alert("The Code Editor (Direct LaTeX Editing) is a premium feature. Please upgrade to the Job Hunter or Student plan.");
        window.viewPlans();
        return;
    }

    if (isEntering) {
        // Show HTML Warning
        const modal = document.getElementById('advanced-warning-modal');
        if (modal) modal.classList.remove('hidden');
    } else {
        // Show HTML Return Warning
        const modal = document.getElementById('simple-return-modal');
        if (modal) modal.classList.remove('hidden');
    }
};

window.confirmAdvancedMode = function () {
    isAdvancedMode = true;
    document.getElementById('advanced-warning-modal').classList.add('hidden');

    // Switch UI In Left Column
    document.getElementById('simple-mode-ui').classList.add('hidden');
    document.getElementById('advanced-mode-ui').classList.remove('hidden');

    // Populate Editor
    customLatexCode = generateLaTeXSource(false, true);
    document.getElementById('latex-code-input').value = customLatexCode;

    // Ensure Refresh runs
    renderPreview();
};

window.cancelAdvancedMode = function () {
    document.getElementById('advanced-warning-modal').classList.add('hidden');
    document.getElementById('advanced-mode-switch').checked = false;
};

window.confirmSimpleMode = function () {
    const rawCode = document.getElementById('latex-code-input').value;

    // EXTRACT DATA FROM LATEX (Two-way sync)
    const newData = parseLatexToData(rawCode);
    if (newData) {
        resumeData = newData;
        updateFormInputs();
    }

    isAdvancedMode = false;
    customLatexCode = "";
    document.getElementById('simple-return-modal').classList.add('hidden');

    // Switch UI In Left Column
    document.getElementById('advanced-mode-ui').classList.add('hidden');
    document.getElementById('simple-mode-ui').classList.remove('hidden');

    // Re-render from Form Data
    renderPreview();
    saveToLocal();
    if (currentUser) saveResume(currentUser.uid, resumeData, currentResumeId);
};

window.cancelSimpleMode = function () {
    document.getElementById('simple-return-modal').classList.add('hidden');
    document.getElementById('advanced-mode-switch').checked = true;
};

function parseLatexToData(latex) {
    const data = JSON.parse(JSON.stringify(resumeData)); // Start with current

    const unesc = (str) => {
        if (!str) return '';
        return str
            .replace(/\\&/g, '&')
            .replace(/\\%/g, '%')
            .replace(/\\\$/g, '$')
            .replace(/\\#/g, '#')
            .replace(/\\_/g, '_')
            .replace(/\\\{/g, '{')
            .replace(/\\\}/g, '}')
            .replace(/\\textasciitilde /g, '~')
            .replace(/\\textasciicircum /g, '^')
            .replace(/\\textbackslash /g, '\\');
    };

    // 1. Name
    const nameMatch = latex.match(/\\textbf\{\\Huge \\scshape (.*?)\}/);
    if (nameMatch) data.name = unesc(nameMatch[1]);

    // 2. Contact
    const contactBlock = latex.match(/\\small (.*?)(\\vspace|\\end\{center\}|\\small)/s);
    if (contactBlock) {
        const parts = contactBlock[1].split('$|$').map(s => unesc(s.trim()));
        if (parts.length >= 1) data.phone = parts[0];
        if (parts.length >= 2) data.email = parts[1];
        if (parts.length >= 3) data.links = parts.slice(2).join(' | ');
    }

    // 3. Summary
    const summaryMatch = latex.match(/\\section\{Summary\}\n(.*?)\n\n/s);
    if (summaryMatch) data.summary = unesc(summaryMatch[1].trim());

    // 4. Skills
    const skillsMatch = latex.match(/\\section\{Technical Skills\}\n(?:\\small\{)?(.*?)(?:\})?\n/s);
    if (skillsMatch) data.skills = unesc(skillsMatch[1].trim());

    // 5. Experience (Very basic parser)
    const expRegex = /\\textbf\{(.*?)\} \\hfill (.*?)\s*\\\\\s*\\textit\{\\small (.*?)\}(.*?)(?=\\section|\\end\{document\}|\\textbf\{|$)/gs;
    const experiences = [];
    let match;
    while ((match = expRegex.exec(latex)) !== null) {
        let details = match[4].replace(/\\begin\{itemize\}|\\end\{itemize\}|\\item \\small\{|\}/g, '').trim();
        details = details.replace(/\\textit\{\\small .*?\}/g, '').trim(); // Remove loc
        experiences.push({
            role: unesc(match[1]),
            dates: unesc(match[2]),
            company: unesc(match[3]),
            details: unesc(details)
        });
    }
    if (experiences.length > 0) data.experience = experiences;

    return data;
}

window.checkoutPlan = async function (tierId) {
    if (!currentUser) {
        alert("Please sign in to upgrade!");
        window.location.href = 'signup.html';
        return;
    }

    const planNames = { 'jobhunter': 'Job Hunter (Monthly)', 'student': 'Student Pass (Yearly)' };
    const name = planNames[tierId] || tierId;

    if (confirm(`Proceed to payment for ${name}? (Simulation)`)) {
        try {
            await updateUserTier(currentUser.uid, tierId);
            alert("Payment successful! Your account has been upgraded.");
            window.location.href = 'index.html#app';
        } catch (e) {
            console.error(e);
            alert("Error upgrading tier: " + e.message);
        }
    }
};

// (Moved to top area)

window.cloudRecompileLatex = function () {
    const rawCode = document.getElementById('latex-code-input').value;
    const btn = event.currentTarget || document.querySelector('button[onclick="cloudRecompileLatex()"]');
    const original = btn.innerHTML;

    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up fa-bounce mr-2"></i>Compiling...';
    btn.disabled = true;

    try {
        // 1. Prepare Hidden Form
        const form = document.getElementById('cloud-latex-form');
        const input = document.getElementById('cloud-latex-text');
        input.value = rawCode;

        // 2. Prepare Preview Container with Iframe
        const previewContainer = document.getElementById('preview-page');
        previewContainer.innerHTML = `
            <div class="w-full h-full flex flex-col">
                <div class="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 border-b border-indigo-100 flex justify-between items-center">
                    <span><i class="fa-solid fa-cloud mr-1"></i> Cloud Rendered PDF</span>
                    <button onclick="recompileLatex()" class="hover:underline font-bold">Back to Fast Preview</button>
                </div>
                <iframe name="preview-iframe" id="preview-iframe" class="flex-1 w-full border-none bg-gray-100"></iframe>
            </div>
        `;

        // 3. Submit form to iframe target
        form.submit();

        // 4. Cleanup UI State after a delay (since we can't detect when iframe finishes loading easily)
        setTimeout(() => {
            btn.innerHTML = original;
            btn.disabled = false;
        }, 2000);

    } catch (e) {
        console.error(e);
        alert("Cloud compilation failed. Falling back to local preview.");
        _renderLocalLatex(rawCode);
        btn.innerHTML = original;
        btn.disabled = false;
    }
};

function _renderLocalLatex(rawCode) {
    let previewCode = rawCode;
    const unsupportedPackages = ['fullpage', 'titlesec', 'marvosym', 'verbatim', 'enumitem', 'fancyhdr', 'babel', 'tabularx', 'latexsym', 'color', 'hyperref', 'glyphtounicode'];
    unsupportedPackages.forEach(pkg => {
        const regex = new RegExp(`\\\\usepackage\\[.*?\\]\\{${pkg}\\}|\\\\usepackage\\{${pkg}\\}`, 'g');
        previewCode = previewCode.replace(regex, `% [Removed ${pkg}]`);
    });

    // Patch out specific non-standard commands that crash LaTeX.js
    const brokenCommands = ['\\titleformat', '\\titlespacing', '\\fancyhf', '\\fancyfoot', '\\renewcommand{\\headrulewidth}', '\\renewcommand{\\footrulewidth}', '\\addtolength', '\\urlstyle', '\\raggedbottom', '\\raggedright', '\\setlength{\\tabcolsep}', '\\pdfgentounicode'];
    brokenCommands.forEach(cmd => {
        const regex = new RegExp(`\\${cmd.replace(/\\/g, '\\\\')}.*?($|\\n)`, 'g');
        previewCode = previewCode.replace(regex, `% [Patched ${cmd}] \n`);
    });

    previewCode = previewCode.replace(/\\begin\{tabular\*\}\{.*?\}\{(.*?)\}/g, '\\begin{tabular}{$1}');
    previewCode = previewCode.replace(/\\end\{tabular\*\}/g, '\\end{tabular}');

    if (!previewCode.includes('\\newcommand{\\hfill}')) {
        previewCode = previewCode.replace(/\\begin\{document\}/, '\\newcommand{\\hfill}{\\hspace{\\fill}}\\begin{document}');
    }

    const generator = new latexjs.HtmlGenerator({ hyphenate: false });
    try {
        const parsed = latexjs.parse(previewCode, { generator: generator });
        const previewContainer = document.getElementById('preview-page');
        previewContainer.innerHTML = '';

        const style = document.createElement('style');
        style.innerHTML = `
            .latex-container { font-family: 'Merriweather', serif !important; color: #000 !important; width: 100%; }
            .latex-container h1, .latex-container h2, .latex-container h3 { font-family: 'Merriweather', serif !important; }
            .latex-container section h1 { border-bottom: 1px solid #000; margin-bottom: 5pt; font-variant: small-caps; }
        `;
        previewContainer.appendChild(style);

        const wrapper = document.createElement('div');
        wrapper.className = 'latex-container w-full';
        wrapper.appendChild(parsed.domFragment());
        previewContainer.appendChild(wrapper);

    } catch (e) {
        const previewContainer = document.getElementById('preview-page');
        if (previewContainer) {
            previewContainer.innerHTML = `<div class="p-6 text-red-600 font-mono text-sm bg-red-50 border border-red-100 rounded-lg">
                <h4 class="font-bold mb-2"><i class="fa-solid fa-triangle-exclamation mr-2"></i>LaTeX Preview Error</h4>
                <p class="mb-2 text-xs text-gray-600">Note: Your code is probably valid LaTeX, but our live-preview engine (LaTeX.js) has limitations. Use "Export to LaTeX" for the full result.</p>
                <hr class="my-2 border-red-200">
                <pre class="whitespace-pre-wrap">${e.message}</pre>
            </div>`;
        }
    }
}

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

// --- LaTeX SOURCE GENERATION ---
// --- LaTeX SOURCE GENERATION (Jake's Resume Style) ---
function generateLaTeXSource(applyMask, isForExport = false) {
    const privacySettings = JSON.parse(localStorage.getItem('resutex_privacy') || '{}');
    const masterEnabled = localStorage.getItem('resutex_privacy_master') === 'true';

    // Alignment helper: LaTeX.js doesn't support \extracolsep{\fill} well, 
    // so we use a simple tabular for preview and the real deal for export.
    const startSubheading = (l1, r1, l2, r2) => {
        if (isForExport) {
            return `\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}\n  \\textbf{${l1}} & ${r1} \\\\\n  \\textit{\\small ${l2}} & \\textit{\\small ${r2}} \\\\\n\\end{tabular*}\\vspace{-7pt}\n\n`;
        } else {
            // Simplified for LaTeX.js preview
            return `\\textbf{${l1}} \\hfill ${r1} \\\\\n\\textit{\\small ${l2}} \\hfill \\textit{\\small ${r2}}\n\n`;
        }
    };

    const esc = (str) => {
        if (!str) return '';
        return str
            .replace(/\\/g, '\\textbackslash ')
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\$/g, '\\$')
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/~/g, '\\textasciitilde ')
            .replace(/\^/g, '\\textasciicircum ');
    };

    const mask = (text, field) => {
        if (!text) return '';
        if (applyMask && masterEnabled && privacySettings[field]) {
            if (field === 'name') return text.replace(/[a-zA-Z]/g, 'X');
            if (field === 'email') return 'xxx@example.com';
            if (field === 'phone') return 'XXX-XXX-XXXX';
            if (field === 'links') return 'xxxxxxx.com';
            return 'XXXXXXXXXX';
        }
        return esc(text);
    };

    const r = resumeData;

    let tex = "";
    if (isForExport) {
        // Full Jake's Resume Preamble
        tex += `%-------------------------\n% Resume in Latex\n% Generated by ResuTeX\n%------------------------\n\n`;
        tex += `\\documentclass[letterpaper,11pt]{article}\n\n`;
        tex += `\\usepackage{latexsym}\n\\usepackage[empty]{fullpage}\n\\usepackage{titlesec}\n\\usepackage{marvosym}\n\\usepackage[usenames,dvipsnames]{color}\n\\usepackage{verbatim}\n\\usepackage{enumitem}\n\\usepackage[hidelinks]{hyperref}\n\\usepackage{fancyhdr}\n\\usepackage[english]{babel}\n\\usepackage{tabularx}\n\\input{glyphtounicode}\n\n`;
        tex += `\\pagestyle{fancy}\n\\fancyhf{} % clear all header and footer fields\n\\fancyfoot{}\n\\renewcommand{\\headrulewidth}{0pt}\n\\renewcommand{\\footrulewidth}{0pt}\n\n`;
        tex += `% Adjust margins\n\\addtolength{\\oddsidemargin}{-0.5in}\n\\addtolength{\\evensidemargin}{-0.5in}\n\\addtolength{\\textwidth}{1in}\n\\addtolength{\\topmargin}{-.5in}\n\\addtolength{\\textheight}{1.0in}\n\n`;
        tex += `\\urlstyle{same}\n\\raggedbottom\n\\raggedright\n\\setlength{\\tabcolsep}{0in}\n\n`;
        tex += `% Sections formatting\n\\titleformat{\\section}{\n  \\vspace{-4pt}\\scshape\\raggedright\\large\n}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]\n\n`;
        tex += `\\pdfgentounicode=1\n\n\\begin{document}\n\n`;
    } else {
        // Simplified for LaTeX.js preview
        tex += `\\documentclass{article}\n\\begin{document}\n\n`;
    }

    // --- HEADING ---
    tex += `\\begin{center}\n`;
    tex += `    \\textbf{\\Huge \\scshape ${mask(r.name, 'name')}} \\\\ \\vspace{1pt}\n`;
    const contactParts = [mask(r.phone, 'phone'), mask(r.email, 'email'), mask(r.links, 'links')].filter(Boolean);
    tex += `    \\small ${contactParts.join(' $|$ ')}\n`;
    tex += `\\end{center}\n\n`;

    // --- SUMMARY (Optional) ---
    if (r.summary) {
        tex += `\\section{Summary}\n${esc(r.summary)}\n\n`;
    }

    // --- EDUCATION ---
    if (r.education && r.education.length > 0) {
        tex += `\\section{Education}\n`;
        if (isForExport) tex += `\\begin{itemize}[leftmargin=0.15in, label={}]\n`;
        r.education.forEach(edu => {
            tex += startSubheading(esc(edu.school), esc(edu.dates), esc(edu.degree), "");
            if (edu.details) {
                if (isForExport) {
                    tex += `\\begin{itemize}\n\\item \\small{${esc(edu.details)}}\n\\end{itemize}\n`;
                } else {
                    tex += `\\small{${esc(edu.details)}}\n\n`;
                }
            }
        });
        if (isForExport) tex += `\\end{itemize}\n\n`;
    }

    // --- EXPERIENCE ---
    if (r.experience && r.experience.length > 0) {
        tex += `\\section{Experience}\n`;
        if (isForExport) tex += `\\begin{itemize}[leftmargin=0.15in, label={}]\n`;
        r.experience.forEach(exp => {
            // Role and Company/Dates/Loc (Jake's uses Company first usually, but we swap to match user inputs)
            tex += startSubheading(esc(exp.role), esc(exp.dates), esc(exp.company), "");

            if (exp.details) {
                const bullets = exp.details.split('\n').filter(d => d.trim());
                if (bullets.length > 0) {
                    tex += `\\begin{itemize}\n`;
                    bullets.forEach(b => {
                        const clean = b.replace(/^[\u2022\-\*]\s*/, '');
                        tex += `  \\item \\small{${esc(clean)}}\n`;
                    });
                    tex += `\\end{itemize}\n`;
                }
            }
        });
        if (isForExport) tex += `\\end{itemize}\n\n`;
    }

    // --- SKILLS ---
    if (r.skills) {
        tex += `\\section{Technical Skills}\n`;
        if (isForExport) {
            tex += `\\begin{itemize}[leftmargin=0.15in, label={}]\n  \\small{\\item{${esc(r.skills)}}}\n\\end{itemize}\n`;
        } else {
            tex += `\\small{${esc(r.skills)}}\n`;
        }
    }

    tex += `\\end{document}\n`;
    return tex;
}

window.exportToTeX = function () {
    // Tier Check
    const tier = currentUserProfile?.tier || 'free';
    if (tier === 'free') {
        alert("The .tex source export is a premium feature! Please upgrade to the Job Hunter or Student plan to unlock it.");
        window.viewPlans();
        return;
    }

    let tex;
    if (isAdvancedMode) {
        tex = document.getElementById('latex-code-input').value;
    } else {
        tex = generateLaTeXSource(false, true); // Use real hfill for export
    }

    const blob = new Blob([tex], { type: 'text/x-tex' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (resumeData.name || 'resume').replace(/\s+/g, '_') + '.tex';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
            await saveResume(currentUser.uid, resumeData, currentResumeId);
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
    renderExperienceFields();
    renderEducationFields();
}

// --- RENDER PREVIEW (Real LaTeX via LaTeX.js with HTML fallback) ---
let _renderTimer = null;
function renderPreview() {
    clearTimeout(_renderTimer);
    _renderTimer = setTimeout(_doRender, 150);
}

function _doRender() {
    const previewContainer = document.getElementById('preview-page');
    if (!previewContainer) return;

    if (isAdvancedMode) {
        previewContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                <div class="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 max-w-sm">
                    <i class="fa-solid fa-code text-indigo-400 text-4xl mb-4"></i>
                    <h3 class="text-indigo-900 font-bold text-lg mb-2">Code Editor Active</h3>
                    <p class="text-indigo-600/70 text-sm leading-relaxed">
                        Live preview is disabled while editing raw LaTeX to ensure performance. 
                        Click <strong>"Apply & Return"</strong> to see your changes in the Content Editor.
                    </p>
                </div>
            </div>
        `;
        return;
    }

    // Try LaTeX.js rendering first
    if (typeof latexjs !== 'undefined') {
        try {
            let texSource = generateLaTeXSource(true, false);

            // Add \hfill shim if missing
            if (!texSource.includes('\\newcommand{\\hfill}')) {
                texSource = texSource.replace(/\\begin\{document\}/, '\\newcommand{\\hfill}{\\hspace{\\fill}}\\begin{document}');
            }

            const generator = new latexjs.HtmlGenerator({ hyphenate: false });
            const parsed = latexjs.parse(texSource, { generator: generator });

            // Inject LaTeX.js stylesheets (only once)
            if (!window._latexStylesLoaded) {
                const styles = parsed.stylesAndScripts("https://cdn.jsdelivr.net/npm/latex.js/dist/");
                document.head.appendChild(styles);
                window._latexStylesLoaded = true;

                // Protect global UI from LaTeX.js "body" styles
                const styleFix = document.createElement('style');
                styleFix.textContent = `
                    body { font-size: 16px !important; overflow: auto !important; height: auto !important; }
                    .latex-container { width: 100%; height: 100%; }
                `;
                document.head.appendChild(styleFix);
            }

            previewContainer.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'latex-container';
            wrapper.appendChild(parsed.domFragment());
            previewContainer.appendChild(wrapper);
            return;
        } catch (latexErr) {
            console.warn("LaTeX.js parse error, falling back to HTML preview:", latexErr.message);
        }
    }

    // --- FALLBACK: HTML Preview ---
    _renderHTMLFallback(previewContainer);
}

function _renderHTMLFallback(previewContainer) {
    const privacySettings = JSON.parse(localStorage.getItem('resutex_privacy') || '{}');
    const masterEnabled = localStorage.getItem('resutex_privacy_master') === 'true';

    const sanitize = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    const mask = (text, field) => {
        if (!text) return '';
        if (masterEnabled && privacySettings[field]) {
            if (field === 'name') return text.replace(/[a-zA-Z]/g, 'X');
            if (field === 'email') return 'xxx@example.com';
            if (field === 'phone') return 'XXX-XXX-XXXX';
            if (field === 'links') return 'xxxxxxx.com';
            return 'X'.repeat(10);
        }
        return sanitize(text);
    };

    let html = `
        <div class="text-center border-b pb-4 mb-4">
            <h1 class="text-3xl font-bold uppercase tracking-wide text-gray-900 mb-1">${mask(resumeData.name, 'name')}</h1>
            <div class="text-sm text-gray-600">
                ${mask(resumeData.email, 'email')} | ${mask(resumeData.phone, 'phone')} | ${mask(resumeData.links, 'links')}
            </div>
        </div>
        <div class="mb-4"><p class="text-sm text-gray-700 leading-relaxed">${sanitize(resumeData.summary)}</p></div>
        <div class="mb-4">
            <h2 class="text-lg font-bold text-gray-800 border-b-2 border-gray-300 mb-2 uppercase tracking-wider">Experience</h2>
            <div class="space-y-3">`;

    resumeData.experience.forEach(exp => {
        html += `<div>
            <div class="flex justify-between items-baseline mb-1">
                <h3 class="font-bold text-gray-800 text-sm">${sanitize(exp.role)}</h3>
                <span class="text-xs text-gray-500 font-medium">${sanitize(exp.dates)}</span>
            </div>
            <div class="text-sm text-gray-700 italic mb-1">${sanitize(exp.company)}</div>
            <ul class="list-disc list-inside text-xs text-gray-600 space-y-0.5 ml-1">
                ${sanitize(exp.details).split('\n').map(d => `<li>${d.replace(/^•\s*/, '')}</li>`).join('')}
            </ul></div>`;
    });

    html += `</div></div><div class="mb-4">
        <h2 class="text-lg font-bold text-gray-800 border-b-2 border-gray-300 mb-2 uppercase tracking-wider">Education</h2>`;

    resumeData.education.forEach(edu => {
        html += `<div class="mb-2">
            <div class="flex justify-between items-baseline">
                <h3 class="font-bold text-gray-800 text-sm">${sanitize(edu.school)}</h3>
                <span class="text-xs text-gray-500">${sanitize(edu.dates)}</span>
            </div>
            <div class="text-xs text-gray-700">${sanitize(edu.degree)}</div>
            <div class="text-xs text-gray-500 italic">${sanitize(edu.details)}</div></div>`;
    });

    html += `</div><div>
        <h2 class="text-lg font-bold text-gray-800 border-b-2 border-gray-300 mb-2 uppercase tracking-wider">Skills</h2>
        <p class="text-xs text-gray-700 leading-relaxed">${sanitize(resumeData.skills)}</p></div>`;

    previewContainer.innerHTML = html;
}



// --- INIT ---
function init() {
    console.log("Initializing App...");
    monitorAuthState(async (user) => {
        console.log("Auth state changed. User:", user ? user.uid : "None");
        if (user) {
            currentUser = user;

            // Fetch Profile/Tier
            getUserProfile(user.uid).then(async (profile) => {
                if (profile && !profile.tier) {
                    console.log("Tier missing for existing user, initializing to free...");
                    await updateUserTier(user.uid, "free");
                    profile.tier = "free";
                }

                currentUserProfile = profile;

                // Sync Credits
                credits = profile?.credits || 0;
                if (document.getElementById('credit-balance')) {
                    document.getElementById('credit-balance').textContent = credits;
                }

                // Update Tier Badge
                const badge = document.getElementById('user-plan-badge');
                if (badge) {
                    const tier = profile?.tier || 'free';
                    badge.className = `ml-auto plan-badge plan-${tier}`;

                    let label = tier.charAt(0).toUpperCase() + tier.slice(1);
                    if (tier === 'jobhunter') label = "Job Hunter";
                    if (tier === 'student') label = "Student";

                    badge.textContent = label;
                    badge.classList.remove('hidden');
                }

                if (profile?.tier) {
                    console.log("User Tier:", profile.tier);
                }
            });

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

            // Load Resumes
            await loadResumes();
        } else {
            currentUser = null;
            if (document.getElementById('nav-guest')) document.getElementById('nav-guest').classList.remove('hidden');
            if (document.getElementById('nav-user')) document.getElementById('nav-user').classList.add('hidden');

            // If guest, try to restore local work
            restoreFromLocal();
        }

        // Auto-open app if hash is #app
        if (window.location.hash === '#app' && user) {
            console.log("Hash is #app and user exists, going to app view");
            window.goToApp();
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
                if (currentUser) saveResume(currentUser.uid, resumeData, currentResumeId);
            });
        }
    });
    // LaTeX Editor Autosave/Preview
    const latexEditor = document.getElementById('latex-code-input');
    if (latexEditor) {
        latexEditor.addEventListener('input', (e) => {
            if (isAdvancedMode) {
                recompileLatexDebounced();
            }
        });
    }
}

// Run init immediately (as we are a module, DOM is ready or already loaded)
init();
