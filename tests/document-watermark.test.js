import test from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENT_WATERMARK, getDocumentWatermarkText, drawDocumentWatermark, appendCanvasToPDF } from '../src/utils/documentWatermark.js';

function contextHarness() {
  const calls = [];
  const context = {
    globalAlpha: 1,
    fillStyle: '#000000',
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    translate(...args) { calls.push(['translate', ...args]); },
    rotate(...args) { calls.push(['rotate', ...args]); },
    measureText(text) { return { width: text.length * parseFloat(this.font.split(' ')[1]) * 0.6 }; },
    fillText(...args) { calls.push(['text', ...args, { font: this.font, color: this.fillStyle, opacity: this.globalAlpha }]); },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    drawImage(...args) { calls.push(['drawImage', ...args]); },
  };
  return { context, calls };
}

function exportHarness(width = 210, height = 297) {
  const pages = [];
  const images = [];
  let addedPages = 0;
  const pdf = {
    internal: { pageSize: { getWidth: () => width, getHeight: () => height } },
    addPage() { addedPages++; },
    addImage(...args) { images.push(args); },
  };
  const createCanvas = () => {
    const harness = contextHarness();
    const page = { ...harness, getContext: () => harness.context, toDataURL: () => 'data:image/jpeg;base64,fixture' };
    pages.push(page);
    return page;
  };
  return { pdf, pages, images, createCanvas, addedPages: () => addedPages };
}

test('watermarks retain custom company names and normalize whitespace', () => {
  assert.equal(getDocumentWatermarkText('  Vinoff  & Co.\nLtd  '), 'Vinoff & Co. Ltd');
  assert.equal(getDocumentWatermarkText('Société & 公司'), 'Société & 公司');
  for (const value of [null, undefined, '', '   ']) {
    assert.equal(getDocumentWatermarkText(value), DOCUMENT_WATERMARK.text);
  }
});

test('draws a single understated watermark centered on the page', () => {
  const { context, calls } = contextHarness();
  drawDocumentWatermark(context, 800, 1131, 'VINOFF & CO.NIG.LTD');
  const marks = calls.filter(call => call[0] === 'text');
  assert.equal(marks.length, 1);
  assert.deepEqual(calls[1], ['translate', 400, 565.5]);
  assert.equal(marks[0][2], 0);
  assert.equal(marks[0][3], 0);
  assert.equal(marks[0][5].color, '#475569');
  assert.ok(marks[0][5].opacity < 0.1);
  assert.match(marks[0][5].font, /^400 /);
  assert.equal(calls.at(-1)[0], 'restore');
});

test('long company names shrink to fit rather than clipping or repeating', () => {
  const { context, calls } = contextHarness();
  const label = 'A very long custom business name '.repeat(12).trim();
  drawDocumentWatermark(context, 800, 1131, label);
  const [, text, , , maxWidth, style] = calls.find(call => call[0] === 'text');
  assert.equal(text, label);
  assert.ok(parseFloat(style.font.split(' ')[1]) < 800 * DOCUMENT_WATERMARK.fontScale);
  assert.ok(context.measureText(text).width <= maxWidth + 0.001);
});

test('portrait PDFs have one complete watermark on each page, including a short final page', () => {
  const h = exportHarness();
  const source = { width: 800, height: 2450 };
  appendCanvasToPDF(h.pdf, source, 'CUSTOM COMPANY', h.createCanvas);
  assert.equal(h.pages.length, 3);
  assert.equal(h.addedPages(), 2);
  h.pages.forEach(page => {
    assert.equal(page.height, 1131);
    assert.equal(page.calls.filter(call => call[0] === 'text').length, 1);
    assert.equal(page.calls.find(call => call[0] === 'text')[1], 'CUSTOM COMPANY');
  });
  assert.equal(h.pages[2].calls.find(call => call[0] === 'drawImage')[5], 188);
  assert.deepEqual(h.images[2].slice(2), [0, 0, 210, 297]);
});

test('landscape report PDFs use the same single watermark and preserve all source slices', () => {
  const h = exportHarness(297, 210);
  const source = { width: 1100, height: 1800 };
  appendCanvasToPDF(h.pdf, source, 'AUDIT COMPANY', h.createCanvas);
  assert.equal(h.pages.length, 3);
  assert.equal(h.pages[0].height, 777);
  const draws = h.pages.map(page => page.calls.find(call => call[0] === 'drawImage'));
  assert.deepEqual(draws.map(draw => draw[3]), [0, 777, 1554]);
  assert.equal(draws.reduce((sum, draw) => sum + draw[5], 0), source.height);
  assert.deepEqual(h.images[0].slice(2), [0, 0, 297, 210]);
});

test('a document ending exactly at a page boundary creates no extra blank page', () => {
  const h = exportHarness();
  appendCanvasToPDF(h.pdf, { width: 800, height: 2262 }, undefined, h.createCanvas);
  assert.equal(h.pages.length, 2);
  assert.equal(h.addedPages(), 1);
});

test('empty captures fail cleanly instead of producing corrupt PDFs', () => {
  const h = exportHarness();
  assert.throws(() => appendCanvasToPDF(h.pdf, { width: 0, height: 100 }, '', h.createCanvas), /empty document/);
  assert.equal(h.images.length, 0);
});
