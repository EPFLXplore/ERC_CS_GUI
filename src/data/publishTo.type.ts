/*
Author: Giovanni Ranieri
Year: 2023
Description: The gamepad can publish to one of these 3 subsystems.
*/

import SubSystems from "./subsystems.type"

export const PublishTo = {
    NAVIGATION: SubSystems.NAGIVATION,
    HANDLING_DEVICE: SubSystems.HANDLING_DEVICE,
    CAMERA_NAV: SubSystems.CAMERA
} as const;

export type PublishToType = typeof PublishTo[keyof typeof PublishTo];