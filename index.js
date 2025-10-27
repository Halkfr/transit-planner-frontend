const SERVER = "http://localhost:8000";

const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log({ latitude, longitude });
          resolve({ latitude, longitude });
        },
        (error) => {
          reject(new Error(error.message));
        }
      );
    } else {
      reject(new Error("Geolocation is not supported by your browser."));
    }
  });
};

const fetchNearestStop = async ({ latitude, longitude }) => {
  const { stop_name, stop_area } = await fetch(`${SERVER}/nearest-stop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ latitude, longitude }),
  })
    .then((response) => response.json())
    .then((data) => data[0]);
  return { stop_name, stop_area };
};

const fetchAllRegions = async () => {
  const response = await fetch(`${SERVER}/all-regions`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((response) =>
      response
        .map((el) => el.stop_area)
        .filter(Boolean)
        .sort()
    );
  return response;
};

const fetchRegionStops = async (region) => {
  console.log("region: ", region);
  const response = await fetch(`${SERVER}/region-stops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ region }),
  })
    .then((response) => response.json())
    .then((response) => response.map((el) => el.stop_name));

  return response;
};

window.onPageLoad = async () => {
  const response = {
    all_regions: null,
    nearest_stop_region: null,
    nearest_stop_name: null,
  };

  try {
    const all_regions = await fetchAllRegions();
    response.all_regions = all_regions;
  } catch {
    console.error(`Error getting all regions: ${error.message}`);
  }

  try {
    const { latitude, longitude } = await getUserLocation();
    const { stop_name, stop_area } = await fetchNearestStop({
      latitude,
      longitude,
    });
    response.nearest_stop_region = stop_area;
    response.nearest_stop_name = stop_name;
  } catch (error) {
    console.error(`Error getting user location: ${error.message}`);
  }

  return response;
};

const updateStops = async (region = null) => {
  let regionStops = [];

  if (region) {
    regionStops = await fetchRegionStops(region);
  }

  window.renderCombobox({
    container: window.stopRoot,
    list: regionStops,
  });
};

// Initialize function
const initApp = async () => {
  try {
    const { nearest_stop_name, nearest_stop_region, all_regions } =
      await window.onPageLoad();

    /* Creates ReactDom element if doesn't exist */
    if (!window.regionRoot) {
      const regionContainer = document.getElementById("region-combobox");
      window.regionRoot = ReactDOM.createRoot(regionContainer);
    }
    if (!window.stopRoot) {
      const stopContainer = document.getElementById("stop-combobox");
      window.stopRoot = ReactDOM.createRoot(stopContainer);
    }

    window.renderCombobox({
      container: window.regionRoot,
      list: all_regions,
      value: nearest_stop_region,
      onCallbackChange: (region) => updateStops(region),
    });
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
};

initApp();
