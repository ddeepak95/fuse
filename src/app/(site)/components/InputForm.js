"use client";

import { firestoreDatabase } from "@/firebase/config";
import { doc, setDoc, getDoc, collection } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";

async function saveDraftToFirestore(user, data) {
  await setDoc(
    doc(firestoreDatabase, "users", user),
    {
      draft: data,
    },
    { merge: true }
  );
}

async function saveFeedbackToFirestore(user, userType, data) {
  await setDoc(
    doc(firestoreDatabase, "users", user),
    {
      currentFeedbackData: data,
      userType: userType,
    },
    { merge: true }
  );
  let timeStamp = new Date().toISOString();
  console.log(timeStamp);
  await setDoc(
    doc(firestoreDatabase, "users", user, "logs", timeStamp),
    {
      promptAndFeedback: data,
      userType: userType,
      timeStamp: timeStamp,
    },
    { merge: true }
  );
}

async function getDraftFromFirestore(user) {
  let docSnap = await getDoc(doc(firestoreDatabase, "users", user));
  if (docSnap.exists()) {
    return docSnap.data().draft;
  } else {
    return {};
  }
}

async function getFeedbackFromOpenAI(text) {
  let response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({ prompt: text }),
  });

  let data = await response.json();

  return data.aiResponse;
}

function getFormValues(form) {
  return new Promise((resolve, reject) => {
    let formData = {};
    for (const child of form.children) {
      let elements = child.children;
      for (const element of elements) {
        if (element.tagName === "TEXTAREA") {
          formData[element.id] = element.value;
        }
      }
    }
    resolve(formData);
  });
}

const InputForm = (props) => {
  const queryParameters = new URLSearchParams(window.location.search);
  const userDetails = {
    id: queryParameters.get("id"),
    accessGroup: queryParameters.get("access"),
  };
  const accessCodes = { control: "control", treatment: "treatment" };
  const [feedbackData, setFeedbackData] = useState({});

  if (
    queryParameters.size === 0 ||
    (userDetails.accessGroup !== accessCodes.control &&
      userDetails.accessGroup !== accessCodes.treatment)
  ) {
    return (
      <>
        <p className="text-center mb-6">Invalid Link. Please check your url.</p>
      </>
    );
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: async () => {
      {
        return await getDraftFromFirestore(userDetails.id);
      }
    },
  });
  const onSubmit = (data) => {
    console.log("Clicked");
    console.log(data);
  };
  const onError = async (errors, e) => {
    let form = e.nativeEvent.target;
    let formValues = await getFormValues(form);
    let feedback = await getFeedback(formValues);
    setFeedbackData(feedback);
    saveFeedbackToFirestore(userDetails.id, userDetails.accessGroup, feedback);
  };

  async function getFeedback(data) {
    let feedbackData = {};
    for (const element in data) {
      let text = data[element];
      let feedback = "";
      if (text !== "") {
        if (userDetails.accessGroup === accessCodes.control) {
          //Get Static Feedback
          feedback = "Static Feedback. Coming Soon!";
        } else if (userDetails.accessGroup === accessCodes.treatment) {
          // Get Feedback form OpenAI
          feedback = await getFeedbackFromOpenAI("Give feedback on: " + text);
        }
      }
      let feedbackObj = { text: text, feedback: feedback };
      feedbackData[element] = feedbackObj;
    }
    return feedbackData;
  }

  async function saveDraft() {
    const form = document.getElementById("speechPrompts");
    const formData = await getFormValues(form);
    saveDraftToFirestore(userDetails.id, formData);
    Swal.fire({
      icon: "success",
      title: "Your work has been saved",
      showConfirmButton: false,
      timer: 1000,
    });
  }

  return (
    <>
      <p className="text-center mb-6">Instructions for filling the feedback</p>
      <form id="speechPrompts" onSubmit={handleSubmit(onSubmit, onError)}>
        <InputBox
          name="whatLearningMathIsLike"
          label="What Learning Math is Like"
          placeholder="Enter text here..."
          errors={errors}
          register={register}
          validationSchema={{
            required: "This field is required!",
          }}
          required
        />
        <InputBox
          name="strugglingInClass"
          label="Struggling in Class"
          placeholder="Enter text here..."
          errors={errors}
          register={register}
          validationSchema={{
            required: "This field is required!",
          }}
          required
        />
        <InputBox
          name="askingQuestions"
          label="Asking Questions"
          placeholder="Enter text here..."
          errors={errors}
          register={register}
          validationSchema={{
            required: "This field is required!",
          }}
          required
        />
        <InputBox
          name="revisingAndRedoingYourWork"
          label="Revising and Redoing Your Work"
          placeholder="Enter text here..."
          errors={errors}
          register={register}
          validationSchema={{
            required: "This field is required!",
          }}
          required
        />
        <InputBox
          name="exams"
          label="Exams"
          placeholder="Enter text here..."
          errors={errors}
          register={register}
          validationSchema={{
            required: "This field is required!",
          }}
          required
        />
        <InputBox
          name="howStudentsUsuallyPerform"
          label="How Students Usually Perform"
          placeholder="Enter text here..."
          errors={errors}
          register={register}
          validationSchema={{
            required: "This field is required!",
          }}
          required
        />
        <InputBox
          name="finalThoughts"
          label="Final Thoughts"
          placeholder="Enter text here..."
          errors={errors}
          register={register}
          validationSchema={{
            required: "This field is required!",
          }}
          required
        />
        <div className="text-center">
          <button
            onClick={(e) => {
              e.preventDefault();
              saveDraft();
            }}
            className="bg-cyan-500 hover:bg-cyan-700 mr-2 cursor-pointer px-6 py-3 rounded-lg text-white font-bold"
          >
            Save Draft
          </button>
          <input
            className="bg-green-500 hover:bg-green-700 cursor-pointer px-6 py-3 rounded-lg text-white font-bold"
            value="Get Feedback"
            type="submit"
          />
        </div>
      </form>
    </>
  );
};

export default InputForm;

const InputBox = (props) => {
  const [errorState, setErrorState] = useState(false);
  useEffect(() => {
    props.errors[props.name] && setErrorState(true);
  }, [props]);
  return (
    <>
      <div className="mb-6">
        <label htmlFor={props.name} className="block text-lg mb-1">
          {props.label}
          {props.required && "*"}
        </label>
        <textarea
          id={props.name}
          name={props.name}
          {...props.register(props.name, props.validationSchema)}
          rows={4}
          className={`block w-full rounded-lg p-2 border-2 border-slate-300 focus:border-slate-800 ${
            errorState && "border-red-300"
          }`}
          placeholder={props.placeholder}
          onFocus={() => {
            errorState && setErrorState(false);
          }}
        />
        {errorState && (
          <span className="text-red-600">
            {props.errors[props.name]?.message}
          </span>
        )}
      </div>
    </>
  );
};
