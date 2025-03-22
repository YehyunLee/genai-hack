import { useState } from "react";
import { signIn, signUp } from "./auth";

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
    <div>
      <h1>{isRegistering ? "Sign Up" : "Login"}</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">{isRegistering ? "Sign Up" : "Login"}</button>
      </form>
      <button onClick={() => setIsRegistering(!isRegistering)}>
        {isRegistering ? "Already have an account? Login" : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
}
