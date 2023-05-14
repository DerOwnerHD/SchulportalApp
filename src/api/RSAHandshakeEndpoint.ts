import { Request, Response } from "express";

const errorSchema = {
    error: true,
    error_message: "Invalid POST Body provided",
    error_details: {
        body: { 
            key: { required_type: "string", required: true }
        }
    }
};

/**
 * Sends the public RSA key of Schulportal to the user
 * Required Method: GET
 */
export default async (req: Request, res: Response) => {

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.body)
        return res.status(400).json(errorSchema);

    const { key } = req.body;
    if (!key || typeof key !== "string")
        return res.status(400).json(errorSchema);

    try {
    
        const raw = await fetch(`https://start.schulportal.hessen.de/ajax.php?f=rsaHandshake&s=${ Math.floor(Math.random() * 2000) }`, {
            method: "POST",
            body: `key=${ encodeURIComponent(key) }`,
            headers: [ [ "Content-Type", "application/x-www-form-urlencoded" ] ]
        });

        res.json({ error: false, ...JSON.parse(await raw.text()) });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    }     

};