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

let credits = 50; // Free user starts with small amount or the "5 free scans" logic

// --- Navigation ---
function goToApp() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('flex');
    renderPreview();
}

function goHome() {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('flex');
    document.getElementById('landing-page').classList.remove('hidden');
}

// --- Modal Logic ---
function showUpgradeModal() {
    document.getElementById('upgrade-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('upgrade-modal').classList.add('hidden');
}

function useAICredit(event, cost, successMsg) {
    if (credits >= cost) {
        credits -= cost;
        document.getElementById('credit-balance').innerText = credits;
        // Simulating AI action delay
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Working...`;
        setTimeout(() => {
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Done`;
            setTimeout(() => btn.innerHTML = originalText, 2000);
            // Here we would actually update the text field with AI response
        }, 1000);
    } else {
        showUpgradeModal();
    }
}

// --- AI Auto-Scan Simulation ---
function triggerAIScan() {
    document.getElementById('scan-overlay').classList.remove('hidden');
    
    // Simulate 2 second delay for parsing
    setTimeout(() => {
        // Populate with dummy data (based on the user's provided resume image content)
        resumeData = {
            name: "Aidan Blakley",
            phone: "+44 7342 256745",
            email: "aidan170206@icloud.com",
            links: "LinkedIn | GitHub",
            summary: "Aspiring Aerospace Engineering student with a distinction-level foundation in engineering, complemented by experience in logistics, project management, and entrepreneurial ventures. Eager to apply a strong work ethic, technical skills, and a passion for physics and mathematics to new challenges.",
            experience: [
                {
                    role: "Founder & E-commerce Manager",
                    company: "Remote Independent Reselling",
                    dates: "2023 – Present",
                    details: "• Engineered a custom sales bot in Python to automate transactions on third-party platforms.<br>• Manage and grow multiple social media platforms for the business.<br>• Currently building a new e-commerce store on Shopify to sell sourced products."
                },
                {
                    role: "Flex Delivery Driver",
                    company: "Amazon Flex (Bolton)",
                    dates: "Aug 2024 – Present",
                    details: "• Efficiently managed a high volume of local deliveries meeting strict deadlines.<br>• Utilised the Amazon Flex mobile application for route planning and navigation.<br>• Demonstrated exceptional problem-solving and reliability."
                }
            ],
            education: [
                {
                    school: "University Of Manchester",
                    degree: "MEng Aerospace Engineering",
                    dates: "Sep 2025 – Jun 2031",
                    details: "Manchester, UK"
                },
                {
                    school: "Bury College",
                    degree: "Level 3 Engineering – Distinction (Top of Year)",
                    dates: "Sep 2022 – Jul 2024",
                    details: "Bury, UK"
                }
            ],
            skills: "Technical: Python, Bot Development, Process Automation, Shopify, Microsoft Office Suite, Google Workspace.\nCore Competencies: Engineering Fundamentals, E-commerce Management, Logistics."
        };

        updateFormInputs();
        renderPreview();
        document.getElementById('scan-overlay').classList.add('hidden');
        
        // Deduct scan credits?
        // For this demo we won't strictly enforce the "5 scans" logic but visually show it works.
    }, 2000);
}

// --- Form <-> State Sync ---
function updateFormInputs() {
    document.getElementById('input-name').value = resumeData.name;
    document.getElementById('input-phone').value = resumeData.phone;
    document.getElementById('input-email').value = resumeData.email;
    document.getElementById('input-links').value = resumeData.links;
    document.getElementById('input-summary').value = resumeData.summary;
    document.getElementById('input-skills').value = resumeData.skills;
    
    // Render Experience inputs dynamic list
    const expList = document.getElementById('experience-list');
    expList.innerHTML = resumeData.experience.map((job, index) => `
        <div class="border-l-2 border-indigo-200 pl-3 mb-4">
            <input type="text" value="${job.role}" oninput="updateExperience(${index}, 'role', this.value)" class="w-full text-sm font-bold border-none bg-transparent focus:ring-0 p-0 mb-1" placeholder="Job Title">
            <input type="text" value="${job.company}" oninput="updateExperience(${index}, 'company', this.value)" class="w-full text-xs text-gray-500 border-none bg-transparent focus:ring-0 p-0 mb-1" placeholder="Company">
            <input type="text" value="${job.dates}" oninput="updateExperience(${index}, 'dates', this.value)" class="w-full text-xs text-gray-400 border-none bg-transparent focus:ring-0 p-0 mb-2" placeholder="Dates">
            <textarea rows="3" oninput="updateExperience(${index}, 'details', this.value)" class="w-full text-xs border border-gray-200 rounded p-1">${job.details.replace(/<br>/g, '\n')}</textarea>
        </div>
    `).join('');

    // Render Education inputs dynamic list
    const eduList = document.getElementById('education-list');
    eduList.innerHTML = resumeData.education.map((edu, index) => `
        <div class="border-l-2 border-indigo-200 pl-3 mb-4">
            <input type="text" value="${edu.school}" oninput="updateEducation(${index}, 'school', this.value)" class="w-full text-sm font-bold border-none bg-transparent focus:ring-0 p-0 mb-1">
            <input type="text" value="${edu.degree}" oninput="updateEducation(${index}, 'degree', this.value)" class="w-full text-xs text-gray-600 border-none bg-transparent focus:ring-0 p-0 mb-1">
            <input type="text" value="${edu.dates}" oninput="updateEducation(${index}, 'dates', this.value)" class="w-full text-xs text-gray-400 border-none bg-transparent focus:ring-0 p-0">
        </div>
    `).join('');
}

function updateExperience(index, field, value) {
    resumeData.experience[index][field] = value;
    renderPreview();
}

function updateEducation(index, field, value) {
    resumeData.education[index][field] = value;
    renderPreview();
}

// Listen for typing in main inputs
['name', 'phone', 'email', 'links', 'summary', 'skills'].forEach(field => {
    const element = document.getElementById(`input-${field}`);
    if (element) {
        element.addEventListener('input', (e) => {
            resumeData[field] = e.target.value;
            renderPreview();
        });
    }
});

// --- Render "LaTeX" Preview ---
function renderPreview() {
    const preview = document.getElementById('preview-page');
    
    // HTML Structure simulating LaTeX 'Modern' template
    // We use simple divs with specific classes defined in CSS
    let html = `
        <!-- Header -->
        <div class="text-center mb-6">
            <div class="latex-h1">${resumeData.name || "Your Name"}</div>
            <div class="text-sm">
                ${resumeData.phone} <span class="mx-1">|</span>
                <a href="#" class="text-blue-800 underline">${resumeData.email}</a> <span class="mx-1">|</span>
                ${resumeData.links}
            </div>
        </div>

        <!-- Summary -->
        ${resumeData.summary ? `
        <div class="latex-section">Summary</div>
        <div class="text-justify mb-2">
            ${resumeData.summary}
        </div>` : ''}

        <!-- Experience -->
        ${resumeData.experience.length > 0 ? `
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
        ${resumeData.education.length > 0 ? `
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

// Initial Render
document.addEventListener('DOMContentLoaded', function() {
    renderPreview();
    
    // Set up input listeners after DOM is ready
    ['name', 'phone', 'email', 'links', 'summary', 'skills'].forEach(field => {
        const element = document.getElementById(`input-${field}`);
        if (element) {
            element.addEventListener('input', (e) => {
                resumeData[field] = e.target.value;
                renderPreview();
            });
        }
    });
});
