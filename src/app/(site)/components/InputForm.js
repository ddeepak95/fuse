"use client";

import { firestoreDatabase } from "@/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import Loader from "./components/Loader";
import { staticWords } from "./staticWordsList";
import DownloadPdf from "./components/DownloadPdf";
import { RotatingLines } from "react-loader-spinner";

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

  let status = response.status;
  if (status === 200) {
    let data = await response.json();
    return [data.aiResponse];
  } else {
    let data = await response.json();
    throw data.error;
  }
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

function giveStaticFeedbackV2(type) {
  const feedbacks = {
    whatLearningMathIsLike: ["Static Feedback for What Learning Math is Like"],
    strugglingInClass: ["Static Feedback for Struggling in Class"],
    askingQuestions: ["Static Feedback for Asking Questions"],
    revisingAndRedoingYourWork: [
      "Static Feedback for Revising and Redoing Your Work",
    ],
    exams: ["Static Feedback for Exams"],
    howStudentsUsuallyPerform: [
      "Static Feedback for How Students Usually Perform",
    ],
    finalThoughts: ["Static Feedback for Final Thoughts"],
  };
  let feedbackText = feedbacks[type];
  return feedbackText;
}

function getSystemContext(speechType) {
  let systemContexts = {
    whatLearningMathIsLike:
      'You should pass/fail user input on the following: \n1. The user input tells students that learning math may be challenging, but every student can learn. \n2. The user input tells students that they belong in the course regardless of their past experiences. \nThe user input may not use the exact language listed in the metric and still pass. \nIf the speech passes on both metrics follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you told students that math can be challenging, but that they all have the ability to learn when you wrote:"" Insert the line from the user input that passed metric 1. Output the text ""You also told your students that they belong in your course by writing:"" Insert the line from user input that passed on metric 2. \nIf the speech passes on metric 1 but fails on metric 2 follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you told students that math can be challenging, but that they all have the ability to learn when you wrote:"" Insert the line from the user input that passed on metric 1. Output the text ""There\'s always room for improvement. Some students struggle with feeling that they don\'t belong in their courses, especially difficult spaces like math classes. Could you think of a way to make students feel like they belong?"" \nIf the speech fails on metric 1 but passes on metric 2, follow the procedure here: Output the text ""Congratulations, this is a great speech! Most speeches perform better in this section when they explain that math might be challenging, but that every student has the chance to succeed. Could you try to find a way to incorporate this into your speech?"" Output the text ""However, you did a great job telling your students that they belong in your course by writing:"" Insert the line from user input that passed on metric 2. \nIf the speech fails on both metrics, follow the procedure here: Output the text ""Congratulations, this is a great first step. Many speeches perform well in this section when they do two things. First, they tell students that math can be challenging, but that they all have the opportunity to succeed. Second, they tell students that regardless of their past experiences, all students belong in the course. Can you think of a way to incorporate these ideas into your speech?""',
    strugglingInClass:
      'You should pass/fail user input on the following: n1. The user input tells students that making mistakes and struggling is a normal part of challenge-taking and that it\'s okay to make mistakes. \n2. The user input tells students that making mistakes or struggling signals they are learning. \nThe user input may not use the exact language listed in the metric and still pass. \nIf the speech passes on both metrics follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you did well at explaining that mistakes and struggling are normal parts of challenge-taking and that it\'s alright to make mistakes. You wrote about that in these lines:"" Insert the line from the user input that passed metric 1. Output the text ""You also did well explaining that making mistakes or struggling is a signal that students are learning in the lines:"" Insert the line from user input that passed on metric 2. \nIf the speech passes on metric 1 but fails on metric 2 follow the procedure here: Output the text ""Congratulations, this is a great speech! Many speeches perform best when they remind students that struggling and making mistakes is a normal part of learning. Can you think of a way that you might expand upon that idea in your speech? It looks like you did a really good job telling students that mistakes signal that students are learning when you wrote:"" Insert the line from user input that passed on metric 2. nIf the speech fails on metric 1 but passes on metric 2, follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you did well at explaining that mistakes and struggling are normal parts of challenge-taking and that it\'s alright to make mistakes. You wrote about that in these lines:"" Insert the line from the user input that passed metric 1. Output the text ""Speeches tend to do better when they remind students that making mistakes or struggling are signals that the student is learning. Can you think of a way you might expand on that idea in your speech? Remember you can always add or remove lines and resubmit for more feedback."" \nIf the speech fails on both metrics, follow the procedure here: Output the text ""Congratulations, this is a great first step. Many speeches perform well in this section when they do two things. First, they remind students that struggling or making mistakes is a normal part of challenge-taking, and that they should feel like it\'s okay to make mistakes. Second, they tell students that making mistakes or struggling is actually a signal that they\'re learning. Can you think of a way to incorporate these ideas into your speech?""',
    askingQuestions:
      'You should pass/fail user input on the following: \n1. The user input encourages students to ask questions, and tells students that it is normal to have questions about the material.  \nThe user input may not use the exact language listed in the metric and still pass. \nIf the speech passes follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you encourage students to asking questions and let them know that having questions is completely normal. You wrote about that in these lines:"" Insert the line from the user input that passed. \nIf the speech fails, follow the procedure here: Output the text ""Congratulations, this is a great first step. Many speeches perform well in this section when they do two things. First, they encourage students to ask questions when they have them. Second, they remind students that having questions is a normal part of learning! Can you think of a way to incorporate these ideas into your speech?""',
    revisingAndRedoingYourWork:
      'You should pass/fail user input on the following: \n1. The user tells students they have the opportunity to revise or redo work. \n2. The user tells students why revision is important, mainly that revision encourages students to learn from their mistakes. \nThe user input may not use the exact language listed in the metric and still pass. \nIf the speech passes on both metrics follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you used behaviors that signal to students that you have a growth mindset by allowing them to revise their work. You can see that here:"" Insert the line from the user input that passed metric 1. Output the text ""You also told your students why revision policies are important by writing:"" Insert the line from user input that passed on metric 2.\nIf the speech passes on metric 1 but fails on metric 2 follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you used behaviors that signal to students that you have a growth mindset by allowing them to revise their work. You can see that here:"" Insert the line from the user input that passed on metric 1. Output the text ""While it\'s good to have concrete behaviors, it\'s also important to explain to students why revision policies are important to you and your classroom. You might consider adding language that signals to students that you allow revision policies, but you also see them as an opportunity for students to learn and improve from mistakes.""\nIf the speech fails on metric 1 but passes on metric 2, follow the procedure here: Output the text ""Congratulations, this is a great speech! Students don\'t always look to just your language, but your behaviors are important when signaling growth mindset as well. Revision policies are important in classrooms because they tell students you care about their improvement, and that you believe mistakes are an opportunity for growth. You might consider adding language about your revision policy in this section.""\nIf the speech fails on both metrics, follow the procedure here: Output the text ""Congratulations, this is a great speech! Students don\'t always look to just your language, but your behaviors are important when signaling growth mindset as well. Revision policies are important in classrooms because they tell students you care about their improvement, and that you believe mistakes are an opportunity for growth. You might consider adding language about your revision policy in this section.""',
    exams:
      'You should pass/fail user input on the following:\n1. The user tells students that tests do not define who they are or their potential. Tests are instead a snapshot of what they\'ve learned on a given day or time.\n2. The user tells students that improvement in the class is the most important part of learning. \nThe user input may not use the exact language listed in the metric and still pass.\nIf the speech passes on both metrics follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you did well at explaining that tests don\'t define student\'s potential or ability. You wrote about that here:"" Insert the line from the user input that passed metric 1. Output the text "You also did well explaining that improvement is the most important part of learning. We see that in your line:"" Insert the line from user input that passed on metric 2.\nIf the speech passes on metric 1 but fails on metric 2 follow the procedure here: Output the text ""Congratulations, this is a great speech! You did a great job telling students that exams are only a part of their experiences, and don\'t define them as people. You wrote about that here:"" Insert the line from user input that passed on metric 1. Output the text: "Speeches that do well in this segment also tell students that you care about improvement over other things. You might consider adding text that explicitly tells students that!""\nIf the speech fails on metric 1 but passes on metric 2, follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you did a good job telling students that you care about improvement over exam grades. You wrote about that here:"" Insert the line from the user input that passed metric 2. Output the text ""Speeches tend to do better in this section when they remind students that exams are only a snapshot of their learning, and don\'t define who they are or what they\'re capable of. You might consider adding more explicit dialogue that states this in your speech." \nIf the speech fails on both metrics, follow the procedure here: Output the text ""Congratulations, this is a great first step. Many speeches perform well in this section when they do two things. First, they tell students that exams don\'t define who they are or what they\'re capable of. Second, they remind students that the most important part of learning is improving with time. Can you think of a way to incorporate these ideas into your speech?""',
    howStudentsUsuallyPerform:
      'You should pass/fail user input on the following:\n1. The user states that some students may struggle early on in the course, but that every student can improve their grades throughout the course. \nThe user input may not use the exact language listed in the metric and still pass.\nIf the speech passes follow the procedure here: Output the text ""Congratulations, this is a great speech! You tell students that while they may struggle early on, every student has the room to improve throughout the course. You can see that in the line:"" Insert the line from the user input that passed the metric. \nIf the speech fails follow the procedure here: Output the text ""Students usually expect that the grades they get at the beginning of the year will be the same as their final grades, and they don’t know that improvement is possible. You can dispel this by showing students that there is often an upward slope in the course. That is, you can tell them that you expect many students who do poorly initially to figure it out and do much better and pass by the end of the term. You might consider reframing your speech to be more explicit about this.""',
    finalThoughts:
      'You should pass/fail user input on the following:\n1. The user input tells students that learning math may be challenging, but every student can learn.\n2. The user input tells students that they belong in the course regardless of their past experiences.\nThe user input may not use the exact language listed in the metric and still pass.\nIf the speech passes on both metrics follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you told students that math can be challenging, but that they all have the ability to learn when you wrote:"" Insert the line from the user input that passed metric 1. Output the text ""You also told your students that they belong in your course by writing:"" Insert the line from user input that passed on metric 2.\nIf the speech passes on metric 1 but fails on metric 2 follow the procedure here: Output the text ""Congratulations, this is a great speech! It looks like you told students that math can be challenging, but that they all have the ability to learn when you wrote:"" Insert the line from the user input that passed on metric 1. Output the text ""There\'s always room for improvement. Some students struggle with feeling that they don\'t belong in their courses, especially difficult spaces like math classes. Could you think of a way to make students feel like they belong?""\nIf the speech fails on metric 1 but passes on metric 2, follow the procedure here: Output the text ""Congratulations, this is a great speech! Most speeches perform better in this section when they explain that math might be challenging, but that every student has the chance to succeed. Could you try to find a way to incorporate this into your speech?" Output the text "However, you did a great job telling your students that they belong in your course by writing:"" Insert the line from user input that passed on metric 2.\nIf the speech fails on both metrics, follow the procedure here: Output the text ""Congratulations, this is a great first step. Many speeches perform well in this section when they do two things. First, they tell students that math can be challenging, but that they all have the opportunity to succeed. Second, they tell students that regardless of their past experiences, all students belong in the course. Can you think of a way to incorporate these ideas into your speech?""',
  };

  return systemContexts[speechType];
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const InputForm = (props) => {
  const userDetails = {
    id: props.uId,
    accessGroup: props.accessGroup,
  };
  const [feedbackData, setFeedbackData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadInitialData, setLoadInitialData] = useState(false);
  const [loaderStatus, setLoaderStatus] = useState("");
  const [draftForm, setDraftForm] = useState({});
  const [mode, setMode] = useState("write");

  async function getAndShowFeedback(data) {
    setLoading(true);
    saveDraft(userDetails.id);

    const updateFeedbackData = (key, feedbackObj) => {
      setFeedbackData((prevState) => ({
        ...prevState,
        [key]: feedbackObj,
      }));
    };

    let tempFeedbackData = {
      whatLearningMathIsLike: {
        text: data["whatLearningMathIsLike"],
        feedback: ["Loading"],
        loading: true,
      },
      strugglingInClass: {
        text: data["strugglingInClass"],
        feedback: ["Loading"],
        loading: true,
      },
      askingQuestions: {
        text: data["askingQuestions"],
        feedback: ["Loading"],
        loading: true,
      },
      revisingAndRedoingYourWork: {
        text: data["revisingAndRedoingYourWork"],
        feedback: ["Loading"],
        loading: true,
      },
      exams: {
        text: data["exams"],
        feedback: ["Loading"],
        loading: true,
      },
      howStudentsUsuallyPerform: {
        text: data["howStudentsUsuallyPerform"],
        feedback: ["Loading"],
        loading: true,
      },
      finalThoughts: {
        text: data["finalThoughts"],
        feedback: ["Loading"],
        loading: true,
      },
    };
    const feedbackSections = [
      "whatLearningMathIsLike",
      "strugglingInClass",
      "askingQuestions",
      "revisingAndRedoingYourWork",
      "exams",
      "howStudentsUsuallyPerform",
      "finalThoughts",
    ];

    setLoaderStatus("Getting AI feedback. \n This might take some time!");
    setFeedbackData(tempFeedbackData);

    for (let i = 0; i < feedbackSections.length; i++) {
      let element = feedbackSections[i];
      let text = data[element];
      let feedbackText = "";
      if (text !== "") {
        if (userDetails.accessGroup === "control") {
          //Get Static Feedback
          feedbackText = giveStaticFeedbackV2(element);
          console.log(feedbackText);
        } else if (userDetails.accessGroup === "treatment") {
          // Get Feedback form OpenAI
          let systemContext = getSystemContext(element);
          try {
            feedbackText = await getFeedbackFromOpenAI(systemContext, text);
          } catch (e) {
            console.log(e);
            feedbackText = ["Error in AI System. Please try after sometime."];
          }
        }
      }
      let feedbackObj = {
        text: text,
        feedback: feedbackText,
        loading: false,
      };
      updateFeedbackData(element, feedbackObj);
      tempFeedbackData[element] = feedbackObj;
      if (i === 0) {
        setTimeout(() => {
          setLoading(false);
          window.scrollTo(0, 0);
          setMode("feedback");
        }, 2000);
      }
      if (i === feedbackSections.length - 1) {
        saveFeedbackToFirestore(
          userDetails.id,
          userDetails.accessGroup,
          tempFeedbackData
        );
        setLoaderStatus("");
      }
    }
  }

  function updateMode(text) {
    setMode(text);
  }

  useEffect(() => {
    (async () => {
      let currentData = await getCurrentDataFromFirestore(userDetails.id);
      if (currentData?.draft !== undefined) {
        setDraftForm(currentData?.draft);
      }
      if (currentData?.currentFeedbackData !== undefined) {
        setFeedbackData(currentData?.currentFeedbackData);
      }
      setLoading(false);
      setLoadInitialData(true);
    })();
  }, []);

  return (
    <>
      {loading && <Loader currentElement={loaderStatus} />}
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
                    ? "border-fuseBlue-light text-gray-900"
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
                    ? "border-fuseBlue-light text-gray-900"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300"
                } rounded-t-lg `}
              >
                Feedback
              </button>
            </li>
          </ul>
        </div>
        {loadInitialData && (
          <>
            <SpeechForm
              className={mode === "write" ? "block" : "hidden"}
              userId={userDetails.id}
              userGroup={userDetails.accessGroup}
              draft={draftForm}
              getAndShowFeedback={getAndShowFeedback}
            />
            <FeedbackUnit
              className={mode === "feedback" ? "block" : "hidden"}
              data={feedbackData}
              setMode={updateMode}
            />
          </>
        )}
      </>
    </>
  );
};

export default InputForm;

async function saveDraft(uId) {
  const form = document.getElementById("speechPrompts");
  const formData = await getFormValues(form);
  saveDraftToFirestore(uId, formData);
}

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
    props.getAndShowFeedback(data);
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
              saveDraft(props.userId);
              Swal.fire({
                icon: "success",
                title: "Your work has been saved",
                showConfirmButton: false,
                timer: 1000,
              });
            }}
            className="bg-fuseBlue-lighter hover:bg-fuseBlue mr-2 cursor-pointer px-6 py-3 rounded-lg text-white font-bold"
          >
            Save Draft
          </button>
          <input
            className="bg-fuseYellow hover:bg-fuseYellow-dark cursor-pointer px-6 py-3 rounded-lg text-white font-bold"
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
        loading={props.data["whatLearningMathIsLike"].loading}
      />
      <FeedbackComponent
        type={speechSections["strugglingInClass"]}
        text={props.data["strugglingInClass"].text}
        feedback={props.data["strugglingInClass"].feedback}
        loading={props.data["strugglingInClass"].loading}
      />
      <FeedbackComponent
        type={speechSections["askingQuestions"]}
        text={props.data["askingQuestions"].text}
        feedback={props.data["askingQuestions"].feedback}
        loading={props.data["askingQuestions"].loading}
      />
      <FeedbackComponent
        type={speechSections["revisingAndRedoingYourWork"]}
        text={props.data["revisingAndRedoingYourWork"].text}
        feedback={props.data["revisingAndRedoingYourWork"].feedback}
        loading={props.data["revisingAndRedoingYourWork"].loading}
      />
      <FeedbackComponent
        type={speechSections["exams"]}
        text={props.data["exams"].text}
        feedback={props.data["exams"].feedback}
        loading={props.data["exams"].loading}
      />
      <FeedbackComponent
        type={speechSections["howStudentsUsuallyPerform"]}
        text={props.data["howStudentsUsuallyPerform"].text}
        feedback={props.data["howStudentsUsuallyPerform"].feedback}
        loading={props.data["howStudentsUsuallyPerform"].loading}
      />
      <FeedbackComponent
        type={speechSections["finalThoughts"]}
        text={props.data["finalThoughts"].text}
        feedback={props.data["finalThoughts"].feedback}
        loading={props.data["finalThoughts"].loading}
      />
      <div className="text-center">
        <button
          onClick={() => {
            window.scroll(0, 0);
            props.setMode("write");
          }}
          className="bg-fuseBlue-lighter hover:bg-fuseBlue mr-2 cursor-pointer px-6 py-3 rounded-lg text-white font-bold"
        >
          Revise Speech
        </button>
        <DownloadPdf data={props.data} />
      </div>
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
        {props.loading ? (
          <FeedbackInlineLoader />
        ) : (
          <FeedbackText feedback={props.feedback} />
        )}
      </div>
    </div>
  );
};

const FeedbackInlineLoader = () => {
  return (
    <>
      <div>
        <div className="flex justify-center m-auto">
          <RotatingLines
            strokeColor="skyblue"
            strokeWidth="5"
            animationDuration="0.75"
            width="46"
            visible={true}
            wrapperStyle={{ margin: "auto" }}
          />
        </div>
        <div className="text-center">
          <p>
            Getting AI Feedback for this section. This might take some time!
          </p>
        </div>
      </div>
    </>
  );
};

const FeedbackText = (props) => {
  return (
    <>
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
    </>
  );
};
