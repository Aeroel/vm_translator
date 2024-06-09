'use strict'
const { argv } = require('node:process')
const fsProm = require('fs').promises;
const { nodePathModule } = require("node:path");
const InstanceOfVMTranslator = require("./InstanceOfVMTranslator")

async function getObjectOnPath(path) {
    const stats = await fsProm.stat(path);
    let type;
    let directoryFilePaths = null;
    if (stats.isFile()) {
        type = 'file'
    } else if (stats.isDirectory()) {
        type = 'directory'
        directoryFilePaths = await getFilePaths(path)
    } else {
        throw new Error(`${this.path} is neither a regular file nor a directory.`)
    }
    const objectOnPath = { path, type, directoryFilePaths }
    return objectOnPath
}
async function getFilePaths(dirPath) {
    const files = await fsProm.readdir(dirPath);

    const filePaths = [];
    for (const file of files) {
        const fullPath = nodePathModule.join(dirPath, file);
        const fileStats = await fsProm.stat(fullPath);
        if (fileStats.isFile()) {
            filePaths.push(fullPath);
        } else {
            throw new Error(dirPath + "contains entities of type other than file. Why is that? :)")
        }
    }
    directoryFilePaths = filePaths
    return directoryFilePaths
}

main()
async function main() {
    global.debug = true
    if (debug) {
        console.log("Starting VMTranslator in debug mode (this just means it shows some output in console)");
    }

    const path = argv[2]

    if (!path) {
        throw new Error('Please provide a file or directory path as an argument.')
    }
    const objectOnPath = await getObjectOnPath(path);
    console.log(objectOnPath)
    if (objectOnPath.type === 'file') {
        console.log("hmm");
        new InstanceOfVMTranslator(objectOnPath.path);
    } else if (objectOnPath.type === 'directory') {
        objectOnPath.directoryFilePaths.forEach(filePath => {
            new InstanceOfVMTranslator(filePath);
        })
    } else {
        throw new Error("What happened? " + objectOnPath.type)
    }
}

