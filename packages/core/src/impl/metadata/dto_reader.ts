import { DtoMapper } from "./dto_mapper";

export class DtoReader {

    private readonly _create: Function;

    constructor(readonly mapper: DtoMapper) {
        this._create = function() {}
    }

    private _createCreate() {
        
    }
}