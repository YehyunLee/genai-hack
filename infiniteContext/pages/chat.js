import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isInfiniteMode, setIsInfiniteMode] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [pdfInfo, setPdfInfo] = useState(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.includes('pdf')) {
      alert('Please select a valid PDF file');
      return;
    }

    setIsUploading(true);
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/uploadFile', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Set the PDF text and info
        setPdfText(data.text);
        setPdfInfo(data.info);
        
        setUploadedFile({
          name: data.info.fileName,
          size: data.info.fileSize,
          pageCount: data.info.pageCount
        });
        
        // Add a system message about the uploaded file and extracted text
        setMessages(prev => [
          ...prev, 
          {
            role: 'system',
            text: `File uploaded: ${data.info.fileName} (${data.info.fileSize}, ${data.info.pageCount} pages)`
          },
          {
            role: 'system',
            text: `Text extracted from PDF:\n\n${data.text}`
          }
        ]);
        
        adjustTextareaHeight();
      } else {
        alert('Failed to upload file: ' + data.error);
      }
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: userMessage.text,
        mode: isInfiniteMode ? 'infinite' : 'default',
        pdfText: pdfText // Send the PDF text to the chat API
      }),
    });
    const data = await res.json();
    const aiMessage = { 
      role: 'ai', 
      text: data.response,
      mode: data.mode,
      chunks: data.chunks 
    };
    setMessages(prev => [...prev, aiMessage]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Rest of your component remains the same
  
  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>AI Chat Assistant</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden md:flex w-64 bg-gray-800 flex-col p-4">
          <button className="flex items-center justify-center gap-2 px-4 py-2 mb-4 w-full rounded border border-white/20 text-white hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
          
          {/* Infinite context toggle */}
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => setIsInfiniteMode(!isInfiniteMode)}
              className={`flex items-center justify-between w-full px-4 py-2 rounded ${
                isInfiniteMode 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              } text-white transition-colors`}
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Infinite Context
              </span>
              <div className={`w-3 h-3 rounded-full ${isInfiniteMode ? 'bg-white' : 'bg-gray-400'}`} />
            </button>
            {isInfiniteMode && (
              <p className="text-xs text-gray-400 mt-2 px-4">
                Process unlimited text with auto-chunking
              </p>
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-8 ${
                msg.role === 'ai' ? 'bg-gray-800' : 
                msg.role === 'system' ? 'bg-gray-700' : 'bg-gray-900'
              }`}>
                <div className="max-w-3xl mx-auto flex space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'ai' ? 'bg-green-500' : 
                    msg.role === 'system' ? 'bg-gray-500' : 'bg-blue-500'
                  }`}>
                    {msg.role === 'ai' ? 'AI' : msg.role === 'system' ? 'S' : 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-100 whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-800 p-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative bg-gray-700 rounded-lg">
                <div className="flex">
                  {/* File upload button to the left of input */}
                  <div className="flex items-center pl-3">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf" 
                      onChange={handleFileUpload}
                      id="chat-file-upload" 
                    />
                    <label 
                      htmlFor="chat-file-upload" 
                      className="cursor-pointer p-2 rounded-full hover:bg-gray-600 transition-colors"
                      title="Upload PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </label>
                    {isUploading && (
                      <div className="ml-2 text-xs text-green-400 animate-pulse">
                        Uploading...
                      </div>
                    )}
                    {uploadedFile && !isUploading && (
                      <div className="ml-2 text-xs text-green-400 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        PDF
                      </div>
                    )}
                  </div>
                  
                  {/* Text input */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="flex-1 bg-transparent text-white rounded-t-lg pl-2 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-b border-gray-600"
                    placeholder="Send a message..."
                    style={{ maxHeight: '200px' }}
                  />
                  <button
                    onClick={sendMessage}
                    className="absolute right-2 top-2 p-1 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center px-4 py-2">
                  <button
                    onClick={() => setIsInfiniteMode(!isInfiniteMode)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      isInfiniteMode 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gray-600 hover:bg-gray-500'
                    } text-white transition-colors`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {isInfiniteMode ? 'Infinite Context Enabled' : 'Enable Infinite Context'}
                  </button>
                  <span className="text-xs text-gray-400 ml-3">
                    Press Enter to send, Shift + Enter for new line
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}