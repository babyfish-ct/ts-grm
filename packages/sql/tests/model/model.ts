import { dsl, DISCRIMINATOR_VALUE_MODEL_NAME, model, Calculator, prop, TABLE_INHERIT, TsFormula, SqlFormula, dto } from "@ts-grm/core";
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
        maxPriceExclusive: z.number().nullish()
    }),
    sourceModel: () => BOOK_STORE,
    targetModel: () => BOOK,
    fn: ctx => {
        return ctx.sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.storeId.in(...ctx.keys));
            q.where(book.price.gteIf(ctx.parameter.minPrice));
            q.where(book.price.ltIf(ctx.parameter.maxPriceExclusive));
            q.orderBy(book.name, book.edition);
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

export const BOOK_STORE = model(
    "BookStore", 
    "id", 
    class {
        id = prop.i64().asString()
        name = prop.str(50)
        version = prop.i32()
        books = prop.o2m(BOOK).mappedBy("store")
            .orderBy("name", { path: "edition", desc: true })
        bookNames = prop.formula.ts(BOOK_STORE_BOOK_NAMES_FORMULA)
        newestBooks = prop.calculated.collection(BOOK_STORE_NEWEST_BOOK_CALCULATOR)
        specifiedBooks = prop.calculated.collection(BOOK_STORE_SPECIFIED_BOOK_CALCULATOR)
    },
    ctx => {
        ctx.table({
            discriminator: "TYPE",
            discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
        });
    }
);

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

export const BOOK = model("Book", "id", 
    class {
        id = prop.i64()
        name = prop.str(50)
        edition = prop.i32()
        price = prop.num(10, 2)
        store = prop.m2o(BOOK_STORE)
            .joinColumns({cascade: "DELETE"})
            .nullable()
        authors = prop.m2m(AUTHOR)
        .joinTable({
            name: "book_author_mapping",
            joinThisColumns: ["book_id"],
            joinTargetColumns: ["author_id"]
        })
        .orderBy("name.firstName", "name.lastName")
        authorCount = prop.formula.sql(BOOK_AUTHOR_COUNT_FORMULA)
    }, 
    ctx => {
        ctx.unique("name", "edition");
        ctx.table({
            discriminator: "TYPE",
            discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
        });
    }
);

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
    ctx => {
        ctx.table({
            discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME,
            name: {
                idMapping: "PB_ID"
            },
        });
    }
);

export const ELECTRONIC_BOOK = model.extends(BOOK)(
    "ElectronicBook", 
    class {
        address = prop.str(50);
    },
    ctx => {
        ctx.table({
            discriminator: "EB_TYPE",
            discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME,
            name: {
                idMapping: "EB_ID"
            },
        });
    }
);

export const PDF_ELECTRONIC_BOOK = model.extends(ELECTRONIC_BOOK)(
    "PdfElectronicBook",
    class {
        pdfVersion = prop.str(50).nullable()
    },
    ctx => {
        ctx.table({
            discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME,
            name: {
                idMapping: "PEB_ID"
            },
        });
    }
);

const AUTHOR_FULL_NAME_FORMULA: TsFormula<string> = 
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
    books = prop.m2m(BOOK)
        .mappedBy("authors")
        .orderBy("name", "edition")
    fullName = prop.formula.ts(AUTHOR_FULL_NAME_FORMULA)
    gender = prop.enum({
        "MALE": "M", 
        "FEMALE": "F"
    })
});

export const TREE_NODE = model(
    "TreeNode", 
    "id", 
        class {
        id = prop.i64()
        name = prop.str(50)
        parentNode = prop.m2o(() => TREE_NODE)
        childNodes = prop.o2m(() => TREE_NODE).mappedBy("parentNode")
    },
    ctx => {
        ctx.unique("parentNode", "name");
        ctx.table({
            discriminator: "TYPE",
            discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
        })
    }
);

export const ORGANIZATION = model.extends(TREE_NODE)(
    "Organization",
    class {
        location = prop.str(50);
        kind = prop.str(50);
    },
    ctx => {
        ctx.table({
            discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
        });
    }
)

export const GROUP = model.extends(TREE_NODE)(
    "Group",
    class {
        email = prop.str(50)
    },
    ctx => {
        ctx.table({
            discriminatorValue: DISCRIMINATOR_VALUE_MODEL_NAME
        });
    }
);

export const ORDER = model("Order", "id", class {
    id = prop.embedded({
        x: prop.i32(),
        y: prop.embedded({
            a: prop.i16(),
            b: prop.i16()
        })
    });
    name = prop.str(50)
    //createdTime = prop.date()
    items = prop.o2m(ORDER_ITEM).mappedBy("order")
    tags = prop.m2m(TAG).joinTable({
        joinThis: {
            keyProp: "id",
            columns: [
                {columnName: "order_x", referencedSubPath: "x"},
                {columnName: "order_y_a", referencedSubPath: "y.a"},
                {columnName: "order_y_b", referencedSubPath: "y.b"}
            ],
            cascade: "DELETE"
        },
        joinTarget: {
            keyProp: "id",
            columns: [
                {columnName: "tag_low", referencedSubPath: "low"},
                {columnName: "tag_high", referencedSubPath: "high"}
            ]
        }
    })
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
});

export const ORDER_ITEM = model("OrderItem", "id", class {
    id = prop.i64()
    productName = prop.str(50)
    order = prop.m2o(ORDER)
    .joinColumns({
        columns: [
            { columnName: "order_x", referencedSubPath: "x" },
            { columnName: "order_y_a", referencedSubPath: "y.a" },
            { columnName: "order_y_b", referencedSubPath: "y.b" }
        ],
        cascade: "DELETE"
    })
});

export const TAG = model("Tag", "id", class {
    id = prop.embedded({
        low: prop.i32(),
        high: prop.i32()
    });
    name = prop.str(50)
    orders = prop.m2m(ORDER).mappedBy("tags")
});

export const COMMENT = model("Comment", "id", class {
    id = prop.i64()
    name = prop.str(50)
    text = prop.str(50)
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
    description = prop.text()
    isOnline = prop.bool()
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
    dependencies = prop.m2m(() => LIBRARY).joinTable({
        name: "LIBRARY_DEPENDENCY_MAPPING",
        joinThisColumns: ["DEPENDENT_ID"],
        joinTargetColumns: ["DEPENDENCY_ID"]
    });
    dependents = prop.m2m(() => LIBRARY).mappedBy("dependencies")
});
