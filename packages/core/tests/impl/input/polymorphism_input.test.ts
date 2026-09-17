import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { PDF_ELECTRONIC_BOOK } from "../../model/model";
import { expectCode } from "../../utils";

describe("PolymorphismInputTest", () => {

    it("multipleSuper", () => {
        const input = dto.input(PDF_ELECTRONIC_BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.address,
            c.pdfVersion
        ]);

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.pdfVersion, input.as("ElectronicBook").get(1)];
                }
            }
        `);
        expect(reader.keyIndices).toEqual([1]);
        expect(reader.insertIndices).toEqual([0]);
        expect(reader.updateIndices).toEqual([0]);
        expect(reader.returnIndices).toEqual([]);

        const superReader = reader.preAssociatedMap.get("<super>")!;
        expectCode(superReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.address, input.as("Book").get(3)];
                }
            }
        `);
        expect(superReader.keyIndices).toEqual([1]);
        expect(superReader.insertIndices).toEqual([0]);
        expect(superReader.updateIndices).toEqual([0]);
        expect(superReader.returnIndices).toEqual([]);

        const superSuperReader = superReader.preAssociatedMap.get("<super>")!;
        expectCode(superSuperReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.name, input.edition, input.price, undefined];
                }
            }
        `);
        expect(superSuperReader.keyIndices).toEqual([0, 1]);
        expect(superSuperReader.insertIndices).toEqual([2]);
        expect(superSuperReader.updateIndices).toEqual([2]);
        expect(superSuperReader.returnIndices).toEqual([3]);
    });
});