class Service {
    public name: string;
    public state: string;
    public rules: [string, boolean][];

    constructor(name: string, state: string, rules: [string, boolean][]) {
        this.name = name;
        this.state = state;
        this.rules = rules;
    }

    public check(action: string): boolean {
        if(this.rules.find(([subsystem, val]) => subsystem === action && val === false) !== undefined) {
            return false;
        }
        return true;
    }
}

export default Service;