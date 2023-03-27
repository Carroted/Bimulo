// log.js is a nice console.log system

import chalk from 'chalk';

// Some proxies don't add ::ffff: to IPV4 addresses. To standardize IPs (e.g. for banning), we add it here.
function getIPV6(ip) {
    // The inconsistency in IP formats is annoying because someone banned on proxy could get around it by connecting directly

    if (ip.includes("::ffff:")) {
        return ip;
    } else {
        // Check if IPV4
        if (ip.includes(".")) {
            return "::ffff:" + ip;
        }

        // IPV6
        return ip;
    }
}

// "Proxy-proof" IP from request headers or req.ip (currently only supports Cloudflare)
function getIP(req) {
    var ip = req.headers['x-forwarded-for'] || req.ip;
    var cloudflare = ip != req.ip;
    if (cloudflare) {
        ip = ip.split(",")[ip.split(",").length - 1];
    }
    return { ip: getIPV6(ip), proxy: cloudflare ? "cloudflare" : null }; // Future-proofing for other proxies
}

// Beautiful Express request logging in color
function response(message, req, res) {
    var color = "whiteBright";
    if (res.statusCode == 200) {
        color = "greenBright";
    } else if (res.statusCode == 404) {
        color = "redBright";
    } else if (res.statusCode == 500 || res.statusCode == 301 || res.statusCode == 302) {
        color = "yellowBright";
    }

    var ipInfo = getIP(req); // req.ip unreliable when some proxies are involved

    console.log(chalk[color](res.statusCode) + `  ${message}  |  ${ipInfo.ip}  ` + (ipInfo.proxy == "cloudflare" ? chalk.hex('#f48121')(`Cloudflare`) : chalk.blueBright(`Direct`)));
}

// Exit the process with a message
function exit(code) {
    console.log("\nExited with code " + code);
    process.exit(code);
}

function error(message, code, tip) {
    if (tip && code) {
        console.error(chalk.bold(chalk.redBright(`\nError[${code}]`) + `: ${message} `) + `\n    ` + chalk.cyanBright(`Tip`) + `: ${tip} `);
    }
    else if (code) {
        console.error(chalk.bold(chalk.redBright(`\nError[${code}]`) + `: ${message} `));
    }
    else if (tip) {
        console.error(chalk.bold(chalk.redBright(`\nError`) + `: ${message} `) + `\n    ` + chalk.cyanBright(`Tip`) + `: ${tip} `);
    }
    else {
        console.error(chalk.bold(chalk.redBright(`\nError`) + `: ${message} `));
    }
}

function warning(message, code, tip) {
    if (tip && code) {
        console.warn(chalk.bold(chalk.yellowBright(`\nWarning[${code}]`) + `: ${message} `) + `\n    ` + chalk.cyanBright(`Tip`) + `: ${tip} `);
    }
    else if (code) {
        console.warn(chalk.bold(chalk.yellowBright(`\nWarning[${code}]`) + `: ${message} `));
    }
    else if (tip) {
        console.warn(chalk.bold(chalk.yellowBright(`\nWarning`) + `: ${message} `) + `\n    ` + chalk.cyanBright(`Tip`) + `: ${tip} `);
    }
    else {
        console.warn(chalk.bold(chalk.yellowBright(`\nWarning`) + `: ${message} `));
    }
}

function info(message, code, tip) {
    if (tip && code) {
        console.info(chalk.bold(chalk.blueBright(`\nInfo[${code}]`) + `: ${message} `) + `\n    ` + chalk.cyanBright(`Tip`) + `: ${tip} `);
    }
    else if (code) {
        console.info(chalk.bold(chalk.blueBright(`\nInfo[${code}]`) + `: ${message} `));
    }
    else if (tip) {
        console.info(chalk.bold(chalk.blueBright(`\nInfo`) + `: ${message} `) + `\n    ` + chalk.cyanBright(`Tip`) + `: ${tip} `);
    }
    else {
        console.info(chalk.bold(chalk.blueBright(`\nInfo`) + `: ${message} `));
    }
}

// log.js is called like this in index.js:
//     // Get log from log.js
//     import logjs from './log.js';
//     const log = logjs();
//     log.info("Example info message", 1, "Example tip");
// Let's set up exports for log.js

export default function () {
    return {
        getIPV6: getIPV6,
        getIP: getIP,
        response: response,
        exit: exit,
        error: error,
        warning: warning,
        warn: warning, // Alias
        info: info
    };
}