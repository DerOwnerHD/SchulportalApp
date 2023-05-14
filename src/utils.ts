export const parseCookie = (cookie: NonNullable<string>): { [ key: string ]: string } => {
    try {
        const arrays = cookie.split("; ").map(pair => pair.split("="));
        const objects = {};
        arrays.forEach(array => { objects[array[0].replace("secure, ", "")] = array[1] || "" });
        return objects;
    } catch (error) {
        console.error(error);
        return {};
    }
}

/**
 * Cleans a string from all empty spaces which may stop
 * a function from working with it correctly. This mostly
 * applies to Schulportal HTML requests.
 * @param text String of which to remove empty spaces from
 * @returns Cleaned string
 */
export const removeBreaks = (text: string): string => {

    return text.replace(/(\r\n|\n|\r)/gm, "<1br />")
        .replace(/<1br \/><1br \/><1br \/>/gi, "<1br /><2br />")
        .replace(/<1br \/><1br \/>/gi, "")
        .replace(/\<1br \/>/gi, " ")
        .replace(/\s+/g, " ")
        .replace(/<2br \/>/gi, "\n\n");

}