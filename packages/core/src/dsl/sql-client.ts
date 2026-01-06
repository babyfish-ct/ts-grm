import { AnyModel } from "@/schema/model";
import { EntityTable } from "./entity-table";

export interface SqlClient {

    $type(): { sqlClient: undefined };

    $acceptRisk(): QueryWithRiskCreator;

    createQuery<TModel extends AnyModel>(
        model: TModel,
        fn: (table: EntityTable<TModel>) => void
    ): void;
}

export interface QueryWithRiskCreator {

    $type(): { queryWithRiskCreator: undefined };

    createQuery<
        const Models extends AtLeastTwo<AnyModel>
    >(
        ...args: [
            ...models: Models,
            fn: (
                ...tables: {
                    [K in keyof Models]: EntityTable<Models[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => void
        ]
    ): void;
}

type AtLeastTwo<T> = [T, ...T[]];
