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

import { DtoMapper, DtoMapperField } from "../dto_mapper";
import { Entity } from "../entity";
import { InputFlags } from "../input_flags";

export interface EntityNode {
    readonly raw: Entity;
    readonly fields: Array<DtoMapperField>;
    superNode: EntityNode | undefined;
    readonly derivedNodes: Array<EntityNode>;
    filter(fn: (field: DtoMapperField) => void): EntityNode;
    toJSON(): any;
}

export function createEntityNode(
    mapper: DtoMapper
): EntityNode {
    const fieldGroupMap = new Map<Entity, Array<DtoMapperField>>();
    for (const field of mapper.fields) {
        if ((field.inputFlags & InputFlags.NonWritable) === InputFlags.NonWritable) {
            continue;
        }
        const prop = field.prop;
        const entity = prop.declaringEntity!.tableEntity;
        let fields = fieldGroupMap.get(entity);
        if (fields == null) {
            fields = [field];
            fieldGroupMap.set(entity, fields);
        } else {
            fields.push(field);
        }
    }
    return createEntityNodeImpl(mapper.entity, fieldGroupMap);
}

function createEntityNodeImpl(
    currentEntity: Entity, 
    fieldGroupMap: ReadonlyMap<Entity, Array<DtoMapperField>>
): EntityNode {
    const nodeMap = new Map<Entity, EntityNode>();
    for (const [entity, fields] of fieldGroupMap.entries()) {
        nodeMap.set(entity, { 
            raw: entity, 
            fields,
            superNode: undefined, 
            derivedNodes: [],
            filter,
            toJSON
        });
    }
    const processed = new Set<Entity>();
    function process(entity: Entity, ancestorEntity: Entity | undefined) {
        if (ancestorEntity == null) {
            return;
        }
        if (processed.has(entity)) {
            return;
        }
        processed.add(entity);
        const node = nodeMap.get(entity)!;
        const superNode = nodeMap.get(ancestorEntity);
        if (superNode == null) {
            process(entity, ancestorEntity.superEntity);
        } else {
            node.superNode = superNode;
            superNode.derivedNodes.push(node);
        }
    }
    for (const node of nodeMap.values()) {
        const entity = node.raw;
        process(entity, entity.superEntity);
    }
    return nodeMap.get(currentEntity.tableEntity)!;
}

function filter(
    this: EntityNode, 
    fn: (field: DtoMapperField) => void
): EntityNode {
    return { 
        ...this,
        fields: this.fields.filter(fn)
    };
}

function toJSON(this: EntityNode): any {
    return _toJSON(this, 3);
}

function _toJSON(node: EntityNode, direction: number): any {
    let json: any = { 
        raw: node.raw.name, 
        fields: node.fields.map(f => f.bridgeProp?.toString() ?? f.prop.toString()) 
    };
    if ((direction & 1) !== 0 && node.superNode != null) {
        json = { ...json, superNode: _toJSON(node.superNode, 1) };
    }
    if ((direction & 2) !== 0 && node.derivedNodes.length !== 0) {
        json = { ...json, derivedNodes: node.derivedNodes.map(n => _toJSON(n, 2)) };
    }
    return json;
}