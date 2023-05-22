const app = require("express")();
const rateLimit = require("express-rate-limit");
import * as express from "express";
import { Request, Response } from "express";
import ApiInfoEndpoint from "./api/ApiInfoEndpoint";
import CheckEndpoint from "./api/CheckEndpoint";
import LoginEndpoint from "./api/LoginEndpoint";
import StundenplanEndpoint from "./api/StundenplanEndpoint";
import VertretungsEndpoint from "./api/VertretungsEndpoint";
import MoodleLoginEndpoint from "./api/MoodleLoginEndpoint";
import MoodleEventsEndpoint from "./api/MoodleEventsEndpoint";

import * as path from "path";
import * as webPush from "web-push";
import * as os from "os";
import * as fs from "fs";
import SubscribeEndpoint from "./worker/SubscribeEndpoint";
import Database from "./database";
import CalendarEndpoint from "./api/CalendarEndpoint";
import CalendarExportEndpoint from "./api/CalendarExportEndpoint";
import StatusEndpoint, { statusInterval } from "./api/StatusEndpoint";
import RSAPublicKeyEndpoint from "./api/RSAPublicKeyEndpoint";
import RSAHandshakeEndpoint from "./api/RSAHandshakeEndpoint";
import SubmitTokenEndpoint from "./worker/SubmitTokenEndpoint";
import { startInterval } from "./worker/SubscriptionHandler";
import SubscriptionCheckEndpoint from "./worker/SubscriptionCheckEndpoint";
import SubscriptionRemoveEndpoint from "./worker/SubscriptionRemoveEndpoint";
import MessagesEndpoint from "./api/MessagesEndpoint";
import AutoLoginEndpoint from "./api/AutoLoginEndpoint";

const root = path.dirname(__dirname);
// Loads the Enviroment Variables from the main root of the project
require("dotenv").config({ path: root + "/.env" });

function generateRateLimit(max?: number, window?: number, methods?: string[]): RateLimiter {
    return { 
        windowMs: window || 1000 * 60, 
        max: max || 5, 
        standardHeaders: true, 
        legacyHeaders: false, 
        message: { 
            error: true, 
            error_message: "429: Too Many Requests" 
        },
        skip: (request: Request, res: Response) => {
            if (!methods || !methods.length)
                return false;
            if (methods.includes(request.method))
                return false;
            return true;
        }
    };
}

interface RateLimiter {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
    message: object;
    skip: (request: Request, response: Response) => boolean;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/login", rateLimit(generateRateLimit(4, 1000 * 20, ["POST"])));
app.use("/api/autologin", rateLimit(generateRateLimit(4, 1000 * 20, ["POST"])));
app.use("/api/worker/subscribe", rateLimit(generateRateLimit(2, 1000 * 20, ["POST"])));
app.use("/api/worker/submit", rateLimit(generateRateLimit(4, 1000 * 20, ["POST"])));
app.use("/api/worker/remove", rateLimit(generateRateLimit(2, 1000 * 20, ["POST"])));

export const consoleTime = (): string => {
    const time = new Date();
    const hours = time.getHours(), minutes = time.getMinutes(), seconds = time.getSeconds();
    return `[${ (hours < 10 ? "0" : "") + hours }:${ (minutes < 10 ? "0" : "") + minutes }:${ (seconds < 10 ? "0" : "") + seconds }] `;
}

export function isWindows(): boolean {
    return os.platform() === "win32";
}

export const vapidKeys = {
    private: process.env.VAPID_KEY_PRIVATE,
    public: process.env.VAPID_KEY_PUBLIC
};

webPush.setVapidDetails("mailto:test@test.com", vapidKeys.public, vapidKeys.private);

// =========== FRONTEND ===========
app.get("/", (req: Request, res: Response) => res.sendFile(root + "/build/frontend/index.html"));
app.get("/app.js", (req: Request, res: Response) => res.sendFile(root + "/build/frontend/app.js"));
app.get("/app.css", (req: Request, res: Response) => res.sendFile(root + "/build/frontend/app.css"));
app.get("/font/:id", (req: Request, res: Response) => handleFontRequest(req, res));
app.get("/favicon.ico", (req: Request, res: Response) => res.sendFile(root + "/frontend/favicon.ico"));
app.get("/apple-touch-icon.png", (req: Request, res: Response) => res.sendFile(root + "/frontend/apple-touch-icon.png"));

// =========== SERVICE WORKER ===========
app.get("/worker.js", (req: Request, res: Response) => res.sendFile(root + "/frontend/worker.js"));
app.get("/api/worker/key", (req: Request, res: Response) => res.send(vapidKeys.public));
app.all("/api/worker/subscribe", (req: Request, res: Response) => SubscribeEndpoint(req, res));
app.all("/api/worker/submit", (req: Request, res: Response) => SubmitTokenEndpoint(req, res));
app.all("/api/worker/check", (req: Request, res: Response) => SubscriptionCheckEndpoint(req, res));
app.all("/api/worker/remove", (req: Request, res: Response) => SubscriptionRemoveEndpoint(req, res));

// =========== RSA KEY ENDPOINTS ===========
app.all("/api/rsa/key", (req: Request, res: Response) => RSAPublicKeyEndpoint(req, res));
app.all("/api/rsa/handshake", (req: Request, res: Response) => RSAHandshakeEndpoint(req, res));

// =========== BACKEND API ===========
app.all("/api", (req: Request, res: Response) => ApiInfoEndpoint(req, res));
app.all("/api/login", (req: Request, res: Response) => LoginEndpoint(req, res));
app.all("/api/check", (req: Request, res: Response) => CheckEndpoint(req, res));
app.all("/api/vertretungsplan", (req: Request, res: Response) => VertretungsEndpoint(req, res));
app.all("/api/stundenplan", (req: Request, res: Response) => StundenplanEndpoint(req, res));
app.all("/api/status", (req: Request, res: Response) => StatusEndpoint(req, res));
app.all("/api/moodle/login", (req: Request, res: Response) => MoodleLoginEndpoint(req, res));
app.all("/api/moodle/events", (req: Request, res: Response) => MoodleEventsEndpoint(req, res));
app.all("/api/calendar", (req: Request, res: Response) => CalendarEndpoint(req, res));
app.all("/api/calendar/export", (req: Request, res: Response) => CalendarExportEndpoint(req, res));
app.all("/api/messages", (req: Request, res: Response) => MessagesEndpoint(req, res));
app.get("/api/autologin", (req: Request, res: Response) => AutoLoginEndpoint.get(req, res));
app.post("/api/autologin", (req: Request, res: Response) => AutoLoginEndpoint.post(req, res));
app.all("/api/autologin", (req: Request, res: Response) => AutoLoginEndpoint.other(req, res));

// =========== GENERAL STATUS CODE SITES ===========
app.all("*", (req: Request, res: Response) => res.status(404).json({
    error: true,
    error_message: "404: Not Found"
}));

app.listen(process.env.PORT, () => console.info(consoleTime() + "Started Express app on Port " + process.env.PORT));

const fonts = ["black.otf", "bold.otf", "darkblack.otf", "darkbold.otf", "darkextrabold.otf", "darklight.otf", "darkmedium.otf", "darkregular.otf", "darksemibold.otf", "extrabold.otf", "light.otf", "medium.otf", "regular.otf", "semibold.otf"];
function handleFontRequest(req: Request, res: Response) {
    if (req.path.length > 25)
        return res.status(414).json({ error: true, error_message: "414: URI Too Long" });
    if (!req.path.startsWith("/font/") || !req.path.endsWith(".otf"))
        return res.status(400).json({ error: true, error_message: "Flawed font request issued" });
    const sanatized = path.normalize(req.path).replace(/^(\.\.(\/|\\|$))+/, "");
    if (/\.{2,}/.test(sanatized))
        return res.status(400).json({ error: true, error_message: "Flawed font request issued" });
    const font = sanatized.substring(6);
    if (font.includes("/") || font.includes("\\"))
        return res.status(400).json({ error: true, error_message: "Flawed font request issued" });
    if (!fonts.includes(font))
        return res.status(404).json({ error: true, error_message: "Specified font not found" });
    res.sendFile(path.join(root, "frontend/font", font));
}

export const databaseConnect = () => {
    Database.connect();
}

databaseConnect();
Database.rateLimitCheck();
statusInterval();
startInterval();