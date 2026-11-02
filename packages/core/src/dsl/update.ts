import { AnyModel } from "@/schema/model";
import { Predicate } from "./expression";
import { AnyAssociationModel } from "./association";
import { __UpdatedMembers, __UpdatedValue } from "./update_internal_types";

export interface MutableUpdate<TModel extends AnyModel | AnyAssociationModel> {

    set<
        TKey extends keyof __UpdatedMembers<TModel>
    >(
        key: TKey,
        value: __UpdatedValue<__UpdatedMembers<TModel>[TKey]>
    ): MutableUpdate<TModel>;

    where(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): MutableUpdate<TModel>;
}

export interface Update {

}