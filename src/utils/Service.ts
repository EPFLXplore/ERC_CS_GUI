interface RuleRover {
    [name: string]: {
        new_mode: string[];
        state_sys: string;
    };
}

export type {RuleRover}

class Service {
    public name: string;
    public state: string;
    public rules: RuleRover[];

    constructor(name: string, state: string, rules: RuleRover[]) {
        this.name = name;
        this.state = state;
        this.rules = rules;
    }

    public canChange(ser: Service, mode: string): boolean {
        this.rules.forEach(obj => {
            for (const key in obj) {
                if(key === ser.name) {
                    const element = obj[key];
                    console.log(ser.state)
                    console.log(element.state_sys)
                    if(element.new_mode.find(sys => sys === mode) !== undefined && ser.state !== element.state_sys) {
                        return false
                    }
                }
            }
        });
        return true
    }
}

export {Service};