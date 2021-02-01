// deno run --allow-net --allow-env vice-info.js

import * as posix from "https://deno.land/std@0.83.0/path/posix.ts";

const SERVICE_URL = Deno.env.get("AE_BASE_URL") || "http://app-exposer";
const APPS_BASE_URL = Deno.env.get("APPS_BASE_URL") || "http://apps";
const LIST_RUNNING_URL = new URL("/vice/listing", SERVICE_URL).toString();

// Gets the full listing of analyses running in the cluster.
const getListing = () => fetch(LIST_RUNNING_URL).then((resp) => resp.json());

// Gets data including the analysis-id, which is needed for
// getting the current end date for analyses.
const getAsyncData = (externalID) => {
  const dataURL = new URL(
    `/vice/async-data?external-id=${externalID}`,
    SERVICE_URL
  );
  return fetch(dataURL).then((resp) => resp.json());
};

// Gets the end date from the app-exposer service and
// formats it in the ISO standard.
const getEndDate = async (analysisID, username) => {
  const endDateURL = new URL(
    `/vice/${analysisID}/time-limit?user=${username}`,
    SERVICE_URL
  );

  const dateResp = await fetch(endDateURL).then((resp) => resp.json());

  const endDate = new Date();

  var dateString;
  if (dateResp["time_limit"] && dateResp["time_limit"] !== "null") {
    const millisSinceEpoch = parseInt(dateResp["time_limit"], 10) * 1000 || 0;
    endDate.setTime(millisSinceEpoch);
    dateString = endDate.toISOString();
  } else {
    dateString = "";
  }

  return dateString;
};

const getAnalysisInfo = (externalID, username) => {
  const lookupURL = new URL(
    `/admin/analyses/by-external-id/${externalID}?user=${username}`,
    APPS_BASE_URL
  );

  return fetch(lookupURL)
    .then((resp) => resp.json())
    .then((data) => data.analyses)
    .then((analyses) => {
      if (analyses.length > 0) {
        return analyses[0];
      }
      return {};
    });
};

const saveAndExit = (analysisID) => {
  const exitURL = new URL(
    `/vice/admin/analyses/${analysisID}/save-and-exit`,
    SERVICE_URL
  );

  return fetch(exitURL, {
    method: "POST",
  });
};

// Actual logic after this point.

const listing = await getListing();

// Fill in the analysis-id and end date for each entry in the deployment listing.
const altered = await Promise.all(
  listing.deployments.map(async (deployment) => {
    const newData = await getAsyncData(deployment.externalID);
    const endDate = await getEndDate(newData.analysisID, deployment.username);
    const analysisInfo = await getAnalysisInfo(
      deployment.externalID,
      deployment.username
    );
    const newDeployment = {
      ...deployment,
      ...newData,
      ...analysisInfo,
      endDate: endDate,
    };
    return newDeployment;
  })
);

// Count the number of elements in the filled-out deployment listing where the
// end date is in the past.
var counter = 0;
altered.forEach(async (element) => {
  const endDateMillis = new Date(element.endDate).getTime();
  const nowMillis = new Date().getTime();

  if (
    nowMillis >= endDateMillis &&
    (element.status === "Completed" || element.status === "Canceled")
  ) {
    counter = counter + 1;
    //const exitResp = await saveAndExit(element.analysisID);
    console.log(
      `${element.username} ${element.analysisID}  ${element.endDate}  ${element.status}`
    );
  }
});

console.log(`Total: ${listing.deployments.length}`);
console.log(`Terminated: ${counter}`);

//console.log(JSON.stringify(altered, null, 4));
