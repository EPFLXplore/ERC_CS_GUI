import axios from "axios"
import { AlertColor } from "@mui/material"
import { SSHCommands, EndSystem } from "../data/ssh.type"


const RPI_ROVER_DRILL: EndSystem = {
    ip: '169.254.55.251',
    hostname: 'xplore',
    password: 'xplore',
    name: 'RPI Rover/Drill'
}

const RPI_CAMS: EndSystem = {
    ip: '169.254.55.240',
    hostname: 'xplore',
    password: 'xplore',
    name: 'RPI Cams'
}

// Inside each run file, there is a check if the docker is already running. If yes, then nothing is run
// and a message will be printed on the screen.

const ActivateRoverNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
    commands: ['cd /home/xplore/ERC_CS_Rover/docker_humble_jetson', './run_rover.sh']
};

const ActivateCameraNode: SSHCommands = {
    device: RPI_CAMS,
    commands: ['cd /home/xplore/ERC_CS_Rover/docker_humble_jetson', './run_cameras.sh']
};

const ActivateDrillNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
    commands: ['cd /home/xplore/ERC_SC_Drill/docker_humble_jetson', './run_drill.sh']
};

const StopDrillNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
    commands: ['docker stop sc_humble_jetson']
};

const StopRoverNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
    commands: ['docker stop rover_humble_jetson']
};

const StopCameraNode: SSHCommands = {
    device: RPI_CAMS,
    commands: ['docker stop rover_humble_jetson']
};

const CommandsSSH = {
    "rpi_rover_drill": [
    {
        name: "Start Rover Node",
        action: ActivateRoverNode,
    },
    {
        name: "Stop Rover Node",
        state_name: "Rover",
        action: StopRoverNode,
    },
    {
        name: "Start Drill Node",
        action: ActivateDrillNode,
    },
    {
        name: "Stop Drill Node",
        action: StopDrillNode,
    }],

    "rpi_cameras_cs": [
    {
        name: "Start Camera Node",
        action: ActivateCameraNode,
    },
    {
        name: "Stop Camera Node",
        action: StopCameraNode,
    }]
};

const executeSSHCommand = async (command: SSHCommands, snackBar: (severity: AlertColor, message: string) => void) => {

    await axios.post('http://localhost:5000/ssh', {
        host: command.device.ip, 
        username: command.device.hostname,
        password: command.device.password,
        commands: command.commands,
    })
    .then(data => {
        let connectionID = data.data.connectionID
        snackBar('success', "SSH command to " + command.device.name + ": " + connectionID)
        //@ts-ignore
        //closeSSH(connectionID)
    })
    .catch(error => {
        snackBar('error', error)
    })
    
}

const closeSSH = async (id: string) => {
    const response = await axios.get(`http://localhost:5000/close-connection/${id}`)
}

export {executeSSHCommand, ActivateRoverNode, CommandsSSH, closeSSH}
export type {SSHCommands}