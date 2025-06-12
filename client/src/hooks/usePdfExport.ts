import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useState } from 'react';

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPdf = async (elementId: string, filename: string = 'document.pdf') => {
    setIsExporting(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      // Clean up AI artifacts before export
      const clonedElement = element.cloneNode(true) as HTMLElement;
      cleanAiArtifacts(clonedElement);

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToPdf, isExporting };
}

function cleanAiArtifacts(element: HTMLElement) {
  // Remove common AI artifacts from text content
  const textNodes = getTextNodes(element);
  
  textNodes.forEach(node => {
    if (node.textContent) {
      let cleanedText = node.textContent
        .replace(/As an AI[^.]*\./gi, '')
        .replace(/I'm an AI[^.]*\./gi, '')
        .replace(/As a language model[^.]*\./gi, '')
        .replace(/I don't have access to[^.]*\./gi, '')
        .replace(/Please note that[^.]*\./gi, '')
        .replace(/\*\*Note:\*\*[^.]*\./gi, '')
        .trim();
      
      if (cleanedText !== node.textContent) {
        node.textContent = cleanedText;
      }
    }
  });
}

function getTextNodes(element: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  return textNodes;
}