import { useState } from 'react';
import Head from 'next/head';

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Call the simple JS backend
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage.text }),
    });
    const data = await res.json();
    const aiMessage = { role: 'ai', text: data.response };
    setMessages(prev => [...prev, aiMessage]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Head>
        <title>Chat with AI</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="max-w-xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Chat</h1>
        <div className="h-64 overflow-y-auto border border-gray-200 p-2 mb-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block px-3 py-2 rounded ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-grow border border-gray-300 rounded-l px-3 py-2 focus:outline-none"
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            className="bg-green-500 text-white px-4 py-2 rounded-r hover:bg-green-600"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
