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
    commands: ['cd /home/xplore-hd/Documents/ERC_HD/docker_humble_jetson', './run_motors.sh']
};

const StopHdMotorControl: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_HD/docker_humble_jetson', './stop_motors.sh']
};

const ActivateHdStack: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_HD/docker_humble_jetson', './erc_run_hd_stack.sh']
};

// Stops the FSM and other stuff. 
const StopHdStack: SSHCommands = {
    device: JETSON_HD,
    commands: ['cd /home/xplore-hd/Documents/ERC_HD/docker_humble_jetson', './erc_stop_hd_stack.sh']
};

// The entry point is the wrapper in the home directory, not the script it forwards to under
// Documents/Avionics_ROS/2026/docker. Invoking the inner one directly is what "Start Avionics"
// used to do, and it did not bring avionics up.
//
// pty: the script ends in `docker run -it`, which aborts with "the input device is not a TTY"
// without one. The drill/HD/NAV scripts do not need it, so it stays opt-in.
const ActivateElecStack: SSHCommands = {
    device: RPI_ELEC,
    commands: ['/home/xplore-avionics/erc_run_avionics.sh'],
    pty: true
};

// Stops the FSM and other stuff. 
const StopElecStack: SSHCommands = {
    device: RPI_ELEC,
    commands: ['cd /home/xplore-avionics/Documents/Avionics_ROS/2026/docker', './erc_stop_avionics.sh']
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
        name: "Start Manual Nav no IMU",
        action: ActivateWheelsControl,
    },
    {
        name: "Stop Nav",
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

/** One SSH command's outcome, as reported by ssh_backend's /ssh-result/:id. */
interface SSHResult {
    running: boolean;
    exitCode: number | null;
    signal: string | null;
    error: string | null;
    stdout: string;
    stderr: string;
    command: string;
}

const SSH_POLL_INTERVAL_MS = 500;
/** Long enough for a docker image to come up on the RPi. */
const SSH_MAX_WAIT_MS = 120000;

/** First non-empty line, for a snackbar that has room for one. */
const firstLine = (text: string): string =>
    text.split("\n").map((line) => line.trim()).filter(Boolean)[0] ?? "";

/** Polls until the command finishes. Returns null if it is still running at the cap. */
const waitForSSHResult = async (connectionID: string): Promise<SSHResult | null> => {
    const deadline = Date.now() + SSH_MAX_WAIT_MS;

    while (Date.now() < deadline) {
        try {
            const { data } = await axios.get<SSHResult>(
                `http://localhost:5000/ssh-result/${connectionID}`
            );
            if (!data.running) return data;
        } catch (error) {
            // The result endpoint is missing on an older ssh_backend; fall back to the previous
            // fire-and-forget behaviour rather than blocking the operator.
            console.warn("[ssh] result endpoint unavailable:", error);
            return null;
        }
        await sleep(SSH_POLL_INTERVAL_MS);
    }

    return null;
};

const executeSSHCommand = async (command: SSHCommands, snackBar: (severity: AlertColor, message: string) => void,
            name: string, resetLeds: () => void) => {

    if(name === "Stop Avionics") {
        resetLeds()
    }

    let connectionID: string;

    try {
        const { data } = await axios.post('http://localhost:5000/ssh', {
            host: command.device.ip,
            username: command.device.hostname,
            password: command.device.password,
            commands: command.commands,
            pty: command.pty === true,
            name: name
        })
        connectionID = data.connectionID
    } catch (error) {
        snackBar('error', `${name}: could not reach the SSH backend — ${String(error)}`)
        return
    }

    IDConnections[name] = connectionID
    snackBar('info', `${name}: running on ${command.device.name}…`)

    const result = await waitForSSHResult(connectionID)

    if (!result) {
        // Do not close the connection here: the command may still be running, and ending the
        // channel would take the remote process with it. This is what the old fixed 10 s
        // `sleep` then `closeSSH` did on every slow script.
        snackBar('warning', `${name}: still running on ${command.device.name}; check the CS terminal for [ssh] logs`)
        return
    }

    if (result.error) {
        snackBar('error', `${name} failed on ${command.device.name}: ${result.error}`)
    } else if (result.exitCode !== 0) {
        const detail = firstLine(result.stderr) || firstLine(result.stdout) || "no output"
        snackBar('error', `${name} exited ${result.exitCode} on ${command.device.name}: ${detail}`)
    } else {
        snackBar('success', `${name} OK on ${command.device.name}`)
    }

    closeSSH(name, connectionID)
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

export {executeSSHCommand, ActivateRoverNode, ActivateHdMotorControl, StopHdMotorControl, CommandsSSH, closeSSH, IDConnections}
export type {SSHCommands}
const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))
