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
  const { stop_id, stop_name, stop_area, stop_code } = await fetch(
    `${SERVER}/nearest-stop`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude, longitude }),
    }
  )
    .then((response) => response.json())
    .then((data) => data[0]);
  return {
    stop_id,
    stop_name: formatStopName(stop_name, stop_code),
    stop_area,
  };
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
  const response = await fetch(`${SERVER}/region-stops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ region }),
  })
    .then((response) => response.json())
    .then((response) =>
      response.map((el) => ({
        stop_name: formatStopName(el.stop_name, el.stop_code),
        stop_id: el.stop_id,
      }))
    );

  return response;
};

const fetchBusListByStopId = async (stopId) => {
  const response = await fetch(`${SERVER}/get-stop-busses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stopId }),
  })
    .then((response) => response.json())
    .then((response) => response.map((el) => el.route_short_name));

  return response;
};

const fetchSchedule = async (busNumber, stopId) => {
  const response = await fetch(`${SERVER}/get-schedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ busNumber, stopId }),
  })
    .then((response) => response.json())
    .then((response) => response.map((el) => el.normalized_arrival_time));

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

const regionInput = document.getElementById("region-input");
const stopInput = document.getElementById("stop-input");
const regionsList = document.getElementById("regions-list");
const stopsList = document.getElementById("stops-list");
const busList = document.getElementById("bus-list");
const schedule = document.getElementById("schedule");

const formatStopName = (stop_name, stop_code) => {
  return stop_code ? `${stop_name}, ${stop_code}` : stop_name;
};

const clearInputs = () => {
  regionInput.value = "";
  clearStops();
};

const clearStops = () => {
  stopInput.value = "";
  stopsList.innerHTML = "";
  stopInput.disabled = true;
  clearBusList();
  clearSchedule();
};

const clearBusList = () => {
  busList.innerHTML = "";
};

const clearSchedule = () => {
  schedule.innerHTML = "";
};

const updateStops = async (arr) => {
  const region = regionInput.value;
  if (arr && arr.find((el) => el === region)) {
    regionStops = await fetchRegionStops(region);

    regionStops.forEach((element) => {
      const newOption = document.createElement("option");
      newOption.innerText = element.stop_name;
      newOption.id = element.stop_id;
      stopsList.appendChild(newOption);
    });

    stopInput.disabled = false;
  } else {
    clearStops();
  }
};

const updateBusList = async () => {
  const stop = stopInput.value;
  const selectedStop = regionStops.find((el) => el.stop_name === stop);
  if (regionStops && selectedStop) {
    const busArr = await fetchBusListByStopId(selectedStop.stop_id);
    busArr.forEach((busNumber) => {
      const newOption = document.createElement("button");
      newOption.innerText = busNumber;

      newOption.addEventListener("click", async () =>
        updateSchedule(busNumber, selectedStop.stop_id)
      );

      busList.appendChild(newOption);
    });
  } else {
    clearBusList();
    clearSchedule();
  }
};

const updateSchedule = async (busNumber, stopId) => {
  clearSchedule();

  const scheduleList = await fetchSchedule(busNumber, stopId);

  scheduleList.forEach((time) => {
    const newOption = document.createElement("label");
    newOption.innerText = time;
    schedule.appendChild(newOption);
  });
};

const setNearestStation = (nearest_stop_region, nearest_stop_name) => {
  stopInput.disabled = false;
  regionInput.value = nearest_stop_region;
  stopInput.value = nearest_stop_name;
};

// Initialize function
const initApp = async () => {
  try {
    const { nearest_stop_name, nearest_stop_region, all_regions } =
      await window.onPageLoad();

    all_regions.forEach((element) => {
      const newOption = document.createElement("option");
      newOption.innerText = element;
      regionsList.appendChild(newOption);
    });

    /* Put nearest stop initial values in inputs */
    if (nearest_stop_name && nearest_stop_region) {
      setNearestStation(nearest_stop_region, nearest_stop_name);
      updateStops(all_regions);
    }

    /* Init event listeners */
    regionInput.addEventListener("input", () => updateStops(all_regions));
    stopInput.addEventListener("input", () => updateBusList());
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
};

initApp();
