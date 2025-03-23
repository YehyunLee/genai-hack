import { jsPDF } from 'jspdf';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    const doc = new jsPDF();
    
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    messages.forEach((msg) => {
      if (msg.role === 'ai') {
        // Add role indicator
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('AI Response:', margin, yPos);
        yPos += lineHeight;

        // Add message content
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        const textLines = doc.splitTextToSize(msg.text, doc.internal.pageSize.width - 2 * margin);
        
        textLines.forEach((line) => {
          if (yPos > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin, yPos);
          yPos += lineHeight;
        });

        yPos += lineHeight; // Add extra space between messages
      }
    });

    const pdfBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=textbook.pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}