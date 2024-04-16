import "./styles/_global.sass";
import "./styles/_typography.sass";

import { Provider } from "react-redux";
import store from "./redux";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import {
	Home,
	Menu,
	Navigation,
	HandlingDevice,
	Science,
	Camera,
	Logs,
	NotFound,
	Drill,
	New_control_page,
	Simulation,
} from "./pages";
import { Mode } from "./utils/mode.type";
import Manual from "./pages/manual";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Home />,
	},
	{
		path: "/menu",
		element: <Menu />,
	},
	{
		path: "/navigation/auto",
		element: <Navigation mode={Mode.AUTONOMOUS} />,
	},
	{
		path: "/navigation/semi-auto",
		element: <Navigation mode={Mode.SEMI_AUTONOMOUS} />,
	},
	{
		path: "/manual-control",
		element: <Manual />,
	},
	{
		path: "/handlingDevice/auto",
		element: <HandlingDevice mode={Mode.AUTONOMOUS} />,
	},
	// {
	// 	path: "/handlingDevice/manual",
	// 	element: <HandlingDevice mode={Mode.MANUAL} />,
	// },
	{
		path: "/science/data",
		element: <Science />,
	},
	{
		path: "/science/drill",
		element: <Drill />,
	},
	{
		path: "/camera",
		element: <Camera />,
	},
	{
		path: "/logs",
		element: <Logs />,
	},
	{
		path: "/new_control_page",
		element: <New_control_page />,
	},
	{
		path: "/simulation",
		element: <Simulation />,
	},
	{
		path: "*",
		element: <NotFound />,
	},
]);

export const App = () => {
	//const [userCount] = useSession();

	return (
		<Provider store={store}>
			<RouterProvider router={router} />
		</Provider>
	);
};
