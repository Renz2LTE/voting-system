import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your provided Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBrMco-_L76Prf7dkCOu3QfBTC5DTB315M",
  authDomain: "login-form-d9e8b.firebaseapp.com",
  projectId: "login-form-d9e8b",
  storageBucket: "login-form-d9e8b.appspot.com",
  messagingSenderId: "780297703902",
  appId: "1:780297703902:web:3f1acdbce4faf06aff0d4f",
  measurementId: "G-VTZ78CJHES"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export for use in index.js
export { auth, db };