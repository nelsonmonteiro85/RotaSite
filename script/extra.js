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

  const solutionDisplay = solutionNames.length
    ? solutionNames.join(" / ")
    : (assignments[0]?.cells["QC1"] || "N/A");

  const rubbishDisplay = rubbishNames.length
    ? rubbishNames.join(" / ")
    : (lastRow.cells["Peel 2"] || "N/A");

  const trainingNames = operators
    .filter(o => o.line === line && o.inTraining)
    .map(o => o.name);

  const trainingDisplay = trainingNames.length
    ? trainingNames.join(" / ")
    : "N/A";

  // NEW: generate break grid HTML
  const breakGridHTML = generateBreakGridHTML(line);

  extrasDiv.innerHTML = `
  <div class="extras-grid">

    <!-- BREAK GRID spanning both rows -->
    <div class="extras-cell break-grid-span">
      ${breakGridHTML}
    </div>

    <!-- ROW 1 -->
    <div class="extras-cell">
      <table class="rota-table"><tr><th>Rubbish</th></tr><tr><td>${rubbishDisplay}</td></tr></table>
    </div>

    <div class="extras-cell">
      <table class="rota-table"><tr><th>Solution</th></tr><tr><td>${solutionDisplay}</td></tr></table>
    </div>

    <div class="extras-cell">
      <table class="rota-table"><tr><th>Training</th></tr><tr><td>${trainingDisplay}</td></tr></table>
    </div>

    <!-- ROW 2 -->
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
