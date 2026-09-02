import { __OneToManyPropContract } from "@/index_internal";
import { AssociatedSaveMode } from "./sql_client";
import { DissociateMode } from "@/schema/dto/api";

export type __AssociatedSaveModeOptions<
    TAssociationMembers 
> = {
    readonly [K in keyof TAssociationMembers]?: AssociatedSaveMode;
}

export type __OnDissociateOptions<
    TAssociationMembers
> = {
    readonly [K in keyof TAssociationMembers as
        TAssociationMembers[K] extends __OneToManyPropContract<any, any, any, any, any>
            ? K
            : never
    ]?: DissociateMode;
};