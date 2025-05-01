let lastPosition = null;
let totalDistance = 0;
let totalPoints = 0;
let username = localStorage.getItem("username");

window.addEventListener("load", () => {
  if (!username) {
    const usernameInput = document.getElementById("usernameInput");
    username = usernameInput ? usernameInput.value.trim() : "";
    if (username) {
      localStorage.setItem("username", username);
      saveToFirebase(username, totalPoints);
    } else {
      alert("Bitte gib deinen Namen ein.");
    }
  }

  const savedDistance = localStorage.getItem("totalDistance");
  const savedPoints = localStorage.getItem("totalPoints");

  if (savedDistance) {
    totalDistance = parseFloat(savedDistance);
    totalPoints = parseInt(savedPoints);
    document.getElementById("total_Count").textContent = totalDistance.toFixed(2) + " m";
    document.getElementById("total_Points").textContent = totalPoints;
  }

  fetchTopScores();
});

window.addEventListener("beforeunload", () => {
  if (username) saveToFirebase(username, totalPoints);
});

document.getElementById("startBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation wird nicht unterstützt.");
    return;
  }

  navigator.geolocation.getCurrentPosition(() => startTracking(), err => {
    alert("GPS-Zugriff fehlgeschlagen: " + err.message);
  }, { enableHighAccuracy: true, timeout: 10000 });
});

function startTracking() {
  navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const current = { latitude, longitude };

    if (lastPosition) {
      const distance = calculateDistance(lastPosition, current);
      if (distance > 2.8 && distance < 10) {
        totalDistance += distance;
        localStorage.setItem("totalDistance", totalDistance);
        addPointsRow(distance);
        saveToFirebase(username, totalPoints);
      }
    }
    lastPosition = current;
  }, null, { enableHighAccuracy: true });
}

function addPointsRow(distance) {
  const table = document.getElementById("pointsTable");
  const row = table.insertRow();
  const timeCell = row.insertCell(0);
  const distCell = row.insertCell(1);
  const pointsCell = row.insertCell(2);

  const points = Math.round(distance);
  const now = new Date();
  totalPoints += points;
  localStorage.setItem("totalPoints", totalPoints);

  timeCell.textContent = now.toLocaleTimeString();
  distCell.textContent = distance.toFixed(1);
  pointsCell.textContent = points;

  document.getElementById("total_Count").textContent = totalDistance.toFixed(2) + " m";
  document.getElementById("total_Points").textContent = totalPoints;
}

function saveToFirebase(username, points) {
  const db = firebase.firestore();
  db.collection("highScores").doc(username).set({
    points: points,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(fetchTopScores).catch(console.error);
}

function fetchTopScores() {
  const db = firebase.firestore();
  const table = document.getElementById("leaderboardTable");
  table.innerHTML = '';

  db.collection("highScores").orderBy("points", "desc").limit(10).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const row = table.insertRow();
        row.insertCell(0).textContent = doc.id;
        row.insertCell(1).textContent = data.points;
      });
    }).catch(console.error);
}

function toRadians(deg) {
  return deg * Math.PI / 180;
}

function calculateDistance(pos1, pos2) {
  const R = 6371e3;
  const φ1 = toRadians(pos1.latitude);
  const φ2 = toRadians(pos2.latitude);
  const Δφ = toRadians(pos2.latitude - pos1.latitude);
  const Δλ = toRadians(pos2.longitude - pos1.longitude);

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}