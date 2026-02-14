import { monitorAuthState, saveResume, getResume, logoutUser, updateUserProfile } from './firebase-app.js';
let currentUser = null;
let resumeData = {
    name: "John Doe",
    phone: "+1 (555) 123-4567",
    email: "john.doe@example.com",
    links: "LinkedIn | GitHub/johndoe",
    summary: "Highly motivated individual with a passion for software development and a strong background in problem-solving and innovative design. Eager to contribute to dynamic teams and create impactful solutions.",
    experience: [
        { title: "Software Engineer", company: "Tech Innovations Inc.", years: "2023 - Present", description: "Developed and maintained web applications; collaborated with cross-functional teams; optimized database queries." },
        { title: "Intern", company: "Startup Solutions", years: "2022 - 2023", description: "Assisted senior engineers in various projects; performed code reviews; contributed to front-end development." }
    ],
    education: [
        { degree: "B.S. in Computer Science", university: "University of Technology", years: "2019 - 2023", gpa: "3.8/4.0" }
    ],
    skills: "JavaScript, Python, React, Node.js, SQL, Git, AWS"
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
window.downloadPDF = async function () {
    const previewPage = document.getElementById('preview-page');
    if (!previewPage) {
        alert("Resume preview not found!");
        return;
    }

    // Temporarily hide scrollbars or other elements that might interfere with rendering
    previewPage.style.overflow = 'visible';
    // Add a slight delay to ensure all DOM changes are applied before screenshot
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const canvas = await html2canvas(previewPage, {
            scale: 2, // Keep scale for better resolution
            useCORS: true // Enable CORS if you have external images
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgProps = pdf.getImageProperties(imgData);
        const imgCanvasWidth = imgProps.width;
        const imgCanvasHeight = imgProps.height;

        let ratio = imgCanvasWidth / imgCanvasHeight;

        let finalImgWidth = pdfWidth;
        let finalImgHeight = pdfWidth / ratio;

        // If calculated height exceeds PDF height, scale by height
        if (finalImgHeight > pdfHeight) {
            finalImgHeight = pdfHeight;
            finalImgWidth = pdfHeight * ratio;
        }

        // Center the image if it's smaller than the page
        const offsetX = (pdfWidth - finalImgWidth) / 2;
        const offsetY = (pdfHeight - finalImgHeight) / 2;


        // There is only one page as the content is designed for A4
        pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalImgWidth, finalImgHeight);

        pdf.save('resume.pdf');
        alert("PDF downloaded successfully!");

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to download PDF. Please try again.");
    } finally {
        previewPage.style.overflow = 'auto'; // Restore original overflow
    }
};

// --- SAMPLE DATA & AUTOSAVE ---
window.loadSampleData = async function () {
    if (!confirm("This will overwrite your current data. Continue?")) return;

    try {
        const response = await fetch('templates/deedy_resume.json'); // Adjusted path relative to index.html location
        if (!response.ok) throw new Error("Failed to load sample data");
        const data = await response.json();

        resumeData = { ...resumeData, ...data };
        updateFormInputs();
        renderPreview();
        saveToLocal(); // Auto-save the sample data
        alert("Sample data loaded!");
    } catch (e) {
        console.error(e);
        alert("Error loading sample data.");
    }
};

function saveToLocal() {
    localStorage.setItem('resutex_data', JSON.stringify(resumeData));
}

function restoreFromLocal() {
    const saved = localStorage.getItem('resutex_data');
    if (saved) {
        try {
            resumeData = { ...resumeData, ...JSON.parse(saved) };
            updateFormInputs();
            renderPreview();
            console.log("Restored from Local Storage");
        } catch (e) {
            console.error("Error parsing local storage", e);
        }
    }
}

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

function renderPreview() {
    const p = document.getElementById('preview-page');
    if (!p) return;
    p.innerHTML = `<div class="text-center mb-6"><div class="latex-h1">${resumeData.name}</div><div class="text-sm">${resumeData.phone} | ${resumeData.email}</div></div>
    <div class="latex-section">Summary</div><div>${resumeData.summary}</div>
    <div class="latex-section">Skills</div><div>${resumeData.skills}</div>`;
}


// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    monitorAuthState(async (user) => {
        if (user) {
            currentUser = user;
            // UI Updates
            document.getElementById('nav-guest')?.classList.add('hidden');
            document.getElementById('nav-user')?.classList.remove('hidden');
            if (document.getElementById('nav-user-name')) document.getElementById('nav-user-name').textContent = user.displayName || "User";
            if (document.getElementById('nav-user-email')) document.getElementById('nav-user-email').textContent = user.email;

            // Profile Pic
            if (user.photoURL) {
                document.getElementById('nav-user-photo').src = user.photoURL;
                document.getElementById('nav-user-photo').classList.remove('hidden');
                document.getElementById('nav-user-icon').classList.add('hidden');
            } else {
                document.getElementById('nav-user-photo').classList.add('hidden');
                document.getElementById('nav-user-icon').classList.remove('hidden');
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
            document.getElementById('nav-guest')?.classList.remove('hidden');
            document.getElementById('nav-user')?.classList.add('hidden');

            // If guest, try to restore local work
            restoreFromLocal();
        }
    });

    // Inputs with Autosave
    ['name', 'phone', 'email', 'links', 'summary', 'skills'].forEach(f => {
        document.getElementById('input-' + f)?.addEventListener('input', (e) => {
            resumeData[f] = e.target.value;
            renderPreview();
            saveToLocal();
            if (currentUser) saveResume(currentUser.uid, resumeData); // Cloud save (debouncing recommended in production)
        });
    });
});
