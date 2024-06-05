'use strict'
const { argv } = require('node:process')
const fs = require('fs').promises;
class ObjectOnPath {
    path = null
    type = null
    directoryFilePaths = null
    constructor(path) {
        this.init(path)
    }
    async init(path) {
        this.path = path
        const stats = await fs.stat(this.path);
        if (stats.isFile()) {
            this.type = 'file'
        } else if (stats.isDirectory()) {
            this.type = 'directory'
            await this.getFilePaths()
        } else {
            throw new Error(`${this.path} is neither a regular file nor a directory.`)
        }
    }
    async getFilePaths() {
          const files = await fs.readdir(this.path);

          const filePaths = [];
          for (const file of files) {
              const fullPath = path.join(this.path, file);
              const fileStats = await fs.stat(fullPath);
              if (fileStats.isFile()) {
                  filePaths.push(fullPath);
              } else {
                throw new Error  (this.path + "contains entities of type other than file. Why is that? :)")
              }
          }
          this.directoryFilePaths = filePaths
    }
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
    const objectOnPath = new ObjectOnPath(path);
    const InstanceOfVMTranslator = require("./InstanceOfVMTranslator")
    if (objectOnPath.type === 'file') {
        console.log("hmm");
        new InstanceOfVMTranslator(objectOnPath.path);
    } else if (objectOnPath.type === 'directory') {
        objectOnPath.directoryFilePaths.forEach(filePath => {
            new InstanceOfVMTranslator(filePath);
        })
    } else {
        throw new Error("What happened? "+objectOnPath.type)
    }
}

