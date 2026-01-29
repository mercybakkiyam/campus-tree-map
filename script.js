// ===============================
// 1. CAMPUS BOUNDS
// ===============================
const campusBounds = [
  [13.0442, 80.2518],
  [13.0482, 80.2552]
];



// ===============================
// 2. MAP
// ===============================
const map = L.map('map', {
  minZoom: 18,
  maxZoom: 23,
  maxBounds: campusBounds,
  maxBoundsViscosity: 1.0,
  zoomControl: false,
  /*rotate: true,
  bearing: -50,
  touchRotate: true,*/
  rotateControl: false
}).setView([13.0482, 80.2552], 18);

// Add zoom control
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ===============================
// MAP LAYERS (STREET + SATELLITE)
// ===============================

// street view 
const streetLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    minZoom: 18,
    maxZoom: 23,
    maxNativeZoom: 19,
    attribution: '© OpenStreetMap'
  }
);

// Satellite view 
const satelliteLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    minZoom: 18,
    maxZoom: 23,
    maxNativeZoom: 19,
    attribution: '© Esri'
  }
);

// Load DEFAULT view
streetLayer.addTo(map);

// Layer switch control 
const baseMaps = {
  "Street View": streetLayer,
  "Satellite View": satelliteLayer
};

L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(map);

/*
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 23,
  maxNativeZoom: 19,
  minZoom: 18
}).addTo(map);
*/

// Lock dragging
map.on('drag', function () {
  map.panInsideBounds(campusBounds, { animate: false });
});



// ===============================
// 3. ICONS
// ===============================
const icons = {
  palm: L.icon({ iconUrl: 'palm.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  neem: L.icon({ iconUrl: 'neem.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  fruit: L.icon({ iconUrl: 'fruit.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  avenue: L.icon({ iconUrl: 'tall.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  flower: L.icon({ iconUrl: 'flower.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  coconut: L.icon({ iconUrl: 'coconut.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  other: L.icon({ iconUrl: 'treee.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]})
};

// ===============================
// 4. CATEGORY DETECTION
// ===============================
function getTreeCategory(name) {
  name = name.toLowerCase();

  if (name.includes("coconut") || name.includes("thennai"))
    return "coconut";

  if (name.includes("palm"))
    return "palm";

  if (name.includes("neem"))
    return "neem";

  if (name.includes("mango") || name.includes("jack") || name.includes("guava") || name.includes("tamarind") || name.includes("cashew"))
    return "fruit";

  if (name.includes("ashoka") || name.includes("polyalthia") || name.includes("christmas"))
    return "avenue";

  if (name.includes("gulmohar") || name.includes("jacaranda") || name.includes("peepal"))
    return "flower";

  return "other";
}

// ===============================
// 5. DOT STYLE
// ===============================
function createDot(lat, lon, popupContent) {
  return L.circleMarker([lat, lon], {
    radius: 3,
    color: "#0a7d00",
    fillColor: "#4caf50",
    fillOpacity: 0.9
  }).bindPopup(popupContent);
}

// ===============================
// 6. LAYERS
// ===============================
const treeLayer = L.layerGroup().addTo(map);
const allTrees = [];

// ===============================
// 7. LOAD CSV
// ===============================
Papa.parse("trees.csv", {
  download: true,
  header: true,
  complete: function (results) {

    results.data.forEach(tree => {
      if (!tree.Latitude || !tree.Longitude) return;

      const lat = parseFloat(tree.Latitude);
      const lon = parseFloat(tree.Longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const popupContent = `
        <div class="popup-card">
          <img src="${tree.Image || 'default_tree.png'}">
          <div class="popup-content">
            <p><span class="label">Name:</span> ${tree.TreeName}</p>
            <p><span class="label">Botanical Name:</span> ${tree.BotanicalName}</p>
            <a href="${tree.Link}" target="_blank">Tree Tales</a>
          </div>
        </div>
      `;

      const category = getTreeCategory(tree.TreeName || "");

      // Create tree icon
      const marker = L.marker([lat, lon], { icon: icons[category] })
        .bindPopup(popupContent);

      // Create dot
      const dot = createDot(lat, lon, popupContent);

      // Search fields
      marker.treeName = (tree.TreeName || "").toLowerCase();
      marker.botanicalName = (tree.BotanicalName || "").toLowerCase();
      dot.treeName = marker.treeName;
      dot.botanicalName = marker.botanicalName;

      allTrees.push({ marker, dot });
    });

    // ===============================
    // 8. ZOOM SWITCHING
    // ===============================
    function refreshMarkers() {
      treeLayer.clearLayers();

      if (map.getZoom() <= 18) {
        allTrees.forEach(t => treeLayer.addLayer(t.dot));
      } else {
        allTrees.forEach(t => treeLayer.addLayer(t.marker));
      }
    }

    map.on("zoomend", refreshMarkers);
    refreshMarkers();

    // ===============================
    // 9. SEARCH
    // ===============================
    const search = new L.Control.Search({
      layer: treeLayer,
      propertyName: 'TreeName',
      marker: false,
      textPlaceholder: 'Search Tree'
    });

    map.addControl(search);

    search.on('search:locationfound', function(e) {
      const text = e.text.toLowerCase();
      treeLayer.clearLayers();

      allTrees.forEach(t => {
        const m = map.getZoom() <= 19 ? t.dot : t.marker;
        if (m.treeName.includes(text) || m.botanicalName.includes(text)) {
          treeLayer.addLayer(m);
        }
      });
    });

    search.on('search:collapsed', function() {
      refreshMarkers();
    });
  }
});
