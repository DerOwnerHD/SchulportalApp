function generateUUID() {
    let date = new Date().getTime();
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        date += performance.now();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-xxxxxx3xx".replace(/[xy]/g, function (char) {
        const random = (date + Math.random() * 16) % 16 | 0;
        date = Math.floor(date / 16);
        return (char === "x" ? random : (random & 0x3 | 0x8)).toString(16);
    });
}

async function generateRSAKey() {
    await new Promise(async (resolve, reject) => {
        if (!("jCryption" in $)) {
            reject();
            return console.error("jCryption isn't loaded!");
        }
        const password = $.jCryption.encrypt(generateUUID(), generateUUID());
        $.jCryption.authenticate(password, "api/rsa/key", "api/rsa/handshake", (key) => {
            setSetting("rsakey", key);
            resolve();
        }, () => { 
            console.error("Couldn't generate RSA key");
            reject();
        });
    });

    //$(".menu[type=messages] .main-wrapper").html(getSetting("rsakey"));
    
}

function copyRSAKey() {
    const key = getSetting("rsakey");
    if (!key)
        return;
    navigator.clipboard.writeText(key);
}

$(".menu[type=messages] .messages-selector .selector").on("mousedown", (event) => {
    if (event.target.classList.contains("selected"))
        return;
    $(".messages-selector .selector").each((index, element) => {
        element.classList[element.classList.contains("selected") ? "remove" : "add"]("selected");
    });

    $(event.target).text() === "Moodle" ? loadMoodleMessages() : loadSchulportalMesssages();
});

function loadMoodleMessages() {

}

function loadSchulportalMesssages() {
    $(".messages-browser").html("Not avaliable");
}