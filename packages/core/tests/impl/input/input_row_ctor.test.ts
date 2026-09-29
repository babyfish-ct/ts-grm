import { dto } from "@/index";
import { describe, it } from "vitest";
import { BOOK, ELECTRONIC_BOOK, PAPER_BOOK, PDF_ELECTRONIC_BOOK } from "../../model/model";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCtor } from "@/impl/input/input_row";
import { expectCode } from "../../utils";

describe("InputRowCtorTest", () => {

    it("polymorphism", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$instanceOf(PAPER_BOOK, c => [
                c.size
            ]),
            c.$instanceOf(ELECTRONIC_BOOK, c => [
                c.address,
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [
                    c.pdfVersion
                ])
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        const ctor = createInputCtor(metadata);
        expectCode(ctor.toString(), `
            class ThisClass extends $baseClass {
                _id = undefined;
                constructor(data, parent) {
                    super(data, parent);
                }
                get metadata() {
                    return $meatadata;
                }
                get(col) {
                    switch (col) {
                        case 0:
                            return this.data.name;
                        case 1:
                            return this.data.edition;
                        case 2:
                            return this.data.price;
                        case 3:
                            return this.data.__typename;
                        case 4:
                            return this._id;
                        default:
                            return undefined;
                    }
                }
                set(col, value) {
                    switch (col) {
                        case 4:
                            this._id = value;
                            break;
                        default:
                            throw new $argumentError("Illegal col index");
                    }
                }
                pre(index) {
                    switch (index) {
                        default:
                            return this.data;
                    }
                }
                post(index) {
                    switch (index) {
                        default:
                            return this.data;
                    }
                }
            }
        `);
    });
});