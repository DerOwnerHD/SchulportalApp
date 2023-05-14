import { Request, Response } from "express";
import { isConnected, subscriptions } from "../database/Database";
import { consoleTime } from "..";
import * as webPush from "web-push";

const knownSubscriptionServices = [
    "android.googleapis.com",
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "updates-autopush.stage.mozaws.net",
    "updates-autopush.dev.mozaws.net",
    ".*\\.notify.windows.com",
    ".*\\.push.apple.com"
];

const serviceRegexes = knownSubscriptionServices.map(service => new RegExp(`^${ service.replace("*", ".*") }$`, "i"));

function isSubscriptionService(host: string) {
    return serviceRegexes.some((regex) => regex.test(host));
}

/**
 * Subscribes the user to a given service worker
 * Required Method: POST
 */
export default async (req: Request, res: Response) => {

    const errorSchema = {
        error: true,
        error_message: "Invalid POST body provided",
        error_details: {
            body: {
                endpoint: { required_type: "string", required: true },
                expirationTime: { required_type: "number | null", required: false },
                keys: {
                    p256dh: { required_type: "string", required: true },
                    auth: { required_type: "string", required: true }
                }
            }
        }
    }

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.body || !req.body.subscription)
        return res.status(400).json(errorSchema);

    const { endpoint, keys } = req.body.subscription;
    if (
        !endpoint || typeof endpoint !== "string" || 
        !keys || typeof keys !== "object" || 
        !keys["p256dh"] || typeof keys["p256dh"] !== "string" ||
        !keys["auth"] || typeof keys["auth"] !== "string"
    ) return res.status(400).json(errorSchema);

    if (!isConnected)
        res.status(503).json({ error: true, error_message: "The MongoDB instance isn't yet connected" });

    // This validates that the user actually send a valid endpoint
    // from a recognized provider of Push API services
    try {

        const url = new URL(endpoint);
        if (url.protocol !== "https:" || !isSubscriptionService(url.host))
            throw new Error();

    } catch (error) {
        return res.status(400).json({ error: true, error_message: "Invalid endpoint URL provided" });
    }
    
    try {

        if (await subscriptions.findOne({ endpoint: endpoint }))
            return res.status(304).json({ error: true, error_message: "304: Not Modified" });

        let sucessful = true;
        // Validate the endpoint is actually working
        await webPush.sendNotification(req.body.subscription, JSON.stringify({ operation: "sendToken", timestamp: Date.now() }))
            .catch((error) => {
                sucessful = false;
                return res.status(400).json({ error: true, error_message: "Invalid credentials provided" });
            });

        if (!sucessful) 
            return;
        // @ts-ignore the document type isn't recognized
        await subscriptions.insertOne({ ...req.body.subscription, username: req.body.username, token: "", vertretungen: null, requestedToken: true });
        // Resource has been created (201)
        res.status(201).json({ error: false });
        console.log(consoleTime() + "✅ Subscription registered");
        
        

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }
};