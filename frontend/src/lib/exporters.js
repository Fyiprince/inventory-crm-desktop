import { toast } from 'sonner';

export async function exportToExcel(rows, columns, filename = 'export.xlsx', sheetName = 'Sheet1') {
  try {
    const XLSX = await import('xlsx');
    const data = rows.map((row) => {
      const obj = {};
      columns.forEach((c) => {
        obj[c.header] = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Excel export failed:', error);
    toast.error(`Excel export failed: ${error.message}`);
  }
}

export async function exportToPDF(rows, columns, title = 'Report', filename = 'export.pdf') {
  try {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(16);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 40, 58);

    autoTable(doc, {
      startY: 80,
      head: [columns.map((c) => c.header)],
      body: rows.map((row) => columns.map((c) => {
        const v = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
        return v == null ? '' : String(v);
      })),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 251] },
    });

    doc.save(filename);
  } catch (error) {
    console.error('PDF export failed:', error);
    toast.error(`PDF export failed: ${error.message}`);
  }
}

export function printReport(title, headers, rows) {
  const win = window.open('', '_blank');
  const style = `
    <style>
      body { font-family: 'IBM Plex Sans', -apple-system, sans-serif; padding: 32px; color:#111; }
      h1 { font-family: 'Manrope', sans-serif; letter-spacing: -0.02em; margin: 0 0 8px 0; }
      .meta { color: #666; margin-bottom: 24px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
      th { background:#f4f4f5; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; color:#52525b; }
    </style>
  `;
  const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
  const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('');
  win.document.write(`
    <html><head><title>${title}</title>${style}</head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Generated ${new Date().toLocaleString('en-IN')}</div>
      <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
      <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
    </body></html>
  `);
  win.document.close();
}
