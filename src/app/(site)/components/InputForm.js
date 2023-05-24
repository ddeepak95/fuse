"use client";

import { firestoreDatabase } from "@/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import Loader from "./components/Loader";
import { staticWords } from "./staticWordsList";
import LogRocket from "logrocket";
LogRocket.init("6tg6cc/fuse");

const accessCodes = { control: "control", treatment: "treatment" };

const speechSections = {
  whatLearningMathIsLike: "What Learning Math is Like",
  strugglingInClass: "Struggling in Class",
  askingQuestions: "Asking Questions",
  revisingAndRedoingYourWork: "Revising and Redoing Your Work",
  exams: "Exams",
  howStudentsUsuallyPerform: "How Students Usually Perform",
  finalThoughts: "Final Thoughts",
};

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

async function getFeedbackFromOpenAI(systemContext, speechText) {
  let response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({
      systemContext: systemContext,
      speechText: speechText,
    }),
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

function keepOnlyUniqueWords(arr) {
  var unique = arr.filter(
    (value, index, array) => array.indexOf(value) === index
  );
  return unique;
}

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
  let uniqueKeywords = keepOnlyUniqueWords(matchWords);
  let wordsChosenForFeedback = pickThreeRandomElements(uniqueKeywords);
  let feedbackText = assignStaticFeedbackText(wordsChosenForFeedback);
  return feedbackText;
}

function getSystemContext(speechType) {
  let systemContexts = {
    whatLearningMathIsLike:
      'You should pass/fail user input on the following:\n1. The user input tells students that learning math may be challenging, but every student can learn.\n2. The user input tells students that they belong in the course regardless of their past experiences.\nThe user input may not use the exact language listed in the metric and still pass.\nIf the speech passes on both metrics follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you told students that math can be challenging, but that they all have the ability to learn when you wrote:"" Insert the line from the user input that passed metric 1. Output the text ""You also told your students that they belong in your course by writing:"" Insert the line from user input that passed on metric 2.\nIf the speech passes on metric 1 but fails on metric 2 follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you told students that math can be challenging, but that they all have the ability to learn when you wrote:"" Insert the line from the user input that passed on metric 1. Output the text ""There\'s always room for improvement. Some students struggle with feeling that they don\'t belong in their courses, especially difficult spaces like math classes. Could you think of a way to make students feel like they belong?""\nIf the speech fails on metric 1 but passes on metric 2, follow the procedure here: Output the text ""Congratulations, this is a great speech! Most speeches perform better in this section when they explain that math might be challenging, but that every student has the chance to succeed. Could you try to find a way to incorporate this into your speech?" Output the text "However, you did a great job telling your students that they belong in your course by writing:"" Insert the line from user input that passed on metric 2.\nIf the speech fails on both metrics, follow the procedure here: Output the text ""Congratulations, this is a great first step. Many speeches perform well in this section when they do two things. First, they tell students that math can be challenging, but that they all have the opportunity to succeed. Second, they tell students that regardless of their past experiences, all students belong in the course. Can you think of a way to incorporate these ideas into your speech?""',
  };

  return systemContexts[speechType];
}

const InputForm = (props) => {
  const [queryParameters, setQueryParameters] = useState();
  const [userDetails, setUserDetails] = useState({});
  const [feedbackData, setFeedbackData] = useState({});
  const [invalidLink, setInvalidLink] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loaderStatus, setLoaderStatus] = useState("");
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

  function updateLoaderStatus(text) {
    setLoaderStatus(text);
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
      LogRocket.identify(queryParameters.get("id"));
      console.log("Logging");
    } else {
      LogRocket.identify("NoId");
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
        setLoading(false);
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
    } else {
      setLoading(false);
    }
  }, [userDetails]);

  return (
    <>
      {loading && <Loader currentElement={loaderStatus} />}
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
            setLoaderStatus={updateLoaderStatus}
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
    async function getFeedback(accessGroup, inputData) {
      let feedbackData = {};
      for (const element in inputData) {
        props.setLoaderStatus(
          "Getting AI feedback for " +
            speechSections[element] +
            " section. \nThis might take some time. Please be patient!"
        );
        let text = inputData[element];
        let feedback = "";
        if (text !== "") {
          if (accessGroup === accessCodes.control) {
            //Get Static Feedback
            feedback = giveStaticFeedback(text);
          } else if (accessGroup === accessCodes.treatment) {
            // Get Feedback form OpenAI
            let systemContext = getSystemContext("whatLearningMathIsLike");
            feedback = await getFeedbackFromOpenAI(systemContext, text);
          }
        }
        let feedbackObj = { text: text, feedback: feedback };
        feedbackData[element] = feedbackObj;
      }
      return feedbackData;
    }
    let feedback = getFeedback(props.userGroup, data);
    feedback.then((data) => {
      props.setLoaderStatus("Saving Feedback");
      props.updateFeedbackState(data);
      saveFeedbackToFirestore(props.userId, props.userGroup, data);
      window.scrollTo(0, 0);
      setTimeout(() => {
        props.setLoader(false);
        props.setLoaderStatus("");
      }, 2000);
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
          label={speechSections["whatLearningMathIsLike"]}
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
          label={speechSections["strugglingInClass"]}
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
          label={speechSections["askingQuestions"]}
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
          label={speechSections["revisingAndRedoingYourWork"]}
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
          label={speechSections["exams"]}
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
          label={speechSections["howStudentsUsuallyPerform"]}
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
          label={speechSections["finalThoughts"]}
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
        type={speechSections["whatLearningMathIsLike"]}
        text={props.data["whatLearningMathIsLike"].text}
        feedback={props.data["whatLearningMathIsLike"].feedback}
      />
      <FeedbackComponent
        type={speechSections["strugglingInClass"]}
        text={props.data["strugglingInClass"].text}
        feedback={props.data["strugglingInClass"].feedback}
      />
      <FeedbackComponent
        type={speechSections["askingQuestions"]}
        text={props.data["askingQuestions"].text}
        feedback={props.data["askingQuestions"].feedback}
      />
      <FeedbackComponent
        type={speechSections["revisingAndRedoingYourWork"]}
        text={props.data["revisingAndRedoingYourWork"].text}
        feedback={props.data["revisingAndRedoingYourWork"].feedback}
      />
      <FeedbackComponent
        type={speechSections["exams"]}
        text={props.data["exams"].text}
        feedback={props.data["exams"].feedback}
      />
      <FeedbackComponent
        type={speechSections["howStudentsUsuallyPerform"]}
        text={props.data["howStudentsUsuallyPerform"].text}
        feedback={props.data["howStudentsUsuallyPerform"].feedback}
      />
      <FeedbackComponent
        type={speechSections["finalThoughts"]}
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
