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

    // If no token stored, ask once
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



// /* ============================================================
//    REQUIRED CONSTANTS (DO NOT REMOVE)
// ============================================================ */
// const GH_OPERATORS_PATH = "data/operators.json";
// const GH_TRAINING_PATH = "data/training.json";

// /* ============================================================
//    TEMPORARY LOCAL STORAGE VERSION OF GITHUB FUNCTIONS
// ============================================================ */
// async function loadGitHubJSON(path) {
//     const key = "TEMP_" + path;

//     const raw = localStorage.getItem(key);
//     if (!raw) return {};

//     try {
//         return JSON.parse(raw);
//     } catch (e) {
//         console.error("TEMP load error:", e);
//         return {};
//     }
// }

// async function saveGitHubJSON(path, data) {
//     const key = "TEMP_" + path;

//     try {
//         localStorage.setItem(key, JSON.stringify(data, null, 2));
//         console.log("TEMP save OK:", key);
//         return true;
//     } catch (e) {
//         console.error("TEMP save error:", e);
//         return false;
//     }
// }

