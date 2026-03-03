/* js/about.js */
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js"; 

// --- UI ELEMENTS ---
const modalOverlay = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModal');
const loginFormBox = document.getElementById('loginFormBox');
const registerFormBox = document.getElementById('registerFormBox');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

// --- MODAL TRIGGERS ---
document.querySelectorAll('.btn-login').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });
});
document.querySelectorAll('.btn-register').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); openModal('register'); });
});

// Close
if(closeModalBtn) closeModalBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));
if(modalOverlay) modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});

// --- NAVIGATION ---
function openModal(view) {
    if(!modalOverlay) return;
    modalOverlay.classList.add('active');
    switchView(view);
}

function switchView(view) {
    if(!loginFormBox || !registerFormBox) return;
    loginFormBox.classList.add('hidden');
    registerFormBox.classList.add('hidden');

    if (view === 'login') loginFormBox.classList.remove('hidden');
    if (view === 'register') registerFormBox.classList.remove('hidden');
}

// Switch Links
if(showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); switchView('register'); });
if(showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); switchView('login'); });

// --- STUDENT ID FORMATTING (NEW) ---
const sidInput = document.getElementById('student_id');
if(sidInput) {
    sidInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, ''); 
        // Format as ####-####-####
        if (val.length > 4) val = val.substring(0,4) + '-' + val.substring(4);
        if (val.length > 9) val = val.substring(0,9) + '-' + val.substring(9,13);
        e.target.value = val;
    });
}

// --- LOGIN LOGIC ---
const loginBtn = document.getElementById('submitLogin');
if(loginBtn) loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login_email').value;
    const pass = document.getElementById('login_password').value;

    if (!email || !pass) return showMessage('Please enter email and password.', 'loginMessage');

    try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const user = cred.user;
        const docSnap = await getDoc(doc(db, "users", user.uid));

        if (docSnap.exists()) {
            const role = docSnap.data().role;
            window.location.href = role === 'admin' ? 'admin.html' : 'user_dashboard.html';
        } else {
            showMessage('User record missing.', 'loginMessage');
        }
    } catch (error) {
        console.error(error);
        showMessage('Invalid email or password.', 'loginMessage');
    }
});

// --- REGISTER LOGIC ---
const registerBtn = document.getElementById('submitSignUp');
if(registerBtn) registerBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Inputs
    const email = document.getElementById('signup_email').value.trim();
    const pass = document.getElementById('signup_password').value.trim();
    const fname = document.getElementById('first_name').value;
    const lname = document.getElementById('last_name').value;
    const sid = document.getElementById('student_id').value;
    const bday = document.getElementById('birthday').value;
    const yl = document.getElementById('year_level').value;
    const strand = document.getElementById('strand').value;
    const addr = document.getElementById('address').value;
    const phoneRaw = document.getElementById('phone_number').value;

    if(!fname || !lname || !sid || !bday || !yl || !strand || !addr || !phoneRaw || !email || !pass) {
        return showMessage('Please fill all fields.', 'signUpMessage');
    }
    if(pass.length < 6) return showMessage('Password must be at least 6 characters.', 'signUpMessage');

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const fullPhone = "+63" + phoneRaw;

        await setDoc(doc(db, "users", cred.user.uid), {
            first_name: fname, last_name: lname, student_id: sid, birthday: bday,
            year_level: yl, strand: strand, address: addr, phone: fullPhone,
            email: email, role: 'user', hasVoted: false, createdAt: new Date().toISOString()
        });

        showMessage('Success! Redirecting to login...', 'signUpMessage', 'green');
        
        setTimeout(() => { 
            switchView('login'); 
            document.getElementById('login_email').value = email; 
            document.getElementById('signup_password').value = ''; 
        }, 1500);

    } catch (err) {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') showMessage('Email already used.', 'signUpMessage');
        else showMessage('Error: ' + err.message, 'signUpMessage');
    }
});

// Helper
function showMessage(msg, elementId, color = 'red') {
    const el = document.getElementById(elementId);
    if(el) {
        el.style.color = color;
        el.innerText = msg;
        setTimeout(() => el.innerText = '', 3000);
    }
}