// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// --- AUTH FUNCTIONS ---

/**
 * Creates a new user in Firebase Auth and a corresponding user document in Firestore.
 * @param {string} name - The user's full name.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<UserCredential>}
 */
export async function registerUser(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Create a user document in Firestore
  await setDoc(doc(db, "users", user.uid), {
    name: name,
    email: email,
    credits: 5
  });
  
  return userCredential;
}

/**
 * Signs in an existing user.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<UserCredential>}
 */
export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Signs out the current user and redirects to the login page.
 */
export function logoutUser() {
  signOut(auth).then(() => {
    window.location.href = 'login.html';
  });
}

/**
 * Listens for changes in the user's authentication state.
 * @param {function} callback - The function to call when the auth state changes.
 * @returns {Unsubscribe}
 */
export function monitorAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// --- FIRESTORE FUNCTIONS ---

/**
 * Saves the user's resume data to Firestore.
 * @param {string} userId - The user's UID.
 * @param {object} data - The resume data to save.
 * @returns {Promise<void>}
 */
export function saveResume(userId, data) {
  return setDoc(doc(db, `users/${userId}/resumes/currentDraft`), data);
}

/**
 * Retrieves the user's resume data from Firestore.
 * @param {string} userId - The user's UID.
 * @returns {Promise<DocumentSnapshot>}
 */
export function getResume(userId) {
  return getDoc(doc(db, `users/${userId}/resumes/currentDraft`));
}
