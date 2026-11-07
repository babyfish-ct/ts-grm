import { AssociationModel, associationModel } from "@/dsl/association";
import { describe, expectTypeOf, it } from "vitest";
import { AUTHOR, BOOK } from "../model/model";

describe("AssociationTest", () => {

    it("association", () => {
        const model = associationModel(BOOK, "authors");
        expectTypeOf<typeof model>().toEqualTypeOf<
            AssociationModel<
                typeof BOOK,
                "id",
                typeof AUTHOR,
                "id"
            >
        >();
    });

    it("reversedAssociation", () => {
        const model = associationModel(AUTHOR, "books");
        expectTypeOf<typeof model>().toEqualTypeOf<
            AssociationModel<
                typeof AUTHOR,
                "id",
                typeof BOOK,
                "id"
            >
        >();
    });
});