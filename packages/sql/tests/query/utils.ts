import { Composite } from "@/sql/fragment";
import { SqlBuilder } from "@/sql/sql_builder";
import { dto, spi, RootQuery } from "@ts-grm/core";
import { AUTHOR, BOOK, BOOK_STORE, COMMENT, COURSE, ORDER, ORDER_ITEM, PAPER_BOOK, PHYSICAL_BOOK_STORE, STUDENT, TREE_NODE } from "../model/model";
import { AtomRootQueryImpl } from "@/impl/atom_root_query_impl";
import { MergedRootQueryImpl } from "@/impl/merged_query";

export function sql(q: RootQuery<any>): string {
    const contract = q as any as spi.QueryContract;
    const sqlClient = contract.kind === "ATOM"
        ? (q as AtomRootQueryImpl<any>).mutableQuery.sqlClient
        : (q as MergedRootQueryImpl<any>).sqlClient;
    const composite = Composite.of(q, sqlClient, undefined, false);
    const builder = SqlBuilder.of(sqlClient);
    composite.into(builder);
    const [sql] = builder.build();
    return sql;
}

export const SIMPLE_BOOK_VIEW = dto.view(BOOK, c => [
    c.id,
    c.name,
    c.edition
]);

export const SIMPLE_STORE_VIEW = dto.view(BOOK_STORE, c => [
    c.id,
    c.name,
    c.version
]);

export const SIMPLE_PAPER_BOOK_VIEW = dto.view(PAPER_BOOK, c => [c.$allScalars]);

export const SIMPLE_PHYSICAL_BOOK_STORE_VIEW = dto.view(PHYSICAL_BOOK_STORE, c => [c.$allScalars]);

export const SIMPLE_TREE_NODE_VIEW = dto.view(TREE_NODE, c => [c.$allScalars]);

export const SIMPLE_AUTHOR_VIEW = dto.view(AUTHOR, c => [
    c.id,
    c.name
]);

export const SIMPLE_ORDER_VIEW = dto.view(ORDER, c => [c.$allScalars]);

export const SIMPLE_ITEM_VIEW = dto.view(ORDER_ITEM, c => [
    c.id,
    c.productName
]);

export const SIMPLE_COMMENT_VIEW = dto.view(COMMENT, c => [
    c.id,
    c.name
]);

export const SIMPLE_STUDENT_VIEW = dto.view(STUDENT, c => [
    c.id,
    c.name
]);

export const SIMPLE_COURSE_VIEW = dto.view(COURSE, c => [
    c.id,
    c.name
]);