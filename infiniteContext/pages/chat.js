import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { logout } from "../lib/auth";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "../firebaseConfig";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import Sidebar from './components/sidebar';
import { onSnapshot } from "firebase/firestore";
import ReactMarkdown from 'react-markdown';
import { LogOut } from "lucide-react";
import { debounce } from 'lodash';
import MediaTypeIndicators from './components/mediaTypeIndicators';
import { extractScreenshots } from './functions/extractScreenshots';


const CodeBlock = ({ children, className }) => {
  const codeRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (codeRef.current) {
      navigator.clipboard.writeText(codeRef.current.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group">
      <pre className={`${className} bg-gray-900 rounded-lg p-4 whitespace-pre-wrap break-all`}>
        <button
          onClick={copyToClipboard}
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity 
                   bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-600"
        >
          {copied ? (
            <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
        <code ref={codeRef} className="text-sm font-mono text-gray-200 break-words">
          {children}
        </code>
      </pre>
    </div>
  );
};

const LoadingMessage = ({ infiniteMode }) => (
  <div className="inline-block animate-pulse bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded px-2 py-1">
    {infiniteMode ? 'Processing with infinite context...' : 'Processing with limited context...'}
  </div>
);

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfText, setPdfText] = useState({});
  const [image, setImage] = useState({});
  const [video, setVideo] = useState({});
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
  const [chatId, setChatId] = useState(null); // Store chat ID
  const [chatTitle, setChatTitle] = useState("New Chat"); // Store chat title
  const [infiniteMode, setInfiniteMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const resetTextareaHeight = () => {
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
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


  // Upload File first to the endpoint to process it then send result back, 
  // so when user submits message it collectively sends the image data and the prompt.
  // First, let's define the videoUploader function directly in your component
// This avoids import issues

const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) {
    alert('Please select a valid file');
    return;
  }

  setIsUploading(true);

  try {
    if (file.type.startsWith("video/")) {
      try {
        console.log('Processing video file...');
        
        const screenshots = await extractScreenshots(file);
        console.log('Video processing complete, screenshots:', screenshots);
        
        // Create a video entry with screenshots
        const video = {
          id: Date.now(),
          screenshots: screenshots,
          videoInfo: {
            fileName: file.name,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            fileType: file.type || 'video/mp4'
          },
          timestamp: Date.now()
        };
        console.log(video, "VIDEO");
        // Update your state with the new video
        setVideo(prev => ({
          ...prev,
          [video.id]: video
        }));
        
        // Add to source order
        setSourceOrder(prev => [...prev, `video-${video.id}`]);
        
        console.log('Video processed successfully');
      } catch (error) {
        console.error('Error processing video:', error);
        alert('Error processing video: ' + error.message);
      }
    } else {
      // Handle non-video files with your existing code
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/uploadFile', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        // Case for PDF files
        if(data.text) {
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
        }
        // Case for Image files
        else if (data.data) {
          const image = {
            id: Date.now(),
            inlineData: {
              data: data.data,
              mimeType: data.info?.mimeType || 'image/png'
            },
            fileName: data.info.fileName,
          };

          setImage(prev => ({
            ...prev,
            [image.id]: image
          }));

          setSourceOrder(prev => [...prev, `image-${image.id}`]);
        }
      } else {
        alert('Failed to upload file: ' + data.error);
      }
    }
    
    // Adjust textarea height if needed
    if (typeof adjustTextareaHeight === 'function') {
      adjustTextareaHeight();
    }
    
  } catch (error) {
    console.error('Error in file upload:', error);
    alert('Error uploading file: ' + error.message);
  } finally {
    setIsUploading(false);
  }
};


// Helper function to convert data URL to Blob
const dataURLtoBlob = (dataURL) => {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
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

  const sendMessage = useCallback(async () => {
  if (!input.trim()) return;
  setError(null);

  const userMessage = {
    role: 'user',
    text: input,
    sourceOrder: [...sourceOrder],
    infiniteMode
  };

  // Initialize AI message with loading state
  const initialAiMessage = {
    role: 'ai',
    text: sourceOrder.length > 0 && infiniteMode
      ? 'Processing with infinite context...'
      : 'Processing with limited context...',
    mode: sourceOrder.length > 0 && infiniteMode ? 'infinite' : 'default',
    status: 'loading',
    infiniteMode: sourceOrder.length > 0 && infiniteMode
  };

  try {
    if (new Blob([input]).size > 10 * 1024 * 1024) {
      throw new Error('Message is too large. Please reduce the size.');
    }

    // Update local state with both messages
    setMessages(prev => [...prev, userMessage, initialAiMessage]);
    setInput('');
    resetTextareaHeight();

    const combinedText = sourceOrder
      .filter(sourceId => !sourceId.startsWith('image'))
      .map(sourceId => {
        const [type, id] = sourceId.split('-');
        return type === 'pdf'
          ? pdfText[id]?.content
          : clipboardText[id]?.content;
      })
      .join('\n\n');

    const imagePayloads = sourceOrder
      .filter(sourceId => sourceId.startsWith('image'))
      .map(sourceId => {
        const [, id] = sourceId.split('-');
        return image[id];
      });

      // Gather videos
      const videoPayloads = sourceOrder
        .filter(sourceId => sourceId.startsWith('video'))
        .map(sourceId => {
          const [, id] = sourceId.split('-');
          const videoData = video[id];
          return {
            screenshots: videoData.screenshots,
            fileName: videoData.videoInfo.fileName,
            fileType: videoData.videoInfo.fileType
          };
        })[0]; // Take first video only

      // Construct payload
      const payload = {
        message: infiniteMode ? userMessage.text : `${userMessage.text}\n\nContext:\n${combinedText}`,
        mode: infiniteMode && sourceOrder.length > 0 ? 'infinite' : 'default',
        fullText: combinedText || null,
        images: imagePayloads.length > 0 ? imagePayloads : null,
        video: videoPayloads || null // This ensures we send null if no video
      };

      console.log("payload", payload.mode);

      console.log(payload.video, "PAYLOAD VIDEO");
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });


        
      let tempChatId = chatId;
      if (user && !tempChatId) {
        const chatData = {
          title: userMessage.text,
          createdAt: new Date(),
          messages: [],
        };

        const chatDocRef = await addDoc(collection(db, `users/${user.uid}/chats`), chatData);
        setChatId(chatDocRef.id);
        setChatTitle(userMessage.text);
        tempChatId = chatDocRef.id;
      }



      if (!infiniteMode || sourceOrder.length === 0) {
        // Handle normal mode response
        const data = await res.json();
        const aiMessage = {
          role: 'ai',
          text: data.response,
          mode: 'default',
          status: 'complete'
        };
  
        // Update both local state and Firestore
        const updatedMessages = [...messages, userMessage, aiMessage];
        setMessages(updatedMessages);

        if (user && tempChatId) {
          const chatRef = doc(db, `users/${user.uid}/chats/${tempChatId}`);
          await setDoc(chatRef, {
            messages: updatedMessages,
            updatedAt: new Date()
          }, { merge: true });
        }
  
        return;
      }

      // Handle infinite mode response with streaming
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let aiMessage = {
      role: 'ai',
      text: 'Processing with infinite context...',
      mode: 'infinite',
      status: 'streaming',
      chunks: {}
    };

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
              aiMessage.chunks[chunk.data.chunkNumber] = chunk.data;
              aiMessage.text = Object.values(aiMessage.chunks)
                .sort((a, b) => a.chunkNumber - b.chunkNumber)
                .map(c => {
                  if (c.error) {
                    return `### Part ${c.chunkNumber}/${c.totalChunks}\n\n⚠️ Error: ${c.error}`;
                  }
                  return `### Part ${c.chunkNumber}/${c.totalChunks}\n\n${c.response}`;
                })
                .join('\n\n---\n\n');
              aiMessage.status = 'streaming';

              // Update local state
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { ...aiMessage };
                return newMessages;
              });
              break;

            case 'complete':
              // Save final version to Firestore
              if (user && chatId) {
                const chatRef = doc(db, `users/${user.uid}/chats/${chatId}`);
                await setDoc(chatRef, {
                  messages: [...messages, userMessage, aiMessage],
                  updatedAt: new Date()
                }, { merge: true });
              }
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
  
    adjustTextareaHeight();
  } catch (err) {
    setError(err.message);
    console.error('Error:', err);
  }
  adjustTextareaHeight();
}, [input, messages, sourceOrder, infiniteMode, chatId, user, pdfText, clipboardText, video]);


  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = doc(db, `users/${user.uid}/chats/${chatId}`);
    let unsubscribe;

    // Debounce message updates to Firebase
    const updateMessages = debounce(async (newMessages) => {
      try {
        await setDoc(chatRef, {
          messages: newMessages,
          updatedAt: new Date()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating messages:', error);
      }
    }, 1000); // 1 second debounce

    // Only subscribe if we need to listen for changes
    if (chatId) {
      unsubscribe = onSnapshot(chatRef, (doc) => {
        const chatData = doc.data();
        if (chatData && chatData.messages) {
          // Only update if not currently processing
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.status === 'loading' || lastMsg?.status === 'streaming') {
              return prev;
            }
            if (JSON.stringify(prev) !== JSON.stringify(chatData.messages)) {
              return chatData.messages;
            }
            return prev;
          });
          setChatTitle(chatData.title || "Untitled Chat");
        }
      });
    }

    // Cleanup subscription
    return () => {
      if (unsubscribe) unsubscribe();
      updateMessages.cancel();
    };
  }, [chatId, user?.uid]); // Only depend on chatId and user.uid

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
      <div 
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          infiniteMode 
            ? 'bg-green-600 text-white hover:bg-green-700' 
            : 'bg-gray-600 text-gray-300 hover:bg-gray-700'
        } cursor-pointer transition-colors`}
        onClick={() => setInfiniteMode(prev => !prev)}
        title={`Click to ${infiniteMode ? 'disable' : 'enable'} infinite context`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>Infinite Context {infiniteMode ? 'ON' : 'OFF'}</span>
        <div className={`w-2 h-2 rounded-full ${infiniteMode ? 'bg-white' : 'bg-gray-400'}`} />
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
                ) : type === 'image' ? (
                  <>
                    <img src={`data:${image[id].inlineData.mimeType};base64,${image[id].inlineData.data}`} alt="Uploaded Image" className="w-4 h-4 mr-2" />
                    <span className="text-sm text-white">{image[id].fileName || 'Image'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
                    } else if (type === 'pdf') {
                      setPdfText(prev => {
                        const { [id]: removed, ...rest } = prev;
                        return rest;
                      });
                    } else {
                      setImage(prev => {
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

const MessageAttachmentIndicator = ({ sourceOrder, infiniteMode }) => {
  if (!sourceOrder || sourceOrder.length === 0) return null;

  return (
    <div className="flex gap-2 mb-2">
      {/* Context mode indicator */}
      <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
        infiniteMode ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'
      }`}>
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={infiniteMode ? "M13 10V3L4 14h7v7l9-11h-7z" : "M9 12l2 2 4-4"} />
        </svg>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={infiniteMode ? "M13 10V3L4 14h7v7l9-11h-7z" : "M9 12l2 2 4-4"} />
        <span>{infiniteMode ? 'Infinite' : 'Limited'} Context</span>
      </div>

      {/* Existing source indicators */}
      {sourceOrder.map((sourceId) => {
        const [type, id] = sourceId.split('-');
        return (
            <div key={sourceId} className="flex items-center bg-gray-700 px-2 py-1 rounded-full text-xs">
              {type === 'pdf' ? (
                  <>
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span>PDF</span>
                  </>
              ) : type === 'image' ? (
                  <>
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 3h18v18H3V3zm3 14l3-3 2 2 4-4 5 5"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                    </svg>
                    <span>Image</span>
                  </>
              ) : (
                  <>
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <span>Clipboard Text</span>
                  </>
              )}
            </div>
        );
      })}
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Infinite Context</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen">
        {/* Sidebar */}
        {user && isSidebarOpen && (
          <Sidebar userId={user?.uid}
          onNewChat={() => {
            setChatTitle("New Chat");
            setMessages([]);
            setChatId(null);
          }}
          chatId={chatId}
          setChatId={setChatId} 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}/>
        )}

          {/* Main chat area */}
          <div className="flex-1 flex flex-col">

          {/* Header (Chat Title and the logout button) */}
          <div className="relative flex items-center justify-between w-full px-4 py-2 border-b border-gray-800">
          {user && <button
              className="text-gray-300 hover:text-gray-400"
              onClick={() => {
                setIsSidebarOpen(!isSidebarOpen);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <h1 className="text-lg md:text-xl text-white text-center truncate max-w-[200px] md:max-w-[400px]">
                {user ? chatTitle : "Infinite Context"}
              </h1>
            </div>
            <div className="ml-auto z-10">
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/auth/login';
                  }}
                  className="text-red-300 hover:text-red-400 px-2 md:px-4 py-2 rounded"
                >
                  <LogOut className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              ) : (
                <button
                  onClick={() => window.location.href = '/auth/login'}
                  className="text-blue-300 hover:text-blue-400 px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm border border-blue-300 hover:border-blue-400"
                >
                  Login to Save
                </button>
              )}
            </div>
          </div>

          {/* if no messages, import Landings */}
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <MediaTypeIndicators />
            </div>
          ) : (
            // Messages
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
                      {msg.sourceOrder && (
                        <MessageAttachmentIndicator
                          sourceOrder={msg.sourceOrder}
                          infiniteMode={msg.infiniteMode}
                        />
                      )}
                      <div className="prose prose-invert max-w-none">
                        {msg.text && msg.text.startsWith('Processing') ? (
                          <LoadingMessage infiniteMode={msg.infiniteMode} />
                        ) : (
                          <ReactMarkdown
                            components={{
                              code: ({ node, inline, className, children, ...props }) => {
                                if (inline) {
                                  return <code className="bg-gray-700 rounded px-1 py-0.5" {...props}>{children}</code>;
                                }
                                return <CodeBlock className={className}>{children}</CodeBlock>;
                              }
                            }}
                          >
                            {msg.text || ''}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

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
                      accept=".pdf, image/*, video/*"
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