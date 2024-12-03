/*
Author: Giovanni Ranieri
Year: 2024
Description: Class defining a Service ROS to keep the current state of it. They are instantiate in 
the serviceHooks.ts. It uses Rules, which are a set of rules that say which subsystem can be activated
in terms of the one already activated.
*/

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

    /**
     * Return true if the state of the service can be changed with respect to another one
     * @param ser the other service
     * @param mode the mode
     */
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