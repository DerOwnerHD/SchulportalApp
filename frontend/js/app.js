async function checkForServiceWorkerUpdates() {
    if ("serviceWorker" in navigator) {

        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration)
            return;
            
        await registration.update();
        const check = await makeRequest("worker/check", [], "POST", JSON.stringify({ endpoint: (await registration.pushManager.getSubscription()).endpoint }));
        console.log("Subscription present on server: " + check.subscribed);

        if (!check.subscribed) {
            await registration.unregister();
            setSetting("noServiceWorker", true);
            alert("Leider sind die Benachrichtigungen wegen einer Änderung nicht mehr verfügbar, bitte aktiviere sie erneut!");
        }

    }
}
const keys = {
    token: "",
    session: "",
    id: 0,
    moodle: {
        cookie: "",
        key: ""
    }
}
// Simply for accessing it via the console -> keys is already used
const keys_ = keys;
// After how much of the passed time of the animation, the object should already
// hide because hiding it at the same time may result in some visual glitches
// -> 500ms animation * 95% = 475
const animationHideTimeout = 0.975;

/**
 * 
 * @param {number} duration 
 * @param {string} easing 
 * @param {FillMode} fill
 * @param {number} iterations
 * @returns {KeyframeAnimationOptions} options
 */
function createAnimationProperties(duration, easing, fill, iterations) {
    return {
        duration: duration,
        iterations: iterations || 1,
        easing: easing || "cubic-bezier(0.55, 0.055, 0.675, 0.19)",
        fill: fill || "forwards"
    };
}

function animateElements(elements, frames, options) {
    elements.forEach(element => element.animate(frames, options));
}

function firstLoad() {
    localStorage.setItem("settings", JSON.stringify({ 
        notificationsAsked: false,
        noServiceWorker: false,
        saveUserName: false
    }));
}

addEventListener("orientationchange", orientationChange);

function orientationChange() {
    const orientation = window.orientation;
    const bool = orientation === 0 || orientation === 180;
    $(".no-rotate")[bool ? "hide" : "show"]();
    $(".wrapper")[bool ? "show" : "hide"]();
}

const reloadRequiringCodes = [429, 500, 502];

async function makeRequest(endpoint, headers = [], method = "GET", body) {
    headers.push(["Content-Type", "application/json"])
    const raw = await fetch("/api/" + endpoint, {
            method: method || "GET",
            headers: headers || [],
            body: body || null
        });

    const data = JSON.parse(await raw.text());

    if (raw.status === 401 && endpoint !== "login")
        showForceReloadBox("Anmeldedaten abgelaufen");
    else if (reloadRequiringCodes.includes(raw.status))
        showForceReloadBox(data.error_message || `Unbekannter Fehler (${ raw.status })`);
    
    return { ...data, error_code: raw.status };
}

const numerical = ["Eine", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn", "Elf", "Zwölf"];

const errorFlags = {
    vplan: false,
    splan: false,
    moodle: false,
    calendar: false
}
const apps = {
    vplan: {},
    splan: {},
    moodle: {},
    calendar: {}
}

/**
 * Converts a number to a writable number in German (1 -> "eine", 2 -> "zwei")
 * @param {number} number Any possible integer
 * @returns The converted number or the number itself when x < 1 | x > 12
 */
function numberToNumerical(number) {
    if (number > 12 || number < 1)
        return number;
    return numerical[number - 1];
}

$(".app-tile")
    .on("mousedown", (event) => {
        const target = $(event.target);
        const app = target.closest(".app-tile").attr("type");
        switch (app) {
            case "moodle":
                window.open(`https://mo${keys.id}.schule.hessen.de/my/`, "_blank").focus();
                break;
            case "splan":
                openMenu("splan");
                break;
            case "vplan":
                openMenu("vplan");
                break;
            case "cal":
                openMenu("cal");
                break;
            case "messages":
                openMenu("messages");
                break;
            case "settings":
                openMenu("settings");
                break;
        }
    });

$(".footer")
    .on("mousedown", (event) => {
        openMenu("settings");
    });

function setupAnimationEndTimeout(duration, object, state) {
    setTimeout(() => {
        object.css(state[0], state[1]);
    }, duration * animationHideTimeout);
}

function setupAnimationEndTimeouts(duration, objects, state) {
    setTimeout(() => {
        objects.forEach(object => object.css(state[0], state[1]));
    }, duration * animationHideTimeout);
}

async function loadServiceWorker(reload) {
    if ("serviceWorker" in navigator) {
        try {
            console.log("Requesting permission for notifications");

            if (Notification.permission !== "granted")
                return console.log("Permission wasn't granted");

            if (await navigator.serviceWorker.getRegistration())
                return console.log("Service Worker already exists");

            if (getSetting("noServiceWorker"))
                return console.log("Service Worker not allowed");
            
            const credentials = JSON.parse(localStorage.getItem("credentials"));
            if (!credentials)
                return console.log("User not logged in for Service Worker");

            if (!getSetting("vapidPublicKey"))
                setSetting("vapidPublicKey", await (await fetch("/api/worker/key")).text());
            const vapidPublicKey = getSetting("vapidPublicKey");
            console.log("Registering Service Worker");
            await navigator.serviceWorker.register("/worker.js", { updateViaCache: "imports" });
            navigator.serviceWorker.ready.then(async (registration) => {
                console.log("Service Worker activated");
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidPublicKey
                });

                console.log("Registered " + JSON.stringify(subscription.toJSON()));

                await fetch("/api/worker/subscribe", {
                    method: "POST",
                    body: JSON.stringify({ subscription: subscription, username: getSetting("saveUserName") ? keys.id + "." + credentials.username : null }),
                    headers: [
                        ["content-type", "application/json"]
                    ]
                });

                if (reload)
                    location.reload();
            
            });
        } catch (error) {
            console.error(error);
        }
    } else {
        console.log("Browser doesn't support Service Workers");
    }
}

function showNotificationReminder() {
    const bell = $(".notification-reminder")
        .removeClass("d-none");

    bell[0].animate([
        { transform: "translateY(10rem)" },
        { transform: "translateY(0rem)" }
    ], createAnimationProperties(500));

    setTimeout(() => {
        bell.children("i")
            .before()[0].animate([
                { transform: "rotate(0deg)" },
                { transform: "rotate(-25deg)" },
                { transform: "rotate(0deg)" },
                { transform: "rotate(25deg)" },
                { transform: "rotate(0deg)" }
            ], createAnimationProperties(500, "linear", "auto", 3));
    }, 500);
}

document.addEventListener("mousedown", async (event) => {
    if (event.target.closest(".top-button")?.getAttribute("action") === "notifications-yes") {
        console.log("Requesting!");
        try {
            await Notification.requestPermission();
        } catch (error) {
            console.error(error);
        }
        console.log("GOT BACK: " + Notification.permission);
        loadServiceWorker(true);
    }
});

let notificationReminderOpen = false;
$(".notification-reminder")
    .on("mousedown", () => {
        if (notificationReminderOpen)
            return;
        notificationReminderOpen = true;
        const body = $(".notification-reminder");
        body[0].animate([
            { width: "4rem" },
            { width: "calc(100vw - 2rem)" }
        ], createAnimationProperties(700));

        body.children("i")[0].animate([
            { opacity: 1, transform: "rotate(0deg)" },
            { opacity: 0, transform: "rotate(100deg)" }
        ], createAnimationProperties(300, null, "auto"));

        setupAnimationEndTimeout(300, body.children("i:first-child"), ["display", "none"]);
        setupAnimationEndTimeout(700, body, ["width", "calc(100vw - 2rem)"]);

        setTimeout(() => {
            body.children(".top-button")
                .removeClass("d-none")
                .each((index, element) => {
                    element.animate([
                        { opacity: 0 },
                        { opacity: 1 }
                    ], createAnimationProperties(400));
                });
            body.children("p")
                .removeClass("d-none")[0].animate([
                    { opacity: 0 },
                    { opacity: 1 }
                ], createAnimationProperties(400));

            setupAnimationEndTimeouts(400, [body.children(".top-button"), body.children("p")], ["opacity", "1"]);

            $(".notification-reminder .top-button")
                .on("mousedown", async (event) => {
                    setSetting("notificationsAsked", true);
                    body.children(".top-button")
                        .hide();
                    body.children("p")
                        .html("Okay!")
                        .removeClass("d-none")[0].animate([
                            { opacity: 1 },
                            { opacity: 0 }
                        ], createAnimationProperties(400));

                    setupAnimationEndTimeout(400, body.children("p"), ["display", "none"]);

                    setTimeout(() => {
                        body[0].animate([
                            { width: "calc(100vw - 2rem)" },
                            { width: "4rem" }
                        ], createAnimationProperties(700));

                        body.children("i:first-child")
                            .css("display", "unset")
                            .css("transform", "rotate(0)")[0].animate([
                                { opacity: 0 },
                                { opacity: 1 }
                            ], createAnimationProperties(700));

                        setupAnimationEndTimeout(700, body, ["width", "4rem"]);

                        setTimeout(() => {
                            body[0].animate([
                                { transform: "translateY(0rem)" },
                                { transform: "translateY(10rem)" }
                            ], createAnimationProperties(500));
                            setupAnimationEndTimeout(500, body, ["display", "none"]);
                        }, 700);
                    }, 300);
                });
        }, 600);
    });

function setSetting(key, value) {
    const settings = JSON.parse(localStorage.getItem("settings"));
    settings[key] = value;
    localStorage.setItem("settings", JSON.stringify(settings));
}

function getSetting(key) {
    const settings = JSON.parse(localStorage.getItem("settings"));
    return settings[key];
}

/**
 * Removes the Service Worker from the site
 * @param {boolean} keepRemoved Whether it should be loaded again on reload or not 
 */
async function removeServiceWorker(keepRemoved) {
    if ("serviceWorker" in navigator) {
        // This will force the Service Worker to be removed
        // and with a later reload of the page, it will be added
        // back in again
        const registration = await navigator.serviceWorker.getRegistration();
        await makeRequest("worker/remove", [], "POST", JSON.stringify({ endpoint: (await registration.pushManager.getSubscription()).endpoint }));
        await registration.unregister();
        if (keepRemoved)
            setSetting("noServiceWorker", true);
        location.reload();
    }
}

function showForceReloadBox(message) {
    const element = document.querySelector(".force-reload-box");

    if (!element.classList.contains("d-none"))
        return;

    $(element).children("p").html(message);

    element.classList.remove("d-none");
    element.animate([
        { transform: "translateY(8rem)" },
        { transform: "translateY(0rem)" }
    ], createAnimationProperties(500));
}

/**
 * Waits for a given amount of milliseconds
 * @param {number} time Amount of ms 
 * @returns The promise to wait for
 */
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}