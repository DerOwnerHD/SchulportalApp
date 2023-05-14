import { Request, Response } from "express";
import { parseCookie } from "../utils";

/**
 * Takes a user's generated session ID and uses it to
 * log them into the Moodle system (returns the keys)
 * Required Method: POST
 */
export default async (req: Request, res: Response) => {
    
    const errorSchema = {
        error: true,
        error_message: "Invalid POST Body provided",
        error_details: {
            body: { 
                session: { required_type: "string", required: true },
                id: { required_type: "id", required: true }
            }
        }
    };

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.body) 
        return res.status(400).json(errorSchema);

    const { session, id } = req.body;
    if (
        !session || typeof session !== "string" ||
        !id || typeof id !== "number" || id < 1 || id > 9999
    ) return res.status(400).json(errorSchema);

    // Encoding of a Moodle login link
    const institutionLogin = Buffer.from("https://mo" + id + ".schule.hessen.de/login/index.php").toString("base64");

    try {

        // Sends request to SAMLSingleSignOn which provides a URL which actually requires authentication in form
        // of a SPH-Session cookie (provided by user in POST request)
        const SAMLSingleSignOn = (await fetch("https://loginproxy1.schulportal.hessen.de/?url=" + institutionLogin, {
            redirect: "manual"
        })).headers.get("location");
        if (!SAMLSingleSignOn) // Here we don't have to worry about authentication, so a failure can only be a server error
            return res.status(500).json({ error: true, error_message: "500: Internal Server Error" });

        // This endpoints requires (as previously mentioned) a SPH-Session Cookie to give
        // us the next URL, which is a proxySingleSignOnArtifact URL
        const proxySingleSignOnArtifact = (await fetch(SAMLSingleSignOn, {
            redirect: "manual",
            headers: [
                [
                    "Cookie",
                    "SPH-Session=" + session
                ]
            ]
        })).headers.get("location");
        if (!proxySingleSignOnArtifact)
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        // If the previous request was sucessful, we can now GET to this location, which will
        // redirect us back to the Moodle Login page (/login/index.php) with a Paula cookie
        // This Paula cookie is then needed for authentication in Moodle
        const redirectToMoodle = (await fetch(proxySingleSignOnArtifact, {
            redirect: "manual",
        })).headers;
        // This has to be dynamic so it can apply to multiple institutions
        const moodleRedirectCookies = parseCookie(redirectToMoodle.get("set-cookie"));
        if (redirectToMoodle.get("location") !== "https://mo" + id + ".schule.hessen.de/login/index.php" || !moodleRedirectCookies["Paula"])
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        const paulaCookie = moodleRedirectCookies["Paula"];
        const moodleLogin = (await fetch("https://mo" + id + ".schule.hessen.de/login/index.php", {
            redirect: "manual",
            headers: [
                [
                    "Cookie",
                    "Paula=" + paulaCookie
                ]
            ]
        }));

        // A sucessful operation can only return 303 code and cannot have a location header
        const locationHeader = moodleLogin.headers.get("location");
        if (moodleLogin.status !== 303 || !locationHeader || !locationHeader.startsWith("https://mo" + id + ".schule.hessen.de/login/index.php?testsession="))
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        const userId = parseInt(locationHeader.split("testsession=")[1]);

        // Using this we may attempt to request the /my/ page of moodle
        const moodleSession = parseCookie(moodleLogin.headers.get("set-cookie"))["MoodleSession"];
        const mainPage = (await fetch("https://mo" + id + ".schule.hessen.de/my/", {
            redirect: "manual",
            headers: [
                [
                    "Cookie",
                    "MoodleSession=" + moodleSession
                ]
            ]
        }));

        const mainPageContent = await mainPage.text();
        const sessKeyOffset = mainPageContent.indexOf('logout.php?sesskey=') + 19;
        const sessKey = mainPageContent.substring(sessKeyOffset, sessKeyOffset + 10);

        res.json({ error: false, cookie: moodleSession, key: sessKey, userId: userId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }
    
};