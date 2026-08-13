/* ==========================================================================
   BuildSense — AI-Powered 5G Cell Site & Digital Twin Optimizer
   Engineered for ASEAN GeoAI Fusion 2026
   Team: Khun Thi Han, La Pyae Aung, Su Hlaing Thin
   University of Computer Studies, Taunggyi
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State & GeoJSON Datasets
    let currentStyle = 'satellite';
    let towersGeoJSON = window.TOWERS_DATA || { type: "FeatureCollection", features: [] };
    let speedTilesGeoJSON = window.SPEED_TILES_DATA || { type: "FeatureCollection", features: [] };
    let h3HexagonsGeoJSON = window.H3_HEXAGONS_DATA || { type: "FeatureCollection", features: [] };
    let recommendedGeoJSON = window.RECOMMENDED_5G_DATA || { type: "FeatureCollection", features: [] };
    
    let isDeployMode = false;
    let radarPulseRadius = 250;
    let radarDirection = 1;
    let animationFrameId = null;

    // Simulation Parameters
    let simFreq = 3500;        // MHz
    let simMimo = "64x64";     // "4x4" or "64x64"
    let simPower = 40;         // Watts (10, 40, 100)
    let simBw = 100;           // MHz (20, 50, 100)
    let simWeather = "clear";  // "clear", "rain", "foliage"
    let simTerrain = "flat";   // "flat", "diffraction"
    let simTraffic = "normal"; // "normal", "peak"
    let targetAiSites = 24;    // Default 24 AI Proposed 5G Sites across 4 Townships

    // Map Center Coordinates
    const TOWN_COORDINATES = {
        Taunggyi: { center: [97.0378, 20.7844], zoom: 14.5, pitch: 60, bearing: -15 },
        Hopong: { center: [97.1722, 20.7981], zoom: 14.2, pitch: 60, bearing: -15 },
        Nyaungshwe: { center: [96.9347, 20.6592], zoom: 14.3, pitch: 60, bearing: -15 },
        Inle_Basin: { center: [96.9022, 20.5488], zoom: 13.8, pitch: 60, bearing: -15 }
    };

    // Google Maps Tile Sources
    const BASE_STYLES = {
        satellite: {
            version: 8,
            sources: {
                'google-satellite': {
                    type: 'raster',
                    tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
                    tileSize: 256,
                    attribution: '&copy; Google Satellite Imagery & Google Earth'
                }
            },
            layers: [{ id: 'base-sat', type: 'raster', source: 'google-satellite' }]
        },
        dark: {
            version: 8,
            sources: {
                'google-terrain': {
                    type: 'raster',
                    tiles: ['https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'],
                    tileSize: 256,
                    attribution: '&copy; Google Terrain & Elevation Data'
                }
            },
            layers: [{ id: 'base-terrain', type: 'raster', source: 'google-terrain' }]
        },
        osm: {
            version: 8,
            sources: {
                'google-maps': {
                    type: 'raster',
                    tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
                    tileSize: 256,
                    attribution: '&copy; Google Maps'
                }
            },
            layers: [{ id: 'base-maps', type: 'raster', source: 'google-maps' }]
        }
    };

    // Initialize MapLibre GL Map Instance
    const map = new maplibregl.Map({
        container: 'map',
        style: BASE_STYLES.satellite,
        center: TOWN_COORDINATES.Taunggyi.center,
        zoom: TOWN_COORDINATES.Taunggyi.zoom,
        pitch: 60,
        bearing: -15,
        maxPitch: 85
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Automatic Canvas Resizing for Fullscreen & Window Resize
    window.addEventListener('resize', () => {
        if (map) map.resize();
    });

    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            if (map) map.resize();
        });
        const wrapper = document.getElementById('map-wrapper');
        if (wrapper) resizeObserver.observe(wrapper);
    }

    // Add Layers Function
    function addTelecomLayers() {
        // 1. Ookla Speed Tiles Layer (4-Township Regional Grid)
        if (!map.getSource('ookla-tiles')) {
            map.addSource('ookla-tiles', { type: 'geojson', data: speedTilesGeoJSON });
            map.addLayer({
                id: 'layer-ookla',
                type: 'fill',
                source: 'ookla-tiles',
                paint: {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.42,
                    'fill-outline-color': 'rgba(0,0,0,0.5)'
                }
            });
        }

        // 2. 3D Neon Extruded Buildings Layer
        if (!map.getSource('buildings-3d')) {
            map.addSource('buildings-3d', { type: 'geojson', data: window.BUILDINGS_DATA });
            map.addLayer({
                id: 'layer-buildings-3d',
                type: 'fill-extrusion',
                source: 'buildings-3d',
                paint: {
                    'fill-extrusion-color': ['get', 'suitability_color'],
                    'fill-extrusion-height': ['get', 'height'],
                    'fill-extrusion-base': ['get', 'min_height'],
                    'fill-extrusion-opacity': 0.88
                }
            });
        }

        // 3. 5G Signal Propagation Waves & Towers
        if (!map.getSource('cell-towers')) {
            map.addSource('cell-towers', { type: 'geojson', data: towersGeoJSON });
            
            // Animated Outer Signal Wave (Geographically Scaled in Meters & Dynamically Scaled by Frequency Multiplier)
            map.addLayer({
                id: 'layer-signal-wave',
                type: 'circle',
                source: 'cell-towers',
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['exponential', 2],
                        ['zoom'],
                        0, 0,
                        10, ['*', ['*', ['get', 'coverage_radius_m'], ['coalesce', ['get', 'radius_multiplier'], 1.0]], 0.024],
                        12, ['*', ['*', ['get', 'coverage_radius_m'], ['coalesce', ['get', 'radius_multiplier'], 1.0]], 0.096],
                        14, ['*', ['*', ['get', 'coverage_radius_m'], ['coalesce', ['get', 'radius_multiplier'], 1.0]], 0.385],
                        16, ['*', ['*', ['get', 'coverage_radius_m'], ['coalesce', ['get', 'radius_multiplier'], 1.0]], 1.54],
                        18, ['*', ['*', ['get', 'coverage_radius_m'], ['coalesce', ['get', 'radius_multiplier'], 1.0]], 6.16],
                        20, ['*', ['*', ['get', 'coverage_radius_m'], ['coalesce', ['get', 'radius_multiplier'], 1.0]], 24.6]
                    ],
                    'circle-color': '#00f2fe',
                    'circle-opacity': 0.18,
                    'circle-stroke-width': 2.0,
                    'circle-stroke-color': '#00f2fe',
                    'circle-pitch-scale': 'map',
                    'circle-pitch-alignment': 'map'
                }
            });

            // Tower Core Point — 3-Color Pin System
            // Red: Existing 4G/3G, Green: AI Suggested, Gold: User Deployed
            map.addLayer({
                id: 'layer-towers',
                type: 'circle',
                source: 'cell-towers',
                paint: {
                    'circle-radius': [
                        'case',
                        ['==', ['get', 'is_user_deployed'], true], 11,
                        9
                    ],
                    'circle-color': [
                        'case',
                        ['==', ['get', 'is_user_deployed'], true], '#ffd166', // 🟡 Bright Gold for User Deployed
                        '#ff2a6d'                                             // 🔴 Red for Existing Legacy Towers
                    ],
                    'circle-stroke-width': [
                        'case',
                        ['==', ['get', 'is_user_deployed'], true], 4.5,
                        3.5
                    ],
                    'circle-stroke-color': [
                        'case',
                        ['==', ['get', 'is_user_deployed'], true], '#ffffff',
                        '#ffffff'
                    ]
                }
            });
        }

        // 4. AI Proposed 5G Small Cells Layer (🟢 Clean Candidate Pins - No radar wave until deployed!)
        if (!map.getSource('recommended-5g')) {
            map.addSource('recommended-5g', { type: 'geojson', data: recommendedGeoJSON });
            
            map.addLayer({
                id: 'layer-proposed-5g',
                type: 'circle',
                source: 'recommended-5g',
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#00ff88', // 🟢 Neon Green for AI Recommended Candidate
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#060a14'
                }
            });
        }

        // 5. Uber H3 Hexagon Spatial Grid Layer (Res 9)
        if (!map.getSource('h3-hexagons')) {
            map.addSource('h3-hexagons', { type: 'geojson', data: h3HexagonsGeoJSON });
            map.addLayer({
                id: 'layer-h3-hexagons',
                type: 'fill',
                source: 'h3-hexagons',
                layout: { 'visibility': 'none' }, // toggleable
                paint: {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.48,
                    'fill-outline-color': '#00f2fe'
                }
            });
        }
    }

    map.on('load', () => {
        console.log("BuildSense GeoAI Engine loaded. Initializing 2D Digital Twin & 5G Optimizer...");
        addTelecomLayers();
        setupInteractivity();
        startRadarAnimation();
        recalculateAIRecommendations();
    });

    // Animate radar wave pulsing
    function startRadarAnimation() {
        function animate() {
            if (map.getLayer('layer-signal-wave')) {
                radarPulseRadius += 0.8 * radarDirection;
                if (radarPulseRadius > 380) radarDirection = -1;
                if (radarPulseRadius < 220) radarDirection = 1;

                map.setPaintProperty('layer-signal-wave', 'circle-opacity', 0.12 + (radarPulseRadius / 2500));
            }
            animationFrameId = requestAnimationFrame(animate);
        }
        animate();
    }

    // Client-Side Real-Time K-Means Clustering Engine
    function runJsKMeans(points, kMax = 8) {
        if (!points || points.length === 0) return [];
        const k = Math.min(kMax, points.length);
        let centroids = [];
        const step = Math.floor(points.length / k);
        for (let i = 0; i < k; i++) {
            const idx = Math.min(i * step, points.length - 1);
            centroids.push({ lat: points[idx][0], lng: points[idx][1] });
        }

        for (let iter = 0; iter < 10; iter++) {
            let clusters = Array.from({ length: k }, () => []);
            for (const pt of points) {
                let minDist = Infinity;
                let closest = 0;
                for (let i = 0; i < k; i++) {
                    const d = Math.hypot(pt[0] - centroids[i].lat, pt[1] - centroids[i].lng);
                    if (d < minDist) {
                        minDist = d;
                        closest = i;
                    }
                }
                clusters[closest].push(pt);
            }

            for (let i = 0; i < k; i++) {
                if (clusters[i].length > 0) {
                    let sumLat = 0, sumLng = 0;
                    for (const p of clusters[i]) {
                        sumLat += p[0];
                        sumLng += p[1];
                    }
                    centroids[i] = {
                        lat: sumLat / clusters[i].length,
                        lng: sumLng / clusters[i].length,
                        count: clusters[i].length
                    };
                }
            }
        }
        return centroids;
    }

    // Dynamic Real-Time Re-Clustering & Speed Tiles Update
    function recalculateAIRecommendations() {
        const buildingsData = window.BUILDINGS_DATA || window.BUILDINGS_3D_DATA;
        if (!buildingsData || !buildingsData.features) return;
        
        let envMult = 1.0;
        if (simWeather === "rain") envMult *= 0.82;
        if (simWeather === "foliage") envMult *= 0.75;
        if (simTerrain === "diffraction") envMult *= 0.85;

        // 0. Ensure Red Legacy Towers stay fixed baseline, while preserving individual custom radius for user-deployed towers!
        if (towersGeoJSON.features) {
            towersGeoJSON.features.forEach(t => {
                if (!t.properties.is_user_deployed) {
                    t.properties.radius_multiplier = 1.0 * envMult; // Fixed baseline + environmental weather factor
                }
            });
            if (map.getSource('cell-towers')) {
                map.getSource('cell-towers').setData(towersGeoJSON);
            }
        }

        const allTowers = towersGeoJSON.features || [];
        
        // 1. Find uncovered building centroids
        const uncoveredPoints = [];
        buildingsData.features.forEach(bld => {
            const bCoord = bld.geometry.type === 'Point' ? bld.geometry.coordinates : (bld.geometry.coordinates && bld.geometry.coordinates[0] ? bld.geometry.coordinates[0][0] : null);
            if (!bCoord) return;
            const bLng = bCoord[0], bLat = bCoord[1];
            
            let isCovered = false;
            for (const t of allTowers) {
                const tCoord = t.geometry.coordinates;
                const tLng = tCoord[0], tLat = tCoord[1];
                const tMult = t.properties.radius_multiplier || globalMult;
                const tRadius = (t.properties.coverage_radius_m || 480) * tMult;
                
                const dy = (bLat - tLat) * 111000;
                const dx = (bLng - tLng) * 103800;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist <= tRadius) {
                    isCovered = true;
                    break;
                }
            }
            if (!isCovered) {
                uncoveredPoints.push([bLat, bLng]);
            }
        });

        // 2. Re-cluster uncovered buildings into targetAiSites clusters
        const newCentroids = runJsKMeans(uncoveredPoints, targetAiSites);
        
        recommendedGeoJSON = {
            "type": "FeatureCollection",
            "features": newCentroids.map((c, i) => ({
                "type": "Feature",
                "id": `ai_rec_${Date.now()}_${i}`,
                "geometry": { "type": "Point", "coordinates": [c.lng, c.lat] },
                "properties": {
                    "name": `AI Dynamic Site #${i+1}`,
                    "ai_confidence": `${(88.0 + (i * 1.4) % 10).toFixed(1)}%`,
                    "estimated_speed_boost_mbps": `+${Math.round((simBw / 100) * 180 + (c.count || 5) * 1.5)} Mbps`,
                    "site_type": "Dynamic 5G Small Cell",
                    "target_coverage_radius_m": Math.round(480 * globalMult),
                    "uncovered_buildings_served": c.count || 12
                }
            }))
        };

        if (map.getSource('recommended-5g')) {
            map.getSource('recommended-5g').setData(recommendedGeoJSON);
        }

        // 3. Dynamic Ookla Speed Tiles & H3 Hexagons Upgrade
        updateOoklaSpeedTiles(allTowers, globalMult);

        // 4. Real-time HUD Status Telemetry Bar Update
        const deadCount = uncoveredPoints.length;
        const deployedCount = allTowers.filter(t => t.properties && t.properties.is_user_deployed).length;
        let weatherLabel = simWeather === 'rain' ? 'Monsoon Rain (-18%)' : (simWeather === 'foliage' ? 'Forest Foliage (-25%)' : 'Clear Sky');
        let terrainLabel = simTerrain === 'diffraction' ? 'ITU-R P.526 Ridge Loss' : 'Flat LOS';
        const hudElem = document.getElementById('hud-status');
        if (hudElem) {
            hudElem.textContent = `BuildSense | Deployed 5G Cells: ${deployedCount} | Weather: ${weatherLabel} | Terrain: ${terrainLabel} | Dead Zone Buildings: ${deadCount}`;
        }
    }

    // Update Ookla Speed Tiles and H3 Hexagons dynamically around towers
    function updateOoklaSpeedTiles(towers, globalMult) {
        if (!speedTilesGeoJSON.features) return;

        // 1. Dynamic Ookla Speed Tiles Upgrade
        speedTilesGeoJSON.features.forEach(tile => {
            if (tile.properties.original_speed_mbps === undefined) {
                tile.properties.original_speed_mbps = tile.properties.download_mbps || 15.0;
            }
            let maxBoostedSpeed = tile.properties.original_speed_mbps;

            const coords = tile.geometry.coordinates[0];
            const cLng = (coords[0][0] + coords[2][0]) / 2;
            const cLat = (coords[0][1] + coords[2][1]) / 2;

            towers.forEach(t => {
                const tCoord = t.geometry.coordinates;
                const tLng = tCoord[0], tLat = tCoord[1];
                const tMult = t.properties.radius_multiplier || globalMult;
                const tRadius = (t.properties.coverage_radius_m || 480) * tMult;

                const dy = (cLat - tLat) * 111000;
                const dx = (cLng - tLng) * 103800;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist <= tRadius) {
                    let boost = 0;
                    if (t.properties.is_user_deployed) {
                        const powerW = t.properties.tx_power_w || 40;
                        const maxSpeedAdd = Math.round(300 + (powerW / 100) * 350); // 5G Cell Boost: +330 to +650 Mbps
                        boost = Math.round((1 - (dist / tRadius)) * maxSpeedAdd + tile.properties.original_speed_mbps);
                    } else {
                        boost = Math.round((1 - (dist / tRadius)) * 140 + tile.properties.original_speed_mbps);
                    }
                    if (boost > maxBoostedSpeed) {
                        maxBoostedSpeed = boost;
                    }
                }
            });

            tile.properties.download_mbps = maxBoostedSpeed;
            if (maxBoostedSpeed >= 250) tile.properties.color = "#00ff88";      // Neon Green (Gigabit 5G)
            else if (maxBoostedSpeed >= 120) tile.properties.color = "#00f2fe"; // Neon Cyan (Fast 5G)
            else if (maxBoostedSpeed >= 60) tile.properties.color = "#00b4d8";  // Blue (Medium 4G)
            else if (maxBoostedSpeed >= 25) tile.properties.color = "#ffd166";  // Yellow (Low 4G)
            else tile.properties.color = "#ff3366";                             // Red (Dead Zone)
        });

        if (map.getSource('ookla-tiles')) {
            map.getSource('ookla-tiles').setData(speedTilesGeoJSON);
        }

        // 2. Dynamic H3 Hexagons Speed Upgrade
        if (h3HexagonsGeoJSON && h3HexagonsGeoJSON.features) {
            h3HexagonsGeoJSON.features.forEach(hex => {
                if (hex.properties.original_speed_mbps === undefined) {
                    hex.properties.original_speed_mbps = hex.properties.download_mbps || 12.0;
                }
                let maxBoostedSpeed = hex.properties.original_speed_mbps;

                const coords = hex.geometry.coordinates[0];
                const cLng = (coords[0][0] + coords[3][0]) / 2;
                const cLat = (coords[0][1] + coords[3][1]) / 2;

                towers.forEach(t => {
                    const tCoord = t.geometry.coordinates;
                    const tLng = tCoord[0], tLat = tCoord[1];
                    const tMult = t.properties.radius_multiplier || globalMult;
                    const tRadius = (t.properties.coverage_radius_m || 480) * tMult;

                    const dy = (cLat - tLat) * 111000;
                    const dx = (cLng - tLng) * 103800;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist <= tRadius) {
                        let boost = 0;
                        if (t.properties.is_user_deployed) {
                            const powerW = t.properties.tx_power_w || 40;
                            const maxSpeedAdd = Math.round(320 + (powerW / 100) * 380); // 5G Cell Boost: +350 to +700 Mbps
                            boost = Math.round((1 - (dist / tRadius)) * maxSpeedAdd + hex.properties.original_speed_mbps);
                        } else {
                            boost = Math.round((1 - (dist / tRadius)) * 150 + hex.properties.original_speed_mbps);
                        }
                        if (boost > maxBoostedSpeed) {
                            maxBoostedSpeed = boost;
                        }
                    }
                });

                hex.properties.download_mbps = maxBoostedSpeed;
                if (maxBoostedSpeed >= 250) hex.properties.color = "#00ff88";      // Neon Green (Gigabit 5G)
                else if (maxBoostedSpeed >= 120) hex.properties.color = "#00f2fe"; // Neon Cyan (Fast 5G)
                else if (maxBoostedSpeed >= 60) hex.properties.color = "#00b4d8";  // Blue (Medium 4G)
                else if (maxBoostedSpeed >= 25) hex.properties.color = "#ffd166";  // Yellow (Low 4G)
                else hex.properties.color = "#ff3366";                             // Red (Dead Zone)
            });

            if (map.getSource('h3-hexagons')) {
                map.getSource('h3-hexagons').setData(h3HexagonsGeoJSON);
            }
        }
    }

    // Interactivity & Event Handlers
    function setupInteractivity() {
        // Building Click Handler
        map.on('click', 'layer-buildings-3d', (e) => {
            if (isDeployMode) return;
            if (!e.features.length) return;
            const feat = e.features[0];
            const props = feat.properties;
            
            let factors = {};
            try {
                factors = typeof props.factor_breakdown === 'string' ? JSON.parse(props.factor_breakdown) : (props.factor_breakdown || {});
            } catch (err) {
                factors = {};
            }

            let score = props.suitability_score || 78.5;
            let color = props.suitability_color || (score >= 80 ? "#00ff88" : (score >= 65 ? "#00b4d8" : (score >= 45 ? "#ffd166" : "#ff2a6d")));
            let height = props.height || (props.floors ? props.floors * 3.5 : 14.0);
            let floors = props.floors || Math.max(1, Math.round(height / 3.5));
            let loss = props.indoor_loss_db || 14.5;
            let rsrp = props.rsrp_dbm || -82.0;
            let road = props.road_distance_m || 25.0;

            updateInspector({
                name: props.name || "Building Structure",
                region: props.region || "Taunggyi",
                score: parseFloat(score).toFixed(1),
                color: color,
                height: `${height} m (${floors} Floors)`,
                loss: `${loss} dB (ITU-R P.2109)`,
                rsrp: `${rsrp} dBm`,
                road: `${road} m`,
                demand_pts: `+${factors.demand_pts || 32.0} pts`,
                height_pts: `+${factors.height_pts || 24.0} pts`,
                road_pts: `+${factors.road_pts || 18.0} pts`,
                hazard_pts: `+${factors.hazard_pts || 10.0} pts`
            });

            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div class="popup-title">🏢 ${props.name || 'Building Structure'}</div>
                    <div class="popup-row"><span class="label">BuildSense Score:</span> <span class="val" style="color:${color}">${parseFloat(score).toFixed(1)} / 100</span></div>
                    <div class="popup-row"><span class="label">Floors:</span> <span class="val">${floors} Floors (${height}m)</span></div>
                    <div class="popup-row"><span class="label">Indoor Attenuation:</span> <span class="val">${loss} dB Loss</span></div>
                    <div class="popup-row"><span class="label">5G Signal RSRP:</span> <span class="val" style="color:var(--neon-cyan)">${rsrp} dBm</span></div>
                    <div class="popup-row"><span class="label">Hazard Safety:</span> <span class="val">${props.hazard_risk || 'Low Risk'}</span></div>
                `)
                .addTo(map);
        });

        // Tower Click Handler (Includes Tower Control Panel Option for User-Deployed Towers)
        map.on('click', 'layer-towers', (e) => {
            if (!e.features.length) return;
            const feat = e.features[0];
            const props = feat.properties;
            const towerId = feat.id || props.id;

            let controlPanelBtnHtml = "";
            if (props.is_user_deployed) {
                controlPanelBtnHtml = `
                    <div style="margin-top:12px; text-align:center;">
                        <button class="btn-open-tower-controls" onclick="window.openTowerControlPanel('${towerId}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Tower Control Panel
                        </button>
                    </div>
                `;
            }

            const titleText = props.is_user_deployed ? 'User-Deployed 5G Cell' : 'Legacy 4G/3G Tower';
            const titleColor = props.is_user_deployed ? '#b7791f' : '#d90429';
            const titleIcon = props.is_user_deployed 
                ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7791f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>`
                : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d90429" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M17 5H7"></path><path d="M19 9H5"></path></svg>`;

            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div class="popup-title" style="color:${titleColor}">
                        ${titleIcon} <span>${titleText}</span>
                    </div>
                    <div class="popup-row">
                        <span class="label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg> Name:</span>
                        <span class="val">${props.name}</span>
                    </div>
                    <div class="popup-row">
                        <span class="label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path><circle cx="12" cy="12" r="2"></circle><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path><path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"></path></svg> Tech:</span>
                        <span class="val">${props.technology}</span>
                    </div>
                    <div class="popup-row">
                        <span class="label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg> Tx Power:</span>
                        <span class="val">${props.tx_power_w || 40} W</span>
                    </div>
                    <div class="popup-row">
                        <span class="label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Radius:</span>
                        <span class="val">${Math.round((props.coverage_radius_m || 480) * (props.radius_multiplier || 1.0))} m</span>
                    </div>
                    <div class="popup-row">
                        <span class="label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Status:</span>
                        <span class="val" style="color:${props.is_user_deployed ? '#b7791f' : '#00a86b'}">${props.status}</span>
                    </div>
                    ${controlPanelBtnHtml}
                `)
                .addTo(map);
        });

        // Tower Control Panel Functions
        window.openTowerControlPanel = function(towerId) {
            const tower = towersGeoJSON.features.find(t => t.id === towerId || t.properties.id === towerId);
            if (!tower) return;

            // Close Map Popups
            const popups = document.getElementsByClassName('maplibregl-popup');
            while (popups[0]) popups[0].remove();

            const props = tower.properties;
            document.getElementById('tcp-tower-id').value = towerId;
            document.getElementById('tcp-tower-name').value = props.name || 'User 5G Cell';
            document.getElementById('tcp-tower-title').textContent = props.name || 'Tower Control Panel';
            
            // Preselect Frequency
            const freqSelect = document.getElementById('tcp-freq');
            if (props.freq_mhz) freqSelect.value = props.freq_mhz.toString();
            else if (props.radius_multiplier === 1.8) freqSelect.value = '700';
            else if (props.radius_multiplier === 0.35) freqSelect.value = '28000';
            else freqSelect.value = '3500';

            // Preselect Tx Power
            document.getElementById('tcp-power').value = (props.tx_power_w || 40).toString();
            document.getElementById('tcp-mimo').value = props.mimo || '64x64';
            
            const height = props.antenna_height_m || 30;
            document.getElementById('tcp-height').value = height;
            document.getElementById('tcp-height-val').textContent = `${height} meters`;

            // Stats
            const mult = props.radius_multiplier || 1.0;
            const radius = Math.round((props.coverage_radius_m || 480) * mult);
            document.getElementById('tcp-stat-radius').textContent = `${radius} m`;
            document.getElementById('tcp-stat-users').textContent = `${props.connected_subscribers || 850} Subscribers`;
            document.getElementById('tcp-stat-status').textContent = props.status || 'Active 5G Operational';

            // Show Panel
            const panel = document.getElementById('tower-control-panel');
            if (panel) panel.classList.remove('hidden');
        };

        // Close Panel Event
        const closePanelBtn = document.getElementById('btn-close-tower-panel');
        if (closePanelBtn) {
            closePanelBtn.addEventListener('click', () => {
                const panel = document.getElementById('tower-control-panel');
                if (panel) panel.classList.add('hidden');
            });
        }

        // Real-Time Tower Customization Inputs Listener
        const updateCurrentTowerConfig = () => {
            const towerId = document.getElementById('tcp-tower-id').value;
            if (!towerId) return;

            const tower = towersGeoJSON.features.find(t => t.id === towerId || t.properties.id === towerId);
            if (!tower) return;

            const newName = document.getElementById('tcp-tower-name').value;
            const freqVal = parseInt(document.getElementById('tcp-freq').value);
            const powerVal = parseInt(document.getElementById('tcp-power').value);
            const mimoVal = document.getElementById('tcp-mimo').value;
            const heightVal = parseInt(document.getElementById('tcp-height').value);

            let mult = freqVal === 700 ? 1.8 : (freqVal === 28000 ? 0.35 : 1.0);
            if (mimoVal === '64x64') mult *= 1.15;
            if (powerVal === 100) mult *= 1.25;
            if (powerVal === 10) mult *= 0.7;

            tower.properties.name = newName;
            tower.properties.freq_mhz = freqVal;
            tower.properties.tx_power_w = powerVal;
            tower.properties.mimo = mimoVal;
            tower.properties.antenna_height_m = heightVal;
            tower.properties.radius_multiplier = mult;
            tower.properties.technology = `5G NR (${freqVal === 700 ? '700MHz' : (freqVal === 28000 ? '28GHz mmWave' : '3.5GHz n78')})`;

            document.getElementById('tcp-tower-title').textContent = newName;
            document.getElementById('tcp-height-val').textContent = `${heightVal} meters`;
            
            const effectiveRadius = Math.round((tower.properties.coverage_radius_m || 480) * mult);
            document.getElementById('tcp-stat-radius').textContent = `${effectiveRadius} m`;

            // Update Map Source
            if (map.getSource('cell-towers')) {
                map.getSource('cell-towers').setData(towersGeoJSON);
            }

            // Recalculate AI & Speed Tiles
            recalculateAIRecommendations();
        };

        ['tcp-tower-name', 'tcp-freq', 'tcp-power', 'tcp-mimo', 'tcp-height'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                elem.addEventListener('input', updateCurrentTowerConfig);
                elem.addEventListener('change', updateCurrentTowerConfig);
            }
        });

        // Delete Tower inside Panel
        const tcpDeleteBtn = document.getElementById('tcp-btn-delete');
        if (tcpDeleteBtn) {
            tcpDeleteBtn.addEventListener('click', () => {
                const towerId = document.getElementById('tcp-tower-id').value;
                if (towerId) {
                    window.deleteBuildSenseTower(towerId);
                    const panel = document.getElementById('tower-control-panel');
                    if (panel) panel.classList.add('hidden');
                }
            });
        }

        // Delete Tower Global Function
        window.deleteBuildSenseTower = function(towerId) {
            towersGeoJSON.features = towersGeoJSON.features.filter(t => t.id !== towerId && t.properties.id !== towerId);
            if (map.getSource('cell-towers')) {
                map.getSource('cell-towers').setData(towersGeoJSON);
            }
            // Close popups
            const popups = document.getElementsByClassName('maplibregl-popup');
            while (popups[0]) popups[0].remove();

            // Recalculate AI Recommendations & Speed Tiles
            recalculateAIRecommendations();
        };

        // Proposed 5G Site Click Handler with Real-Time Gold Tower Deployment Conversion
        map.on('click', 'layer-proposed-5g', (e) => {
            if (!e.features.length) return;
            const feat = e.features[0];
            const props = feat.properties;
            const siteId = feat.id || props.id || `rec_${Date.now()}`;
            const coords = feat.geometry.coordinates;

            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div class="popup-title">🟢 ${props.name || 'AI Proposed 5G Cell'}</div>
                    <div class="popup-row"><span class="label">AI Confidence:</span> <span class="val" style="color:var(--neon-green)">${props.ai_confidence || '94.5% Optimal'}</span></div>
                    <div class="popup-row"><span class="label">Hardware Build:</span> <span class="val">3.5 GHz n78 Mid-Band (40W)</span></div>
                    <div class="popup-row"><span class="label">Target Radius:</span> <span class="val">${props.target_coverage_radius_m || 480} m Coverage</span></div>
                    <div class="popup-row"><span class="label">Expected Speed Boost:</span> <span class="val" style="color:var(--neon-cyan)">+${props.estimated_speed_boost_mbps || '165.0 Mbps'}</span></div>
                    <div class="popup-row"><span class="label">Structures Served:</span> <span class="val">${props.uncovered_buildings_served || 12} Dead Zone Buildings</span></div>
                    <div style="margin-top:12px; text-align:center;">
                        <button class="btn-confirm-deploy" style="width:100%; padding:8px 12px; font-size:12px; cursor:pointer;" onclick="window.deployRecommended5GSite('${siteId}', ${coords[0]}, ${coords[1]}, '${props.name || 'AI 5G Small Cell'}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><path d="M12 2v20"></path><path d="M17 5H7"></path><path d="M19 9H5"></path><path d="M21 13H3"></path></svg> Deploy Recommended 5G Site
                        </button>
                    </div>
                `)
                .addTo(map);
        });

        // Global function to deploy AI Recommended 5G Site to Active Gold Tower
        window.deployRecommended5GSite = function(siteId, lng, lat, name) {
            const newTower = {
                type: "Feature",
                id: `tower_user_${Date.now()}`,
                geometry: { type: "Point", coordinates: [lng, lat] },
                properties: {
                    id: `TOW-USR-${Date.now().toString().slice(-4)}`,
                    name: `${name} (Deployed)`,
                    region: "Target Area",
                    tower_type: "5G Small Cell",
                    technology: "5G NR (3.5GHz n78)",
                    tx_power_w: 40,
                    antenna_height_m: 30,
                    coverage_radius_m: 480,
                    radius_multiplier: 1.0,
                    is_user_deployed: true,
                    status: "Operational Active 5G",
                    connected_subscribers: 850
                }
            };

            // 1. Add to towers dataset
            towersGeoJSON.features.push(newTower);
            if (map.getSource('cell-towers')) {
                map.getSource('cell-towers').setData(towersGeoJSON);
            }

            // 2. Remove from recommended dataset
            recommendedGeoJSON.features = recommendedGeoJSON.features.filter(f => f.id !== siteId && f.properties.id !== siteId);
            if (map.getSource('recommended-5g')) {
                map.getSource('recommended-5g').setData(recommendedGeoJSON);
            }

            // 3. Close popups
            const popups = document.getElementsByClassName('maplibregl-popup');
            while (popups[0]) popups[0].remove();

            // 4. Trigger Real-Time Speed Upgrades on Ookla and H3 grids
            recalculateAIRecommendations();
        };

        // Interactive "Deploy 5G Tower Anywhere" Tool with Confirmation Dialog
        map.on('click', (e) => {
            if (!isDeployMode) return;

            const clickLngLat = e.lngLat;
            
            // Create modal overlay element
            const modalDiv = document.createElement('div');
            modalDiv.className = 'deploy-modal-overlay';
            modalDiv.innerHTML = `
                <div class="deploy-modal-card">
                    <div class="deploy-modal-title">📍 Deploy BuildSense 5G Cell</div>
                    <div style="font-size:11px; color:var(--text-secondary); text-align:center; margin-bottom:14px;">
                        Selected Location: ${clickLngLat.lat.toFixed(4)}, ${clickLngLat.lng.toFixed(4)}
                    </div>

                    <div class="modal-field">
                        <label>Cell Tower Name:</label>
                        <input type="text" id="modal-tower-name" value="BuildSense Cell #${towersGeoJSON.features.length + 1}">
                    </div>

                    <div class="modal-field">
                        <label>Operating Frequency Band:</label>
                        <select id="modal-tower-freq">
                            <option value="3500" selected>3.5 GHz (Mid-Band Standard 5G)</option>
                            <option value="700">700 MHz (Low-Band Long Range)</option>
                            <option value="28000">28 GHz (High-Capacity mmWave)</option>
                        </select>
                    </div>

                    <div class="modal-field">
                        <label>Transmitter Power (Tx Power):</label>
                        <select id="modal-tower-power">
                            <option value="40" selected>40W (Urban Micro Cell)</option>
                            <option value="10">10W (Smart Pole / Micro)</option>
                            <option value="100">100W (Macro Base Station)</option>
                        </select>
                    </div>

                    <div class="modal-actions">
                        <button id="modal-btn-cancel" class="btn-cancel-deploy">Cancel</button>
                        <button id="modal-btn-confirm" class="btn-confirm-deploy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Confirm & Deploy</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalDiv);

            // Handle Cancel
            document.getElementById('modal-btn-cancel').addEventListener('click', () => {
                modalDiv.remove();
                isDeployMode = false;
                document.getElementById('btn-deploy-tower').classList.remove('active');
                map.getCanvas().style.cursor = '';
            });

            // Handle Confirm Deploy
            document.getElementById('modal-btn-confirm').addEventListener('click', () => {
                const customName = document.getElementById('modal-tower-name').value || "BuildSense Custom 5G Cell";
                const customFreq = parseInt(document.getElementById('modal-tower-freq').value);
                const customPower = parseInt(document.getElementById('modal-tower-power').value);

                let mult = customFreq === 700 ? 1.8 : (customFreq === 28000 ? 0.35 : 1.0);
                if (simMimo === "64x64") mult *= 1.15;
                if (customPower === 100) mult *= 1.25;
                if (customPower === 10) mult *= 0.7;

                const towerId = `custom_tower_${Date.now()}`;
                const freqLabel = customFreq === 700 ? "700 MHz" : (customFreq === 28000 ? "28 GHz mmWave" : "3.5 GHz Sub-6");

                const newTower = {
                    "type": "Feature",
                    "id": towerId,
                    "geometry": { "type": "Point", "coordinates": [clickLngLat.lng, clickLngLat.lat] },
                    "properties": {
                        "id": towerId,
                        "name": customName,
                        "tower_type": customPower === 100 ? "Macro Tower" : (customPower === 10 ? "Smart Pole" : "Urban Micro Cell"),
                        "technology": `5G NR (${freqLabel})`,
                        "tx_power_w": customPower,
                        "antenna_height_m": 22.0,
                        "coverage_radius_m": 480,
                        "radius_multiplier": mult,
                        "is_user_deployed": true,
                        "status": "Deployed Active",
                        "connected_subscribers": 520
                    }
                };

                towersGeoJSON.features.push(newTower);
                if (map.getSource('cell-towers')) {
                    map.getSource('cell-towers').setData(towersGeoJSON);
                }

                modalDiv.remove();

                // Dynamically recalculate AI recommendations as dead zones shrink!
                recalculateAIRecommendations();

                new maplibregl.Popup()
                    .setLngLat(clickLngLat)
                    .setHTML(`
                        <div class="popup-title">🟡 5G Cell Deployed!</div>
                        <div style="font-size:12px; color:var(--neon-gold); margin-bottom:4px;"><b>${customName}</b></div>
                        <div class="popup-row"><span class="label">Frequency:</span> <span class="val">${freqLabel}</span></div>
                        <div class="popup-row"><span class="label">Tx Power:</span> <span class="val">${customPower} W</span></div>
                        <div class="popup-row"><span class="label">Effective Radius:</span> <span class="val">${Math.round(480 * mult)} m</span></div>
                    `)
                    .addTo(map);

                // Reset deploy mode
                isDeployMode = false;
                document.getElementById('btn-deploy-tower').classList.remove('active');
                map.getCanvas().style.cursor = '';
            });
        });

        // Floating Collapsible Sidebar Open/Close Listeners
        const sidebar = document.getElementById('sidebar');
        const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
        const btnCloseSidebar = document.getElementById('btn-close-sidebar');

        if (btnToggleSidebar && sidebar) {
            btnToggleSidebar.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        if (btnCloseSidebar && sidebar) {
            btnCloseSidebar.addEventListener('click', () => {
                sidebar.classList.add('collapsed');
            });
        }

        // Toggleable Legend Panel Button Listeners
        const btnToggleLegend = document.getElementById('btn-toggle-legend');
        const btnCloseLegend = document.getElementById('btn-close-legend');
        const legendPanel = document.getElementById('legend-panel');

        if (btnToggleLegend && legendPanel) {
            btnToggleLegend.addEventListener('click', () => {
                legendPanel.classList.toggle('active');
            });
        }

        if (btnCloseLegend && legendPanel) {
            btnCloseLegend.addEventListener('click', () => {
                legendPanel.classList.remove('active');
            });
        }

        // Cursors
        ['layer-buildings-3d', 'layer-towers', 'layer-proposed-5g'].forEach(layer => {
            map.on('mouseenter', layer, () => { if (!isDeployMode) map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', layer, () => { if (!isDeployMode) map.getCanvas().style.cursor = ''; });
        });
    }

    // Update Sidebar Inspector Card
    function updateInspector(data) {
        document.getElementById('insp-name').textContent = data.name;
        document.getElementById('insp-region').textContent = `Region: ${data.region}`;
        const badge = document.getElementById('insp-badge');
        badge.textContent = `${data.score} / 100`;
        badge.style.background = data.color;

        document.getElementById('insp-height').textContent = data.height;
        document.getElementById('insp-loss').textContent = data.loss;
        document.getElementById('insp-rsrp').textContent = data.rsrp;
        document.getElementById('insp-road').textContent = data.road;

        document.getElementById('insp-f-demand').textContent = data.demand_pts;
        document.getElementById('insp-f-height').textContent = data.height_pts;
        document.getElementById('insp-f-road').textContent = data.road_pts;
        document.getElementById('insp-f-hazard').textContent = data.hazard_pts;
    }

    // Town Switcher Navigation
    document.querySelectorAll('.town-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.town-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const town = btn.getAttribute('data-town');
            if (TOWN_COORDINATES[town]) {
                const target = TOWN_COORDINATES[town];
                map.flyTo({
                    center: target.center,
                    zoom: target.zoom,
                    pitch: target.pitch,
                    bearing: target.bearing,
                    speed: 1.2,
                    curve: 1.4
                });
            }
        });
    });

    // Frequency Selector (Towers keep their individual deployed frequency settings)
    document.querySelectorAll('.freq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            simFreq = parseInt(btn.getAttribute('data-freq'));
            
            // Recalculate AI recommendations and signal waves without changing existing deployed tower fixed properties
            recalculateAIRecommendations();
        });
    });

    // Simulation Controls Listeners (MIMO, Tx Power, Weather, etc.)
    const selAiSites = document.getElementById('sim-ai-sites');
    const aiSitesVal = document.getElementById('ai-sites-val');
    if (selAiSites) {
        selAiSites.addEventListener('input', (e) => {
            targetAiSites = parseInt(e.target.value);
            if (aiSitesVal) aiSitesVal.textContent = `${targetAiSites} Sites`;
            recalculateAIRecommendations();
        });
    }

    const selMimo = document.getElementById('sim-mimo');
    if (selMimo) selMimo.addEventListener('change', (e) => { simMimo = e.target.value; recalculateAIRecommendations(); });

    const selPower = document.getElementById('sim-power');
    if (selPower) selPower.addEventListener('change', (e) => { simPower = parseInt(e.target.value); recalculateAIRecommendations(); });

    const selBw = document.getElementById('sim-bw');
    if (selBw) selBw.addEventListener('change', (e) => { simBw = parseInt(e.target.value); recalculateAIRecommendations(); });

    const selWeather = document.getElementById('sim-weather');
    if (selWeather) selWeather.addEventListener('change', (e) => { simWeather = e.target.value; recalculateAIRecommendations(); });

    const selTerrain = document.getElementById('sim-terrain');
    if (selTerrain) selTerrain.addEventListener('change', (e) => { simTerrain = e.target.value; recalculateAIRecommendations(); });

    // Deploy 5G Tower Button Toggle
    const deployBtn = document.getElementById('btn-deploy-tower');
    if (deployBtn) {
        deployBtn.addEventListener('click', () => {
            isDeployMode = !isDeployMode;
            if (isDeployMode) {
                deployBtn.classList.add('active');
                map.getCanvas().style.cursor = 'crosshair';
                document.getElementById('hud-status').textContent = "📍 Click anywhere on 2D map to deploy a new BuildSense 5G Cell";
            } else {
                deployBtn.classList.remove('active');
                map.getCanvas().style.cursor = '';
                document.getElementById('hud-status').textContent = "BuildSense 2D Digital Twin & 5G Optimizer Active";
            }
        });
    }

    // 3D Camera Controls Sliders
    const pitchSlider = document.getElementById('pitch-slider');
    const pitchVal = document.getElementById('pitch-val');
    if (pitchSlider) {
        pitchSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            pitchVal.textContent = `${val}°`;
            map.setPitch(val);
        });
    }

    const bearingSlider = document.getElementById('bearing-slider');
    const bearingVal = document.getElementById('bearing-val');
    if (bearingSlider) {
        bearingSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            bearingVal.textContent = `${val}°`;
            map.setBearing(val);
        });
    }

    // Layer Toggles
    const toggleLayer = (elemId, layerId) => {
        const elem = document.getElementById(elemId);
        if (elem) {
            elem.addEventListener('change', (e) => {
                const visibility = e.target.checked ? 'visible' : 'none';
                if (map.getLayer(layerId)) {
                    map.setLayoutProperty(layerId, 'visibility', visibility);
                }
            });
        }
    };

    toggleLayer('toggle-buildings', 'layer-buildings-3d');
    toggleLayer('toggle-signal', 'layer-signal-wave');
    toggleLayer('toggle-ookla', 'layer-ookla');
    toggleLayer('toggle-h3', 'layer-h3-hexagons');
    toggleLayer('toggle-proposed', 'layer-proposed-5g');
    toggleLayer('toggle-towers', 'layer-towers');
});
