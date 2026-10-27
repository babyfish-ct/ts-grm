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

export function createInputRowCollection(
    metadata: InputMetadata,
    objs: ReadonlyArray<any>
): InputRowCollection {
    const rowCtor = getInputCtor(metadata);
    const items: ReadonlyArray<InputItem> = objs.map(o => {
        return {
            data: o,
            parentItemIndex: undefined,
            preIndex: undefined
        }
    })
    return createInputRowCollectionImpl(undefined, rowCtor, metadata, items);
}

function createInputRowCollectionImpl(
    parent: InputRowCollectionImplementor | undefined,
    rowCtor: InputRowCtor,
    metadata: InputMetadata,
    items: ReadonlyArray<InputItem>
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
    if (collection.items.length === 0) {
        return [];
    }
    const preCollections: Array<InputRowCollection> = [];
    const preMetadatas = metadata.preMetadatas;
    for (let i = 0; i < preMetadatas.length; i++) {
        const preMetadata = preMetadatas[i]!;
        const preRowCtor = preMetadata != null ? getInputCtor(preMetadata) : collection.rowCtor;
        const key = preMetadata?.key ?? metadata.key;
        const items = collection.items;
        const size = items.length;
        const preItems: Array<InputItem> = [];
        if (key === "SUPER") {
            for (let ii = 0; ii < size; ii++) {
                preItems.push({
                    data: items[ii]!.data,
                    parentItemIndex: ii,
                    preIndex: i
                });
            }
        } else {
            for (let ii = 0; ii < size; ii++) {
                const pre = (collection.rowCtor as any).pre(items[ii]!.data, i);
                if (pre != null) {
                    preItems.push({
                        data: pre,
                        parentItemIndex: ii,
                        preIndex: i
                    });
                }
            }
        }
        const preCollection = createInputRowCollectionImpl(collection, preRowCtor, preMetadata ?? metadata, preItems);
        preCollections.push(preCollection);
    }
    return preCollections;
}

function createPostCollections(
    collection: InputRowCollectionImplementor,
    metadata: InputMetadata
): ReadonlyArray<InputRowCollection> {
    if (collection.items.length === 0) {
        return [];
    }
    const postCollections: Array<InputRowCollection> = [];
    const postMetadatas = metadata.postMetadatas;
    for (let i = 0; i < postMetadatas.length; i++) {
        const postMetadata = postMetadatas[i];
        const postRowCtor = postMetadata != null 
            ? getInputCtor(postMetadata) 
            : metadata.isUnderMiddleTable 
                ? collection.parent!.rowCtor
                : collection.rowCtor;
        const items = collection.items;
        const size = items.length;
        const postItems: Array<InputItem> = [];
        for (let ii = 0; ii < size; ii++) {
            const post = (collection.rowCtor as any).post(items[ii]!.data, i);
            if (Array.isArray(post)) {
                for (const e of post) {
                    postItems.push({
                        data: e,
                        parentItemIndex: ii,
                        preIndex: undefined
                    });
                }
            } else if (post != null) {
                postItems.push({
                    data: post,
                    parentItemIndex: ii,
                    preIndex: undefined
                });
            }
        }
        const postCollection = createInputRowCollectionImpl(
            collection, 
            postRowCtor, 
            postMetadata ?? (metadata.isUnderMiddleTable ? metadata.parent! : metadata), 
            postItems
        );
        postCollections.push(postCollection);
    }
    return postCollections;
}

interface InputItem {
    readonly data: any;
    readonly parentItemIndex: number | undefined;
    readonly preIndex: number | undefined;
}

export interface InputRowCollectionImplementor extends InputRowCollection {

    readonly parent: InputRowCollectionImplementor | undefined;
    
    readonly rowCtor: InputRowCtor;

    readonly preCollections: ReadonlyArray<InputRowCollection>;

    readonly postCollections: ReadonlyArray<InputRowCollection>;

    readonly items: ReadonlyArray<InputItem>;

    rowByItemIndex(itemIndex: number): InputRow | undefined;

    row(data: any): InputRow | undefined;
}

class InputRowCollectionImpl implements InputRowCollectionImplementor {

    private readonly _items: Array<InputItem> = [];

    private _rows: ReadonlyArray<InputRow> | undefined = undefined;

    private _rowIndices: ReadonlyArray<number> | undefined = undefined;

    private _dataIndexMap: ReadonlyMap<any, number> | undefined = undefined;

    readonly preCollections: Array<InputRowCollection> = [];
        
    readonly postCollections: Array<InputRowCollection> = [];

    constructor(
        readonly parent: InputRowCollectionImplementor | undefined,
        readonly rowCtor: InputRowCtor,
        readonly metadata: InputMetadata
    ) {
    }

    get items(): ReadonlyArray<InputItem> {
        return this._items;
    }

    get rows(): ReadonlyArray<InputRow> {
        for (const preCollection of this.preCollections) {
            preCollection.rows;
        }
        let rows = this._rows;
        if (rows == null) {
            this._init();
            rows = this._rows!;
        }
        return rows;
    }

    rowByItemIndex(itemIndex: number): InputRow | undefined {
        let indices = this._rowIndices;
        if (indices == null) {
            this._init();
            indices = this._rowIndices!;
        }
        const rowIndex = indices[itemIndex]!;
        return rowIndex != null ? this._rows![rowIndex]! : undefined;
    }

    row(data: any): InputRow | undefined {
        let dataIndexMap = this._dataIndexMap;
        if (dataIndexMap == null) {
            this._init();
            dataIndexMap = this._dataIndexMap!;
        }
        const rowIndex = dataIndexMap.get(data);
        return rowIndex != null ? this._rows![rowIndex]! : undefined;
    }

    private _init() {
        const dataIndexMap = new Map<any, number>();
        const rows: Array<InputRow> = [];
        const indices: Array<number> = [];

        const indexMap = new Map<any, number>();
        const items = this._items;
        const size = items.length;
        for (let i = 0; i < size; i++) {
            const item = items[i]!;
            const row = new this.rowCtor(this, item.data, item.parentItemIndex);
            const hash = row.hash(this);
            let index = indexMap.get(hash);
            if (index == null) {
                index = rows.length;
                indexMap.set(hash, index);
            } else {
                (rows[index] as any)._refTarget = row;
            }
            dataIndexMap.set(item.data, index);
            rows[index] = row;
            indices.push(index);
        }
        this._rows = rows;
        this._rowIndices = indices;
        this._dataIndexMap = dataIndexMap;
    }

    add(
        item: InputItem
    ) {
        this._items.push(item);
    }

    toJSON() {
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
}
