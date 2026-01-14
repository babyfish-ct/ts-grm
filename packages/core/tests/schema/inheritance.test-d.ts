import { Extends } from "@/schema/model";
import test from "node:test";
import { expectTypeOf } from "vitest";
import { BOOK, ELECTRONIC_BOOK, PAPER_BOOK, PDF_ELECTRONIC_BOOK, TREE_NODE } from "../model/model";

test("TestExtends", () => {
    
    expectTypeOf<
        Extends<typeof TREE_NODE, typeof TREE_NODE>
    >().toEqualTypeOf<true>();

    expectTypeOf<
        Extends<typeof PAPER_BOOK, typeof BOOK>
    >().toEqualTypeOf<true>();
    expectTypeOf<
        Extends<typeof BOOK, typeof PAPER_BOOK>
    >().toEqualTypeOf<false>();

    expectTypeOf<
        Extends<typeof ELECTRONIC_BOOK, typeof BOOK>
    >().toEqualTypeOf<true>();
    expectTypeOf<
        Extends<typeof BOOK, typeof ELECTRONIC_BOOK>
    >().toEqualTypeOf<false>();

    expectTypeOf<
        Extends<typeof PDF_ELECTRONIC_BOOK, typeof ELECTRONIC_BOOK>
    >().toEqualTypeOf<true>();
    expectTypeOf<
        Extends<typeof ELECTRONIC_BOOK, typeof PDF_ELECTRONIC_BOOK>
    >().toEqualTypeOf<false>();

    expectTypeOf<
        Extends<typeof PDF_ELECTRONIC_BOOK, typeof BOOK>
    >().toEqualTypeOf<true>();
    expectTypeOf<
        Extends<typeof BOOK, typeof PDF_ELECTRONIC_BOOK>
    >().toEqualTypeOf<false>();
});