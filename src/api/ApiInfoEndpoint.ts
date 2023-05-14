import { Request, Response } from "express";
import { endpoints } from "./Endpoints";

/**
 * Gets all avaliable apps on the Schulportal
 * Examples include: Kalender, Schulmoodle, Stundenplan, etc.
 * Client is expected to use these and other non-custom apps to build the interface
 * Required Method: GET
 * Required Header: Authorization: Generated access token from /api/login
 */
export default async (req: Request, res: Response) => {

    if (req.method !== "GET")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    res.json({ error: false, endpoints: endpoints });

};