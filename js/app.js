'use strict';

const $ = (id) => document.getElementById(id);
const statusBox = $('status');
const instructionBox = $('instruction');
const stepsBox = $('steps');

let map;
let userMarker;
let destinationMarker;
let routeLine;
let currentPosition = null;
let spokenSteps = [];
let nextStepIndex = 0;

function setStatus(message) {
  statusBox.textContent = message;
}

function speak(message) {
  instructionBox.textContent = message;
  if (!('speechSynthesis' in window)) {
    setStatus('Text-to-speech is not supported by this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.lang = 'en-IN';
  window.speechSynthesis.speak(utterance);
}

function initializeMap() {
  if (typeof L === 'undefined') {
    setStatus('The map library could not load. Check your internet connection.');
    return;
  }
  // Default view is Chennai; the map moves to the user's GPS position after permission.
  map = L.map('map').setView([13.0827, 80.2707], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not support GPS location.'));
      return;
    }
    setStatus('Requesting GPS location. Please allow location access.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentPosition = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        if (userMarker) {
          userMarker.setLatLng([currentPosition.lat, currentPosition.lon]);
        } else {
          userMarker = L.marker([currentPosition.lat, currentPosition.lon])
            .addTo(map).bindPopup('Your current location');
        }
        map.setView([currentPosition.lat, currentPosition.lon], 16);
        resolve(currentPosition);
      },
      (error) => {
        let message = 'Could not get your location. Please try again.';
        if (error.code === 1) message = 'Location permission was denied. Allow location access in browser settings.';
        if (error.code === 2) message = 'Your location is unavailable. Try again outdoors.';
        if (error.code === 3) message = 'Location request timed out. Please try again.';
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
}

async function speakMyLocation() {
  try {
    const position = await getCurrentLocation();
    const message = `Your latitude is ${position.lat.toFixed(5)} and longitude is ${position.lon.toFixed(5)}.`;
    setStatus('Current location found.');
    speak(message);
  } catch (error) {
    setStatus(error.message);
    speak(error.message);
  }
}

async function findPlace(placeName) {
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
    encodeURIComponent(placeName);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Place search failed. Check your internet connection.');
  const results = await response.json();
  if (!results.length) throw new Error('Destination not found. Try a more specific place name or address.');
  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    name: results[0].display_name
  };
}

function formatStep(step) {
  const type = step.maneuver?.type || 'continue';
  const modifier = step.maneuver?.modifier || '';
  if (type === 'arrive') return 'You have arrived at your destination.';
  if (type === 'depart') return 'Start moving along the route.';

  const actions = {
    'turn-left': 'Turn left',
    'turn-right': 'Turn right',
    'turn-slight-left': 'Bear slightly left',
    'turn-slight-right': 'Bear slightly right',
    'turn-sharp-left': 'Turn sharply left',
    'turn-sharp-right': 'Turn sharply right',
    'uturn': 'Make a U-turn',
    'continue': 'Continue straight',
    'new name': 'Continue'
  };
  const key = modifier ? `${type}-${modifier}` : type;
  const action = actions[key] || actions[type] || 'Continue along the route';
  const street = step.name ? ` onto ${step.name}` : '';
  const distance = step.distance >= 1000
    ? `${(step.distance / 1000).toFixed(1)} kilometres`
    : `${Math.round(step.distance)} metres`;
  return `${action}${street} for about ${distance}.`;
}

async function startNavigation() {
  const destinationText = $('destination').value.trim();
  if (!destinationText) {
    setStatus('Enter or speak a destination first.');
    speak('Please enter or speak a destination first.');
    $('destination').focus();
    return;
  }

  try {
    const origin = await getCurrentLocation();
    setStatus('Searching for destination.');
    const destination = await findPlace(destinationText);

    if (destinationMarker) {
      destinationMarker.setLatLng([destination.lat, destination.lon]);
    } else {
      destinationMarker = L.marker([destination.lat, destination.lon]).addTo(map);
    }
    destinationMarker.bindPopup(`Destination: ${destination.name}`);

    setStatus('Calculating a walking route.');
    // Public demo endpoint; service uptime and pedestrian-route coverage are not guaranteed.
    const routeUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(routeUrl);
    if (!response.ok) throw new Error('Walking route service is unavailable. Please try again later.');
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
      throw new Error('No walking route was found for these locations.');
    }

    const route = data.routes[0];
    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.geoJSON(route.geometry, {
      style: { color: '#087cf0', weight: 7, opacity: 0.9 }
    }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [25, 25] });

    spokenSteps = [];
    route.legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        if (step.distance > 0 || step.maneuver?.type === 'arrive') {
          spokenSteps.push(formatStep(step));
        }
      });
    });
    if (!spokenSteps.length) spokenSteps = ['Follow the route shown on the map.'];

    stepsBox.replaceChildren();
    spokenSteps.forEach((step) => {
      const item = document.createElement('li');
      item.textContent = step;
      stepsBox.appendChild(item);
    });

    const distanceKm = (route.distance / 1000).toFixed(2);
    const minutes = Math.round(route.duration / 60);
    nextStepIndex = 1;
    setStatus(`Route found: ${distanceKm} km. Estimated time: ${minutes} minutes.`);
    speak(`Walking route found. Distance ${distanceKm} kilometres. Estimated time ${minutes} minutes. ${spokenSteps[0]}`);
  } catch (error) {
    setStatus(error.message);
    speak(error.message);
  }
}

function speakNextStep() {
  if (!spokenSteps.length) {
    speak('Find a route first.');
    return;
  }
  if (nextStepIndex >= spokenSteps.length) {
    speak('You have reached the end of the available route instructions.');
    return;
  }
  speak(spokenSteps[nextStepIndex]);
  nextStepIndex += 1;
}

function listenForDestination() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setStatus('Voice input is not supported by this browser. Type the destination instead.');
    speak('Voice input is not supported. Please type your destination.');
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  setStatus('Listening. Speak your destination now.');
  recognition.onresult = (event) => {
    const spokenDestination = event.results[0][0].transcript;
    $('destination').value = spokenDestination;
    setStatus(`Destination heard: ${spokenDestination}`);
    speak(`I heard ${spokenDestination}. Press Find route and start guidance.`);
  };
  recognition.onerror = (event) => {
    setStatus(`Voice input error: ${event.error}. You can type the destination instead.`);
  };
  recognition.start();
}

$('locBtn').addEventListener('click', speakMyLocation);
$('voiceBtn').addEventListener('click', listenForDestination);
$('startBtn').addEventListener('click', startNavigation);
$('nextBtn').addEventListener('click', speakNextStep);
$('repeatBtn').addEventListener('click', () => speak(instructionBox.textContent || 'No instruction available yet.'));
$('stopBtn').addEventListener('click', () => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  setStatus('Speech stopped.');
});
$('destination').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') startNavigation();
});

initializeMap();
