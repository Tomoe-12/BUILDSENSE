# 🛰️ BUILDSENSE — AI-Powered 5G Small Cell & 3D Digital Twin Optimizer

> **ASEAN GeoAI Fusion 2026 Competition Entry**  
> **Developed by:** Team Triad  
> **Project Name:** BUILDSENSE  
> **Live Demo:** [Deploy on Vercel](https://buildsense-5g.vercel.app) | **Colab Notebook:** [`GeoTelecom_3D_Colab.ipynb`](./GeoTelecom_3D_Colab.ipynb) 

---

## 📌 Executive Summary

**BUILDSENSE** is an AI-powered 3D Digital Twin and 5G Radio Network Optimizer engineered by **Team Triad** for the **ASEAN GeoAI Fusion 2026** competition.

Deploying 5G networks in mountainous, high-altitude regions like **Southern Shan State, Myanmar (Taunggyi, Hopong, Nyaungshwe, and Inle Lake Basin)** presents complex radio propagation challenges:
- **Mountain Ridge Diffraction (ITU-R P.526):** Ridge blockage across Shan mountain corridors.
- **Monsoon Rain Attenuation:** Heavy rainfall signal loss (-3.5 dB/km).
- **Indoor Building Penetration Loss (ITU-R P.2109):** High signal attenuation through thick concrete structures.

**BUILDSENSE** solves this by uniting **SciKit-Learn K-Means Spatial Clustering**, **3D WebGL Digital Twin Rendering**, **Ookla Mobile Speed Grids**, **Uber H3 Hexagon Analytics**, and **Google Earth Engine Satellite Remote Sensing** into a real-time interactive signal optimizer.

---

## ✨ Key Technical Features

### 1. 🏢 3D Building Digital Twin & Suitability Scoring
- Renders **1,350+ 3D OpenStreetMap Building Extrusions** across Taunggyi, Hopong, Nyaungshwe, and Inle Lake.
- Calculates dynamic **Building Suitability Scores (0–100)** evaluating floor height, population density, indoor wall attenuation, and existing tower line-of-sight.

### 2. 📡 Real-Time 5G Radio Simulation Controls
- **5G Spectrum Selection:** 700 MHz Low-Band, 3.5 GHz Mid-Band (n78), and 28 GHz mmWave.
- **Massive MIMO Beamforming:** Toggle between 64x64 Massive MIMO (+10 dBm gain) and 4x4 Standard MIMO.
- **Transmitter Power:** Tune from 10W (Micro Small Cell) to 100W (High-Power Macro Mast).
- **Environmental Models:** Simulates Monsoon Rain Loss and ITU-R P.526 Mountain Ridge Diffraction in real time.

### 3. 🟢 AI K-Means Site Density Slider (8 to 40 Sites)
- Uses **SciKit-Learn K-Means Clustering** to auto-identify optimal 5G Small Cell deployment locations for uncovered dead-zone structures.
- Users can dynamically adjust target density from **8 to 40 small cell sites** with real-time map updates.

### 4. ⚡ Speed Grid & Spatial Hexagon Analytics
- **5,427 Ookla Speed Grid Tiles:** Maps real-world 4G/5G download speeds (>120 Mbps to <20 Mbps).
- **993 Uber H3 Hexagons:** Evaluates spatial subscriber density and network load distribution.

### 5. 🛰️ Google Earth Engine (GEE) Remote Sensing Module
- Standalone Notebook (`BuildSense_Google_Earth_Engine.ipynb`) leveraging Google Earth Engine API:
  - **Sentinel-2 Surface Reflectance:** NDVI Vegetation Index & Urban Footprints.
  - **Dynamic World LULC:** Land Use / Land Cover Classification.
  - **SRTM DEM 30m:** Elevation & Slope Profile Analysis for Shan Ridges.

---

## 📊 Data Sources & Attribution

**BUILDSENSE** integrates authoritative open-source geospatial datasets and international telecom standards:

| Dataset / Standard | Source & Provider | Usage in BUILDSENSE |
| :--- | :--- | :--- |
| **3D Buildings Footprints** | [OpenStreetMap (OSM)](https://www.openstreetmap.org) | 3D Building Heights, Floor Counts, Structure Suitability |
| **Mobile Performance Grid** | [Ookla Open Data](https://registry.opendata.aws/ookla-open-data/) | 5,427 Speed Tiles (4G/5G RSRP & Speed Measurements) |
| **Spatial Discrete Grid** | [Uber H3 System](https://h3geo.org/) | 993 Resolution 8/9 Spatial Hexagons for Load Analytics |
| **Multispectral Satellite** | [Copernicus Sentinel-2 (ESA)](https://sentinels.copernicus.eu/) | Sentinel-2 SR Harmonized Imagery via GEE Catalog |
| **Land Cover Classification** | [Google Dynamic World](https://dynamicworld.app/) | 10m Near-Real-Time LULC via Google Earth Engine API |
| **Digital Elevation Model** | [NASA / USGS SRTM](https://lpdaac.usgs.gov/products/srtmgl1v003/) | 30m Digital Elevation Model (SRTMGL1) for Ridge Profiles |
| **Indoor Loss Model** | [ITU-R P.2109 Recommendation](https://www.itu.int/rec/R-REC-P.2109) | Building Entry Loss Attenuation Formula |
| **Diffraction Model** | [ITU-R P.526 Recommendation](https://www.itu.int/rec/R-REC-P.526) | Propagation by Diffraction over Shan Mountain Ridges |

---

## 🛠️ Technology Stack

- **Frontend & WebGL 3D Engine:** MapLibre GL JS, HTML5, Vanilla CSS3 (iOS Light Design System).
- **AI & Analytics:** SciKit-Learn (K-Means Clustering), Python 3.10+, Google Earth Engine API (`geemap`, `earthengine-api`).
- **Data Engineering:** GeoJSON, Turf.js, H3-JS Spatial Indexing.
- **Deployment & Hosting:** Vercel Static Hosting (100% Zero-Serverless Client Architecture).

---

## 🚀 Quick Start Guide

### Option 1: 1-Click Launch on Google Colab (Recommended)
1. Open [`GeoTelecom_3D_Colab.ipynb`](./GeoTelecom_3D_Colab.ipynb) in Google Colab.
2. Run all code cells (`Ctrl + F9`).
3. Step 7 automatically launches the interactive 3D WebGL Dashboard directly inside Colab!

### Option 2: Run Locally on Laptop (Offline Mode)
1. Clone the repository:
   ```bash
   git clone https://github.com/Team-Triad/BUILDSENSE.cmd
   cd BUILDSENSE
   ```
2. Start local HTTP server:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your web browser.

### Option 3: Deploy to Vercel
1. Push code to GitHub repository.
2. Import project into Vercel.
3. Vercel automatically deploys static assets with zero configuration needed.

---

## 📁 Repository Structure

```
BUILDSENSE/
├── index.html                           # Main 3D WebGL Application Entry
├── style.css                            # iOS Light Design System Stylesheet
├── app.js                               # Core WebGL Logic, AI K-Means & Radio Propagator
├── data/
│   └── telecom_data_bundle.js           # 1,350+ Buildings, 108 Towers, 5,427 Ookla Tiles & H3
├── GeoTelecom_3D_Colab.ipynb            # Google Colab 1-Click Notebook
├── BuildSense_Google_Earth_Engine.ipynb # GEE Cloud Satellite Remote Sensing Notebook
├── generate_colab_notebook.py           # Notebook Compiler Script
├── vercel.json                          # Vercel Cache & Asset Router Config
└── README.md                            # Project Documentation & Architecture
```

---

## 👥 Team Triad Roster & Roles

- **Team Name:** Team Triad
- **Competition:** ASEAN GeoAI Fusion 2026

| Team Member Name | Role & Responsibility | Contact / GitHub |
| :--- | :--- | :--- |
| **Khun Thi Han** | Lead GeoAI Engineer & 3D WebGL Developer | [@KhunThiHan](https://github.com/Tomoe-12) |
| **La Pyae Aung** | Data Engineer & Geospatial Analyst | [GitHub Profile](#) |
| **Su Hlaing Thin** | Telecom Radio Propagation Specialist | [GitHub Profile](#) |


```
---

## 📜 License

This project is open-source software licensed under the [MIT License](LICENSE).

