import { Request, Response } from "express";
import { subscriptions } from "../database/Database";

/**
 * Checks if a Subscription is registered within the Database
 * Required Method: POST
 */
export default async (req: Request, res: Response) => {

    const errorSchema = {
        error: true,
        error_message: "Invalid POST body provided",
        error_details: {
            body: {
                endpoint: { required_type: "string", required: true }
            }
        }
    }

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.body)
        return res.status(400).json(errorSchema);

    const { endpoint } = req.body;
    if (!endpoint || typeof endpoint !== "string")
        return res.status(400).json(errorSchema);
    
    try {

        res.json({ error: false, subscribed: !!(await subscriptions.findOne({ endpoint: endpoint })) });
    
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }
    
};