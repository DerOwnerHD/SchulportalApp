let appTileTouchTimer;
let dropdownOpenInProgress = false;
let dropdownOpen = false;
// Handles longer presses on app tiles
$(".app-tile").on("touchstart", (event) => {
    appTileTouchTimer = setTimeout(() => {
        dropdownOpenInProgress = true;
        const tile = $(event.target).closest(".app-tile");
        const overlay = tile.children(".app-tile-overlay");
        const properties = createAnimationProperties(300, null, "none");
        overlay[0].animate([{
                opacity: 0
            },
            {
                opacity: 1
            }
        ], properties);
        tile[0].animate([{
                transform: "scale(100%)"
            },
            {
                transform: "scale(97%)"
            }
        ], properties);
        setTimeout(() => {
            tile.css("transform", "scale(97%)");
            overlay.css("opacity", "1");
            tile[0].animate([{
                    transform: "scale(97%)"
                },
                {
                    transform: "scale(100%)"
                }
            ], properties);
            setTimeout(() => {
                tile.css("transform", "scale(100%)");
                overlay.css("opacity", "0");
                openAppDropdown(tile.attr("type"));
            }, 300 * animationHideTimeout);
        }, 300 * animationHideTimeout);
    }, 300);
}).on("touchend", (event) => {
    clearTimeout(appTileTouchTimer);
    $(event.target).closest(".app-tile").css("transform", "scale(100%)")
        .children(".app-tile-overlay").css("opacity", 0);
    dropdownOpenInProgress = false;
});

function openAppDropdown(type) {
    const tile = $(".app-tile[type=" + type + "]");
    if (!tile.length || dropdownOpen || !dropdownOpenInProgress)
        return;
    $(".app-tile-container").css("overflow-y", "hidden");
    dropdownOpen = true;
    const { top, left } = tile.position();
    $(".app-tile-dropdown-wrapper").append(`
        <div class="app-tile-dropdown" type="${type}" style="top:${top + 5}px;left:${left}px">
            <div class="top-wrapper">${tile.html()}</div>
            <div class="main-wrapper"></div>
        </div>
    `).removeClass("d-none");

    $(".app-tile-dropdown-background")[0].animate([
        { opacity: 0 },
        { opacity: 1 }
    ], createAnimationProperties(400));

    $(".app-tile-container").css("overflow-y", "hidden");

    const dropdown = $(".app-tile-dropdown[type=" + type + "]");
    const content = dropdown.children(".main-wrapper").css("opacity", "1");

    switch (type) {
        case "moodle": {
            if (!apps.moodle.events.length)
                content.html("<p>Keine Abgaben gefunden</p>");

            apps.moodle.events.forEach((event, index) => {

                if (index >= 2 && apps.moodle.events.length > 3) {
                    if (index !== apps.moodle.events.length - 1)
                        return;
                    // This only gets triggered if this is the last one   
                    content.append(`
                        <div class="app-tile-dropdown-element">
                            <p>${ apps.moodle.events.length - 2 } weitere Abgaben...</p>
                        </div>
                    `);
                    return;
                }

                content.append(`
                    <div class="app-tile-dropdown-element">
                        <img src="https://mo${keys.id}.schule.hessen.de/theme/image.php/hla/assign/1678975974/icon">
                        <p>${event.name.replace("Abgabe ", "").replace(" ist fällig.", "")} <small>${event.course.shortname}</small>
                        <div class="top-button" onclick="window.open('${event.action.url}', '_blank').focus()">
                            <i class="fa-solid fa-up-right-from-square"></i>
                        </div>
                    </div>
                `);

            });

            break;
        }
        case "cal": {
            content.html(`
                <div class="app-tile-dropdown-element">
                    <p>Normalen Kalender öffnen</p>
                    <div class="top-button" onclick="window.open('https://start.schulportal.hessen.de/kalender.php', '_blank').focus()">
                        <i class="fa-solid fa-up-right-from-square"></i>
                    </div>
                </div>
            `);
            break;
        }
        case "messages": {
            content.html(`
                <div class="app-tile-dropdown-element">
                    <p>AES-Key kopieren</p>
                    <div class="top-button" onclick="copyRSAKey();">
                        <i class="fa-regular fa-clipboard"></i>
                    </div>
                </div>
            `);
            break;
        }
        default:
            content.html("<p>Keine Optionen</p>");
    }

    content[0].animate([
        { transform: `translateY(calc(-${content.height()}px))`, opacity: 0 },
        { transform: "translateY(0px)", opacity: 1 }
    ], createAnimationProperties(400));

    setupAnimationEndTimeout(400, content, ["transform", `translateY(0px)`]);
    setupAnimationEndTimeout(400, content, ["opacity", `1`]);
    setupAnimationEndTimeout(400, $(".app-tile-dropdown-background"), ["opacity", 1]);

    dropdownOpenInProgress = false;

}

// Close the dropdown menu
$(".app-tile-dropdown-background").on("mousedown", () => {

    // Can't close a menu if it isn't open...
    if (!dropdownOpen)
        return;

    $(".app-tile-dropdown-background")[0].animate([
        { opacity: 1 },
        { opacity: 0 }
    ], createAnimationProperties(400));

    $(".app-tile-dropdown .main-wrapper")[0].animate([
        { transform: "translateY(0px)" },
        { transform: `translateY(calc(-${$(".app-tile-dropdown .main-wrapper").height()}px - 1rem))` }
    ], createAnimationProperties(400));

    setTimeout(() => {
        $(".app-tile-dropdown-wrapper").addClass("d-none").children(".app-tile-dropdown").remove();
        $(".app-tile-container").css("overflow-y", "auto");
    }, 400 * animationHideTimeout);

    dropdownOpen = false;

});

$(".app-tile-container").on("scroll", () => {
    clearTimeout(appTileTouchTimer);
});