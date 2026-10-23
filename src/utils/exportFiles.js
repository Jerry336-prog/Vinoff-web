import { zip, strToU8 } from 'fflate';

export const safeExportFilename = value => String(value || 'export')
  .replace(/[<>:"/\\|?*\p{Cc}]/gu, '_').replace(/^\.+/, '').trim().slice(0, 160) || 'export';

export const createCSVContent = (headers, rows) => {
  const cell = value => {
    let text = String(value ?? '');
    if (typeof value !== 'number' && /^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\ufeff' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
};

export const saveExportBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeExportFilename(filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const createExportArchive = async (files, manifest, { signal } = {}) => {
  const entries = Object.create(null);
  for (const file of files) {
    signal?.throwIfAborted();
    const name = safeExportFilename(file.name);
    if (name === 'export-manifest.csv') throw new Error('The archive manifest filename is reserved.');
    if (entries[name]) throw new Error(`Duplicate archive filename: ${name}`);
    entries[name] = new Uint8Array(await file.arrayBuffer());
  }
  entries['export-manifest.csv'] = strToU8(createCSVContent(['File', 'Record', 'Date', 'Result'], manifest));
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    let terminate;
    const abort = () => { terminate?.(); reject(new DOMException('Export cancelled.', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    terminate = zip(entries, { level: 0 }, (error, data) => {
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else if (signal?.aborted) abort();
      else resolve(new Blob([data], { type: 'application/zip' }));
    });
    if (signal?.aborted) abort();
  });
};
