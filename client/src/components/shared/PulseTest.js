import React from "react";
import AnimatedProgressBar from "./AnimatedProgressBar";

// Test component to verify pulse animation
const PulseTest = () => {
  return (
    <div className="container mt-4">
      <h3 className="mb-4">Pulse Animation Test</h3>

      <div className="row mb-4">
        <div className="col-md-6">
          <h5>Success Progress (Should pulse)</h5>
          <AnimatedProgressBar
            value={75}
            variant="success"
            height="20px"
            animated={true}
            showLabel={true}
            showSyncStatus={true}
            dataType="all"
            className="mb-3"
          />
        </div>

        <div className="col-md-6">
          <h5>Warning Progress (Should pulse)</h5>
          <AnimatedProgressBar
            value={50}
            variant="warning"
            height="20px"
            animated={true}
            showLabel={true}
            showSyncStatus={true}
            dataType="all"
            className="mb-3"
          />
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <h5>Info Progress (Should pulse)</h5>
          <AnimatedProgressBar
            value={30}
            variant="info"
            height="20px"
            animated={true}
            showLabel={true}
            showSyncStatus={true}
            dataType="all"
            className="mb-3"
          />
        </div>

        <div className="col-md-6">
          <h5>Primary Progress (Should pulse)</h5>
          <AnimatedProgressBar
            value={90}
            variant="primary"
            height="20px"
            animated={true}
            showLabel={true}
            showSyncStatus={true}
            dataType="all"
            className="mb-3"
          />
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <h5>Non-Animated Progress (Should NOT pulse)</h5>
          <AnimatedProgressBar
            value={60}
            variant="secondary"
            height="20px"
            animated={false}
            showLabel={true}
            showSyncStatus={false}
            dataType="all"
            className="mb-3"
          />
        </div>
      </div>

      <div className="alert alert-info">
        <h6>What to look for:</h6>
        <ul>
          <li>
            Animated progress bars should have a continuous pulse effect
            (opacity and shadow changes)
          </li>
          <li>Non-animated progress bar should be static</li>
          <li>Sync status should show "Syncing..." or "Last sync: HH:MM:SS"</li>
          <li>Live indicator should be pulsing</li>
        </ul>
      </div>
    </div>
  );
};

export default PulseTest;
