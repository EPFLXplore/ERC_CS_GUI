/*
Author: Giovanni Ranieri
Year: 2024
Description: Class defining an Action ROS to keep the current state of it. They are instantiate in 
the actionHooks.ts. 
*/

class Action {
    public name: string;
    public state: string;
    public path_action: string;
    public name_action_file: string;

    constructor(name: string, state: string, path_action: string, name_action_file: string) {
        this.name = name;
        this.state = state;
        this.path_action = path_action
        this.name_action_file = name_action_file
    }
}

export default Action;