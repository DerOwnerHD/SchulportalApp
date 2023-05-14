import { Request, Response } from "express";

/**
 * Sends the public RSA key of Schulportal to the user
 * Required Method: GET
 */
export default async (req: Request, res: Response) => {

    if (req.method !== "GET")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    try {

        const time = Date.now();

        if (rsaKeyCache.refresh_time < time - (1000 * 60 * 60)) {

            const raw = await fetch("https://start.schulportal.hessen.de/ajax.php?f=rsaPublicKey", {
                method: "GET"
            });
    
            const json = JSON.parse(await raw.text());
            if (!json.publickey)
                return res.status(500).json({ error: true, error_message: "500: Internal Server Error" });

            rsaKeyCache.key = json.publickey;
            rsaKeyCache.refresh_time = time;

        }

        res.json({ error: false, publickey: rsaKeyCache.key });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }     

};

const rsaKeyCache = { key: null, refresh_time: 0 };