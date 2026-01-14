import { Prop, PropData, ScalarType } from "@/schema/prop";
import { Entity } from "./entity";
import { PropError } from "@/error/metadata_error";

export class EntityProp {

    readonly nullable: boolean;

    readonly inputNonNull: boolean;

    readonly scalarType: ScalarType | undefined;

    readonly props: ReadonlyMap<string, EntityProp> | undefined;

    readonly targetEntity: Entity | undefined;

    private _unresolvedData: PropData | undefined;

    readonly orders:  ReadonlyArray<{
        readonly path: string;
        readonly desc: string;
    }> | undefined;

    constructor(
        readonly declaringEntity: Entity,
        readonly name: string,
        data: PropData,
        readonly parentProp: EntityProp | undefined
    ) {
        this._unresolvedData = data;
        this.validateData();
        this.nullable = data.nullity !== "NONNULL";
        this.inputNonNull = data.nullity != "NULLABLE";   
        this.scalarType = data.scalarType; 
        if (data.props !== undefined) {
            this.props = this.createProps(data.props);
        } else {
            this.props = undefined;
        }
        if (data.targetModel !== undefined) {
            if (typeof data.targetModel === "function") {
                this.targetEntity = data.targetModel() as Entity;
            } else {
                this.targetEntity = data.targetModel as Entity;
            }
            this.orders = undefined;
        } else {
            this.targetEntity = undefined;
            this.orders = undefined;
        }
    }

    private validateData() {
        if (this._unresolvedData!!.associationType === undefined) {
            this.validateSimpleData();
        } else {
            this.validateAssociationData();
        }
    }

    private validateSimpleData() {
        const data = this._unresolvedData!!;
        if (data.joinColumns != undefined) {
            this.raise `The "joinColumns" cannot be specified for non-association property.`;
        }
        if (data.joinTable !== undefined) {
            this.raise `The "joinTable" cannot be specified for non-association property.`;
        }
        if (data.orders !== undefined) {
            this.raise `The "orders" cannot be specified for non-association property.`;
        }
        if (data.targetModel !== undefined) {
            this.raise `The "targetModel" cannot be specified for non-association property.`;
        }
        if (data.mappedBy !== undefined) {
            this.raise `The "mappedBy" cannot be specified for non-association property.`;
        }
        if (data.scalarType === undefined && data.props === undefined) {
            this.raise `Either "scalarType" or "props" must be specified for non-association property.`;
        }
        if (data.scalarType !== undefined && data.props != undefined) {
            this.raise `Both "scalarType" and "props" cannot be specified 
            simultaneously for non-association property.`;
        }
    }

    private validateAssociationData() {
        const data = this._unresolvedData!!;
        if (data.associationType !== "ONE_TO_ONE" &&
            data.associationType !== "ONE_TO_MANY" &&
            data.associationType !== "MANY_TO_ONE" &&
            data.associationType !== "MANY_TO_MANY"
        ) {
            this.raise `The association type must be 
            "ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", or "MANY_TO_MANY".`
        }
        if (data.scalarType !== undefined) {
            this.raise `The "scalarType" cannot be specified for association property.`;
        }
        if (data.props !== undefined) {
            this.raise `The "props" cannot be specified for association property.`;
        }
        if (data.columnName !== undefined) {
            this.raise `The "columnName" for association property cannot be specified; 
            please specify either joinColumns or joinTable.`;
        }
        if (data.joinColumns !== undefined && data.joinTable != undefined) {
            this.raise `Both "joinColumns" and "joinTable" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.joinColumns !== undefined && data.mappedBy !== undefined) {
            this.raise `Both "joinColumns" and "mappedBy" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.joinTable !== undefined && data.mappedBy !== undefined) {
            this.raise `Both "joinTable" and "mappedBy" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.orders !== undefined && 
            data.associationType !== "ONE_TO_MANY" && 
            data.associationType !== "MANY_TO_MANY"
        ) {
            this.raise `"orders" can only be specified for 
            one-to-many or many-to-one property.`;
        }
    }

    private raise(strings: TemplateStringsArray, ...values: any[]): never {
        if (this.parentProp !== undefined) {
            throw new PropError(
                this.parentProp.declaringEntity.name,
                `this.parentProp.name.${this.name}`,
                dedent(strings, ...values)
            );
        }
        throw new PropError(
            this.declaringEntity.name,
            this.name,
            dedent(strings, ...values)
        );
    }

    private createProps(
        props: Record<string, Prop<any, any>>
    ): ReadonlyMap<string, EntityProp> {
        const resultMap = new Map<string, EntityProp>();
        for (const key in props) {
            const prop = props[key];
            if (prop === undefined) {
                continue;
            }
            if (prop.__data.associationType !== undefined) {
                this.raise `The internal property of an embedded property 
                    cannot be association property.`;
            }
            resultMap.set(key, new EntityProp(this.declaringEntity, key, prop.__data, this));
        }
        return resultMap;
    }
}