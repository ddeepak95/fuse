import { RotatingLines } from "react-loader-spinner";
const Loader = () => {
  return (
    <>
      <div className="block fixed top-0 w-full h-full bg-white/90">
        <div className="fixed top-1/2 left-1/2 bg-white -translate-y-1/2 -translate-x-1/2">
          <RotatingLines
            strokeColor="skyblue"
            strokeWidth="5"
            animationDuration="0.75"
            width="96"
            visible={true}
          />
        </div>
      </div>
    </>
  );
};

export default Loader;
