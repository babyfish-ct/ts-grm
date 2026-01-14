import { GrmError } from "./grm_error";

export abstract class MetadataError extends GrmError {

    constructor(message: string) {
        super(message);
    }
}

export class ModelError extends MetadataError {

    constructor(readonly modelName: string, message: string) {
        super(`[Illegal model "${modelName}"]: ${message}`);
        this.name = "MODEL_ERROR";
    }
}

export class PropError extends MetadataError {

    constructor(
        readonly modelName: string, 
        readonly propName: string, 
        message: string
    ) {
        super(`[Illegal property "${modelName}.${propName}"]: ${message}`);
        this.name = "PROP_ERROR";
    }
}