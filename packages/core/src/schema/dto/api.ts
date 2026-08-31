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
import { __AllAssociationPaths, __DtoBody, __DtoMapping, __DtoType } from "./dto_context";
import { __AllModelMembers } from "../model_internal_types";
import { createDto, newDtoContext } from "@/impl/dto_context";
import { Entity } from "@/impl/entity";
import { __Prettify } from "@/auxiliary_types";
import { __ViewCreator } from "@/schema/dto/internal_types";

export class View<TModel extends AnyModel, T> {

    __type(): { view: [TModel, T] | undefined } {
        return { view: undefined };
    };

    constructor(readonly mapper: DtoMapper) {}
}

export class Input<TModel extends AnyModel, T, TAssociationPaths extends string | never> {

    __type(): { input: [TModel, T, TAssociationPaths] | undefined } {
        return { input: undefined };
    };
}

export type TypeOf<TDto> =
    TDto extends View<any, infer R>
        ? R
    : TDto extends Input<any, infer R, any>
        ? R 
    : never;

export type SelectableAssocaitionPaths<TInput> =
    TInput extends Input<any, any, infer Paths>
        ? Paths extends string
            ? "$all" | "$root" | Paths
            : never
        : never;

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
        __DtoMapping<TModel>
    >,
>(
    model: TModel,
    fn: __DtoBody<TModel, "NULL_VIEW", "ENTITY", __AllModelMembers<TModel>, TMappings>
): View<
    TModel, 
    __Prettify<__DtoType<TMappings, undefined>>
> {
    const entity = Entity.of(model);
    const ctx = newDtoContext(entity, false) as any;
    const dto = createDto(ctx, undefined, fn);
    return new View(dtoMapper(dto, false));
}

function newViewByNullAsUndefined<
    TModel extends AnyModel,
    const TMappings extends ReadonlyArray<
        __DtoMapping<TModel>
    >,
>(
    model: TModel,
    fn: __DtoBody<TModel, "UNDEFINED_VIEW", "ENTITY", __AllModelMembers<TModel>, TMappings>
): View<
    TModel, 
    __Prettify<__DtoType<TMappings, undefined>>
> {
    const entity = Entity.of(model);
    const ctx = newDtoContext(entity, false) as any;
    const dto = createDto(ctx, undefined, fn);
    return new View(dtoMapper(dto, true));
}

function newInput<
    TModel extends AnyModel,
    const TMappings extends ReadonlyArray<
        __DtoMapping<TModel>
    >,
>(
    _model: TModel,
    _fn: __DtoBody<TModel, "INPUT", "ENTITY", __AllModelMembers<TModel>, TMappings>
): Input<
    TModel, 
    __Prettify<__DtoType<TMappings, undefined>>,
    __AllAssociationPaths<TMappings>
> {
    // const entity = Entity.of(model);
    // const ctx = newDtoContext(entity, false) as any;
    //const dto = createDto(ctx, undefined, fn);
    return new Input();
}