import { count } from "./aggregate";
import { and, not, or } from "./expression";
import { all, any, exists, notExists, subQuery } from "./sub-query";
import { unionAll, union, minus, intersect } from "./merge";
import { num } from "./native";

export const dsl = {
    subQuery,
    count,
    and,
    or,
    not,
    all,
    any,
    exists,
    notExists,
    unionAll,
    union,
    minus,
    intersect,
    native: {
        num
    }
};
