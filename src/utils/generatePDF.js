import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateInvoicePDF = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Temporarily hide elements that shouldn't be printed/downloaded
    const hiddenElements = element.querySelectorAll('.print\\:hidden');
    hiddenElements.forEach(el => {
      el.style.display = 'none';
    });

    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true, // Support external images
      backgroundColor: '#ffffff',
    });

    // Restore hidden elements
    hiddenElements.forEach(el => {
      el.style.display = '';
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create A4 PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename || 'Invoice.pdf');
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};
