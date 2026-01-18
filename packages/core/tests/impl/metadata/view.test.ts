import { Entity } from "@/impl/metadata/entity";
import { BOOK } from "../../model/model";
import { test } from "vitest";
import { createDtoBuilder } from "@/impl/metadata/dto_builder";

test("TestView", () => {
    const entity = Entity.of(BOOK);
    const builder = createDtoBuilder(entity);
    builder.id;
    builder.name;
    builder.authors();
});