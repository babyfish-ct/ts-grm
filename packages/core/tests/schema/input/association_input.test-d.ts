import { describe, expectTypeOf, it } from "vitest";
import { BOOK, BOOK_STORE, STUDENT } from "../../model/model";
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
            c.name.key(),
            c.edition.key(),
            c.store.as("owner").with(c => [
                c.name.key(),
                c.version.mask({insert: false})
            ]),
            c.authors.as("creators").with(c => [
                c.name.key()
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
            c.name.key(),
            c.learningLinks.with(c => [
                c.score.mask({insert: false}),
                c.student.with(c => [
                    c.name.key()
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

    it("o2m", () => {
        const input = dto.input(BOOK_STORE, c => [
            c.name.key(),
            c.books
                .reparentable()
                .onDissociate("DELETE")
                .with(c => [
                    c.name.key(),
                    c.edition.key(),
                    c.price
                ])
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            name: string;
            books: {
                edition: number;
                name: string;
                price: number;
            }[];
        }>();
        expectTypeOf<SelectableAssocaitionPaths<typeof input>>().toEqualTypeOf<
            "$all" | "$root" | "books"
        >();
    });
});