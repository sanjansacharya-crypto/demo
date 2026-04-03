import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_EQleUr1_SnXGU7LFoBWPgw14cCop1Ng",
  authDomain: "login-35e23.firebaseapp.com",
  projectId: "login-35e23",
  storageBucket: "login-35e23.firebasestorage.app",
  messagingSenderId: "662226193773",
  appId: "1:662226193773:web:1f8303cf97c5c194c21e64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const submitBtn = document.getElementById('submit-btn');
    const errorMessage = document.getElementById('error-message');
    const loginContainer = document.getElementById('login-container');
    const successContainer = document.getElementById('success-container');
    const logoutBtn = document.getElementById('logout-btn');

    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Hide previous errors
        errorMessage.style.display = 'none';
        
        // Add loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            // Attempt to sign in with Firebase
            await signInWithEmailAndPassword(auth, email, password);
            
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            // Success - switch views
            loginContainer.classList.remove('active');
            
            // Small delay for smooth transition
            setTimeout(() => {
                successContainer.classList.add('active');
            }, 300);

        } catch (error) {
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            
            // Show error message from Firebase
            errorMessage.textContent = error.message.replace('Firebase: ', '') || 'Invalid credentials. Please try again.';
            errorMessage.style.display = 'block';
        }
    });

    // Handle logout
    logoutBtn.addEventListener('click', async () => {
        try {
            // Sign out from Firebase
            await signOut(auth);
            
            // Switch back to login view
            successContainer.classList.remove('active');
            
            // Clear form
            loginForm.reset();
            
            setTimeout(() => {
                loginContainer.classList.add('active');
            }, 300);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    });
});
