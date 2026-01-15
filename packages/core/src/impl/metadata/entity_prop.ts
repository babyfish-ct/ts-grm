import { Prop, PropData, ScalarType } from "@/schema/prop";
import { Entity } from "./entity";
import { PropError } from "@/error/metadata_error";
import { ModelImpl } from "./model_impl";
import { dedent } from "@/error/util";

export class EntityProp {

    readonly nullable: boolean;

    readonly inputNonNull: boolean;

    readonly scalarType: ScalarType | undefined;

    readonly props: ReadonlyMap<string, EntityProp> | undefined;

    readonly targetEntity: Entity | undefined;

    private _orders:  ReadonlyArray<{
        readonly prop: EntityProp;
        readonly desc: boolean;
    }> | undefined = undefined;

    private _oppositeProp: EntityProp | undefined;

    private _resolved = false;

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
        if (_data.props !== undefined) {
            this.props = this.createProps(_data.props);
        } else {
            this.props = undefined;
        }
        if (_data.targetModel !== undefined) {
            const targetModel: ModelImpl<any, any, any, any, any> =
                typeof _data.targetModel === "function"
                    ? _data.targetModel() as ModelImpl<any, any, any, any, any>
                    : _data.targetModel as ModelImpl<any, any, any, any, any>;
            if (targetModel === undefined) {
                this.raise `The associatied model must be specified`
            }
            this.targetEntity = targetModel.toEntity();
        } else {
            this.targetEntity = undefined;
        }
    }

    private validateData() {
        if (this._data!!.associationType === undefined) {
            this.validateSimpleData();
        } else {
            this.validateAssociationData();
        }
    }

    private validateSimpleData() {
        const data = this._data;
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
        const data = this._data!!;
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

    resolve() {
        if (this._resolved) {
            return;
        }
        this._initOrders();
        this._initMappedBy();
        this._resolveTarget();
    }

    private _initOrders() {
        if (this._data.orders === undefined) {
            this._orders = [];
        } else {
            const orders = new Array<{
                prop: EntityProp,
                desc: boolean
            }>(this._data.orders.length);
            const paths = new Set<string>();
            let index = 0;
            for (const ord of this._data.orders) {
                if (paths.has(ord.path)) {
                    this.raise `Duplicated order paths "${ord.path}"`
                }
                const prop = this.targetEntity!!.expanedPropMap.get(ord.path);
                if (prop === undefined) {
                    this.raise `Illegal order path "${ord.path}" 
                    which deos not exists in target model ${this.targetEntity?.name}`
                }
                orders[index++] = { prop: prop!!, desc: ord.mode === "DESC" };
            }
            this._orders = orders;
        }
    }

    private _initMappedBy() {
        if (this._data.mappedBy === undefined) {
            return;
        }
        const prop = this.targetEntity?.expanedPropMap.get(this._data.mappedBy);
        if (prop === undefined) {
            this.raise `Illegal mappedBy "${this._data.mappedBy}" 
            which deos not exists in target model ${this.targetEntity?.name}`
        }
        if (prop?.targetEntity !== this.declaringEntity) {
            this.raise `Illegal mappedBy property 
            "${prop?.declaringEntity.name}.${prop?.name}", 
            its target model is not this model`
        }
        // TODO 
        this._oppositeProp = prop!!;
        prop!!._oppositeProp = this;
    }

    private _resolveTarget() {
        this.targetEntity?.resolve(2);
    }

    collectDeeperProps(map: Map<string, EntityProp>) {
        this._collectDeeperProps(undefined, map);
    }

    private _collectDeeperProps(prefix: string | undefined, map: Map<string, EntityProp>) {
        if (prefix != undefined) {
            map.set(`${prefix}.${this.name}`, this);
        }
        for (const prop of this.props!!.values()) {
            prop._collectDeeperProps(
                prefix === undefined ? prop.name : `${prefix}.${prop.name}`,
                map
            );
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