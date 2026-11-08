/* The editable table both list pages use: rows you can type into, add, remove
   and reorder, with an order column you edit directly.

   A column is { key, label, width, type }. `type` may be 'order', 'select'
   (with `options()` and an optional `onChange`), or left out for plain text. */
window.ListTable = function ListTable(opts){
  const { mount, columns, onChange } = opts;
  let rows = opts.rows || [];
  const filters = {};

  function applyFilters(tb){
    Array.from(tb.children).forEach((tr, i) => {
      tr.hidden = !columns.every(c => String(rows[i][c.key] == null ? '' : rows[i][c.key])
        .toLowerCase().includes((filters[c.key] || '').toLowerCase().trim()));
    });
  }

  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  function renumber(){
    rows.forEach((r, i) => { r.order = i + 1; });
  }
  function sortRows(){
    rows.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }
  function changed(){
    onChange(rows);
  }

  function cellInput(row, col){
    if (col.type === 'select'){
      const sel = document.createElement('select');
      sel.appendChild(new Option('—', ''));
      for (const o of col.options()){
        const opt = new Option(o.label, o.value);
        if (String(row[col.key] || '') === String(o.value)) opt.selected = true;
        sel.appendChild(opt);
      }
      // a value that matches nothing on the list is still shown, so an import
      // that could not be placed stays visible instead of silently emptying
      if (row[col.key] && ![...sel.options].some(o => o.selected)){
        const opt = new Option(row[col.key] + '  (not on the list)', row[col.key]);
        opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        row[col.key] = sel.value;
        if (col.onChange) col.onChange(row, sel.value);
        changed(); render();
      });
      return sel;
    }

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.dir = col.dir || 'auto';
    inp.value = row[col.key] == null ? '' : row[col.key];
    if (col.placeholder) inp.placeholder = col.placeholder;
    if (col.type === 'order'){
      inp.inputMode = 'numeric';
      inp.addEventListener('change', () => {
        row.order = Number(inp.value) || 0;
        sortRows(); renumber(); changed(); render();
      });
    } else {
      inp.addEventListener('input', () => {
        row[col.key] = col.upper ? inp.value.toUpperCase() : inp.value;
        if (col.upper) inp.value = row[col.key];
        changed();
        if (col.live) render();
      });
    }
    return inp;
  }

  function render(){
    mount.innerHTML = '';
    const table = el('table', 'listtable');

    const thead = el('thead'), hr = el('tr');
    for (const c of columns) hr.appendChild(el('th', null, c.label));
    hr.appendChild(el('th', null, ''));
    thead.appendChild(hr);
    const filterRow = el('tr', 'filterrow');
    for(const c of columns){
      const th = el('th');
      const input = document.createElement('input');
      input.type = 'search'; input.placeholder = 'Filter…';
      input.setAttribute('aria-label', 'Filter ' + c.label);
      input.value = filters[c.key] || '';
      input.addEventListener('input', () => {
        filters[c.key] = input.value;
        applyFilters(table.querySelector('tbody'));
      });
      th.appendChild(input); filterRow.appendChild(th);
    }
    filterRow.appendChild(el('th'));
    thead.appendChild(filterRow);
    table.appendChild(thead);

    const tb = el('tbody');
    rows.forEach((row, i) => {
      const tr = el('tr');
      for (const c of columns){
        const td = el('td');
        if (c.width) td.style.width = c.width;
        td.appendChild(cellInput(row, c));
        tr.appendChild(td);
      }
      const act = el('td', 'rowacts');
      const up = el('button', 'iconbtn', '↑'); up.type = 'button'; up.title = 'Move up';
      up.disabled = i === 0;
      up.addEventListener('click', () => { rows.splice(i-1, 0, rows.splice(i,1)[0]); renumber(); changed(); render(); });
      const down = el('button', 'iconbtn', '↓'); down.type = 'button'; down.title = 'Move down';
      down.disabled = i === rows.length - 1;
      down.addEventListener('click', () => { rows.splice(i+1, 0, rows.splice(i,1)[0]); renumber(); changed(); render(); });
      const del = el('button', 'iconbtn danger', '✕'); del.type = 'button'; del.title = 'Remove';
      del.addEventListener('click', () => {
        const what = row[columns[1] ? columns[1].key : columns[0].key] || 'this row';
        if (!confirm('Remove ' + what + '?')) return;
        rows.splice(i, 1); renumber(); changed(); render();
      });
      act.append(up, down, del);
      tr.appendChild(act);
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    applyFilters(tb);

    if (!rows.length){
      const p = el('p', 'hint', 'Nothing here yet. Add a row, or import a spreadsheet.');
      mount.appendChild(p);
    }
    mount.appendChild(table);
  }

  return {
    render,
    get rows(){ return rows; },
    set rows(v){ Object.keys(filters).forEach(key=>delete filters[key]); rows = v; sortRows(); renumber(); render(); },
    add(blank){ Object.keys(filters).forEach(key => delete filters[key]);
                rows.push(Object.assign({ order: rows.length + 1 }, blank)); renumber(); changed(); render();
                mount.querySelector('tbody tr:last-child input').focus(); },
    renumber, sortRows,
  };
};
