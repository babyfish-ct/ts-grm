import { AssociationType, Prop, PropData, ScalarType } from "@/schema/prop";
import { Entity } from "./entity";
import { PropError } from "@/error/metadata_error";
import { ModelImpl } from "./model_impl";
import { dedent } from "@/error/util";
import { EntityPropOrder } from "./entity_prop_order";
import { makeErr } from "../util";
import { StateError } from "@/error/common";

export class EntityProp {

    readonly nullable: boolean;

    readonly inputNonNull: boolean;

    readonly scalarType: ScalarType | undefined;

    readonly associationType: AssociationType | undefined;

    readonly props: ReadonlyMap<string, EntityProp> | undefined;

    private _targetEntity: Entity | undefined;

    private _orders:  ReadonlyArray<EntityPropOrder> | undefined = undefined;

    private _oppositeProp: EntityProp | undefined;

    private _phase = 0;

    readonly referencedKeyPropName: string | undefined;

    private _referenceKeyProp: EntityProp | undefined;

    private _referenceProp: EntityProp | undefined;

    constructor(
        readonly declaringEntity: Entity,
        readonly name: string,
        private readonly _data: PropData,
        readonly parentProp: EntityProp | undefined
    ) {
        this.validateData();
        this.nullable = _data.nullity !== "NONNULL";
        this.inputNonNull = _data.nullity != "NULLABLE";   
        this.scalarType = _data.scalarType; 
        this.associationType = _data.associationType;
        if (_data.props != null) {
            this.props = this.createProps(_data.props);
        } else {
            this.props = undefined;
        }
        if (_data.targetModel != null) {
            const targetModel: ModelImpl<any, any, any, any, any> =
                typeof _data.targetModel === "function"
                    ? _data.targetModel() as ModelImpl<any, any, any, any, any>
                    : _data.targetModel as ModelImpl<any, any, any, any, any>;
            if (targetModel == null) {
                this.raise `The associatied model must be specified`
            }
            this._targetEntity = targetModel.toUnresolvedEntity();
        } else {
            this._targetEntity = undefined;
        }
        this.referencedKeyPropName = this._referencedKeyPropName();
    }

    get targetEntity(): Entity | undefined {
        return this._targetEntity?.resolve(2);
    }

    get oppositeProp(): EntityProp | undefined {
        this.declaringEntity.resolve(2);
        return this._oppositeProp;
    }

    get orders(): ReadonlyArray<EntityPropOrder> {
        this.declaringEntity.resolve(2);
        return this._orders ?? 
            makeErr(`The orders of ${this.declaringEntity.name}.${this.name} 
                is not initialized`);
    }

    get referenceKeyProp(): EntityProp | undefined {
        return this._referenceKeyProp;
    }

    get referenceProp(): EntityProp | undefined {
        return this._referenceProp;
    }

    private validateData() {
        if (this._data!!.associationType == null) {
            this.validateSimpleData();
        } else {
            this.validateAssociationData();
        }
    }

    private validateSimpleData() {
        const data = this._data;
        if (data.joinColumns != null) {
            this.raise `The "joinColumns" cannot be specified for non-association property.`;
        }
        if (data.joinTable != null) {
            this.raise `The "joinTable" cannot be specified for non-association property.`;
        }
        if (data.orders != null) {
            this.raise `The "orders" cannot be specified for non-association property.`;
        }
        if (data.targetModel != null) {
            this.raise `The "targetModel" cannot be specified for non-association property.`;
        }
        if (data.mappedBy != null) {
            this.raise `The "mappedBy" cannot be specified for non-association property.`;
        }
        if (data.scalarType == null && data.props == null && data.reference == null) {
            this.raise `Either "scalarType", "props", or "reference" 
            must be specified for non-association property.`;
        }
        if (data.scalarType != null && data.props != null) {
            this.raise `Both "scalarType" and "props" cannot be specified 
            simultaneously for non-association property.`;
        }
    }

    private validateAssociationData() {
        const data = this._data!!;
        if (data.associationType !== "ONE_TO_ONE" &&
            data.associationType !== "ONE_TO_MANY" &&
            data.associationType !== "MANY_TO_ONE" &&
            data.associationType !== "MANY_TO_MANY"
        ) {
            this.raise `The association type must be 
            "ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", or "MANY_TO_MANY".`
        }
        if (data.scalarType != null) {
            this.raise `The "scalarType" cannot be specified for association property.`;
        }
        if (data.props != null) {
            this.raise `The "props" cannot be specified for association property.`;
        }
        if (data.columnName != null) {
            this.raise `The "columnName" for association property cannot be specified; 
            please specify either joinColumns or joinTable.`;
        }
        if (data.joinColumns != null && data.joinTable != null) {
            this.raise `Both "joinColumns" and "joinTable" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.joinColumns != null && data.mappedBy != null) {
            this.raise `Both "joinColumns" and "mappedBy" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.joinTable != null && data.mappedBy != null) {
            this.raise `Both "joinTable" and "mappedBy" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.orders != null && 
            data.associationType !== "ONE_TO_MANY" && 
            data.associationType !== "MANY_TO_MANY"
        ) {
            this.raise `"orders" can only be specified for 
            one-to-many or many-to-one property.`;
        }
    }

    resolve(phase: number) {
        const max = Math.max(Math.min(phase, 2), 0);
        for (let i = this._phase + 1; i <= max; i++) {
            this._resolve(i);
        }
    }

    private _resolve(phase: number) { 
        if (this._phase >= phase) {
            return;
        }
        if (phase == 2) {
            this._initOrders();
            this._initMappedBy();
        }
        this._resolveTarget(phase);
    }

    private _referencedKeyPropName(): string | undefined {
        if (this._data.associationType == null || 
            this._data.associationType === "ONE_TO_MANY" ||
            this._data.associationType === "MANY_TO_MANY" ||
            this._data.mappedBy != null ||
            this._data.joinTable != null
        ) {
            return undefined;
        }
        return this._data?.joinColumns?.referencedProp ??
            this._targetEntity!!.idKey;
    }

    private _initOrders() {
        if (this._data.orders == null) {
            this._orders = [];
        } else {
            const orders = new Array<EntityPropOrder>(this._data.orders.length);
            const paths = new Set<string>();
            let index = 0;
            for (const ord of this._data.orders) {
                const path = typeof ord === "string" ? ord as string : ord.path;
                const desc = typeof ord === "string" ? false : ord.desc;
                const nulls = typeof ord === "string" ? "UNSPECIFIED" : ord.nulls;
                if (paths.has(ord.path)) {
                    this.raise `Duplicated order paths "${path}"`
                }
                const prop = this._targetEntity!!.expanedPropMap.get(path);
                if (prop == null) {
                    throw this.raise `Illegal order path "${path}" 
                    which deos not exists in target model ${this._targetEntity?.name}`
                }
                orders[index++] = { prop, desc, nulls };
            }
            this._orders = orders;
        }
    }

    private _initMappedBy() {
        if (this._data.mappedBy == null) {
            return;
        }
        const prop = this._targetEntity?.expanedPropMap.get(this._data.mappedBy);
        if (prop == null) {
            throw this.raise `Illegal mappedBy "${this._data.mappedBy}" 
            which deos not exists in target model ${this._targetEntity?.name}`
        }
        if (prop._targetEntity !== this.declaringEntity) {
            this.raise `Illegal mappedBy property 
            "${prop?.declaringEntity.name}.${prop?.name}", 
            its target model is not this model`
        }
        // TODO 
        this._oppositeProp = prop!!;
        prop!!._oppositeProp = this;
    }

    private _resolveTarget(phase: number) {
        this._targetEntity?.resolve(phase);
    }

    collectDeeperProps(map: Map<string, EntityProp>) {
        this._collectDeeperProps(undefined, map);
    }

    private _collectDeeperProps(prefix: string | undefined, map: Map<string, EntityProp>) {
        if (prefix != null) {
            map.set(`${prefix}.${this.name}`, this);
        }
        if (this.props != null) {
            for (const prop of this.props.values()) {
                prop._collectDeeperProps(
                    prefix == null ? this.name : `${prefix}.${this.name}`,
                    map
                );
            }
        }
    }

    // @ts-ignore
    private _setReferenceProp(prop: EntityProp) {
        if (this._referenceProp != null || prop._referenceKeyProp != null) {
            throw new StateError("Internal bug");
        }
        this._referenceProp = prop;
        prop._referenceKeyProp = this;
    }

    private raise(strings: TemplateStringsArray, ...values: any[]): never {
        if (this.parentProp != null) {
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
            if (prop == null) {
                continue;
            }
            if (prop.__data.associationType != null) {
                this.raise `The internal property of an embedded property 
                    cannot be association property.`;
            }
            resultMap.set(key, new EntityProp(this.declaringEntity, key, prop.__data, this));
        }
        return resultMap;
    }

    toJSON(): any {
        return {
            prop: true,
            declaringEntity: this.declaringEntity,
            name: this.name
        };
    }

    toString(): string {
        return this.parentProp != null
            ? `${this.parentProp.toString()}.${this.name}`
            : `${this.declaringEntity.name}.${this.name}`;
    }
}
