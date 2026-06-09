/* ============================================================
   DATA MODEL
============================================================ */
let operators = [];
let training = {};
let moduleHistory = {};   // per-module usage per operator
let operatorHistory = {}; // total usage per operator

/* ============================================================
   LOAD
============================================================ */
async function loadDataRota() {
    operators = await loadGitHubJSON(GH_OPERATORS_PATH);
    training = await loadGitHubJSON(GH_TRAINING_PATH);
}

/* ============================================================
   HELPERS
============================================================ */
function normalize(str) {
    return str.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getTrainedOpsFor(moduleName, line) {
    const key = normalize(moduleName);

    return operators.filter(op => {
        if (op.line !== line) return false;
        if (op.inTraining) return false;

        const trainedList = training[op.name] || [];
        return trainedList.includes(key);
    });
}

// Peel conflict: never Peel1 → Peel2 or Peel2 → Peel1 on next break
function violatesPeelRule(mod, prevPeel1, prevPeel2, opName) {
    if (mod === "Peel 1" && opName === prevPeel2) return true;
    if (mod === "Peel 2" && opName === prevPeel1) return true;
    return false;
}

/* ============================================================
   BREAKS
============================================================ */
function getBreakGroups(line) {
    const firstBreak = [];
    const secondBreak = [];

    operators.forEach(op => {
        if (op.line !== line) return;
        if (op.line === "__") return;
        if (op.breakGroup === "__") return;
        if (op.inTraining) return;

        if (op.breakGroup === 1) firstBreak.push(op.name);
        else if (op.breakGroup === 2) secondBreak.push(op.name);
    });

    return { firstBreak, secondBreak };
}

function renderBreakGrid(line) {
    const data = getBreakGroups(line);

    let container = document.getElementById("breakGrid");
    if (!container) {
        container = document.createElement("div");
        container.id = "breakGrid";
        container.style.display = "none";
        document.body.appendChild(container);
    }

    const maxRows = Math.max(data.firstBreak.length, data.secondBreak.length, 1);

    let html = `
    <table class="rota-table">
      <tr><th>1st Break</th><th>2nd Break</th></tr>
  `;

    for (let i = 0; i < maxRows; i++) {
        html += `
      <tr>
        <td>${data.firstBreak[i] || ""}</td>
        <td>${data.secondBreak[i] || ""}</td>
      </tr>
    `;
    }

    html += `</table>`;
    container.innerHTML = html;
}

/* ============================================================
   ROTA GENERATION (RULES 1–3)
============================================================ */
function generateRotaForLine(line) {
    const rotaModules = modules.filter(m => normalize(m) !== "training");
    const table = document.getElementById("rotaTable");
    const extrasDiv = document.getElementById("extras");
    const title = document.getElementById("rotaTitle");

    if (!table || !extrasDiv || !title) return;

    title.textContent = `MTO Rota — Line ${line}`;
    table.innerHTML = "";
    extrasDiv.innerHTML = "";

    // init histories
    moduleHistory = {};
    operatorHistory = {};
    rotaModules.forEach(m => (moduleHistory[m] = {}));

    let html = "<tr><th>Break</th>";
    rotaModules.forEach(m => {
        html += `<th>${m}</th>`;
    });
    html += "</tr>";

    const assignments = [];

    timeSlots.forEach((slot, slotIdx) => {
        const row = { break: slot, cells: {} };
        const used = new Set(); // operators already used in this break

        const prevRow = assignments[slotIdx - 1];
        const prevPeel1 = prevRow ? prevRow.cells["Peel 1"] : null;
        const prevPeel2 = prevRow ? prevRow.cells["Peel 2"] : null;

        rotaModules.forEach(moduleName => {
            const trained = getTrainedOpsFor(moduleName, line);

            if (trained.length === 0) {
                row.cells[moduleName] = "N/A";
                return;
            }

            // STEP 1: full rule set
            let candidates = trained.filter(op => {
                const name = op.name;

                // RULE 2: No repeat in same break
                if (used.has(name)) return false;

                // RULE 5: No Peel1 ↔ Peel2 swap
                if (violatesPeelRule(moduleName, prevPeel1, prevPeel2, name)) return false;

                // RULE B: No repeat of same module anywhere in shift
                const hasDoneModuleBefore = (moduleHistory[moduleName][name] || 0) > 0;
                const onlyOneTrained = trained.length === 1;

                if (hasDoneModuleBefore && !onlyOneTrained) return false;

                return true;
            });


            // STEP 2: relax column rule if none (allow repeat in column)
            if (candidates.length === 0) {
                candidates = trained.filter(op => {
                    const name = op.name;
                    if (used.has(name)) return false; // still no repeat in row
                    if (violatesPeelRule(moduleName, prevPeel1, prevPeel2, name)) return false;
                    return true;
                });
            }

            // STEP 3: relax row rule if still none (shortage → allow row repeat)
            if (candidates.length === 0) {
                candidates = trained.filter(op => {
                    const name = op.name;
                    if (violatesPeelRule(moduleName, prevPeel1, prevPeel2, name)) return false;
                    return true;
                });
            }

            // If still none, give up → N/A
            if (candidates.length === 0) {
                row.cells[moduleName] = "N/A";
                return;
            }

            // Random but fair: shuffle then sort by usage
            candidates = candidates
                .sort(() => Math.random() - 0.5)
                .sort((a, b) => {
                    const aMod = moduleHistory[moduleName][a.name] || 0;
                    const bMod = moduleHistory[moduleName][b.name] || 0;
                    if (aMod !== bMod) return aMod - bMod;

                    const aTot = operatorHistory[a.name] || 0;
                    const bTot = operatorHistory[b.name] || 0;
                    return aTot - bTot;
                });

            const chosen = candidates[0];
            const name = chosen.name;

            row.cells[moduleName] = name;
            used.add(name);

            if (!moduleHistory[moduleName][name]) moduleHistory[moduleName][name] = 0;
            moduleHistory[moduleName][name]++;

            if (!operatorHistory[name]) operatorHistory[name] = 0;
            operatorHistory[name]++;
        });

        assignments.push(row);
    });

    // render table
    assignments.forEach(row => {
        html += `<tr><td>${row.break}</td>`;

        rotaModules.forEach(m => {
            const cls = `rota-col-${normalize(m)}`;
            html += `<td class="${cls}">${row.cells[m] || ""}</td>`;
        });

        html += "</tr>";
    });

    table.innerHTML = html;

    renderBreakGrid(line);
    renderExtras(assignments, operators, line, extrasDiv);
}

/* ============================================================
   INIT
============================================================ */
window.addEventListener("load", async () => {
    await loadDataRota();

    const lineSelect = document.getElementById("lineSelect");
    const btn = document.getElementById("generateBtn");

    if (btn && lineSelect) {
        btn.onclick = async () => {
            await loadDataRota();
            generateRotaForLine(parseInt(lineSelect.value, 10));
        };

        generateRotaForLine(parseInt(lineSelect.value, 10));
    }
});