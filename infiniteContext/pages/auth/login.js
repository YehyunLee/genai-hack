import { useState } from "react";
import { signIn, signUp } from "../../lib/auth";
import Head from 'next/head';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        await signUp(email, password);
        alert("Account created!");
        // Automatically log in the user after successful signup
        await signIn(email, password);
        window.location.href = "/chat";
      } else {
        await signIn(email, password);
        alert("Logged in!");
        // Redirect to chat page
        window.location.href = "/chat";
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Head>
        <title>{isRegistering ? "Sign Up" : "Login"} - AI Chat Assistant</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-white text-2xl mb-4">{isRegistering ? "Sign Up" : "Login"}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full p-3 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            {isRegistering ? "Sign Up" : "Login"}
          </button>
        </form>
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-4 p-3 rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        >
          {isRegistering ? "Already have an account? Login" : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}