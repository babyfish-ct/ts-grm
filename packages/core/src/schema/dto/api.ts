import { dtoMapper, type DtoMapper } from "@/impl/dto_mapper";
import { AnyModel } from "../model";
import { __DtoBody, __DtoMapping, __DtoType } from "./dto_context";
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

export type TypeOf<TView> =
    TView extends View<any, infer R>
        ? R
        : never;

export type ReferenceFetchType = 
    "LOAD" | "JOIN_LOW_OFFSET_ONLY";

export const dto = {
    view: viewCreator()
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
    __Prettify<__DtoType<TMappings>>
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
    __Prettify<__DtoType<TMappings>>
> {
    const entity = Entity.of(model);
    const ctx = newDtoContext(entity, false) as any;
    const dto = createDto(ctx, undefined, fn);
    return new View(dtoMapper(dto, true));
}