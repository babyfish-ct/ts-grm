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

import { AnyModel } from "../model";
import { __ContextKind, __DtoBody, __DtoType, __DtoKind } from "./dto_context";
import { __SelfMappings } from "./utils";

export interface __FoldContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TContextKind extends __ContextKind,
    TMembers
> {

    $fold<
        TName extends string,
        const TMappings extends __SelfMappings<TModel>
    >(
        name: TName,
        body: __DtoBody<TModel, TDtoKind, TContextKind, TMembers, TMappings>
    ): __FoldMapping<TModel, TDtoKind, TName, TMappings>;
}

export interface __FoldMapping<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TName extends string,
    TMappings extends __SelfMappings<TModel>
> {

    readonly __mappingType: 'FOLD';
    readonly __model?: TModel;
    readonly __dtoKind?: TDtoKind;
    readonly __name?: TName;
    readonly __mappings?: TMappings;
}

export type __FoldDtoType<TMapping> =
    TMapping extends __FoldMapping<any, any, infer Name, infer Mappings>
        ? { [K in Name]: __DtoType<Mappings> }
        : never;