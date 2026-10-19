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

import { EntityProp } from "../entity_prop";
import { InputMetadata } from "./input_metadata";
import { getInputCtor, InputRow, InputRowCtor } from "./input_row";

export interface InputRowCollection {

    readonly metadata: InputMetadata;

    readonly rows: ReadonlyArray<InputRow>;

    readonly preCollections: ReadonlyArray<InputRowCollection>;

    readonly postCollections: ReadonlyArray<InputRowCollection>;

    toJSON(): any;
}

export function createInputCollection(
    metadata: InputMetadata,
    objs: ReadonlyArray<any>
): InputRowCollection {
    const rowCtor = getInputCtor(metadata);
    const items: ReadonlyArray<InputRowItem> = objs.map(o => {
        return {
            data: o,
            parent: undefined,
            preIndex: undefined
        }
    })
    return createInputCollectionImpl(undefined, rowCtor, metadata, items);
}

function createInputCollectionImpl(
    parent: InputRowCollectionImplementor | undefined,
    rowCtor: InputRowCtor,
    metadata: InputMetadata,
    items: ReadonlyArray<InputRowItem>
): InputRowCollectionImplementor {
    const collection = new InputRowCollectionImpl(parent, rowCtor, metadata);
    for (const item of items) {
        collection.add(item);
    }
    collection.preCollections.push(...createPreCollections(collection, metadata));
    collection.postCollections.push(...createPostCollections(collection, metadata));
    return collection;
}

function createPreCollections(
    collection: InputRowCollectionImplementor,
    metadata: InputMetadata
): ReadonlyArray<InputRowCollection> {
    if (collection.rows.length === 0) {
        return [];
    }
    const preCollections: Array<InputRowCollection> = [];
    const preMetadatas = metadata.preMetadatas;
    for (let i = 0; i < preMetadatas.length; i++) {
        const preMetadata = preMetadatas[i]!;
        const index = i;
        const preCollectionCreator: InputRowCollectionCreator = () => {
            const preRowCtor = preMetadata != null ? getInputCtor(preMetadata) : collection.rowCtor;
            const key = preMetadata?.key ?? metadata.key;
            const preItems: Array<InputRowItem> = [];
            if (key === "SUPER") {
                for (const row of collection.rows) {
                    preItems.push({
                        data: row.data,
                        parent: row,
                        preIndex: index
                    });
                }
            } else {
                for (const row of collection.rows) {
                    const pre = (collection.rowCtor as any).pre(row.data, index);
                    if (pre != null) {
                        preItems.push({
                            data: pre,
                            parent: row,
                            preIndex: index
                        });
                    }
                }
            }
            return createInputCollectionImpl(collection, preRowCtor, preMetadata ?? metadata, preItems);
        };
        // preCollections.push(preCollectionCreator());
        preCollections.push(new LazyInputRowCollectionImpl(preCollectionCreator));
    }
    return preCollections;
}

function createPostCollections(
    collection: InputRowCollectionImplementor,
    metadata: InputMetadata
): ReadonlyArray<InputRowCollection> {
    if (collection.rows.length === 0) {
        return [];
    }
    const postCollections: Array<InputRowCollection> = [];
    const postMetadatas = metadata.postMetadatas;
    for (let i = 0; i < postMetadatas.length; i++) {
        const postMetadata = postMetadatas[i];
        const index = i;
        const postCollectionCreator: InputRowCollectionCreator = () => {
            const postRowCtor = postMetadata != null 
                ? getInputCtor(postMetadata) 
                : metadata.isUnderMiddleTable 
                    ? collection.parent!.rowCtor
                    : collection.rowCtor;
            const postItems: Array<InputRowItem> = [];
            for (const row of collection.rows) {
                const post = (collection.rowCtor as any).post(row.data, index);
                if (Array.isArray(post)) {
                    for (const e of post) {
                        postItems.push({
                            data: e,
                            parent: row,
                            preIndex: undefined
                        });
                    }
                } else if (post != null) {
                    postItems.push({
                        data: post,
                        parent: row,
                        preIndex: undefined
                    });
                }
            }
            return createInputCollectionImpl(
                collection, 
                postRowCtor, 
                postMetadata ?? (metadata.isUnderMiddleTable ? metadata.parent! : metadata), 
                postItems
            );
        };
        postCollections.push(new LazyInputRowCollectionImpl(postCollectionCreator));
    }
    return postCollections;
}

interface InputRowItem {
    readonly data: any;
    readonly parent: InputRow | undefined;
    readonly preIndex: number | undefined;
}

interface InputRowCollectionImplementor extends InputRowCollection {

    readonly parent: InputRowCollectionImplementor | undefined;
    
    readonly rowCtor: InputRowCtor;

    readonly preCollections: ReadonlyArray<InputRowCollection>;

    readonly postCollections: ReadonlyArray<InputRowCollection>;

    load(): void;
}

class InputRowCollectionImpl implements InputRowCollectionImplementor {

    private readonly _rows: Array<InputRow> = [];

    readonly preCollections: Array<InputRowCollection> = [];
        
    readonly postCollections: Array<InputRowCollection> = [];

    constructor(
        readonly parent: InputRowCollectionImplementor | undefined,
        readonly rowCtor: InputRowCtor,
        readonly metadata: InputMetadata
    ) {}

    get rows(): ReadonlyArray<InputRow> {
        return this._rows;
    }

    add(
        item: InputRowItem
    ) {
        const row = new this.rowCtor(item.data, item.parent);
        this._rows.push(row);
        if (item.preIndex != null) {
            (item.parent! as any)._setPreRow(item.preIndex, row);
        }
    }

    toJSON() {
        this.load();
        const json = {
            rows: this.rows.map(r => r.toJSON())
        };
        const json1 = this.metadata.key instanceof EntityProp 
            ? {...json, prop: this.metadata.key.toString()}
            : json;
        const json2 = this.preCollections.length !== 0 
            ? {...json1, preCollections: this.preCollections.map(c => c.toJSON())}
            : json1;
        const json3 = this.postCollections.length !== 0
            ? {...json2, postCollections: this.postCollections.map(c => c.toJSON())}
            : json2;
        return json3;
    }

    load() {
        for (const preCollection of this.preCollections) {
            (preCollection as InputRowCollectionImplementor).load();
        }
        for (const postCollection of this.postCollections) {
            (postCollection as InputRowCollectionImplementor).load();
        }
    }
}

type InputRowCollectionCreator = () => InputRowCollectionImplementor;

class LazyInputRowCollectionImpl implements InputRowCollectionImplementor {

    private _raw: InputRowCollectionImplementor | undefined;

    constructor(
        private readonly _creator: InputRowCollectionCreator
    ) {}

    private get raw(): InputRowCollectionImplementor {
        let raw = this._raw;
        if (raw == null) {
            this._raw = raw = this._creator();
        }
        return raw;
    }

    get metadata(): InputMetadata {
        return this.raw.metadata;
    }

    get rows(): ReadonlyArray<InputRow> {
        return this.raw.rows;
    }

    get preCollections(): ReadonlyArray<InputRowCollection> {
        return this.raw.preCollections;
    }

    get postCollections(): ReadonlyArray<InputRowCollection> {
        return this.raw.postCollections;
    }

    toJSON(): any {
        this.load();
        return this.raw.toJSON();
    }

    load() {
        for (const preCollection of this.preCollections) {
            (preCollection as InputRowCollectionImplementor).load();
        }
        for (const postCollection of this.postCollections) {
            (postCollection as InputRowCollectionImplementor).load();
        }
        this.raw;
    }

    get parent(): InputRowCollectionImplementor | undefined {
        return this.raw.parent;
    }

    get rowCtor(): InputRowCtor {
        return this.raw.rowCtor;
    }
}