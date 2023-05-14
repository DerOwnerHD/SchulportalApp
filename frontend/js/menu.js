/**
 * Contains all code responsible for handling menus
 * and their opening/closing as well as button presses 
 * inside them
 * 
 * Functions: openMenu, closeMenu
 * Objects: menus
 */
const menus = {
    open: [],
    submenu: [],
    animationRunning: [],
    disabled: []
};

function openMenu(type) {
    if (menus["open"].includes(type) || menus["disabled"].includes(type))
        return;
    menus["open"].push(type);
    menus["animationRunning"].push(type);
    const menu = $(".menu[type=" + type + "]").removeClass("d-none");
    $(".menu-wrapper").show();

    // This area contains exceptions and
    // special handlings for some menus
    if (type === "vplan")
        menu.css("height", getVplanMenuHeight());
    else if (type === "settings")
        buildSettingsHomePage();

    menu[0].animate([
        { transform: "translateY(" + menu.height() + "px)" },
        { transform: "translateY(0px)" }
    ], createAnimationProperties(500));

    setTimeout(() => {
        menus["animationRunning"].splice(menus["animationRunning"].indexOf(type), 1);
    }, 500 * animationHideTimeout);
}

// Handles a event when pressing a close-button on a menu
$(".menu .close-button").on("mousedown", (event) => {
    const target = $(event.target);
    const menu = target.closest(".menu");
    if (menus["animationRunning"].includes(menu.attr("type")))
        return;
    closeMenu(menu.attr("type"), true);
});

/**
 * Closes a menu of the given type
 * @param {string} type The ID of the menu to be closed 
 * @param {boolean} button Whether the menu was closed using a button
 * @returns 
 */
function closeMenu(type, button) {
    if (!type || !menus["open"].includes(type) || menus["animationRunning"].includes(type))
        return;
    const menu = $(".menu[type=" + type + "]");
    menus["animationRunning"].push("type");
    menus["open"].splice(menus["open"].indexOf(type), 1);
    switch (type) {
        case "login": {
            if (!button)
                break;
            setProgressBoxText("Login unterbrochen");
            closeMenu("login-help");
            setTimeout(() => promptLogin(), 2000);
            break;
        }
        case "vplan": {
            closeMenu("vplan-news");
            break;
        }
        case "settings": {
            setTimeout(() => { clearSettingsMenu(); }, 500);
            $(".menu[type=settings] .top-button[action=back]").addClass("d-none");
            break;
        }
        case "cal": {
            $(".calendar-search").addClass("d-none");
            closeMenu("cal-export");
            break;
        }
        case "splan": {
            $(".lesson-plan tr, .lesson-plan .lesson").removeClass("hovered");
            break;
        }
    }
    menu[0].animate([
        { transform: "translateY(0px)" },
        { transform: "translateY(" + menu.height() + "px)" }
    ], createAnimationProperties(500));

    setTimeout(() => {
        menu.addClass("d-none");
        menus["animationRunning"].splice(menus["animationRunning"].indexOf(type), 1);
        // This is just meant to test if
        // any menu still remains open
        let hidden = true;
        $(".menu").each((index, element) => {
            if (!element.classList.contains("d-none"))
                hidden = false;
        });
        if (hidden)
            $(".menu-wrapper").hide();
    }, 500 * animationHideTimeout);
}