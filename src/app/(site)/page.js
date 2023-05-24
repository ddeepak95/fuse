import InputForm from "./components/InputForm";
export default function Home() {
  return (
    <main className="lg:p-12 md:p-6 p-4 xl:p-24 pb-24 bg-slate-100/50 min-h-screen">
      <div className="xl:px-48">
        <h1 className="text-4xl text-center mb-2">
          First Day Of Class Speech Feedback
        </h1>
        <InputForm />
      </div>
    </main>
  );
}
