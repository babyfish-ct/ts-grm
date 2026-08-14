import { Composite } from "@/sql/fragment";
import { ApplyPaginationOptions } from "./deriver";
import { OracleDriver } from "./oracle_driver";

export class Oracle12Drivier extends OracleDriver {

    applyPagination(
        original: Composite, 
        options: ApplyPaginationOptions
    ): Composite {
        return this.applyOffsetFetch(original, options, true);
    }
}