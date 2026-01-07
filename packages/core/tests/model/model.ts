import { model } from "@/schema/model";
import { prop } from "@/schema/prop";

export const bookStoreModel = model("BookStore", "id", class {
    id = prop.i64().asString()
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
    price = prop.num()
    store = prop.m2o(bookStoreModel)
        .joinColumns({cascade: "DELETE"})
        .nullable()
    authors = prop.m2m(authorModel).joinTable({
        name: "book_author_mapping",
        joinThisColumns: ["book_id"],
        joinTargetColumns: ["author_id"]
    })
});

export const paperBookModel = model.extends(bookModel)(
    "PaperBook", 
    class {
        size = prop.embedded({
            width: prop.i32(),
            height: prop.i32()
        })
    }
);

export const electronicBookModel = model.extends(bookModel)(
    "ElectronicBook", 
    class {
        address = prop.str();
    }
);

export const authorModel = model("Author", "id", class {
    id = prop.i64()
    name = prop.embedded({
        firstName: prop.str(),
        lastName: prop.str()
    })
    books = prop.m2m(bookModel).mappedBy("authors");
}, ctx => ctx.unique("name.firstName", "name.lastName"));

export const treeNodeModel = model("TreeNode", "id", class {
    id = prop.i64()
    name = prop.str()
    parentNode = prop.m2o(() => treeNodeModel).nullable()
    childNodes = prop.o2m(() => treeNodeModel).mappedBy("parentNode");
});

export const orderModel = model("Order", "id", class {
    id = prop.embedded({
        x: prop.i32(),
        y: prop.embedded({
            a: prop.i16(),
            b: prop.i16()
        })
    });
    name = prop.num()
    tags = prop.m2m(tagModel).joinTable({
        joinThis: {
            referencedProp: "id",
            columns: [
                {columnName: "order_x", referencedSubPath: "x"},
                {columnName: "order_y_a", referencedSubPath: "y.a"},
                {columnName: "order_y_b", referencedSubPath: "y.b"}
            ]
        },
        joinTarget: {
            referencedProp: "id",
            columns: [
                {columnName: "tag_low", referencedSubPath: "low"},
                {columnName: "tag_high", referencedSubPath: "high"}
            ]
        }
    })
});

export const orderItemModel = model("OrderItem", "id", class {
    id = prop.i64();
    order = prop.m2o(orderModel).joinColumns({
        joinColumns: [
            { columnName: "order_x", referencedSubPath: "x" },
            { columnName: "order_y_a", referencedSubPath: "y.a" },
            { columnName: "order_y_b", referencedSubPath: "y.b" }
        ],
        cascade: "DELETE"
    });
});

export const tagModel = model("Tag", "id", class {
    id = prop.embedded({
        low: prop.i32(),
        high: prop.i32()
    });
    name = prop.str()
});
