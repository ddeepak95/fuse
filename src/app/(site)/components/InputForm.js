"use client";

import { useEffect } from "react";
import { firestoreDatabase } from "@/firebase/config";
import { doc, setDoc } from "firebase/firestore";

async function createTestDoc() {
  await setDoc(doc(firestoreDatabase, "cities", "LA"), {
    name: "Los Angeles",
    state: "CA",
    country: "USA",
  });
}

const InputForm = () => {
  useEffect(() => {
    console.log("Heyyy");
    createTestDoc();
  }, []);
  return (
    <>
      <p>Heyyy</p>
    </>
  );
};

export default InputForm;
