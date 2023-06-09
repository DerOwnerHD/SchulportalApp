const { minify } = require("terser");
const htmlMinifier = require("html-minifier");
const fs = require("fs");
const os = require("os");
const CleanCSS = require("clean-css");

/**
 * Minifies all Frontend scripts, styles and
 * HTMl documents and merges them into an efficient
 * and optimized production code
 */
async function buildFrontend() {
    const scripts = fs.readdirSync("./frontend/js");
    console.log("[Minifier] Loaded " + scripts.length + " scripts");

    const stylings = fs.readFileSync("./frontend/app.css") + "\n" + fs.readFileSync("./frontend/tailwind.css");
    const minifiedStyle = new CleanCSS({ }).minify(stylings);
    fs.writeFileSync("./build/frontend/app.css", minifiedStyle.styles);
    console.log("[Minifier] Minified CSS styles");

    let scriptContent = "";
    // We only do not minify the scripts and HTML for debugging
    // purposes so it is still identifiable in the browser debugger
    if (os.platform() === "win32") {

        console.log("[Minifier] Running on Windows, thus not minifying scripts");
        for (const script of scripts)
            scriptContent += fs.readFileSync("./frontend/js/" + script);
        fs.writeFileSync("./build/frontend/app.js", scriptContent);
        fs.writeFileSync("./build/frontend/index.html", fs.readFileSync("./frontend/index.html").toString());
        return;

    }

    for (const script of scripts)
        await minify(fs.readFileSync("./frontend/js/" + script).toString())
            .then((minified) => { 
                console.log("[Minifier] Minified script " + script);
                scriptContent += "\n" + minified.code;
            }).catch(() => { console.log("[Minifier] Couldn't minify script " + script); });

    fs.writeFileSync("./build/frontend/app.js", scriptContent);
    console.log("[Minifier] Sucessfully minified scripts");

    const html = htmlMinifier.minify(fs.readFileSync("./frontend/index.html").toString(), {
        collapseWhitespace: true,
        conservativeCollapse: true,
        minifyCSS: true,
        removeComments: true,
        useShortDoctype: true
    });
    fs.writeFileSync("./build/frontend/index.html", html);
    console.log("[Minifier] Minified HTML");
}

buildFrontend();