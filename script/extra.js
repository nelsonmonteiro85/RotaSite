function renderExtras(assignments, operators, line, extrasDiv) {

  const lastRow = assignments[assignments.length - 1] || { cells: {} };
  const opsLine = operators.filter(o => o.line === line);


  function getAllNames(field) {
    const list = opsLine.filter(o => o[field]).map(o => o.name);
    return list.length ? list.join(" / ") : "N/A";
  }

  // MULTIPLE manual solutions
  const solutionNames = operators
    .filter(o => o.solution && o.line === line)
    .map(o => o.name);

  // MULTIPLE manual rubbish operators
  const rubbishNames = operators
    .filter(o => (o.rubbish1 || o.rubbish2) && o.line === line)
    .map(o => o.name);

  // If TL assigned → use all assigned
  // If not → use automatic QC1 / Peel2
  const solutionDisplay = solutionNames.length
    ? solutionNames.join(" / ")
    : (assignments[0]?.cells["QC1"] || "N/A");

  const rubbishDisplay = rubbishNames.length
    ? rubbishNames.join(" / ")
    : (lastRow.cells["Peel 2"] || "N/A");

  // MULTIPLE training operators already supported
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
    <table class="rota-table"><tr><th>Rubbish</th></tr><tr><td>${rubbishDisplay}</td></tr></table>
  </div>

  <div class="extras-cell">
    <table class="rota-table"><tr><th>Solution</th></tr><tr><td>${solutionDisplay}</td></tr></table>
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
