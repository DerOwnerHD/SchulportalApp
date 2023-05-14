import { Request, Response } from "express";
import { parseCookie, removeBreaks } from "../utils";

const schema = {
    POST: {
        request: {
            body: {
                username: { type: "string", required: true },
                password: { type: "string", required: true },
                id: { type: "number", required: true },
                endpoint: { type: "string", required: true }
            }
        }, response: {
            body: {
                token: { type: "string" }
            }
        }
    }
}

export default {

    /** The user wants the server to generate a AutoLogin cookie and store it in the database  */
    post: async (req: Request, res: Response) => {

        if (!req.body)
            return res.status(400).json({ error: true, error_message: "No body provided in POST", error_details: schema["POST"].request });

        const { username, password, id, endpoint } = req.body;
        if (!username || typeof username !== "string" || !password || typeof password !== "string" || !id || typeof id !== "number" || !endpoint || typeof endpoint !== "string")
            return res.status(400).json({ error: true, error_message: "Invalid or missing properties in POST body", error_details: schema["POST"].request });

        try {

            const requestFormData = {
                user: id + "." + username, 
                password: password,
                stayconnected: 1
            };
            const requestForm: string[] = [];
            for (const entry in requestFormData)
                requestForm.push(`${ entry }=${ encodeURIComponent(requestFormData[entry]) }`);

            const login = await fetch("https://login.schulportal.hessen.de", {
                method: "POST",
                redirect: "manual",
                body: requestForm.join("&"),
                headers: [
                    [ "content-type", "application/x-www-form-urlencoded" ]
                ]
            });

            const session = parseCookie(login.headers.get("set-cookie"))["SPH-Session"];
            if (!session)
                return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

            const text = removeBreaks(await login.text());
            const offset = text.indexOf("<input type=\"hidden\" name=\"token\" value=\"");
            if (offset === -1)
                throw new Error("Couldn't read autologin token");

            // Token needed in POST body for /registerbrowser
            const registerToken = text.substring(offset + 41, offset + 41 + 64);
            
            const register = await fetch("https://login.schulportal.hessen.de/registerbrowser", {
                method: "POST",
                redirect: "manual",
                body: `token=${ registerToken }&fg=HalloSchulportalWarumFingerprint`,
                headers: [
                    [ "content-type", "application/x-www-form-urlencoded" ],
                    [ "cookie", `SPH-Session=${ session }` ]
                ]
            });

            const cookies = parseCookie(register.headers.get("set-cookie"));
            if (!cookies["SPH-AutoLogin"])
                return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

            res.status(201).json({ error: false, token: cookies["SPH-AutoLogin"] || null });
            
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
        }

    }, 
    /** The user requests the AutoLogin cookie stored on the server with the given Push endpoint  */
    get: async (req: Request, res: Response) => {

        
    }, other: (req: Request, res: Response) => {
        res.status(405).json({ error: true, error_message: "405: Method Not Allowed" })
    }

}