import { Entity } from "@/impl/metadata/entity";
import { PAPER_BOOK } from "../../model/model";
import { expect, test } from "vitest";

test("TestEntity", () => {
    const paperBookEntity = Entity.of(PAPER_BOOK);
    expect(
        [...paperBookEntity.declaredPropMap.keys()].sort()
    ).toEqual(
        ["size"].sort()
    );
    expect(
        [...paperBookEntity.allPropMap.keys()].sort()
    ).toEqual(
        ["id", "name", "edition", "price", "store", "authors", "size"].sort()
    ); 
    expect(
        [...paperBookEntity.expanedPropMap.keys()].sort()
    ).toEqual(
        ["id", "name", "edition", "price", "store", "authors", 
            "size", "size.width", "size.height"].sort()
    ); 
});