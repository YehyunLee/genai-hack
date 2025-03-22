import { auth, db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Sign Up
export const signUp = async (email, password, router) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Create a new user in Firestore in the "users" collection
    try { 
      const user = userCredential.user;
      // Create a document in the Users collection
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        created_at: new Date(),
      });
    } catch (error) {
      console.error("Error adding document: ", error);
      throw error;
    }

    // Automatically log in the user after successful signup
    await signInWithEmailAndPassword(auth, email, password);


    return user;
  } catch (error) {
    console.error("Error signing up:", error.message);
    throw error;
  }
};

// Sign In
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in:", error.message);
    throw error;
  }
};

// Sign Out
export const logout = async () => {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (error) {
    console.error("Error signing out:", error.message);
  }
};
