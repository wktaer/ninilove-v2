// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYOaYnUxqjWzqwWj9edvkaqayCXs2BEsk",
  authDomain: "ninivibes-app.firebaseapp.com",
  databaseURL: "https://ninivibes-app-default-rtdb.firebaseio.com",
  projectId: "ninivibes-app",
  storageBucket: "ninivibes-app.firebasestorage.app",
  messagingSenderId: "1007612365941",
  appId: "1:1007612365941:web:55183926e45ed99a7e7c3c",
  measurementId: "G-E1XPCGDGMB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth, ref, set, get, onValue, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail };