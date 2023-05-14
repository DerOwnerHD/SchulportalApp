function switchVplanDay(menu) {
    if (apps.vplan.days.length === 1) // Cannot switch if there is only one day there
        return;

    menus["animationRunning"].push("vplan");

    // Inverts the selected day (0 -> 1 and 1 -> 0)
    apps.vplan.selectedDay = +!apps.vplan.selectedDay;

    // Animation used for all elements
    // => fade out -> change -> fade back in
    const frames = [
        { opacity: 1 },
        { opacity: 0 },
        { opacity: 1 },
    ];
    const options = createAnimationProperties(800, "ease-in-out");

    const title = $(".menu[type=vplan] .top-wrapper .title");
    const news = $(".menu[type=vplan] .top-button.extended[action=news]");
    const relative = $(".menu[type=vplan] .top-button.extended[action=relative]");
    const content = $(".menu[type=vplan] .main-wrapper");

    animateElements([news[0], relative[0], title[0], content[0], $(".menu[type=vplan] .footer-wrapper")[0]], frames, options);

    const height = getVplanMenuHeight();

    setTimeout(() => {
        vplanReplaceData();
        const animation = menu[0].animate([
            { transform: "translateY(0px)" },
            { transform: `translateY(${ height - getVplanMenuHeight() }px)` }
        ], createAnimationProperties(400, "ease-in-out"));
        setTimeout(() => {
            menus["animationRunning"].splice(menus["animationRunning"].indexOf("vplan"), 1);
            animation.cancel();
            menu.css("transform", "translateY(0px)").css("height", getVplanMenuHeight());
        }, 400 * animationHideTimeout);
    }, 400 /* <- this has to be 400 as this is not hiding anything (d-none) */ );
}

function vplanReplaceData() {
    // Responsible for replacing all daily content in vplan
    const data = apps.vplan.days[apps.vplan.selectedDay];

    $(".menu[type=vplan] .top-wrapper .title").html(data.clean.substring(0, 2) + " <small>" + data.raw.substring(0, 6).replaceAll("_", ".") + "</small>");
    $(".menu[type=vplan] .top-button.extended[action=news]").children("p").html(data.news.length);

    const table = $(".menu[type=vplan] .main-wrapper table").html(`
        <tr>
            <th><i class="fa-solid fa-clock"></i></th>
            <th><i class="fa-solid fa-book"></i></th>
            <th><i class="fa-solid fa-user"></i></th>
            <th><i class="fa-solid fa-user-slash"></i></th>
            <th><i class="fa-solid fa-location-dot"></i></th>
            <th><i class="fa-solid fa-info"></i></th>
        </tr>`)[data.vertretungen.length ? "show" : "hide"]();
    data.vertretungen.forEach((vertretung) => {
        table.append(`<tr>
            <td>${ vertretung.lesson }</td>
            <td>${ vertretung.subject }</td>
            <td>${ vertretung.substitute || "-" }</td>
            <td>${ vertretung.teacher || "-" }</td>
            <td>${ vertretung.room || "-" }</td>
            <td>${ vertretung.note || "-" }</td>    
        </tr>`);
    });

    $(".menu[type=vplan] .main-wrapper .empty")[data.vertretungen.length ? "hide" : "show"]();

    (() => {
        if (!data.news.length)
            return $(".menu[type=vplan-news] .main-wrapper").html("<p>Keine Neuigkeiten</p>");

        $(".menu[type=vplan-news] .main-wrapper").html("<ul></ul>");
        data.news.forEach((element) => {
            $(".menu[type=vplan-news] .main-wrapper ul").append("<li type='disc'>" + element + "</li>");
        });
    })();

    const relative = $(".menu[type=vplan] .top-button.extended[action=relative]");
    const relativeString = data.relative;
    if (!relativeString.length)
        return relative.hide();
    relative.show()
        .children("p").html(data.relative);
}

function getVplanMenuHeight() {
    return $(".menu[type=vplan] .main-wrapper").height() + $(".menu[type=vplan] .top-wrapper").height() + $(".menu[type=vplan] .footer-wrapper").height() + $(".menu[type=vplan] .white-space").height();
}