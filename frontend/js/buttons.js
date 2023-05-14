$(".menu .top-button").on("mousedown", (event) => {
    const target = $(event.target);
    // The action the button should perform
    const button = target.closest(".top-button");
    const action = button.attr("action");
    // The type of menu we're dealing with
    const menu = target.closest(".menu");
    const type = menu.attr("type");

    if (menus["submenu"].includes(type) || menus["animationRunning"].includes(type))
        return;

    switch (type) {
        case "login": {
            if (action === "help") {
                if (!$(".menu[type=login-help]").hasClass("d-none"))
                    break;
                openMenu("login-help");
            } else if (action === "password-visibility") {
                // Password visibility toggle
                const active = button[0].hasAttribute("active");
                button.children("i").removeClass(active ? "fa-eye" : "fa-eye-slash").addClass(active ? "fa-eye-slash" : "fa-eye");
                button[active ? "removeAttr" : "attr"]("active", "");
                $(".menu[type=login] input[name=password]").attr("type", active ? "password" : "");
            }
            break;
        } 
        case "vplan": {

            // None of the actions can happen while that menu is opened up
            if (menus["open"].includes("vplan-news"))
                return;
            
            if (action === "news") {
                openMenu("vplan-news");
            }

            else if (action === "switch") {
                
                switchVplanDay(menu);

            }
            break;
        }
        case "cal": {
        
            if (action === "export") {
                loadCalendarExport();
            }

            break;
        }
        case "cal-export": {

            if (action === "copy") {
                const text = $(".menu[type=cal-export] .info-box .text").text();
                if (!text.startsWith("https://start.schulportal.hessen.de/kalender.php?a=ical"))
                    return;
                navigator.clipboard.writeText(text);
            }

            break;
        }
    }
});

// When a user closes the logoff dialog
$(".dialog-box .title .close-button").on("mousedown", (event) => {
    $(".dialog-wrapper").hide();
});

// When a user presses the logoff button
$(".dialog-box .action").on("mousedown", async (event) => {
    const target = $(event.target);
    const action = target.closest(".action").attr("action");
    switch (action) {
        case "logoff": {
            localStorage.removeItem("credentials");
            eval(await (await fetch("/js/localforage.js")).text());
            await localforage.removeItem("credentials");
            if ("serviceWorker" in navigator)
                await (await navigator.serviceWorker.getRegistration())?.unregister();
            setSetting("noServiceWorker", false);
            setSetting("notificationsAsked", false);
            location.reload();
            break;
        }
    }
});