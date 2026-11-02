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

        }
    }
}

function insert(
    sqlClient: SqlClientImplementor,
    collection: spi.InputRowCollection,
    ignoreDuplicated: boolean
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
