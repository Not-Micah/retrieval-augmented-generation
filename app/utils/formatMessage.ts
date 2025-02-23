export function formatMessageText(text: string) {
  // First, handle the bold text (text between **)
  const boldRegex = /\*\*(.*?)\*\*/g;
  const textWithBold = text.replace(boldRegex, '<strong>$1</strong>');
  
  // Split by actual line breaks or \n
  const lines = textWithBold.split(/\\n|\n/);
  
  return lines;
}
