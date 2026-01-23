import { ModelOrder, OrderNullsType } from "@/schema/order";
import { AllModelMembers, AnyModel, ManyToManyMappedByKeys, ModelIdKey, OneToManyMappedByKeys, OneToOneMappedByKeys, ReferenceKey } from "@/schema/model";
import { CascaseType, JoinColumn, JoinColumns, JoinTable } from "./join";

export const prop = {

    str(): ScalarProp<string> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "STR"});
    },

    i8(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "I8"});
    },

    i16(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "I16"});
    },

    i32(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "I32"});
    },

    i64(): I64Prop<number> {
        return new I64Prop({...EMPTY_PROP_DEFINTION_DATA, scalarType: "I64"});
    },

    f32(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "F32"});
    },

    f64(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "F64"});
    },

    num(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "NUM"});
    },

    date(): ScalarProp<Date> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "DATE"});
    },

    embedded<TProps extends Record<string, EmbeddedMember>>(
        props: TProps
    ): EmbeddedProp<TProps> {
        return new EmbeddedProp({...EMPTY_PROP_DEFINTION_DATA, props});
    },

    o2o<TModel extends AnyModel>(
        targetModel: ModelRef<TModel>
    ): UnconfiguredOneToOneProp<TModel, "NONNULL", "OWNING", ModelIdKey<TModel>> {
        return new UnconfiguredOneToOneProp({
            ...EMPTY_PROP_DEFINTION_DATA, 
            targetModel, 
            associationType: "ONE_TO_ONE"
        });
    },

    m2o<TModel extends AnyModel>(
        targetModel: ModelRef<TModel>
    ): UnconfiguredManyToOneProp<TModel, "NONNULL", "OWNING", ModelIdKey<TModel>> {
        return new UnconfiguredManyToOneProp({
            ...EMPTY_PROP_DEFINTION_DATA, 
            targetModel, 
            associationType: "MANY_TO_ONE"
        });
    },

    o2m<TModel extends AnyModel>(
        targetModel: ModelRef<TModel>
    ): UnconfiguredOneToManyProp<TModel> {
        return new UnconfiguredOneToManyProp({
            ...EMPTY_PROP_DEFINTION_DATA, 
            targetModel, 
            associationType: "ONE_TO_MANY"
        });
    },

    m2m<TModel extends AnyModel>(
        targetModel: ModelRef<TModel>
    ): UnconfiguredManyToManyProp<TModel> {
        return new UnconfiguredManyToManyProp({
            ...EMPTY_PROP_DEFINTION_DATA, 
            targetModel, 
            associationType: "MANY_TO_MANY"
        });
    },
};

export class Prop<T, TNullity extends NullityType> {

    __type(): {
        prop: [T, TNullity] | undefined
    } {
        return {prop: undefined };
    };

    protected constructor(readonly __data: PropData) {}
}

export class ScalarProp<
    T, TNullity extends NullityType = "NONNULL"
> extends Prop<T, TNullity> {

    override __type(): {
        prop: [T, TNullity] | undefined,
        scalarProp: [T, TNullity] | undefined
    } {
        return { 
            prop: undefined, 
            scalarProp: undefined 
        };
    }

    constructor(data: PropData) {
        super(data);
    }

    nullable(): ScalarProp<T, "NULLABLE"> {
        return new ScalarProp({...this.__data, nullity: "NULLABLE"})
    }
}

export class I64Prop<
    T extends string | number, 
    TNullity extends NullityType = "NONNULL"
> extends ScalarProp<T, TNullity> {

    override __type(): {
        prop: [T, TNullity] | undefined,
        scalarProp: [T, TNullity] | undefined,
        i64Prop: [T, TNullity] | undefined
    } {
        return { 
            prop: undefined, 
            scalarProp: undefined,
            i64Prop: undefined
        };
    }

    override nullable(): I64Prop<T, "NULLABLE"> {
        return new I64Prop({...this.__data, nullity: "NULLABLE"});
    }

    asString(): I64Prop<string, TNullity> {
        return new I64Prop({...this.__data});
    }
}

export class EmbeddedProp<
    TProps extends Record<string, EmbeddedMember>,
    TNullity extends NullityType = "NONNULL"
> extends Prop<TProps, TNullity> {

    override __type(): {
        prop: [TProps, TNullity] | undefined,
        embeddedProp: [TProps, TNullity] | undefined
    } {
        return { 
            prop: undefined, 
            embeddedProp: undefined 
        };
    }

    constructor(data: PropData) {
        super(data)
    }

    get props(): TProps {
        return this.__data.props as TProps;
    }
} 

export abstract class AssociatedProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType
> extends Prop<TModel, TNullity> {

    override __type(): {
        prop: [TModel, TNullity]  | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined
    } {
        return { 
            prop: undefined, 
            associatedProp: undefined 
        };
    }

    constructor(data: PropData) {
        super(data);
    }

    get targetModel(): TModel {
        return this.__data.targetModel as TModel;
    }
}

export interface ReferenceProp<
    TModel extends AnyModel, 
    TNullity extends NullityType,
    TDirection extends DirectionType,
    TReferenceKey extends ReferenceKey<TModel> | undefined
> extends AssociatedProp<TModel, TNullity, TDirection> {
    __type(): {
        prop: [TModel, TNullity]  | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined
        referenceProp: [TModel, TNullity, TDirection, TReferenceKey] | undefined
    };
}

export type ForeignKeyProp<TProp extends ReferenceProp<any, any, "OWNING", any>> =
    TProp extends ReferenceProp<any, any, "OWNING", infer TReferenceKey>
        ? TReferenceKey extends undefined 
            ? never 
            : TProp
        : never;

export interface CollectionProp<
    TModel extends AnyModel
> {
    __type(): {
        collectionProp: TModel | undefined
    };
}

export class OneToOneProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType,
    TReferenceKey extends ReferenceKey<TModel> | undefined
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements ReferenceProp<TModel, TNullity, TDirection, TReferenceKey> {

    override __type(): {
        prop: [TModel, TNullity] | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined,
        referenceProp: [TModel, TNullity, TDirection, TReferenceKey] | undefined,
        oneToOneProp: [TModel, TNullity, TDirection, TReferenceKey] | undefined
    } {
        return { 
            prop: undefined, 
            associatedProp: undefined,
            referenceProp: undefined,
            oneToOneProp: undefined
        };
    }

    constructor(data: PropData) {
        super(data);
    }

    nullable(): OneToOneProp<TModel, "NULLABLE", TDirection, TReferenceKey> {
        return new OneToOneProp(
            {...this.__data, nullity: "NULLABLE"}
        );
    }
}

class UnconfiguredOneToOneProp<
    TModel extends AnyModel,
    TNullity extends NullityType = "NONNULL",
    TDirection extends DirectionType = "OWNING",
    TReferenceKey extends ReferenceKey<TModel> | undefined = undefined
> extends OneToOneProp<TModel, TNullity, TDirection, TReferenceKey> {

    constructor(data: PropData) {
        super(data);
    }

    nullable(): UnconfiguredOneToOneProp<TModel, "NULLABLE", TDirection, TReferenceKey> {
        return new UnconfiguredOneToOneProp({...this.__data, nullity: "NULLABLE"});
    }

    mappedBy(mappedBy: OneToOneMappedByKeys<TModel>): OneToOneProp<TModel, "NULLABLE", "INVERSE", "VIRTUAL"> {
        return new OneToOneProp({...this.__data, mappedBy, nullity: "NULLABLE"});
    }

    joinColumns<TTargetKeyProp extends ReferenceKey<TModel>>(
        options: {
            targetKeyProp: TTargetKeyProp
            joinColumns?: JoinColumns<AllModelMembers<TModel>[TTargetKeyProp]>
            cascade?: CascaseType
        }
    ): OneToOneProp<TModel, TNullity, "OWNING", TTargetKeyProp>;

    joinColumns(
        options: {
            joinColumns?: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>;
            referencedProp?: keyof AllModelMembers<TModel>; 
            cascade?: CascaseType;
        }
    ): OneToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>>;

    joinColumns(
        ...joinColumns: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>
    ): OneToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>>;

    joinColumns(
        data: any
    ): OneToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>> {
        return new OneToOneProp({
            ...this.__data, 
            joinColumns: foreignKeyDataOf(data, this.__data.targetModel)
        });
    }

    joinTable<
        TTargetReferencedProp extends keyof AllModelMembers<TModel> = ModelIdKey<TModel>
    >(
        options: JoinTable<TModel, TTargetReferencedProp>
    ): OneToOneProp<TModel, TNullity, "OWNING", undefined> {
        return new OneToOneProp({
            ...this.__data,
            joinTable: joinTableDataOf(options, this.targetModel)
        });
    }
}

export class ManyToOneProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType,
    TReferenceKey extends ReferenceKey<TModel> | undefined
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements ReferenceProp<TModel, TNullity, TDirection, TReferenceKey> {

    override __type(): {
        prop: [TModel, TNullity]  | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined,
        referenceProp: [TModel, TNullity, TDirection, TReferenceKey] | undefined,
        manyToOneProp: [TModel, TNullity, TDirection, TReferenceKey] | undefined
    } {
        return { 
            prop: undefined, 
            associatedProp: undefined,
            referenceProp: undefined,
            manyToOneProp: undefined
        };
    }

    constructor(data: PropData) {
        super(data);
    }

    nullable(): ManyToOneProp<TModel, "NULLABLE", TDirection, TReferenceKey> {
        return new ManyToOneProp(
            {...this.__data, nullity: "NULLABLE"}
        );
    }
}

class UnconfiguredManyToOneProp<
    TModel extends AnyModel,
    TNullity extends NullityType = "NONNULL",
    TDirection extends DirectionType = "OWNING",
    TReferenceKey extends ReferenceKey<TModel> | undefined = undefined
> extends ManyToOneProp<TModel, TNullity, TDirection, TReferenceKey> {

    constructor(data: PropData) {
        super(data);
    }

    nullable(): UnconfiguredManyToOneProp<TModel, "NULLABLE", TDirection, TReferenceKey> {
        return new UnconfiguredManyToOneProp({...this.__data, nullity: "NULLABLE"});
    }

    joinColumns<TTargetKeyProp extends ReferenceKey<TModel>>(
        options: {
            targetKeyProp: TTargetKeyProp
            joinColumns?: JoinColumns<AllModelMembers<TModel>[TTargetKeyProp]>
            cascade?: CascaseType
        }
    ): ManyToOneProp<TModel, TNullity, "OWNING", TTargetKeyProp>;

    joinColumns(
        options: {
            joinColumns?: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>;
            referencedProp?: keyof AllModelMembers<TModel>;
            cascade?: CascaseType;
        }
    ): ManyToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>>;

    joinColumns(
        ...joinColumns: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>
    ): ManyToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>>;

    joinColumns(
        options: any
    ): ManyToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>> {
        return new ManyToOneProp({
            ...this.__data,
            joinColumns: foreignKeyDataOf(options, this.__data.targetModel)
        });
    }

    joinTable<TTargetReferencedProp extends keyof AllModelMembers<TModel>>(
        options: JoinTable<TModel, TTargetReferencedProp>
    ): ManyToOneProp<TModel, TNullity, "OWNING", undefined> {
        return new ManyToOneProp({
            ...this.__data,
            joinColumns: foreignKeyDataOf(options, this.__data.targetModel)
        });
    }
}

export class OneToManyProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements CollectionProp<TModel> {

    override __type(): {
        prop: [TModel, TNullity]  | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined,
        collectionProp: TModel | undefined,
        oneToManyProp: [TModel, TNullity, TDirection] | undefined
    } {
        return { 
            prop: undefined, 
            associatedProp: undefined,
            collectionProp: undefined,
            oneToManyProp: undefined
        };
    }

    constructor(data: PropData) {
        super(data);
    }

    orderBy(
        ...orders: ModelOrder<TModel>[]
    ): OneToManyProp<TModel, TNullity, TDirection> {
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
        return new OneToManyProp(
            {...this.__data, orders: arr }
        );
    }
}

class UnconfiguredOneToManyProp<
    TModel extends AnyModel,
    TNullity extends NullityType = "NONNULL",
    TDirection extends DirectionType = "OWNING"
> extends OneToManyProp<TModel, TNullity, TDirection> {

    constructor(data: PropData) {
        super(data);
    }

    mappedBy(mappedBy: OneToManyMappedByKeys<TModel>): OneToManyProp<TModel, TNullity, "INVERSE"> {
        return new OneToManyProp({...this.__data, mappedBy});
    }

    override orderBy(
        ...orders: ModelOrder<TModel>[]
    ): UnconfiguredOneToManyProp<TModel, TNullity, TDirection> {
        return new UnconfiguredOneToManyProp(
            {...this.__data, orders: [...orders] as ReadonlyArray<any> }
        );
    }
}

export class ManyToManyProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements CollectionProp<TModel> {

    override __type(): {
        prop: [TModel, TNullity]  | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined,
        collectionProp: TModel | undefined,
        manyToManyProp: [TModel, TNullity, TDirection] | undefined
    } {
        return { 
            prop: undefined, 
            associatedProp: undefined,
            collectionProp: undefined,
            manyToManyProp: undefined
        };
    }

    constructor(data: PropData) {
        super(data);
    }

    orderBy(
        ...orders: ModelOrder<TModel>[]
    ): ManyToManyProp<TModel, TNullity, TDirection> {
        return new ManyToManyProp(
            {...this.__data, orders: [...orders] as ReadonlyArray<any> }
        );
    }
}

class UnconfiguredManyToManyProp<
    TModel extends AnyModel,
    TNullity extends NullityType = "NONNULL",
    TDirection extends DirectionType = "OWNING"
> extends ManyToManyProp<TModel, TNullity, TDirection> {

    constructor(data: PropData) {
        super(data);
    }

    mappedBy(mappedBy: ManyToManyMappedByKeys<TModel>): ManyToManyProp<TModel, TNullity, "INVERSE"> {
        return new ManyToManyProp({...this.__data, mappedBy});
    }

    joinTable<TTargetReferencedProp extends keyof AllModelMembers<TModel>>(
        options: JoinTable<TModel, TTargetReferencedProp>
    ): ManyToManyProp<TModel, TNullity, "OWNING"> {
        return new ManyToManyProp({
            ...this.__data,
            joinTable: joinTableDataOf(options, this.__data.targetModel)
        });
    }

    orderBy(
        ...orders: ModelOrder<TModel>[]
    ): UnconfiguredManyToManyProp<TModel, TNullity, TDirection> {
        return new UnconfiguredManyToManyProp(
            {...this.__data, orders: [...orders] as ReadonlyArray<any> }
        );
    }
}

export type AssociationType = "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";

export type NullityType = "NONNULL" | "NULLABLE" | "INPUT_NONNULL";

export type CombinedNullity<
    TNullity1 extends NullityType, 
    TNullity2 extends NullityType
> = TNullity1 extends "NULLABLE"
        ? "NULLABLE"
    : TNullity2 extends "NULLABLE"
        ? "NULLABLE"
    : "NONNULL";

type DirectionType = "OWNING" | "INVERSE";

export type EmbeddedMember = 
    ScalarProp<any, any> 
    | ForeignKeyProp<OneToOneProp<any, any, "OWNING", any>>
    | ForeignKeyProp<ManyToOneProp<any, any, "OWNING", any>>
    | EmbeddedProp<any, any>;

export type PropData = {
    readonly nullity: NullityType;
    readonly scalarType: ScalarType | undefined;
    readonly props: Record<string, Prop<any, any>> | undefined;
    readonly targetModel: ModelRef<AnyModel> | undefined;
    readonly associationType: AssociationType | undefined;
    readonly columnName: string | undefined;
    readonly joinColumns: ForeignKeyData | undefined;
    readonly joinTable: JoinTableData | undefined;
    readonly mappedBy: string | undefined,
    readonly orders: ReadonlyArray<{
        readonly path: string;
        readonly desc: boolean;
        readonly nulls: OrderNullsType;
    }> | undefined;
    readonly reference: string | undefined;
};

export type JoinTableData = {
    readonly name: string | undefined;
    readonly joinThis: ForeignKeyData | undefined;
    readonly joinTarget: ForeignKeyData | undefined;
};

export type ForeignKeyData = {
    readonly referencedProp: string | undefined;
    readonly columns: ReadonlyArray<JoinColumnData>;
    readonly cascade: CascaseType;
};

export type JoinColumnData = {
    readonly columnName: string;
    readonly referencedSubPath: string | undefined;
}

export type ScalarType = 
    "STR" 
    | "I8" | "I16" | "I32" | "I64" 
    | "F32" | "F64" | "NUM" 
    | "DATE";

const EMPTY_PROP_DEFINTION_DATA: PropData = {
    nullity: "NONNULL",
    scalarType: undefined,
    props: undefined,
    targetModel: undefined,
    associationType: undefined,
    columnName: undefined,
    joinColumns: undefined,
    joinTable: undefined,
    mappedBy: undefined,
    orders: undefined,
    reference: undefined,
}

export type TargetModelOf<TProp> =
    TProp extends AssociatedProp<infer TargetModel, any, any>
        ? TargetModel
        : never;
        
export type DirectTypeOf<TProp> =
    TProp extends Prop<infer R, any>
        ? R
        : never;

export type NullityOf<TProp> =
    TProp extends Prop<any, infer R>
        ? R
        : never;

type ModelRef<TModel extends AnyModel> =
    TModel | (() => TModel);

function joinTableDataOf(
    joinTable: any,
    targetModel: any
): JoinTableData {
    return {
        name: joinTable.name,
        joinThis: foreignKeyDataOf(
            joinTable.joinThis ?? joinTable.joinThisColumns, undefined
        ),
        joinTarget: foreignKeyDataOf(
            joinTable.joinTarget ?? joinTable.joinTargetColumns, targetModel
        )
    };
}

function foreignKeyDataOf(data: any, targetModel: any): ForeignKeyData | undefined {
    if (data === undefined) {
        return undefined;
    }
    if (Array.isArray(data)) {
        const arr = data as ReadonlyArray<JoinColumn<any>>;
        const columns = arr.map(joinColumnDataOf);
        return {
            referencedProp: targetModel?._idKey,
            columns,
            cascade: "NONE"
        };
    }
    return {
        referencedProp: data.referencedProp ?? targetModel._idKey,
        columns: data.columns?.map((c: any) => joinColumnDataOf(c)),
        cascade: data.cascade ?? "NONE"
    };
}

function joinColumnDataOf(data: any): JoinColumnData {
    if (typeof data === "string") {
        return { columnName: data as string, referencedSubPath: "" };
    }
    return {
        columnName: data.columnName,
        referencedSubPath: data.referencedSubPath !== "" ?
            data.referencedSubPath :
            undefined
    };
}