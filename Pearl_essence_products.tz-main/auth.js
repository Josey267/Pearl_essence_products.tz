import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Global variables for Firestore setup. These are provided by the canvas environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Get form and page elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const userProfile = document.getElementById('userProfile');
const authForms = document.getElementById('auth-forms');
const signOutBtn = document.getElementById('signOutBtn');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profilePhone = document.getElementById('profile-phone');
const profilePhoto = document.getElementById('profile-photo');
const profileRole = document.getElementById('profile-role');
const profileUid = document.getElementById('profile-uid');
const registerPhotoInput = document.getElementById('register-photo');
const switchToLoginLink = document.getElementById('switch-to-login');

// Function to switch between login and registration forms
function switchForm(formToShow) {
    if (formToShow === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        switchToLoginLink.textContent = 'Sign Up';
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        switchToLoginLink.textContent = 'Sign In';
    }
}

// Add event listener to switch forms
switchToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (loginForm.classList.contains('hidden')) {
        switchForm('login');
    } else {
        switchForm('register');
    }
});

// Function to show the user profile and hide forms
function showUserProfile() {
    authForms.classList.add('hidden');
    userProfile.classList.remove('hidden');
}

// Function to show forms and hide user profile
function showAuthForms() {
    authForms.classList.remove('hidden');
    userProfile.classList.add('hidden');
    switchForm('login'); // Default to login form when signing out
}

// =============================================================
// Firebase Authentication & Firestore Logic
// =============================================================

// Listen for auth state changes to update the UI
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, show profile page
        console.log('User signed in:', user.uid);
        try {
            // Fetch user profile data from Firestore
            const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/userProfile`);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                profileName.textContent = userData.name || 'N/A';
                profileEmail.textContent = userData.email || 'N/A';
                profilePhone.textContent = userData.phone || 'N/A';
                profileRole.textContent = `Role: ${userData.role || 'user'}`;
                profileUid.textContent = user.uid;
                if (userData.photoURL) {
                    profilePhoto.src = userData.photoURL;
                } else {
                    profilePhoto.src = "https://placehold.co/100x100/CCCCCC/333333?text=user";
                }
            } else {
                console.log("No user profile found in Firestore!");
                // Fallback to display only email and UID
                profileName.textContent = user.email;
                profileEmail.textContent = user.email;
                profileRole.textContent = "Role: user"; // Assume user role if profile not found
                profileUid.textContent = user.uid;
                profilePhoto.src = "https://placehold.co/100x100/CCCCCC/333333?text=user";
            }
            showUserProfile();
        } catch (error) {
            console.error("Error fetching user profile:", error);
            showUserProfile();
            profileName.textContent = "Profile Error";
            profileEmail.textContent = user.email;
            profileRole.textContent = "Role: user";
            profileUid.textContent = user.uid;
            profilePhoto.src = "https://placehold.co/100x100/CCCCCC/333333?text=error";
        }
    } else {
        // User is signed out, show login form
        console.log('User signed out.');
        showAuthForms();
    }
});

// Initial sign-in with custom token from the canvas environment
(async () => {
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
        console.log("Firebase initialized and signed in successfully.");
    } catch (error) {
        console.error("Firebase authentication error:", error);
        // Show an error message on the UI if sign-in fails
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Failed to sign in. Please try refreshing the page.';
        errorMessage.classList.add('text-red-500', 'text-sm', 'mt-4', 'text-center');
        document.querySelector('.form-container').prepend(errorMessage);
    }
})();

// Handle user registration
signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const phone = document.getElementById('register-phone').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    const photoFile = registerPhotoInput.files[0];

    try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let photoURL = null;
        if (photoFile) {
            // Upload profile picture to Firebase Storage
            const storageRef = ref(storage, `users/${user.uid}/profile-pictures/${photoFile.name}`);
            await uploadBytes(storageRef, photoFile);
            photoURL = await getDownloadURL(storageRef);
            console.log("Profile picture uploaded. URL:", photoURL);
        }

        // Save user data to Firestore
        const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/userProfile`);
        await setDoc(userDocRef, {
            name: name,
            phone: phone,
            email: email,
            role: role,
            photoURL: photoURL,
            createdAt: new Date().toISOString()
        });
        console.log("User profile created in Firestore.");
        // Display a modal for success
        const modal = document.createElement('div');
        modal.classList.add('fixed', 'inset-0', 'bg-gray-600', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
        modal.innerHTML = `
          <div class="bg-white p-6 rounded-lg shadow-xl text-center">
            <h3 class="text-xl font-semibold text-gray-800 mb-2">Registration Successful!</h3>
            <p class="text-gray-600 mb-4">Your account has been created. You are now logged in.</p>
            <button id="modal-ok-btn" class="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600">OK</button>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-ok-btn').addEventListener('click', () => {
          document.body.removeChild(modal);
        });
        
    } catch (error) {
        console.error("Registration error:", error);
        // Display a modal for errors
        const modal = document.createElement('div');
        modal.classList.add('fixed', 'inset-0', 'bg-gray-600', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
        modal.innerHTML = `
          <div class="bg-white p-6 rounded-lg shadow-xl text-center">
            <h3 class="text-xl font-semibold text-red-500 mb-2">Registration Failed</h3>
            <p class="text-gray-600 mb-4">Error: ${error.message}</p>
            <button id="modal-ok-btn" class="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600">OK</button>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-ok-btn').addEventListener('click', () => {
          document.body.removeChild(modal);
        });
    }
});

// Handle user sign-in
signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("User signed in successfully.");
        // Redirect to the main page after successful login
        window.location.href = 'index.html'; // Or the URL of your main page
        const modal = document.createElement('div');
        modal.classList.add('fixed', 'inset-0', 'bg-gray-600', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
        modal.innerHTML = `
          <div class="bg-white p-6 rounded-lg shadow-xl text-center">
            <h3 class="text-xl font-semibold text-gray-800 mb-2">Login Successful!</h3>
            <p class="text-gray-600 mb-4">Redirecting to the main page...</p>
            <button id="modal-ok-btn" class="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600">OK</button>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-ok-btn').addEventListener('click', () => {
          document.body.removeChild(modal);
        });
    } catch (error) {
        console.error("Login error:", error);
        const modal = document.createElement('div');
        modal.classList.add('fixed', 'inset-0', 'bg-gray-600', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
        modal.innerHTML = `
          <div class="bg-white p-6 rounded-lg shadow-xl text-center">
            <h3 class="text-xl font-semibold text-red-500 mb-2">Login Failed</h3>
            <p class="text-gray-600 mb-4">Error: ${error.message}</p>
            <button id="modal-ok-btn" class="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600">OK</button>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-ok-btn').addEventListener('click', () => {
          document.body.removeChild(modal);
        });
    }
});

// Handle user sign-out
signOutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log("User signed out.");
        const modal = document.createElement('div');
        modal.classList.add('fixed', 'inset-0', 'bg-gray-600', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
        modal.innerHTML = `
          <div class="bg-white p-6 rounded-lg shadow-xl text-center">
            <h3 class="text-xl font-semibold text-gray-800 mb-2">Signed Out Successfully</h3>
            <p class="text-gray-600 mb-4">You have been logged out.</p>
            <button id="modal-ok-btn" class="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600">OK</button>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-ok-btn').addEventListener('click', () => {
          document.body.removeChild(modal);
        });
    } catch (error) {
        console.error("Sign out error:", error);
        const modal = document.createElement('div');
        modal.classList.add('fixed', 'inset-0', 'bg-gray-600', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
        modal.innerHTML = `
          <div class="bg-white p-6 rounded-lg shadow-xl text-center">
            <h3 class="text-xl font-semibold text-red-500 mb-2">Sign Out Failed</h3>
            <p class="text-gray-600 mb-4">Error: ${error.message}</p>
            <button id="modal-ok-btn" class="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600">OK</button>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-ok-btn').addEventListener('click', () => {
          document.body.removeChild(modal);
        });
    }
});
