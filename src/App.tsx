import "./styles/_global.sass";
import "./styles/_typography.sass";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Home, NotFound, NewControlPage } from "./pages";
import { RoverControlsProvider } from "./roverControlsContext";
import SimulationPage from "./pages/simulation";
import NetworkPage from "./pages/network";
import CamerasPage from "./pages/cameras";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Home />,
	},
	// {
	// 	path: "/logs",
	// 	element: <Logs />,
	// },
	{
		path: "/control",
		element: <NewControlPage />,
	},
	{
		path: "/simulation",
		element: <SimulationPage />,
	},
	{
		path: "/network",
		element: <NetworkPage />,
	},
	{
		path: "/cameras",
		element: <CamerasPage />,
	},
	{
		path: "*",
		element: <NotFound />,
	},
]);

export const App = () => (
  <RoverControlsProvider>
    <RouterProvider router={router} />
  </RoverControlsProvider>
);
