const Parser = require('./Parser')
const CodeWriter = require('./CodeWriter');
const pathModule = require('path')

class InstanceOfVMTranslator {
    constructor(path) {
        const parser = new Parser(path)
        const asmPath = replaceFileExtensionOfPathFromVMToAsm(path)
        const fileNameWithoutExtension = getFileNameWithoutExtension(path);
        const codeWriter = new CodeWriter(asmPath)
        codeWriter.setFileName(fileNameWithoutExtension);

        if (debug) {
            console.log("Proceeding to go through VM commands");
        }
        let commsProcessed = 0
        while (parser.hasMoreCommandsLeftToProcess()) {
            console.log("Current command: " + parser.currentCommand)
            console.log("Current command's type: " + parser.commandType());
            console.log("Arg1: " + parser.arg1());
            if (['push', 'pop', 'call', 'function'].includes(parser.commandType())) {
                console.log("Arg2: " + parser.arg2());
            }
            console.log("Does command have arg2?: " + parser.commandHasArg2());
            if (['pop', 'push'].includes(parser.commandType())) {
                if(debug) {
                console.log("If: popOrPush");
                }
                codeWriter.writePopPush(parser.commandType(), parser.arg1(), parser.arg2())
            } else if (parser.commandType() === 'arithmetic') {
                if(debug) {
                    console.log("If: arithmetic");
                    }
                codeWriter.writeArithmetic(parser.arg1())
            } else if (parser.commandType() === 'comparison') {
                if(debug) {
                    console.log("If: comparison");
                    }
                codeWriter.writeComparison(parser.arg1())
            } else if (parser.commandType() === 'negOrNot') {
                if(debug) {
                    console.log("If: negOrNot");
                    }
                codeWriter.writeNegOrNot(parser.arg1());
            } else if (parser.commandType() === 'andOrOr') {
                if(debug) {
                    console.log("If: andOrOr");
                    }
                codeWriter.writeAndOrOr(parser.arg1());
            }

            parser.advanceToNextCommand()
            commsProcessed++
        }
        console.log("Commands while loop encountered: " + commsProcessed);
        codeWriter.close()
    }
}
function replaceFileExtensionOfPathFromVMToAsm(filePath) {
    if (pathModule.extname(filePath) !== '.vm') {
        throw new Error('The provided file does not have a .vm extension.')
    }

    // Replace the .vm extension with .asm
    const asmFilePath = filePath.slice(0, -3) + '.asm'

    return asmFilePath
}
function getFileNameWithoutExtension(path) {
    const parsedPath = pathModule.parse(path);
    const fileNameWithoutExtension = parsedPath.name;

    return fileNameWithoutExtension;
}

module.exports = InstanceOfVMTranslator