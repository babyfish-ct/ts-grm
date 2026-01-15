import { Entity } from "@/impl/metadata/entity";
import { PAPER_BOOK } from "../../model/model";
import { expect, test } from "vitest";

test("TestEntity", () => {
    const paperBookEntity = Entity.of(PAPER_BOOK);
    expect(
        [...paperBookEntity.declaredPropMap.keys()].sort()
    ).toEqual(
        [].sort()
    ); 
});