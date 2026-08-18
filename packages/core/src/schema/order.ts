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

import { AnyModel } from "@/schema/model";
import { __OrderedKeys } from "./model_internal_types";

export type ModelOrder<TModel extends AnyModel> = 
    __OrderedKeys<TModel> 
    | {
        readonly path: __OrderedKeys<TModel>;
        readonly desc?: boolean;
        readonly nulls?: OrderNullsType;
    };

export type OrderNullsType = "UNSPECIFIED" | "FIRST" | "LAST";