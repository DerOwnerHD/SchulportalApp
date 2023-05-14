import { Request, Response } from "express";
import { JSDOM } from "jsdom";
import jQueryFactory = require("jquery");
import { removeBreaks } from "../utils";

let apps = [];
let lastRefreshed = new Date().getTime();

/**
 * Checks the status of many systems of the Schulportal
 * Required Method: GET
 */
export default async (req: Request, res: Response) => {

    if (req.method !== "GET")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    try {

        res.json({ error: false, status: apps, last_refreshed: lastRefreshed });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    } 
    
};

export function statusInterval() {
    const emojiMap = {
        "🆗": "online",
        "❗": "unavaliable",
        "🛠": "update"
    };

    setInterval(async () => {

        try {

            const raw = await fetch("https://info.schulportal.hessen.de/status-des-schulportal-hessen");

            const html = removeBreaks(await raw.text());

            const { window } = new JSDOM(html);
            // @ts-ignore is needed due to it throwing a error, window is DOMWindow but not Window class, still works totally fine though
            const $ = jQueryFactory(window, true);

            apps = [];
            $(".status tbody").each((index, table) => {

                const titles = $(table).children("tr:nth-child(1)").children("td");
                const statuses = $(table).children("tr:nth-child(2)");

                titles.children("a[href]").each((index, title) => {
                    const object = { name: title.innerHTML, online: false, unavaliable: false, update: false };
                    const emojis = statuses.children(`td:nth-child(${ index + 1 })`).text();
                    for (const [emoji, status] of Object.entries(emojiMap)) {
                        if (emojis.includes(emoji)) {
                        object[status] = true;
                        }
                    }
                    
                    apps.push(object); 
                });

            });

            lastRefreshed = new Date().getTime();

        } catch (error) {
            console.error(error);
        }

    }, 60000);
}