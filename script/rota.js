/* ============================================================
   DATA MODEL (read-only here)
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
        breakGroup: o.breakGroup ?? 1,
        oee: !!o.oee,
        extra: !!o.extra,
        puckClean: !!o.puckClean,
        solution: !!o.solution,
        rubbish: !!o.rubbish,
        mto1: !!o.mto1,
        mto2: !!o.mto2
    }));

    training = {};
    for (const [k, arr] of Object.entries(trn)) {
        training[k] = new Set(arr);
    }
}

/* ============================================================
   SAVE DATA
============================================================ */
function saveData() {
    // Save operators
    localStorage.setItem("operators", JSON.stringify(operators));

    // Convert training Sets to arrays before saving
    const trainingObj = {};
    for (const [name, set] of Object.entries(training)) {
        trainingObj[name] = Array.from(set);
    }

    localStorage.setItem("training", JSON.stringify(trainingObj));
}
``

/* ============================================================
   HELPERS
============================================================ */
function getTrainedOpsFor(line, moduleName) {
    return operators.filter(o =>
        o.line === line &&
        training[o.name] &&
        training[o.name].has(moduleName)
    );
}

/* ============================================================
   BREAKS LOGIC
============================================================ */
function getBreakGroups(line) {
    const firstBreak = [];
    const secondBreak = [];

    operators.forEach(op => {
        if (op.line !== line) return;

        if (op.breakGroup === 1) {
            firstBreak.push(op.name);
        } else {
            secondBreak.push(op.name);
        }
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
   ROTA GENERATION
============================================================ */
function generateRotaForLine(line) {
    const table = document.getElementById("rotaTable");
    const extrasDiv = document.getElementById("extras");
    const title = document.getElementById("rotaTitle");

    title.textContent = `WHITE SHIFT MTO LINE ${line}`;
    table.innerHTML = "";
    extrasDiv.innerHTML = "";

    let html = "<tr><th>Break</th>";

    modules.forEach(m => {
        const cls = `rota-col-${m.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        html += `<th class="${cls}">${m}</th>`;
    });

    html += "</tr>";

    const assignments = [];

    const operatorHistory = {};

    timeSlots.forEach((slot, slotIdx) => {
        const row = { break: slot, cells: {} };
        const used = new Set();

        modules.forEach(mod => {

            const prevRow = assignments[slotIdx - 1];

            const prevSame = prevRow ? prevRow.cells[mod] : null;
            const prevPeel1 = prevRow ? prevRow.cells["Peel 1"] : null;
            const prevPeel2 = prevRow ? prevRow.cells["Peel 2"] : null;

            // TRAINING (lock)
            if (mod === "Training") {
                const name = slotIdx === 0
                    ? (getTrainedOpsFor(line, mod)[0]?.name || null)
                    : assignments[0]?.cells["Training"];

                if (name && !used.has(name)) {
                    row.cells[mod] = name;
                    used.add(name);
                    return;
                }
            }

            // BUILD CANDIDATES (manual + trained)
            let candidates = [];

            // QC1 rule
            if (mod === "QC1" && slotIdx === 0) {
                candidates = operators.filter(o => o.solution && o.line === line);
            }
            // Peel 2 rubbish
            else if (mod === "Peel 2" && slotIdx === timeSlots.length - 1) {
                candidates = operators.filter(o =>
                    (line === 1 && o.mto1) ||
                    (line === 2 && o.mto2)
                );
            }
            // Normal
            else {
                candidates = getTrainedOpsFor(line, mod);
            }

            // ✅ APPLY ALL RULES HERE
            candidates = candidates.filter(o => {

                if (used.has(o.name)) return false;

                // ❌ Rule 1: never repeat any station
                if (!operatorHistory[o.name]) operatorHistory[o.name] = new Set();
                if (operatorHistory[o.name].has(mod)) return false;

                // ❌ Rule 2: prevent same station as last row (extra safety)
                if (o.name === prevSame) return false;

                // ❌ Rule 3: Peel cross rule (already correct)
                if (mod === "Peel 1" && o.name === prevPeel2) return false;
                if (mod === "Peel 2" && o.name === prevPeel1) return false;

                return true;
            });

            // ✅ FALLBACK (ONLY removes column rule - keeps row + peel rules)
            if (candidates.length === 0) {
                candidates = getTrainedOpsFor(line, mod).filter(o => {

                    if (used.has(o.name)) return false;

                    // still enforce NO REPEAT EVER
                    if (operatorHistory[o.name]?.has(mod)) return false;

                    // still enforce peel rule
                    if (mod === "Peel 1" && o.name === prevPeel2) return false;
                    if (mod === "Peel 2" && o.name === prevPeel1) return false;

                    return true;
                });
            }

            const chosen = candidates.length
                ? candidates[Math.floor(Math.random() * candidates.length)]
                : null;

            row.cells[mod] = chosen ? chosen.name : "N/A";

            if (chosen) {
                used.add(chosen.name);

                if (!operatorHistory[chosen.name]) {
                    operatorHistory[chosen.name] = new Set();
                }

                operatorHistory[chosen.name].add(mod);
            }
        });


        function isPeelConflict(name, mod, prevRow) {
            if (!prevRow) return false;

            const prevPeel1 = prevRow.cells["Peel 1"];
            const prevPeel2 = prevRow.cells["Peel 2"];

            // ❌ If was in Peel 1 → cannot go to Peel 2
            if (mod === "Peel 2" && name === prevPeel1) return true;

            // ❌ If was in Peel 2 → cannot go to Peel 1
            if (mod === "Peel 1" && name === prevPeel2) return true;

            return false;
        }

        assignments.push(row);
    });

    // Render rota table
    assignments.forEach(row => {
        html += `<tr><td>${row.break}</td>`;

        modules.forEach(m => {
            const cls = `rota-col-${m.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            html += `<td class="${cls}">${row.cells[m] || ""}</td>`;
        });

        html += "</tr>";
    });

    table.innerHTML = html;

    /* ✅ APPLY BREAK TABLE HERE */
    const breakGroups = getBreakGroups(line);
    renderBreakTable(breakGroups);

    /* -----------------------------
       EXTRA ROLES
    ----------------------------- */

    const lastRow = assignments[assignments.length - 1] || { cells: {} };
    const opsLine = operators.filter(o => o.line === line);

    const manualSolution = opsLine.find(o => o.solution);

    const manualRubbish = opsLine.find(o =>
        (line === 1 && o.mto1) ||
        (line === 2 && o.mto2)
    );

    const autoRubbish = lastRow.cells["Peel 2"] || "N/A";
    const autoSolution = assignments[0].cells["QC1"] || "N/A";

    const rubbishName = manualRubbish ? manualRubbish.name : autoRubbish;
    const solutionName = manualSolution ? manualSolution.name : autoSolution;

    function safeFind(field) {
        const op = opsLine.find(o => o[field]);
        return op ? op.name : "N/A";
    }

    const puckCleanName = safeFind("puckClean");
    const oeeName = safeFind("oee");
    const extraName = safeFind("extra");

    extrasDiv.innerHTML = `
    <div class="extras-row">
      <table class="rota-table">
        <tr><th>Rubbish</th></tr>
        <tr><td>${rubbishName}</td></tr>
      </table>

      <table class="rota-table">
        <tr><th>Puck Trolley Cleaning (last night only)</th></tr>
        <tr><td>${puckCleanName}</td></tr>
      </table>

      <table class="rota-table">
        <tr><th>OEE</th><th>EXTRA</th></tr>
        <tr><td>${oeeName}</td><td>${extraName}</td></tr>
      </table>

      <table class="rota-table">
        <tr><th>Solution (QC1 Op or Extra Op)</th></tr>
        <tr><td>${solutionName}</td></tr>
      </table>
    </div>
  `;
}

/* ============================================================
   INIT
============================================================ */
window.addEventListener("load", () => {
    loadDataRota();

    const lineSelect = document.getElementById("lineSelect");
    const btn = document.getElementById("generateBtn");

    btn.onclick = () => {
        const line = parseInt(lineSelect.value, 10);
        generateRotaForLine(line);
    };

    generateRotaForLine(parseInt(lineSelect.value, 10));
});
