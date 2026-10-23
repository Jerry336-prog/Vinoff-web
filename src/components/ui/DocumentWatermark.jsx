import { DOCUMENT_WATERMARK, getDocumentWatermarkText } from '../../utils/documentWatermark';

export default function DocumentWatermark({ text, printOnly = false, repeatOnPrint = false }) {
  const label = getDocumentWatermarkText(text);
  const fontSize = Math.min(1000 * DOCUMENT_WATERMARK.fontScale / DOCUMENT_WATERMARK.widthRatio, 1000 / (label.length * 0.85));

  return (
    <div
      className={`document-watermark${printOnly ? ' document-watermark--print-only' : ''}${repeatOnPrint ? ' document-watermark--repeat' : ''}`}
      aria-hidden="true"
      data-html2canvas-ignore="true"
    >
      <svg viewBox="0 0 1000 120" focusable="false" style={{ width: `${DOCUMENT_WATERMARK.widthRatio * 100}%`, color: DOCUMENT_WATERMARK.color, opacity: DOCUMENT_WATERMARK.opacity, transform: `rotate(${DOCUMENT_WATERMARK.angle}deg)` }}>
        <text x="500" y="60" textAnchor="middle" dominantBaseline="central" fill="currentColor" fontFamily={DOCUMENT_WATERMARK.fontFamily} fontSize={fontSize} fontWeight="400">{label}</text>
      </svg>
    </div>
  );
}
