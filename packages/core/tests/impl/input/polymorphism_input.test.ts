import { dto } from "@/index";
import { describe, it } from "vitest";
import { PHYSICAL_BOOK_STORE } from "../../model/model";

describe("PolymorphismInputTest", () => {

    it("singleTableSuper", () => {
        const input = dto.input(PHYSICAL_BOOK_STORE, c => [
            c.name.key(),
            c.version,
            c.city,
            c.street
        ]);
        console.log(input.mapper.inputRowReader.constructor.toString());
    });
});