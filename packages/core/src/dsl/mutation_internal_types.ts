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

import { __OneToManyPropContract, __Prettify } from "@/index_internal";
import { AssociatedSaveMode } from "./mutation";
import { DissociateMode } from "@/schema/dto/api";

export type __AssociatedSaveModeOptions<
    TAssociationMembers 
> = {
    readonly [K in keyof TAssociationMembers]?: AssociatedSaveMode;
}

export type __DissociationOptions<
    TAssociationMembers
> = {
    readonly [K in keyof TAssociationMembers as
        TAssociationMembers[K] extends __OneToManyPropContract<any, any, any, any>
            ? K
            : never
    ]?: DissociateMode;
};

export type __AffectRowsResult<
    TAssociationMembers
> = __Prettify<{
        readonly $total: number;
    } & {
        readonly [K in keyof TAssociationMembers]: number;
    }
>;
