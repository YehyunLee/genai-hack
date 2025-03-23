import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, orderBy, onSnapshot, limit, startAfter } from 'firebase/firestore';
import { debounce } from 'lodash';
import { LogOut } from 'lucide-react';

const CHATS_PER_PAGE = 20;

const Sidebar = ({ userId, onNewChat, chatId, setChatId, isSidebarOpen, setIsSidebarOpen }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);

  // Debounced update function
  const updateChats = useCallback(
    debounce((newChats) => {
      setChats(newChats);
    }, 300),
    []
  );

  const loadChats = useCallback(async (isInitial = false) => {
    if (!userId || (loading && !isInitial)) return;

    try {
      setLoading(true);

      let q = query(
        collection(db, `users/${userId}/chats`),
        orderBy('createdAt', 'desc'),
        limit(CHATS_PER_PAGE)
      );

      if (!isInitial && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      // Use a single snapshot listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty && isInitial) {
          setHasMore(false);
          return;
        }

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        setLastDoc(lastVisible);

        const newChats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        updateChats(isInitial ? newChats : [...chats, ...newChats]);
        setHasMore(snapshot.docs.length === CHATS_PER_PAGE);
      }, 
      (error) => {
        console.error('Error loading chats:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up chat listener:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, lastDoc, chats, loading]);

  // Initial load
  useEffect(() => {
    let unsubscribe = () => {};

    if (userId) {
      const unsubscribeSnapshot = loadChats(true);
      if (typeof unsubscribeSnapshot === 'function') {
        unsubscribe = unsubscribeSnapshot;
      }
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      updateChats.cancel();
    };
  }, [userId]);

  return (
    <>
      <div className="md:hidden flex justify-between items-center p-4 bg-gray-800">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        <h1 className="text-white text-xl">AI Chat Assistant</h1>
      </div>

      <div className={`fixed inset-0 z-50 bg-gray-900 bg-opacity-75 transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 p-4 transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <button
          onClick={onNewChat}
          className="flex items-center justify-center gap-2 px-4 py-2 mb-4 w-full rounded-xl border border-white/20 text-white hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => {
                setChatId(chat.id);
                setIsSidebarOpen(false); // Close sidebar on mobile after selecting a chat
              }}
              className={`p-2 text-white border-b border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                chat.id === chatId ? 'bg-gray-700' : ''
              }`}
            >
              {chat.title || 'Untitled Chat'}
            </div>
          ))}
          {hasMore && !loading && (
            <button
              onClick={() => loadChats()}
              className="w-full p-2 text-gray-400 hover:text-gray-300 text-sm"
            >
              Load more chats...
            </button>
          )}
          {loading && (
            <div className="p-2 text-gray-400 text-sm text-center">
              Loading...
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(Sidebar);