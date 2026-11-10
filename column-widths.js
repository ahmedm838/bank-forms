/* Column widths you can drag, shared by Banks, Suppliers and Transactions.

   A table that uses this lays its columns out in pixels rather than letting the
   browser guess, so dragging one heading's edge widens that column and leaves
   the rest alone. Widths are remembered per page under `key`, and
   double-clicking a grip puts one column back to its default.

   The table needs `table-layout: fixed` and the `resizable` class for the grips
   to sit where they should — `.listtable.resizable` in styles.css does both. */
window.ColumnWidths = function ColumnWidths(opts){
  const { key, onReset } = opts;
  const MIN = opts.min || 44;

  let widths = (() => {
    try { return window.BankFormsMemory[key] || {}; }
    catch(e){ return {}; }
  })();
  const save = () => {
    try { window.BankFormsMemory[key] = Object.assign({}, widths); } catch(e){}
  };

  const widthOf = col => Math.max(MIN, Number(widths[col.key]) || col.width);

  function grip(col){
    const g = document.createElement('span');
    g.className = 'resizer';
    g.title = 'Drag to resize · double-click to reset';
    g.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const startX = e.clientX, startW = widthOf(col), th = g.parentElement;
      document.body.classList.add('resizing');
      const move = ev => {
        const w = Math.max(MIN, startW + ev.clientX - startX);
        widths[col.key] = w;
        th.style.width = w + 'px';        // live, without rebuilding the table
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.body.classList.remove('resizing');
        save();
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
    g.addEventListener('dblclick', e => {
      e.preventDefault(); e.stopPropagation();
      delete widths[col.key]; save(); onReset();
    });
    return g;
  }

  /* give a heading its width and its grip */
  function head(th, col){
    th.style.width = widthOf(col) + 'px';
    th.appendChild(grip(col));
    return th;
  }

  return { widthOf, grip, head };
};
