import { Request, Response } from "express";
import { parseCookie, removeBreaks } from "../utils";

/**
 * Loads events from the given timespan from the personal calendar
 * from Schulportal (/kalender.php) and then parsing the data of it
 * Required Method: POST
 * Required Header: Authorization: Generated access token from /api/login
 */
export default async (req: Request, res: Response) => {

    const errorSchema = {
        error: true,
        error_message: "400: Bad Request",
        error_details: {
            body: { 
                start: { required_type: "string", required: true },
                end: { required_type: "string", required: true }
            }
        }
    };

    if (req.method !== "POST")
        return res.status(405).json({ error: true, error_message: "405: Method Not Allowed" });

    if (!req.headers.authorization)
        return res.status(400).json({ error: true, error_message: "400: Bad Request", error_details: { headers: { authorization: { required: true } } } });

    if (!req.body)
        return res.status(400).json(errorSchema);

    const { start, end } = req.body;
    if (
        !start || typeof start !== "string" ||
        !end || typeof end !== "string"
    ) return res.status(400).json(errorSchema);

    const requestFormData = {
        f: "getEvents",
        start: start,
        end: end
    };

    let requestForm: any = [];
    
    for (const entry in requestFormData) {
        requestForm.push(`${ entry }=${ encodeURIComponent(requestFormData[entry]) }`);
    }
    
    requestForm = requestForm.join("&");

    try {

        const raw = await fetch("https://start.schulportal.hessen.de/kalender.php", {
            method: "POST",
            headers: [
                [ "cookie", "sid=" + req.headers.authorization ],
                [ "Content-Type", "application/x-www-form-urlencoded" ]
            ],
            body: requestForm
        });

        if (raw.status === 500)
            return res.status(500).json({ error: true, error_message: "500: Internal Server Error" });

        if (parseCookie(raw.headers.get("set-cookie"))["i"] === "0")
            return res.status(401).json({ error: true, error_message: "401: Unauthorized" });

        const html = removeBreaks(await raw.text());

        const responseContent: ResponseContent = {
            error: false,
            events: []
        };

        const parsed = JSON.parse(html);
        responseContent.events = parsed.map((event: RawEvent) => {
            return {
                institution: +event.Institution,
                id: +event.Id,
                foreignUID: event.FremdUID,
                last_change: new Date(event.LetzteAenderung).getTime(),
                start: event.Anfang,
                end: event.Ende,
                responsible: +event.Verantwortlich,
                location: event.Ort,
                public: jaNeinToBool(event.Oeffentlich),
                secret: jaNeinToBool(event.Geheim),
                title: event.title,
                description: event.description,
                category: +event.category,
                allDay: event.allDay
            }
        });

        res.json(responseContent);

    } catch (error) {
        console.error(error),
        res.status(500).json({ error: true, error_message: "500: Internal Server Error" });
    } 

};

function jaNeinToBool(text: string): boolean {
    return text === "ja";
}

// Who is responsible for this garbage?
interface RawEvent {
    Institution: string;
    Id: string;
    FremdUID: string | null;
    LetzteAenderung: string;
    Anfang: string;
    Ende: string;
    Verantwortlich: string;
    Ort: string | null;
    Oeffentlich: JaNein;
    Privat: JaNein;
    Geheim: JaNein;
    title: string;
    category: string;
    description: string;
    allDay: boolean;
    start: string;
    end: string;
}

type JaNein = "ja" | "nein";

interface Event {
    institution: number;
    id: number;
    foreignUID: string;
    last_change: number;
    start: number;
    end: number;
    responsible: number;
    location: string;
    public: boolean;
    secret: boolean;
    new: boolean;
    title: string;
    category: number;
    description: string;
    allDay: boolean;
    startDay: string;
    endDay: string;
}


interface ResponseContent {
    error: boolean;
    events: Event[];
}