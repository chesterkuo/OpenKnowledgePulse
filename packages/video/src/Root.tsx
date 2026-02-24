import { Composition } from "remotion";
import { SOPStudioDemo } from "./compositions/SOPStudioDemo";
import "./index.css";

const FPS = 30;

export const Root: React.FC = () => {
  return (
    <Composition
      id="SOPStudioDemo"
      component={SOPStudioDemo}
      durationInFrames={34 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
