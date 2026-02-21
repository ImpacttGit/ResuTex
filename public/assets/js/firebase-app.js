import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// --- CONFIG ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
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
    console.log("Registered user:", user.uid);

    // Set Display Name
    await updateProfile(user, { displayName: name });

    // Create Firestore Doc (with retry for timing issues)
    const userDocRef = doc(db, "users", user.uid);
    let attempts = 0;
    while (attempts < 3) {
        try {
            await setDoc(userDocRef, {
                name: name,
                email: email,
                credits: 5,
                tier: "free", // free, monthly, yearly, owner
                role: "user",   // user, admin
                photoURL: null,
                createdAt: new Date()
            });
            console.log("User doc created in Firestore");
            break;
        } catch (e) {
            attempts++;
            console.error(`Attempt ${attempts} to create user doc failed:`, e.code, e.message);
            if (attempts === 3) throw e;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
        }
    }
    return userCredential;
}

export function loginUser(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function resetUserPassword(email) {
    return sendPasswordResetEmail(auth, email);
}

export function logoutUser() {
    signOut(auth).then(() => {
        window.location.href = 'index.html'; // Redirect to landing page
    });
}

export function monitorAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function saveResume(userId, data, resumeId) {
    if (!resumeId) {
        // Fallback for legacy calls or quick save
        resumeId = "currentDraft";
    }
    // If it's a new resume (resumeId not provided or specific placeholder), we might want to generate one, 
    // but typically the UI should have created it first. 
    // For now, support both subcollection arbitrary IDs and the legacy single doc.

    // Check if it's the legacy doc
    if (resumeId === "currentDraft") {
        return setDoc(doc(db, `users/${userId}/resumes/currentDraft`), {
            ...data,
            updatedAt: new Date()
        });
    }

    // Otherwise, update specific doc in subcollection
    return setDoc(doc(db, "users", userId, "resumes", resumeId), {
        ...data,
        updatedAt: new Date()
    }, { merge: true });
}

export async function getResume(userId, resumeId) {
    if (!resumeId || resumeId === "currentDraft") {
        return getDoc(doc(db, `users/${userId}/resumes/currentDraft`));
    }
    return getDoc(doc(db, "users", userId, "resumes", resumeId));
}

export async function createResume(userId, resumeData) {
    const resumesRef = collection(db, "users", userId, "resumes");
    const docRef = await addDoc(resumesRef, {
        ...resumeData,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: resumeData.name || "Untitled Resume"
    });
    return docRef.id;
}

export async function getUserResumes(userId) {
    const resumesRef = collection(db, "users", userId, "resumes");
    const snapshot = await getDocs(resumesRef);
    const resumes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort client-side by updatedAt descending (no index required)
    resumes.sort((a, b) => {
        const tA = a.updatedAt?.toMillis?.() || a.updatedAt?.getTime?.() || 0;
        const tB = b.updatedAt?.toMillis?.() || b.updatedAt?.getTime?.() || 0;
        return tB - tA;
    });
    return resumes;
}

export async function deleteResume(userId, resumeId) {
    await deleteDoc(doc(db, "users", userId, "resumes", resumeId));
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

export async function updateUserTier(userId, tier) {
    return updateDoc(doc(db, "users", userId), { tier: tier });
}

export async function updateUserCredits(userId, newCredits) {
    return updateDoc(doc(db, "users", userId), { credits: newCredits });
}

export async function getUserProfile(userId) {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
}
