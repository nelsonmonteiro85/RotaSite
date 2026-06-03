/* ============================================================
   DATA MODEL
============================================================ */
let operators = [];
let training = {}; // name -> array of module names

/* ============================================================
   LOAD / SAVE
============================================================ */
function loadDataStaff() {
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
    training[k] = Array.isArray(arr) ? arr.slice() : [];
  }
}

function saveDataStaff() {
  const opsToSave = operators.map(o => ({
    name: o.name,
    line: o.line,
    breakGroup: o.breakGroup,
    oee: o.oee,
    extra: o.extra,
    puckClean: o.puckClean,
    solution: o.solution,
    rubbish1: o.rubbish1,
    rubbish2: o.rubbish2,
    type: o.type,
    inTraining: o.inTraining
  }));

  localStorage.setItem("operators", JSON.stringify(opsToSave));
  localStorage.setItem("training", JSON.stringify(training));
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

  saveDataStaff();
  renderOperatorList();
  renderTrainingMatrix();
}

function deleteOperator(name) {
  operators = operators.filter(o => o.name !== name);
  delete training[name];
  saveDataStaff();
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
        sel.onchange = () => onChange(sel.value);
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
        v => {
          op.line = parseInt(v, 10);
          saveDataStaff();
        }
      );

      const breakSel = makeSelect(
        "Break:",
        String(op.breakGroup),
        [
          { value: "__", label: "__" },
          { value: "1", label: "1st" },
          { value: "2", label: "2nd" }
        ],
        v => {
          op.breakGroup = parseInt(v, 10);
          saveDataStaff();
        }
      );

      const oeeSel = makeSelect(
        "OEE:",
        op.oee ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => {
          op.oee = (v === "yes");
          saveDataStaff();
        }
      );

      const extraSel = makeSelect(
        "EXTRA:",
        op.extra ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => {
          op.extra = (v === "yes");
          saveDataStaff();
        }
      );

      const puckSel = makeSelect(
        "Puck Clean:",
        op.puckClean ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => {
          op.puckClean = (v === "yes");
          saveDataStaff();
        }
      );

      const solSel = makeSelect(
        "Solution:",
        op.solution ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => {
          op.solution = (v === "yes");
          saveDataStaff();
        }
      );

      const rub1Sel = makeSelect(
        "Rubbish L1:",
        op.rubbish1 ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => {
          op.rubbish1 = (v === "yes");
          saveDataStaff();
        }
      );

      const rub2Sel = makeSelect(
        "Rubbish L2:",
        op.rubbish2 ? "yes" : "no",
        [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" }
        ],
        v => {
          op.rubbish2 = (v === "yes");
          saveDataStaff();
        }
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
          op.type = v === "agency" ? "agency" : "permanent";
          saveDataStaff();
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
          saveDataStaff();
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
  const arr = training[name];
  const idx = arr.indexOf(moduleName);
  if (idx === -1) arr.push(moduleName);
  else arr.splice(idx, 1);
  saveDataStaff();
  renderTrainingMatrix();
}

function renderTrainingMatrix() {
  const container = document.getElementById("trainingMatrix");
  if (!container) return;

  container.innerHTML = "";

  // FIX: use filtered module list
  const trainingModules = modules.filter(m => m.toLowerCase().trim() !== "training");

  const grid = document.createElement("div");
  grid.className = "training-grid";
  grid.style.gridTemplateColumns = `150px repeat(${trainingModules.length}, 100px)`;

  const headerName = document.createElement("div");
  headerName.className = "training-header-cell";
  headerName.textContent = "Operator";
  grid.appendChild(headerName);

  // FIX: header uses trainingModules
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

      if (op.inTraining) {
        opCell.classList.add("operator-in-training");
      }

      if (op.type === "agency") {
        opCell.classList.add("operator-agency");
      } else if (op.type === "permanent") {
        opCell.classList.add("operator-permanent");
      }

      grid.appendChild(opCell);

      trainingModules.forEach(m => {
        const cell = document.createElement("div");
        cell.className = "training-cell";

        const dot = document.createElement("span");
        dot.className = "training-dot";

        const trainedList = training[op.name] || [];
        const isTrained = trainedList.includes(m);

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

  renderOperatorList();
  renderTrainingMatrix();
});
