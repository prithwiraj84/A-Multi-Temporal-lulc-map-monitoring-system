/*
  Quickstart config for local testing.
  Replace all placeholder values with your own Earth Engine assets and OAuth client id.
*/
window.EE_APP_CONFIG = {
  clientId: "your-client-ID",
  authScopes: ["https://www.googleapis.com/auth/earthengine"],
  eeProjectId: "your-projectID",
  fallbackEeProjectId: "your-fallbackID",

  mapStart: {
    lat: 22.5726,
    lng: 88.3639,
    zoom: 10
  },

  yearList: [1995, 2000, 2005, 2010, 2015, 2020, 2023, 2025],
  scale: 30,
  referenceYear: 2023,

  classes: [
    { id: 1, name: "Vegetation", color: "#0db21f" },
    { id: 2, name: "Water", color: "#1cece0" },
    { id: 3, name: "Urban Area", color: "#ff0000" },
    { id: 4, name: "Cultivation", color: "#00ff00" },
    { id: 5, name: "Sand", color: "#f0f015" },
    { id: 6, name: "Bare", color: "#979a5d" }
  ],

  assets: {
    aoi: "projects/your-GEE-ID/assets/aoi"
  },

  trainingAssetsByClass: {
    1: "projects/your-GEE-ID/assets/vegetations",
    2: "projects/your-GEE-ID/assets/water",
    3: "projects/your-GEE-IDassets/Urban_area",
    4: "projects/your-GEE-ID/assets/cultivations",
    5: "projects/your-GEE-ID/assets/sand",
    6: "projects/your-GEE-ID/assets/bare"
  }
};
