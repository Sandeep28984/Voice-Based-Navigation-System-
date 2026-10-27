VOICE-BASED NAVIGATION SYSTEM - SETUP GUIDE
===========================================

PROJECT FILES
-------------
index.html       Main website page
css/style.css    Website design and responsive layout
js/app.js        GPS, speech, place search and routing logic

REQUIREMENTS
------------
- Visual Studio Code (for editing)
- A modern browser (Chrome is recommended)
- Internet connection (map, geocoding and routing use online services)
- Microphone and location permissions for voice/GPS features
- Live Server extension in VS Code for local testing

RUN ON YOUR COMPUTER
--------------------
1. Extract VoiceNavigationWebsite.zip to a folder.
2. Open VS Code.
3. Select File > Open Folder and choose the extracted VoiceNavigationWebsite folder.
4. Install the "Live Server" extension if it is not installed.
5. Open index.html in VS Code.
6. Right-click inside index.html and choose "Open with Live Server".
7. Your browser should open a local address similar to http://127.0.0.1:5500.
8. Allow location and microphone permissions when asked.

OPEN ON ANOTHER COMPUTER
------------------------
Option A: Run on the other computer
1. Copy the ZIP file using a USB drive, email, or cloud storage.
2. Extract it on the other computer.
3. Install VS Code and Live Server, or use any simple local web server.
4. Open the extracted folder in VS Code and run index.html with Live Server.
5. Internet is required for the online map and routing services.

Option B: Publish it as a public website
1. Create a GitHub account and a new repository.
2. Upload index.html, css/style.css, js/app.js and README.txt while keeping the folder structure.
3. Open repository Settings > Pages.
4. Under Build and deployment, choose Deploy from a branch.
5. Select the main branch and /(root), then save.
6. Wait for the Pages URL to appear in Settings > Pages.
7. Open that HTTPS URL on another computer or phone.
   Note: a public repository and published website may be visible to everyone.

IMPORTANT TECHNICAL NOTES
-------------------------
- GPS normally requires HTTPS or localhost. Opening the HTML directly using file:// may block location access.
- Internet access is required because Leaflet, OpenStreetMap tiles, place search, and routing are loaded online.
- Browser speech recognition varies by browser and may send audio to a browser vendor's service.
- The free public place-search and routing services have usage policies and are not guaranteed for production.
- This is an educational prototype, not a safety-certified navigation tool. It cannot reliably detect obstacles, curbs, traffic, stairs, or safe crossings. Do not use it as the sole mobility aid. Keep using a white cane, guide dog, or other established mobility aid.
