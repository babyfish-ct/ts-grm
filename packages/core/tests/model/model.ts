import { model } from "@/schema/model";
import { prop } from "@/schema/prop";

export const BOOK_STORE = model("BookStore", "id", class {
    id = prop.i64().asString()
    name = prop.str()
    version = prop.i32()
    books = prop.o2m(BOOK)
        .mappedBy("store")
        .orderBy("name", { path: "edition", desc: true })
});

export const BOOK = model("Book", "id", class {
    id = prop.i64()
    name = prop.str()
    edition = prop.i32()
    price = prop.num()
    store = prop.m2o(BOOK_STORE)
        .joinColumns({cascade: "DELETE"})
        .nullable()
    authors = prop.m2m(AUTHOR).joinTable({
        name: "book_author_mapping",
        joinThisColumns: ["book_id"],
        joinTargetColumns: ["author_id"]
    }).orderBy("name.firstName", "name.lastName")
});

export const PAPER_BOOK = model.extends(BOOK)(
    "PaperBook", 
    class {
        size = prop.embedded({
            width: prop.i32(),
            height: prop.i32()
        })
    }
);

export const ELECTRONIC_BOOK = model.extends(BOOK)(
    "ElectronicBook", 
    class {
        address = prop.str();
    }
);

export const PDF_ELECTRONIC_BOOK = model.extends(ELECTRONIC_BOOK)(
    "PdfElectronicBook",
    class {
        pdfVersion = prop.str().nullable()
    }
);

export const AUTHOR = model("Author", "id", class {
    id = prop.i64()
    name = prop.embedded({
        firstName: prop.str(),
        lastName: prop.str()
    })
    books = prop.m2m(BOOK).mappedBy("authors");
}, ctx => ctx.unique("name.firstName", "name.lastName"));

export const TREE_NODE = model("TreeNode", "id", class {
    id = prop.i64()
    name = prop.str()
    parentNode = prop.m2o(() => TREE_NODE).nullable()
    childNodes = prop.o2m(() => TREE_NODE).mappedBy("parentNode");
});

export const ORDER = model("Order", "id", class {
    id = prop.embedded({
        x: prop.i32(),
        y: prop.embedded({
            a: prop.i16(),
            b: prop.i16()
        })
    });
    name = prop.num()
    tags = prop.m2m(TAG).joinTable({
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

export const ORDER_ITEM = model("OrderItem", "id", class {
    id = prop.i64();
    order = prop.m2o(ORDER).joinColumns({
        joinColumns: [
            { columnName: "order_x", referencedSubPath: "x" },
            { columnName: "order_y_a", referencedSubPath: "y.a" },
            { columnName: "order_y_b", referencedSubPath: "y.b" }
        ],
        cascade: "DELETE"
    });
});

export const TAG = model("Tag", "id", class {
    id = prop.embedded({
        low: prop.i32(),
        high: prop.i32()
    });
    name = prop.str()
});
