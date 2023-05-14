import { Request, Response } from "express";
import { parseCookie } from "../utils";

/**
 * Loads the calendar as a PDF file
 * Required Method: GET
 * Required Header: Authorization: Generated access token from /api/login
 */
export default async (req: Request, res: Response) => {

    if (req.method !== "GET")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.headers.authorization)
        return res.status(400).json({ error: true, error_message: "400: Bad Request", error_details: { headers: { authorization: { required: true } } } });

    try {
    
        const raw = await fetch("https://start.schulportal.hessen.de/kalender.php", {
            method: "POST",
            headers: [
                [ "cookie", "sid=" + req.headers.authorization ],
                [ "content-type", "application/x-www-form-urlencoded" ]
            ],
            body: "f=iCalAbo"
        });

        if (raw.status === 500)
            return res.status(500).json({ error: true, error_message: "500: Internal Server Error" });

        if (parseCookie(raw.headers.get("set-cookie"))["i"] === "0")
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });
            
        const html = await raw.text();

        if (!html.startsWith("https://start.schulportal.hessen.de/"))
            return res.status(500).json({ error: true, error_message: "500: Internal Server Error" });

        res.json({ error: false, link: html });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }     

};