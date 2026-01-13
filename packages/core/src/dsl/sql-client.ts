import { AnyModel } from "@/schema/model";
import { Table } from "./table";
import { RootQueryProjection } from "./root-query";
import { MutableRootQuery, RootQuery } from "./root-query";
import { AtLeastOne } from "./utils";
import { BaseModel } from "./base-query";
import { ModelOf, TypeOf, View } from "@/schema/dto";
import { Criteria } from "./criteria";

export interface SqlClient {

    $type(): { sqlClient: undefined };

    findNonNull<V extends View<any, any>>(
        view: V,
        criteria: Criteria<ModelOf<V>>
    ): Promise<TypeOf<V>>;

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
