/* ============================================================
   DATA MODEL
============================================================ */
let operators = [];
let training = {}; // name -> array of module names
let dirty = false;

function markDirty() {
  dirty = true;
}

window.addEventListener("beforeunload", (e) => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = "";
});

/* ============================================================
   SAVE TO GITHUB
============================================================ */
function getOperatorsFromUI() {
  const list = document.getElementById("opList");
  if (!list) return operators;

  const newOps = [];

  list.querySelectorAll("li").forEach(li => {
    const name = li.querySelector("div").textContent.trim();
    const selects = li.querySelectorAll("select");

    const [
      lineSel,
      breakSel,
      oeeSel,
      extraSel,
      puckSel,
      solSel,
      rub1Sel,
      rub2Sel,
      typeSel,
      trainingSel
    ] = selects;

    newOps.push({
      name,
      line: lineSel.value === "__" ? "__" : parseInt(lineSel.value, 10),
      breakGroup: breakSel.value === "__" ? "__" : parseInt(breakSel.value, 10),
      oee: oeeSel.value === "yes",
      extra: extraSel.value === "yes",
      puckClean: puckSel.value === "yes",
      solution: solSel.value === "yes",
      rubbish1: rub1Sel.value === "yes",
      rubbish2: rub2Sel.value === "yes",
      type: typeSel.value,
      inTraining: trainingSel.value === "yes"
    });
  });

  return newOps;
}

function getTrainingFromUI() {
  const result = {};
  operators.forEach(op => {
    result[op.name] = training[op.name] ? [...training[op.name]] : [];
  });
  return result;
}

function saveToGitHub() {
  const operatorsToSave = getOperatorsFromUI();
  const trainingToSave = getTrainingFromUI();

  // ⭐ Instant local save + background GitHub sync
  saveHybrid(GH_OPERATORS_PATH, operatorsToSave);
  saveHybrid(GH_TRAINING_PATH, trainingToSave);

  // ⭐ Update global variables so UI matches saved data
  operators = operatorsToSave;
  training = trainingToSave;

  // ⭐ Reset dirty flag so the browser stops warning
  dirty = false;
  window.onbeforeunload = null;

  alert("Saved!");
}

/* ============================================================
   LOAD FROM GITHUB
============================================================ */
async function loadDataStaff() {
  operators = await loadGitHubJSON(GH_OPERATORS_PATH);
  training = await loadGitHubJSON(GH_TRAINING_PATH);

  renderOperatorList();
  renderTrainingMatrix();
}

/* ============================================================
   OPERATOR LIST UI
============================================================ */
function addOperator(name) {
  name = name.trim();
  if (!name) return;
  if (operators.some(o => o.name.toLowerCase() === name.toLowerCase())) return;

  operators.push({
    name,
    line: "__",
    breakGroup: "__",
    oee: false,
    extra: false,
    puckClean: false,
    solution: false,
    rubbish1: false,
    rubbish2: false,
    type: "__",
    inTraining: false
  });

  markDirty();
  renderOperatorList();
  renderTrainingMatrix();
}

function deleteOperator(name) {
  operators = operators.filter(o => o.name !== name);
  delete training[name];

  markDirty();
  renderOperatorList();
  renderTrainingMatrix();
}

function renderOperatorList() {
  const list = document.getElementById("opList");
  if (!list) return;
  list.innerHTML = "";

  operators
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(op => {

      const li = document.createElement("li");
      li.className = "list-item";

      const title = document.createElement("div");
      title.textContent = op.name;
      title.style.fontWeight = "600";
      title.style.marginBottom = "4px";

      const row = document.createElement("div");
      row.className = "operator-row";

      function makeSelect(labelText, value, options, onChange) {
        const wrapper = document.createElement("label");
        wrapper.className = "operator-field";

        const span = document.createElement("span");
        span.textContent = labelText;
        wrapper.appendChild(span);

        const sel = document.createElement("select");
        options.forEach(opt => {
          const oEl = document.createElement("option");
          oEl.value = opt.value;
          oEl.textContent = opt.label;
          if (opt.value === value) oEl.selected = true;
          sel.appendChild(oEl);
        });
        sel.onchange = () => {
          onChange(sel.value);
          markDirty();
        };
        wrapper.appendChild(sel);

        return wrapper;
      }

      const lineSel = makeSelect(
        "Line:",
        String(op.line),
        [
          { value: "__", label: "__" },
          { value: "1", label: "1" },
          { value: "2", label: "2" }
        ],
        v => op.line = v === "__" ? "__" : parseInt(v, 10)
      );

      const breakSel = makeSelect(
        "Break:",
        String(op.breakGroup),
        [
          { value: "__", label: "__" },
          { value: "1", label: "1st" },
          { value: "2", label: "2nd" }
        ],
        v => op.breakGroup = v === "__" ? "__" : parseInt(v, 10)
      );

      const oeeSel = makeSelect(
        "OEE:",
        op.oee ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => op.oee = (v === "yes")
      );

      const extraSel = makeSelect(
        "EXTRA:",
        op.extra ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => op.extra = (v === "yes")
      );

      const puckSel = makeSelect(
        "Puck Clean:",
        op.puckClean ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => op.puckClean = (v === "yes")
      );

      const solSel = makeSelect(
        "Solution:",
        op.solution ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => op.solution = (v === "yes")
      );

      const rub1Sel = makeSelect(
        "Rubbish L1:",
        op.rubbish1 ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => op.rubbish1 = (v === "yes")
      );

      const rub2Sel = makeSelect(
        "Rubbish L2:",
        op.rubbish2 ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => op.rubbish2 = (v === "yes")
      );

      const typeSel = makeSelect(
        "Type:",
        op.type,
        [
          { value: "__", label: "__" },
          { value: "permanent", label: "Permanent" },
          { value: "agency", label: "Agency" }
        ],
        v => {
          op.type = v;
          renderTrainingMatrix();
        }
      );

      const trainingSel = makeSelect(
        "Training:",
        op.inTraining ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => {
          op.inTraining = (v === "yes");
          renderTrainingMatrix();
        }
      );

      const delBtn = document.createElement("button");
      delBtn.textContent = "X";
      delBtn.className = "delete-btn";
      delBtn.onclick = () => deleteOperator(op.name);

      row.appendChild(lineSel);
      row.appendChild(breakSel);
      row.appendChild(oeeSel);
      row.appendChild(extraSel);
      row.appendChild(puckSel);
      row.appendChild(solSel);
      row.appendChild(rub1Sel);
      row.appendChild(rub2Sel);
      row.appendChild(typeSel);
      row.appendChild(trainingSel);
      row.appendChild(delBtn);

      li.appendChild(title);
      li.appendChild(row);
      list.appendChild(li);
    });
}

/* ============================================================
   TRAINING MATRIX
============================================================ */
function toggleTraining(name, moduleName) {
  if (!training[name]) training[name] = [];

  const key = moduleName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const arr = training[name];
  const idx = arr.indexOf(key);

  if (idx === -1) arr.push(key);
  else arr.splice(idx, 1);

  markDirty();
  renderTrainingMatrix();
}

function renderTrainingMatrix() {
  const container = document.getElementById("trainingMatrix");
  if (!container) return;

  container.innerHTML = "";

  const trainingModules = modules.filter(m => m.toLowerCase().trim() !== "training");

  const grid = document.createElement("div");
  grid.className = "training-grid";
  grid.style.gridTemplateColumns = `minmax(120px, 150px) repeat(${trainingModules.length}, minmax(60px, 1fr))`;

  const headerName = document.createElement("div");
  headerName.className = "training-header-cell";
  headerName.textContent = "Operator";
  grid.appendChild(headerName);

  trainingModules.forEach(m => {
    const h = document.createElement("div");
    h.className = "training-header-cell";
    h.textContent = m;
    grid.appendChild(h);
  });

  operators
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(op => {

      const opCell = document.createElement("div");
      opCell.className = "training-operator-cell";
      opCell.textContent = op.name;

      if (op.inTraining) opCell.classList.add("operator-in-training");
      if (op.type === "agency") opCell.classList.add("operator-agency");
      if (op.type === "permanent") opCell.classList.add("operator-permanent");

      grid.appendChild(opCell);

      trainingModules.forEach(m => {
        const cell = document.createElement("div");
        cell.className = "training-cell";

        const dot = document.createElement("span");
        dot.className = "training-dot";

        const key = m.toLowerCase().replace(/[^a-z0-9]/g, "");
        const trainedList = training[op.name] || [];
        const isTrained = trainedList.includes(key);

        dot.textContent = isTrained ? "●" : "○";
        dot.classList.add(isTrained ? "trained" : "untrained");

        cell.onclick = () => toggleTraining(op.name, m);

        cell.appendChild(dot);
        grid.appendChild(cell);
      });
    });

  container.appendChild(grid);
}

/* ============================================================
   INIT
============================================================ */
window.addEventListener("load", () => {
  loadDataStaff();

  const addBtn = document.getElementById("addOpBtn");
  const input = document.getElementById("opInput");

  addBtn.onclick = () => {
    addOperator(input.value);
    input.value = "";
    input.focus();
  };

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      addOperator(input.value);
      input.value = "";
    }
  });
});
