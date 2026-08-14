import { dsl } from "@/dsl";
import { dto } from "@/index";
import { SqlFormula, TsFormula, Calculator } from "@/schema/computed";
import { DISCRIMINATOR_VALUE_MODEL_NAME, model, TABLE_INHERIT } from "@/schema/model";
import { prop } from "@/schema/prop";
import { z } from "zod"; 

const BOOK_STORE_NEWEST_BOOK_CALCULATOR = Calculator.targetOf({
    sourceModel: () => BOOK_STORE,
    targetModel: () => BOOK,
    fn: ctx => {
        return ctx.sqlClient.createQuery(BOOK, (q, book) => {
            q.where(
                dsl.tuple(book.name, book.edition).inSubQuery(
                    dsl.subQuery(BOOK, (q, book) => {
                        q.where(book.storeId.in(...ctx.keys));
                        q.groupBy(book.name);
                        return q.select(book.name, dsl.max(book.edition));
                    })
                )
            );
            return q.select(
                book.storeId.asNonNull(),
                book.fetch(ctx.view)
            )
        }).fetchList();
    }
});

const BOOK_STORE_SPECIFIED_BOOK_CALCULATOR = Calculator.parameterizedTargetOf({
    parameterType: z.object({
        minPrice: z.number().nullish(),
        maxPrice: z.number().nullish()
    }),
    sourceModel: () => BOOK_STORE,
    targetModel: () => BOOK,
    fn: ctx => {
        return ctx.sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.storeId.in(...ctx.keys));
            q.where(book.price.gteIf(ctx.parameter.minPrice));
            q.where(book.price.lteIf(ctx.parameter.maxPrice));
            return q.select(
                book.storeId.asNonNull(),
                book.fetch(ctx.view)
            )
        }).fetchList();
    }
});

const BOOK_STORE_BOOK_NAMES_FORMULA: TsFormula<ReadonlyArray<string>> =
    TsFormula.of({
        valueType: z.array(z.string()),
        dependency: () => dto.view(BOOK_STORE, c => [
            c.books.with(c => [
                c.name,
                c.edition
            ])
        ]),
        fn: data => data.books.map(book => `${book.name}(${book.edition})`)
    });

export const BOOK_STORE = model("BookStore", "id", class {
    id = prop.i64().asString()
    name = prop.str(50)
    version = prop.i32()
    books = prop.o2m(BOOK)
        .mappedBy("store")
        .orderBy("name", { path: "edition", desc: true })
    bookNames = prop.formula.ts(BOOK_STORE_BOOK_NAMES_FORMULA);
    newestBooks = prop.calculated.collection(BOOK_STORE_NEWEST_BOOK_CALCULATOR)
    specifiedBooks = prop.calculated.collection(BOOK_STORE_SPECIFIED_BOOK_CALCULATOR)
}, ctx => {
    ctx.table({
        discriminator: "TYPE",
        discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
    });
});

export const PHYSICAL_BOOK_STORE = model.extends(BOOK_STORE)(
    "PhysicalBookStore", 
    class {
        city = prop.str(50)
        street = prop.str(50)
        tags = prop.enumSet("READING_ROOM", "AIR_CONDITION", "BEVERAGE_SALES")
    },
    ctx => ctx.table({
        name: TABLE_INHERIT,
        discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
    })
);

export const ONLINE_BOOK_STORE = model.extends(BOOK_STORE)(
    "OnlineBookStore", 
    class {
        url = prop.str(50)
    },
    ctx => ctx.table({
        name: TABLE_INHERIT,
        discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
    })
);

const BOOK_AUTHOR_COUNT_FORMULA: SqlFormula<number> = 
    SqlFormula.of({
        valueType: z.number(),
        sourceModel: () => BOOK,
        fn: book => dsl.subQuery(
            dsl.associationModel(BOOK, "authors"), 
            (q, assoication) => {
                q.where(
                    assoication.sourceId.eq(book.id)
                );
                return q.select(dsl.count());
            }
        )
    });

export const BOOK = model("Book", "id", class {
    id = prop.i64()
    name = prop.str(50)
    edition = prop.i32()
    price = prop.num(10, 2)
    store = prop.m2o(BOOK_STORE)
        .joinColumns({cascade: "DELETE"})
        .nullable()
    authors = prop.m2m(AUTHOR).joinTable({
        name: "book_author_mapping",
        joinThisColumns: ["book_id"],
        joinTargetColumns: ["author_id"]
    }).orderBy("name.firstName", "name.lastName")
    authorCount = prop.formula.sql(BOOK_AUTHOR_COUNT_FORMULA)
}, ctx => {
    ctx.table({
        discriminator: "TYPE",
        discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
    }).unique("name", "edition");
});

const PAPER_BOOK_AREA_FORMULA: TsFormula<number> = 
    TsFormula.of({
        valueType: z.number(),
        dependency: () => dto.view(PAPER_BOOK, c => [c.size]),
        fn: data => data.size.width * data.size.height
    });

export const PAPER_BOOK = model.extends(BOOK)(
    "PaperBook", 
    class {
        size = prop.embedded({
            width: prop.i32(),
            height: prop.i32()
        })
        area = prop.formula.ts(PAPER_BOOK_AREA_FORMULA)
    },
    ctx => ctx.table({
        name: "THE_PAPER_BOOK",
        discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
    })
);

export const ELECTRONIC_BOOK = model.extends(BOOK)(
    "ElectronicBook", 
    class {
        address = prop.str(50);
    },
    ctx => ctx.table({
        discriminator: "TYPE",
        name: {
            idMapping: "ELECTRONIC_BOOK"
        },
        discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
    })
);

export const PDF_ELECTRONIC_BOOK = model.extends(ELECTRONIC_BOOK)(
    "PdfElectronicBook",
    class {
        pdfVersion = prop.str(50).nullable()
    },
    ctx => ctx.table({
        discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
    })
);

const AUTHOR_FULL_NAME_FORMULA : TsFormula<string> = 
    TsFormula.of({
        valueType: z.string(),
        dependency: () => dto.view(AUTHOR, c => [c.name]),
        fn: data => `${data.name.firstName} ${data.name.lastName}`
    });

export const AUTHOR = model("Author", "id", class {
    id = prop.i64()
    name = prop.embedded({
        firstName: prop.str(50),
        lastName: prop.str(50)
    })
    books = prop.m2m(BOOK).mappedBy("authors")
    gender = prop.enum({
        MALE: 'M',
        FEMALE: 'F'
    })
    fullName = prop.formula.ts(AUTHOR_FULL_NAME_FORMULA)
}, ctx => ctx.unique("name.firstName", "name.lastName"));

export const TREE_NODE = model("TreeNode", "id", class {
    id = prop.i64()
    name = prop.str(50)
    parentNode = prop.m2o.self(() => TREE_NODE, { joinColumns: { cascade: "DELETE" } })
    childNodes = prop.o2m.self(() => TREE_NODE, { mappedBy: "parentNode", sourceKeyProp: "id", targetKeyProp: "id" })
}, ctx => {
    ctx.unique("name", "parentNode");
});

export const ORDER = model("Order", "id", class {
    id = prop.embedded({
        x: prop.i32(),
        y: prop.embedded({
            a: prop.i16(),
            b: prop.i16()
        })
    });
    name = prop.str(10);
    items = prop.o2m(ORDER_ITEM).mappedBy("order")
    tags = prop.m2m(TAG).joinTable({
        joinThis: {
            keyProp: "id",
            columns: [
                {columnName: "order_x", referencedSubPath: "x"},
                {columnName: "order_y_a", referencedSubPath: "y.a"},
                {columnName: "order_y_b", referencedSubPath: "y.b"}
            ]
        },
        joinTarget: {
            keyProp: "id",
            columns: [
                {columnName: "tag_low", referencedSubPath: "low"},
                {columnName: "tag_high", referencedSubPath: "high"}
            ]
        }
    }).orderBy("id.low", "id.high");
    // Be different with `tags`, `comments` is not bidirectional
    comments = prop.m2m(COMMENT).joinTable({
        joinThis: {
            keyProp: "id",
            columns: [
                {columnName: "order_x", referencedSubPath: "x"},
                {columnName: "order_y_a", referencedSubPath: "y.a"},
                {columnName: "order_y_b", referencedSubPath: "y.b"}
            ]
        }
    })
}, ctx => {
    ctx.table({
        discriminator: {
            name: "TYPE",
            type: "number"
        },
        discriminatorValue: 1
    });
});

export const VIP_ORDER = model.extends(ORDER)("VipOrder", class {
    vipLevel = prop.num(2, 0);
}, ctx => {
    ctx.table({
        name: {
            idMapping: {
                "x": "ID_X",
                "y.a": "ID_Y_A",
                "y.b": "ID_Y_B"
            }
        },
        discriminatorValue: 2
    });
});

export const ORDER_ITEM = model("OrderItem", "id", class {
    id = prop.i64();
    order = prop.m2o(ORDER).joinColumns({
        columns: [
            { columnName: "order_y_a", referencedSubPath: "y.a" },
            { columnName: "order_y_b", referencedSubPath: "y.b" },
            { columnName: "order_x", referencedSubPath: "x" },
        ],
        cascade: "DELETE"
    });
});

export const TAG = model("Tag", "id", class {
    id = prop.embedded({
        low: prop.i32(),
        high: prop.i32()
    });
    name = prop.str(50)
    orders = prop.m2m(ORDER).mappedBy("tags").orderBy("id.y.a", "name")
});

export const COMMENT = model("Comment", "id", class {
    id = prop.i64()
    name = prop.str(50)
});

export const STUDENT = model("Student", "id", class {
    id = prop.i64()
    name = prop.str(50)
    courses = prop.m2m(COURSE).joinEntity({
        model: LEARNING_LINK,
        joinThisProp: "student",
        joinTargetProp: "course"
    })
    // With learningLinks
    learningLinks = prop.o2m(LEARNING_LINK).mappedBy("student")
});

export const COURSE = model("Course", "id", class {
    id = prop.i64()
    name = prop.str(50)
    students = prop.m2m(STUDENT).mappedBy("courses")
    // Without learningLinks
});

export const LEARNING_LINK = model("LearningLink", "id", class {
    id = prop.i64()
    score = prop.i16().nullable()
    student = prop.m2o(STUDENT)
    course = prop.m2o(COURSE)
});

export const LIBRARY = model("Library", "id", class {
    id = prop.i64()
    name = prop.str(50)
    version = prop.str(50)
    dependencies = prop.m2m.self(() => LIBRARY, {
        joinTable: {
            name: "LIBRARY_DEPENDENCY_MAPPING",
            joinThisColumns: ["DEPENDENT_ID"],
            joinTargetColumns: ["DEPENDENCY_ID"]
        }
    });
    dependents = prop.m2m.self(() => LIBRARY, {
        mappedBy: "dependencies"
    });
});