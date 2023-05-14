/**
 * This file contains all operations for the login
 * procedure of a user in the SchulportalApp
 * 
 * Functions: handleIDUpdate, checkLogin, setProgressBoxText, promptLogin, loadUserData, showElements
 * Objects: <none>
 */

/**
 * Modifies all elements which require the ID using the given ID.
 * This is usually called at login sucess or sucessful automatic login
 * @param {number} id ID of the insitution (school)
 */
function handleIDUpdate(id) {
    keys.id = id;
    $(".background .image")
        .css("background-image", `url("https://start.schulportal.hessen.de/exporteur.php?a=schoolbg&i=${id}&s=lg")`)
        .removeClass("generic");
}

/**
 * This function handles the previously saved credentials from the
 * local storage and attempts a login using them.
 */
async function checkLogin() {
    const credentials = localStorage.getItem("credentials");
    if (!credentials) // Credentials don't exist in the local storage => prompt first time login
        return promptLogin();
    const parsedCredentials = JSON.parse(credentials);
    if (parsedCredentials.id) // If there are credentials saved, update the background accordingly
        handleIDUpdate(parsedCredentials.id);
    setProgressBoxText("Anmeldung wird versucht");
    const response = await makeRequest("login", [], "POST", credentials);
    if (reloadRequiringCodes.includes(response.error_code))
        return setProgressBoxText("Bitte lade die Seite neu", "Das Schulportal ist nicht erreichbar");
    if (response.error) // This indicated invalid login data already stored => prompt reauth login
        return promptLogin(true);
    setProgressBoxText("Anmeldung erfolgreich", "Key: " + response.token, true);
    // Both these values are directly included in the response
    keys.token = response.token;
    keys.session = response.session;
    setTimeout(() => loadUserData(), 1000);
}

/**
 * Modifies the progress box used during login procedure
 * @param {string} text The text for the main text 
 * @param {string} sub The text for the subtitle (if null -> no subtitle visible)
 * @param {boolean} sucess Determines whether the sucess GIF should be shown
 */
function setProgressBoxText(text, sub, sucess) {
    $(".progress-box p").html(text || "");
    $(".progress-box small").html(sub || "");
    $(".progress-box img")
        .attr("src", `https://derownerhd.github.io/skyblock/${sucess ? "done" : "loading"}.gif`);
}

/**
 * Shows the login dialog to a user
 * @param {boolean} state Whether the user is prompted to reaffirm their credentials 
 */
function promptLogin(state) { // A true state occurs when the user HAS credentials but they seem invalid
    setProgressBoxText(state ? "Überprüfe deine Daten" : "Warte auf Login", state ? "Irgendetwas stimmt nicht" : "");
    openMenu("login");
}

const userLoadingElements = [
    { name: "Vertretungsplan", status: null },
    { name: "Stundenplan", status: null },
    { name: "Kalender", status: null },
    { name: "Nachrichten", status: null },
    { name: "Abgaben", status: null },
];
/**
 * Updates a element in the progress box
 * @param {string} name
 * @param {"DONE" | "ERROR"} status
 */
function updateUserDataLoadingText(name, status) {
    const element = userLoadingElements.find((x) => { return x.name === name });
    if (!element)
        return;
    element.status = status;
    let text = "";
    let anythingUndone = false;
    userLoadingElements.forEach((element) => { 
        text += `${ element.name }${ element.status === "DONE" ? " ✔" : element.status === "ERROR" ? " ✖" : "" }<br>`;
        if (element.status === null)
            anythingUndone = true;
    });

    setProgressBoxText("Lade Nutzerdaten", text);

    if (anythingUndone)
        return; 

    setTimeout(() => {
        setProgressBoxText("Nutzerdaten geladen", "", true);
        processUserData();
    }, 100);
    
}

// Handles the action once a user
// pressed on the login button on the screen
$(".menu[type=login] .button[action=login]").on("mousedown", async () => {

    $(".menu[type=login] input").attr("disabled", "");

    const username = $(".menu[type=login] input[name=username]").val();
    const id = parseInt($(".menu[type=login] input[name=id]").val() || 1);
    const password = $(".menu[type=login] input[name=password]").val();
    if (!username || !id || !password || id > 9999 || id < 1) {
        $(".menu[type=login] input").removeAttr("disabled");
        return setProgressBoxText("Ungültige Eingabe");
    }

    setProgressBoxText("Anmeldung wird versucht")
    const dataAsString = JSON.stringify({
        username: username,
        password: password,
        id: id
    });

    const response = await makeRequest("login", [], "POST", dataAsString);
    if (reloadRequiringCodes.includes(response.error_code))
        return setProgressBoxText("Bitte lade die Seite neu", "Das Schulportal ist nicht erreichbar");
    
    if (response.error) {
        $(".menu[type=login] input").removeAttr("disabled");
        return setProgressBoxText("Anmeldedaten falsch");
    }

    localStorage.setItem("credentials", dataAsString);
    setProgressBoxText("Anmeldung erfolgreich", "Key: " + response.token, true);
    handleIDUpdate(id);
    keys.token = response.token;
    keys.session = response.session;
    closeMenu("login");
    closeMenu("login-help");
    setTimeout(() => loadUserData(), 2000);
});

/**
 * Attempts to load all user data from Schulportal.
 * This includes vplan, splan and Moodle
 */
async function loadUserData() {
    const headers = [
        ["authorization", keys.token]
    ];
    setProgressBoxText("Lade Nutzerdaten", "Vertretungsplan<br>Stundenplan<br>Kalendar<br>Nachrichten<br>Abgaben");
    const credentials = JSON.parse(localStorage.getItem("credentials"));
    workerChannel.postMessage({ type: "credentials", data: credentials });
    (async () => {
        const vplan = await makeRequest("vertretungsplan", [...headers, ["x-no-subject-old", ""]], "GET");
        if (vplan.error) {
            errorFlags.vplan = true;
            updateUserDataLoadingText("Vertretungsplan", "ERROR");
        } else {
            updateUserDataLoadingText("Vertretungsplan", "DONE");
            apps.vplan.days = vplan.days;
            apps.vplan.last_updated = vplan.last_updated;
        }
    })();
    (async () => {
        const splan = await makeRequest("stundenplan", headers, "GET");
        if (splan.error) {
            errorFlags.splan = true;
            updateUserDataLoadingText("Stundenplan", "ERROR");
        } else {
            apps.splan = { ...apps.splan, ...splan };
            loadSplan();
            updateUserDataLoadingText("Stundenplan", "DONE");
        }
    })();
    (async () => {
        await initCalendar();
        updateUserDataLoadingText("Kalender", "DONE");
    })();
    (async () => {
        await generateRSAKey();
        updateUserDataLoadingText("Nachrichten", "DONE");
    })();
    (async () => {
        const moodleCredentials = await makeRequest("moodle/login", [], "POST", JSON.stringify({
            session: keys.session,
            id: keys.id
        }));
        if (!moodleCredentials.error) {
            keys.moodle.cookie = moodleCredentials.cookie;
            keys.moodle.key = moodleCredentials.key;
            const moodleEvents = await makeRequest("moodle/events", [], "POST", JSON.stringify({
                cookie: keys.moodle.cookie,
                key: keys.moodle.key,
                id: keys.id
            }));
            if (reloadRequiringCodes.includes(moodleEvents.error_code))
                updateUserDataLoadingText("Nachrichten", "ERROR");
            apps.moodle.events = moodleEvents.events;
            updateUserDataLoadingText("Abgaben", "DONE");
        } else {
            errorFlags.moodle = true;
            if (reloadRequiringCodes.includes(moodleCredentials.error_code))
                return updateUserDataLoadingText("Abgaben", "ERROR");
        }
    })();

}

function processUserData() {
    $(".app-tile").each((index, element) => {
        const type = element.getAttribute("type");
        const newsWrapper = $(".app-tile[type=" + type + "] .app-tile-news-wrapper");
        if (errorFlags["type"])
            return newsWrapper.html('<div class="app-tile-news">Fehler beim Laden</div>');

        switch (type) {
            case "moodle": {
                const warning = '<i class="fa-solid fa-triangle-exclamation"></i> ';
                const length = apps.moodle.events.length;
                const string = length ? length === 1 ? warning + "Eine Abgabe offen" : warning + length + " Abgaben offen" : "Keine Abgaben";
                newsWrapper.html(`<div class="app-tile-news">${string}</div>`);
                break;
            }
            case "splan": {
                if (apps.splan.plans.length === 1)
                    newsWrapper.html('<div class="app-tile-news">Kein neuer Plan</div>');
                else {
                    const { start_date } = apps.splan.plans[1];
                    const date = new Date(start_date);
                    newsWrapper.html(`<div class="app-tile-news">Neuer Plan ab ${ date.getDate() }. ${ monthNames[date.getMonth()] }</div>`)
                }
                break;
            }
            case "vplan": {
                if (apps.vplan.days.length === 0) {
                    newsWrapper.append("<div class='app-tile-news'><i class='fa-solid fa-hourglass-half'></i> Plan wird aktualisiert</div>");
                    menus["disabled"].push("vplan");
                    break;
                }
                apps.vplan.days.forEach((day) => {
                    const subjects = [];
                    for (const lesson of day.vertretungen) {
                        if (subjects.includes(lesson.subject) || subjects.includes(lesson.subject_old))
                            continue;
                        subjects.push(lesson.subject || lesson.subject_old);
                    }
                    newsWrapper.append(`<div class="app-tile-news">${ subjects.join(", ") || "Nichts" }</div>`)
                });
                apps.vplan.selectedDay = 0;
                const data = apps.vplan.days[0];
                for (let i = 0; i < apps.vplan.days.length; i++)
                    $(".menu[type=vplan] .day:nth-child(" + (i + 1) + ") .title").html(apps.vplan.days[i].clean.substring(0, 2) + " <small>" + apps.vplan.days[i].raw.substring(0, 6).replaceAll("_", "."));
                $(".menu[type=vplan] .top-button.extended[action=relative] .text").html(data.relative);
                $(".menu[type=vplan] .top-button.extended[action=news] .text").html(data.news.length);
                $(".menu[type=vplan] .top-button.extended[action=last-refreshed] .text").html(apps.vplan.last_updated);
                vplanReplaceData();
                break;
            }
            case "cal": {
                const { year, month, months } = apps.calendar;
                const eventsInMonth = months[year + "-" + month];
                if (!months || !eventsInMonth) {
                    newsWrapper.children(".app-tile-news").html("Fehler beim Laden")
                    break;
                }
                    
                newsWrapper.children(".app-tile-news").html(`${ eventsInMonth.length } Termin${ eventsInMonth.length === 1 ? "" : "e" } im ${ monthNames[month] }`)
            }
        }

    });

    setTimeout(() => {
        $(".progress-box")[0].animate([
            { opacity: 1 },
            { opacity: 0 }
        ], createAnimationProperties(500));

        setTimeout(() => {
            $(".progress-box").hide();
            showElements();
        }, 500 * animationHideTimeout);
    }, 500);
}

/**
 * Fades in the App Tiles on login
 */
function showElements() {

    $(".app-tile-container").removeClass("d-none");
    const appTiles = $(".app-tile").css("opacity", "0");
    let index = 0;

    setTimeout(() => {
        $(".footer").removeClass("d-none")[0].animate([
            { opacity: 0 },
            { opacity: 1 }
        ], createAnimationProperties(300));
        setTimeout(async () => {
            if (
                "serviceWorker" in navigator &&
                !getSetting("notificationsAsked") &&
                !getSetting("noServiceWorker") &&
                !(await navigator.serviceWorker.getRegistration()) 
            )
                showNotificationReminder();
        }, 500);
    }, 300 * (appTiles.length + 1));

    const tileInterval = setInterval(() => {
        appTiles[index].animate([
            { opacity: 0 },
            { opacity: 1 }
        ], createAnimationProperties(300));
        if (index === appTiles.length - 1)
            return clearInterval(tileInterval);
        index++;
    }, 250);
}