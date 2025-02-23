import { BeatLoader } from "react-spinners";

export const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <BeatLoader color="#000000" />
    </div>
  );
};
