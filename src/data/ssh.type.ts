interface EndSystem {
    ip: string,
    name: string,
    hostname: string,
    password: string
}

interface SSHCommands {
    device: EndSystem,
    commands: string[]
}

export type {EndSystem, SSHCommands}