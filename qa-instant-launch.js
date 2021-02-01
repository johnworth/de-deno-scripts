// deno run --allow-net --allow-env qa-instant-launch.js

const APP_EXPOSER_URL = Deno.env.get("APP_EXPOSER_URL") || "http://app-exposer";
const APPS_URL = Deno.env.get("APPS_URL") || "http://apps";
const ANALYSES_URL = Deno.env.get("ANALYSES_URL") || "http://analyses";
const USERNAME = Deno.env.get("USERNAME");
const USERNAME_SUFFIX =
  Deno.env.get("USERNAME_SUFFIX") || "@iplantcollaborative.org";

const quickLaunch = {
  name: "instant-launch-test",
  description: "",
  creator: "wregglej@iplantcollaborative.org",
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

const addQuickLaunch = async (quicklaunch) => {
  const addQuickLaunch = new URL(
    `/quicklaunches?user=${fixedUser(USERNAME)}`,
    ANALYSES_URL
  );

  const qlData = await fetch(addQuickLaunch, {
    method: "POST",
    body: JSON.stringify(quicklaunch),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());

  return { ...quicklaunch, id: qlData.id };
};

const setQLGlobalDefault = async (quicklaunch) => {
  const addGlobalDefaultURL = new URL(
    `/quicklaunch/defaults/global?user=${fixedUser(USERNAME)}`,
    ANALYSES_URL
  );

  const bodyObject = {
    app_id: quicklaunch.app_id,
    quick_launch_id: quicklaunch.id,
  };

  return fetch(addGlobalDefaultURL, {
    method: "POST",
    body: JSON.stringify(bodyObject),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());
};

const addInstantLaunch = async (quicklaunch) => {
  const addInstantLaunch = new URL(`/instantlaunches/`, APP_EXPOSER_URL);

  const bodyObj = {
    quick_launch_id: quicklaunch.id,
    added_by: fixedUser(USERNAME),
  };

  return await fetch(addInstantLaunch, {
    method: "PUT",
    body: JSON.stringify(bodyObj),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());
};

const setInstantLaunchMapping = async (instantlaunch) => {
  const newILMappingURL = new URL(
    `/instantlaunches/mappings/defaults/latest?username=${fixedUser(USERNAME)}`,
    APP_EXPOSER_URL
  );

  const bodyObj = {
    PythonFiles: {
      kind: "infoType",
      pattern: "python",
      compatible: [],
      default: instantlaunch,
    },
  };

  return await fetch(newILMappingURL, {
    method: "PUT",
    body: JSON.stringify(bodyObj),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());
};

const main = async () => {
  try {
    const ql = await addQuickLaunch(quickLaunch);
    console.log(`added quick launch id: ${ql.id}`);

    // const globalDefault = await setQLGlobalDefault(ql);
    // console.log(`global default id: ${globalDefault.id}`);

    const instantLaunch = await addInstantLaunch(ql);
    console.log(`instant launch id: ${instantLaunch.id}`);

    const ilMapping = await setInstantLaunchMapping(instantLaunch);
    console.log(JSON.stringify(ilMapping, null, 2));
  } catch (e) {
    console.error(e);
  }
};

if (USERNAME === "" || !USERNAME) {
  console.log("USERNAME env var must be set.");
} else {
  main();
}
