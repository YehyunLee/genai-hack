import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('API_KEY');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;

    try {
      const result = await model.generateContent(message);
      res.status(200).json({ response: result.response.text() });
    } catch (error) {
      console.error('Error generating AI response:', error);
      res.status(500).json({ error: 'Error generating response. Please try again.' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}