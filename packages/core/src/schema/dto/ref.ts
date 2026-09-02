import { __AssociationKeysImpl, __EmbeddedFlatMapping, __FlatableKeys, __FlatMappingContract, __InputReferenceFlatMapping, __ReferenceFlatMapping } from "@/index_internal";
import { AnyModel } from "../model";
import { __DeclaringModelName } from "../model_internal_types";
import { __AssociatedPropContract, __CollectionPropContract, __NullityOf, __NullityType, __ReferencePropContract } from "../prop_internal_types";
import { __CollectionMapping } from "./collection";
import { __DtoBody, __DtoMappingContract } from "./dto_context";
import { __ReferenceMapping } from "./reference";
import { __DefaultTargetMappings, __PropModelOf, __TargetMappings, __TargetMembersOf } from "./utils";

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

    $flatRef<
        TKey extends __FlatableKeys<TMembers>,
        const TMappings extends __TargetMappings<TModel, TMembers[TKey]>
    >(
        key: TKey,
        body: __DtoBody<
            __PropModelOf<TModel, TMembers[TKey]>, 
            "INPUT_REF", 
            "ENTITY", 
            __TargetMembersOf<TMembers[TKey]>, 
            TMappings
        >
    ): __FlatRefMappingContract<
            TModel,
            __DeclaringModelName<TMembers[TKey]>,
            TKey & string,
            TKey & string,
            TMembers[TKey],
            __DefaultTargetMappings<TModel, "INPUT_REF", TMembers[TKey]>,
            __NullityOf<TMembers[TKey]>
        >;
}

export interface __FlatRefMappingContract<
    TModel extends AnyModel,
    TDeclaring extends string,
    TPropName extends string,
    TPrefix extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType
> extends __FlatMappingContract<TModel, TDeclaring, "INPUT_REF", TPropName, TPrefix, TMember, TMappings, TNullity> {

    prefix<TPrefix extends string>(
        prefix: TPrefix
    ): __FlatMappingContract<TModel, TDeclaring, "INPUT_REF", TPropName, TPrefix, TMember, TMappings, TNullity>;
}