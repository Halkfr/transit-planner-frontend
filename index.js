const SERVER = "http://localhost:8000";

const initialState = {
  isAppInit: false,
  selectedStopId: "",

  regionList: [],
  busStopList: [],

  /* Hold result values, so that on renderUI old result doesn't dissapear */
  resultRegionName: "",
  resultBusStopName: "",
  resultBusName: "",
  resultBusList: [],
  resultScheduleList: [],

  isBusSearchPerformed: false,
  isScheduleSearchPerformed: false,
};

let currentState = structuredClone(initialState);

const regionSelectElem = new TomSelect("#region-select", {
  maxItems: 1,
  plugins: ["clear_button", "dropdown_input"],
  persist: false,
});

const stopSelectElem = new TomSelect("#stop-select", {
  maxItems: 1,
  plugins: ["clear_button", "dropdown_input"],
  persist: false,
});

const busListTitleElem = document.getElementById("bus-list-title");
const busListElem = document.getElementById("bus-list");
const scheduleListElem = document.getElementById("schedule-list");

/* Fetch */
const fetchNearestStop = async ({ latitude, longitude }) => {
  const response = await fetch(`${SERVER}/nearest-stop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ latitude, longitude }),
  })
    .then((response) => response.json())
    .then((data) => data[0]);

  return response;
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
        stop_code: el.stop_code,
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
    .then((response) =>
      response.map((el) => {
        return { stopId: stopId, route_short_name: el.route_short_name };
      })
    );

  return response;
};

const fetchSchedule = async (busObject) => {
  const response = await fetch(`${SERVER}/get-schedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      busNumber: busObject.route_short_name,
      stopId: busObject.stopId,
    }),
  })
    .then((response) => response.json())
    .then((response) => response.map((el) => el.normalized_arrival_time));

  return response;
};

/* Utils */
const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
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

const getSelectedStop = (busStopList, currentBusStopName) => {
  if (!busStopList.length) return;

  const selectedStop = currentState.busStopList.find(
    (el) => el.stop_name === currentBusStopName
  );

  return selectedStop;
};

const formatStopName = (stop_name, stop_code) => {
  return stop_code ? `${stop_name}, ${stop_code}` : stop_name;
};

const emptyStopSelect = () => {
  stopSelectElem.clear();
  stopSelectElem.clearOptions();
  stopSelectElem.disable();
};

/* Actions */
const onRegionSelect = async () => {
  const currentRegionName = regionSelectElem.items[0];

  emptyStopSelect();

  if (!currentRegionName) return;

  if (!currentState.regionList.some((el) => el === currentRegionName)) {
    alert("Select region from region list to proceed");
    return;
  }

  currentState.isBusSearchPerformed = false;

  try {
    currentState.busStopList = await fetchRegionStops(currentRegionName);
  } catch (error) {
    alert(error);
  }

  renderUI();
};

const onBusStopSelect = async () => {
  const currentRegionName = regionSelectElem.items[0];
  const currentBusStopName = stopSelectElem.items[0];

  if (!currentRegionName || !currentBusStopName) return;

  if (
    !currentState.busStopList.some((el) => el.stop_name === currentBusStopName)
  ) {
    alert("Select bus stop from region list to proceed");
    return;
  }

  const selectedStop = getSelectedStop(
    currentState.busStopList,
    currentBusStopName
  );

  try {
    currentState.resultBusList = await fetchBusListByStopId(
      Number(selectedStop.stop_id)
    );
  } catch (error) {
    alert(error);
  }

  currentState.resultRegionName = currentRegionName;
  currentState.resultBusStopName = stopSelectElem.getValue();
  currentState.resultScheduleList = [];
  currentState.resultBusName = "";
  currentState.isBusSearchPerformed = true;
  currentState.isScheduleSearchPerformed = false;

  renderUI();
};

const onBusSelect = async (busObject) => {
  currentState.resultBusName = busObject.route_short_name;
  currentState.isScheduleSearchPerformed = true;

  try {
    currentState.resultScheduleList = await fetchSchedule(busObject);
  } catch (error) {
    alert(error);
  }

  renderUI();
};

/* Clear inputs and revert app state */
const onClear = () => {
  regionSelectElem.clear();

  currentState = structuredClone({
    ...initialState,
    regionList: currentState.regionList,
    isAppInit: true,
  });

  renderUI();
};

const onPageLoad = async () => {
  let userLocation;
  let userStop;

  /* Event listeners */
  regionSelectElem.on("change", () => {
    if (!currentState.isAppInit) return;
    onRegionSelect();
  });
  stopSelectElem.on("change", () => {
    if (!currentState.isAppInit) return;
    onBusStopSelect();
  });
  stopSelectElem.disable();

  /* Get region list */
  try {
    currentState.regionList = await fetchAllRegions();

    /* add region list to select */
    currentState.regionList.forEach((regionName) => {
      regionSelectElem.addOption({ value: regionName, text: regionName });
    });
  } catch {
    console.error(`Error getting all regions: ${error.message}`);
  }

  /* Optional: Get user location */
  try {
    userLocation = await getUserLocation();
  } catch (error) {
    /* Return if error or location prompt denied, not error */
    console.log(error.message);
    return;
  }

  /* Get user stop data */
  try {
    userStop = await fetchNearestStop(userLocation);
  } catch (error) {
    console.error(`Error getting user nearest stop data`);
  }

  /* Get stops list for user region */
  try {
    currentState.busStopList = await fetchRegionStops(userStop.stop_area);

    /* add stop list to select */
    currentState.busStopList.forEach((el) => {
      stopSelectElem.addOption({ value: el.stop_name, text: el.stop_name });
    });

    stopSelectElem.refreshOptions(false);
  } catch (error) {
    console.error(`Error getting stops for current region`);
  }

  /* Set initial value if user accepted location prompt  */
  regionSelectElem.setValue(userStop.stop_area);
  stopSelectElem.setValue(
    formatStopName(userStop.stop_name, userStop.stop_code)
  );
  stopSelectElem.enable();

  /* Handle stop selection */
  onBusStopSelect();
};

/* Render page state on demand */
const renderUI = () => {
  const {
    regionList,
    busStopList,
    resultRegionName,
    resultBusStopName,
    resultBusList,
    resultScheduleList,
  } = currentState;

  /* Primitive clear all elements and update all (costly in performance, but browser optimizes it) */
  busListTitleElem.innerHTML = "";
  busListElem.innerHTML = "";
  scheduleListElem.innerHTML = "";

  const currentRegionName = regionSelectElem.getValue();

  /* Is second input disabled */
  if (!regionList || !regionList.some((el) => el === currentRegionName)) {
    stopSelectElem.disable();
  } else if (busStopList.length) {
    stopSelectElem.enable();
  }

  /* Hints for regions */
  regionList.forEach((element) => {
    const newOption = document.createElement("option");
    newOption.innerText = element;
    regionSelectElem.addOption(newOption);
  });

  /* Hints for stops */
  busStopList.forEach((element) => {
    const newOption = document.createElement("option");
    newOption.innerText = element.stop_name;
    newOption.id = element.stop_id;
    stopSelectElem.addOption(newOption);
  });

  /* Bus list result */
  if (resultBusList.length) {
    busListTitleElem.innerText = `Results for: ${resultRegionName}, ${resultBusStopName}`;

    resultBusList.forEach((busObject) => {
      console.log(resultBusList);
      const newOption = document.createElement("button");

      newOption.innerText = busObject.route_short_name;
      newOption.addEventListener("click", async () => onBusSelect(busObject));

      if (currentState.resultBusName == busObject.route_short_name) {
        newOption.className =
          "px-2 py-2 rounded-lg bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-300 transition-all cursor-pointer text-center";
      } else {
        newOption.className =
          "px-2 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer text-center shadow-sm";
      }
      busListElem.appendChild(newOption);
    });
  } else if (currentState.isBusSearchPerformed) {
    busListTitleElem.innerText = `No busses available for bus stop ${stopSelectElem.getValue()}`;
  }
  resultScheduleList.length
    ? document
        .querySelector("#schedule-list-container")
        .classList.remove("hidden")
    : document
        .querySelector("#schedule-list-container")
        .classList.add("hidden");

  /* Schedule list */
  if (resultScheduleList.length) {
    resultScheduleList.forEach((time) => {
      const newOption = document.createElement("li");
      newOption.className =
        "px-5 py-3 flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl";

      newOption.innerHTML = `
  <div class="flex items-center gap-3">
    <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
    <span class="font-medium">${time}</span>
  </div>`;
      scheduleListElem.appendChild(newOption);
    });
  } else if (currentState.isScheduleSearchPerformed) {
    scheduleListElem.innerHTML = `
    <li class="px-6 py-12 flex flex-col items-center justify-center text-center">
      <div class="bg-gray-100 p-3 rounded-full mb-3">
        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <p class="text-gray-900 font-semibold">No departures found</p>
      <p class="text-sm text-gray-500 mt-1">
        Schedule not available for bus <span class="font-bold text-gray-700">${currentState.resultBusName}</span>
      </p>
    </li>`;

    document
      .querySelector("#schedule-list-container")
      .classList.remove("hidden");
  }
};

const initApp = async () => {
  try {
    await onPageLoad();

    /* Set app initialized */
    currentState.isAppInit = true;
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
};

initApp();
