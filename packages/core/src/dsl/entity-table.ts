import { CtorMembers, Model, ModelCtor } from "@/schema/model";
import { EmbeddedProp, NullityType, ReferenceProp, ScalarProp } from "@/schema/prop";
import { ExpressionType } from "./expression";

export type EntityTable<TModel extends Model<any, any>> = 
    DslMembers<CtorMembers<ModelCtor<TModel>>, "NONNULL">;

type DslMembers<TMembers, TNullity extends NullityType> = {
    [K in keyof TMembers]: 
        TMembers[K] extends ScalarProp<infer R, infer Nullity>
            ? ExpressionType<R, CombinedNullity<TNullity, Nullity>> 
        : TMembers[K] extends EmbeddedProp<infer R, infer Nullity>
            ? DslMembers<R, CombinedNullity<TNullity, Nullity>>
        : TMembers[K] extends ReferenceProp<infer R, infer Nullity>
            ? DslMembers<R, CombinedNullity<TNullity, Nullity>>
        : never
};

type CombinedNullity<
    TNullity1 extends NullityType, 
    TNullity2 extends NullityType
> = TNullity1 extends "NULLABLE"
        ? "NULLABLE"
    : TNullity2 extends "NULLABLE"
        ? "NULLABLE"
    : "NONNULL";
