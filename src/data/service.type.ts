interface RuleRover {
    name: string,
    new_mode: string[];
    state_sys: string;
}

export type {RuleRover}

class Service {
    public name: string;
    public state: string;
    public rules: RuleRover[];
    public isMultipleStates: boolean;
    public multipleStates: string[];

    constructor(name: string, state: string, rules: RuleRover[], isMultipleStates: boolean) {
        this.name = name;
        this.state = state;
        this.rules = rules;
        this.isMultipleStates = isMultipleStates;
        this.multipleStates = [];
    }

    public canChange(ser: Service, mode: string): boolean {
        for(let i = 0; i < this.rules.length; i++) {
            const obj = this.rules[i]
            if(obj.name === ser.name) {
                if(obj.new_mode.find(sys => sys === mode) !== undefined) {
                    if(ser.state !== obj.state_sys) {
                        return false
                    }
                }
            }
        }
        return true
    }
}

export {Service};