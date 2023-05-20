"use client";

import { firestoreDatabase } from "@/firebase/config";
import { doc, setDoc, getDoc, collection } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import Loader from "./components/Loader";
import { staticWords } from "./staticWordsList";

const accessCodes = { control: "control", treatment: "treatment" };

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

async function getCurrentDataFromFirestore(user) {
  let docSnap = await getDoc(doc(firestoreDatabase, "users", user));
  if (docSnap.exists()) {
    return docSnap.data();
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

  return [data.aiResponse];
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

const escapeRegExpMatch = function (s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
};
const isExactMatch = (str, match) => {
  return new RegExp(`\\b${escapeRegExpMatch(match)}\\b`).test(str);
};

function pickThreeRandomElements(arr) {
  if (arr.length < 3) {
    return arr;
  }

  const result = [];
  const shuffled = arr.slice(); // Create a shallow copy of the original array

  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * shuffled.length);
    const pickedElement = shuffled[randomIndex];
    shuffled.splice(randomIndex, 1); // Remove the picked element from the array
    result.push(pickedElement);
  }

  return result;
}

function assignStaticFeedbackText(arr) {
  let resArr = [];
  arr.forEach((element) => {
    resArr = [...resArr, staticWords[element]];
  });
  return resArr;
}

function giveStaticFeedback(text) {
  const checkList = Object.keys(staticWords);
  let matchWords = [];
  checkList.forEach((element) => {
    let check = isExactMatch(text.toLowerCase(), element);
    if (check) {
      matchWords = [...matchWords, element];
    }
  });
  let wordsChosenForFeedback = pickThreeRandomElements(matchWords);
  let feedbackText = assignStaticFeedbackText(wordsChosenForFeedback);
  return feedbackText;
}

async function getFeedback(accessGroup, inputData) {
  let feedbackData = {};
  for (const element in inputData) {
    let text = inputData[element];
    let feedback = "";
    if (text !== "") {
      if (accessGroup === accessCodes.control) {
        //Get Static Feedback
        feedback = giveStaticFeedback(text);
      } else if (accessGroup === accessCodes.treatment) {
        // Get Feedback form OpenAI
        feedback = await getFeedbackFromOpenAI("Give feedback on: " + text);
      }
    }
    let feedbackObj = { text: text, feedback: feedback };
    feedbackData[element] = feedbackObj;
  }
  return feedbackData;
}

const InputForm = (props) => {
  const [queryParameters, setQueryParameters] = useState();
  const [userDetails, setUserDetails] = useState({});
  const [feedbackData, setFeedbackData] = useState({});
  const [invalidLink, setInvalidLink] = useState(true);
  const [loading, setLoading] = useState(true);
  const [draftForm, setDraftForm] = useState({});
  const [mode, setMode] = useState("write");
  function updateFeedbackData(data) {
    setFeedbackData(data);
  }

  function updateLoading(bool) {
    setLoading(bool);
  }

  function updateMode(text) {
    setMode(text);
  }

  useEffect(() => {
    setQueryParameters(new URLSearchParams(window.location.search));
  }, []);

  useEffect(() => {
    if (queryParameters?.size > 0) {
      setUserDetails({
        id: queryParameters.get("id"),
        accessGroup: queryParameters.get("access"),
      });
    }
  }, [queryParameters]);

  useEffect(() => {
    if (queryParameters?.size > 0) {
      if (
        userDetails.id === undefined ||
        (userDetails.accessGroup !== accessCodes.control &&
          userDetails.accessGroup !== accessCodes.treatment)
      ) {
        setInvalidLink(true);
      } else {
        (async () => {
          let currentData = await getCurrentDataFromFirestore(userDetails.id);
          if (currentData?.draft !== undefined) {
            setDraftForm(currentData?.draft);
          }
          if (currentData?.currentFeedbackData !== undefined) {
            setFeedbackData(currentData?.currentFeedbackData);
          }
          setInvalidLink(false);
          setLoading(false);
        })();
      }
    }
  }, [userDetails]);

  return (
    <>
      {loading && <Loader />}
      {invalidLink ? (
        <>
          <p className="text-center mb-6">
            Invalid Link. Please check your url.
          </p>
        </>
      ) : (
        <>
          <p className="text-center mb-6">
            Instructions for filling the feedback
          </p>
          <div className="text-lg mb-6 font-medium text-center text-gray-500 border-b border-gray-200">
            <ul className="flex place-content-center flex-wrap -mb-px">
              <li className="mr-2">
                <button
                  onClick={() => setMode("write")}
                  className={`inline-block p-4 px-8 border-b-4 ${
                    mode === "write"
                      ? "border-blue-400 text-gray-900"
                      : "border-transparent hover:text-gray-600 hover:border-gray-300"
                  } rounded-t-lg`}
                >
                  Write
                </button>
              </li>
              <li>
                <button
                  onClick={() => setMode("feedback")}
                  className={`inline-block p-4 px-8 border-b-4 ${
                    mode === "feedback"
                      ? "border-blue-400 text-gray-900"
                      : "border-transparent hover:text-gray-600 hover:border-gray-300"
                  } rounded-t-lg `}
                >
                  Feedback
                </button>
              </li>
            </ul>
          </div>

          <SpeechForm
            className={mode === "write" ? "block" : "hidden"}
            userId={userDetails.id}
            userGroup={userDetails.accessGroup}
            draft={draftForm}
            updateFeedbackState={updateFeedbackData}
            setLoader={updateLoading}
            setMode={updateMode}
          />
          <FeedbackUnit
            className={mode === "feedback" ? "block" : "hidden"}
            data={feedbackData}
          />
        </>
      )}
    </>
  );
};

export default InputForm;

const SpeechForm = (props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: async () => {
      {
        if (props.userId !== undefined && props.userId !== null) {
          return props.draft;
        }
      }
    },
  });
  const onSubmit = async (data) => {
    getAndShowFeedback(data);
  };
  const onError = async (errors, e) => {
    Swal.fire({
      icon: "warning",
      title: "You haven't filled all the sections.",
      text: "Do you still want to continue?",
      showCancelButton: true,
      confirmButtonText: "Yes, Generate Feedback",
    }).then(async () => {
      let form = e.nativeEvent.target;
      let formValues = await getFormValues(form);
      getAndShowFeedback(formValues);
    });
  };
  async function getAndShowFeedback(data) {
    props.setLoader(true);
    saveDraft();
    let feedback = getFeedback(props.userGroup, data);
    feedback.then((data) => {
      props.updateFeedbackState(data);
      saveFeedbackToFirestore(props.userId, props.userGroup, data);
      window.scrollTo(0, 0);
      setTimeout(() => props.setLoader(false), 2000);
      props.setMode("feedback");
    });
  }
  async function saveDraft() {
    const form = document.getElementById("speechPrompts");
    const formData = await getFormValues(form);
    saveDraftToFirestore(props.userId, formData);
  }

  return (
    <div className={props.className}>
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
              Swal.fire({
                icon: "success",
                title: "Your work has been saved",
                showConfirmButton: false,
                timer: 1000,
              });
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
    </div>
  );
};

const InputBox = (props) => {
  const [errorState, setErrorState] = useState(false);
  useEffect(() => {
    props.errors[props.name] && setErrorState(true);
  }, [props]);
  return (
    <>
      <div className="mb-6">
        <label
          htmlFor={props.name}
          className="block text-base font-semibold mb-1"
        >
          {props.label}
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

function isObjEmpty(obj) {
  return Object.keys(obj).length === 0;
}

const FeedbackUnit = (props) => {
  if (isObjEmpty(props.data) === true) {
    return (
      <>
        <div className={props.className}>
          <div className="text-center">
            <p className="text-xl mt-[60px] mb-3">No feedback available!</p>
            <p>Write the speech and generate feedback to view the feedback!</p>
          </div>
        </div>
      </>
    );
  }
  return (
    <div className={props.className}>
      <FeedbackComponent
        type="What Learning Math Is Like"
        text={props.data["whatLearningMathIsLike"].text}
        feedback={props.data["whatLearningMathIsLike"].feedback}
      />
      <FeedbackComponent
        type="Struggling in Class"
        text={props.data["strugglingInClass"].text}
        feedback={props.data["strugglingInClass"].feedback}
      />
      <FeedbackComponent
        type="Asking Questions"
        text={props.data["askingQuestions"].text}
        feedback={props.data["askingQuestions"].feedback}
      />
      <FeedbackComponent
        type="Revising and Redoing Your Work"
        text={props.data["revisingAndRedoingYourWork"].text}
        feedback={props.data["revisingAndRedoingYourWork"].feedback}
      />
      <FeedbackComponent
        type="Exams"
        text={props.data["exams"].text}
        feedback={props.data["exams"].feedback}
      />
      <FeedbackComponent
        type="How Students Usually Perform"
        text={props.data["howStudentsUsuallyPerform"].text}
        feedback={props.data["howStudentsUsuallyPerform"].feedback}
      />
      <FeedbackComponent
        type="Final Thoughts"
        text={props.data["finalThoughts"].text}
        feedback={props.data["finalThoughts"].feedback}
      />
    </div>
  );
};

const FeedbackComponent = (props) => {
  return (
    <div className="mb-6">
      <p className="block text-base font-semibold mb-1">{props.type}</p>
      <div className="block w-full rounded-t-lg p-3 border-2 border-slate-300 bg-neutral-100">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">
          Input Text
        </p>
        {props.text === "" ? (
          <>
            <p className="italic text-neutral-500">No input text provided!</p>
          </>
        ) : (
          <p>{props.text}</p>
        )}
      </div>
      <div className="block w-full rounded-b-lg p-3 border-2 border-slate-300 bg-white">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">
          Feedback
        </p>
        {props.feedback.length === 0 ? (
          <>
            <p className="italic text-neutral-500">No feedback available!</p>
          </>
        ) : (
          <>
            <ul className="list-disc list-outside ml-6">
              {props.feedback.map((element, i) => {
                return (
                  <li className="mb-2" key={i}>
                    {element}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
