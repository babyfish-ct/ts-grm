import { AnyModel } from "@/schema/model";
import { EntityTable } from "./table";
import { RootQueryProjection } from "./root-query";
import { MutableRootQuery, RootQuery } from "./root-query";
import { AtLeastOne } from "./utils";

export interface SqlClient {

    $type(): { sqlClient: undefined };

    createQuery<
        const TModels extends AtLeastOne<AnyModel>,
        TProjection extends RootQueryProjection<any>
    >(
        ...args: [
            ...models: TModels,
            fn: (
                q: MutableRootQuery,
                ...tables: {
                    [K in keyof TModels]: EntityTable<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => TProjection
        ]
    ): RootQuery<TProjection>;
}
