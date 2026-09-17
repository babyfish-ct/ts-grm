import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { BOOK, ELECTRONIC_BOOK, PDF_ELECTRONIC_BOOK } from "../../model/model";
import { expectCode } from "../../utils";

describe("PolymorphismInputTest", () => {

    it("multipleTablesSuper", () => {
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

    it("multipTablesDerived", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$instanceOf(ELECTRONIC_BOOK, c => [
                c.address,
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [
                    c.pdfVersion
                ])
            ])
        ]);

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.name, input.edition, input.price, input.__typename, undefined];
                }
            }
        `);
        expect(reader.keyIndices).toEqual([0, 1]);
        expect(reader.insertIndices).toEqual([2, 3]);
        expect(reader.updateIndices).toEqual([2, 3]);
        expect(reader.returnIndices).toEqual([4]);

        const electronicBookReader = reader.postAssociatedMap.get("<derived:ElectronicBook>")!;
        expectCode(electronicBookReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.address, input.__typename, input.as("Book").get(4)];
                }
            }
        `);
        expect(electronicBookReader.keyIndices).toEqual([2]);
        expect(electronicBookReader.insertIndices).toEqual([0, 1]);
        expect(electronicBookReader.updateIndices).toEqual([0, 1]);
        expect(electronicBookReader.returnIndices).toEqual([]);

        const pdfElectronicBookReader = electronicBookReader.postAssociatedMap.get("<derived:PdfElectronicBook>")!;
        expectCode(pdfElectronicBookReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.pdfVersion, input.as("ElectronicBook").get(2)];
                }
            }
        `);
        expect(pdfElectronicBookReader.keyIndices).toEqual([1]);
        expect(pdfElectronicBookReader.insertIndices).toEqual([0]);
        expect(pdfElectronicBookReader.updateIndices).toEqual([0]);
        expect(pdfElectronicBookReader.returnIndices).toEqual([]);
    });
});