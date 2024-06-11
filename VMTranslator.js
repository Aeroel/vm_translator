'use strict'
const { argv } = require('node:process')
const fs = require('fs')
const path = require("path");
const CodeWriter = require("./CodeWriter")
const Parser = require("./Parser")
main()

function main() {
    global.debug = true
    const theFSPath = argv[2]
    const isFileOrFolder = determineIfPathIsFileOrFolder(theFSPath)

    let VMFiles = []
    let outputFilePath = null
    if (isFileOrFolder === 'file') {
        outputFilePath = theFilePathButWithAsmExtension(theFSPath)
        VMFiles.push({ path: theFSPath, fileNameNoExt: path.basename(theFSPath, '.vm') })
    } else if (isFileOrFolder === 'folder') {
        outputFilePath = theFolderAsmInsideTheFolder(theFSPath)
        VMFiles = getPathAndNoExtNameOfAllVMFilesInAFolder(theFSPath)
    }
    const codeWriter = new CodeWriter(outputFilePath);
    VMFiles.forEach(VMFile => {
        codeWriter.setFileName(VMFile.fileNameNoExt)
        const parser = new Parser(VMFile.path)
        doStuffWithParserAndCodeWriter(parser, codeWriter)
    })
    codeWriter.close()

}


function doStuffWithParserAndCodeWriter(parser, codeWriter) {
    while (parser.hasMoreCommandsLeftToProcess()) {
       if (['pop', 'push'].includes(parser.commandType())) {
            codeWriter.writePopPush(parser.commandType(), parser.arg1(), parser.arg2())
        } else if (parser.commandType() === 'arithmetic') {
            codeWriter.writeArithmetic(parser.arg1())
        } else if (parser.commandType() === 'comparison') {
            codeWriter.writeComparison(parser.arg1())
        } else if (parser.commandType() === 'negOrNot') {
            codeWriter.writeNegOrNot(parser.arg1());
        } else if (parser.commandType() === 'andOrOr') {
            codeWriter.writeAndOrOr(parser.arg1());
        } else if (parser.commandType() === 'label') {
            codeWriter.writeLabel(parser.arg1());
        } else if (parser.commandType() === 'goto') {
            codeWriter.writeGoto(parser.arg1());
        } else if (parser.commandType() === 'if') {
            codeWriter.writeIf(parser.arg1());
        }
        parser.advanceToNextCommand()
    }
}

function determineIfPathIsFileOrFolder(inputPath) {
    try {
        const stats = fs.statSync(inputPath);

        if (stats.isFile()) {
            return 'file';
        } else if (stats.isDirectory()) {
            return 'folder';
        }
    } catch (error) {
        throw new Error(error)
    }
}

function getPathAndNoExtNameOfAllVMFilesInAFolder(folderPath) {
    try {
        const result = [];
        const files = fs.readdirSync(folderPath);

        files.forEach(file => {
            const fullPath = path.join(folderPath, file);
            const stats = fs.statSync(fullPath);

            if (stats.isFile() && path.extname(file) === '.vm') {
                const fileNameNoExt = path.basename(file, '.vm');
                result.push({ path: fullPath, fileNameNoExt });
            }
        });

        return result;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

function theFolderAsmInsideTheFolder(folderPath) {
    const cleanedFolderPath = folderPath.replace(/[\/\\]$/, '');
    const folderName = path.basename(cleanedFolderPath);
    return path.join(cleanedFolderPath, `${folderName}.asm`);
}

function theFilePathButWithAsmExtension(filePath) {
    const dir = path.dirname(filePath);
    const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
    return path.join(dir, `${fileNameWithoutExt}.asm`);
}