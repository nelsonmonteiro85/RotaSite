/* ============================================================
   DATA MODEL
============================================================ */
let operators = [];
let training = {};

/* ============================================================
   LOAD
============================================================ */
function loadDataRota() {
    const ops = JSON.parse(localStorage.getItem("operators") || "[]");
    const trn = JSON.parse(localStorage.getItem("training") || "{}");

    operators = ops.map(o => ({
        name: o.name,
        line: o.line ?? 1,
        breakGroup: parseInt(o.breakGroup ?? 1, 10),

        oee: !!o.oee,
        extra: !!o.extra,
        puckClean: !!o.puckClean,
        solution: !!o.solution,
        rubbish1: !!o.rubbish1,
        rubbish2: !!o.rubbish2,

        type: (o.type === "agency" || o.type === "permanent") ? o.type : "__",

        inTraining: !!o.inTraining
    }));

    training = {};
    for (const [k, arr] of Object.entries(trn)) {
        training[k] = new Set(arr);
    }
}

/* ============================================================
   HELPERS
============================================================ */
function normalize(name) {
    return name.trim().toLowerCase();
}

function getTrainedOpsFor(line, moduleName) {
    const target = normalize(moduleName).replace(/[^a-z0-9]/g, "");

    return operators.filter(o => {
        if (o.inTraining) return false;
        if (o.line !== line) return false;
        if (!training[o.name]) return false;

        const trained = [...training[o.name]].map(x =>
            normalize(x).replace(/[^a-z0-9]/g, "")
        );

        return trained.includes(target);
    });
}


// NEW: returns how many modules an operator is trained in
function getTrainingCount(op) {
    return training[op.name] ? training[op.name].size : 0;
}

// NEW: checks if operator is trained ONLY in this module
function isSingleModuleOperator(op, moduleName) {
    if (!training[op.name]) return false;
    const trained = [...training[op.name]].map(normalize);
    return trained.length === 1 && trained[0] === normalize(moduleName);
}

// NEW: checks Peel conflict
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

function renderBreakTable(data) {
    const table = document.getElementById("breakTable");
    if (!table) return;

    const rows = table.querySelectorAll("tbody tr");

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll("td");
        cells[0].textContent = data.firstBreak[i] || "";
        cells[1].textContent = data.secondBreak[i] || "";
    }
}

/* ============================================================
   ROTA GENERATION (MAIN TABLE ONLY)
============================================================ */
function generateRotaForLine(line) {

    const rotaModules = modules.filter(m => normalize(m) !== "training");
    const table = document.getElementById("rotaTable");
    const extrasDiv = document.getElementById("extras");
    const title = document.getElementById("rotaTitle");

    title.textContent = `WHITE SHIFT MTO LINE ${line}`;
    table.innerHTML = "";
    extrasDiv.innerHTML = "";

    let html = "<tr><th>Break</th>";

    rotaModules.forEach(m => {
        const cls = `rota-col-${m.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        html += `<th class="${cls}">${m}</th>`;
    });

    html += "</tr>";

    const assignments = [];
    const operatorHistory = {}; // tracks modules done by each operator

    timeSlots.forEach((slot, slotIdx) => {

        const row = { break: slot, cells: {} };
        const used = new Set(); // operators already assigned this break
        const prevRow = assignments[slotIdx - 1];

        const prevPeel1 = prevRow ? prevRow.cells["Peel 1"] : null;
        const prevPeel2 = prevRow ? prevRow.cells["Peel 2"] : null;

        // Sort modules by scarcity of trained operators
        const orderedModules = [...rotaModules].sort((a, b) => {
            const countA = getTrainedOpsFor(line, a).length;
            const countB = getTrainedOpsFor(line, b).length;
            return countA - countB;
        });

        orderedModules.forEach(mod => {

            const prevSame = prevRow ? prevRow.cells[mod] : null;

            /* ============================================================
                 TEAM LEADER MANUAL OVERRIDE — SOLUTION → QC1
            ============================================================ */
            if (mod === "QC1") {
                const manualSolution = operators.find(o =>
                    o.solution === true &&
                    o.line === line
                );

                if (manualSolution) {
                    row.cells[mod] = manualSolution.name;
                    used.add(manualSolution.name);

                    operatorHistory[manualSolution.name] =
                        (operatorHistory[manualSolution.name] || 0) + 1;

                    return; // skip all rota logic for this module
                }
            }

            /* ============================================================
                TEAM LEADER MANUAL OVERRIDE — RUBBISH → PEEL 2
            ============================================================ */
            if (mod === "Peel 2") {
                const manualRubbish = operators.find(o =>
                    (o.rubbish1 || o.rubbish2) &&
                    o.line === line
                );

                if (manualRubbish) {
                    row.cells[mod] = manualRubbish.name;
                    used.add(manualRubbish.name);

                    operatorHistory[manualRubbish.name] =
                        (operatorHistory[manualRubbish.name] || 0) + 1;

                    return; // skip all rota logic for this module
                }
            }

            /* ============================================================
               STEP 1 — STRICT TRAINED CANDIDATES
            ============================================================ */
            let candidates = getTrainedOpsFor(line, mod).filter(o => {

                if (used.has(o.name)) return false;
                if (violatesPeelRule(mod, prevPeel1, prevPeel2, o.name)) return false;

                // cannot repeat same module twice in a row
                if (o.name === prevSame) return false;

                return true;
            });

            /* ============================================================
               STEP 2 — SHORTAGE MODE (REPEAT TRAINED OPERATOR)
               (still no duplicates, still no peel conflict)
            ============================================================ */
            if (candidates.length === 0) {

                const trained = getTrainedOpsFor(line, mod);

                if (trained.length > 0) {

                    candidates = trained.filter(o => {

                        if (used.has(o.name)) return false;
                        if (violatesPeelRule(mod, prevPeel1, prevPeel2, o.name)) return false;

                        // allow repeating same module twice in a row ONLY IF:
                        // operator is trained ONLY in this module AND no other trained exists
                        if (o.name === prevSame) {
                            if (isSingleModuleOperator(o, mod) && trained.length === 1) {
                                return true; // allowed
                            }
                            return false; // otherwise blocked
                        }

                        return true;
                    });
                }
            }

            /* ============================================================
               STEP 3 — NO TRAINED EXISTS → USE UNTRAINED
            ============================================================ */
            if (candidates.length === 0) {

                const trained = getTrainedOpsFor(line, mod);

                if (trained.length === 0) {
                    candidates = operators.filter(o =>
                        !o.inTraining &&
                        o.line === line &&
                        !used.has(o.name) &&
                        !violatesPeelRule(mod, prevPeel1, prevPeel2, o.name)
                    );
                }
            }

            /* ============================================================
               STEP 4 — FAIRNESS + RANDOMISATION
            ============================================================ */
            let chosen = null;

            if (candidates.length > 0) {

                // random shuffle first
                candidates = candidates.sort(() => Math.random() - 0.5);

                // fairness: lowest usage count wins
                candidates.sort((a, b) => {
                    const aCount = operatorHistory[a.name] || 0;
                    const bCount = operatorHistory[b.name] || 0;
                    return aCount - bCount;
                });

                chosen = candidates[0];
            }

            /* ============================================================
               ASSIGN
            ============================================================ */
            if (!chosen) {
                row.cells[mod] = "ERROR"; // should never happen
            } else {
                row.cells[mod] = chosen.name;
                used.add(chosen.name);

                if (!operatorHistory[chosen.name]) {
                    operatorHistory[chosen.name] = 0;
                }
                operatorHistory[chosen.name] += 1;
            }
        });
        assignments.push(row);
    });

    /* ============================================================
       RENDER MAIN TABLE
    ============================================================ */
    assignments.forEach(row => {
        html += `<tr><td>${row.break}</td>`;

        rotaModules.forEach(m => {
            const cls = `rota-col-${m.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            html += `<td class="${cls}">${row.cells[m] || ""}</td>`;
        });

        html += "</tr>";
    });

    table.innerHTML = html;

    /* ============================================================
       BREAK TABLE
    ============================================================ */
    renderBreakTable(getBreakGroups(line));

    /* ============================================================
       EXTRAS (CALL EXTRA.JS)
    ============================================================ */
    renderExtras(assignments, operators, line, extrasDiv);
}

/* ============================================================
   INIT
============================================================ */
window.addEventListener("load", () => {
    loadDataRota();

    const lineSelect = document.getElementById("lineSelect");
    const btn = document.getElementById("generateBtn");

    btn.onclick = () => {
        generateRotaForLine(parseInt(lineSelect.value, 10));
    };

    generateRotaForLine(parseInt(lineSelect.value, 10));
});
