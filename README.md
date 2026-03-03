🗳️ Informatics Online Voting System

A comprehensive, role-based web application designed to digitize and secure student council elections at Informatics College Northgate. This system replaces traditional paper-based elections with a secure, real-time, and mobile-responsive digital platform backed by a NoSQL cloud database.

✨ Key Features

Role-Based Access Control (RBAC): Distinct and secure portals for Administrators and Students.

Strand-Based Voting: Smart ballots dynamically render candidates based on the voter's academic strand (e.g., GAS, HUMSS, ICT).

Political Partylists: Students can form, register, and run under official political factions, complete with mission and vision statements.

Real-Time Analytics: Live election results tracked and visualized instantly using Chart.js.

Double-Vote Prevention: Enforced one-vote-per-user policies utilizing Firebase Firestore writeBatch transactions for absolute data integrity.

Automated Notifications: Real-time system alerts for election phase changes and global announcements.

Mobile Responsive: Fully functional on all devices, featuring a dynamic hamburger menu and responsive grid layouts.

🏗️ System Architecture & Modules

The system operates on 16 Integrated Modules across three core areas:

🛡️ Shared Core

Authentication & Security: Secure login, session persistence, and RBAC.

User Registration: Student account sign-up system protected by Captcha.

Profile Management: Dashboard for personal information and avatar uploads.

Automated Notifications: Real-time event alerts using onSnapshot listeners.

👑 Admin Management

Organization Management: Creation of official councils and allowed voting strands.

Partylist Management: Approval pipeline for student political teams.

User & Voter Management: Master database to search, edit, and elevate users.

Position Configuration: Dynamic mapping of ballot hierarchy.

Election Phase Control: Master toggles to open/close candidacy and voting phases.

Timeline Scheduling: Interactive calendar for managing official dates.

Analytics & Statistics: Real-time tracking of votes.

Reporting & Audit: Printable transparency and audit reports.

Database Maintenance: Secure "Danger Zone" module for resetting election cycles.

🎓 Student Experience

Candidacy Filing: Interface for submitting applications, platforms, and achievements.

Digital Ballot System: Dynamic ballot rendering and secure vote submission.

Help Center & Guidelines: Comprehensive instruction manual and election policies.

🗂️ Directory Structure

To maintain a modular and scalable codebase, the project follows a strict feature-based directory architecture:

/InformaticsVotingSystem
│
├── index.html                  # Public Landing & Authentication Gateway
├── about.html                  # Public System Information
├── contact.html                # Public Support Portal
├── user_dashboard.html         # Authenticated Student Portal
├── admin.html                  # Authenticated Administrator Portal
│
├── css/                        
│   ├── global.css              # Root variables, colors, fonts
│   ├── index.css               # Landing page specific styles
│   ├── dashboard.css           # Admin and User dashboard layouts
│   └── auth.css                # Authentication modal styling
│
└── js/                         
    ├── index.js                # Auth listener & Landing logic
    ├── user_dashboard.js       # Student tab navigation router
    ├── admin.js                # Admin tab navigation router
    ├── firebase-config.js      # Firebase API keys & Initialization
    │
    └── features/               # Modularized Feature Components
        ├── application.js          
        ├── voting.js               
        ├── notifications.js        
        ├── public_orgs.js          
        ├── public_partylists.js    
        ├── analytics.js            
        ├── profile.js              
        ├── admin_applications.js   
        ├── admin_users.js          
        ├── admin_timeline.js       
        ├── admin_reports.js        
        ├── admin_orgs.js           
        ├── admin_partylists.js     
        ├── admin_positions.js      
        ├── admin_reset.js          
        └── admin_election.js       

🛠️ Technology Stack

Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+ Modules)

Backend & Database: Firebase Authentication, Firestore (NoSQL), Firebase Cloud Storage

Libraries: Chart.js (Data Visualization), FontAwesome (Icons)

Navigate to the project directory:

cd informatics-voting-system


Setup Firebase:

Create a new project in the Firebase Console.

Enable Authentication (Email/Password), Firestore Database, and Storage.

Copy your Firebase SDK configuration.

Open js/firebase-config.js and replace the placeholder configuration with your own keys.

Run the application:

Because the project uses ES6 Modules (type="module"), it must be run on a local web server (opening the HTML file directly in a browser via file:// will cause CORS errors).

We recommend using the Live Server extension in VS Code.

🔒 Security & Data Integrity

Transaction Rollbacks: When a vote is cast, voting.js utilizes a Firestore writeBatch to simultaneously increment the candidate's voteCount and append the organization ID to the user's votedOrgs array. If either operation fails, the entire transaction rolls back.

Client-Side Routing Protection: The authentication listener validates the role field on every state change. Unauthorized access attempts to administrative portals result in immediate redirects.

Developed for Informatics College Northgate.
