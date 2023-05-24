"use client";
import { useEffect, useState } from "react";

import InputForm from "./components/InputForm";
import Loader from "./components/components/Loader";
import LogRocket from "logrocket";
LogRocket.init("6tg6cc/fuse");

export default function Home() {
  const accessCodes = { control: "control", treatment: "treatment" };
  const [windowLoaded, setWindowLoaded] = useState(false);
  const [uid, setUid] = useState();
  const [accessId, setAccessId] = useState();
  let queryParameters = null;
  const [linkValidity, setLinkValidity] = useState();
  useEffect(() => {
    queryParameters = new URLSearchParams(window.location.search);
    console.log("App Initialized. Getting url parameters!");

    if (queryParameters?.size > 0) {
      setUid(queryParameters.get("id"));
      console.log(
        "UID: " +
          queryParameters.get("id") +
          " ACCESS: " +
          queryParameters.get("access")
      );
      let accessCode = queryParameters.get("access");
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
    setWindowLoaded(true);
  }, []);

  return (
    <>
      {!windowLoaded ? (
        <Loader />
      ) : (
        <main className="lg:p-12 md:p-6 p-4 xl:p-24 pb-24 bg-slate-100/50 min-h-screen">
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
