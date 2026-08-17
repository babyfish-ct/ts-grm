import { err, spi } from "@ts-grm/core";

export class IllegalJoinFetchError extends err.GrmError {

    constructor(
        joinFetchFields: ReadonlyArray<spi.DtoMapperField>,
        offset: number,
        maxJoinFetchOffset: number
    ) {
        super(
            `Unable to execute join fetch at a large offset: the selected DTOs contain association ` +
            `properties with fetchType "JOIN_LOW_OFFSET_ONLY" (${joinFetchFields.map(jff => jff.prop.toString()).join(", ")}), ` +
            `whose join fetch is only allowed when the query offset does not exceed the configured limit. ` +
            `Current offset is ${offset}, but the configured maxJoinFetchOffset is ${maxJoinFetchOffset}. ` +
            `To fix this, either reduce the offset (e.g. use a smaller page number/size), increase ` +
            `"maxJoinFetchOffset" in the global configuration, or change the fetch type of these ` +
            `properties from "JOIN_LOW_OFFSET_ONLY" to a "LOAD"`
        );
    }
}