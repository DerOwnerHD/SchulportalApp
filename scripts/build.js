const { minify } = require("terser");
const htmlMinifier = require("html-minifier");
const fs = require("fs");

/**
 * Minifies all Frontend scripts, styles and
 * HTMl documents and merges them into an efficient
 * and optimized production code
 */
async function buildFrontend() {
    const scripts = fs.readdirSync("./frontend/js");
    console.log("[Minifier] Loaded " + scripts.length + " scripts");
    let minifiedScript = "";
    for (const script of scripts)
        await minify(fs.readFileSync("./frontend/js/" + script).toString())
            .then((minified) => { 
                console.log("[Minifier] Minified script " + script);
                minifiedScript += "\n\n" + minified.code;
            }).catch(() => { console.log("[Minifier] Couldn't minify script " + script); });

    fs.writeFileSync("./build/frontend/app.js", minifiedScript);
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