import { GrmError } from "./grm_error";

export class ArgumentError extends GrmError {

    constructor(message: string) {
        super(message);
        this.name = "ARGUMENT_ERROR";
    }
}

export class StateError extends GrmError {

    constructor(message: string) {
        super(message);
        this.name = "STATE_ERROR";
    }
}