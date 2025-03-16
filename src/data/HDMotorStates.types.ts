/*
Author: Giovanni Ranieri
Year: 2025
Description: States of the Motors HD from the ETH Library
*/
enum HDMotorStates {
    NotReadyToSwitchOn = "NotReadyToSwitchOn",
    SwitchOnDisabled = "SwitchOnDisabled",
    ReadyToSwitchOn = "ReadyToSwitchOn",
    SwitchedOn = "SwitchedOn",
    OperationEnabled = "OperationEnabled",
    QuickStopActive = "QuickStopActive",
    FaultReactionActive = "FaultReactionActive",
    Fault = "Fault",
    NA = "NA"
}

export default HDMotorStates;