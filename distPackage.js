import fs from 'fs';
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8'));
// create a `dist-package.json` file
var distPackage = {
    name: packageJson.name,
    version: packageJson.version,
    main: 'server/src/index.js',
    scripts: {
        start: 'node server/src/index.js',
        build: 'echo "This is a build, run this on the source" && exit 1' // for convenience since people will likely accidentally run this
    },
    dependencies: packageJson.dependencies,
    engines: packageJson.engines,
    type: packageJson.type
};
fs.writeFileSync(__dirname + '/dist-package.json', JSON.stringify(distPackage, null, 4));
console.log('Created dist-package.json');