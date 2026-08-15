import { err, FetchOptions, FetchPageOptions, FetchRangeOptions, Page, RootQuery, spi } from "@ts-grm/core";

export async function exeuctePageQuery(
    query: RootQuery<any>,
    options: FetchPageOptions & FetchOptions<any>
): Promise<Page<any>> {
    const pageNo = options.pageNo ?? 1;
    if (pageNo < 1) {
        throw new err.ArgumentError(`options.pageNo must be greater than or equal to 1, but it is ${pageNo}`);
    }
    const pageSize = options.pageSize;
    if (pageSize < 1) {
        throw new err.ArgumentError(`options.pageNo must be greater than or equal to 1, but it is ${pageSize}`);
    }
    const count = await query.fetchCount();
    if (count === 0) {
        return {...EMPTY_PAGE, pageNo};
    }
    const pageCount = Math.ceil(count / pageSize);
    const actualPageNo = pageNo < pageCount ? pageNo : pageCount;
    const rangeOptions: FetchRangeOptions & FetchOptions<boolean> = {
        limit: pageSize,
        offset: actualPageNo === 0 
            ? undefined : 
            (actualPageNo - 1) * pageSize,
        nullAsUndefined: options.nullAsUndefined
    };
    const rows = await query.fetchRange(rangeOptions);
    return {
        totalRowCount: count,
        totalPageCount: pageCount,
        pageNo: actualPageNo,
        isFirstPage: actualPageNo === 1,
        isLastPage: actualPageNo === pageCount,
        rows
    };
}

const EMPTY_PAGE: Page<any> = {
    totalRowCount: 0,
    totalPageCount: 0,
    pageNo: 1,
    isFirstPage: false,
    isLastPage: false,
    rows: []
};

export function finalRangeOptions(
    options: FetchRangeOptions | undefined,
    atomQueryOptions: spi.AtomQueryOptions | undefined
): FetchRangeOptions | undefined {
    const offset = finalOffset(options, atomQueryOptions);
    const limit = finalLimit(options, atomQueryOptions);
    if (offset > 0 && limit === -1) {
        throw new err.StateError(`Illegal configuration: offset is configured but limit is not configured`);
    }
    return limit === -1 && offset === 0
        ? undefined
        : { 
            limit, 
            offset: offset !== 0 ? offset : undefined
        };
}

export function finalOffset(
    options: FetchRangeOptions | undefined,
    atomQueryOptions: spi.AtomQueryOptions | undefined
): number {
    const offsetArgs = options?.offset ?? 0;
    const offsetProp = atomQueryOptions?.offset ?? 0;
    if (offsetArgs !== 0 && offsetProp !== 0) {
        throw new err.StateError(`Conflict configuration: offset is configured in both query and fetch options`);
    }
    return Math.max(offsetArgs, offsetProp);
}

export function finalLimit(
    options: FetchRangeOptions | undefined,
    atomQueryOptions: spi.AtomQueryOptions | undefined
): number {
    const limitArgs = options?.limit ?? -1;
    const limitProp = atomQueryOptions?.limit ?? -1;
    if (limitArgs === -1) {
        return limitProp;
    }
    if (limitProp === -1) {
        return limitArgs;
    }
    return Math.min(limitArgs, limitProp);
}