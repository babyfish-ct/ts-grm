import { AnyModel } from "@/schema/model";
import { EntityTable } from "./entity-table";
import { SelectedProjection } from "./projection";
import { RootQuery } from "./query";

export interface SqlClient {

    $type(): { sqlClient: undefined };

    createQuery<
        const TModels extends AtLeastTwo<AnyModel>,
        TProjection extends SelectedProjection<any>
    >(
        ...args: [
            ...models: TModels,
            fn: (
                ...tables: {
                    [K in keyof TModels]: EntityTable<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => TProjection
        ]
    ): RootQuery<TProjection>;
}

type AtLeastTwo<T> = [T, ...T[]];
