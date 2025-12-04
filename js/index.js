import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js"; 

// --- UI ELEMENTS ---
const modalOverlay = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModal');
const loginFormBox = document.getElementById('loginFormBox');
const registerFormBox = document.getElementById('registerFormBox');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

// 1. OPEN MODAL TRIGGERS
document.querySelectorAll('.btn-login').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });
});
document.querySelectorAll('.btn-register, .btn-hero, .btn-small-outline').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); openModal('register'); });
});

// 2. CLOSE MODAL TRIGGERS
closeModalBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});

// 3. SWITCH VIEW TRIGGERS
showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); switchView('register'); });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); switchView('login'); });

// HELPER FUNCTIONS
function openModal(view) {
    modalOverlay.classList.add('active');
    switchView(view);
}

function switchView(view) {
    // Clear error messages
    document.getElementById('signInMessage').innerHTML = '';
    document.getElementById('signUpMessage').innerHTML = '';
    
    if (view === 'register') {
        loginFormBox.classList.add('hidden');
        registerFormBox.classList.remove('hidden');
        // Update Side text
        document.querySelector('.modal-welcome-text h2').textContent = "Join Us!";
        document.querySelector('.modal-welcome-text p').textContent = "Create an account to start voting.";
    } else {
        registerFormBox.classList.add('hidden');
        loginFormBox.classList.remove('hidden');
        // Update Side text
        document.querySelector('.modal-welcome-text h2').textContent = "Welcome Back!";
        document.querySelector('.modal-welcome-text p').textContent = "Login to access your voting dashboard.";
    }
}

function showMessage(msg, divId, color='#d32f2f') {
    const div = document.getElementById(divId);
    div.style.color = color;
    div.innerHTML = msg;
    setTimeout(() => div.innerHTML = '', 5000);
}

// --- FIREBASE LOGIC ---

// 4. REGISTER FUNCTION (UPDATED)
document.getElementById('submitSignUp').addEventListener('click', async (e) => {
    e.preventDefault();

    // Get all values
    const fname = document.getElementById('first_name').value.trim();
    const lname = document.getElementById('last_name').value.trim();
    const studentId = document.getElementById('student_id').value.trim();
    const birthday = document.getElementById('birthday').value;
    
    // Dropdowns
    const yearLevel = document.getElementById('year_level').value;
    const strand = document.getElementById('strand').value;
    
    const address = document.getElementById('address').value.trim();
    
    // Phone: We add the +63 prefix automatically
    let phoneRaw = document.getElementById('phone_number').value.trim();
    const fullPhone = "+63" + phoneRaw;

    const email = document.getElementById('signup_email').value.trim();
    const pass = document.getElementById('signup_password').value.trim();

    // Validate
    if(!fname || !lname || !studentId || !birthday || !yearLevel || !strand || !address || !phoneRaw || !email || !pass) {
        return showMessage('Please fill in all required fields.', 'signUpMessage');
    }
    
    if(pass.length < 6) {
        return showMessage('Password must be at least 6 characters.', 'signUpMessage');
    }

    try {
        // Create Auth User
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        
        // Save Extended Data to Firestore
        await setDoc(doc(db, "users", cred.user.uid), {
            first_name: fname,
            last_name: lname,
            student_id: studentId,
            birthday: birthday,
            year_level: yearLevel,
            strand: strand,
            address: address,
            phone: fullPhone,
            email: email,
            role: 'user', 
            hasVoted: false,
            createdAt: new Date().toISOString()
        });

        showMessage('Account created successfully! Redirecting...', 'signUpMessage', 'green');
        
        // Switch to Login after 1.5s
        setTimeout(() => { 
            switchView('login'); 
            document.getElementById('login_email').value = email; 
            document.getElementById('signup_password').value = ''; 
        }, 1500);

    } catch (err) {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
            showMessage('This email is already registered.', 'signUpMessage');
        } else {
            showMessage(err.message, 'signUpMessage');
        }
    }
});

// 5. LOGIN FUNCTION
document.getElementById('submitLogin').addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login_email').value.trim();
    const pass = document.getElementById('login_password').value.trim();

    if(!email || !pass) return showMessage('Please enter email and password.', 'signInMessage');

    try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        localStorage.setItem('loggedInUserId', cred.user.uid);
        
        showMessage('Login successful! Redirecting...', 'signInMessage', 'green');
        
        // Redirect to dashboard
        setTimeout(() => window.location.href = 'user_dashboard.html', 1000);

    } catch (err) {
        console.error(err);
        showMessage('Incorrect email or password.', 'signInMessage');
    }
});