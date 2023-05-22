import { Collection, Db, MongoClient } from "mongodb";
import { consoleTime, databaseConnect, isWindows } from ".";
import { spawn } from "node:child_process";

export let isConnected = false;
export let client: MongoClient = null;
export let db: Db = null;
export let subscriptions: Collection<Document> = null;

export default {
    /**
     * Attempts to connect the client to either a locally hosted
     * MongoDB Server instance or the Database defined in the
     * ENVs as DATABASE_URL, most likely a Atlas DB. If that
     * isn't sucessful, the process is repeated until it
     * eventually is.
     */
    connect: async () => {
        try {
            console.log(consoleTime() + "Attempting to connect to Database...");
            const startTime = Date.now();
            // This indicates that Node is running on the
            // localhost so it can connect to local database
            client = new MongoClient(isWindows() ? "mongodb://127.0.0.1:27017" : process.env.DATABASE_URL);
            await client.connect();
            console.info(consoleTime() + "Connected to database in " + (Date.now() - startTime) + "ms");
            isConnected = true;
            db = client.db("schulportal");
            subscriptions = db.collection("subscriptions");
        } catch (error) {
            console.error(error);
            console.log(consoleTime() + "Re-attempting connection in 10 seconds...");
            setTimeout(() => { databaseConnect(); }, 10000);
        }
    },
    /**
     * This function handles a possible rate limiting by
     * MongoDB Atlas by checking if the URL is findable.
     * If it isn't the client has to have recieved a rate
     * limit and thus requires a full reset on Replit.
     */
    rateLimitCheck: () => {
        setInterval(async () => {

            try {
                await fetch(process.env.DATABASE_SHARD);
            } catch (error) {
                if (error.cause?.code === "UND_ERR_CONNECT_TIMEOUT")
                    return;
                console.error(error);
                if (isWindows())
                    return;
                spawn("kill", [ "1" ]);
            }

        }, 60000);
    }
}