import axios from "axios"
import { AlertColor } from "@mui/material"
import { SSHCommands, EndSystem, Connection } from "../data/ssh.type"


const RPI_ROVER_DRILL: EndSystem = {
    ip: '169.254.55.240',
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

const RPI_ELEC: EndSystem = {
    ip: '169.254.55.252',
    hostname: 'xplore-avionics',
    password: 'xplore',
    name: 'RPI Elec'
}

// Inside each run file, there is a check if the docker is already running. If yes, then nothing is run
// and a message will be printed on the screen.

const ActivateRoverNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
    commands: ['cd /home/xplore/ERC_CS_Rover/docker_humble_jetson', './run_rover.sh']
};

const ActivateDrillNode: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_SC_Drill/docker_humble_jetson', './run_drill.sh']
};

const StopDrillNode: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_SC_Drill/docker_humble_jetson', './stop_docker_drill.sh']
};

const StopRoverNode: SSHCommands = {
    device: RPI_ROVER_DRILL,
    commands: ['cd /home/xplore/ERC_CS_Rover/docker_humble_jetson', './stop_docker_rover.sh']
};

const ActivateWheelsControl: SSHCommands = {
    device: JETSON_NAV,
    commands: ['cd /home/xplore-nav/Documents/ERC_NAV/docker_humble_jetson', './run_wheels_control.sh']
};

const StopWheelsControl: SSHCommands = {
    device: JETSON_NAV,
    commands: ['cd /home/xplore-nav/Documents/ERC_NAV/docker_humble_jetson', './stop_docker_nav.sh']
};

const ActivateHdMotorControl: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_HD/debug_torch', './run_motors.sh']
};

const StopHdMotorControl: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_HD/debug_torch', './stop_motors.sh']
};

const ActivateHdStack: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_HD/docker_humble_jetson', './run_hd_stack.sh']
};

// Stops the FSM and other stuff. 
const StopHdStack: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_HD/debug_torch', './stop_hd_stack.sh']
};

const ActivateElecStack: SSHCommands = {
    device: RPI_ELEC,
    commands: ['cd /home/xplore-avionics/Documents/ERC_EL_BroCo/src/docker_humble_jetson', './start_elec_stack.sh']
};

// Stops the FSM and other stuff. 
const StopElecStack: SSHCommands = {
    device: RPI_ELEC,
    commands: ['cd /home/xplore-avionics/Documents/ERC_EL_BroCo/src/docker_humble_jetson', './stop_elec_stack.sh']
};

const CommandsSSH = {
    "science": [
    {
        name: "Start Drill",
        action: ActivateDrillNode,
    },
    {
        name: "Stop Drill",
        action: StopDrillNode,
    }],
    "avionics": [
    {
        name: "Start Avionics",
        action: ActivateElecStack,
    },
    {
        name: "Stop Avionics",
        action: StopElecStack,
    }],
    "rover": [
    {
        name: "Start Rover",
        action: ActivateRoverNode,
    },
    {
        name: "Stop Rover",
        action: StopRoverNode,
    }],

    "nav": [
    {
        name: "Start Wheels Control",
        action: ActivateWheelsControl,
    },
    {
        name: "Stop Wheels Control",
        action: StopWheelsControl,
    }],

    "hd": [
    {
        name: "Start HD Stack",
        action: ActivateHdStack,
    },
    {
        name: "Stop HD Stack",
        action: StopHdStack,
    },
    ]
};

let IDConnections: Connection = {}

const executeSSHCommand = async (command: SSHCommands, snackBar: (severity: AlertColor, message: string) => void, 
            name: string) => {
    
    await axios.post('http://169.254.55.178:5000/ssh', {
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
    await axios.get(`http://169.254.55.178:5000/close-connection/${id}`)
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