// context/RoverControlsContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import useRoverControls from "./hooks/roverControlsHooks";
import useAlert from "./hooks/alertHooks";
import useRosBridge from "./hooks/rosbridgeHooks";

const RoverControlsContext = createContext<any | undefined>(undefined);

export const RoverControlsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snackbar, showSnackbar] = useAlert();
  const [ros, active] = useRosBridge(showSnackbar);
  const roverControls = useRoverControls(ros, showSnackbar);

  const value = useMemo(() => ({
    ros,
    active,
    snackbar,
    showSnackbar,
    roverControls
  }), [ros, active, snackbar, showSnackbar, roverControls]);

  return (
    <RoverControlsContext.Provider value={value}>
      {children}
    </RoverControlsContext.Provider>
  );
};

export const useRoverContext = () => {
  const ctx = useContext(RoverControlsContext);
  if (!ctx) throw new Error("useRoverContext must be used within RoverControlsProvider");
  return ctx;
};
