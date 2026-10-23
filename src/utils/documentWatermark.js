export const DOCUMENT_WATERMARK = {
  text: 'VINOFF & CO.NIG.LTD',
  color: '#475569',
  opacity: 0.075,
  angle: -24,
  widthRatio: 0.68,
  fontScale: 0.06,
  fontFamily: 'Helvetica, Arial, sans-serif',
};

export const getDocumentWatermarkText = (text) =>
  String(text ?? '').replace(/\s+/g, ' ').trim() || DOCUMENT_WATERMARK.text;

export const drawDocumentWatermark = (context, width, height, text) => {
  const label = getDocumentWatermarkText(text);
  const style = DOCUMENT_WATERMARK;
  const fontSize = width * style.fontScale;

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(style.angle * Math.PI / 180);
  context.globalAlpha = style.opacity;
  context.fillStyle = style.color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `400 ${fontSize}px ${style.fontFamily}`;
  const textWidth = context.measureText(label).width;
  const fittedSize = fontSize * Math.min(1, width * style.widthRatio / textWidth);
  context.font = `400 ${fittedSize}px ${style.fontFamily}`;
  context.fillText(label, 0, 0, width * style.widthRatio);
  context.restore();
};

// Apply the mark after pagination so every page has one complete, centered mark.
export const appendCanvasToPDF = (pdf, canvas, watermarkText, createCanvas = () => document.createElement('canvas')) => {
  if (canvas.width <= 0 || canvas.height <= 0) throw new Error('Cannot export an empty document.');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageCanvasHeight = Math.max(1, Math.floor(canvas.width * pageHeight / pageWidth));

  for (let offset = 0; offset < canvas.height; offset += pageCanvasHeight) {
    const sliceHeight = Math.min(pageCanvasHeight, canvas.height - offset);
    const page = createCanvas();
    page.width = canvas.width;
    page.height = pageCanvasHeight;
    const context = page.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, page.width, page.height);
    context.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    drawDocumentWatermark(context, page.width, page.height, watermarkText);

    if (offset > 0) pdf.addPage();
    pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, pageHeight);
  }
};
