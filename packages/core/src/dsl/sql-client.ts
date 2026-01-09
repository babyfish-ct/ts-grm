import { AnyModel } from "@/schema/model";
import { EntityTable, Table } from "./table";
import { RootQueryProjection } from "./root-query";
import { MutableRootQuery, RootQuery } from "./root-query";
import { AtLeastOne } from "./utils";
import { BaseModel } from "./base-query";

export interface SqlClient {

    $type(): { sqlClient: undefined };

    createQuery<
        const TModels extends AtLeastOne<AnyModel | BaseModel<any>>,
        TProjection extends RootQueryProjection<any>
    >(
        ...args: [
            ...symbols: TModels,
            fn: (
                q: MutableRootQuery,
                ...tables: {
                    [K in keyof TModels]: Table<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => TProjection
        ]
    ): RootQuery<TProjection>;
}
