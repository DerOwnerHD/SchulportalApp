import { Request, Response } from "express";
import { parseCookie } from "../utils";

/**
 * Fetches a user's calender events from Moodle
 * Required Method: POST
 */
export default async (req: Request, res: Response) => {
    
    const errorSchema = {
        error: true,
        error_message: "Invalid POST Body provided",
        error_details: {
            body: { 
                key: { required_type: "string", required: true },
                cookie: { required_type: "string", required: true },
                id: { required_type: "number", required: true }
            }
        }
    };

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.body) 
        return res.status(400).json(errorSchema);

    const { key, cookie, id } = req.body;
    if (
        !key || typeof key !== "string" ||
        !cookie || typeof cookie !== "string" ||
        !id || typeof id !== "number" || id < 1 || id > 9999
    ) return res.status(400).json(errorSchema);

    const institutionURL = "https://mo" + id + ".schule.hessen.de/";
    const twoWeeksAgo = new Date(new Date().getTime() - (14 * 24 * 60 * 60 * 1000));
    const timestamp = Math.floor(new Date().getTime() / 1000);

    try {

        const data = await (await fetch(institutionURL + "lib/ajax/service.php?sesskey=" + key, {
            method: "POST",
            headers: [
                [
                    "Cookie",
                    "MoodleSession=" + cookie
                ]
            ],
            body: JSON.stringify([
                {
                    index: 0,
                    methodname: "core_calendar_get_action_events_by_timesort",
                    args: {
                        limitnum: 26,
                        timesortfrom: timestamp,
                        limittononsuspendedevents: true
                    }
                }
            ])
        })).text();

        const json = JSON.parse(data);
        if (json[0]?.error)
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        res.json({ error: false, events: json[0]?.data?.events });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    } 
    
};