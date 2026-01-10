import { JoinColumn, ModelOrder } from "@/schema/order";
import { AllModelMembers, AnyModel, ManyToManyMappedByKeys, ModelIdKey, OneToManyMappedByKeys, OneToOneMappedByKeys, ReferenceKey } from "@/schema/model";
import { CascaseType, JoinColumns, JoinTableToId, JoinTableToKey } from "./join";

export const prop = {

    str(): ScalarProp<string> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "STR"});
    },

    i8(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "I8"});
    },

    i16(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "I6"});
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

    $type(): {
        prop: [T, TNullity] | undefined
    } {
        return {prop: undefined };
    };

    protected constructor(readonly $data: PropData) {}
}

export class ScalarProp<
    T, TNullity extends NullityType = "NONNULL"
> extends Prop<T, TNullity> {

    override $type(): {
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
        return new ScalarProp({...this.$data, nullity: "NULLABLE"})
    }
}

export class I64Prop<
    T extends string | number, 
    TNullity extends NullityType = "NONNULL"
> extends ScalarProp<T, TNullity> {

    override $type(): {
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
        return new I64Prop({...this.$data, nullity: "NULLABLE"});
    }

    asString(): I64Prop<string, TNullity> {
        return new I64Prop({...this.$data});
    }
}

export class EmbeddedProp<
    TProps extends Record<string, EmbeddedMember>,
    TNullity extends NullityType = "NONNULL"
> extends Prop<TProps, TNullity> {

    override $type(): {
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
        return this.$data.props as TProps;
    }
} 

export abstract class AssociatedProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType
> extends Prop<TModel, TNullity> {

    override $type(): {
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
        return this.$data.targetModel as TModel;
    }
}

export interface ReferenceProp<
    TModel extends AnyModel, 
    TNullity extends NullityType,
    TDirection extends DirectionType,
    TReferenceKey extends ReferenceKey<TModel> | undefined
> extends AssociatedProp<TModel, TNullity, TDirection> {
    $type(): {
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
    $type(): {
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

    override $type(): {
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
            {...this.$data, nullity: "NULLABLE"}
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
        return new UnconfiguredOneToOneProp({...this.$data, nullity: "NULLABLE"});
    }

    mappedBy(mappedBy: OneToOneMappedByKeys<TModel>): OneToOneProp<TModel, "NULLABLE", "INVERSE", "VIRTUAL"> {
        return new OneToOneProp({...this.$data, mappedBy, nullity: "NULLABLE"});
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
            joinColumns?: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>
            cascade?: CascaseType
        }
    ): OneToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>>;

    joinColumns(
        ...joinColumns: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>
    ): OneToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>>;

    joinColumns(
        data: any,
        ...restData: any[]
    ): OneToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>> {
        throw new Error();
    }

    joinTable<TTargetReferencedProp extends keyof AllModelMembers<TModel>>(
        options: JoinTableToKey<TModel, TTargetReferencedProp>
    ): OneToOneProp<TModel, TNullity, "OWNING", undefined>;

    joinTable(
        options: JoinTableToId<TModel>
    ): OneToOneProp<TModel, TNullity, "OWNING", undefined>;

    joinTable(
        data: any
    ): OneToOneProp<TModel, TNullity, "OWNING", undefined> {
        throw new Error();
    }
}

export class ManyToOneProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType,
    TReferenceKey extends ReferenceKey<TModel> | undefined
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements ReferenceProp<TModel, TNullity, TDirection, TReferenceKey> {

    override $type(): {
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
            {...this.$data, nullity: "NULLABLE"}
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
        return new UnconfiguredManyToOneProp({...this.$data, nullity: "NULLABLE"});
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
            joinColumns?: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>
            cascade?: CascaseType
        }
    ): ManyToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>>;

    joinColumns(
        ...joinColumns: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>
    ): ManyToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>>;

    joinColumns(
        data: any,
        ...restData: any[]
    ): ManyToOneProp<TModel, TNullity, "OWNING", ModelIdKey<TModel>> {
        throw new Error();
    }

    joinTable<TTargetReferencedProp extends keyof AllModelMembers<TModel>>(
        options: JoinTableToKey<TModel, TTargetReferencedProp>
    ): ManyToOneProp<TModel, TNullity, "OWNING", undefined>;

    joinTable(
        options: JoinTableToId<TModel>
    ): ManyToOneProp<TModel, TNullity, "OWNING", undefined>;

    joinTable(
        data: any
    ): ManyToOneProp<TModel, TNullity, "OWNING", undefined> {
        throw new Error();
    }
}

export class OneToManyProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements CollectionProp<TModel> {

    override $type(): {
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
        return new OneToManyProp(
            {...this.$data, orders: [...orders] as ReadonlyArray<any> }
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
        return new OneToManyProp({...this.$data, mappedBy});
    }

    override orderBy(
        ...orders: ModelOrder<TModel>[]
    ): UnconfiguredOneToManyProp<TModel, TNullity, TDirection> {
        return new UnconfiguredOneToManyProp(
            {...this.$data, orders: [...orders] as ReadonlyArray<any> }
        );
    }
}

export class ManyToManyProp<
    TModel extends AnyModel,
    TNullity extends NullityType,
    TDirection extends DirectionType
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements CollectionProp<TModel> {

    override $type(): {
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
            {...this.$data, orders: [...orders] as ReadonlyArray<any> }
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
        return new ManyToManyProp({...this.$data, mappedBy});
    }

    joinTable<TTargetReferencedProp extends keyof AllModelMembers<TModel>>(
        options: JoinTableToKey<TModel, TTargetReferencedProp>
    ): ManyToManyProp<TModel, TNullity, "OWNING">;

    joinTable(
        options: JoinTableToId<TModel>
    ): ManyToManyProp<TModel, TNullity, "OWNING">;

    joinTable(
        data: any
    ): ManyToManyProp<TModel, TNullity, "OWNING"> {
        throw new Error();
    }

    orderBy(
        ...orders: ModelOrder<TModel>[]
    ): UnconfiguredManyToManyProp<TModel, TNullity, TDirection> {
        return new UnconfiguredManyToManyProp(
            {...this.$data, orders: [...orders] as ReadonlyArray<any> }
        );
    }
}

type AssociationType = "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";

export type NullityType = "NONNULL" | "NULLABLE" | "INPUT_NONNULL";

type DirectionType = "OWNING" | "INVERSE";

export type EmbeddedMember = 
    ScalarProp<any, any> 
    | ForeignKeyProp<OneToOneProp<any, any, "OWNING", any>>
    | ForeignKeyProp<ManyToOneProp<any, any, "OWNING", any>>
    | EmbeddedProp<any, any>;

type PropData = {
    readonly nullity: NullityType,
    readonly scalarType: string | undefined,
    readonly props: Record<string, Prop<any, any>> | undefined,
    readonly targetModel: ModelRef<AnyModel> | undefined,
    readonly associationType: AssociationType | undefined,
    readonly columnName: string | undefined,
    readonly joinColumns: ReadonlyArray<JoinColumn> | undefined,
    readonly joinTable: {
        readonly name?: string | undefined,
        readonly toThisColumns: ReadonlyArray<JoinColumn> | undefined,
        readonly toTargetColumns: ReadonlyArray<JoinColumn> | undefined
    } | undefined
    readonly mappedBy: string | undefined,
    readonly orders: ReadonlyArray<ModelOrder<any>> | undefined
};

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
    orders: undefined
}

export type DirectTypeOf<TProp> =
    TProp extends Prop<infer R, any>
        ? R
        : never;

export type SimpleDataTypeOf<TProp> =
    TProp extends ScalarProp<infer R, any>
        ? R
    : TProp extends EmbeddedProp<infer R, any>
        ? {
            [
                K in keyof R
                    as R[K] extends Prop<any, "NONNULL">
                        ? K 
                        : never
            ]: SimpleDataTypeOf<R[K]>
        } & {
            [
                K in keyof R
                    as R[K] extends Prop<any, "NULLABLE" | "INPUT_NONNULL">
                        ? K 
                        : never
            ]?: SimpleDataTypeOf<R[K]> | null | undefined
        }
    : TProp extends ReferenceProp<infer TargetModel, any, "OWNING", infer Key>
        ? {
            [
                K in keyof Key
                    as AllModelMembers<TargetModel>[K & string] extends Prop<any, "NONNULL">
                        ? K 
                        : never
            ]: SimpleDataTypeOf<AllModelMembers<TargetModel>[K]>
        } & {
            [
                K in keyof Key
                    as AllModelMembers<TargetModel>[K & string] extends Prop<any, "NONNULL">
                        ? K 
                        : never
            ]?: SimpleDataTypeOf<AllModelMembers<TargetModel>[K]> | null | undefined
        }
    : never;

export type NullityOf<TProp> =
    TProp extends Prop<any, infer R>
        ? R
        : never;

type ModelRef<TModel extends AnyModel> =
    TModel | (() => TModel);