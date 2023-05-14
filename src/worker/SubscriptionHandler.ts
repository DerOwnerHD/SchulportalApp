import { consoleTime } from "..";
import { isConnected, subscriptions } from "../database/Database";
import * as webPush from "web-push";

const duration = 60000;
let initalized = false;

export function startInterval() {

    if (initalized)
        return console.error(consoleTime() + "SubscriptionHandler#startInterval called twice");

    console.log(consoleTime() + "SubscriptionHandler#startInterval loaded");

    setInterval(async () => {

        console.log(consoleTime() + "🌎 Checking plans of Subscriptions");

        if (!isConnected)
            return console.error(consoleTime() + "❌ Can't check because the Database isn't connected");

        let index = 0;
        const tokens = await subscriptions.find({}).toArray();
        console.log(consoleTime() + `🔔 ${ tokens.length } Subscription(s) present`);
        if (tokens.length === 0)
            return;
        const interval = setInterval(async () => {

            console.log(consoleTime() + "- Subscription " + (index + 1));

            if (index === tokens.length - 1)
                clearInterval(interval);

            // @ts-ignore these exist in the Document (trust me)
            const { endpoint, keys, vertretungen, token, requestedToken } = tokens[index];

            if (!token) {
                console.error(consoleTime() + "❌ No token present on Subscription " + (index + 1) + (requestedToken ? ", but already requested token" : ""));
                if (token === "" && !requestedToken) {
                    console.log(consoleTime() + "⏳ Requesting token from Subscription...");
                    await webPush.sendNotification({ endpoint, keys }, JSON.stringify({ operation: "submitToken", timestamp: Date.now() }))
                        .catch(async (error) => {
                            if (error.statusCode === 410)
                                await subscriptions.findOneAndDelete({ endpoint: endpoint });
                            console.error(consoleTime() + "❌ Subscription " + (index + 1) + " failed with code " + error.statusCode);
                        });
                    await subscriptions.updateOne({ endpoint: endpoint }, { $set: { token: token, requestedToken: true } });
                }
                index++;
                return;
            }

            const check = await fetch("https://start.schulportal.hessen.de/startseite.php", {
                headers: [ [ "cookie", "sid=" + token ] ],
                redirect: "manual"
            });

            if (check.status === 302) {
                await webPush.sendNotification({ endpoint, keys }, JSON.stringify({ operation: "submitToken", timestamp: Date.now() }))
                    .catch(async (error) => {
                        if (error.statusCode === 410)
                            await subscriptions.findOneAndDelete({ endpoint: endpoint });
                        console.error(consoleTime() + "❌ Subscription " + (index + 1) + " failed with code " + error.statusCode);
                    });
                console.error(consoleTime() + "❌ Token expired on Subscription " + (index + 1));
                index++;
                await subscriptions.updateOne({ endpoint: endpoint }, { $set: { token: "", requestedToken: true } });
                return;
            }
            
            const plan = await (await fetch(`http://localhost:${ process.env.PORT }/api/vertretungsplan`, {
                headers: [ [ "authorization", token ] ]
            })).json();

            if (plan.error) {
                console.error(consoleTime() + "❌ Couldn't fetch plan for Subscription " + (index + 1));
                index++;
                return;
            }

            await subscriptions.updateOne({ endpoint: endpoint }, { $set: { vertretungen: plan } });

            const diffs = {}
            let string = "";

            let changed = false;
            await (async () => {

                // PART I: Only new one is avaliable
                if (!vertretungen) { // An old value didn't exist
                    plan.days.forEach((day) => {
                        const strings = [];
                        day.vertretungen.forEach((vertretung) => {
                            const { lesson, substitute, subject, room, note} = vertretung;
                            strings.push(`・ ${ addDotsToLesson(lesson) } Stunde: ${!substitute ? "Ausfall" : "Vertretung"} in ${ subject || "unbekannt" }${substitute ? ` bei ${ substitute || "unbekannt" }`: ""}${room ? ` in Raum ${ room || "unbekannt" }` : ""}${ note ? ` (${note})` : "" }`);
                        });
                        diffs[day.clean] = strings;
                    });
                }

                // PART II: Both avaliable, comparison needed
                else {
                    try {
                        if (vertretungen.last_updated === plan.last_updated)
                            return console.log(consoleTime() + "❌ The plan didn't change for Subscription " + (index + 1));
                            
                        // PART II.I: Check for new things
                        plan.days.forEach((day) => {
                            // This would match 01_01_2000 to 01_01_2000 for example
                            const old = vertretungen.days.find(x => x.raw === day.raw);
                            if (!old)
                                return;
                            if (JSON.stringify(old.vertretungen) !== JSON.stringify(day.vertretungen))
                                changed = true;
                            const strings = [];
                            day.vertretungen.forEach((vertretung) => {
                                const { lesson, substitute, subject, room, note} = vertretung;
                                // We're only interested in stuff which occurs at the same lesson and has the same subject
                                const oldVertretung = old.vertretungen.find(x => x.lesson === lesson && x.subject === subject);
                                // Still the same stuff, check all other properties
                                // to test if something else has changed
                                if (oldVertretung) {
                                    // This has a few checks:
                                    // - is there any change about the substitute?
                                    // => if not nothing has changed about the situation
                                    // else we know the thing has been flipped
                                    const ausfallString = !oldVertretung.substitute === !substitute ? !substitute ? "Ausfall" : "Vertretung" : !substitute ? "Ausfall (vorher Vertretung)" : "Vertretung (vorher Ausfall)";

                                    // This only checks if the substitute
                                    // teacher has been changed
                                    const substituteString = oldVertretung.substitute === substitute ? (substitute || "unbekannt") : `${ substitute || "unbekannt" } (vorher ${ oldVertretung.substitute || "unbekannt" })`;

                                    const roomString = oldVertretung.room === room ? (room || "unbekannt") : `${ room || "unbekannt" } (vorher ${ oldVertretung.room || "unbekannt" })`;

                                    strings.push(`・ ${ addDotsToLesson(lesson) } Stunde: ${ ausfallString } in ${ subject || "unbekannt" }${substitute ? ` bei ${ substituteString }`: ""}${room ? ` in Raum ${ roomString }` : ""}${ note ? ` (${note})` : "" }`);

                                } else { // This is a new object: Show all properties as if they were new

                                    strings.push(`・ ${ addDotsToLesson(lesson) } Stunde: ${!substitute ? "Ausfall" : "Vertretung"} in ${ subject || "unbekannt" }${substitute ? ` bei ${ substitute || "unbekannt" }`: ""}${room ? ` in Raum ${ room || "unbekannt" }` : ""}${ note ? ` (${note})` : "" }`);

                                }
                            });
                            diffs[day.clean] = strings;
                        });
                        // PART II.II: Check for old things that could have fallen away
                        vertretungen.days.forEach((day) => {
                            const strings = [];
                            const newDay = plan.days.find(x => x.raw === day.raw);
                            if (!newDay)
                                return;

                            if (JSON.stringify(newDay.vertretungen) !== JSON.stringify(day.vertretungen))
                                changed = true;

                            day.vertretungen.forEach((vertretung) => {
                                const { lesson, substitute, subject, room, note} = vertretung;
                                const newVertretung = newDay.vertretungen.find(x => x.lesson === lesson && x.subject === subject);
                                // If the vertretung still exists there's no need for it here
                                // as this only checks for things that have fallen away
                                if (newVertretung)
                                    return;

                                strings.push(`・ ${ addDotsToLesson(lesson) } Stunde: [WEGGEFALLEN] ${!substitute ? "Ausfall" : "Vertretung"} in ${ subject || "unbekannt" }${substitute ? ` bei ${ substitute || "unbekannt" }`: ""}${room ? ` in Raum ${ room || "unbekannt" }` : ""}${ note ? ` (${note})` : "" }`);

                            });

                            diffs[day.clean] = [...diffs[day.clean], ...strings];
                        });

                        if (!changed)
                            return console.error(consoleTime() + "❌ No new data for Subscription " + (index + 1));
                            
                    } catch (error) {
                        console.error(error);
                    }
                }

                for (const date of Object.keys(diffs)) {
                    string += date + ":\n" + (diffs[date].length ? diffs[date].join("\n") : "・ Keine Vertretungen 😢\n") + "\n";
                };

                string += "Aktualisiert am " + plan.last_updated;
                
                await webPush.sendNotification({ endpoint, keys }, JSON.stringify({ operation: "vplan", timestamp: Date.now(), text: string }))
                    .catch(async (error) => {
                        if (error.statusCode === 410)
                            await subscriptions.findOneAndDelete({ endpoint: endpoint });
                        console.error(consoleTime() + "❌ Subscription " + (index + 1) + " failed with code " + error.statusCode);
                    });
                console.log(consoleTime() + "✅ Sent data to Subscription " + (index + 1));

                return;

            })();

            index++;

        }, duration / (tokens.length + 1));

    }, duration);

    initalized = true;

}

function addDotsToLesson(lesson: string) {
    return lesson.split(" - ").map(x => { return x + "." }).join(" - ");
}