import axios from "axios"
import { AlertColor } from "@mui/material"
import { SSHCommands, EndSystem, Connection } from "../data/ssh.type"


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

const JETSON_NAV: EndSystem = {
    ip: '169.254.55.230',
    hostname: 'xplore',
    password: 'xplore',
    name: 'Jetson NAV'
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
    commands: ['cd /home/xplore/ERC_CS_Rover/docker_humble_jetson', './stop_docker_rover.sh']
};

const StopCameraNode: SSHCommands = {
    device: RPI_CAMS,
    commands: ['docker stop rover_humble_jetson']
};

const ActivateWheelsControl: SSHCommands = {
    device: JETSON_NAV,
    commands: ['cd /home/xplore/Desktop/ERC_NAV/docker_humble_jetson', './run_wheels_control.sh']
};

const StopWheelsControl: SSHCommands = {
    device: JETSON_NAV,
    commands: ['cd /home/xplore/Desktop/ERC_NAV/docker_humble_jetson', './stop_docker_nav.sh']
};

const CommandsSSH = {
    "rpi_rover_drill": [
    {
        name: "Start Rover Node",
        action: ActivateRoverNode,
    },
    {
        name: "Stop Rover Node",
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
    }],

    "jetson_xavier": [
    {
        name: "Start Wheels Control",
        action: ActivateWheelsControl,
    },
    {
        name: "Stop Wheels Control",
        action: StopWheelsControl,
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

const closeSSH = async (name: string, id: string) => { // statusToRemove: (remove: string) => void
    await axios.get(`http://localhost:5000/close-connection/${id}`)
    .then(data => {
        if(data.data.status) {
            //statusToRemove(IDConnections[name])
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

/*
try {
      const response = await axios.post('http://your-server.com/execute-command', {
        host: 'example.com',
        username: 'user',
        password: 'password',
        commands: ['ls', 'pwd'], // Example commands
      }, {
        responseType: 'stream', // Important for receiving the response as a stream
      });

      const reader = response.data.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        setOutput(prevOutput => prevOutput + decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      console.error('Error executing SSH command:', error);
    }
  };
*/