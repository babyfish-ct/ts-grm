import { Entity } from "@/impl/entity";
import { PAPER_BOOK, ORDER_ITEM, BOOK, AUTHOR, TREE_NODE, BOOK_STORE, ELECTRONIC_BOOK, PDF_ELECTRONIC_BOOK, ORDER, VIP_ORDER, STUDENT, COURSE } from "../model/model";
import { describe, expect, it } from "vitest";
import { makeErr } from "@/error/util";
import { EMPTY_KEYWORD_STRATEGY, expectStorage } from "./utils";
import { DatabaseStrategy, UPPER_SNAKE_CASE_DATABASE_NAMING_STRATEGY } from "@/impl/strategy";
import { Column } from "@/impl/storage";
import { ExplicitDataType } from "@/impl/explicit";
import { AssociationEntity } from "@/impl";
import { associationModel } from "@/dsl/association";

describe("EntityTest", () => {

    it("entityWithSimpleColumns", () => {
        const paperBookEntity = Entity.of(PAPER_BOOK);
        expect(
            [...paperBookEntity.declaredPropMap.keys()].sort()
        ).toEqual(
            ["area", "id", "size"].sort()
        );
        expect(
            [...paperBookEntity.allPropMap.keys()].sort()
        ).toEqual(
            [
                "area",
                "id", "name", "edition", "price", "store", "storeId", "authors", "authorCount",
                "size"
            ].sort()
        ); 
        expect(
            [...paperBookEntity.expandedPropMap.keys()].sort()
        ).toEqual(
            [
                "area",
                "id", "name", "edition", "price", "store", "storeId", "authors", "authorCount", 
                "size", "size.width", "size.height"
            ].sort()
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
                prop: paperBookEntity.superEntity!.expandedPropMap.get("name"),
                desc: false,
                nulls: "UNSPECIFIED"
            },
            { 
                prop: paperBookEntity.superEntity!.expandedPropMap.get("edition"),
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
                prop: authorModel.expandedPropMap.get("name.firstName"),
                desc: false,
                nulls: "UNSPECIFIED"
            },
            {
                prop: authorModel.expandedPropMap.get("name.lastName"),
                desc: false,
                nulls: "UNSPECIFIED"
            }
        ]);
    });

    it("entityWithEmbeddedColumns", () => {
        const orderItemEntity = Entity.of(ORDER_ITEM);
        const order = orderItemEntity.allPropMap.get("order") ??
            makeErr(`No property named "order"`);
        const orderId = orderItemEntity.allPropMap.get("orderId") ??
            makeErr(`No property named "orderId"`);
        expect(order.referenceKeyProp).toEqual(orderId);
        expect(orderId.referenceProp).toEqual(order);
        expect(Array.from(orderId.props!.keys())).toEqual(["x", "y"]);
        expect(Array.from(orderItemEntity.allPropMap.keys())).toEqual([
            "id",
            "order",
            "orderId"
        ]);
        expect(Array.from(orderItemEntity.expandedPropMap.keys())).toEqual([
            "id",
            "order",
            "orderId",
            "orderId.x",
            "orderId.y",
            "orderId.y.a",
            "orderId.y.b"
        ]);
    });

    it("entityConfigurator", () => {
        const bookEntity = Entity.of(BOOK);
        expect(bookEntity.toTableName({
            namingStrategy: UPPER_SNAKE_CASE_DATABASE_NAMING_STRATEGY,
            keywordStrategy: EMPTY_KEYWORD_STRATEGY
        })).toEqual("BOOK");
        expect(bookEntity.uniqueConstraints.length).toEqual(1);
        expect(bookEntity.uniqueConstraints[0]!.map(c => c.name)).toEqual(["name", "edition"]);

        const authorEntity = Entity.of(AUTHOR);
        expect(authorEntity.uniqueConstraints.length).toEqual(1);
        expect(authorEntity.uniqueConstraints[0]!.map(c => c.name)).toEqual(["firstName", "lastName"]);

        const treeNodeEntity = Entity.of(TREE_NODE);
        expect(treeNodeEntity.uniqueConstraints.length).toEqual(1);
        expect(treeNodeEntity.uniqueConstraints[0]!.map(c => c.name)).toEqual(["name", "parentNode"]);
    });

    it("storage", () => {

        const strategy: DatabaseStrategy = {
            namingStrategy: UPPER_SNAKE_CASE_DATABASE_NAMING_STRATEGY,
            keywordStrategy: EMPTY_KEYWORD_STRATEGY
        };
        const storeEntity = Entity.of(BOOK_STORE);
        expect(storeEntity.prop("id").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "ID"
        });
        expect(storeEntity.prop("name").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "NAME"
        });
        expect(storeEntity.prop("version").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "VERSION"
        });
        expect(storeEntity.prop("books").toStorage(strategy)).toEqual(undefined);

        const bookEntity = Entity.of(BOOK);
        expect(bookEntity.prop("id").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "ID"
        });
        expect(bookEntity.prop("name").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "NAME"
        });
        expect(bookEntity.prop("edition").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "EDITION"
        });
        expect(bookEntity.prop("price").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "PRICE"
        });
        expectStorage(bookEntity.prop("store").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "STORE_ID",
            referencedProp: "BookStore.id",
            referencedColumnName: "ID"
        });
        expectStorage(bookEntity.prop("storeId").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "STORE_ID",
            referencedProp: "BookStore.id",
            referencedColumnName: "ID"
        });
        expectStorage(bookEntity.prop("authors").toStorage(strategy)!).toEqual({
            "kind": "MIDDLE_TABLE",
            "name": "book_author_mapping",
            "toThisColumns": [
                {
                    "kind": "COLUMN",
                    "name": "book_id",
                    "referencedProp": "Book.id",
                    "referencedColumnName": "ID"
                },
            ],
            "toTargetColumns": [
                {
                    "kind": "COLUMN",
                    "name": "author_id",
                    "referencedProp": "Author.id",
                    "referencedColumnName": "ID"
                },
            ]
        });

        const authorEntity = Entity.of(AUTHOR);
        expect(authorEntity.prop("id").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "ID"
        });
        expect(authorEntity.prop("name").toStorage(strategy)!.kind).toEqual("COLUMNS");
        expectStorage(authorEntity.prop("name").toStorage(strategy)!).toEqual({
            kind: "COLUMNS",
            arr: [
                {
                    "kind": "COLUMN",
                    "name": "FIRST_NAME",
                    "referencedProp": undefined
                },
                {
                    "kind": "COLUMN",
                    "name": "LAST_NAME",
                    "referencedProp": undefined
                },
            ]
        });
        expect(authorEntity.prop("name.firstName").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "FIRST_NAME"
        });
        expect(authorEntity.prop("name.lastName").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "LAST_NAME"
        });
        expectStorage(authorEntity.prop("books").toStorage(strategy)!).toEqual({
            "kind": "MIDDLE_TABLE",
            "name": "book_author_mapping",
            "toThisColumns": [
                {
                    "kind": "COLUMN",
                    "name": "author_id",
                    "referencedProp": "Author.id",
                    "referencedColumnName": "ID"
                },
            ],
            "toTargetColumns": [
                {
                    "kind": "COLUMN",
                    "name": "book_id",
                    "referencedProp": "Book.id",
                    "referencedColumnName": "ID"
                },
            ]
        });

        const orderItemEntity = Entity.of(ORDER_ITEM);
        expect(orderItemEntity.prop("id").toStorage(strategy)).toEqual({
            kind: "COLUMN",
            name: "ID"
        });
        expectStorage(orderItemEntity.prop("order").toStorage(strategy)).toEqual({
            "kind": "COLUMNS",
            "arr": [
                {
                    "kind": "COLUMN",
                    "name": "order_x",
                    "referencedProp": "Order.id.x",
                    "referencedColumnName": "X"
                },
                {
                    "kind": "COLUMN",
                    "name": "order_y_a",
                    "referencedProp": "Order.id.y.a",
                    "referencedColumnName": "A"
                },
                {
                    "kind": "COLUMN",
                    "name": "order_y_b",
                    "referencedProp": "Order.id.y.b",
                    "referencedColumnName": "B"
                },
            ]
        });
        expectStorage(orderItemEntity.prop("orderId").toStorage(strategy)!).toEqual({
            "kind": "COLUMNS",
            "arr": [
                {
                    "kind": "COLUMN",
                    "name": "order_x",
                    "referencedProp": "Order.id.x",
                    "referencedColumnName": "X"
                },
                {
                    "kind": "COLUMN",
                    "name": "order_y_a",
                    "referencedProp": "Order.id.y.a",
                    "referencedColumnName": "A"
                },
                {
                    "kind": "COLUMN",
                    "name": "order_y_b",
                    "referencedProp": "Order.id.y.b",
                    "referencedColumnName": "B"
                },
            ]
        });
        expectStorage(orderItemEntity.prop("orderId.x").toStorage(strategy)).toEqual({
            "kind": "COLUMN",
            "name": "order_x",
            "referencedProp": "Order.id.x",
            "referencedColumnName": "X"
        });
        expectStorage(orderItemEntity.prop("orderId.y").toStorage(strategy)).toEqual({
            "kind": "COLUMNS",
            "arr": [
                {
                    "kind": "COLUMN",
                    "name": "order_y_a",
                    "referencedProp": "Order.id.y.a",
                    "referencedColumnName": "A"
                },
                {
                    "kind": "COLUMN",
                    "name": "order_y_b",
                    "referencedProp": "Order.id.y.b",
                    "referencedColumnName": "B"
                }
            ]
        });
        expectStorage(orderItemEntity.prop("orderId.y.a").toStorage(strategy)).toEqual({
            "kind": "COLUMN",
            "name": "order_y_a",
            "referencedProp": "Order.id.y.a",
            "referencedColumnName": "A"
        });
        expectStorage(orderItemEntity.prop("orderId.y.b").toStorage(strategy)).toEqual({
            "kind": "COLUMN",
            "name": "order_y_b",
            "referencedProp": "Order.id.y.b",
            "referencedColumnName": "B"
        });

        const studentEntity = Entity.of(STUDENT);
        expectStorage(studentEntity.prop("courses").toStorage(strategy)).toEqual({
            "joinThisProp": "LearningLink.student",
            "joinTargetProp": "LearningLink.course"
        });

        const courseEntity = Entity.of(COURSE);
        expectStorage(courseEntity.prop("students").toStorage(strategy)).toEqual({
            "joinThisProp": "LearningLink.course",
            "joinTargetProp": "LearningLink.student"
        });
    });

    it("explicitDataType", () => {
        const storeIdProp = Entity.of(BOOK_STORE).declaredPropMap.get("id")!;
        const storeIdRefProp = Entity.of(BOOK).declaredPropMap.get("storeId")!;
        expect(storeIdProp.explicitDataType).toEqual(ExplicitDataType.STRING);
        expect(storeIdRefProp.explicitDataType).toEqual(ExplicitDataType.STRING);

        const treeNodeIdProp = Entity.of(BOOK).declaredPropMap.get("id")!;
        const treeNodeIdRefProp = Entity.of(TREE_NODE).declaredPropMap.get("parentNodeId")!;
        expect(treeNodeIdProp.explicitDataType).toEqual(ExplicitDataType.INTEGER);
        expect(treeNodeIdRefProp.explicitDataType).toEqual(ExplicitDataType.INTEGER);

        const middleEntity = AssociationEntity.of(associationModel(BOOK, "authors"));
        const bookIdRefProp = middleEntity.sourceKeyProp;
        const authorIdRefProp = middleEntity.targetKeyProp;
        expect(bookIdRefProp.explicitDataType).toEqual(ExplicitDataType.INTEGER);
        expect(authorIdRefProp.explicitDataType).toEqual(ExplicitDataType.INTEGER);
    });

    it("inheritance", () => {

        const strategy: DatabaseStrategy = {
            namingStrategy: UPPER_SNAKE_CASE_DATABASE_NAMING_STRATEGY,
            keywordStrategy: EMPTY_KEYWORD_STRATEGY
        };
        const bookEntity = Entity.of(BOOK);
        const paperBookEntity = Entity.of(PAPER_BOOK);
        const electronicBookEntity = Entity.of(ELECTRONIC_BOOK);
        const pdfElectronicBookEntity = Entity.of(PDF_ELECTRONIC_BOOK);
        const orderEntity = Entity.of(ORDER);
        const vipOrderEntity = Entity.of(VIP_ORDER);

        expect(bookEntity.toTableName(strategy)).toEqual("BOOK");
        expect(paperBookEntity.toTableName(strategy)).toEqual("THE_PAPER_BOOK");
        expect(electronicBookEntity.toTableName(strategy)).toEqual("ELECTRONIC_BOOK");
        expect(pdfElectronicBookEntity.toTableName(strategy)).toEqual("PDF_ELECTRONIC_BOOK");
        expect(orderEntity.toTableName(strategy)).toEqual("ORDER");
        expect(vipOrderEntity.toTableName(strategy)).toEqual("VIP_ORDER");

        expect(Array.from(bookEntity.ancestors).map(it => it.name)).toEqual(
            []
        );
        expect(Array.from(bookEntity.descendants).map(it => it.name)).toEqual(
            ['PaperBook', 'ElectronicBook', 'PdfElectronicBook']
        );
        expect(Array.from(paperBookEntity.ancestors).map(it => it.name)).toEqual(
            ['Book']
        );
        expect(Array.from(paperBookEntity.descendants).map(it => it.name)).toEqual(
            []
        );
        expect(Array.from(electronicBookEntity.ancestors).map(it => it.name)).toEqual(
            ['Book']
        );
        expect(Array.from(electronicBookEntity.descendants).map(it => it.name)).toEqual(
            ['PdfElectronicBook']
        );
        expect(Array.from(pdfElectronicBookEntity.ancestors).map(it => it.name)).toEqual(
            ['ElectronicBook', 'Book']
        );
        expect(Array.from(pdfElectronicBookEntity.descendants).map(it => it.name)).toEqual(
            []
        );

        const bookId = bookEntity.idProp;
        const paperBookId = paperBookEntity.idProp;
        const electronicBookId = electronicBookEntity.idProp;
        const pdfElectronicBookId = pdfElectronicBookEntity.idProp;
        const orderId = orderEntity.idProp;
        const vipOrderId = vipOrderEntity.idProp;

        expect(bookId.declaringEntity).toBe(bookEntity);
        expect(paperBookId.declaringEntity).toBe(paperBookEntity);
        expect(electronicBookId.declaringEntity).toBe(electronicBookEntity);
        expect(pdfElectronicBookId.declaringEntity).toBe(pdfElectronicBookEntity);
        expect(orderId.declaringEntity).toBe(orderEntity);
        expect(vipOrderId.declaringEntity).toBe(vipOrderEntity);

        expect(bookId.toStorage(strategy) as Column).toEqual({
            kind: "COLUMN",
            name: "ID"
        });
        expect(paperBookId.toStorage(strategy) as Column).toEqual({
            kind: "COLUMN",
            name: "ID"
        });
        expect(electronicBookId.toStorage(strategy) as Column).toEqual({
            kind: "COLUMN",
            name: "ELECTRONIC_BOOK"
        });
        expect(pdfElectronicBookId.toStorage(strategy) as Column).toEqual({
            kind: "COLUMN",
            name: "ELECTRONIC_BOOK"
        });
        expectStorage(orderId.toStorage(strategy)).toEqual({
            kind: "COLUMNS",
            arr: [
                {
                    kind: 'COLUMN',
                    name: 'X',
                    referencedProp: undefined,
                    referencedColumnName: undefined
                },
                {
                    kind: 'COLUMN',
                    name: 'A',
                    referencedProp: undefined,
                    referencedColumnName: undefined
                },
                {
                    kind: 'COLUMN',
                    name: 'B',
                    referencedProp: undefined,
                    referencedColumnName: undefined
                }
            ]
        });
        expectStorage(vipOrderId.toStorage(strategy)).toEqual({
            kind: "COLUMNS",
            arr: [
                {
                    kind: 'COLUMN',
                    name: 'ID_X',
                    referencedProp: undefined,
                    referencedColumnName: undefined
                },
                {
                    kind: 'COLUMN',
                    name: 'ID_Y_A',
                    referencedProp: undefined,
                    referencedColumnName: undefined
                },
                {
                    kind: 'COLUMN',
                    name: 'ID_Y_B',
                    referencedProp: undefined,
                    referencedColumnName: undefined
                }
            ]
        });

        expect(paperBookEntity.tableEntity === bookEntity.tableEntity).toEqual(false);
        expect(electronicBookEntity.tableEntity === bookEntity.tableEntity).toEqual(false);
        expect(pdfElectronicBookEntity.tableEntity === electronicBookEntity.tableEntity).toEqual(false); 
        expect(vipOrderEntity.tableEntity === orderEntity.tableEntity).toEqual(false);    
    });
});
