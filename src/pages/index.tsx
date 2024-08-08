/***
 * This file is used to export all the pages in the application.
 * This is done to make it easier to import pages in other files.
 */

import Home from "./home";
import Logs from "./logs";
import NotFound from "./notFound";
import NewControlPage from "./new_control_page";

export const DefaultPage = () => <Home />;

export { Home, Logs, NotFound, NewControlPage };
