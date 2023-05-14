import { Request, Response } from "express";
import { parseCookie } from "../utils";

const structure = {
    request: {
        GET: {
            headers: [
                { name: "Authorization", required: true, type: "string", value: "Token field from /api/login" }
            ], query: [
                { name: "type", required: true, options: ["SCHULPORTAL", "MOODLE"] }
            ], body: []
        }
    }
}

/**
 * Loads all private messages from a user
 * Required Method: GET
 * Required Header: Authorization: Generated access token from /api/login
 */
export default async (req: Request, res: Response) => {

    if (req.method !== "GET")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.headers.authorization)
        return res.status(400).json({ error: true, error_message: "Authorization Header required", error_details: { headers: { authorization: { required: true } } } });

    if (!req.query["type"])
        return res.status(400).json({ error: true, error_message: "Query type required", error_details: { query: { type: { options: ["SCHULPORTAL", "MOODLE"], required: true } } } })

    const { type } = req.query;
    if (type !== "SCHULPORTAL" && type !== "MOODLE")
        return res.status(400).json({ error: true, error_message: "Query type must be SCHULPORTAL, MOODLE" });

    try {
    
        const raw = await fetch("https://start.schulportal.hessen.de/nachrichten.php", {
            method: "POST",
            redirect: "manual",
            headers: [
                [ "cookie", "sid=" + req.headers.authorization ],
                [ "content-type", "application/x-www-form-urlencoded" ],
                [ "X-Requested-With", "XMLHttpRequest" ]
            ]
        });

        res.json({ error: false, text: await raw.text() });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }     

};