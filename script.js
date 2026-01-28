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
  maxBoundsViscosity: 1.0
}).setView([13.04628, 80.25350], 18);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 23,
  maxNativeZoom: 19,
  minZoom: 18
}).addTo(map);

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

  if (name.includes("coconut") || name.includes("thennai")) return "coconut";
  if (name.includes("palm")) return "palm";
  if (name.includes("neem")) return "neem";
  if (name.includes("mango") || name.includes("jack") || name.includes("guava") || name.includes("tamarind") || name.includes("cashew")) return "fruit";
  if (name.includes("ashoka") || name.includes("polyalthia") || name.includes("christmas")) return "avenue";
  if (name.includes("gulmohar") || name.includes("jacaranda") || name.includes("peepal")) return "flower";
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
const treeLayer = L.layerGroup().addTo(map); // visible on map
const allTrees = [];
const searchLayer = L.featureGroup().addTo(map); // now it is attached to map
searchLayer.eachLayer(layer => layer.setOpacity(0)); // make invisible if needed

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

      // Create marker (icon) and dot
      const marker = L.marker([lat, lon], { icon: icons[category] }).bindPopup(popupContent);
      const dot = createDot(lat, lon, popupContent);

      // Add feature properties for search
      marker.feature = { properties: { TreeName: tree.TreeName, BotanicalName: tree.BotanicalName } };

      // lowercase for filtering
      marker.treeName = (tree.TreeName || "").toLowerCase();
      marker.botanicalName = (tree.BotanicalName || "").toLowerCase();
      dot.treeName = marker.treeName;
      dot.botanicalName = marker.botanicalName;

      allTrees.push({ marker, dot });

      // Add marker to search layer (hidden)
      searchLayer.addLayer(marker);
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
      layer: searchLayer,           // use hidden layer for search
      propertyName: 'TreeName',
      marker: false,
      textPlaceholder: 'Search Tree',
      position: 'topleft'
    });

    map.addControl(search);

    function filterTrees(query) {
      const q = query.toLowerCase();
      allTrees.forEach(t => {
        const m = map.getZoom() <= 18 ? t.dot : t.marker;
        if (t.marker.treeName.includes(q) || t.marker.botanicalName.includes(q)) {
          if (!treeLayer.hasLayer(m)) treeLayer.addLayer(m);
        } else {
          treeLayer.removeLayer(m);
        }
      });
    }

    search.on('search:locationfound', function(e) {
      filterTrees(e.text);
    });

    search.on('search:collapsed', function() {
      refreshMarkers(); // reset to show all trees
    });

  }
});
