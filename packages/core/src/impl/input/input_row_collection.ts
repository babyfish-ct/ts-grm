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

import { InputMetadata } from "./input_metadata";
import { createInputCtor, InputRow, InputRowCtor } from "./input_row";

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
    const rowCtor = createInputCtor(metadata);
    const items: ReadonlyArray<InputRowItem> = objs.map(o => {
        return {
            data: o,
            parent: undefined,
            preIndex: undefined
        }
    })
    return createInputCollectionImpl(rowCtor, metadata, items);
}

function createInputCollectionImpl(
    rowCtor: InputRowCtor,
    metadata: InputMetadata,
    items: ReadonlyArray<InputRowItem>
): InputRowCollection {
    const collection = new InputRowCollectionImpl(rowCtor, metadata);
    for (const item of items) {
        collection.add(item);
    }
    collection.preCollections = createPreCollections(collection, metadata);
    collection.postCollections = createPostCollections(collection, metadata);
    return collection;
}

function createPreCollections(
    collection: InputRowCollectionImpl,
    metadata: InputMetadata
): ReadonlyArray<InputRowCollection> {
    const preCollections: Array<InputRowCollection> = [];
    const preMetadatas = metadata.preMetadatas;
    for (let i = 0; i < preMetadatas.length; i++) {
        const preMetadata = preMetadatas[i]!;
        const preRowCtor = createInputCtor(preMetadata);
        const key = preMetadata.key;
        const preItems: Array<InputRowItem> = [];
        if (key === "SUPER") {
            for (const row of collection.rows) {
                preItems.push({
                    data: row.data,
                    parent: row,
                    preIndex: i
                });
            }
        } else {
            for (const row of collection.rows) {
                const pre = (collection.rowCtor as any).pre(row.data, i);
                if (pre != null) {
                    preItems.push({
                        data: pre,
                        parent: row,
                        preIndex: i
                    });
                }
            }
        }
        const preCollection = createInputCollectionImpl(preRowCtor, preMetadata, preItems);
        preCollections.push(preCollection);
    }
    return preCollections;
}

function createPostCollections(
    collection: InputRowCollectionImpl,
    metadata: InputMetadata
): ReadonlyArray<InputRowCollection> {
    const postCollections: Array<InputRowCollection> = [];
    const postMetadatas = metadata.postMetadatas;
    for (let i = 0; i < postMetadatas.length; i++) {
        const postMetadata = postMetadatas[i]!;
        const postRowCtor = createInputCtor(postMetadata);
        const postItems: Array<InputRowItem> = [];
        for (const row of collection.rows) {
            const post = (collection.rowCtor as any).post(row.data, i);
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
        const preCollection = createInputCollectionImpl(postRowCtor, postMetadata, postItems);
        postCollections.push(preCollection);
    }
    return postCollections;
}

interface InputRowItem {
    readonly data: any;
    readonly parent: InputRow | undefined;
    readonly preIndex: number | undefined;
}

class InputRowCollectionImpl implements InputRowCollection {

    private readonly _rows: Array<InputRow> = [];

    preCollections: ReadonlyArray<InputRowCollection> = [];
        
    postCollections: ReadonlyArray<InputRowCollection> = [];

    constructor(
        readonly rowCtor: InputRowCtor,
        readonly metadata: InputMetadata
    ) {}

    get rows(): ReadonlyArray<InputRow> {
        return this._rows;
    }

    set rows(_: any) {
        console.log("FUCK");
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
        const json = {
            path: this.metadata.path,
            rows: this.rows.map(r => r.toJSON())
        };
        const json2 = this.preCollections.length !== 0 
            ? {...json, preCollections: this.preCollections.map(c => c.toJSON())}
            : json;
        const json3 = this.postCollections.length !== 0
            ? {...json2, postCollections: this.postCollections.map(c => c.toJSON())}
            : json2;
        return json3;
    }
}