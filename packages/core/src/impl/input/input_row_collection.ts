import { EntityProp } from "../entity_prop";
import { InputMetadata } from "./input_metadata";
import { createInputCtor, InputRow, InputRowCtor } from "./input_row";

export interface InputRowCollection {

    readonly metadata: InputMetadata;

    readonly rows: ReadonlyArray<InputRow>;

    readonly preCollections: ReadonlyArray<InputRowCollection>;

    readonly postCollections: ReadonlyArray<InputRowCollection>;
}

export function createInputCollection(
    metadata: InputMetadata,
    objs: ReadonlyArray<any>
): InputRowCollection {

    const preCollections: Array<InputRowCollection> = [];
    for (const preMetadata of metadata.preMetadatas) {
        const key = preMetadata.key;
        if (key === "SUPER") {
            const preCollection = createInputCollection(preMetadata, objs);
            preCollections.push(preCollection);
            continue;
        }
        
    }
    throw new Error();
}

class InputRowCollectionImpl implements InputRowCollection {

    private readonly _rows: Array<InputRow> = [];

    private readonly _postCollections: Array<InputRowCollection> = [];

    private readonly _rowCtor: InputRowCtor;

    constructor(
        readonly metadata: InputMetadata,
        readonly preCollections: ReadonlyArray<InputRowCollection>
    ) {
        this._rowCtor = createInputCtor(metadata);
    }

    get rows(): ReadonlyArray<InputRow> {
        return this._rows;
    }

    get postCollections(): ReadonlyArray<InputRowCollection> {
        return this._postCollections;
    }

    addRow(
        data: any, 
        parent: InputRow | undefined
    ) {
        const row = new this._rowCtor(data, parent);
        this._rows.push(row);
    }

    addPostCollection(
        index: number, 
        postCollection: InputRowCollection
    ) {
        this._postCollections[index] = postCollection;
    }
}