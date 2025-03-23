const MediaTypeIndicators = () => {
  const TooltipContent = ({ children }) => (
    <div className="absolute top-full mt-2 hidden group-hover:block w-48 bg-gray-800 text-white text-sm rounded-lg p-3 z-10">
      {children}
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-gray-400 text-lg mb-10 text-center px-4 md:px-0">
        Upload PDF, image, or paste text to start the conversation with infinite context
      </div>
      <div className="flex flex-col md:flex-row justify-center gap-8">
        <div className="flex flex-col items-center gap-3 group relative">
          <TooltipContent>
            <ul className="list-disc pl-4 space-y-1">
              <li>Upload PDF documents</li>
              <li>Extract text and analyze content</li>
              <li>Support for multi-page documents</li>
            </ul>
          </TooltipContent>
          <div className="w-20 h-20 bg-red-500/20 rounded-xl flex items-center justify-center group hover:bg-red-500/30 transition-colors cursor-pointer">
            <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm text-gray-400">PDF</span>
        </div>
        
        <div className="flex flex-col items-center gap-3 group relative">
          <TooltipContent>
            <ul className="list-disc pl-4 space-y-1">
              <li>Process video content</li>
              <li>Extract audio transcripts</li>
              <li>Analyze video context</li>
            </ul>
          </TooltipContent>
          <div className="w-20 h-20 bg-blue-500/20 rounded-xl flex items-center justify-center group hover:bg-blue-500/30 transition-colors cursor-pointer">
            <svg className="w-16 h-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm text-gray-400">Video</span>
        </div>
        
        <div className="flex flex-col items-center gap-3 group relative">
          <TooltipContent>
            <ul className="list-disc pl-4 space-y-1">
              <li>Upload image files</li>
              <li>Extract text from images</li>
              <li>Analyze visual content</li>
            </ul>
          </TooltipContent>
          <div className="w-20 h-20 bg-green-500/20 rounded-xl flex items-center justify-center group hover:bg-green-500/30 transition-colors cursor-pointer">
            <svg className="w-16 h-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-sm text-gray-400">Image</span>
        </div>
      </div>
    </div>
  );
};

export default MediaTypeIndicators;