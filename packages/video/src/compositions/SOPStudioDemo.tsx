import { Sequence } from "remotion";
import { AddConditions } from "../scenes/AddConditions";
import { AddSteps } from "../scenes/AddSteps";
import { AddTools } from "../scenes/AddTools";
import { ConnectBuild } from "../scenes/ConnectBuild";
import { EmptyEditor } from "../scenes/EmptyEditor";
import { Intro } from "../scenes/Intro";
import { Outro } from "../scenes/Outro";
import { PropertyEdit } from "../scenes/PropertyEdit";

const FPS = 30;

// Scene durations in seconds
const DURATIONS = {
  intro: 3,
  emptyEditor: 3,
  addSteps: 6,
  addConditions: 5,
  addTools: 4,
  connectBuild: 5,
  propertyEdit: 5,
  outro: 3,
} as const;

// Convert to frames
const frames = {
  intro: DURATIONS.intro * FPS,
  emptyEditor: DURATIONS.emptyEditor * FPS,
  addSteps: DURATIONS.addSteps * FPS,
  addConditions: DURATIONS.addConditions * FPS,
  addTools: DURATIONS.addTools * FPS,
  connectBuild: DURATIONS.connectBuild * FPS,
  propertyEdit: DURATIONS.propertyEdit * FPS,
  outro: DURATIONS.outro * FPS,
} as const;

// Calculate cumulative offsets
const offsets = {
  intro: 0,
  emptyEditor: frames.intro,
  addSteps: frames.intro + frames.emptyEditor,
  addConditions: frames.intro + frames.emptyEditor + frames.addSteps,
  addTools:
    frames.intro +
    frames.emptyEditor +
    frames.addSteps +
    frames.addConditions,
  connectBuild:
    frames.intro +
    frames.emptyEditor +
    frames.addSteps +
    frames.addConditions +
    frames.addTools,
  propertyEdit:
    frames.intro +
    frames.emptyEditor +
    frames.addSteps +
    frames.addConditions +
    frames.addTools +
    frames.connectBuild,
  outro:
    frames.intro +
    frames.emptyEditor +
    frames.addSteps +
    frames.addConditions +
    frames.addTools +
    frames.connectBuild +
    frames.propertyEdit,
} as const;

export const SOPStudioDemo: React.FC = () => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "#050D16",
        overflow: "hidden",
      }}
    >
      <Sequence from={offsets.intro} durationInFrames={frames.intro}>
        <Intro />
      </Sequence>

      <Sequence from={offsets.emptyEditor} durationInFrames={frames.emptyEditor}>
        <EmptyEditor />
      </Sequence>

      <Sequence from={offsets.addSteps} durationInFrames={frames.addSteps}>
        <AddSteps />
      </Sequence>

      <Sequence from={offsets.addConditions} durationInFrames={frames.addConditions}>
        <AddConditions />
      </Sequence>

      <Sequence from={offsets.addTools} durationInFrames={frames.addTools}>
        <AddTools />
      </Sequence>

      <Sequence from={offsets.connectBuild} durationInFrames={frames.connectBuild}>
        <ConnectBuild />
      </Sequence>

      <Sequence from={offsets.propertyEdit} durationInFrames={frames.propertyEdit}>
        <PropertyEdit />
      </Sequence>

      <Sequence from={offsets.outro} durationInFrames={frames.outro}>
        <Outro />
      </Sequence>
    </div>
  );
};
