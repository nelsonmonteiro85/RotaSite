function renderExtras(assignments, operators, line, extrasDiv) {

    const lastRow = assignments[assignments.length - 1] || { cells: {} };
    const opsLine = operators.filter(o => o.line === line && !o.inTraining);

    function getAllNames(field) {
        const list = opsLine.filter(o => o[field]).map(o => o.name);
        return list.length ? list.join(" / ") : "N/A";
    }

    const rubbishName = lastRow.cells["Peel 2"] || "N/A";
    const solutionName = assignments[0]?.cells["QC1"] || "N/A";

    const trainingNames = operators
        .filter(o => o.line === line && o.inTraining)
        .map(o => o.name);
    const trainingDisplay = trainingNames.length
        ? trainingNames.join(" / ")
        : "N/A";

    extrasDiv.innerHTML = `
<div class="extras-grid">

  <!-- ROW 1 -->
  <div class="extras-cell">
    ${document.getElementById("breakGrid")?.outerHTML || "<div>No break grid</div>"}
  </div>

  <div class="extras-cell">
    <table class="rota-table"><tr><th>Rubbish</th></tr><tr><td>${rubbishName}</td></tr></table>
  </div>

  <div class="extras-cell">
    <table class="rota-table"><tr><th>Solution</th></tr><tr><td>${solutionName}</td></tr></table>
  </div>

  <!-- ROW 2 -->
  <div class="extras-cell">
    <table class="rota-table"><tr><th>Training</th></tr><tr><td>${trainingDisplay}</td></tr></table>
  </div>

  <div class="extras-cell">
    <table class="rota-table"><tr><th>OEE</th></tr><tr><td>${getAllNames("oee")}</td></tr></table>
  </div>

  <div class="extras-cell">
    <table class="rota-table"><tr><th>Puck Cleaning</th></tr><tr><td>${getAllNames("puckClean")}</td></tr></table>
  </div>

  <div class="extras-cell">
    <table class="rota-table"><tr><th>EXTRA</th></tr><tr><td>${getAllNames("extra")}</td></tr></table>
  </div>

</div>`;
}
