interface CameraElement {
	name: string;
	states: {}
}

type CameraType = { [key: string]: CameraElement };


export type {CameraElement, CameraType}