/* ============================================================
   DATA MODEL
============================================================ */
let operators = []; // { name, line, breakGroup, oee, extra, puckClean, solution, mto1, mto2 }
let training = {};  // { operatorName: Set([...modules]) }

/* ============================================================
   SAVE / LOAD
============================================================ */
function saveData() {
  localStorage.setItem("operators", JSON.stringify(operators));
  localStorage.setItem(
    "training",
    JSON.stringify(
      Object.fromEntries(
        Object.entries(training).map(([k, v]) => [k, [...v]])
      )
    )
  );
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

  training = {};
  for (const [k, arr] of Object.entries(trn)) {
    training[k] = new Set(arr);
  }

  // Ensure every operator has a training set
  for (const op of operators) {
    if (!training[op.name]) {
      training[op.name] = new Set();
    }
  }

  sortOperators();
  renderOperators();
  renderTrainingMatrix();
}

/* ============================================================
   OPERATORS
============================================================ */
function sortOperators() {
  operators.sort((a, b) => a.name.localeCompare(b.name));
}

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

  training[name] = new Set();

  sortOperators();
  saveData();
  renderOperators();
  renderTrainingMatrix();
}

function deleteOperator(name) {
  operators = operators.filter(o => o.name !== name);
  delete training[name];

  sortOperators();
  saveData();
  renderOperators();
  renderTrainingMatrix();
}

function updateOperatorField(name, field, value) {
  const op = operators.find(o => o.name === name);
  if (!op) return;
  op[field] = value;
  saveData();
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
    li.style.display = "flex";
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
    delBtn.onclick = () => {
      deleteOperator(op.name);
    };

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
    controls.appendChild(makeSelect("Rubbish Line 1", "mto1", [["false", "No"], ["true", "Yes"]]));
    controls.appendChild(makeSelect("Rubbish Line 2", "mto2", [["false", "No"], ["true", "Yes"]]));

    li.appendChild(topRow);
    li.appendChild(controls);
    list.appendChild(li);
  });
}

/* ============================================================
   TRAINING MATRIX (A2 + T3 + C3 + H2)
============================================================ */
function renderTrainingMatrix() {
  const container = document.getElementById("trainingMatrix");
  container.innerHTML = "";

  if (!operators.length) {
    container.innerHTML = "<p style='font-size:12px;'>No operators yet.</p>";
    return;
  }

  const grid = document.createElement("div");
  grid.className = "training-grid";

  // First row: empty top-left + module headers
  const empty = document.createElement("div");
  empty.className = "training-header-cell";
  empty.textContent = "Operator / Module";
  grid.appendChild(empty);

  modules.forEach(mod => {
    const h = document.createElement("div");
    h.className = "training-header-cell";
    h.textContent = mod;
    grid.appendChild(h);
  });

  // Rows: operator name + dots
  operators.forEach(op => {
    const nameCell = document.createElement("div");
    nameCell.className = "training-operator-cell";
    nameCell.textContent = op.name;
    grid.appendChild(nameCell);

    modules.forEach(mod => {
      const cell = document.createElement("div");
      cell.className = "training-cell";

      const dot = document.createElement("span");
      dot.className = "training-dot";
      dot.dataset.operator = op.name;
      dot.dataset.module = mod;

      const isTrained = training[op.name] && training[op.name].has(mod);
      if (isTrained) {
        dot.classList.add("trained");
        dot.textContent = "●";
      } else {
        dot.classList.add("untrained");
        dot.textContent = "○";
      }

      // Make the whole rectangle clickable
      cell.onclick = () => toggleTraining(op.name, mod, dot);

      cell.appendChild(dot);
      grid.appendChild(cell);
    });
  });

  container.appendChild(grid);
}

function toggleTraining(name, moduleName, dotEl) {
  if (!training[name]) {
    training[name] = new Set();
  }

  if (training[name].has(moduleName)) {
    training[name].delete(moduleName);
    dotEl.classList.remove("trained");
    dotEl.classList.add("untrained");
    dotEl.textContent = "○";
  } else {
    training[name].add(moduleName);
    dotEl.classList.remove("untrained");
    dotEl.classList.add("trained");
    dotEl.textContent = "●";
  }

  saveData();
}

/* ============================================================
   INIT
============================================================ */
window.addEventListener("load", () => {
  loadData();

  const opInput = document.getElementById("opInput");
  const addBtn = document.getElementById("addOpBtn");

  addBtn.onclick = () => {
    addOperator(opInput.value);
    opInput.value = "";
    opInput.focus();
  };

  opInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      addOperator(opInput.value);
      opInput.value = "";
    }
  });
});
