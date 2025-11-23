let allQuakes = [];
let map, markerGroup;

document.addEventListener('DOMContentLoaded', async () => {
  // Load data
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
  quakes.forEach(quake => {
    const p = quake.properties;
    const coords = quake.geometry.coordinates;
    const mag = p.mag || 0;

    const colorClass = mag >= 6 ? 'mag-6' : mag >= 5 ? 'mag-5' : mag >= 4 ? 'mag-4' : 'mag-3';

    const marker = L.circleMarker([coords[1], coords[0]], {
      radius: Math.max(6, mag * 3),
      fillColor: getColor(mag),
      color: '#000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.7,
      className: colorClass
    });

    const date = new Date(p.time).toLocaleDateString('en-GB');
    
    marker.bindPopup(`
      <div class="text-center font-semibold">
        <div class="text-2xl">M ${mag.toFixed(1)}</div>
        <div class="text-lg">${p.place}</div>
        <div class="text-sm text-gray-600">${date}</div>
        ${p.felt ? `<div class="mt-2 text-xs bg-yellow-100 rounded px-2 py-1">Felt by ${p.felt} people</div>` : ''}
      </div>
    `);

    markerGroup.addLayer(marker);
  });
}

function getColor(mag) {
  return mag >= 6 ? '#dc2626' :
         mag >= 5 ? '#ef4444' :
         mag >= 4 ? '#f97316' : '#60a5fa';
}

function renderStats() {
  const total = allQuakes.length;
  const maxMag = Math.max(...allQuakes.map(q => q.properties.mag || 0));
  const strongest = allQuakes.find(q => (q.properties.mag || 0) === maxMag);
  const recent = allQuakes[0];

  document.getElementById('stats').innerHTML = `
    <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5">
      <h3 class="text-3xl font-bold">${total}</h3>
      <p>Total Recorded Quakes</p>
    </div>
    <div class="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-5">
      <h3 class="text-3xl font-bold">M ${maxMag.toFixed(1)}</h3>
      <p>Strongest Ever<br><small>${new Date(strongest.properties.time).toLocaleDateString()}</small></p>
    </div>
    <div class="bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-xl p-5">
      <h3 class="text-lg font-bold">Latest</h3>
      <p>M ${recent.properties.mag.toFixed(1)} • ${recent.properties.place.split(',')[0]}<br>
      <small>${new Date(recent.properties.time).toLocaleDateString()}</small></p>
    </div>
  `;
}

function renderQuakeList() {
  const strongQuakes = allQuakes.filter(q => q.properties.mag >= 4.5).slice(0, 10);
  const list = document.getElementById('quakeList');
  list.innerHTML = strongQuakes.map(q => {
    const date = new Date(q.properties.time).toLocaleDateString('en-GB');
    return `
      <div class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
        <div>
          <span class="font-bold text-lg">M ${q.properties.mag.toFixed(1)}</span>
          <span class="text-gray-600 dark:text-gray-400 ml-3">${q.properties.place.split(',')[0]}</span>
        </div>
        <div class="text-sm text-gray-500">${date}</div>
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

  applyFilters(); // initial
}
