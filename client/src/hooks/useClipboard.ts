import { useState } from 'react';

export function useClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      // Clean AI artifacts before copying
      const cleanedText = cleanAiArtifacts(text);
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanedText);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = cleanedText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  };

  return { copyToClipboard, isCopied };
}

function cleanAiArtifacts(text: string): string {
  return text
    .replace(/As an AI[^.]*\./gi, '')
    .replace(/I'm an AI[^.]*\./gi, '')
    .replace(/As a language model[^.]*\./gi, '')
    .replace(/I don't have access to[^.]*\./gi, '')
    .replace(/Please note that[^.]*\./gi, '')
    .replace(/\*\*Note:\*\*[^.]*\./gi, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .trim();
}