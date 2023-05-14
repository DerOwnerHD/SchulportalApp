import { Request, Response } from "express";
import { subscriptions } from "../database/Database";
import { consoleTime } from "..";

/**
 * Saves a user's token submitted by a Service Worker and adds it to
 * a keep-alive circle of constant checking requests (the token just needs
 * to continuosly request stuff from Schulportal to stay alive)
 * Required Method: POST
 */
export default async (req: Request, res: Response) => {

    const errorSchema = {
        error: true,
        error_message: "Invalid POST body provided",
        error_details: {
            body: {
                token: { required_type: "string", required: true }, 
                endpoint: { required_type: "string", required: true }
            }
        }
    }

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.body)
        return res.status(400).json(errorSchema);

    const { token, endpoint } = req.body;
    if (!token || typeof token !== "string" || !endpoint || typeof endpoint !== "string")
        return res.status(400).json(errorSchema);
    
    try {

        const check = await fetch("https://start.schulportal.hessen.de/startseite.php", {
            headers: [ [ "cookie", "sid=" + token ] ],
            redirect: "manual"
        });

        if (check.status === 302)
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        if (!subscriptions.findOne({ endpoint: endpoint }))
            return res.status(404).json({ error: true, error_message: "Subscription with endpoint not found" });
        await subscriptions.updateOne({ endpoint: endpoint }, { $set: { token: token, requestedToken: false } });
        res.status(201).json({ error: false });
        console.log(consoleTime() + "✅ Recieved token from Service Worker");
    
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }
    
};