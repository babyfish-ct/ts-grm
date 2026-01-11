import { Extends } from "@/schema/model";
import test from "node:test";
import { expectTypeOf } from "vitest";
import { bookModel, electronicBookModel, paperBookModel, pdfElectronicBookModel, treeNodeModel } from "../model/model";

test("TestExtends", () => {
    
    expectTypeOf<
        Extends<typeof treeNodeModel, typeof treeNodeModel>
    >().toEqualTypeOf<true>();

    expectTypeOf<
        Extends<typeof paperBookModel, typeof bookModel>
    >().toEqualTypeOf<true>();
    expectTypeOf<
        Extends<typeof bookModel, typeof paperBookModel>
    >().toEqualTypeOf<false>();

    expectTypeOf<
        Extends<typeof electronicBookModel, typeof bookModel>
    >().toEqualTypeOf<true>();
    expectTypeOf<
        Extends<typeof bookModel, typeof electronicBookModel>
    >().toEqualTypeOf<false>();

    expectTypeOf<
        Extends<typeof pdfElectronicBookModel, typeof electronicBookModel>
    >().toEqualTypeOf<true>();
    expectTypeOf<
        Extends<typeof electronicBookModel, typeof pdfElectronicBookModel>
    >().toEqualTypeOf<false>();

    expectTypeOf<
        Extends<typeof pdfElectronicBookModel, typeof bookModel>
    >().toEqualTypeOf<true>();
    expectTypeOf<
        Extends<typeof bookModel, typeof pdfElectronicBookModel>
    >().toEqualTypeOf<false>();
});