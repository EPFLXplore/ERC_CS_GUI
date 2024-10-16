import styles from "./styles.module.sass";
import Background from "../../components/ui/Background";
import Logo from "../../components/ui/Logo";
import { useNavigate } from "react-router-dom";
import { Size } from "../../data/size.type";

const NotFound = () => {
	const navigate = useNavigate();

	return (
		<div className="page">
			<Background />
			<div className={styles.icon} onClick={() => navigate("/")}>
				<Logo size={Size.SMALL} />
			</div>
			<div className={styles.error}>
				<h1>404</h1>
				<h3>Page not found in the control station. Ask NASA if they have it.</h3>
			</div>
		</div>
	);
};

export default NotFound;
