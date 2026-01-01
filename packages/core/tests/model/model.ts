import { model } from "@/schema/model";
import { prop } from "@/schema/prop";

export const bookStoreModel = model("BookStore", "id", class {
    id = prop.i64()
    name = prop.str()
    version = prop.i32()
    books = prop.o2m(bookModel)
        .mappedBy("store")
        .orderBy("name", { path: "edition", desc: true })
});

export const bookModel = model("Book", "id", class {
    id = prop.i64()
    name = prop.str()
    edition = prop.i32()
    store = prop.m2o(bookStoreModel)
        .joinColumns({cascade: "DELETE"})
        .nullable()
    authors = prop.m2m(authorModel).joinTable({
        name: "book_author_mapping",
        toThisColumns: ["book_id"],
        toTargetColumns: ["author_id"]
    })
});

export const authorModel = model("Author", "id", class {
    id = prop.i64()
    name = prop.embedded({
        firstName: prop.str(),
        lastName: prop.str()
    })
    books = prop.m2m(bookModel).mappedBy("authors");
}, ctx => ctx.unique("name.firstName", "name.lastName"));

