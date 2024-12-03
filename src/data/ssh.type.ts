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
}

type Connection = { [key: string]: string }

export type {EndSystem, SSHCommands, Connection}