import Goldfishes3D from "../1/screen";

export default function Goldfishes3DTwo() {
  return (
    <Goldfishes3D
      attentionZoneBehavior="protected-perimeter"
      cameraProjection="orthographic"
      initialAgentScale={2}
      minimumAgentScale={1}
      maximumAgentScale={4}
    />
  );
}
