import { JoinColumn, Order } from "@/schema/options";
import { ManyToManyMappedByKeys, Model, OneToManyMappedByKeys, OneToOneMappedByKeys } from "@/schema/model";

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

    i64(): ScalarProp<number> {
        return new ScalarProp({...EMPTY_PROP_DEFINTION_DATA, scalarType: "I64"});
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

    o2o<TModel extends Model<any, any, any, any>>(
        targetModel: TModel
    ): UnconfiguredOneToOneProp<TModel> {
        return new UnconfiguredOneToOneProp({
            ...EMPTY_PROP_DEFINTION_DATA, 
            targetModel, 
            associationType: "ONE_TO_ONE"
        });
    },

    m2o<TModel extends Model<any, any, any, any>>(
        targetModel: TModel
    ): UnconfiguredManyToOneProp<TModel> {
        return new UnconfiguredManyToOneProp({
            ...EMPTY_PROP_DEFINTION_DATA, 
            targetModel, 
            associationType: "MANY_TO_ONE"
        });
    },

    o2m<TModel extends Model<any, any, any, any>>(
        targetModel: TModel
    ): UnconfiguredOneToManyProp<TModel> {
        return new UnconfiguredOneToManyProp({
            ...EMPTY_PROP_DEFINTION_DATA, 
            targetModel, 
            associationType: "ONE_TO_MANY"
        });
    },

    m2m<TModel extends Model<any, any, any, any>>(
        targetModel: TModel
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
    TModel extends Model<any, any, any, any>,
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

    protected dataOfJoinColumns(
        joinColumns: ReadonlyArray<string | JoinColumn>
    ): PropData {
        const joinArr = joinColumns.map(c => {
            if (typeof c === "string") {
                return { columnName: c };
            }
            return c as JoinColumn;
        })
        return {...this.$data, joinColumns: joinArr}
    }

    protected dataOfJoinTable(options: {
        readonly name?: string | undefined,
        readonly toThisColumns?: ReadonlyArray<string | JoinColumn> | undefined,
        readonly toTargetColumns?: ReadonlyArray<string | JoinColumn> | undefined
    }): PropData {
        const toThisArr: ReadonlyArray<JoinColumn> | undefined = 
            options.toThisColumns?.map(c => {
                if (typeof c == "string") {
                    return { columnName: c };
                }
                return c as JoinColumn;
            });
        const toTargetArr: ReadonlyArray<JoinColumn> | undefined = 
            options.toTargetColumns?.map(c => {
                if (typeof c === "string") {
                    return { columnName: c};
                }
                return c as JoinColumn;
            });
        return {
            ...this.$data,
            joinTable: {
                name: options.name,
                toThisColumns: toThisArr,
                toTargetColumns: toTargetArr
            }
        };
    }
}

export interface ReferenceProp<
    TModel extends Model<any, any, any, any>, 
    TNullity extends NullityType,
    TDirection extends DirectionType
> extends AssociatedProp<TModel, TNullity, TDirection> {
    $type(): {
        prop: [TModel, TNullity]  | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined
        referenceProp: [TModel, TNullity, TDirection] | undefined
    };
}

export interface CollectionProp<
    TModel extends Model<any, any, any, any>
> {
    $type(): {
        collectionProp: TModel | undefined
    };
}

export class OneToOneProp<
    TModel extends Model<any, any, any, any>,
    TNullity extends NullityType,
    TDirection extends DirectionType,
    TReference extends ReferenceType
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements ReferenceProp<TModel, TNullity, TDirection> {

    override $type(): {
        prop: [TModel, TNullity]  | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined,
        referenceProp: [TModel, TNullity, TDirection] | undefined,
        oneToOneProp: [TModel, TNullity, TDirection, TReference] | undefined
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

    nullable(): OneToOneProp<TModel, "NULLABLE", TDirection, TReference> {
        return new OneToOneProp(
            {...this.$data, nullity: "NULLABLE"}
        );
    }
}

class UnconfiguredOneToOneProp<
    TModel extends Model<any, any, any, any>,
    TNullity extends NullityType = "NONNULL",
    TDirection extends DirectionType = "OWNING",
    TReference extends ReferenceType = "REAL"
> extends OneToOneProp<TModel, TNullity, TDirection, TReference> {

    constructor(data: PropData) {
        super(data);
    }

    nullable(): UnconfiguredOneToOneProp<TModel, "NULLABLE", TDirection, TReference> {
        return new UnconfiguredOneToOneProp({...this.$data, nullity: "NULLABLE"});
    }

    mappedBy(mappedBy: OneToOneMappedByKeys<TModel>): OneToOneProp<TModel, "NULLABLE", "INVERSE", "VIRTUAL"> {
        return new OneToOneProp({...this.$data, mappedBy, nullity: "NULLABLE"});
    }

    joinColumns(
        ...joinColumns: ReadonlyArray<string | JoinColumn>
    ): OneToOneProp<TModel, TNullity, "OWNING", "REAL"> {
        return new OneToOneProp(this.dataOfJoinColumns(joinColumns));
    }

    joinTable(options: {
        readonly name?: string | undefined,
        readonly toThisColumns?: ReadonlyArray<string | JoinColumn> | undefined,
        readonly toTargetColumns?: ReadonlyArray<string | JoinColumn> | undefined
    }): OneToOneProp<TModel, TNullity, "OWNING", "VIRTUAL"> {
        return new OneToOneProp(this.dataOfJoinTable(options));
    }
}

export class ManyToOneProp<
    TModel extends Model<any, any, any, any>,
    TNullity extends NullityType,
    TDirection extends DirectionType,
    TReference extends ReferenceType
> extends AssociatedProp<TModel, TNullity, TDirection> 
implements ReferenceProp<TModel, TNullity, TDirection> {

    override $type(): {
        prop: [TModel, TNullity]  | undefined,
        associatedProp: [TModel, TNullity, TDirection] | undefined,
        referenceProp: [TModel, TNullity, TDirection] | undefined,
        manyToOneProp: [TModel, TNullity, TDirection, TReference] | undefined
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

    nullable(): ManyToOneProp<TModel, "NULLABLE", TDirection, TReference> {
        return new ManyToOneProp(
            {...this.$data, nullity: "NULLABLE"}
        );
    }
}

class UnconfiguredManyToOneProp<
    TModel extends Model<any, any, any, any>,
    TNullity extends NullityType = "NONNULL",
    TDirection extends DirectionType = "OWNING",
    TReference extends ReferenceType = "REAL"
> extends ManyToOneProp<TModel, TNullity, TDirection, TReference> {

    constructor(data: PropData) {
        super(data);
    }

    nullable(): UnconfiguredManyToOneProp<TModel, "NULLABLE", TDirection, TReference> {
        return new UnconfiguredManyToOneProp({...this.$data, nullity: "NULLABLE"});
    }

    joinColumns(
        ...joinColumns: ReadonlyArray<string | JoinColumn>
    ): ManyToOneProp<TModel, TNullity, "OWNING", "REAL"> {
        return new ManyToOneProp(this.dataOfJoinColumns(joinColumns));
    }

    joinTable(options: {
        readonly name?: string | undefined,
        readonly toThisColumns?: ReadonlyArray<string | JoinColumn> | undefined,
        readonly toTargetColumns?: ReadonlyArray<string | JoinColumn> | undefined
    }): ManyToOneProp<TModel, TNullity, "OWNING", "VIRTUAL"> {
        return new ManyToOneProp(this.dataOfJoinTable(options));
    }
}

export class OneToManyProp<
    TModel extends Model<any, any, any, any>,
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
        ...orders: Order<TModel>[]
    ): OneToManyProp<TModel, TNullity, TDirection> {
        return new OneToManyProp(
            {...this.$data, orders: [...orders] as ReadonlyArray<Order<any>> }
        );
    }
}

class UnconfiguredOneToManyProp<
    TModel extends Model<any, any, any, any>,
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
        ...orders: Order<TModel>[]
    ): UnconfiguredOneToManyProp<TModel, TNullity, TDirection> {
        return new UnconfiguredOneToManyProp(
            {...this.$data, orders: [...orders] as ReadonlyArray<Order<any>> }
        );
    }
}

export class ManyToManyProp<
    TModel extends Model<any, any, any, any>,
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
        ...orders: Order<TModel>[]
    ): ManyToManyProp<TModel, TNullity, TDirection> {
        return new ManyToManyProp(
            {...this.$data, orders: [...orders] as ReadonlyArray<Order<any>> }
        );
    }
}

class UnconfiguredManyToManyProp<
    TModel extends Model<any, any, any, any>,
    TNullity extends NullityType = "NONNULL",
    TDirection extends DirectionType = "OWNING"
> extends ManyToManyProp<TModel, TNullity, TDirection> {

    constructor(data: PropData) {
        super(data);
    }

    mappedBy(mappedBy: ManyToManyMappedByKeys<TModel>): ManyToManyProp<TModel, TNullity, "INVERSE"> {
        return new ManyToManyProp({...this.$data, mappedBy});
    }

    joinTable(options: {
        readonly name?: string | undefined,
        readonly toThisColumns?: ReadonlyArray<string | JoinColumn> | undefined,
        readonly toTargetColumns?: ReadonlyArray<string | JoinColumn> | undefined
    }): ManyToManyProp<TModel, TNullity, "OWNING"> {
        return new ManyToManyProp(this.dataOfJoinTable(options));
    }

    orderBy(
        ...orders: Order<TModel>[]
    ): UnconfiguredManyToManyProp<TModel, TNullity, TDirection> {
        return new UnconfiguredManyToManyProp(
            {...this.$data, orders: [...orders] as ReadonlyArray<Order<any>> }
        );
    }
}

type AssociationType = "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";

export type NullityType = "NONNULL" | "NULLABLE" | "INPUT_NONNULL";

type DirectionType = "OWNING" | "INVERSE";

type ReferenceType = "REAL" | "VIRTUAL";

type EmbeddedMember = 
    ScalarProp<any, any> 
    | OneToOneProp<any, any, "OWNING", "REAL"> 
    | ManyToOneProp<any, any, "OWNING", "REAL"> 
    | EmbeddedProp<any, any>;

type PropData = {
    readonly nullity: NullityType,
    readonly scalarType: string | undefined,
    readonly props: Record<string, Prop<any, any>> | undefined,
    readonly targetModel: Model<any, any, any, any> | undefined,
    readonly associationType: AssociationType | undefined,
    readonly columnName: string | undefined,
    readonly joinColumns: ReadonlyArray<JoinColumn> | undefined,
    readonly joinTable: {
        readonly name?: string | undefined,
        readonly toThisColumns: ReadonlyArray<JoinColumn> | undefined,
        readonly toTargetColumns: ReadonlyArray<JoinColumn> | undefined
    } | undefined
    readonly mappedBy: string | undefined,
    readonly orders: ReadonlyArray<Order<any>> | undefined
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

export type ReturnTypeOf<TProp> =
    TProp extends Prop<infer R, any>
        ? R
        : never;

export type NullityOf<TProp> =
    TProp extends Prop<any, infer R>
        ? R
        : never;