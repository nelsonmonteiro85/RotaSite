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

function generateBreakGridHTML(line) {
    const data = getBreakGroups(line);
    const maxRows = Math.max(data.firstBreak.length, data.secondBreak.length, 1);

    let html = `
        <table class="rota-table break-table">
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
    return html;
}

/* ============================================================
   ROTA GENERATION - RULES
============================================================ */
function getFlexibility(op, line) {
    return modules.filter(m => {
        const key = normalize(m);
        const trainedList = training[op.name] || [];
        return trainedList.includes(key);
    }).length;
}

function generateRotaForLine(line) {
    const rotaModules = modules.filter(m => normalize(m) !== "training");

    const rotaModulesSorted = [...rotaModules].sort((a, b) => {
        return getTrainedOpsFor(a, line).length -
            getTrainedOpsFor(b, line).length;
    });

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
        const previousOperatorForModule = moduleName =>
            prevRow ? prevRow.cells[moduleName] : null;

        rotaModulesSorted.forEach(moduleName => {
            const trained = getTrainedOpsFor(moduleName, line);

            if (trained.length === 0) {
                row.cells[moduleName] = "N/A";
                return;
            }

            // STEP 1 — sort operators by flexibility (fewest skills first)
            const trainedSorted = [...trained].sort((a, b) => {
                const aSkills = getFlexibility(a, line);
                const bSkills = getFlexibility(b, line);
                return aSkills - bSkills;
            });

            // STEP 2 — apply rules
            let candidates = trainedSorted.filter(op => {
                const name = op.name;

                // RULE 1: Never do two modules in the same break
                if (used.has(name)) return false;

                // RULE 2: Never do the same module in consecutive breaks
                const prevOp = previousOperatorForModule(moduleName);
                if (prevOp === name) return false;

                // RULE 3: Peel1 ↔ Peel2 restriction
                if (violatesPeelRule(moduleName, prevPeel1, prevPeel2, name)) return false;

                return true;
            });

            if (candidates.length === 0) {
                row.cells[moduleName] = "N/A";
                return;
            }

            // Fairness
            candidates = candidates
                .sort(() => Math.random() - 0.5)
                .sort((a, b) => {
                    const aMod = moduleHistory[moduleName][a.name] || 0;
                    const bMod = moduleHistory[moduleName][b.name] || 0;
                    if (aMod !== bMod) return aMod - bMod;

                    const aTot = operatorHistory[a.name] || 0;
                    const bTot = operatorHistory[b.name] || 0;
                    if (aTot !== bTot) return aTot - bTot;

                    return Math.random() - 0.5;
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