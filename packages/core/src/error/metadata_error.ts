/*
 * ts-grm is a pure TypeScript database ORM built on type-level programming.
 * 
 * Design principles:
 * - Zero code generation, pure TypeScript type inference
 * - No entity object instantiation — maps database rows directly to DTOs
 * - No runtime reflection — performance on par with handwritten SQL
 * - Full type safety, full SQL features
 * - Like GraphQL, clients can query exact shape of data they need
 * - Like the inversed GraphQL, clients can save exact shape of data they need
 * 
 * @author 陈涛 (Chen Tao)
 */

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