import { RotatingLines } from "react-loader-spinner";
const Loader = (props) => {
  return (
    <>
      <div className="block fixed top-0 w-full h-full bg-white/90">
        <div className="fixed text-center top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2">
          <div>
            <RotatingLines
              strokeColor="skyblue"
              strokeWidth="5"
              animationDuration="0.75"
              width="96"
              visible={true}
              wrapperStyle={{ margin: "auto" }}
            />
          </div>
        </div>
        <div className="fixed text-center top-1/2 left-1/2 -translate-y-[-60px] -translate-x-1/2">
          <p className="text-xl mt-2 whitespace-pre-wrap">
            {props.currentElement}
          </p>
        </div>
      </div>
    </>
  );
};

export default Loader;
