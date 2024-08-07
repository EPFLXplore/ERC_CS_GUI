import "./styles/_global.sass";
import "./styles/_typography.sass";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Home, Logs, NotFound, New_control_page } from "./pages";
import { Mode } from "./utils/mode.type";

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
		element: <New_control_page />,
	},
	{
		path: "*",
		element: <NotFound />,
	},
]);

export const App = () => {
	//const [userCount] = useSession();

	return <RouterProvider router={router} />;
};
