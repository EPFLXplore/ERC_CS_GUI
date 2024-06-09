import { useState, useEffect } from "react";
import ROSLIB from 'roslib';

function useService(ros: ROSLIB.Ros | null) {
	useEffect(() => {
		if(ros) {
			
		}
	}, [ros]);

}

export default useService;
