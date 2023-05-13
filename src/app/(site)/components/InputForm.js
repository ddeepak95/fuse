"use client";

import { firestoreDatabase } from "@/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

async function createTestDoc() {
  await setDoc(doc(firestoreDatabase, "cities", "LA"), {
    name: "Los Angeles",
    state: "CA",
    country: "USA",
  });
}

const InputForm = (props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const onSubmit = (data) => console.log(data);

  return (
    <>
      <p className="text-center mb-6">Instructions for filling the feedback</p>
      <form onSubmit={handleSubmit(onSubmit)}>
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
          <button className="bg-cyan-500 hover:bg-cyan-700 mr-2 cursor-pointer px-6 py-3 rounded-lg text-white font-bold">
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
