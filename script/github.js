// ===============================
// GitHub API CONFIG
// ===============================
const GH_USER = "nelsonmonteiro85";
const GH_REPO = "RotaSite";
const GH_BRANCH = "main";

const GH_OPERATORS_PATH = "data/operators.json";
const GH_TRAINING_PATH = "data/training.json";

// ===============================
// TOKEN HANDLING
// ===============================
function getGitHubToken() {
    let token = localStorage.getItem("github_token");

    if (!token) {
        token = prompt("Enter your GitHub Personal Access Token:");

        if (token && token.trim() !== "") {
            localStorage.setItem("github_token", token);
        } else {
            alert("A GitHub token is required to save data.");
            return null;
        }
    }

    return token;
}

// ===============================
// LOAD FILE FROM GITHUB
// ===============================
async function loadGitHubJSON(path) {
    const url = `https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}/${path}`;
    const res = await fetch(url);

    if (!res.ok) {
        console.error("GitHub load error:", res.status, res.statusText);
        return {};
    }

    return await res.json();
}

// ===============================
// SAVE FILE TO GITHUB (REAL)
// ===============================
async function saveGitHubJSON(path, jsonData) {
    const token = getGitHubToken();
    if (!token) return false;

    const apiURL = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${path}`;

    // Get current SHA
    const current = await fetch(apiURL).then(r => r.json());
    const sha = current.sha;

    // Encode file content
    const encodedContent = btoa(
        unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2)))
    );

    const body = {
        message: `Update ${path}`,
        content: encodedContent,
        sha: sha,
        branch: GH_BRANCH
    };

    const res = await fetch(apiURL, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        console.error("GitHub save error:", await res.text());
        return false;
    }

    return true;
}

// ============================================================
// HYBRID MODE: LOCAL INSTANT SAVE + BACKGROUND GITHUB SYNC
// ============================================================

// Save instantly to localStorage (non-blocking)
function saveLocalJSON(path, data) {
    try {
        localStorage.setItem("LOCAL_" + path, JSON.stringify(data, null, 2));
        console.log("Local save OK:", path);
        return true;
    } catch (e) {
        console.error("Local save error:", e);
        return false;
    }
}

// Load from localStorage first (fast), fallback to GitHub
async function loadHybridJSON(path) {
    const local = localStorage.getItem("LOCAL_" + path);

    if (local) {
        try {
            return JSON.parse(local);
        } catch (e) {
            console.error("Local load error:", e);
        }
    }

    // If no local version, load from GitHub
    const remote = await loadGitHubJSON(path);
    saveLocalJSON(path, remote); // cache locally
    return remote;
}

// Queue for background GitHub sync
let githubSaveQueue = {};
let githubSaveTimer = null;

function queueGitHubSave(path, data) {
    githubSaveQueue[path] = data;

    if (!githubSaveTimer) {
        githubSaveTimer = setTimeout(processGitHubQueue, 1500);
    }
}

async function processGitHubQueue() {
    const queue = { ...githubSaveQueue };
    githubSaveQueue = {};
    githubSaveTimer = null;

    for (const path in queue) {
        const data = queue[path];
        console.log("Syncing to GitHub:", path);

        const ok = await saveGitHubJSON(path, data);

        if (!ok) {
            console.warn("GitHub save failed, retrying:", path);
            queueGitHubSave(path, data); // retry later
        }
    }
}

// ============================================================
// PUBLIC HYBRID SAVE FUNCTION
// ============================================================
function saveHybrid(path, data) {
    // 1. Save instantly (UI stays fast)
    saveLocalJSON(path, data);

    // 2. Queue GitHub save in background
    queueGitHubSave(path, data);
}
