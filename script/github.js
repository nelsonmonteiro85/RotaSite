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
    return localStorage.getItem("github_token") || null;
}

function askForGitHubToken() {
    const token = prompt("Enter your GitHub Personal Access Token:");
    if (token) localStorage.setItem("github_token", token);
    return token;
}

// ===============================
// LOAD FILE FROM GITHUB
// ===============================
async function loadGitHubJSON(path) {
    const url = `https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}/${path}`;
    const res = await fetch(url);
    return await res.json();
}

// ===============================
// SAVE FILE TO GITHUB
// ===============================
async function saveGitHubJSON(path, jsonData) {
    let token = getGitHubToken();
    if (!token) token = askForGitHubToken();
    if (!token) return alert("Cannot save without a GitHub token.");

    const apiURL = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${path}`;

    // Get current SHA
    const current = await fetch(apiURL).then(r => r.json());
    const sha = current.sha;

    const body = {
        message: `Update ${path}`,
        content: btoa(encodeURIComponent(JSON.stringify(jsonData, null, 2)).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode('0x' + p1)
        )),

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
        alert("Failed to save to GitHub.");
        return false;
    }

    return true;
}
