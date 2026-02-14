import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_KEY",
  authDomain: "resutex-6e173.firebaseapp.com",
  projectId: "resutex-6e173",
  storageBucket: "resutex-6e173.firebasestorage.app",
  messagingSenderId: "975092472832",
  appId: "1:975092472832:web:6c038a3d5b688a7fbf0ce5",
  measurementId: "G-RQSD5PBLRX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export functions for use in other scripts
export { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    doc, 
    setDoc, 
    getDoc 
};
