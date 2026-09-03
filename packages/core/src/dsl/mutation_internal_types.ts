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
        TAssociationMembers[K] extends __OneToManyPropContract<any, any, any, any, any>
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
