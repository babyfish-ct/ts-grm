import { describe, expect, it } from "vitest";
import { SIMPLE_COURSE_VIEW, SIMPLE_STUDENT_VIEW } from "./utils";
import { COURSE, STUDENT } from "../model/model";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";

describe("JoinEntitySqlTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("joinEntity", async () => {
        const rows = await sqlClient.createQuery(STUDENT, (q, student) => {
            q.where(
                student.courses().$acceptMulti().name.eq("Film Appreciation")
            );
            return q.select(
                student.fetch(SIMPLE_STUDENT_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME
                from STUDENT tb_1_
                inner join LEARNING_LINK tb_2_ on 
                    tb_1_.ID = tb_2_.STUDENT_ID
                inner join COURSE tb_3_ on 
                    tb_2_.COURSE_ID = tb_3_.ID
                where 
                    tb_3_.NAME = ?
            `,
            args: ["Film Appreciation"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":1, "name":"Tim"},
            {"id":3, "name":"Tom"}
        ]);
    });

    it("inverseJoinEntity", async () => {
        const rows = await sqlClient.createQuery(COURSE, (q, course) => {
            q.where(
                course.students().$acceptMulti().name.eq("Tom")
            );
            return q.select(
                course.fetch(SIMPLE_COURSE_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME
                from COURSE tb_1_
                inner join LEARNING_LINK tb_2_ on 
                    tb_1_.ID = tb_2_.COURSE_ID
                inner join STUDENT tb_3_ on 
                    tb_2_.STUDENT_ID = tb_3_.ID
                where 
                    tb_3_.NAME = ?
            `,
            args: ["Tom"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":2, "name":"Film Appreciation"},
            {"id":3, "name":"Workplace Communication and Presentation"}
        ]);
    });

    it("idOnly", async () => {
        const rows = await sqlClient.createQuery(STUDENT, (q, student) => {
            q.where(
                student.courses().$acceptMulti().id.eq(1)
            );
            return q.select(
                student.fetch(SIMPLE_STUDENT_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME
                from STUDENT tb_1_
                inner join LEARNING_LINK tb_2_ on 
                    tb_1_.ID = tb_2_.STUDENT_ID
                where 
                    tb_2_.COURSE_ID = ?
            `,
            args: [1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":2, "name":"Sam"},
            {"id":4, "name":"Jim"}
        ]);
    });

    it("inverseIdOnly", async () => {
        const rows = await sqlClient.createQuery(COURSE, (q, course) => {
            q.where(
                course.students().$acceptMulti().id.eq(3)
            );
            return q.select(
                course.fetch(SIMPLE_COURSE_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME
                from COURSE tb_1_
                inner join LEARNING_LINK tb_2_ on 
                    tb_1_.ID = tb_2_.COURSE_ID
                where 
                    tb_2_.STUDENT_ID = ?
            `,
            args: [3],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":2, "name":"Film Appreciation"},
            {"id":3, "name":"Workplace Communication and Presentation"}
        ]);
    });

    it("mixed", async () => {
        const rows = await sqlClient.createQuery(STUDENT, (q, student) => {
            q.where(
                student.courses().$acceptMulti().name.eq("Film Appreciation"),
                student.learningLinks().$acceptMulti().score.isNotNull()
            );
            return q.select(
                student.fetch(SIMPLE_STUDENT_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME
                from STUDENT tb_1_
                inner join LEARNING_LINK tb_2_ on 
                    tb_1_.ID = tb_2_.STUDENT_ID
                inner join COURSE tb_3_ on 
                    tb_2_.COURSE_ID = tb_3_.ID
                where 
                        tb_3_.NAME = ?
                    and
                        tb_2_.SCORE is not null
            `,
            args: ["Film Appreciation"],
            purpose: "query"
        });
        expect(rows).toEqual([{"id":3,"name":"Tom"}]);
    });

    it("every", async () => {
        const rows = await sqlClient.createQuery(STUDENT, (q, student) => {
            q.where(
                student.every("courses", course => course.name.like("tion"))
            );
            return q.select(
                student.fetch(SIMPLE_STUDENT_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME
                from STUDENT tb_1_
                where 
                    not exists(
                        select 
                            1
                        from COURSE tb_2_
                        inner join LEARNING_LINK tb_3_ on 
                            tb_2_.ID = tb_3_.COURSE_ID
                        where 
                                tb_3_.STUDENT_ID = tb_1_.ID
                            and
                                tb_2_.NAME not like ?
                    )
            `,
            args: ["%tion%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":1, "name":"Tim"},
            {"id":3, "name":"Tom"}
        ]);
    });

    it("inverseEvery", async () => {
        const rows = await sqlClient.createQuery(COURSE, (q, course) => {
            q.where(
                course.every("students", student => student.name.like("T%", "STARTS_WITH"))
            );
            return q.select(
                course.fetch(SIMPLE_COURSE_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME
                from COURSE tb_1_
                where 
                    not exists(
                        select 
                            1
                        from STUDENT tb_2_
                        inner join LEARNING_LINK tb_3_ on 
                            tb_2_.ID = tb_3_.STUDENT_ID
                        where 
                                tb_3_.COURSE_ID = tb_1_.ID
                            and
                                tb_2_.NAME not like ?
                    )
            `,
            args: ["T%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":2, "name":"Film Appreciation"},
            {"id":3, "name":"Workplace Communication and Presentation"}
        ]);
    });
});