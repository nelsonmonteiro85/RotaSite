/* ============================================================
   FIXED MODULE LIST (NO EDITING)
============================================================ */
const modules = [
  "INFEED / FILL & CLOSE",
  "Peel 1",
  "Peel 2",
  "Rinse Station",
  "Lens Transfer",
  "Inspection",
  "Training",
  "QC1",
  "Puck Drying"
];

/* ============================================================
   DATA MODEL
============================================================ */
let operators = []; // now objects, not strings
let training = {};  // { operatorName: Set([...modules]) }

const timeSlots = [
  "7PM - 1ST BREAK",
  "1ST BREAK - 2ND BREAK",
  "2ND BREAK - 3RD BREAK",
  "3RD BREAK - 4TH BREAK",
  "4TH BREAK - FINISH"
];

/* ============================================================
   SAVE / LOAD
============================================================ */
function saveData() {
  localStorage.setItem("operators", JSON.stringify(operators));
  localStorage.setItem("training", JSON.stringify(
    Object.fromEntries(
      Object.entries(training).map(([k, v]) => [k, [...v]])
    )
  ));
}

function renderTrainingMatrix() {
  // TEMP: no-op so the rest of the app works.
  // You can later implement your real training UI here.
  const container = document.getElementById("trainingMatrix");
  if (!container) return;
  container.innerHTML = "<p style='font-size:12px;'>Training matrix coming soon.</p>";
}


function loadData() {
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
    mto1: !!o.mto1,
    mto2: !!o.mto2
  }));

  sortOperators();

  training = {};
  for (const [k, arr] of Object.entries(trn)) {
    training[k] = new Set(arr);
  }

  renderOperators();
  renderTrainingMatrix();
  renderBreakGrids();
  renderRotas();
}

/* ============================================================
   ADD / REMOVE OPERATORS
============================================================ */
function addOperator(name) {
  name = name.trim();
  if (!name || operators.some(o => o.name === name)) return;

  operators.push({
    name,
    line: 0,
    breakGroup: 1,
    oee: false,
    extra: false,
    puckClean: false,
    solution: false,
    mto1: false,
    mto2: false
  });

  training[name] = training[name] || new Set();

  sortOperators();

  saveData();
  renderOperators();
  renderTrainingMatrix();
  renderBreakGrids();
  renderRotas();
}

function deleteOperator(name) {
  operators = operators.filter(o => o.name !== name);
  delete training[name];

  sortOperators();

  saveData();
  renderOperators();
  renderTrainingMatrix();
  renderBreakGrids();
  renderRotas();
}

function updateOperatorField(name, field, value) {
  const op = operators.find(o => o.name === name);
  if (!op) return;

  op[field] = value;
  saveData();
  renderBreakGrids();
  renderRotas();
}

function sortOperators() {
  operators.sort((a, b) => a.name.localeCompare(b.name));
}


/* ============================================================
   OPERATOR UI
============================================================ */
function renderOperators() {
  const list = document.getElementById("opList");
  list.innerHTML = "";

  operators.forEach(op => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.style.flexDirection = "column";
    li.style.alignItems = "flex-start";

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.justifyContent = "space-between";
    topRow.style.width = "100%";
    topRow.style.marginBottom = "4px";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = op.name;
    nameSpan.style.fontWeight = "bold";

    const delBtn = document.createElement("button");
    delBtn.textContent = "✖";
    delBtn.className = "delete-btn";
    delBtn.onclick = () => deleteOperator(op.name);

    topRow.appendChild(nameSpan);
    topRow.appendChild(delBtn);

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "6px";

    function makeSelect(label, field, options) {
      const wrap = document.createElement("label");
      wrap.style.fontSize = "12px";

      const span = document.createElement("span");
      span.textContent = label + " ";

      const sel = document.createElement("select");
      options.forEach(([val, text]) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = text;
        sel.appendChild(opt);
      });

      sel.value = String(op[field]);
      sel.onchange = () => {
        let v = sel.value;
        if (field === "line" || field === "breakGroup") v = parseInt(v, 10);
        else v = v === "true";
        updateOperatorField(op.name, field, v);
      };

      wrap.appendChild(span);
      wrap.appendChild(sel);
      return wrap;
    }

    controls.appendChild(makeSelect("Line", "line", [[0, "--"], [1, "1"], [2, "2"]]));
    controls.appendChild(makeSelect("Break", "breakGroup", [[1, "1st"], [2, "2nd"]]));
    controls.appendChild(makeSelect("OEE", "oee", [["false", "No"], ["true", "Yes"]]));
    controls.appendChild(makeSelect("EXTRA", "extra", [["false", "No"], ["true", "Yes"]]));
    controls.appendChild(makeSelect("Puck Clean", "puckClean", [["false", "No"], ["true", "Yes"]]));
    controls.appendChild(makeSelect("Solution", "solution", [["false", "No"], ["true", "Yes"]]));
    controls.appendChild(makeSelect("MTO1", "mto1", [["false", "No"], ["true", "Yes"]]));
    controls.appendChild(makeSelect("MTO2", "mto2", [["false", "No"], ["true", "Yes"]]));

    li.appendChild(topRow);
    li.appendChild(controls);
    list.appendChild(li);
  });
}

/* ============================================================
   BREAK MINI‑GRIDS
============================================================ */
function renderBreakGridForLine(line, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const opsLine = operators.filter(o => o.line === line);
  const first = opsLine.filter(o => o.breakGroup === 1).map(o => o.name);
  const second = opsLine.filter(o => o.breakGroup === 2).map(o => o.name);
  const rows = Math.max(first.length, second.length);

  let html = "<tr><th>1st Break</th><th>2nd Break</th></tr>";

  for (let i = 0; i < rows; i++) {
    html += `
      <tr>
        <td>${first[i] || ""}</td>
        <td>${second[i] || ""}</td>
      </tr>`;
  }

  table.innerHTML = html;
}

function renderBreakGrids() {
  renderBreakGridForLine(1, "breakGridLine1");
  renderBreakGridForLine(2, "breakGridLine2");
}

/* ============================================================
   ROTA GENERATION
============================================================ */
function getTrainedOpsFor(line, moduleName) {
  return operators.filter(o =>
    o.line === line &&
    training[o.name] &&
    training[o.name].has(moduleName)
  );
}

function generateRotaForLine(line) {
  const table = document.getElementById(line === 1 ? "rotaLine1" : "rotaLine2");
  const extrasDiv = document.getElementById(line === 1 ? "extrasLine1" : "extrasLine2");
  if (!table || !extrasDiv) return;

  let html = "<tr><th>Break</th>";
  modules.forEach(m => html += `<th>${m}</th>`);
  html += "</tr>";

  const assignments = [];

  timeSlots.forEach((slot, slotIdx) => {
    const row = { break: slot, cells: {} };
    const used = new Set();

    modules.forEach(mod => {
      const candidates = getTrainedOpsFor(line, mod).filter(o => !used.has(o.name));
      const chosen = candidates.length ? candidates[slotIdx % candidates.length] : null;

      if (chosen) {
        row.cells[mod] = chosen.name;
        used.add(chosen.name);
      } else {
        row.cells[mod] = "";
      }
    });

    assignments.push(row);
  });

  assignments.forEach(row => {
    html += `<tr><td>${row.break}</td>`;
    modules.forEach(m => {
      html += `<td>${row.cells[m] || ""}</td>`;
    });
    html += "</tr>";
  });

  table.innerHTML = html;

  /* -----------------------------
     EXTRA ROLES
  ----------------------------- */

  // Rubbish = Peel 2 (last slot)
  const lastRow = assignments[assignments.length - 1];
  const rubbishName = lastRow.cells["Peel 2"] || "";

  const opsLine = operators.filter(o => o.line === line);
  const findOne = field => (opsLine.find(o => o[field]) || {}).name || "";

  const mto1Name = findOne("mto1");
  const mto2Name = findOne("mto2");
  const puckCleanName = findOne("puckClean") || "N/A";
  const oeeName = findOne("oee");
  const extraName = findOne("extra");
  const solutionName = findOne("solution");

  extrasDiv.innerHTML = `
    <table class="rota-table">
      <tr><th>Rubbish</th><th>MTO 1</th><th>MTO 2</th></tr>
      <tr><td>${rubbishName}</td><td>${mto1Name}</td><td>${mto2Name}</td></tr>
    </table>
    <br>
    <table class="rota-table">
      <tr><th>Puck Trolley Cleaning (last night only)</th></tr>
      <tr><td>${puckCleanName}</td></tr>
    </table>
    <br>
    <table class="rota-table">
      <tr><th>OEE</th><th>EXTRA</th></tr>
      <tr><td>${oeeName}</td><td>${extraName}</td></tr>
    </table>
    <br>
    <table class="rota-table">
      <tr><th>Solution (QC1 Op or Extra Op)</th></tr>
      <tr><td>${solutionName}</td></tr>
    </table>
  `;
}

function renderRotas() {
  generateRotaForLine(1);
  generateRotaForLine(2);
}

/* ============================================================
   ENTER KEY TO ADD OPERATOR
============================================================ */
document.getElementById("opInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    addOperator(this.value);
    this.value = "";
  }
});

/* ============================================================
   INITIAL LOAD
============================================================ */
window.onload = loadData;
