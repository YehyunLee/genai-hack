import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Head>
        <title>Infinite Context - Process Large Documents with AI</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-16 flex-grow">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Infinite Context
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Process large documents by automatically chunking and merging content,
            enabling AI to handle virtually unlimited context windows.
          </p>
        </div>

        {/* Process Diagram */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
            {/* Input Text Box (A) */}
            <div className="flex flex-col gap-2 w-64">
              <div className="bg-gray-800 border-2 border-blue-500 rounded-lg p-4 h-97">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-10 bg-blue-500/20 rounded mb-2"></div>
                ))}
              </div>
              <span className="text-center text-gray-400">Input Text</span>
            </div>

            {/* Arrow 1 */}
            <div className="transform rotate-0 md:rotate-0">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>

            {/* Chunked Text (B) */}
            <div className="flex flex-col gap-2 w-64">
              <div className="bg-gray-800 border-2 border-green-500 rounded-lg p-4 h-97">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border-2 border-green-500/50 rounded-lg p-2 mb-2">
                    {[...Array(2)].map((_, j) => (
                      <div key={j} className="h-10 bg-green-500/20 rounded mb-2"></div>
                    ))}
                  </div>
                ))}
              </div>
              <span className="text-center text-gray-400">Chunked Processing</span>
            </div>

            {/* Arrow 2 */}
            <div className="transform rotate-0 md:rotate-0">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>

            {/* Merged Result (C) */}
            <div className="flex flex-col gap-2 w-64">
              <div className="bg-gray-800 border-2 border-purple-500 rounded-lg p-4 h-49">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-purple-500/20 rounded mb-2"></div>
                ))}
              </div>
              <span className="text-center text-gray-400">Merged Result</span>
            </div>
          </div>

          {/* Process Labels */}
          <div className="flex justify-between max-w-4xl mx-auto mt-12 px-8">
            <div className="flex flex-col items-center">
              <span className="text-blue-400 font-semibold">1. Input</span>
              <span className="text-sm text-gray-400">Large Document</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-green-400 font-semibold">2. Process</span>
              <span className="text-sm text-gray-400">Parallel Chunks</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-purple-400 font-semibold">3. Output</span>
              <span className="text-sm text-gray-400">Merged Response</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link href="/chat" className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-colors">
              Try It Now
              <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Infinite Context. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}