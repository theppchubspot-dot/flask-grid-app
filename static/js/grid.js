/* ================== HANDSONTABLE ================== */

const columns = [
  { type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { type: 'text' },
  { type: 'dropdown', source: ['Interested','Not Interested','Follow Up','Sale','No Response'] },
  { type: 'text' },
  { type: 'text' },
  { type: 'text' },
  { type: 'dropdown', source: ['Yes','No'] },
  { type: 'dropdown', source: ['Yes','No'] },
  { type: 'text' },
  { type: 'text' },
  { type: 'text' },
  { type: 'text' }
];

const headers = [
  'Dated','Caller ID','Disposition','Cx Name',
  'Alt Phone #','Email','Remote','Call Back',
  'Agent Name','Other Details','Comments','Auditor Comments'
];

const defaultData = Array.from({ length: 30 }, () =>
  Array(columns.length).fill('')
);

const container = document.getElementById("grid");

const data = Array.isArray(GRID_DATA) && GRID_DATA.length
  ? GRID_DATA
  : defaultData;

const hot = new Handsontable(container, {
  data: data,
  colHeaders: headers,
  rowHeaders: true,

  height: 'auto',
  width: '100%',
  stretchH: 'all',

  minRows: 30,
  minSpareRows: 1,
  minSpareCols: 1,     // 👈 column auto add

  autoWrapRow: true,
  autoWrapCol: true,

  contextMenu: true,   // 👈 now Insert Column will appear
  dropdownMenu: true,

  manualColumnResize: true,
  manualRowResize: true,

  licenseKey: 'non-commercial-and-evaluation'
});




/* ================== ADD COLUMN BUTTON (OPTIONAL BUT BEST) ================== */

function addColumn() {
  hot.alter('insert_col', hot.countCols());
  hot.updateSettings({
    colHeaders: [...hot.getColHeader(), `Column ${hot.countCols()}`]
  });
}

/* ================== AUTOSAVE ================== */

let timer = null;

hot.addHook('afterChange', (changes, source) => {
  if (source === 'loadData') return;

  clearTimeout(timer);
  timer = setTimeout(() => {
    fetch(`/autosave/${GRID_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hot.getData())
    });
  }, 1000);
});


/* ================== SHEET CONTROLS ================== */

let selectedGridId = null;
let selectedGridTitle = null;

/* Right-click menu */
function openMenu(e, gridId, title) {
  e.preventDefault();

  selectedGridId = gridId;
  selectedGridTitle = title;

  const menu = document.getElementById("contextMenu");
  menu.style.display = "block";
  menu.style.top = e.pageY + "px";
  menu.style.left = e.pageX + "px";
}

/* Hide menu on click */
document.addEventListener("click", () => {
  const menu = document.getElementById("contextMenu");
  if (menu) menu.style.display = "none";
});

/* Double-click rename */
function renameByDblClick(e, gridId, title) {
  e.preventDefault();
  e.stopPropagation();
  renameGrid(gridId, title);
}

/* Rename logic */
function renameGrid(gridId, title) {
  const newName = prompt("Rename sheet", title);
  if (!newName) return;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/rename-grid/${gridId}`;

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "title";
  input.value = newName;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

/* Context menu actions */
function deleteSheet() {
  if (confirm("Delete this sheet?")) {
    window.location.href = `/delete-grid/${selectedGridId}`;
  }
}

function pinSheet() {
  window.location.href = `/pin-grid/${selectedGridId}`;
}



