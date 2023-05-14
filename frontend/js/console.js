/**
 * This file is responsible for replacing the default
 * console of a browser with a logger meant for debugging
 * purposes. This could also be included in a final build!
 * Functions: generateConsoleLogger
 */

/**
 * Modifies the console object for the purpose
 */
function generateConsoleLogger() {
    console.stdlog = console.log.bind(console);
    console.errlog = console.error.bind(console);
    console.log = function() {
        console.stdlog.apply(console, arguments);
        updateOutput(arguments);
    }
    console.error = function() {
        console.errlog.apply(console, arguments);
        updateOutput(arguments);
    }
}

function updateOutput(arguments) {
    const message = Array.from(arguments).join(" ");
    $(".console .output").append(`<div class="entry">${message}</div>`);
}

function evalConsoleInput() {
    try {
        eval($(".console .input input")[0].value);
    } catch (error) {
        console.error(error);
    }
    $(".console .input input")[0].value = "";
}