/*
Author: Giovanni Ranieri
Year: 2024
Description: Types and interfaces for the SSH connection to start and stop dockers from the CS
*/

interface EndSystem {
    ip: string,
    name: string,
    hostname: string,
    password: string
}

interface SSHCommands {
    device: EndSystem,
    commands: string[],
    /**
     * Allocate a pseudo-terminal for the command.
     *
     * Needed by scripts that run `docker run -it`, which fail with "the input device is not a TTY"
     * over a plain exec channel. Off by default: a PTY merges stderr into stdout, so commands that
     * do not need one stay easier to diagnose without it.
     */
    pty?: boolean,
}

type Connection = { [key: string]: string }

export type {EndSystem, SSHCommands, Connection}