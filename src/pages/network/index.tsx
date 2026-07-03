import styles from "./styles.module.sass";
import logo from "../../assets/images/logos/logo_XPlore.png";
import { XTerm } from 'react-xtermjs'

const MyTerminal = () => {
	const onData = (data: any) => {
	  console.log(`Received data: ${data}`)
	}
  
	const onResize = ({ cols, rows }: { cols: number; rows: number }) => {
	  console.log(`Terminal resized to ${cols} columns and ${rows} rows`)
	}
  
	return (
	  <XTerm
		options={{ cursorBlink: true }}
		style={{ width: '100%', height: '100%' }}
		listeners={{
		  onData,
		  onResize,
		}}
	  />
	)
  }

const NetworkPage = () => {
	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />
			</div>

			<MyTerminal />
		
    	</div>
	);
};



export default NetworkPage;
