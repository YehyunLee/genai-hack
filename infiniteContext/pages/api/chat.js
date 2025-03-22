export default function handler(req, res) {
  if (req.method === 'POST') {
    // Dummy response simulating AI processing
    const { message } = req.body;
    res.status(200).json({ response: `Dummy response to: "${message}"` });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}