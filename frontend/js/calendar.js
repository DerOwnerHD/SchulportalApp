/**
 * Calculates all the weeks and their days which are inside a given month
 * @param {number} year The corresponding year like 2023
 * @param {number} month The index of the month of which to list weeks with January being 0 
 * @returns A list of all the weeks in the given month (always 6 weeks)
 */
function getWeeksForMonth(year, month) {
    const date = new Date(year, month);
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    
    const weeks = [];
    // i indicates the week, j indicates the day of the week
    for (let i = 0; i < 6; i++) {
        const days = [];
        for (let j = 0; j < 7; j++) {
            days.push(new Date(date.getFullYear(), date.getMonth(), 2 - (firstOfMonth.getDay() || 7) + (i * 7) + j));
        } weeks.push(days);
    }

    return weeks;
}

const calendarEventCategories = [
    { id: 1, name: "Klausur", colors: ["#00ffff", "#37a3e9"], logo: "fa-solid fa-book" },
    { id: 2, name: "Interne Fortbildung", colors: ["#74ff5c", "#89cc34"], logo: "fa-solid fa-pen-to-square" },
    { id: 3, name: "Besprechung", colors: ["#1e00ff", "#812efe"], logo: "fa-solid fa-bell" },
    { id: 4, name: "Veranstaltung", colors: ["#043adc", "#8a21ec"], logo: "fa-solid fa-expand" },
    { id: 5, name: "Schulfrei", colors: ["#00ffff", "#37a3e9"], logo: "fa-solid fa-thumbs-up" },
    { id: 6, name: "Konferenz", colors: ["#dc30e8", "#ac5df5"], logo: "fa-solid fa-clipboard-list" },
    { id: 7, name: "Wartung", colors: ["#ff0000", "#ff5e39"], logo: "fa-solid fa-server" },
    { id: 8, name: "Fachkonferenz", colors: ["#5e4ce6", "#8e5bf4"], logo: "fa-solid fa-at" },
    { id: 9, name: "Externe Fortbildung", colors: ["#97f575", "#42e86e"], logo: "fa-solid fa-chalkboard-user" },
    { id: 10, name: "Abitur", colors: ["#d70fd0", "#f55d90"], logo: "fa-solid fa-graduation-cap" }
]

const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/**
 * This function is supposed to run right
 * after the user sucessfully logged in as
 * it loads all the data for the CURRENT month
 */
async function initCalendar() {
    const now = new Date();
    apps.calendar = { month: now.getMonth(), year: now.getFullYear(), months: {}, filter: 0 };
    $(".calendar-month-selector p").html(monthNames[apps.calendar.month] + " " + apps.calendar.year);
    await requestCalendarForMonth();
}

$(".menu[type=cal] .calendar-month-move").on("mousedown", (event) => {
    if (!apps.calendar.switchable)
        return;
    const direction = event.target.getAttribute("direction");
    if (!direction)
        return;
    apps.calendar.switchable = false;
    changeCalendarMonth(direction === "right");
});

$(".menu[type=cal] .search").on("mousedown", (event) => {

    if (!$(".calendar-search").hasClass("d-none"))
        return $(".calendar-search").addClass("d-none");

    $(".calendar-search").removeClass("d-none");

    document.querySelector(".calendar-search").animate([
        { opacity: 0, transform: "translateY(-10px)" },
        { opacity: 1, transform: "translateY(0px)" }
    ], createAnimationProperties(400, null, "auto"));

    setTimeout(() => { $(".calendar-search").css("opacity", "1") }, 400 * animationHideTimeout);

    const boxOffset = $(".menu[type=cal] .search").offset();
    $(".calendar-search").css("top", `calc(2rem + ${ boxOffset.top }px)`).css("left", `calc(${ boxOffset.left }px - 11rem)`)
});

$(".calendar-search input").on("input", () => {
    requestCalendarForMonth();
});

/**
 * Moves the calendar by one month
 * @param {boolean} direction false indicates backwards - true forwards 
 */
function changeCalendarMonth(direction) {
    if (apps.calendar.month === (direction ? 11 : 0))
        apps.calendar = { ...apps.calendar, month: (direction ? 0 : 11), year: apps.calendar.year + (direction ? 1 : -1) }
    else
        apps.calendar.month += (direction ? 1 : -1);
    $(".calendar-month-selector p").html(monthNames[apps.calendar.month] + " " + apps.calendar.year);
    $(".calendar-")
    requestCalendarForMonth();
}

const today = new Date();
const todayString = `${ today.getFullYear() }-${ today.getMonth() }-${ today.getDate() }`;

/**
 * Loads all events from the current month
 * (loaded in apps.calendar) from the API
 */
async function requestCalendarForMonth() {
    const weeks = getWeeksForMonth(apps.calendar.year, apps.calendar.month);
    // This contains the first day and the last
    // day of the whole month requested
    // => needed for API request
    const days = [ weeks[0][0], weeks[5][6] ];

    const strings = days.map(day => {
        return [ day.getFullYear(), day.getMonth() + 1, day.getDate() ].join("-");
    });

    // This will remove all rows except the first one
    // => which is obviously the days themselves
    $(".calendar-month tr").each((index, element) => {
        if (index !== 0)
            element.remove();
    });

    for (const week of weeks) {
        const weekIndex = weeks.indexOf(week);

        // Part I: Creating the calendar itself
        const year = new Date(week[0].getFullYear(), 0, 1);
        const daysSinceStart = Math.floor((week[0] - year) / (24 * 60 * 60 * 1000));
        const index = Math.ceil((week[0].getDay() + 1 + daysSinceStart) / 7);
        $(".calendar-month").append(`<tr week="${ weekIndex }"><td class="week">${ index }</tr>`);

        // Part II: Appending all the days to it
        for (const day of week)
            $(`.calendar-month tr[week=${ weekIndex }]`).append(`
                <td day="${ day.getFullYear() }-${ day.getMonth() }-${ day.getDate() }">
                    <div class="day${ day.getMonth() !== apps.calendar.month ? " outside" : "" }">${ day.getDate() }</div>
                </td>`);

        $(`.calendar-month > tbody > tr[week=${weekIndex}]`).append(`
            <table class="events">
                <tr></tr>
                <tr></tr>
                <tr></tr>
            </table>
        `);
    }

    let events = apps.calendar.months[apps.calendar.year + "-" + apps.calendar.month];
    if (!events) {
        const data = await makeRequest("calendar", [ [ "authorization", keys.token ] ], "POST", JSON.stringify({
            start: strings[0],
            end: strings[1]
        })).catch(error => {
            console.error(error);
            apps.calendar.switchable = true;
        });
    
        if (data.error) {
            apps.calendar.switchable = true;
            return console.error(data.error_message);
        }

        apps.calendar.months[apps.calendar.year + "-" + apps.calendar.month] = data.events;
        events = data.events;
    }

    const searchQuery = document.querySelector(".calendar-search input").value.toLowerCase();

    /**
     * Step 1: Loop through all events and check in what weeks
     * they lie inside our month (use start and end of the weeks)
     * Step 2: Go through all the weeks and their respective events
     * and then find out during which days of the week they happen
     * Step 3: Paint all the events in the corresponding weeks to
     * the screen and consider how many events happen on each day
     */
    for (const week of weeks) {
        const weekIndex = weeks.indexOf(week);

        const dayLists = [[], [], [], [], [], [], []];

        for (const event of events) {
            if ((apps.calendar.filter !== 0 && event.category !== apps.calendar.filter) || 
                (searchQuery && !event.title?.toLowerCase()?.includes(searchQuery) && !event.description?.toLowerCase()
                ?.includes(searchQuery) && !event.location?.toLowerCase()
                ?.includes(searchQuery)))
                continue;
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            const category = calendarEventCategories.find(x => x.id === event.category);
                
            if (isInWeek(startDate, endDate, week)) {

                const days = week.filter((day) => { return isDuringDay(startDate, endDate, day) });
                if (!days.length)
                    continue;

                const startInWeek = week.indexOf(days[0]);

                const emptyRows = [];
                // i -> days in the week
                // j -> row of potential events
                for (let i = 0; i < days.length; i++) {
                    for (let j = 0; j < 3; j++) 
                        if (!dayLists[i + week.indexOf(days[0])].find(x => x.row === j) && !emptyRows.includes(j))
                            emptyRows.push(j);
                }
                
                if (!emptyRows.length)
                    continue;

                dayLists[startInWeek].push({
                    event: event,
                    length: days.length,
                    row: emptyRows[0],
                    category: category,
                    days: days
                });

                days.forEach((day, index) => { if (index !== 0) dayLists[week.indexOf(day)].push({ dummy: true, row: emptyRows[0] }) });

            }

        }

        let highestRowInWeek = 1;
        
        dayLists.forEach((day) => {

            day.forEach((data) => {

                if (data.dummy)
                    return;

                if (data.row > highestRowInWeek)
                    highestRowInWeek = data.row + 1;

                $(`.calendar-month tr[week=${ weekIndex }] .events tr:nth-child(${ data.row + 1 })`)
                    .append(`<td class="event" id="${ data.event.id || data.event.foreignUID || 0 }" style="width: calc(95vw / 8 * ${ data.length } - 4px); left: calc(95vw / 8 * ${ week.indexOf(data.days[0]) } + 95vw / 8 + 1px); --event-gradient-color-1: ${ data.category.colors[0] }; --event-gradient-color-2: ${ data.category.colors[1] };">
                        <div class="title">
                            <i class="${ data.category.logo }"></i>
                            <span>${ data.event.title }</span>
                        </div>
                    </td>`);

            });

        });

        $(`.calendar-month tr[week=${ weekIndex }]`).css("height", `calc(1.25rem * ${ highestRowInWeek + 1 } + 5px)`);

    }

    $(".calendar-month td[day]").each((index, element) => {
        if (element.getAttribute("day") === todayString)
            element.classList.add("hovered");
    });

    registerCalendarMonthEventListeners();

    // We may only allow the user to
    // switch further at the end as
    // allowing it before may be bad
    apps.calendar.switchable = true;
        
}

function findEventByIdOrTitle(id) {
    const events = apps.calendar.months[apps.calendar.year + "-" + apps.calendar.month];
    return events.find(x => x.id == id) || events.find(x => x.title === id.trim());
}

function registerCalendarMonthEventListeners() {
    $(".calendar-month .events .event").on("mousedown", (event) => {
        const element = $(event.target).closest(".event");
        if (!element.length)
            return console.error("Couldn't find calendar event pressed on");
        const id = element.attr("id");
        if (!id)
            return console.error("Calendar Event doesn't have an ID set");

        openCalendarEventInfo(id === "0" ? element.children(".title").children("span").html() : id);
    });
}

$(".calendar-info-box .close-button").on("mousedown", (event) => {
    $(".calendar-info-box")[0].animate([
        { transform: "translateY(0px)" }, 
        { transform: `translateY(-${ $(".calendar-info-box").outerHeight() + 20 }px)` }
    ], createAnimationProperties(500));

    setTimeout(() => { $(".calendar-info-box").addClass("d-none") }, 500 * animationHideTimeout);
    if (calendarInfoBoxTitleAnimation)
        calendarInfoBoxTitleAnimation.cancel();
});

let calendarInfoBoxTitleAnimation = null;
let allowCalendarInfoBoxClick = true;

/**
 * Opens the info box with the id of the event
 * @param {string} id 
 */
function openCalendarEventInfo(id) {
    if (!allowCalendarInfoBoxClick)
        return;
    allowCalendarInfoBoxClick = false;
    const events = apps.calendar.months[apps.calendar.year + "-" + apps.calendar.month];
    // Here only == as it MAY be a string
    const event = events.find(x => x.id == id) || events.find(x => x.title === id.trim());

    $(".calendar-info-box .description").html(event?.description || "Keine Beschreibung");
    $(".calendar-info-box .title").html(event?.title || "Kein Titel");

    const start = new Date(event.start);
    const end = new Date(event.end);

    if (datesAreOnSameDay(start, end))

        $(".calendar-info-box .buttons .button:nth-child(2) span").html(
            event.allDay ? start.getDate() + ". " + monthNames[start.getMonth()] : 
            `${ start.getHours() }:${ addZeroToNumber(start.getMinutes()) } - ${ end.getHours() }:${ addZeroToNumber(end.getMinutes()) }`
        );

    else
        
        $(".calendar-info-box .buttons .button:nth-child(2) span").html(start.getDate() + ". " + monthNames[start.getMonth()] + " - " + end.getDate() + ". " + monthNames[end.getMonth()]);

    const category = calendarEventCategories.find(x => x.id === event.category);

    $(".calendar-info-box .buttons .button:nth-child(1)")[event.location ? "removeClass" : "addClass"]("d-none")
        .children("span").html(event.location);
    $(".calendar-info-box .buttons .button:nth-child(3)")[event.public ? "addClass" : "removeClass"]("d-none");

    $(".calendar-info-box .icon").html(`<i class="${ category.logo }"></i> ${ category.name }`)
        .css("--event-gradient-color-1", category.colors[0])
        .css("--event-gradient-color-2", category.colors[1]);

    $(".calendar-info-box").removeClass("d-none")[0].animate([
        { transform: `translateY(-${ $(".calendar-info-box").outerHeight() + 20 }px)` }, 
        { transform: "translateY(0px)" }
    ], createAnimationProperties(500));

    if (calendarInfoBoxTitleAnimation)
        calendarInfoBoxTitleAnimation.cancel();

    setTimeout(() => { allowCalendarInfoBoxClick = true; }, 500);

    const title = document.querySelector(".calendar-info-box .top .title");
    if (title.scrollWidth <= title.clientWidth)
        return;

    // We want to wait for the box to
    // finish coming down before starting
    setTimeout(() => {

        calendarInfoBoxTitleAnimation = title.animate([
            { textIndent: "0px", offset: 0.15 },
            { textIndent: "-" + (title.scrollWidth - title.clientWidth) + "px", offset: 0.5 },
            { textIndent: "-" + (title.scrollWidth - title.clientWidth) + "px", offset: 0.65 },
            { textIndent: "0px", offset: 1 }
        ], createAnimationProperties((title.scrollWidth - title.clientWidth) * 50 + 500, "linear", null, Infinity));

    }, 250);
    
}

function addZeroToNumber(number) {
    return String(number).padStart(2, "0");
}

/**
 * Checks whether two Date object are on the same day
 * @param {Date} first 
 * @param {Date} second 
 * @returns {boolean} Whether they are or not
 */
function datesAreOnSameDay(first, second) {
    return first.getFullYear() === second.getFullYear() &&
        first.getMonth() === second.getMonth() &&
        first.getDate() === second.getDate();
}

$(".menu[type=cal] .filters").on("change", (event) => {
    apps.calendar.filter = parseInt(event.target.value);
    requestCalendarForMonth();
});

async function loadCalendarExport() {

    const raw = await makeRequest("calendar/export", [ [ "authorization", keys.token ] ], "GET");

    if (raw.error)
        return;

    $(".menu[type=cal-export] .info-box .text").text(raw.link || "Fehler");
    openMenu("cal-export");

}

/**
 * Checks if a given event is in a specific week by
 * taking in its start and end times
 * @param {Date} start 
 * @param {Date} end 
 * @param {Date[]} week 
 */
function isInWeek(start, end, week) {
    /**
     * Check 1: Any of the two points of the event are within the week
     * Check 2: Both of them are outside the week, the start before and the end after
     * -> This will ensure the complete week HAS to be inside the events timespan
     */
    const weekStart = week[0].getTime();
    const weekEnd = new Date(week[6]).setHours(23, 59, 59);
    return ( ((start.getTime() >= weekStart) && !(start.getTime() > weekEnd)) || ((end.getTime() <= weekEnd) && !(end.getTime() < weekStart)) ) ||
        (start.getTime() <= weekStart && end.getTime() >= weekEnd);
}

/**
 * Follows the same formula as isInWeek
 * @param {Date} start 
 * @param {Date} end 
 * @param {Date} day 
 */
function isDuringDay(start, end, day) {
    const dayStart = day.getTime();
    const dayEnd = new Date(day).setHours(23, 59, 59);
    return ((start.getTime() >= dayStart && !(start.getTime() > dayEnd)) || ((end.getTime() <= dayEnd) && !(end.getTime() < dayStart))) ||
        (start.getTime() <= dayStart && end.getTime() >= dayEnd);
}