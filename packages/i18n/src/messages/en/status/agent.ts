import { defineMessages } from "../../../message";

export const messages = defineMessages("status.agent", {
  "status.agent.claudeWriteOutside":
    "Write {path}, outside the agent's workspace, the shared folder and the temporary folders.",
  "status.agent.contextCleared": "Context cleared. A new chat starts here.",
  "status.agent.modelSwitchedForLimit": "Usage limit reached. Switched to {model}.",
  "status.agent.modelReturnedAfterLimit": "Usage limit ended. Switched back to {model}.",
  "status.agent.marketplaceSuggested": "Suggested a Marketplace app: {app}.",
  "status.agent.screenCaptureScreen": "Capture the main screen and send the image to the agent's model.",
  "status.agent.screenCaptureDisplay": "Capture the display {name} and send the image to the agent's model.",
  "status.agent.screenCaptureWindow": "Capture the window {name} and send the image to the agent's model.",
  "status.agent.screenCaptureRegion":
    "Capture the screen area at {x}, {y}, {width} × {height} points and send the image to the agent's model.",
  "status.agent.screenCaptureProgress": "Asking to capture the screen…",
  "status.agent.screenCaptureReviewing": "Reviewing the screen capture…",
  "status.agent.remoteMessageApproval": "Send this message to {agent} on {server}, as you:\n\n{text}",
});
