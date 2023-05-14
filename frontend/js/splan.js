function loadSplan(id) {

    const index = apps.splan.plans.indexOf(apps.splan.plans.find((x) => { return x.start_date === id }));
    $(".menu[type=splan] .lesson-plan tr:not(:first-child)").remove();
    $(".splan-switcher select").html("");
    
    const now = new Date();

    const plan = apps.splan.plans[index === -1 ? 0 : index];
    if (!plan)
        return console.error("No lesson plan loaded!");

    let iterator = 0;
    for (const lesson of plan.lessons) {

        $(".menu[type=splan] .lesson-plan tbody").append(`
            <tr>
                <td>
                    <p>${ ++iterator }.</p>
                    <small>${ lesson[0][0] }:${ addZeroToNumber(lesson[0][1]) }<br>-<br>${ lesson[1][0] }:${ addZeroToNumber(lesson[1][1]) }</small>
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `);

    }

    plan.days.forEach((day, index) => {

        for (const lesson of day.lessons) {

            const element = $(`.lesson-plan tr:nth-child(${ lesson.lessons[0] + 1 }) td:nth-child(${ index + 2 })`).attr("rowspan", lesson.lessons.length);
            for (const subject of lesson.classes)

                element.append(`<div class="lesson"><p>${ subject.name }</p><p>${ subject.room }<br>${ subject.teacher }</p></div>`);

            lesson.lessons.forEach((hour, index_) => {

                if (index_ === 0)
                    return;
                $(`.lesson-plan tr:nth-child(${ lesson.lessons[0] + 1 + index_ }) td:nth-child(${ index + 2 })`).hide();

            });

        }

    });

    apps.splan.plans.forEach((plan, index) => {

        const { start_date, end_date } = plan;
        const start = new Date(start_date);
        const end = new Date(end_date);
        if (start_date === id || (!id && index === 0))
            $(".menu[type=splan] .top-wrapper .title > small").html(`Ab ${ start.getDate() }. ${ monthNames[start.getMonth()] }${ end_date !== null ? ` bis ${ end.getDate() }. ${ monthNames[end.getMonth()] }` : "" }`);

        $(".splan-switcher select").append(`<option${ start_date === id || (!id && index === 0) ? " selected=''" : "" } value="${ start_date }">Ab ${ start.getDate() }. ${ monthNames[start.getMonth()] }${ end_date ? ` bis ${ end.getDate() }. ${ monthNames[end.getMonth()] }` : "" }</option>`);

    });

    const lessons = plan.lessons.map((lesson) => { return [ new Date(now).setHours(lesson[0][0], lesson[0][1]), new Date(now).setHours(lesson[1][0], lesson[1][1]) ] })
    if (now.getDay() > 0 && now.getDay() < 6)

        lessons.forEach((lesson, index) => {

            if (lesson[0] <= now.getTime() && lesson[1] >= now.getTime()) {

                const element = $(`.lesson-plan tr:nth-child(${ index + 2 }) td:nth-child(${ now.getDay() + 1 })`).addClass("hovered");

                if (element.css("display") === "none") {

                    while (index--) {

                        const element = $(`.lesson-plan tr:nth-child(${ index + 2 }) td:nth-child(${ now.getDay() + 1 })`);
                        if (+(element.attr("rowspan")) > 1) {
                            element.addClass("hovered");
                            break;
                        }
                            
                    }
                    
                }

            }
                

        });

}

$(".menu[type=splan] .splan-switcher select").on("change", (event) => {
    loadSplan(event.target.value);
});
