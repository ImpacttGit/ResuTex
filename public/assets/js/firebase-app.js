import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// --- CONFIG ---
const firebaseConfig = {
    apiKey: "REDACTED_FIREBASE_KEY",
    authDomain: "resutex-6e173.firebaseapp.com",
    projectId: "resutex-6e173",
    storageBucket: "resutex-6e173.firebasestorage.app",
    messagingSenderId: "975092472832",
    appId: "1:975092472832:web:6c038a3d5b688a7fbf0ce5",
    measurementId: "G-RQSD5PBLRX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- EXPORTED FUNCTIONS ---

export async function registerUser(name, email, password) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Set Display Name
    await updateProfile(user, { displayName: name });
    // Create Firestore Doc
    await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: email,
        credits: 5,
        photoURL: null
    });
    return userCredential;
}

export function loginUser(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
    signOut(auth).then(() => {
        window.location.href = 'index.html'; // Redirect to landing page
    });
}

export function monitorAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}

export function saveResume(userId, data) {
    return setDoc(doc(db, `users/${userId}/resumes/currentDraft`), data);
}

export function getResume(userId) {
    return getDoc(doc(db, `users/${userId}/resumes/currentDraft`));
}

export async function updateUserProfile(user, displayName, photoURL) {
    const updates = {};
    if (displayName) updates.displayName = displayName;
    if (photoURL) updates.photoURL = photoURL;

    await updateProfile(user, updates);
    const firestoreUpdates = {};
    if (displayName) firestoreUpdates.name = displayName;
    if (photoURL) firestoreUpdates.photoURL = photoURL;
    await updateDoc(doc(db, "users", user.uid), firestoreUpdates);
    return user;
}
