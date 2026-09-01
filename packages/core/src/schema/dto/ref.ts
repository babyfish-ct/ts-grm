import { __AssociationKeysImpl } from "@/index_internal";
import { AnyModel } from "../model";
import { __DeclaringModelName } from "../model_internal_types";
import { __AssociatedPropContract, __CollectionPropContract, __NullityOf, __ReferencePropContract } from "../prop_internal_types";
import { __CollectionMapping } from "./collection";
import { __DtoBody, __DtoMappingContract } from "./dto_context";
import { __ReferenceMapping } from "./reference";
import { __DefaultTargetMappings, __PropModelOf, __TargetMembersOf } from "./utils";

export interface __RefContext<
    TModel extends AnyModel,
    TMembers
> {
    $ref<
        TKey extends __AssociationKeysImpl<TMembers>,
        const TMappings extends ReadonlyArray<__DtoMappingContract<__PropModelOf<TModel, TMembers[TKey]>>>
    >(
        key: TKey,
        body: __DtoBody<__PropModelOf<TModel, TMembers[TKey]>, "INPUT_REF", "ENTITY", __TargetMembersOf<TMembers[TKey]>, TMappings>
    ): 
        TMembers[TKey] extends __ReferencePropContract<any, any, any, any, any, any>
            ? __ReferenceMapping<
                TModel, 
                __DeclaringModelName<TMembers[TKey]>,
                "INPUT_REF",
                TKey & string, 
                TKey & string,
                TMembers[TKey],
                TMappings,
                __NullityOf<TMembers[TKey]>
            >
        : TMembers[TKey] extends __CollectionPropContract<any, any, any, any, any>
            ? __CollectionMapping<
                TModel, 
                __DeclaringModelName<TMembers[TKey]>,
                "INPUT_REF",
                TKey & string, 
                TKey & string,
                TMembers[TKey],
                TMappings
            >
        : never;
}
