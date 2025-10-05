
let currentUID = null;
let tasks = [];

const API_BASE_URL = "http://127.0.0.1:8000";

function showPage(pageId) {
    document.getElementById("landingPage").classList.add("d-none");
    document.getElementById("loginPage").classList.add("d-none");
    document.getElementById("dashboard").classList.add("d-none");

    const page = document.getElementById(pageId);
    if (page) {
        page.classList.remove("d-none");
        if (pageId === 'landingPage' || pageId === 'loginPage') {
            document.getElementById("app").classList.remove("container");
            document.getElementById("app").classList.add("d-flex", "align-items-center", "justify-content-center");
        } else {
            document.getElementById("app").classList.add("container");
            document.getElementById("app").classList.remove("d-flex", "align-items-center", "justify-content-center");
        }
    }
}

function showLandingPage() {
    showPage("landingPage");
}

function showLoginForm() {
    if (currentUID) {
        showDashboard();
        return;
    }
    showPage("loginPage");
}

async function showDashboard() {
    if (!currentUID) return showLoginForm();
    showPage("dashboard");
    const list = document.getElementById("taskList");
    list.innerHTML = '<li class="list-group-item text-center text-muted">History is disabled in demo mode. Only the last generated task is shown.</li>';
    renderTasks();
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();

        if (response.ok && result.success) {
            currentUID = result.uid;
            localStorage.setItem("uid", result.uid);
            alert(result.message);
            showDashboard();
        } else {
            alert("Login Failed: " + (result.detail || "Invalid credentials. Use admin@demo.com / password123."));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Check console.');
    }
}

async function showRegister() {
    alert("Registration is disabled in demo mode. Please log in with admin@demo.com and password123.");
}

function showUpdatePasswordModal() {
    alert("Password update is disabled in demo mode.");
}

async function updatePassword() {
    alert("Password update is disabled in demo mode.");
}


// === DASHBOARD & TASK MANAGEMENT (Simplified) ===

// In demo mode, this function is only used to display the very last task generated.
function renderTasks() {
    const list = document.getElementById("taskList");
    // Do not clear the list placeholder here, it's done in showDashboard
    
    if (tasks.length === 0) {
        return; 
    }

    // Only display the most recent task for the demo
    const task = tasks[0];
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
        <div>
            <strong>${task.prompt.slice(0, 30) + (task.prompt.length > 30 ? "..." : "")}</strong>
            <small class="d-block text-muted">Latest Generation</small>
        </div>
        <span class="badge bg-primary rounded-pill">View</span>
    `;
    // Clear the existing list and add the new item
    list.innerHTML = '';
    list.appendChild(li);
    li.onclick = () => showTaskDetails(task.id);
}

// Note: task.output now has video_script, poster_content, email_content
// app.js (The Corrected showTaskDetails function)

function showTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId); 
    if (!task) return;

    const details = document.getElementById("taskDetails");

    let imageHtml = task.image_url && task.image_url !== "PLACEHOLDER_FOR_IMAGE" ? `<div class="mb-3"><img src="${task.image_url}" alt="Product Image" class="img-fluid rounded shadow-sm"></div>` : '';

    details.innerHTML = `
        <h4 class="text-primary mb-3">Generation Result</h4>
        ${imageHtml}
        
        <div class="mb-3">
            <strong>Prompt:</strong>
            <p class="text-muted fst-italic">${task.prompt}</p>
        </div>

        <div class="mb-4">
            <strong>Target Audience:</strong>
            <p class="text-info">${task.audience}</p>
        </div>

        <h5>Marketing Outputs:</h5>
        
        <div class="card p-3 mb-2 bg-light">
            <strong>Tagline:</strong>
            <p class="mb-0 text-success fw-bold">${task.output.tagline}</p>
        </div>

        <div class="card p-3 mb-2 bg-light">
            <strong>Poster Content:</strong>
            <div class="marketing-output-box">
                <p class="mb-0">${task.output.poster_content}</p>
            </div>
        </div>

        <div class="card p-3 mb-2 bg-light">
            <strong>Email Content:</strong>
            <div class="marketing-output-box p-2 bg-white border rounded">
                <pre class="mb-0">${task.output.email_content}</pre> 
            </div>
        </div>

        <div class="card p-3 mb-2 bg-light">
            <strong>Video Script (Reel/Shorts):</strong>
            <div class="marketing-output-box p-2 bg-white border rounded">
                <pre class="mb-0">${task.output.video_script}</pre> 
            </div>
        </div>
    `;

    details.classList.remove("d-none");
}

// === NEW TASK API LOGIC (Fixed to update local state) ===
function showNewTaskModal() {
    // Clear previous inputs
    document.getElementById("promptInput").value = "";
    document.getElementById("audienceInput").value = "";
    document.getElementById("imageInput").value = "";
    document.getElementById("imagePreview").src = "";
    document.getElementById("imagePreview").classList.add("d-none");

    const modal = new bootstrap.Modal(document.getElementById("newTaskModal"));
    modal.show();
}

function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById("imagePreview");
        img.src = e.target.result;
        img.classList.remove("d-none");
    }
    reader.readAsDataURL(file);
}

async function createTask() {
    if (!currentUID) {
        alert("You must be logged in to create a task.");
        return;
    }

    const prompt = document.getElementById("promptInput").value;
    const audience = document.getElementById("audienceInput").value;
    const imageElement = document.getElementById("imagePreview");
    
    const imageBase64 = imageElement.classList.contains("d-none") ? null : imageElement.src;

    if (!prompt || !audience) {
        alert("Please enter both product prompt and audience.");
        return;
    }
    
    const modalButton = document.querySelector('#newTaskModal .modal-footer .btn-primary');
    const originalText = modalButton.textContent;
    modalButton.disabled = true;
    modalButton.textContent = 'Generating... Please wait';

    try {
        const response = await fetch(`${API_BASE_URL}/api/generate_task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                uid: currentUID, 
                prompt: prompt, 
                audience: audience, 
                image_base64: imageBase64 
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            
            // --- CRITICAL FIX: Manually construct and store the task ---
            const newTask = {
                id: result.task_id,
                prompt: prompt,
                audience: audience,
                image_url: imageBase64,
                output: result.output // Gemini's output
            };
            
            // In DEMO MODE, replace the whole array with the new task
            tasks = [newTask]; 
            
            alert(result.message);
            
            renderTasks();
            showTaskDetails(newTask.id); // Display the new task immediately

        } else {
            alert("Generation Failed: " + (result.detail || "Unknown error. Check console."));
        }

    } catch (error) {
        console.error('Task creation error:', error);
        alert('An error occurred during task generation. Check console.');
    } finally {
        // Close and reset modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("newTaskModal"));
        modal.hide();
        modalButton.disabled = false;
        modalButton.textContent = originalText;
    }
}


// === INITIALIZATION ===
// Check localStorage for UID on page load
window.onload = () => {
    const storedUID = localStorage.getItem("uid");
    // In demo mode, we only proceed if the stored UID matches the demo UID
    if (storedUID && storedUID === 'DEMO_UID_001') { 
        currentUID = storedUID;
        showDashboard();
    } else {
        showLandingPage();
    }
};