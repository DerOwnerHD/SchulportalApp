import { Request, Response } from "express";
import { JSDOM } from "jsdom";
import jQueryFactory = require("jquery");
import { parseCookie, removeBreaks } from "../utils";

/**
 * Parses the personal Stundenplan of a user by requesting the raw page
 * from Schulportal (/stundenplan.php) and then parsing the data of it
 * Required Method: GET
 * Required Header: Authorization: Generated access token from /api/login
 */
export default async (req: Request, res: Response) => {

    if (req.method !== "GET")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.headers.authorization)
        return res.status(400).json({ error: true, error_message: "400: Bad Request", error_details: { headers: { authorization: { required: true }, "x-lesson-array": { required: false } } } });

    try {

        const raw = await fetch("https://start.schulportal.hessen.de/stundenplan.php", {
            method: "GET",
            headers: [
                ["cookie", "sid=" + req.headers.authorization]
            ]
        });

        if (parseCookie(raw.headers.get("set-cookie"))["i"] === "0")
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        const html = removeBreaks(await raw.text());
        const plansToLoad: PlanLoadData[] = [];

        const { window } = new JSDOM(html);
        // @ts-ignore is needed due to it throwing a error, window is DOMWindow but not Window class, still works totally fine though
        const $ = jQueryFactory(window, true);

        let initialPlan: PlanLoadData = { start: $("#all .plan").attr("data-date"), end: null };

        $("#all .plan #dateSelect option").each((index, element): any => {
            const text = element.innerHTML;
            const offset = text.indexOf(" (bis ")
            if (offset !== -1) {
                const array = text.substring(offset + 6, offset + 6 + 10).split(".");
                var output = array[2] + "-" + array[1] + "-" + array[0];
            } 
            
            if (element.getAttribute("selected") === "selected")
                return initialPlan.end = output || null;

            plansToLoad.push({ start: element.getAttribute("value"), end: output || null });
        });

        const responseContent: ResponseContent = {
            error: false,
            plans: []
        };

        responseContent.plans.push(await loadSplanForDate(initialPlan, req.headers.authorization, false, html));

        for (const plan of plansToLoad)
            responseContent.plans.push(await loadSplanForDate(plan, req.headers.authorization, true));

        res.json(responseContent);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    } 

};

interface PlanLoadData {
    start: string;
    end: string | null;
}

async function loadSplanForDate(date: PlanLoadData, auth: string, load: boolean, html?: string): Promise<Stundenplan> {

    if (load) {

        const raw = await fetch("https://start.schulportal.hessen.de/stundenplan.php?a=detail_klasse&date=" + date.start, {
            method: "GET",
            headers: [
                ["cookie", "sid=" + auth]
            ]
        });
    
        html = removeBreaks(await raw.text());

    }

    const { window } = new JSDOM(html);
    // @ts-ignore is needed due to it throwing a error, window is DOMWindow but not Window class, still works totally fine though
    const $ = jQueryFactory(window, true);

    const plan: Stundenplan = { days: [ 
        { name: "Montag", lessons: [] },
        { name: "Dienstag", lessons: [] },
        { name: "Mittwoch", lessons: [] },
        { name: "Donnerstag", lessons: [] },
        { name: "Freitag", lessons: [] }
    ], start_date: date.start, end_date: date.end, lessons: [] };

    $("#all .plan table.table.table-hoverRowspan.table-condensed.table-bordered.table-centered tbody tr td:nth-child(1) .VonBis small").each((index, element) => {
        plan.lessons.push(element.innerHTML.split(" - ").map((lesson) => { return lesson.split(":").map((time) => { return parseInt(time); }); }));
    });

    $("#all .plan table.table.table-hoverRowspan.table-condensed.table-bordered.table-centered tbody tr td:not(:nth-child(1))").each((index, element) => {
        const day = Array.from(element.parentNode.children).indexOf(element) - 1;
        const lesson = Array.from(element.parentNode.parentNode.children).indexOf(element.parentElement) + 1;
        const rows = parseInt(element.getAttribute("rowspan") || "1");
        let iterator = 1;
        const classes: Class[] = [];
        for (const entry of element.children) {
            const name = $("b", entry).text();
            const room = $("div.stunde:nth-child(" + iterator + ")", entry.parentElement).clone().children().remove().end().text().trim();
            const teacher = $("small", entry).text().trim();
            classes.push({ name: name, room: room, teacher: teacher });
            iterator++;
        }
        const lessons: number[] = rows === 2 ? [ lesson, lesson + 1 ] : [ lesson ];
        plan.days[day].lessons.push({ lessons: lessons, classes: classes });
    });

    for (const day of plan.days) {

        const index = plan.days.indexOf(day);
        for (const lesson of day.lessons) {

            const found = findDayWithEmptyLesson(plan, index, lesson.lessons);
            if (found !== index) {
                plan.days[index].lessons.splice(plan.days[index].lessons.indexOf(lesson), 1);
                plan.days[found].lessons.push(lesson);
            }

        }

        day.lessons.sort((a, b) => {

            if (a.lessons[0] < b.lessons[0])
                return -1;
            
            if (a.lessons[0] > b.lessons[0])
                return 1;

            return 0;

        });

    }

    return plan;
}

function findDayWithEmptyLesson(plan: Stundenplan, day: number, lessons: number[]): number {

    for (let i = day; i < 5; i++) {

        let occupied = false;
        for (const lesson of lessons) {

            // This indicates that on that day, another lesson already
            // occupied that specific time slot and thus we need to
            // look one day further!
            if (plan.days[i].lessons.find((x) => x.lessons.includes(lesson)))
                occupied = true;
    
        }

        if (!occupied)
            return i;

    }

    // This should only act as a fallback in case
    // no other empty day could be found in the list
    return day;
}

interface Stunde {
    lessons: number[];
    classes: Class[];
};

interface Class {
    teacher: string;
    room: string;
    name: string;
}

interface Stundenplan {
    days: Day[];
    start_date: string;
    end_date: string | null;
    lessons: number[][][];
}

interface Day {
    name: "Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag";
    lessons: Stunde[];
}

interface ResponseContent {
    error: boolean;
    plans: Stundenplan[];
}