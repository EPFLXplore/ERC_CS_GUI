/*
Author: Ugo Balducci
Year: 2023
Description: Class that defines a 2D pose. Used for creating the navigation goal when you click on the map
*/

export class Pose2D {
    public x: number;
    public y: number;
    public theta: number;

    constructor(x: number, y: number, theta: number) {
        this.x = x;
        this.y = y;
        this.theta = theta;
    }
}