import fs from "fs";
import path from "path";
import url from "url";

export const __filename = url.fileURLToPath(import.meta.url);
export const __dirname = url.fileURLToPath(new URL("../.", import.meta.url));
export const packageJson = JSON.parse(fs.readFileSync(__dirname + 'package.json', 'utf8'));

export function copyFolderRecursiveSync(source, target) {
    let files: string[] = [];
    // check if folder needs to be created or integrated
    const targetFolder = target;
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }
    // copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            const curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, path.join(targetFolder, path.basename(curSource)));
            }
            else if (fs.lstatSync(curSource).isSymbolicLink()) {
                const symlinkFull = fs.readlinkSync(curSource);
                fs.symlinkSync(symlinkFull, path.join(targetFolder, path.basename(curSource)));
            }
            else {
                fs.copyFileSync(curSource, path.join(targetFolder, path.basename(curSource)));
            }
        });
    }
}