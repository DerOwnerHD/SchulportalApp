import { Request, Response } from "express";
import { JSDOM } from "jsdom";
import jQueryFactory = require("jquery");
import { parseCookie, removeBreaks } from "../utils";
import * as fs from "fs";
import { consoleTime, isWindows } from "..";

/**
 * Parses the personal Vertretungsplan of a user by requesting the raw page
 * from Schulportal (/vertretungsplan.php) and then parsing the tables on
 * the page to generate the output.
 * Required Method: GET
 * Required Header: Authorization: Generated access token from /api/login
 */
export default async (req: Request, res: Response) => {

    if (req.method !== "GET")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.headers.authorization)
        return res.status(400).json({ error: true, error_message: "400: Bad Request", error_details: { headers: { authorization: { required: true }, "x-lesson-array": { required: false } } } });

    try {
        const raw = await fetch("https://start.schulportal.hessen.de/vertretungsplan.php", {
            method: "GET",
            headers: [
                ["cookie", "sid=" + req.headers.authorization]
            ]
        });

        if (parseCookie(raw.headers.get("set-cookie"))["i"] === "0")
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        const html = removeBreaks(await raw.text());

        const vertretungsRowOrder = ["empty", "lesson", "class", "substitute", "teacher", "subject", "subject_old", "room", "note"];

        const responseContent: ResponseContent = {
            error: false,
            days: [],
            last_updated: ""
        };

        const { window } = new JSDOM(html);
        // @ts-ignore is needed due to it throwing a error, window is DOMWindow but not Window class, still works totally fine though
        const $ = jQueryFactory(window, true);
        $("#menue_tag .panel-body button").each((index, button) => {

            const tag = button.getAttribute("data-tag"); // tag like 13_12_2022
            const vertretungen: Vertretung[] = [];

            const news = $("#tag" + tag + " .panel-body table.infos tbody tr:not(.subheader) td").html()?.trim().split('<hr style="margin: 0px 2px;">') || [];

            responseContent.days.push({ raw: tag, clean: $("#tag" + tag + " .panel-heading").text().replace("heute", "").replace("morgen", "").replace("A-Woche", "").replace("B-Woche", "").trim(), relative: $("#tag" + tag + " .panel-heading .badge:not(.woche)").text() || "", news: news, vertretungen: vertretungen });
            responseContent.last_updated = $("#tag" + tag + " .panel-body .pull-right i").text().replace("Letzte Aktualisierung: ", "");

            $("table#vtable" + tag + " tbody tr").each((index, row) => {

                let iterator = -1;
                const data: Vertretung = {
                    lesson: "",
                    class: "",
                    substitute: "",
                    teacher: "",
                    subject: "",
                    subject_old: "",
                    room: "",
                    note: "",
                };

                if (row.children.length === 1)
                    return; // only triggers if there is nothing in this line, thus only triggering 
                            // when there is the warning of no Vertretungen on that day

                for (const child of row.children) {

                    iterator++;
                    if (iterator === 0) 
                        continue; // we dont want to process the first empty row
                    else if (iterator === 1 && req.headers["x-lesson-array"]) {
                        // converts the lesson string like "10 - 11" to an array of numbers
                        data[vertretungsRowOrder[iterator]] = child.innerHTML.split(" - ").map(lesson => parseInt(lesson));
                        continue;
                    }

                    const trimmed = child.innerHTML.trim();

                    // This basically merges all the subject_old into subject while preserving the empty object
                    data[vertretungsRowOrder[iterator === 6 && trimmed.length && req.headers["x-no-subject-old"] === "" ? iterator - 1 : iterator]] = trimmed || "";
                    
                }

                vertretungen.push(data);

            });

            responseContent.days[index].vertretungen = (vertretungen);

        });

        res.json(responseContent);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }
};

interface Vertretung {
    lesson: string,
    class: string,
    substitute: string;
    teacher: string;
    subject: string;
    subject_old: string;
    room: string;
    note: string;
};

interface DayFormatting {
    raw: string;
    clean: string;
    relative: string;
    news: string[];
    vertretungen: Vertretung[];
}

interface ResponseContent {
    error: boolean;
    error_message?: any;
    days: DayFormatting[];
    last_updated: string;
}