import { Model } from "@/schema/model";
import { EntityTable } from "./entity-table";

export class SqlClient {

    createQuery<
        const Models extends AtLeastOne<Model<any, any, any, any, any>>
    >(
        ...args: [
            ...models: Models,
            fn: (
                ...tables: {
                    [K in keyof Models]: EntityTable<Models[K]>
            }) => void
        ]
    ): void {

    }
}

type AtLeastOne<T> = [T, ...T[]];
