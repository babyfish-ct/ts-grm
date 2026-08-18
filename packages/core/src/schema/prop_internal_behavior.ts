/*
 * ts-grm is a pure TypeScript database ORM built on type-level programming.
 * 
 * Design principles:
 * - Zero code generation, pure TypeScript type inference
 * - No entity object instantiation — maps database rows directly to DTOs
 * - No runtime reflection — performance on par with handwritten SQL
 * - Full type safety, full SQL features
 * - Like GraphQL, clients can query exact shape of data they need
 * - Like the inversed GraphQL, clients can save exact shape of data they need
 * 
 * @author 陈涛 (Chen Tao)
 */

import { ModelOrder, OrderNullsType } from "@/schema/order";
import { 
    __AllModelMembers, 
    __ModelIdKey, 
    __RequiredModelKey, 
    __OptionalModelKey, 
    __OneToManyMappedByKeys, 
    __OneToOneMappedByKeys, 
    __ManyToManyMappedByKeys, 
    __MiddleEntityJoinThisKeys,
    __MiddleEntityJoinTargetKeys
} from "@/schema/model_internal_types";
import { CascadeType, JoinTable, JoinColumns, JoinEntity } from "./join";
import { ArgumentError } from "@/error/common";
import { IsNull } from "@/dsl/utils";
import { 
    Calculator, 
    ParameterizedTargetCalculator, 
    ParameterizedValueCalculator, 
    SqlFormula, 
    TargetCalculator, 
    TsFormula, 
    ValueCalculator 
} from "./computed";
import { StandardSchemaV1 } from "@standard-schema/spec"; 
import { scalars, ScalarProvider, ScalarType, EnumSetProvider } from "./scalar";
import { 
    __AssociatedPropContract, 
    __AssociationType, 
    __CalculatedCollectionPropContract, 
    __CalculatedReferencePropContract, 
    __CalculatedValuePropContract, 
    __CollectionPropContract, 
    __DirectionType, 
    __EmbeddedMember, 
    __EmbeddedPropContract, 
    __EnumSetPropContract, 
    __FormulaPropContract, 
    __I64PropContract, 
    __NullityType, 
    __ParameterizedCalculatedCollectionPropContract, 
    __ParameterizedCalculatedReferencePropContract, 
    __ParameterizedCalculatedValuePropContract, 
    __PropContract, 
    __ReferencePropContract, 
    __ScalarPropContract, 
    __SourceKeyOf, 
    __SqlFormulaPropContract, 
    __StrPropContract, 
    __TargetKeyOf, 
    __TargetModelOf, 
    __TsFormulaPropContract 
} from "./prop_internal_types";
import { AnyModel } from "./model";
import { NumericType } from "@/impl/numeric";

export class __Prop<T, TNullity extends __NullityType> 
implements __PropContract<T, TNullity> {

    readonly __prop = true;

    declare readonly __dataType?: T;

    declare readonly __nullity?: TNullity;

    protected constructor(readonly __data: __PropData) {}
}

export class __ScalarProp<
    T, 
    TNullity extends __NullityType = "NONNULL",
    TCustomized extends boolean = false
> extends __Prop<T, TNullity> implements __ScalarPropContract<T, TNullity, TCustomized> {

    readonly __scalarLikeProp = true;

    readonly __scalarProp = true;

    declare readonly __customized?: TCustomized;

    constructor(data: __PropData) {
        super(data);
    }

    nullable(): __ScalarProp<T, "NULLABLE"> {
        return new __ScalarProp({...this.__data, nullity: "NULLABLE"})
    }
}

export class __StrProp<
    TNullity extends __NullityType = "NONNULL"
> extends __ScalarProp<string, TNullity> implements __StrPropContract<string, TNullity> {

    readonly __strProp = true;

    override nullable(): __StrProp<"NULLABLE"> {
        return new __StrProp({...this.__data, nullity: "NULLABLE"});
    }
}

export class __I64Prop<
    T extends string | number, 
    TNullity extends __NullityType = "NONNULL"
> extends __ScalarProp<T, TNullity> implements __I64PropContract<T, TNullity> {

    readonly __i64Prop = true;

    override nullable(): __I64Prop<T, "NULLABLE"> {
        return new __I64Prop({...this.__data, nullity: "NULLABLE"});
    }

    asString(): __I64Prop<string, TNullity> {
        return new __I64Prop({...this.__data, numericType: NumericType.STRING});
    }
}

export class __EnumSetProp<
    TEnum extends string
> extends __ScalarProp<ReadonlyArray<TEnum>, "NONNULL", true> implements __EnumSetPropContract<TEnum> {

    readonly __enumSetProp = true;
}

export class __EmbeddedProp<
    TProps extends Record<string, __EmbeddedMember>,
    TNullity extends __NullityType,
    TFlattenProps extends Record<string, any>
> extends __Prop<TProps, TNullity> implements __EmbeddedPropContract<TProps, TNullity, TFlattenProps> {

    readonly __embeddedProp = true;

    declare readonly __flattenProps?: TFlattenProps;

    constructor(data: __PropData) {
        super(data)
    }

    get props(): TProps {
        return this.__data.props as TProps;
    }
}

export type __FollowPrefix<TKey extends string, TParentKey extends string> =
    `${TParentKey}.${TKey}`;

export type __FollowNullity<TProp, TParentNullity extends __NullityType> =
    TProp extends __ScalarPropContract<infer T, infer Nullity, infer Customized>
        ? __ScalarProp<T, __CombinedNullity<TParentNullity, Nullity>, Customized>
        : never;

export abstract class __AssociatedProp<
    TModel extends AnyModel,
    TNullity extends __NullityType,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __Prop<TModel, TNullity> 
implements __AssociatedPropContract<
    TModel, 
    TNullity, 
    TDirection, 
    TMiddleTable, 
    TBackOptionalModelKey, 
    TTargetOptionalModelKey
> {

    readonly __associatedLikeProp = true;
    
    readonly __associatedProp = true;

    declare readonly __direction?: TDirection;

    declare readonly __middleTable?: TMiddleTable;

    declare readonly __backOptionalModelKey?: TBackOptionalModelKey;

    declare readonly __targetOptionalModelKey?: TTargetOptionalModelKey;

    constructor(data: __PropData) {
        super(data);
    }

    get targetModel(): TModel {
        return this.__data.targetModel as TModel;
    }
}

export class __OneToOneProp<
    TModel extends AnyModel,
    TNullity extends __NullityType,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __AssociatedProp<TModel, TNullity, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> 
implements __ReferencePropContract<TModel, TNullity, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __referenceProp = true;

    readonly __oneToOneProp = true;

    constructor(data: __PropData) {
        super(data);
    }

    nullable(): __OneToOneProp<
        TModel, 
        "NULLABLE", 
        TDirection, 
        TMiddleTable,
        TBackOptionalModelKey, 
        TTargetOptionalModelKey
    > {
        return new __OneToOneProp(
            {...this.__data, nullity: "NULLABLE"}
        );
    }
}

export class __ConfigurableOneToOneProp<
    TModel extends AnyModel,
    TNullity extends __NullityType,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __OneToOneProp<TModel, TNullity, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> {

    constructor(data: __PropData) {
        super(data);
    }

    nullable(): __ConfigurableOneToOneProp<
        TModel, 
        "NULLABLE", 
        TDirection, 
        TMiddleTable,
        TBackOptionalModelKey, 
        TTargetOptionalModelKey
    > {
        return new __ConfigurableOneToOneProp({...this.__data, nullity: "NULLABLE"});
    }

    mappedBy<TMappedBy extends __OneToOneMappedByKeys<TModel>>(
        mappedBy: TMappedBy
    ): __OneToOneProp<
        TModel, 
        "NULLABLE", 
        "INVERSE", 
        false,
        __TargetKeyOf<__AllModelMembers<TModel>[TMappedBy]>, 
        __SourceKeyOf<__AllModelMembers<TModel>[TMappedBy]>
    > {
        return new __OneToOneProp({...this.__data, mappedBy, nullity: "NULLABLE"});
    }

    joinColumns<TTargetKeyProp extends __OptionalModelKey<TModel> = "">(
        options: {
            targetKeyProp?: TTargetKeyProp
            columns?: JoinColumns
            cascade?: CascadeType
        }
    ): __OneToOneProp<
        TModel, 
        TNullity, 
        "OWNING", 
        false,
        TBackOptionalModelKey, 
        TTargetKeyProp
    >;

    joinColumns(
        ...joinColumns: JoinColumns
    ): __OneToOneProp<
        TModel, 
        TNullity, 
        "OWNING", 
        false,
        TBackOptionalModelKey, 
        __ModelIdKey<TModel>
    >;

    joinColumns(
        data: any
    ): __OneToOneProp<
        TModel, 
        TNullity, 
        "OWNING", 
        false,
        TBackOptionalModelKey, 
        __ModelIdKey<TModel>
    > {
        return new __OneToOneProp({
            ...this.__data, 
            joinColumns: __joinColumnsDataOf(data, this.__data.targetModel)
        });
    }

    joinTable<
        TBackReferencedProp extends string = "",
        TTargetReferencedProp extends __OptionalModelKey<TModel> = "",
    >(
        options: JoinTable<TModel, TBackReferencedProp, __RequiredModelKey<TModel, TTargetReferencedProp>>
    ): __OneToOneProp<
        TModel, 
        TNullity, 
        "OWNING", 
        true,
        TBackReferencedProp, 
        TTargetReferencedProp
    > {
        return new __OneToOneProp({
            ...this.__data,
            joinTable: __joinTableDataOf(options, this.targetModel)
        });
    }

    joinEntity<
        TMiddleModel extends AnyModel,
        TJoinThisProp extends __MiddleEntityJoinThisKeys<TMiddleModel, "ONE_TO_ONE">,
        TJoinTargetProp extends __MiddleEntityJoinTargetKeys<TMiddleModel, TModel, "ONE_TO_ONE">
    >(
        options: JoinEntity<
            TMiddleModel, 
            TModel,
            "ONE_TO_ONE",
            TJoinThisProp, 
            TJoinTargetProp
        >
    ): __OneToOneProp<
        __TargetModelOf<__AllModelMembers<TMiddleModel>[TJoinTargetProp]>,
        TNullity,
        "OWNING",
        true,
        __TargetKeyOf<__AllModelMembers<TMiddleModel>[TJoinThisProp]>,
        __TargetKeyOf<__AllModelMembers<TMiddleModel>[TJoinTargetProp]>
    > {
        return new __OneToOneProp({
            ...this.__data,
            joinEntity: {
                model: options.model,
                joinThisProp: options.joinThisProp,
                joinTargetProp: options.joinTargetProp
            }
        });
    }
}

export class __ManyToOneProp<
    TModel extends AnyModel,
    TNullity extends __NullityType,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __AssociatedProp<TModel, TNullity, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> 
implements __ReferencePropContract<TModel, TNullity, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __referenceProp = true;

    readonly __manyToOneProp = true;

    constructor(data: __PropData) {
        super(data);
    }

    nullable(): __ManyToOneProp<
        TModel, 
        "NULLABLE", 
        TDirection, 
        TMiddleTable,
        TBackOptionalModelKey, 
        TTargetOptionalModelKey
    > {
        return new __ManyToOneProp(
            {...this.__data, nullity: "NULLABLE"}
        );
    }
}

export class __ConfigurableManyToOneProp<
    TModel extends AnyModel,
    TNullity extends __NullityType,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __ManyToOneProp<TModel, TNullity, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> {

    constructor(data: __PropData) {
        super(data);
    }

    nullable(): __ConfigurableManyToOneProp<
        TModel, 
        "NULLABLE", 
        TDirection, 
        TMiddleTable,
        TBackOptionalModelKey, 
        TTargetOptionalModelKey
    > {
        return new __ConfigurableManyToOneProp({...this.__data, nullity: "NULLABLE"});
    }

    joinColumns<TTargetKeyProp extends __OptionalModelKey<TModel> = "">(
        options: {
            targetKeyProp?: TTargetKeyProp
            columns?: JoinColumns
            cascade?: CascadeType
        }
    ): __ManyToOneProp<
        TModel, 
        TNullity, 
        "OWNING", 
        false,
        TBackOptionalModelKey, 
        TTargetKeyProp
    >;

    joinColumns(
        ...joinColumns: JoinColumns
    ): __ManyToOneProp<
        TModel, 
        TNullity, 
        "OWNING", 
        false,
        TBackOptionalModelKey, 
        __ModelIdKey<TModel>
    >;

    joinColumns(
        options: any
    ): __ManyToOneProp<
        TModel, 
        TNullity, 
        "OWNING", 
        false,
        TBackOptionalModelKey, 
        __ModelIdKey<TModel>
    > {
        return new __ManyToOneProp({
            ...this.__data,
            joinColumns: __joinColumnsDataOf(options, this.__data.targetModel)
        });
    }

    joinTable<
        TBackReferenceProp extends string = "",
        TTargetReferencedProp extends __OptionalModelKey<TModel> = ""
    >(
        options: JoinTable<TModel, TBackReferenceProp, __RequiredModelKey<TModel, TTargetReferencedProp>>
    ): __ManyToOneProp<
        TModel, 
        TNullity, 
        "OWNING", 
        true,
        TBackReferenceProp, 
        TTargetReferencedProp
    > {
        return new __ManyToOneProp({
            ...this.__data,
            joinColumns: __joinColumnsDataOf(options, this.__data.targetModel)
        });
    }

    joinEntity<
        TMiddleModel extends AnyModel,
        TJoinSourceProp extends __MiddleEntityJoinThisKeys<TMiddleModel, "MANY_TO_ONE">,
        TJoinTargetProp extends __MiddleEntityJoinTargetKeys<TMiddleModel, TModel, "MANY_TO_ONE"> 
    >(
        options: JoinEntity<
            TMiddleModel, 
            TModel,
            "MANY_TO_ONE",
            TJoinSourceProp, 
            TJoinTargetProp
        >
    ): __ManyToOneProp<
        __TargetModelOf<__AllModelMembers<TMiddleModel>[TJoinTargetProp]>,
        TNullity,
        "OWNING",
        true,
        __TargetKeyOf<__AllModelMembers<TMiddleModel>[TJoinSourceProp]>,
        __TargetKeyOf<__AllModelMembers<TMiddleModel>[TJoinTargetProp]>
    > {
        return new __ManyToOneProp({
            ...this.__data,
            joinEntity: {
                model: options.model,
                joinThisProp: options.joinThisProp,
                joinTargetProp: options.joinTargetProp
            }
        });
    }
}

export class __OneToManyProp<
    TModel extends AnyModel,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __AssociatedProp<TModel, "NONNULL", TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> 
implements __CollectionPropContract<TModel, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __collectionProp = true;

    readonly __oneToManyProp = true;

    constructor(data: __PropData) {
        super(data);
    }

    orderBy(
        ...orders: ModelOrder<TModel>[]
    ): __OneToManyProp<
        TModel, 
        TDirection, 
        TMiddleTable,
        TBackOptionalModelKey, 
        TTargetOptionalModelKey
    > {
        const arr: ReadonlyArray<{
            path: string,
            desc: boolean,
            nulls: OrderNullsType
        }> = orders.map(o => 
            typeof o === "object"
                ? {
                    path: o.path as string,
                    desc: o.desc ?? false,
                    nulls: o.nulls ?? "UNSPECIFIED"
                } : {
                    path: o as string,
                    desc: false,
                    nulls: "UNSPECIFIED"
                }
        );
        return new __OneToManyProp(
            {...this.__data, orders: arr }
        );
    }
}

export class __ConfigurableOneToManyProp<
    TModel extends AnyModel,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __OneToManyProp<TModel, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> {

    constructor(data: __PropData) {
        super(data);
    }

    joinEntity<
        TMiddleModel extends AnyModel,
        TJoinSourceProp extends __MiddleEntityJoinThisKeys<TMiddleModel, "ONE_TO_MANY">,
        TJoinTargetProp extends __MiddleEntityJoinTargetKeys<TMiddleModel, TModel, "ONE_TO_MANY"> 
    >(
        options: JoinEntity<
            TMiddleModel, 
            TModel,
            "ONE_TO_MANY",
            TJoinSourceProp, 
            TJoinTargetProp
        >
    ): __OneToManyProp<
        __TargetModelOf<__AllModelMembers<TMiddleModel>[TJoinTargetProp]>,
        "OWNING",
        true,
        __TargetKeyOf<__AllModelMembers<TMiddleModel>[TJoinSourceProp]>,
        __TargetKeyOf<__AllModelMembers<TMiddleModel>[TJoinTargetProp]>
    > {
        return new __OneToManyProp({
            ...this.__data,
            joinEntity: {
                model: options.model,
                joinThisProp: options.joinThisProp,
                joinTargetProp: options.joinTargetProp
            }
        });
    }

    mappedBy<TMappedBy extends __OneToManyMappedByKeys<TModel>>(
        mappedBy: TMappedBy
    ): __OneToManyProp<
        TModel, 
        "INVERSE", 
        false,
        __TargetKeyOf<__AllModelMembers<TModel>[TMappedBy]>, 
        __SourceKeyOf<__AllModelMembers<TModel>[TMappedBy]>
    > {
        return new __OneToManyProp({...this.__data, mappedBy});
    }

    override orderBy(
        ...orders: ModelOrder<TModel>[]
    ): __OneToManyProp<
        TModel, 
        TDirection, 
        TMiddleTable,
        TBackOptionalModelKey, 
        TTargetOptionalModelKey
    > {
        return new __OneToManyProp(
            {...this.__data, orders: [...orders] as ReadonlyArray<any> }
        );
    }
}

export class __ManyToManyProp<
    TModel extends AnyModel,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __AssociatedProp<TModel, "NONNULL", TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> 
implements __CollectionPropContract<TModel, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __collectionProp = true;

    readonly __manyToManyProp = true;

    constructor(data: __PropData) {
        super(data);
    }

    orderBy(
        ...orders: ModelOrder<TModel>[]
    ): __ManyToManyProp<
        TModel, 
        TDirection, 
        TMiddleTable,
        TBackOptionalModelKey, 
        TTargetOptionalModelKey
    > {
        return new __ManyToManyProp(
            {...this.__data, orders: [...orders] as ReadonlyArray<any> }
        );
    }
}

export class __ConfigurableManyToManyProp<
    TModel extends AnyModel,
    TDirection extends __DirectionType,
    TMiddleTable extends boolean,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __ManyToManyProp<TModel, TDirection, TMiddleTable, TBackOptionalModelKey, TTargetOptionalModelKey> {

    constructor(data: __PropData) {
        super(data);
    }

    mappedBy<TMappedBy extends __ManyToManyMappedByKeys<TModel>>(
        mappedBy: TMappedBy
    ): __ManyToManyProp<
        TModel, 
        "INVERSE",
        true,
        __TargetKeyOf<__AllModelMembers<TModel>[TMappedBy]>, 
        __SourceKeyOf<__AllModelMembers<TModel>[TMappedBy]>
    > {
        return new __ManyToManyProp({...this.__data, mappedBy});
    }

    joinTable<
        TBackReferenceProp extends string = "",
        TTargetReferencedProp extends __OptionalModelKey<TModel> = ""
    >(
        options: JoinTable<TModel, TBackReferenceProp, __RequiredModelKey<TModel, TTargetReferencedProp>>
    ): __ManyToManyProp<
        TModel, 
        "OWNING", 
        true,
        TBackReferenceProp, 
        TTargetReferencedProp
    > {
        return new __ManyToManyProp({
            ...this.__data,
            joinTable: __joinTableDataOf(options, this.__data.targetModel)
        });
    }

    joinEntity<
        TMiddleModel extends AnyModel,
        TJoinSourceProp extends __MiddleEntityJoinThisKeys<TMiddleModel, "MANY_TO_MANY">,
        TJoinTargetProp extends __MiddleEntityJoinTargetKeys<TMiddleModel, TModel, "MANY_TO_MANY"> 
    >(
        options: JoinEntity<
            TMiddleModel, 
            TModel,
            "MANY_TO_MANY",
            TJoinSourceProp, 
            TJoinTargetProp
        >
    ): __ManyToManyProp<
        __TargetModelOf<__AllModelMembers<TMiddleModel>[TJoinTargetProp]>,
        "OWNING",
        true,
        __TargetKeyOf<__AllModelMembers<TMiddleModel>[TJoinSourceProp]>,
        __TargetKeyOf<__AllModelMembers<TMiddleModel>[TJoinTargetProp]>
    > {
        return new __ManyToManyProp({
            ...this.__data,
            joinEntity: {
                model: options.model,
                joinThisProp: options.joinThisProp,
                joinTargetProp: options.joinTargetProp
            }
        });
    }

    orderBy(
        ...orders: ModelOrder<TModel>[]
    ): __ConfigurableManyToManyProp<
        TModel, 
        TDirection, 
        TMiddleTable,
        TBackOptionalModelKey, 
        TTargetOptionalModelKey
    > {
        return new __ConfigurableManyToManyProp(
            {...this.__data, orders: [...orders] as ReadonlyArray<any> }
        );
    }
}

export abstract class __FormulaProp<
    T, 
    TNullity extends __NullityType
> extends __Prop<T, TNullity> 
implements __FormulaPropContract<T, TNullity> {

    readonly __scalarLikeProp = true;

    readonly __formulaProp = true;

    constructor(data: __PropData) {
        super(data);
    }
}

export class __TsFormulaProp<
    T, 
    TNullity extends __NullityType
> extends __FormulaProp<T, TNullity> 
implements __TsFormulaPropContract<T, TNullity> {
 
    readonly __tsFormulaProp = true;

    constructor(data: __PropData) {
        super(data);
    }
}

export class __SqlFormulaProp<
    T, 
    TNullity extends __NullityType
> extends __FormulaProp<T, TNullity>
implements __SqlFormulaPropContract<T, TNullity> {
 
    readonly __sqlFormulaProp = true;

    constructor(data: __PropData) {
        super(data);
    }
}

export class __CalculatedValueProp<
    TValue, 
    TNullity extends __NullityType
> extends __Prop<TValue, TNullity>
implements __CalculatedValuePropContract<TValue, TNullity> {

    readonly __calculatedValueProp = true;

    constructor(data: __PropData) {
        super(data);
    }
}

export class __ParameterizedCalculatedValueProp<
    TParameter,
    TValue, 
    TNullity extends __NullityType
> extends __Prop<TValue, TNullity>
implements __ParameterizedCalculatedValuePropContract<TParameter, TValue, TNullity> {

    readonly __parameterizedCalculatedValueProp = true;

    declare readonly __parameter?: TParameter;

    constructor(data: __PropData) {
        super(data);
    }
}

export class __CalculatedReferenceProp<
    TModel extends AnyModel,
    TNullity extends __NullityType
> extends __Prop<TModel, TNullity>
implements __CalculatedReferencePropContract<TModel, TNullity> {

    readonly __associatedLikeProp = true;

    readonly __calculatedReferenceProp = true;

    constructor(data: __PropData) {
        super(data);
    }
}

export class __ParameterizedCalculatedReferenceProp<
    TParameter,
    TModel extends AnyModel,
    TNullity extends __NullityType
> extends __Prop<TModel, TNullity>
implements __ParameterizedCalculatedReferencePropContract<TParameter, TModel, TNullity> {

    readonly __associatedLikeProp = true;

    readonly __parameterizedCalculatedReferenceProp = true;

    declare readonly __parameter?: TParameter;

    constructor(data: __PropData) {
        super(data);
    }
}

export class __CalculatedCollectionProp<
    TModel extends AnyModel
> extends __Prop<TModel, "NONNULL">
implements __CalculatedCollectionPropContract<TModel> {

    readonly __associatedLikeProp = true;

    readonly __calculatedCollectionProp = true;

    constructor(data: __PropData) {
        super(data);
    }
}

export class __ParameterizedCalculatedCollectionProp<
    TParameter,
    TModel extends AnyModel
> extends __Prop<TModel, "NONNULL">
implements __ParameterizedCalculatedCollectionPropContract<TParameter, TModel> {

    readonly __associatedLikeProp = true;

    readonly __parameterizedCalculatedCollectionProp = true;

    declare readonly __parameter?: TParameter;

    constructor(data: __PropData) {
        super(data);
    }
}

export type __ScalarPropCreator = {
    
    <TEnum extends string>(
        provider: EnumSetProvider<TEnum>
    ): __EnumSetProp<TEnum>;
    
    <TValueType extends StandardSchemaV1>(
        provider: ScalarProvider<TValueType, any>
    ): __ScalarProp<StandardSchemaV1.InferOutput<TValueType>, "NONNULL", true>;
}

export function __scalarPropCreator(): __ScalarPropCreator {
    function impl(
        provider: ScalarProvider<any, any>
    ): __ScalarProp<any, "NONNULL", true> {
        if (provider instanceof EnumSetProvider) {
            return new __EnumSetProp({...__EMPTY_PROP_DEFINITION_DATA, scalarType: provider.sqlType, scalarProvider: provider as any});
        }
        return new __ScalarProp({...__EMPTY_PROP_DEFINITION_DATA, scalarType: provider.sqlType, scalarProvider: provider});
    };
    return impl as any;
}

export type __EnumCreator = {

    <const TValues extends ReadonlyArray<string>>(
        ...values: TValues
    ): __ScalarProp<TValues[number], "NONNULL", true>;

    <TMap extends { readonly [key: string]: string; }>(
        map: TMap
    ): __ScalarProp<keyof TMap, "NONNULL", true>;

    <TMap extends { readonly [key: string]: number; }>(
        map: TMap
    ): __ScalarProp<keyof TMap, "NONNULL", true>;
}

export function __enumCreator(): __EnumCreator {
    function impl(...args: ReadonlyArray<any>): __ScalarProp<__ScalarProp<any>> {
        const scalarProvider = scalars.enumProvider(...args);
        return new __ScalarProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: scalarProvider.sqlType,
            scalarProvider
        });
    }
    return impl as any;
}

export type __EnumSetCreator = {

    <const TValues extends ReadonlyArray<string>>(
        ...values: TValues
    ): __EnumSetProp<TValues[number] & string>;

    <TMap extends { readonly [key: string]: string; }>(
        map: TMap
    ): __EnumSetProp<keyof TMap & string>;
}

export function __enumSetCreator(): __EnumSetCreator {
    function impl(...args: ReadonlyArray<any>): __EnumSetProp<any> {
        const scalarProvider = scalars.enumSetProvider(...args);
        return new __EnumSetProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: scalarProvider.sqlType,
            scalarProvider: scalarProvider as any
        });
    }
    return impl as any;
}

export type __CombinedNullity<
    TNullity1 extends __NullityType, 
    TNullity2 extends __NullityType
> = TNullity1 extends "NULLABLE"
        ? "NULLABLE"
    : TNullity2 extends "NULLABLE"
        ? "NULLABLE"
    : "NONNULL";

export type __PropData = {
    readonly nullity: __NullityType;
    readonly scalarType: ScalarType<any> | undefined;
    readonly numericType: NumericType;
    readonly scalarProvider: ScalarProvider<any, any> | undefined;
    readonly props: Record<string, __PropContract<any, any>> | undefined;
    readonly targetModel: __ModelRef<AnyModel> | undefined;
    readonly associationType: __AssociationType | undefined;
    readonly columnName: string | undefined;
    readonly joinColumns: __ForeignKeyData | undefined;
    readonly joinTable: __JoinTableData | undefined;
    readonly joinEntity: __JoinEntityData | undefined;
    readonly mappedBy: string | undefined,
    readonly orders: ReadonlyArray<{
        readonly path: string;
        readonly desc: boolean;
        readonly nulls: OrderNullsType;
    }> | undefined;
    readonly reference: string | undefined;
    readonly formulaData: __FormulaData | undefined;
    readonly calculatorData: __CalculatorData | undefined;
};

export type __JoinTableData = {
    readonly name: string | undefined;
    readonly joinThis: __ForeignKeyData | undefined;
    readonly joinTarget: __ForeignKeyData | undefined;
};

export type __JoinEntityData = {
    readonly model: AnyModel;
    readonly joinThisProp: string;
    readonly joinTargetProp: string;
};

export type __ForeignKeyData = {
    readonly keyProp: string | undefined;
    readonly columns: ReadonlyArray<__JoinColumnData>;
    readonly cascade: CascadeType;
};

export type __JoinColumnData = {
    readonly columnName: string;
    readonly referencedSubPath: string | undefined;
}

export type __FormulaData = {
    readonly kind: "TS";
    readonly formula: TsFormula<any>;
} | {
    readonly kind: "SQL";
    readonly formula: SqlFormula<any>;
};

export type __CalculatorKind = 
    "VALUE" |  "NONNULL_REFERENCE" | "NULLABLE_REFERENCE" | "COLLECTION";

export type __CalculatorData = {
    readonly kind: __CalculatorKind;
    readonly parameterType: StandardSchemaV1 | undefined;
    readonly calculator: Calculator;
};

export const __EMPTY_PROP_DEFINITION_DATA: __PropData = {
    nullity: "NONNULL",
    scalarType: undefined,
    numericType: NumericType.NONE,
    scalarProvider: undefined,
    props: undefined,
    targetModel: undefined,
    associationType: undefined,
    columnName: undefined,
    joinColumns: undefined,
    joinTable: undefined,
    joinEntity: undefined,
    mappedBy: undefined,
    orders: undefined,
    reference: undefined,
    formulaData: undefined,
    calculatorData: undefined
}

export type __ModelRef<TModel extends AnyModel> =
    TModel | (() => TModel);

function __joinTableDataOf(
    joinTable: any,
    targetModel: any
): __JoinTableData {
    return {
        name: joinTable.name,
        joinThis: __joinColumnsDataOf(
            joinTable.joinThis ?? joinTable.joinThisColumns, undefined
        ),
        joinTarget: __joinColumnsDataOf(
            joinTable.joinTarget ?? joinTable.joinTargetColumns, targetModel
        )
    };
}

function __joinColumnsDataOf(data: any, targetModel: any): __ForeignKeyData | undefined {
    if (data === undefined) {
        return undefined;
    }
    if (Array.isArray(data)) {
        const arr = data as JoinColumns;
        const columns = arr.map(__joinColumnDataOf);
        if (columns.length > 1) {
            for (const column of columns) {
                if (column.referencedSubPath == null) {
                    throw new ArgumentError(
                        `For multiple join columns, the referencedSubPath of each column must be specified, but the column "${
                            column.columnName
                        }" misses it`
                    );
                }
            }
        }
        return {
            keyProp: targetModel?._idKey,
            columns,
            cascade: "NONE"
        };
    }
    return {
        keyProp: data.keyProp ?? targetModel?._idKey,
        columns: data.columns?.map((c: any) => __joinColumnDataOf(c)),
        cascade: data.cascade ?? "NONE"
    };
}

function __joinColumnDataOf(data: any): __JoinColumnData {
    if (typeof data === "string") {
        return { columnName: data as string, referencedSubPath: undefined };
    }
    return {
        columnName: data.columnName,
        referencedSubPath: data.referencedSubPath !== "" ?
            data.referencedSubPath :
            undefined
    };
}

export type __O2OCreator = {

    <TModel extends AnyModel>(
        targetModel: TModel
    ): __ConfigurableOneToOneProp<
        TModel, 
        "NONNULL", 
        "OWNING", 
        false,
        "",
        __ModelIdKey<TModel>
    >;

    self<
        TSelf extends AnyModel, 
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfJoinColumnsOptions<TTargetKeyProp> 
    ): __OneToOneProp<
        TSelf,
        "NULLABLE",
        "OWNING",
        false,
        "",
        TTargetKeyProp
    >;

    self<
        TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfJoinTableOptions<TSourceKeyProp, TTargetKeyProp>
    ): __OneToOneProp<
        TSelf,
        "NULLABLE",
        "OWNING",
        false,
        TSourceKeyProp,
        TTargetKeyProp
    >;

    self<
        TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfMappedByOptions<TSelf, TSourceKeyProp, TTargetKeyProp>
    ): __OneToOneProp<
        TSelf,
        "NULLABLE",
        "INVERSE",
        false,
        TSourceKeyProp,
        TTargetKeyProp
    >;
};

export type __M2OCreator = {

    <TModel extends AnyModel>(
        targetModel: TModel
    ): __ConfigurableManyToOneProp<
        TModel, 
        "NONNULL", 
        "OWNING", 
        false,
        "",
        __ModelIdKey<TModel>
    >;

    self<
        TSelf extends AnyModel, 
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfJoinColumnsOptions<TTargetKeyProp>
    ): __ManyToOneProp<
        TSelf,
        "NULLABLE",
        "OWNING",
        false,
        "",
        TTargetKeyProp
    >;

    self<
        TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfJoinTableOptions<TSourceKeyProp, TTargetKeyProp>
    ): __ManyToOneProp<
        TSelf,
        "NULLABLE",
        "OWNING",
        false,
        TSourceKeyProp,
        TTargetKeyProp
    >;
};

export type __O2MCreator = {

    <TModel extends AnyModel>(
        targetModel: TModel
    ): __ConfigurableOneToManyProp<
        TModel, 
        "OWNING", 
        false, 
        "", 
        __ModelIdKey<TModel>
    >;

    self<
        TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options: __SelfMappedByOptions<TSelf, TSourceKeyProp, TTargetKeyProp>
    ): __OneToManyProp<
        TSelf,
        "INVERSE",
        false,
        TSourceKeyProp,
        TTargetKeyProp
    >;
};

export type __M2MCreator = {

    <TModel extends AnyModel>(
        targetModel: TModel
    ): __ConfigurableManyToManyProp<
        TModel,
        "OWNING",
        true,
        "",
        __ModelIdKey<TModel>
    >;

    self<
        TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options:__SelfMappedByOptions<TSelf, TSourceKeyProp, TTargetKeyProp>
    ): __ManyToManyProp<
        TSelf,
        "INVERSE",
        false,
        TSourceKeyProp,
        TTargetKeyProp
    >;

    self<TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfJoinTableOptions<TSourceKeyProp, TTargetKeyProp>
    ): __ManyToManyProp<
        TSelf,
        "OWNING",
        false,
        TSourceKeyProp,
        TTargetKeyProp
    >;
};

export type __FormulaCreator = {

    ts<R>(
        formula: TsFormula<R>
    ): __TsFormulaProp<
        NonNullable<R>,
        IsNull<R> extends true ? "NULLABLE" : "NONNULL"
    >;

    sql<R>(
        formula: SqlFormula<R>
    ): __SqlFormulaProp<
        NonNullable<R>,
        IsNull<R> extends true ? "NULLABLE" : "NONNULL"
    >;
};

export type __CalculatedCreator = {

    value<R>(
        calculator: ValueCalculator<R>
    ): __CalculatedValueProp<
        NonNullable<R>, 
        IsNull<R> extends true ? "NULLABLE" : "NONNULL"
    >;

    value<TParameter, R>(
        calculator: ParameterizedValueCalculator<TParameter, R>
    ): __ParameterizedCalculatedValueProp<
        TParameter, 
        NonNullable<R>,
        IsNull<R> extends true ? "NULLABLE" : "NONNULL"
    >;

    nonnullReference<
        TTargetModel extends AnyModel
    >(
        calculator: TargetCalculator<TTargetModel>
    ): __CalculatedReferenceProp<
        TTargetModel, 
        "NONNULL"
    >;

    nonnullReference<
        TParameter,
        TTargetModel extends AnyModel
    >(
        calculator: ParameterizedTargetCalculator<TParameter, TTargetModel>
    ): __ParameterizedCalculatedReferenceProp<
        TParameter, 
        TTargetModel, 
        "NONNULL"
    >;

    nullableReference<
        TTargetModel extends AnyModel
    >(
        calculator: TargetCalculator<TTargetModel>
    ): __CalculatedReferenceProp<
        TTargetModel, 
        "NULLABLE"
    >;

    nullableReference<
        TParameter,
        TTargetModel extends AnyModel
    >(
        calculator: ParameterizedTargetCalculator<TParameter, TTargetModel>
    ): __ParameterizedCalculatedReferenceProp<
        TParameter,
        TTargetModel, 
        "NULLABLE"
    >;

    collection<
        TTargetModel extends AnyModel
    >(
        calculator: TargetCalculator<TTargetModel>
    ): __CalculatedCollectionProp<TTargetModel>;

    collection<
        TParameter,
        TTargetModel extends AnyModel
    >(
        calculator: ParameterizedTargetCalculator<TParameter, TTargetModel>
    ): __ParameterizedCalculatedCollectionProp<TParameter, TTargetModel>;
};

type __SelfJoinColumnsOptions<
    TTargetKeyProp extends string
> = {
    readonly joinColumns?: JoinColumns | {
        readonly targetKeyProp?: TTargetKeyProp | undefined;
        readonly cascade?: CascadeType | undefined;
        readonly columns?: JoinColumns | undefined;
    } | undefined;
};

type __SelfJoinTableOptions<
    TSourceKeyProp extends string, 
    TTargetKeyProp extends string
> = {
    readonly joinTable: {
        readonly name?: string | undefined;
        readonly joinThisColumns?: JoinColumns | undefined;
        readonly joinTargetColumns?: JoinColumns | undefined; 
    } | {
        readonly name?: string | undefined;
        readonly joinThis?: {
            readonly sourceKeyProp?: TSourceKeyProp | undefined;
            readonly cascadeType?: CascadeType | undefined;
            readonly columns?: JoinColumns | undefined;
        } | undefined;
        readonly joinTarget?: {
            readonly targetKeyProp?: TTargetKeyProp | undefined;
            readonly cascadeType?: CascadeType | undefined;
            readonly columns?: JoinColumns | undefined;
        }
    };
};

type __SelfMappedByOptions<
    TSelf extends AnyModel,
    TSourceKeyProp extends __OptionalModelKey<TSelf> = "", 
    TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
> = {
    readonly mappedBy: __OptionalModelKey<TSelf>;
    readonly sourceKeyProp?: TSourceKeyProp | undefined;
    readonly targetKeyProp?: TTargetKeyProp | undefined;
};

export function __o2oCreator(): __O2OCreator {

    function o2o<TModel extends AnyModel>(
        targetModel: __ModelRef<TModel>
    ): __ConfigurableOneToOneProp<TModel, "NONNULL", "OWNING", false, "", __ModelIdKey<TModel>> {
        return new __ConfigurableOneToOneProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            targetModel, 
            associationType: "ONE_TO_ONE"
        });
    }

    function self<
        TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfJoinColumnsOptions<TTargetKeyProp>
            | __SelfJoinTableOptions<TSourceKeyProp, TTargetKeyProp>
            | __SelfMappedByOptions<TSelf, TSourceKeyProp, TTargetKeyProp>
    ): __OneToManyProp<
        TSelf,
        any,
        false,
        TSourceKeyProp,
        TTargetKeyProp
    > {
        const mappedBy = (options as any)?.mappedBy;
        return new __OneToManyProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            targetModel: selfModelGetter, 
            associationType: "ONE_TO_MANY",
            mappedBy: mappedBy != null && typeof mappedBy === "string"
                ? mappedBy
                : mappedBy.opposite,
            joinTable: (options as any)?.joinTable != null 
                ? __joinTableDataOf((options as any).joinTable, undefined)
                : undefined,
            joinColumns: (options as any)?.joinColumns != null
                ? __joinColumnsDataOf((options as any).joinColumns, undefined)
                : undefined
        });
    }

    (o2o as any).self = self;
    return o2o as __O2OCreator;
}

export function __m2oCreator(): __M2OCreator {
    
    function m2o<TModel extends AnyModel>(
        targetModel: __ModelRef<TModel>
    ): __ConfigurableManyToOneProp<
        TModel, 
        "NONNULL", 
        "OWNING", 
        false,
        "",
        __ModelIdKey<TModel>
    > {
        return new __ConfigurableManyToOneProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            targetModel, 
            associationType: "MANY_TO_ONE"
        });
    }

    function self<TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfJoinColumnsOptions<TTargetKeyProp> 
            | __SelfJoinTableOptions<TSourceKeyProp, TTargetKeyProp>
    ): __ManyToOneProp<
        TSelf,
        any,
        "OWNING",
        false,
        TSourceKeyProp,
        TTargetKeyProp
    > {
        return new __ManyToOneProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            targetModel: selfModelGetter, 
            associationType: "MANY_TO_ONE",
            joinTable: (options as any)?.joinTable != null 
                ? __joinTableDataOf((options as any).joinTable, undefined) 
                : undefined,
            joinColumns: (options as any)?.joinColumns != null 
                ? __joinColumnsDataOf((options as any).joinColumns, undefined) 
                : undefined
        });
    }

    (m2o as any).self = self;
    return m2o as any as __M2OCreator;
}

export function __o2mCreator(): __O2MCreator {

    function o2m<TModel extends AnyModel>(
        targetModel: __ModelRef<TModel>
    ): __ConfigurableOneToManyProp<
        TModel, 
        "OWNING", 
        false, 
        "", 
        __ModelIdKey<TModel>
    > {
        return new __ConfigurableOneToManyProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            targetModel, 
            associationType: "ONE_TO_MANY"
        });
    }

    function self<TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options: __SelfMappedByOptions<TSelf, TSourceKeyProp, TTargetKeyProp>
    ): __OneToManyProp<
        TSelf,
        "INVERSE",
        false,
        TSourceKeyProp,
        TTargetKeyProp
    > {
        const self = selfModelGetter();
        return new __OneToManyProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            targetModel: self, 
            associationType: "ONE_TO_MANY",
            mappedBy: options.mappedBy
        });
    }

    (o2m as any).self = self;
    return o2m as __O2MCreator;
}

export function __m2mCreator(): __M2MCreator {

    function m2m<TModel extends AnyModel>(
        targetModel: __ModelRef<TModel>
    ): __ConfigurableManyToManyProp<
        TModel,
        "OWNING",
        true,
        "",
        __ModelIdKey<TModel>
    > {
        return new __ConfigurableManyToManyProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            targetModel, 
            associationType: "MANY_TO_MANY"
        });
    }

    function self<
        TSelf extends AnyModel, 
        TSourceKeyProp extends __OptionalModelKey<TSelf> = "",
        TTargetKeyProp extends __OptionalModelKey<TSelf> = ""
    >(
        selfModelGetter: () => TSelf,
        options?: __SelfJoinTableOptions<TSourceKeyProp, TTargetKeyProp>
            | __SelfMappedByOptions<TSelf, TSourceKeyProp, TTargetKeyProp>
    ): __ManyToManyProp<
        TSelf,
        any,
        false,
        TSourceKeyProp,
        TTargetKeyProp
    > {
        const mappedBy = (options as any)?.mappedBy;
        const self = selfModelGetter();
        return new __ManyToManyProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            targetModel: self, 
            associationType: "MANY_TO_MANY",
            mappedBy: mappedBy,
            joinTable: (options as any)?.joinTable != null 
                ? __joinTableDataOf((options as any).joinTable, undefined)
                : undefined 
        });
    }

    (m2m as any).self = self;
    return m2m as __M2MCreator;
}

export function __formulaCreator(): __FormulaCreator {

    function ts<R>(
        formula: TsFormula<R>
    ): __TsFormulaProp<
        NonNullable<R>, 
        IsNull<R> extends true ? "NULLABLE" : "NONNULL"
    > {
        return new __TsFormulaProp({
            ...__EMPTY_PROP_DEFINITION_DATA,
            formulaData: {
                kind: "TS",
                formula
            }
        });
    }

    function sql<R>(
        formula: SqlFormula<R>
    ): __SqlFormulaProp<
        NonNullable<R>,
        IsNull<R> extends true ? "NULLABLE" : "NONNULL"
    > {
        return new __SqlFormulaProp({
            ...__EMPTY_PROP_DEFINITION_DATA,
            formulaData: {
                kind: "SQL",
                formula
            }
        });
    }

    return {
        ts,
        sql
    };
}

export function __calculatedCreator(): __CalculatedCreator {

    function value(calculator: any): any {
        if (calculator instanceof ParameterizedValueCalculator) {
            return new __ParameterizedCalculatedValueProp({
                ...__EMPTY_PROP_DEFINITION_DATA,
                calculatorData: {
                    kind: "VALUE",
                    parameterType: calculator.parameterType,
                    calculator
                }
            });
        }
        return new __CalculatedValueProp({
            ...__EMPTY_PROP_DEFINITION_DATA,
            calculatorData: {
                kind: "VALUE",
                parameterType: undefined,
                calculator
            }
        });
    }

    function nonnullReference(calculator: any): any {
        if (calculator instanceof ParameterizedTargetCalculator) {
            return new __ParameterizedCalculatedCollectionProp({
                ...__EMPTY_PROP_DEFINITION_DATA,
                calculatorData: {
                    kind: "NONNULL_REFERENCE",
                    parameterType: calculator.parameterType,
                    calculator
                }
            });
        }
        return new __CalculatedReferenceProp({
            ...__EMPTY_PROP_DEFINITION_DATA,
            calculatorData: {
                kind: "NONNULL_REFERENCE",
                parameterType: undefined,
                calculator
            }
        });
    }

    function nullableReference(calculator: any): any {
        if (calculator instanceof ParameterizedTargetCalculator) {
            return new __ParameterizedCalculatedCollectionProp({
                ...__EMPTY_PROP_DEFINITION_DATA,
                calculatorData: {
                    kind: "NULLABLE_REFERENCE",
                    parameterType: calculator.parameterType,
                    calculator
                }
            });
        }
        return new __CalculatedReferenceProp({
            ...__EMPTY_PROP_DEFINITION_DATA,
            calculatorData: {
                kind: "NULLABLE_REFERENCE",
                parameterType: undefined,
                calculator
            }
        });
    }

    function collection(calculator: any): any {
        if (calculator instanceof ParameterizedTargetCalculator) {
            return new __ParameterizedCalculatedCollectionProp({
                ...__EMPTY_PROP_DEFINITION_DATA,
                calculatorData: {
                    kind: "COLLECTION",
                    parameterType: calculator.parameterType,
                    calculator
                }
            });
        }
        return new __CalculatedCollectionProp({
            ...__EMPTY_PROP_DEFINITION_DATA,
            calculatorData: {
                kind: "COLLECTION",
                parameterType: undefined,
                calculator
            }
        });
    }

    return {
        value,
        nonnullReference,
        nullableReference,
        collection
    };
}