import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { logout } from "./auth/auth";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfText, setPdfText] = useState({});
  const [pdfInfo, setPdfInfo] = useState(null);
  const [error, setError] = useState(null);
  const [fullText, setFullText] = useState(null);  // Store loaded text from file or clipboard
  const [textSource, setTextSource] = useState(null); // 'clipboard' or 'pdf'
  const [clipboardText, setClipboardText] = useState({});
  const [activeSource, setActiveSource] = useState(null); // 'clipboard' or 'pdf'
  const [sourceOrder, setSourceOrder] = useState([]); // ['pdf', 'clipboard']
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [processingChunks, setProcessingChunks] = useState({});
  const [visibleMessages, setVisibleMessages] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        window.location.href = '/auth/login'; // Redirect to login page
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handlePaste = async (e) => {
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).length;
    
    if (wordCount > 100) { // Threshold for treating as full text
      e.preventDefault(); // Prevent pasting into textarea
      const newClipboardText = {
        id: Date.now(), // Add unique id for each clipboard
        content: pastedText,
        wordCount,
        timestamp: Date.now()
      };
      setSourceOrder(prev => [...prev, `clipboard-${newClipboardText.id}`]);
      setClipboardText(prev => ({
        ...prev,
        [newClipboardText.id]: newClipboardText
      }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.includes('pdf')) {
      alert('Please select a valid PDF file');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploadFile', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        const pdfData = {
          id: Date.now(),
          content: data.text,
          wordCount: data.text.trim().split(/\s+/).length,
          fileInfo: {
            fileName: data.info.fileName,
            fileSize: data.info.fileSize,
            pageCount: data.info.pageCount
          },
          timestamp: Date.now()
        };
        
        setPdfText(prev => ({
          ...prev,
          [pdfData.id]: pdfData
        }));
        setSourceOrder(prev => [...prev, `pdf-${pdfData.id}`]);
        
        // Comment out the system messages
        /* setMessages(prev => [
          ...prev, 

        setPdfText(data.text);
        setPdfInfo(data.info);

        setUploadedFile({
          name: data.info.fileName,
          size: data.info.fileSize,
          pageCount: data.info.pageCount
        });

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
        ]); */
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

  useEffect(() => {
    if (activeSource) {
      setIsInfiniteMode(true);
    }
  }, [activeSource]);

  useEffect(() => {
    if (activeSource && !sourceOrder.includes(activeSource)) {
      setSourceOrder(prev => [...prev, activeSource]);
    }
  }, [activeSource]);

  const handleDragStart = (e, source) => {
    dragItem.current = source;
  };

  const handleDragOver = (e, source) => {
    e.preventDefault();
    dragOverItem.current = source;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const newOrder = [...sourceOrder];
    const dragItemIndex = sourceOrder.indexOf(dragItem.current);
    const dragOverItemIndex = sourceOrder.indexOf(dragOverItem.current);
    newOrder.splice(dragItemIndex, 1);
    newOrder.splice(dragOverItemIndex, 0, dragItem.current);
    setSourceOrder(newOrder);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const updateChunkResponse = (newChunk) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === 'ai' && lastMessage.mode === 'infinite') {
        // Store new chunk while maintaining order
        const updatedChunks = {
          ...lastMessage.chunks,
          [newChunk.chunkNumber]: newChunk
        };

        // Create ordered response text from available chunks
        const orderedResponses = Object.values(updatedChunks)
          .sort((a, b) => a.chunkNumber - b.chunkNumber)
          .map(chunk => {
            if (chunk.error) {
              return `[Part ${chunk.chunkNumber}/${chunk.totalChunks}] Error: ${chunk.error}`;
            }
            return `[Part ${chunk.chunkNumber}/${chunk.totalChunks}]\n${chunk.response}`;
          })
          .join('\n\n');

        // Update message with latest chunks
        return [
          ...prev.slice(0, -1),
          {
            ...lastMessage,
            text: orderedResponses,
            chunks: updatedChunks,
            status: 'streaming'
          }
        ];
      }
      return prev;
    });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setError(null);
    const userMessage = { role: 'user', text: input };
    adjustTextareaHeight();

    try {
      if (new Blob([input]).size > 10 * 1024 * 1024) {
        throw new Error('Message is too large. Please reduce the size.');
      }

      setMessages(prev => [...prev, userMessage]);
      setInput('');
      
      // Initialize empty AI message
      const initialAiMessage = {
        role: 'ai',
        text: 'Processing chunks...',
        mode: 'infinite',
        chunks: {}
      };
      setMessages(prev => [...prev, initialAiMessage]);
      
      const combinedText = sourceOrder.map(sourceId => {
        const [type, id] = sourceId.split('-');
        return type === 'pdf' ? pdfText[id].content : clipboardText[id].content;
      }).join('\n\n');

      const payload = {
        message: userMessage.text,
        mode: sourceOrder.length > 0 ? 'infinite' : 'default',
        fullText: combinedText || null,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          try {
            const chunk = JSON.parse(line);
            switch (chunk.type) {
              case 'chunk':
                updateChunkResponse(chunk.data);
                break;
              case 'complete':
                // Update final status if needed
                break;
              case 'error':
                setError(chunk.data.message);
                break;
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const switchSource = (source) => {
    if (source === 'clipboard' && clipboardText) {
      setActiveSource('clipboard');
      setFullText({
        content: clipboardText.content,
        wordCount: clipboardText.wordCount,
        source: 'clipboard'
      });
    } else if (source === 'pdf' && pdfText) {
      setActiveSource('pdf');
      setFullText({
        content: pdfText.content,
        wordCount: pdfText.wordCount,
        source: 'pdf',
        fileInfo: pdfText.fileInfo
      });
    }
  };

  const FullTextIndicator = () => sourceOrder.length > 0 && (
    <div className="flex flex-col gap-1 px-3 py-2 bg-gray-800 rounded-t-lg border-b border-gray-600">
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-600 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Infinite Context</span>
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
        <div className="flex items-center flex-wrap gap-1">
          {sourceOrder.map((sourceId, index) => {
            const [type, id] = sourceId.split('-');
            const source = type === 'pdf' ? pdfText[id] : clipboardText[id];
            
            return (
              <div
                key={sourceId}
                className="flex items-center"
              >
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, sourceId)}
                  onDragOver={(e) => handleDragOver(e, sourceId)}
                  onDrop={handleDrop}
                  className="flex items-center bg-gray-700 px-3 py-1 rounded-full cursor-move group hover:bg-gray-600"
                >
                  {type === 'pdf' ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-white">
                        {source?.fileInfo?.fileName || 'PDF'}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-sm text-white">Clipboard Text</span>
                    </>
                  )}
                  <button
                    onClick={() => {
                      const [type, id] = sourceId.split('-');
                      if (type === 'clipboard') {
                        setClipboardText(prev => {
                          const { [id]: removed, ...rest } = prev;
                          return rest;
                        });
                      } else {
                        setPdfText(prev => {
                          const { [id]: removed, ...rest } = prev;
                          return rest;
                        });
                      }
                      setSourceOrder(prev => prev.filter(s => s !== sourceId));
                    }}
                    className="ml-2 text-gray-400 hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* {index < sourceOrder.length - 1 && (
                  <div className="px-1 text-gray-400">+</div>
                )} */}
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        Total words: {
          sourceOrder.reduce((total, sourceId) => {
            const [type, id] = sourceId.split('-');
            const source = type === 'pdf' ? pdfText[id] : clipboardText[id];
            return total + (source?.wordCount || 0);
          }, 0)
        }
      </div>
    </div>
  );

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
                <FullTextIndicator />
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
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="flex-1 bg-transparent text-white rounded-t-lg pl-2 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-b border-gray-600"
                    placeholder={fullText 
                      ? "What would you like to do with the loaded text?" 
                      : "Send a message or paste a long text..."
                    }
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
          <span className="text-xs text-gray-400 ml-3">
            Press Enter to send, Shift + Enter for new line
          </span>
        </div>
      </div>
      {error && (
        <div className="max-w-3xl mx-auto px-4 py-2 mt-2">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}