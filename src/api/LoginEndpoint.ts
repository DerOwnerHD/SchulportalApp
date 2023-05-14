import { Request, Response } from "express";
import { parseCookie } from "../utils";
import { consoleTime } from "..";

/**
 * Takes in a user's login credentials (name, password, institution) and
 * directly logs them into Schulportal and returns them a valid
 * access token to be used in further API requests.
 * Required Method: POST
 */
export default async (req: Request, res: Response) => {

    const errorSchema = {
        error: true,
        error_message: "Invalid POST Body provided",
        error_details: {
            body: { 
                username: { required_type: "string", required: true },
                password: { required_type: "string", required: true },
                id: { required_type: "number", required: true }
            }
        }
    };

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.body) 
        return res.status(400).json(errorSchema);

    const { username, password, id } = req.body;
    if (
        !username || typeof username !== "string" ||
        !password || typeof password !== "string" ||
        !id || typeof id !== "number"
    ) return res.status(400).json(errorSchema);

    const isServiceWorker = req.headers["x-service-worker"] === "";

    console.log(consoleTime() + `⏳ Attempted login by ${isServiceWorker ? "Service Worker" : "User"}`);
    const startTime = Date.now();

    const requestFormData = {
        user: id + "." + username, 
        password: password
    };
    let requestForm: any = [];

    for (const entry in requestFormData) {
        requestForm.push(`${ entry }=${ encodeURIComponent(requestFormData[entry]) }`);
    }
    requestForm = requestForm.join("&");

    try {

        const raw = await fetch("https://login.bildung.hessen.de", {
            method: "POST",
            headers: [
                [ "Content-Type", "application/x-www-form-urlencoded" ]
            ], body: requestForm,
            redirect: "manual"
        });

        const cookies = parseCookie(raw.headers.get("set-cookie"));
        const session = cookies["SPH-Session"];
        if (!session) 
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        const connect = await fetch("https://connect.schulportal.hessen.de", {
            method: "GET",
            redirect: "manual",
            headers: [
                [ "cookie", "SPH-Session=" + session ]
            ]
        });

        const location = connect.headers.get("location");
        if (!location || !location.startsWith("https://start.schulportal.hessen.de/schulportallogin.php?k") || connect.status !== 302)
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });
            
        const login = await fetch(location, {
            method: "HEAD",
            redirect: "manual"   
        });

        if (!login.headers.get("set-cookie"))
            return res.status(500).json({ error: true, error_message: "500: Internal Server Error" });

        console.log(consoleTime() + `✅ Sucessful login by ${isServiceWorker ? "Service Worker" : "User"} after ${ (Date.now() - startTime) / 1000 } seconds`);

        res.json({ error: false, token: parseCookie(login.headers.get("set-cookie"))["sid"], session: session });

    } catch (error) {
        console.error(consoleTime() + `❌ Failed login by ${isServiceWorker ? "Service Worker" : "User"} after ${ (Date.now() - startTime) / 1000 } seconds`);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }
        
    
};