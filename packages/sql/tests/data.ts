export const INITIAL_SQL = `
insert into BOOK_STORE(ID, TYPE, NAME, VERSION, URL) values
    (1, 'OnlineBookStore', 'O''REILLY', 1, 'https://www.oreilly.com');
insert into BOOK_STORE(ID, TYPE, NAME, VERSION, CITY, STREET, TAGS) values
    (2, 'PhysicalBookStore', 'MANNING', 1, 'Shelter Island', '20 Baldwin Road', 3);

insert into BOOK(ID, TYPE, NAME, EDITION, PRICE, STORE_ID) values
    (1, 'ElectronicBook', 'Learning GraphQL', 1, 33.99, 1),
    (2, 'ElectronicBook', 'Learning GraphQL', 2, 33.99, 1),
    (3, 'ElectronicBook', 'Learning GraphQL', 3, 33.99, 1),
    (4, 'PaperBook', 'Effective TypeScript', 1, 43.99, 1),
    (5, 'PaperBook', 'Effective TypeScript', 2, 53.99, 1),
    (6, 'PaperBook', 'Effective TypeScript', 3, 63.99, 1),
    (7, 'PaperBook', 'YugabyteDB: The Definitive Guide', 1, 69.99, 1),
    (8, 'PaperBook', 'YugabyteDB: The Definitive Guide', 2, 79.99, 1),
    (9, 'PaperBook', 'YugabyteDB: The Definitive Guide', 3, 89.99, 1),
    (10, 'PdfElectronicBook', 'GraphQL in Action', 1, 59.99, 2),
    (11, 'PdfElectronicBook', 'GraphQL in Action', 2, 69.99, 2),
    (12, 'PdfElectronicBook', 'GraphQL in Action', 3, 79.99, 2);

insert into PAPER_BOOK(PB_ID, WIDTH, HEIGHT) values
    (4, 140, 203),
    (5, 140, 203),
    (6, 140, 203),
    (7, 145, 210),
    (8, 145, 210),
    (9, 145, 210);

insert into ELECTRONIC_BOOK(EB_ID, EB_TYPE, ADDRESS) values
    (1, 'ElectronicBook', 'https://www.oreilly.com/learning-graphql?version=1'),
    (2, 'ElectronicBook', 'https://www.oreilly.com/learning-graphql?version=2'),
    (3, 'ElectronicBook', 'https://www.oreilly.com/learning-graphql?version=3'),
    (10, 'PdfElectronicBook', 'https://www.manning.com/grahql-in-action?version=1'),
    (11, 'PdfElectronicBook', 'https://www.manning.com/grahql-in-action?version=2'),
    (12, 'PdfElectronicBook', 'https://www.manning.com/grahql-in-action?version=3');

insert into PDF_ELECTRONIC_BOOK(PEB_ID, PDF_VERSION) values
    (10, '2.0'),
    (11, '2.0'),
    (12, '2.0');

insert into AUTHOR(id, first_name, last_name, GENDER) values
    (1, 'Eve', 'Procello', 'F'),
    (2, 'Alex', 'Banks', 'M'),
    (3, 'Dan', 'Vanderkam', 'M'),
    (4, 'Karthik', 'Ranganathan', 'M'),
    (5, 'Kannappan', 'Muthukkaruppan', 'M'),
    (6, 'Mikhail', 'Bautin', 'M'),
    (7, 'Samer', 'Buna', 'M');

insert into book_author_mapping(book_id, author_id) values
    (1, 1),
    (2, 1),
    (3, 1),

    (1, 2),
    (2, 2),
    (3, 2),

    (4, 3),
    (5, 3),
    (6, 3),

    (7, 4),
    (8, 4),
    (9, 4),

    (7, 5),
    (8, 5),
    (9, 5),

    (7, 6),
    (8, 6),
    (9, 6),

    (10, 7),
    (11, 7),
    (12, 7);

insert into "ORDER"(X, A, B, NAME, CREATED_TIME) values
    (1, 1, 1, 'order-1', '2026-08-22 07:54:23'),
    (1, 1, 2, 'order-2', '2026-08-22 18:01:56'),
    (2, 1, 1, 'order-3', '2026-08-23 09:00:16'),
    (2, 1, 2, 'order-4', '2026-08-23 13:47:37');

insert into ORDER_ITEM(ID, PRODUCT_NAME, order_x, order_y_a, order_y_b) values
    (1, 'Pen', 1, 1, 1),
    (2, 'Pencil', 1, 1, 1),
    (3, 'Panio', 1, 1, 2),
    (4, 'Bike', 1, 1, 2),
    (5, 'Bag', 2, 1, 1),
    (6, 'TV', 2, 1, 1),
    (7, 'Computer', 2, 1, 2),
    (8, 'iPhone', 2, 1, 2);

insert into TAG(LOW, HIGH, NAME) values
    (1, 1, 'red'),
    (1, 2, 'orange'),
    (1, 3, 'yellow'),
    (1, 4, 'green'),
    (2, 1, 'cyan'),
    (2, 2, 'blue'),
    (2, 3, 'purple');

insert into ORDER_TAG_MAPPING(order_x, order_y_a, order_y_b, tag_low, tag_high) values
    (1, 1, 1, 1, 2),
    (1, 1, 1, 1, 3),
    (1, 1, 2, 1, 4),
    (1, 1, 2, 2, 1),
    (2, 1, 1, 2, 2),
    (2, 1, 1, 2, 3),
    (2, 1, 2, 1, 1),
    (2, 1, 2, 1, 2);

insert into "COMMENT"(ID, NAME, TEXT) values
    (1, 'Delayed', 'Delyaed, delive faster'),
    (2, 'Aborted', 'Aborted, come back'),
    (3, 'Changed', 'Changed, please notify');

insert into ORDER_COMMENT_MAPPING(order_x, order_y_a, order_y_b, COMMENT_ID) values
    (1, 1, 1, 1),
    (1, 1, 1, 3),
    (2, 1, 1, 1),
    (2, 1, 1, 3);

insert into TREE_NODE(
    ID, TYPE, NAME, PARENT_NODE_ID
) values
    (1, 'Category', 'Home', null),
        (2, 'Category', 'Food', 1),
            (3, 'Category', 'Drinks', 2),
                (4, 'Item', 'Coca Cola', 3),
                (5, 'Item', 'Fanta', 3),
            (6, 'Category', 'Bread', 2),
                (7, 'Item', 'Baguette', 6),
                (8, 'Item', 'Ciabatta', 6),
        (9, 'Category', 'Clothing', 1),
            (10, 'Category', 'Woman', 9),
                (11, 'Category', 'Casual wear', 10),
                    (12, 'Item', 'Dress', 11),
                    (13, 'Item', 'Miniskirt', 11),
                    (14, 'Item', 'Jeans', 11),
                (15, 'Category', 'Formal wear', 10),
                    (16, 'Item', 'Suit', 15),
                    (17, 'Item', 'Shirt', 15),
            (18, 'Category', 'Man', 9),
                (19, 'Category', 'Casual wear', 18),
                    (20, 'Item', 'Jacket', 19),
                    (21, 'Item', 'Jeans', 19),
                (22, 'Category', 'Formal wear', 18),
                    (23, 'Item', 'Suit', 22),
                    (24, 'Item', 'Shirt', 22);

insert into CATEGORY(ID, MANAGER) values
    (1, 'Michael'),
    (2, 'Sarah'),
    (3, 'David'),
    (6, 'Emily'),
    (9, 'James'),
    (10, 'Jessica'),
    (11, 'Robert'),
    (15, 'Ashley'),
    (18, 'William'),
    (19, 'Jennifer'),
    (22, 'Christopher');

insert into ITEM(ID, PRICE) values
    (4, 2),
    (5, 2),
    (7, 4),
    (8, 5),
    (12, 45),
    (13, 35),
    (14, 50),
    (16, 120),
    (17, 60),
    (20, 80),
    (21, 50),
    (23, 130),
    (24, 65);

insert into ITEM_TAG_MAPPING(ITEM_ID, TAG_LOW_ID, TAG_HIGH_ID) values
    (4, 1, 1),
    (4, 1, 2),
    (4, 2, 2),
    (7, 2, 1),
    (8, 2, 2),
    (12, 2, 3),
    (12, 2, 1),
    (13, 1, 2),
    (13, 2, 1),
    (14, 1, 3),
    (20, 1, 1),
    (21, 1, 3),
    (21, 2, 3),
    (24, 1, 4),
    (24, 2, 1);

-- Library table data (bottom layer libraries have smaller IDs)
insert into LIBRARY(ID, NAME, VERSION) values
    -- Bottom layer root nodes (IDs 1-10)
    (1, 'lodash', '4.17.21'),
    (2, 'async', '3.2.5'),
    (3, 'statuses', '2.0.1'),
    (4, 'toidentifier', '1.0.1'),
    (5, 'setprototypeof', '1.2.0'),
    (6, 'inherits', '2.0.4'),
    (7, 'ee-first', '1.1.1'),
    (8, 'esutils', '2.0.3'),
    (9, 'util-deprecate', '1.0.2'),
    
    -- Middle layer nodes (IDs 11-30)
    (11, 'send', '0.18.0'),
    (12, 'parseurl', '1.3.3'),
    (13, 'encodeurl', '1.0.2'),
    (14, 'fresh', '0.5.2'),
    (15, 'etag', '1.8.1'),
    (16, 'depd', '2.0.0'),
    (17, 'http-errors', '2.0.0'),
    (18, 'on-finished', '2.4.1'),
    (19, 'eslint-visitor-keys', '3.4.3'),
    (20, 'estraverse', '5.3.0'),
    (21, 'esrecurse', '4.3.0'),
    
    -- Upper layer nodes (IDs 31-40)
    (31, 'serve-static', '1.15.0'),
    (32, 'finalhandler', '1.2.0'),
    (33, 'espree', '9.6.1'),
    (34, 'esquery', '1.5.0'),
    (35, 'eslint-scope', '7.2.2'),
    
    -- Top layer root nodes (IDs 41-50)
    (41, 'express', '4.18.2'),
    (42, 'eslint', '8.56.0');

-- Dependency mapping (dependent_id -> dependency_id)
insert into LIBRARY_DEPENDENCY_MAPPING(DEPENDENT_ID, DEPENDENCY_ID) values
    -- Express tree: top layer depends on bottom layer
    (41, 1),   -- express depends on lodash
    (41, 2),   -- express depends on async
    
    -- Express tree: serve-static branch
    (41, 31),  -- express depends on serve-static
    (31, 11),  -- serve-static depends on send
    
    -- Express tree: finalhandler branch
    (41, 32),  -- express depends on finalhandler
    (32, 11),  -- finalhandler depends on send
    (32, 18),  -- finalhandler depends on on-finished
    (18, 7),   -- on-finished depends on ee-first
    
    -- Express tree: send sub-branch (shared by serve-static and finalhandler)
    (11, 12),  -- send depends on parseurl
    (11, 13),  -- send depends on encodeurl
    (11, 14),  -- send depends on fresh
    (11, 15),  -- send depends on etag
    
    -- Express tree: deep chain (parseurl/encodeurl/fresh/etag -> depd -> http-errors -> bottom)
    (12, 16),  -- parseurl depends on depd
    (13, 16),  -- encodeurl depends on depd
    (14, 16),  -- fresh depends on depd
    (15, 16),  -- etag depends on depd
    (16, 17),  -- depd depends on http-errors
    (17, 3),   -- http-errors depends on statuses
    (17, 4),   -- http-errors depends on toidentifier
    (17, 5),   -- http-errors depends on setprototypeof
    (17, 6),   -- http-errors depends on inherits
    
    -- ESLint tree: top layer depends on bottom layer
    (42, 1),   -- eslint depends on lodash
    (42, 2),   -- eslint depends on async
    
    -- ESLint tree: espree branch
    (42, 33),  -- eslint depends on espree
    (33, 19),  -- espree depends on eslint-visitor-keys
    (19, 8),   -- eslint-visitor-keys depends on esutils
    
    -- ESLint tree: esquery branch
    (42, 34),  -- eslint depends on esquery
    (34, 20),  -- esquery depends on estraverse
    (20, 9),   -- estraverse depends on util-deprecate
    
    -- ESLint tree: eslint-scope branch
    (42, 35),  -- eslint depends on eslint-scope
    (35, 20),  -- eslint-scope depends on estraverse
    (35, 21),  -- eslint-scope depends on esrecurse
    (21, 8);   -- esrecurse depends on esutils

insert into STUDENT(ID, NAME) values
    (1, 'Tim'),
    (2, 'Sam'),
    (3, 'Tom'),
    (4, 'Jim');

insert into COURSE(ID, NAME, DESCRIPTION, IS_ONLINE) values
    (1, 'Psychology and Life', 'Explore the intersection of psychology and everyday life.', true),
    (2, 'Film Appreciation', 'Analyze classic and contemporary films from a critical perspective.', false),
    (3, 'Workplace Communication and Presentation', 'Develop essential communication skills for professional environments.', true),
    (4, 'Introduction to Artificial Intelligence', 'Overview of AI concepts, algorithms, and real-world applications.', true);

insert into LEARNING_LINK(ID, STUDENT_ID, COURSE_ID, SCORE) values
    (1, 1, 2, NULL),
    (2, 1, 3, NULL),
    (3, 2, 4, NULL),
    (4, 2, 1, NULL),
    (5, 3, 2, 78),
    (6, 3, 3, NULL),
    (7, 4, 4, NULL),
    (8, 4, 1, NULL);
`;