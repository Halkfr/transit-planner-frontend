const SERVER = "http://localhost:8000";

const initialState = {
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

const regionInputElem = document.getElementById("region-input");
const stopInputElem = document.getElementById("stop-input");
const regionListElem = document.getElementById("regions-list");
const stopListElem = document.getElementById("stops-list");
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

  console.log(response);
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

/* Actions */
const onRegionSelect = async () => {
  const currentRegionName = regionInputElem.value;

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
  const currentRegionName = regionInputElem.value;
  const currentBusStopName = stopInputElem.value;
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
  currentState.resultBusStopName = stopInputElem.value;
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

const onClear = () => {
  stopInputElem.value = "";
  regionInputElem.value = "";

  const regionList = currentState.regionList;
  currentState = structuredClone(initialState);
  currentState.regionList = regionList;

  renderUI();
};

const onPageLoad = async () => {
  regionInputElem.value = "";
  stopInputElem.disabled = true;
  stopInputElem.value = "";

  let userLocation;
  try {
    currentState.regionList = await fetchAllRegions();
  } catch {
    console.error(`Error getting all regions: ${error.message}`);
  }

  try {
    userLocation = await getUserLocation();
  } catch (error) {
    console.error(`Error getting user location: ${error.message}`);
  }

  try {
    const { stop_area, stop_name, stop_code } = await fetchNearestStop(
      userLocation
    );
    currentState.busStopList = await fetchRegionStops(stop_area);

    regionInputElem.value = stop_area;
    stopInputElem.disabled = false;
    stopInputElem.value = formatStopName(stop_name, stop_code);
  } catch (error) {
    console.error(`Error getting user region, nearest stop and region stops`);
  }

  onBusStopSelect();
};

const onRegionInput = () => {
  currentState.busStopList = [];

  stopInputElem.value = "";
  stopInputElem.disabled = true;
};

/* Render whole page state on demand */
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
  regionListElem.innerHTML = "";
  stopListElem.innerHTML = "";
  busListTitleElem.innerHTML = "";
  busListElem.innerHTML = "";
  scheduleListElem.innerHTML = "";

  const currentRegionName = regionInputElem.value;

  /* Is second input disabled */
  if (!regionList || !regionList.some((el) => el === currentRegionName)) {
    stopInputElem.disabled = true;
  } else if (busStopList.length) {
    stopInputElem.disabled = false;
  }

  /* Hints for regions */
  regionList.forEach((element) => {
    const newOption = document.createElement("option");
    newOption.innerText = element;
    regionListElem.appendChild(newOption);
  });

  /* Hints for stops */
  busStopList.forEach((element) => {
    const newOption = document.createElement("option");
    newOption.innerText = element.stop_name;
    newOption.id = element.stop_id;
    stopListElem.appendChild(newOption);
  });

  /* Bus list result */
  if (resultBusList.length) {
    busListTitleElem.innerText = `Results for: ${resultRegionName}, ${resultBusStopName}`;

    resultBusList.forEach((busObject) => {
      console.log(resultBusList);
      const newOption = document.createElement("button");

      newOption.innerText = busObject.route_short_name;

      newOption.addEventListener("click", async () => onBusSelect(busObject));

      busListElem.appendChild(newOption);
    });
  } else if (currentState.isBusSearchPerformed) {
    busListTitleElem.innerText = `No busses available for bus stop ${stopInputElem.value}`;
  }

  /* Schedule list */
  if (resultScheduleList.length) {
    resultScheduleList.forEach((time) => {
      const newOption = document.createElement("label");
      newOption.innerText = time;
      scheduleListElem.appendChild(newOption);
    });
  } else if (currentState.isScheduleSearchPerformed) {
    scheduleListElem.innerHTML = `Schedule not available for bus ${currentState.resultBusName}`;
  }
};

const initApp = async () => {
  try {
    await onPageLoad();

    renderUI();
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
};

initApp();
