import "./styles/_global.sass";
import "./styles/_typography.sass";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Home, Logs, NotFound, NewControlPage } from "./pages";
import SimulationPage from "./pages/simulation";
import NetworkPage from "./pages/network";
import CamerasPage from "./pages/cameras";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Home />,
	},
	{
		path: "/logs",
		element: <Logs />,
	},
	{
		path: "/new_control_page",
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

export const App = () => {
	return <RouterProvider router={router} />;
};
