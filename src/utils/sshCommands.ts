import axios from "axios"
import { AlertColor } from "@mui/material"
import { SSHCommands, EndSystem, Connection } from "../data/ssh.type"


const RPI_ROVER_DRILL: EndSystem = {
    ip: '169.254.55.251',
    hostname: 'xplore',
    password: 'xplore',
    name: 'RPI Rover/Drill'
}

const JETSON_NAV: EndSystem = {
    ip: '169.254.55.231',
    hostname: 'xplore-nav',
    password: 'xplore',
    name: 'Jetson NAV'
}

const JETSON_HD: EndSystem = {
    ip: '169.254.55.230',
    hostname: 'xplore-hd',
    password: 'xplore',
    name: 'Jetson HD'
}

// Inside each run file, there is a check if the docker is already running. If yes, then nothing is run
// and a message will be printed on the screen.

const ActivateRoverNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
    commands: ['cd /home/xplore/ERC_CS_Rover/docker_humble_jetson', './run_rover.sh']
};

const ActivateCameraNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
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
    commands: ['cd /home/xplore/ERC_CS_Rover/docker_humble_jetson', './stop_docker_rover.sh']
};

const StopCameraNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
    commands: ['cd /home/xplore/ERC_CS_Rover/docker_humble_jetson', './stop_docker_cameras.sh']
};

const ActivateWheelsControl: SSHCommands = {
    device: JETSON_NAV,
    commands: ['cd /home/xplore/Documents/ERC_NAV/docker_humble_jetson', './run_wheels_control.sh']
};

const StopWheelsControl: SSHCommands = {
    device: JETSON_NAV,
    commands: ['cd /home/xplore/Documents/ERC_NAV/docker_humble_jetson', './stop_docker_nav.sh']
};

// Activates the FSM and other stuff
const ActivateHdMotorControl: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore/Documents/ERC_HD/docker_humble_jetson', './.sh']
};

// Stops the FSM and other stuff. 
const StopHdMotorControl: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore/Documents/ERC_HD/docker_humble_jetson', './.sh']
};

const CommandsSSH = {
    "drill": [
    {
        name: "Start Drill Node",
        action: ActivateDrillNode,
    },
    {
        name: "Stop Drill Node",
        action: StopDrillNode,
    }],
    "rover": [
    {
        name: "Start Camera Node",
        action: ActivateCameraNode,
    },
    {
        name: "Stop Camera Node",
        action: StopCameraNode,
    },
    {
        name: "Start Rover Node",
        action: ActivateRoverNode,
    },
    {
        name: "Stop Rover Node",
        action: StopRoverNode,
    }],

    "jetson_nav": [
    {
        name: "Start Wheels Control",
        action: ActivateWheelsControl,
    },
    {
        name: "Stop Wheels Control",
        action: StopWheelsControl,
    }],

    "jetson_hd": [
    {
        name: "Start HD Motors",
        action: ActivateHdMotorControl,
    },
    {
        name: "Stop HD Motors",
        action: StopHdMotorControl,
    }]
};

let IDConnections: Connection = {}

const executeSSHCommand = async (command: SSHCommands, snackBar: (severity: AlertColor, message: string) => void, 
            name: string) => {
    
    await axios.post('http://localhost:5000/ssh', {
        host: command.device.ip, 
        username: command.device.hostname,
        password: command.device.password,
        commands: command.commands,
        name: name
    })
    .then(async data => {
        let connectionID = data.data.connectionID
        snackBar('success', "SSH command to " + command.device.name + ": " + connectionID)

        IDConnections[name] = connectionID
        await sleep(10000)
        closeSSH(name, connectionID)
        
    })
    .catch(error => {
        snackBar('error', error)
    })
    
}

const closeSSH = async (name: string, id: string) => {
    await axios.get(`http://localhost:5000/close-connection/${id}`)
    .then(data => {
        if(data.data.status) {
            delete IDConnections[name]
        }
    })
    .catch(error => {
        console.log(error)  
    })
}

export {executeSSHCommand, ActivateRoverNode, CommandsSSH, closeSSH, IDConnections}
export type {SSHCommands}
const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))