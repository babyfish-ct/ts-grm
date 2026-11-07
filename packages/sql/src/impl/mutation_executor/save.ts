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

import { SqlBuilder } from "@/sql/sql_builder";
import { SqlClientImplementor } from "@/sql_client";
import { Input, SaveOptions, SaveResult, spi, TypeOf, View } from "@ts-grm/core";

export async function save<TInput extends Input<any, any, any>>(
    sqlClient: SqlClientImplementor,
    input: TInput,
    data: TypeOf<TInput> | ReadonlyArray<TypeOf<TInput>>,
    options?: SaveOptions<TInput> & {
        readonly view?: View<any, any>
    }
): Promise<SaveResult<TInput> & {
    readonly row?: any;
    readonly rows?: ReadonlyArray<any>
}> {
    const collection = spi.createInputRowCollection(
        input, 
        data, 
        new spi.MetadataOptions(options)
    );
    saveCollection(sqlClient, collection);
    throw new Error("UnsupportedOperation");
}

async function saveCollection(
    sqlClient: SqlClientImplementor,
    collection: spi.InputRowCollection
) {
    if (collection.isEmpty) {
        return;
    }
    for (const preCollection of collection.preCollections) {
        saveCollection(sqlClient, preCollection);
    }
    saveCollecrtionImpl(sqlClient, collection);
    for (const postCollection of collection.postCollections) {
        saveCollection(sqlClient, postCollection);
    }
}

async function saveCollecrtionImpl(
    sqlClient: SqlClientImplementor,
    collection: spi.InputRowCollection
) {
    const metadata = collection.metadata;
    if (metadata.parent == null) {
        const mode = metadata.options.root;
        switch (mode) {
            case "INSERT":
            case "INSERT_IF_ABSENT":
                insert(sqlClient, collection, mode === "INSERT_IF_ABSENT");
                break;
            case "UPDATE":
                update(sqlClient, collection);
                break;
            case "UPSERT":
                upsert(sqlClient, collection);
                break;
        }
    }
}

function insert(
    sqlClient: SqlClientImplementor,
    collection: spi.InputRowCollection,
    ignoreConflict: boolean
) {
    const builder = SqlBuilder.of(sqlClient);
    builder
        .sql("insert into ")
        .sql(collection.metadata.source.toTableName(sqlClient.strategy));
    
}

function update(
    sqlClient: SqlClientImplementor,
    collection: spi.InputRowCollection
) {
    
}

function upsert(
    sqlClient: SqlClientImplementor,
    collection: spi.InputRowCollection
) {

}
