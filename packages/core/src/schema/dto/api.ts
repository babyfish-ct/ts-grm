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

import { dtoMapper, type DtoMapper } from "@/impl/dto_mapper";
import { AnyModel } from "../model";
import { __AllAssociationMemberUnions, __DtoBody, __DtoMappingContract, __DtoType } from "./dto_context";
import { __AllModelMembers } from "../model_internal_types";
import { createDto, DtoContextFlags, newDtoContext } from "@/impl/dto_context";
import { Entity } from "@/impl/entity";
import { __Prettify, __UnionToIntersection } from "@/auxiliary_types";
import { __ViewCreator } from "@/schema/dto/internal_types";
import { __PropContract } from "../prop_internal_types";

export class View<TModel extends AnyModel, T> {

    __type(): { view: [TModel, T] | undefined } {
        return { view: undefined };
    };

    constructor(readonly mapper: DtoMapper) {}
}

export class Input<TModel extends AnyModel, T, TAssociationMembers> {

    __type(): { input: [TModel, T, TAssociationMembers] | undefined } {
        return { input: undefined };
    };

    constructor(readonly mapper: DtoMapper) {}
}

export type TypeOf<TDto> =
    TDto extends View<any, infer R>
        ? R
    : TDto extends Input<any, infer R, any>
        ? R 
    : never;

export type InputAssociationMembers<TInput> =
    TInput extends Input<any, any, infer AssociationMembers>
        ? AssociationMembers
        : {};

export type ReferenceFetchType = 
    "LOAD" | "JOIN_LOW_OFFSET_ONLY";

export const dto = {
    view: viewCreator(),
    input: newInput
} as const;

function viewCreator(): __ViewCreator {
    const fun = newView;
    (fun as any).nullAsUndefined = newViewByNullAsUndefined;
    return fun as __ViewCreator;
}

function newView<
    TModel extends AnyModel,
    const TMappings extends ReadonlyArray<
        __DtoMappingContract<TModel>
    >,
>(
    model: TModel,
    fn: __DtoBody<TModel, "NULL_VIEW", "ENTITY", __AllModelMembers<TModel>, TMappings>
): View<
    TModel, 
    __Prettify<__DtoType<TMappings, undefined>>
> {
    const entity = Entity.of(model);
    const ctx = newDtoContext(entity, DtoContextFlags.None) as any;
    const dto = createDto(ctx, undefined, fn);
    return new View(dtoMapper(dto, false, false));
}

function newViewByNullAsUndefined<
    TModel extends AnyModel,
    const TMappings extends ReadonlyArray<
        __DtoMappingContract<TModel>
    >,
>(
    model: TModel,
    fn: __DtoBody<TModel, "UNDEFINED_VIEW", "ENTITY", __AllModelMembers<TModel>, TMappings>
): View<
    TModel, 
    __Prettify<__DtoType<TMappings, undefined>>
> {
    const entity = Entity.of(model);
    const ctx = newDtoContext(entity, DtoContextFlags.None) as any;
    const dto = createDto(ctx, undefined, fn);
    return new View(dtoMapper(dto, false, true));
}

function newInput<
    TModel extends AnyModel,
    const TMappings extends ReadonlyArray<
        __DtoMappingContract<TModel>
    >,
>(
    model: TModel,
    fn: __DtoBody<TModel, "INPUT", "ENTITY", __AllModelMembers<TModel>, TMappings>
): Input<
    TModel, 
    __Prettify<__DtoType<TMappings, undefined>>,
    __UnionToIntersection<__AllAssociationMemberUnions<TMappings>>
> {
    const entity = Entity.of(model);
    const ctx = newDtoContext(entity, DtoContextFlags.Input) as any;
    const dto = createDto(ctx, undefined, fn);
    return new Input(dtoMapper(dto, true, false));
}

export type DissociateMode = "ERROR" | "SET_NULL" | "DELETE";