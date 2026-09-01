import { describe, expectTypeOf, it } from "vitest";
import { BOOK, STUDENT } from "../../model/model";
import { dto, TypeOf } from "@/index";
import { SelectableAssocaitionPaths } from "@/schema/dto/api";

describe("AssociationInputTest", () => {

    it("simple", () => {
        const input = dto.input(BOOK, c => [
            c.id,
            c.name,
            c.edition,
            c.store.as("owner")
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            id: number;
            edition: number;
            name: string;
            owner: {
                id: string;
                name: string;
                version: number;
            } | null | undefined;
        }>();
        expectTypeOf<SelectableAssocaitionPaths<typeof input>>().toEqualTypeOf<
            "$all" | "$root" | "store"
        >();
    });

    it("wide", () => {
        const input = dto.input(BOOK, c => [
            c.name.use({key: true}),
            c.edition.use({key: true}),
            c.store.as("owner").with(c => [
                c.name.use({key: true}),
                c.version.use({insert: false})
            ]),
            c.authors.as("creators").with(c => [
                c.name.use({key: true})
            ])
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            edition: number;
            name: string;
            owner: {
                name: string;
                version: number;
            } | null | undefined;
            creators: {
                name: {
                    firstName: string;
                    lastName: string;
                };
            }[];
        }>();
        expectTypeOf<SelectableAssocaitionPaths<typeof input>>().toEqualTypeOf<
            "$all" | "$root" | "store" | "authors"
        >();
    });

    it("deep", () => {
        const input = dto.input(STUDENT, c => [
            c.name.use({key: true}),
            c.learningLinks.with(c => [
                c.score.use({insert: false}),
                c.student.with(c => [
                    c.name.use({key: true})
                ])
            ])
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            learningLinks: {
                score: number | null | undefined;
                student: {
                    name: string;
                };
            }[];
            name: string;
        }>();
        expectTypeOf<SelectableAssocaitionPaths<typeof input>>().toEqualTypeOf<
            "$all" | "$root" | "learningLinks" | "learningLinks.student"
        >();
    });
});