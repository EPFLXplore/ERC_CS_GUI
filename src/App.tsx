import "./styles/_global.sass";
import "./styles/_typography.sass";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Home, Logs, NotFound, NewControlPage } from "./pages";

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
		path: "*",
		element: <NotFound />,
	},
]);

export const App = () => {
	return <RouterProvider router={router} />;
};
