import { Composite } from "@/sql/fragment";
import { ApplyPaginationOptions } from "./deriver";
import { SqlServerDriver } from "./sqlserver_driver";

export class SqlServer2012Driver extends SqlServerDriver {

    applyPagination(original: Composite, options: ApplyPaginationOptions): Composite {
        return this.applyOffsetFetch(original, options, true);
    }
}