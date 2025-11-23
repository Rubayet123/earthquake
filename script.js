let allQuakes = [];
let map, markerGroup;
let markers = new Map(); // To store quake.id → marker

document.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('data/earthquakes.json');
  const data = await response.json();
  allQuakes = data.features.sort((a, b) => b.properties.time - a.properties.time);

  initMap();
  renderStats();
  renderQuakeList();
  setupFilters();
});

function initMap() {
  map = L.map('map').setView([23.7, 90.4], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  markerGroup = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
  });

  updateMap(allQuakes);
  map.addLayer(markerGroup);
}

function updateMap(quakes) {
  markerGroup.clearLayers();
  markers.clear();

  quakes.forEach(quake => {
    const p = quake.properties;
    const coords = quake.geometry.coordinates;
    const mag = p.mag || 0;

    const marker = L.circleMarker([coords[1], coords[0]], {
      radius: Math.max(6, mag * 3),
      fillColor: getColor(mag),
      color: '#000',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.8
    });

    const date = new Date(p.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    marker.bindPopup(`
      <div class="text-center font-semibold p-2">
        <div class="text-2xl font-bold text-red-600">M ${mag.toFixed(1)}</div>
        <div class="text-lg">${p.place}</div>
        <div class="text-sm text-gray-600">${date}</div>
        ${p.felt ? `<div class="mt-2 text-xs bg-yellow-100 rounded-full px-3 py-1 inline-block">Felt by ${p.felt} people</div>` : ''}
      </div>
    `, { maxWidth: 400 });

    markerGroup.addLayer(marker);
    markers.set(quake.id, marker); // Store for later clicking
  });
}

function getColor(mag) {
  return mag >= 6 ? '#dc2626' :
         mag >= 5 ? '#ef4444' :
         mag >= 4 ? '#f97316' : '#60a5fa';
}

// NEW: Function to zoom & open a specific quake
function focusOnQuake(quakeId) {
  const marker = markers.get(quakeId);
  if (marker) {
    map.setView(marker.getLatLng(), 11);
    setTimeout(() => marker.openPopup(), 600); // Small delay for smooth zoom
  }
}

function renderStats() {
  const total = allQuakes.length;
  const maxMag = Math.max(...allQuakes.map(q => q.properties.mag || 0));
  const strongest = allQuakes.find(q => (q.properties.mag || 0) === maxMag);
  const latest = allQuakes[0];

  document.getElementById('stats').innerHTML = `
    <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5">
      <h3 class="text-3xl font-bold">${total}</h3>
      <p>Total Recorded Quakes</p>
    </div>

    <div class="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-xl p-5 cursor-pointer hover:opacity-90 transition transform hover:scale-105"
         onclick="focusOnQuake('${strongest.id}')">
      <h3 class="text-3xl font-bold">M ${maxMag.toFixed(1)}</h3>
      <p class="text-sm opacity-90">Strongest Ever</p>
      <p class="text-xs mt-1">${new Date(strongest.properties.time).toLocaleDateString('en-GB')}</p>
    </div>

    <div class="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-5 cursor-pointer hover:opacity-90 transition transform hover:scale-105"
         onclick="focusOnQuake('${latest.id}')">
      <h3 class="text-lg font-bold">Latest Quake</h3>
      <p class="text-xl font-bold">M ${latest.properties.mag.toFixed(1)}</p>
      <p class="text-sm">${latest.properties.place.split(',')[0]}</p>
      <p class="text-xs mt-1">${new Date(latest.properties.time).toLocaleDateString('en-GB')}</p>
    </div>
  `;
}

function renderQuakeList() {
  const strongQuakes = allQuakes.filter(q => q.properties.mag >= 4.5).slice(0, 15);
  const list = document.getElementById('quakeList');
  list.innerHTML = strongQuakes.map(q => {
    const date = new Date(q.properties.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const mag = q.properties.mag.toFixed(1);
    return `
      <div class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer transform hover:scale-105"
           onclick="focusOnQuake('${q.id}')">
        <div class="flex items-center space-x-4">
          <div class="text-2xl font-bold ${mag >= 6 ? 'text-red-600' : mag >= 5 ? 'text-orange-600' : 'text-amber-600'}">
            M ${mag}
          </div>
          <div>
            <div class="font-medium">${q.properties.place.split(',')[0]}</div>
            <div class="text-sm text-gray-500">${date}</div>
          </div>
        </div>
        ${q.properties.felt ? `<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Felt</span>` : ''}
      </div>
    `;
  }).join('');
}

function setupFilters() {
  const magSlider = document.getElementById('magFilter');
  const magValue = document.getElementById('magValue');
  const yearSlider = document.getElementById('yearFilter');
  const yearValue = document.getElementById('yearValue');

  const applyFilters = () => {
    const minMag = parseFloat(magSlider.value);
    const minYear = parseInt(yearSlider.value);

    const filtered = allQuakes.filter(q => {
      const year = new Date(q.properties.time).getFullYear();
      return (q.properties.mag || 0) >= minMag && year >= minYear;
    });

    updateMap(filtered);
    magValue.textContent = `≥ ${minMag}`;
    yearValue.textContent = minYear === 1900 ? 'All time' : minYear + '+';
  };

  magSlider.addEventListener('input', applyFilters);
  yearSlider.addEventListener('input', applyFilters);

  document.getElementById('resetBtn').addEventListener('click', () => {
    magSlider.value = 2.5;
    yearSlider.value = 1900;
    applyFilters();
  });

  applyFilters();
}
