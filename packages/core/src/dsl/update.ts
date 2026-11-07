import { AnyModel } from "@/schema/model";
import { Predicate } from "./expression";
import { AnyAssociationModel } from "./association";
import { __MutatedMembers, __MutatedValue } from "./mutate_internal_types";
import { __ReferencePropContract, __ScalarPropContract } from "@/schema/prop_internal_types";
import { __AllModelMembers, __RequiredModelKey } from "@/schema/model_internal_types";
import { __MakeExpression } from "./table_internal_types";

export interface MutableUpdate<TModel extends AnyModel | AnyAssociationModel> {

    set<
        TKey extends keyof __MutatedMembers<TModel>
    >(
        key: TKey,
        value: __MutatedValue<__MutatedMembers<TModel>[TKey]>
    ): this;

    where(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this;
}

export interface Update {
    
}