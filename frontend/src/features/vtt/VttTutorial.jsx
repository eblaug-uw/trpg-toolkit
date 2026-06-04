import { useState } from "react";

// DM 79: Steps for the first-time VTT map upload tutorial.
const tutorialSteps = [
  {
    title: "Open the VTT tools",
    text: "Click the settings icon in the bottom-right corner of the VTT.",
  },
  {
    title: "Open the tool menu",
    text: "Hover over the plus button to show the available tools.",
  },
  {
    title: "Upload your map",
    text: "Click the image icon, choose the Maps bucket, select your map file, and click Upload.",
  },
  {
    title: "Open map backgrounds",
    text: "Hover over the plus button again, then click the folded map icon.",
  },
  {
    title: "Set the background",
    text: "Select your uploaded map from the Set Map Background window. The map will become the VTT background.",
  },
];

function VttTutorial({ onClose }) {
  // Track which tutorial step is currently being shown.
  const [stepIndex, setStepIndex] = useState(0);

  // Get the current tutorial step from the list above.
  const currentStep = tutorialSteps[stepIndex];

  // These values control when Back is disabled and when Next becomes Got It.
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === tutorialSteps.length - 1;

  function handleNext() {
    // If the user is on the last step, close the tutorial.
    if (isLastStep) {
      onClose();
      return;
    }

    // Otherwise, move forward one step.
    setStepIndex((currentIndex) => currentIndex + 1);
  }

  function handleBack() {
    // Only move backward if the user is not already on the first step.
    if (!isFirstStep) {
      setStepIndex((currentIndex) => currentIndex - 1);
    }
  }

  return (
    // Full-screen overlay that appears on top of the VTT.
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Centered tutorial card. */}
      <div
        style={{
          width: "420px",
          maxWidth: "100%",
          background: "#2a3439",
          color: "white",
          border: "1px solid #555",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Shows the current step number. */}
        <p style={{ margin: "0 0 8px", color: "#bbb", fontSize: "0.9rem" }}>
          Step {stepIndex + 1} of {tutorialSteps.length}
        </p>

        {/* Tutorial step title. */}
        <h2 style={{ margin: "0 0 12px" }}>{currentStep.title}</h2>

        {/* Tutorial step instructions. */}
        <p style={{ margin: "0 0 24px", lineHeight: 1.5 }}>{currentStep.text}</p>

        {/* Bottom row of tutorial controls. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          {/* Lets the user leave the tutorial at any time. */}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #666",
              background: "#333",
              color: "white",
              cursor: "pointer",
            }}
          >
            Skip
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            {/* Goes back one step. Disabled on the first step. */}
            <button
              type="button"
              onClick={handleBack}
              disabled={isFirstStep}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #666",
                background: isFirstStep ? "#555" : "#333",
                color: "white",
                cursor: isFirstStep ? "not-allowed" : "pointer",
              }}
            >
              Back
            </button>

            {/* Goes to the next step or closes the tutorial on the last step. */}
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: "#4a6fa5",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {isLastStep ? "Got It" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VttTutorial;
