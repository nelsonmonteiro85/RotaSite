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

    timeSlots.forEach((slot, slotIdx) => {
        const row = { break: slot, cells: {} };
        const used = new Set();

        modules.forEach(mod => {

            // 🔒 1. Manual assignment override
            let manual = null;

            // QC1 → solution operator (first break only)
            if (mod === "QC1" && slotIdx === 0) {
                manual = operators.find(o => o.solution && o.line === line);
            }

            // Peel 2 → rubbish operator (last break only)
            else if (mod === "Peel 2" && slotIdx === timeSlots.length - 1) {
                manual = operators.find(o =>
                    (line === 1 && o.mto1) ||
                    (line === 2 && o.mto2)
                );
            }


            // Normal direct module assignment
            else {
                manual = operators.find(o => o[mod] === true && o.line === line);
            }

            if (manual) {
                row.cells[mod] = manual.name;
                used.add(manual.name);
                return;
            }

            // 🎲 2. Random assignment (only if no manual assignment)

            // Prevent same operator doing the same module in consecutive breaks
            const prevRow = assignments[slotIdx - 1];
            const prevOp = prevRow ? prevRow.cells[mod] : null;

            const candidates = getTrainedOpsFor(line, mod)
                .filter(o => !used.has(o.name) && o.name !== prevOp);

            const chosen = candidates.length
                ? candidates[Math.floor(Math.random() * candidates.length)]
                : null;

            if (chosen) {
                row.cells[mod] = chosen.name;
                used.add(chosen.name);
            } else {
                row.cells[mod] = "N/A";
            }

        });


        assignments.push(row);
    });

    assignments.forEach(row => {
        html += `<tr><td>${row.break}</td>`;
        modules.forEach(m => {
            const cls = `rota-col-${m.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            html += `<td class="${cls}">${row.cells[m] || ""}</td>`;

        });
        html += "</tr>";
    });

    table.innerHTML = html;

    /* -----------------------------
       EXTRA ROLES
    ----------------------------- */

    const lastRow = assignments[assignments.length - 1] || { cells: {} };
    const opsLine = operators.filter(o => o.line === line);

    // Manual overrides
    const manualSolution = opsLine.find(o => o.solution);

    // Rubbish depends on the line
    const manualRubbish = opsLine.find(o =>
        (line === 1 && o.mto1) ||
        (line === 2 && o.mto2)
    );

    // Auto logic
    const autoRubbish = lastRow.cells["Peel 2"] || "N/A";
    const autoSolution = assignments[0].cells["QC1"] || "N/A";

    // Final values
    const rubbishName = manualRubbish ? manualRubbish.name : autoRubbish;
    const solutionName = manualSolution ? manualSolution.name : autoSolution;

    // Other extra roles
    function safeFind(field) {
        const op = opsLine.find(o => o[field]);
        return op ? op.name : "N/A";
    }

    const mto1Name = safeFind("mto1");
    const mto2Name = safeFind("mto2");
    const puckCleanName = safeFind("puckClean") || "N/A";
    const oeeName = safeFind("oee");
    const extraName = safeFind("extra");




    extrasDiv.innerHTML = `
    <div class="extras-row">
      <table class="rota-table">
        <tr><th>Rubbish</th></tr>
        <tr><td>${rubbishName || "N/A"}</td></tr>
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

    // Optional: generate immediately for default line
    generateRotaForLine(parseInt(lineSelect.value, 10));
});
