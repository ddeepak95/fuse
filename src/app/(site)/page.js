"use client";
import { useEffect, useState } from "react";

import InputForm from "./components/InputForm";
import Loader from "./components/components/Loader";
import LogRocket from "logrocket";
LogRocket.init("6tg6cc/fuse");

export default function Home() {
  const accessCodes = { control: "zxcvb", treatment: "lkjhg" };
  const [windowLoaded, setWindowLoaded] = useState(false);
  const [uid, setUid] = useState();
  const [accessId, setAccessId] = useState();
  let queryParameters = null;
  const [linkValidity, setLinkValidity] = useState();
  useEffect(() => {
    queryParameters = new URLSearchParams(window.location.search);
    console.log("App Initialized. Getting url parameters!");
    let urlParams = {};
    queryParameters.forEach((value, key) => {
      urlParams[key] = value;
    });
    try {
      if (Object.keys(urlParams).length > 0) {
        if (
          urlParams.id !== undefined &&
          urlParams.id !== null &&
          urlParams.id !== ""
        ) {
          setUid(urlParams.id);
        } else {
          throw "Invalid Id";
        }

        console.log("UID: " + urlParams.id + " ACCESS: " + urlParams.access);
        LogRocket.identify(urlParams.id);
        let accessCode = urlParams.access;
        if (accessCode.includes(accessCodes.control)) {
          setAccessId("control");
          setLinkValidity(true);
        } else if (accessCode.includes(accessCodes.treatment)) {
          setAccessId("treatment");
          setLinkValidity(true);
        }
      } else {
        console.log("No url params found!");
        setLinkValidity(false);
      }
    } catch (e) {
      setLinkValidity(false);
    }

    setWindowLoaded(true);
  }, []);

  return (
    <>
      {!windowLoaded ? (
        <Loader />
      ) : (
        <main className="lg:px-12 md:px-6 px-4 xl:px-24 py-12 pb-24 bg-fuseYellow-lightest/50 min-h-screen">
          <div className="xl:px-48">
            <h1 className="text-4xl text-center mb-2">
              First Day Of Class Speech Feedback
            </h1>
            {linkValidity ? (
              <InputForm uId={uid} accessGroup={accessId} />
            ) : (
              <div className="rounded text-center m-10 bg-orange-100 p-16">
                <h2 className="text-2xl text-orange-600 font-bold mb-2">
                  Invalid Link
                </h2>
                <p className="text-lg">
                  Please reach out to the team and get the correct link!
                </p>
              </div>
            )}
          </div>
        </main>
      )}
    </>
  );
}
