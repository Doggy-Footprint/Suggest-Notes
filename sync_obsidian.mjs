import { readFileSync, writeFileSync } from "fs";

/**
 * update manifest.json and versions.json
 * versions.json is list of targetVersion : minAppversion.
 */

const targetVersion = process.env.npm_package_version;

// read pacakge.json - description, author, name
let packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const { description, author, name } = packageJson;

// read minAppVersion from manifest.json and update according to package.json
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
if (description) manifest.description = description;
if (author) manifest.author = author;
if (name) {
    manifest.name 
    = name
        .replaceAll(/[~\-_.]+/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    manifest.id = name;
}
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));