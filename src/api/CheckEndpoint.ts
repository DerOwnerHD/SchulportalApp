import { Request, Response } from "express";

/**
 * Checks if a user is, using the given token, still logged in to Schulportal
 * If not, the client is expected to POST to /api/login to obtain a new
 * access token for Schulportal.
 * Required Method: POST
 */
export default async (req: Request, res: Response) => {

    const errorSchema = {
        error: true,
        error_message: "Invalid POST Body provided",
        error_details: {
            body: { 
                token: { required_type: "string", required: true }
            }
        }
    };

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.body) 
        return res.status(400).json(errorSchema);

    const { token } = req.body;
    if (!token || typeof token !== "string")
        return res.status(400).json(errorSchema);

    try {

        const raw = await fetch("https://start.schulportal.hessen.de/startseite.php", {
            method: "HEAD",
            redirect: "manual",
            headers: [
                [ "cookie", "sid=" + token ]
            ]
        });

        res.json({ error: false, valid: !raw.headers.get("location") });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }

};