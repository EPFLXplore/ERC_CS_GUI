interface RulesRover {
    [name: string]: {
        data: any[];
        description: string;
    };
}

export type {RulesRover}

class Service {
    public name: string;
    public state: string;
    public rules: RulesRover[];

    constructor(name: string, state: string, rules: RulesRover[]) {
        this.name = name;
        this.state = state;
        this.rules = rules;
    }

    public canChange(ser: Service, mode: string): boolean {
        this.rules.forEach(obj => {
            for (const key in obj) {
                if(key === )
                const element = obj[key];

            }
        });
        if(this.rules.find(obj => subsystem === ser.name && ser.state !== val) !== undefined) {
            return false;
        }
        return true;
    }
}

export {Service};