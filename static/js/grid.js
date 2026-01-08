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

const defaultData = Array.from({ length: 20 }, () =>
  Array(columns.length).fill('')
);

const container = document.getElementById("grid");

const data = Array.isArray(GRID_DATA) && GRID_DATA.length
  ? GRID_DATA
  : defaultData;

const hot = new Handsontable(container, {
  data,
  columns,
  colHeaders: headers,
  rowHeaders: true,

  height: '100%',            // ✅ FULL PAGE
  width: '100%',
  stretchH: 'all',

  minRows: 15,               // 👈 neeche blank kam
  minSpareRows: 1,
  minSpareCols: 1,

  autoWrapRow: true,
  autoWrapCol: true,

  contextMenu: true,
  dropdownMenu: true,

  manualColumnResize: true,
  manualRowResize: true,

  licenseKey: 'non-commercial-and-evaluation'
});


/* ================== AUTO COLUMN SYNC (VERY IMPORTANT) ================== */

hot.addHook('afterCreateCol', (index, amount) => {
  for (let i = 0; i < amount; i++) {
    columns.splice(index, 0, { type: 'text' });
    headers.splice(index, 0, `Column ${headers.length + 1}`);
  }

  hot.updateSettings({
    columns,
    colHeaders: headers
  });
});


/* ================== ADD COLUMN BUTTON ================== */

function addColumn() {
  hot.alter('insert_col', hot.countCols());
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
  }, 800);
});
