// Simulated chunk processing
const processLongText = (text) => {
  // Simulate splitting text into chunks
  const chunks = text.match(/.{1,100}/g) || [];
  return chunks.map(chunk => ({
    chunk,
    summary: `Processed chunk of size ${chunk.length}`
  }));
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, mode } = req.body;

  try {
    if (mode === 'infinite') {
      // Handle infinite context mode
      const chunks = processLongText(message);
      const combinedResponse = chunks.map(c => c.summary).join('\n');
      
      return res.status(200).json({
        response: `Infinite Context Processing Results:\n${combinedResponse}`,
        chunks: chunks,
        mode: 'infinite'
      });
    } else {
      // Default chat mode with length limit
      if (message.length > 500) {
        return res.status(400).json({
          error: 'Message too long for default mode. Use infinite context mode.',
          mode: 'default'
        });
      }
      
      return res.status(200).json({
        response: `Default chat response to: "${message.substring(0, 50)}..."`,
        mode: 'default'
      });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}