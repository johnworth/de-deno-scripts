// deno run --allow-net --allow-env qa-instant-launch.js

import { encode } from "https://deno.land/std@0.88.0/encoding/base64.ts";

const TERRAIN_URL = Deno.env.get("TERRAIN_URL") || "http://qa.cyverse.org";

const USERNAME = Deno.env.get("USERNAME");
const PASSWORD = Deno.env.get("PASSWORD");
const USERNAME_SUFFIX =
  Deno.env.get("USERNAME_SUFFIX") || "@iplantcollaborative.org";

const quickLaunch = {
  name: "instant-launch-test",
  description: "",
  app_id: "d61d9a26-e921-11e9-8fe0-008cfa5ae621",
  is_public: true,
  submission: {
    config: {
      "d61e56f0-e921-11e9-8fe0-008cfa5ae621_d62788d8-e921-11e9-8fe0-008cfa5ae621": [],
    },
    name: "jupyter-lab-instant-launch",
    app_id: "d61d9a26-e921-11e9-8fe0-008cfa5ae621",
    system_id: "de",
    debug: false,
    output_dir: "/iplant/home/wregglej/analyses_qa",
    notify: true,
  },
};

const fixedUser = (username) => {
  if (username.endsWith(USERNAME_SUFFIX)) {
    return username;
  }
  return `${username}${USERNAME_SUFFIX}`;
};

let accessToken;

const getToken = async () => {
  const tokenURL = new URL(`/terrain/token`, TERRAIN_URL);
  const headers = new Headers();
  headers.set("Authorization", "Basic " + encode(`${USERNAME}:${PASSWORD}`));

  return await fetch(tokenURL, {
    headers: headers,
  })
    .then((resp) => resp.json())
    .then((data) => {
      accessToken = data.access_token;
      return accessToken;
    });
};

const bearer = async () => {
  if (!accessToken) {
    await getToken();
  }

  return { Authorization: `Bearer ${accessToken}` };
};

const addQuickLaunch = async (quicklaunch) => {
  const addQuickLaunch = new URL(`/terrain/quicklaunches`, TERRAIN_URL);

  const authMap = await bearer();

  const qlData = await fetch(addQuickLaunch, {
    method: "POST",
    body: JSON.stringify(quicklaunch),
    headers: {
      ...authMap,
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());
  return { ...quicklaunch, id: qlData.id };
};

const setQLGlobalDefault = async (quicklaunch) => {
  const addGlobalDefaultURL = new URL(
    `/terrain/quicklaunches/defaults/global`,
    TERRAIN_URL
  );

  const bodyObject = {
    app_id: quicklaunch.app_id,
    quick_launch_id: quicklaunch.id,
  };

  const authMap = await bearer();

  return fetch(addGlobalDefaultURL, {
    method: "POST",
    body: JSON.stringify(bodyObject),
    headers: {
      ...authMap,
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());
};

const addInstantLaunch = async (quicklaunch) => {
  const addInstantLaunch = new URL(
    `/terrain/admin/instant-launches`,
    TERRAIN_URL
  );

  const bodyObj = {
    quick_launch_id: quicklaunch.id,
    added_by: fixedUser(USERNAME),
  };

  const authMap = await bearer();

  return await fetch(addInstantLaunch, {
    method: "PUT",
    body: JSON.stringify(bodyObj),
    headers: {
      ...authMap,
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());
};

const setInstantLaunchMapping = async (instantlaunch) => {
  const newILMappingURL = new URL(
    `/terrain/admin/instant-launches/mappings/defaults/latest`,
    TERRAIN_URL
  );

  const bodyObj = {
    PythonFiles: {
      kind: "infoType",
      pattern: "python",
      compatible: [],
      default: instantlaunch,
    },
  };

  const authMap = await bearer();

  return await fetch(newILMappingURL, {
    method: "PUT",
    body: JSON.stringify(bodyObj),
    headers: {
      ...authMap,
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());
};

const setDashboardMetadata = async (instantlaunch) => {
  const metadataURL = new URL(
    `/terrain/admin/instant-launches/${instantlaunch.id}/metadata`,
    TERRAIN_URL
  );

  const bodyObj = {
    avus: [
      {
        attr: "ui_location",
        value: "dashboard",
        unit: "",
      },
    ],
  };

  const authMap = await bearer();

  return await fetch(metadataURL, {
    method: "POST",
    body: JSON.stringify(bodyObj),
    headers: {
      ...authMap,
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());
};

const main = async () => {
  try {
    await getToken();

    const ql = await addQuickLaunch(quickLaunch);
    console.log(`added quick launch id: ${ql.id}`);

    const globalDefault = await setQLGlobalDefault(ql);
    console.log(`global default id: ${globalDefault.id}`);

    const instantLaunch = await addInstantLaunch(ql);
    console.log(`instant launch id: ${instantLaunch.id}`);

    const ilMapping = await setInstantLaunchMapping(instantLaunch);
    console.log(JSON.stringify(ilMapping, null, 2));

    const metadata = await setDashboardMetadata(instantLaunch);
    console.log(JSON.stringify(metadata, null, 2));
  } catch (e) {
    console.error(e);
  }
};

if (USERNAME === "" || !USERNAME) {
  console.log("USERNAME env var must be set.");
} else {
  main();
}

// console.log(JSON.stringify(quickLaunch, null, 2));
