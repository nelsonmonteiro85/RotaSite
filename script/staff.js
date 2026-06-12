/* ============================================================
   DATA MODEL
============================================================ */
let operators = [];
let training = {}; // name -> array of module names
let dirty = false;

function markDirty() {
  if (!dirty) {
    dirty = true;
    document.getElementById("unsavedBanner").classList.remove("hidden");
    document.getElementById("saveToGitHubBtn").disabled = false;
  }
}

function showToast() {
  const t = document.getElementById("saveToast");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

function saveToGitHub() {
  const operatorsToSave = getOperatorsFromUI();
  const trainingToSave = getTrainingFromUI();

  saveHybrid(GH_OPERATORS_PATH, operatorsToSave);
  saveHybrid(GH_TRAINING_PATH, trainingToSave);

  operators = operatorsToSave;
  training = trainingToSave;

  dirty = false;
  document.getElementById("unsavedBanner").classList.add("hidden");
  document.getElementById("saveBtn").disabled = true;

  showToast();
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
    const birthday = li.querySelector(".birthday-input")?.value.trim() || "";

    // Helper to get a select value by class
    const get = cls => li.querySelector("." + cls)?.value;

    newOps.push({
      name,
      birthday,

      line: get("line-select") === "__" ? "__" : parseInt(get("line-select"), 10),
      breakGroup: get("break-select") === "__" ? "__" : parseInt(get("break-select"), 10),

      oee: get("oee-select") === "yes",
      extra: get("extra-select") === "yes",
      puckClean: get("puckclean-select") === "yes",
      solution: get("solution-select") === "yes",
      rubbish1: get("rubbishl1-select") === "yes",
      rubbish2: get("rubbishl2-select") === "yes",

      type: get("type-select"),
      inTraining: get("training-select") === "yes"
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
  console.log("loadDataStaff() executed");

  operators = await loadHybridJSON(GH_OPERATORS_PATH);
  training = await loadHybridJSON(GH_TRAINING_PATH);

  renderOperatorList();
  renderTrainingMatrix();
}

/* ============================================================
   OPERATOR LIST UI
============================================================ */
function addOperator(name, birthday = "") {
  name = name.trim();
  if (!name) return;
  if (operators.some(o => o.name.toLowerCase() === name.toLowerCase())) return;

  operators.push({
    name,
    birthday: birthday || "",
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
        sel.classList.add(labelText.toLowerCase().replace(/[^a-z]/g, "") + "-select");
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
      // ⭐ BIRTHDAY INPUT FIELD (DD/MM/YYYY)
      const birthdayInput = document.createElement("input");
      birthdayInput.type = "text";
      birthdayInput.placeholder = "DD/MM/YYYY";
      birthdayInput.value = op.birthday || "";
      birthdayInput.className = "birthday-input";

      birthdayInput.onchange = () => {
        op.birthday = birthdayInput.value.trim();
        markDirty();
      };

      li.appendChild(birthdayInput);

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
window.addEventListener("DOMContentLoaded", () => {
  if (!window._staffDataLoaded) {
    loadDataStaff();
    window._staffDataLoaded = true;
  }

  const addBtn = document.getElementById("addOpBtn");
  const input = document.getElementById("opInput");

  addBtn.onclick = () => {
    const name = input.value.trim();
    const birthday = document.getElementById("opBirthday").value.trim();

    addOperator(name, birthday);

    input.value = "";
    document.getElementById("opBirthday").value = "";
    input.focus();
  };

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const name = input.value.trim();
      const birthday = document.getElementById("opBirthday").value.trim();

      addOperator(name, birthday);

      input.value = "";
      document.getElementById("opBirthday").value = "";
    }
  });

  function protectNavigation(el) {
    el.addEventListener("click", (e) => {
      if (dirty) {
        const ok = confirm("You have unsaved changes. Leave without saving?");
        if (!ok) {
          e.preventDefault();
        }
      }
    });
  }

  // Protect all header navigation buttons EXCEPT Save
  document.querySelectorAll("header nav button:not(#saveToGitHubBtn)")
    .forEach(protectNavigation);

});