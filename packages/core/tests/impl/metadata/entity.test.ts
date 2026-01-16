import { Entity } from "@/impl/metadata/entity";
import { PAPER_BOOK } from "../../model/model";
import { expect, test } from "vitest";
import { makeErr } from "@/impl/util";

test("TestEntity", () => {
    const paperBookEntity = Entity.of(PAPER_BOOK);
    expect(
        [...paperBookEntity.declaredPropMap.keys()].sort()
    ).toEqual(
        ["size"].sort()
    );
    expect(
        [...paperBookEntity.allPropMap.keys()].sort()
    ).toEqual(
        ["id", "name", "edition", "price", "store", "authors", "size"].sort()
    ); 
    expect(
        [...paperBookEntity.expanedPropMap.keys()].sort()
    ).toEqual(
        ["id", "name", "edition", "price", "store", "authors", 
            "size", "size.width", "size.height"].sort()
    ); 

    const bookDotStore = paperBookEntity.prop("store");
    const storeEntity = bookDotStore.targetEntity ?? 
        makeErr("Book.store.targetEntity is undefined");
    const storeDotBooks = storeEntity.prop("books") ?? 
        makeErr("store.books is undefined");
    expect(storeDotBooks).toBeDefined();
    expect(bookDotStore.oppositeProp).toEqual(storeDotBooks);
    expect(storeDotBooks.oppositeProp).toEqual(bookDotStore);
    expect(storeDotBooks.orders).toEqual([
        { 
            prop: paperBookEntity.superEntity!!.expanedPropMap.get("name"),
            desc: false,
            nulls: "UNSPECIFIED"
        },
        { 
            prop: paperBookEntity.superEntity!!.expanedPropMap.get("edition"),
            desc: true,
            nulls: "UNSPECIFIED"
        }
    ]);

    const bookDotAuthors = paperBookEntity.allPropMap.get("authors") ??
        makeErr("Book.authors is undefined");
    const authorModel = bookDotAuthors?.targetEntity ??
        makeErr("Book.authors.targetEntity is undefined");
    const authorDotBooks = authorModel.allPropMap.get("books") ??
        makeErr("Author.books is undefined");
    expect(bookDotAuthors.oppositeProp).toEqual(authorDotBooks);
    expect(authorDotBooks.oppositeProp).toEqual(bookDotAuthors);
    expect(bookDotAuthors.orders).toEqual([
        {
            prop: authorModel.expanedPropMap.get("name.first"),
            desc: false,
            nulls: "UNSPECIFIED"
        },
        {
            prop: authorModel.expanedPropMap.get("name.last"),
            desc: false,
            nulls: "UNSPECIFIED"
        }
    ]);
});