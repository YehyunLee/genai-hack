import React from 'react';

const Sidebar = ({ onNewChat }) => {
  return (
    <div className="hidden md:flex w-64 bg-gray-800 flex-col p-4">
      <button
        onClick={onNewChat}
        className="flex items-center justify-center gap-2 px-4 py-2 mb-4 w-full rounded border border-white/20 text-white hover:bg-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Chat
      </button>
    </div>
  );
};

export default Sidebar;