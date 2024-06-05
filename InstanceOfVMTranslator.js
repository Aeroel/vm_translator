const Parser = require('./Parser')
const CodeWriter = require('./CodeWriter');
const pathModule = require('path')

 class InstanceOfVMTranslator {
    constructor(path) {
        const parser = new Parser(path)
        asmPath = replaceFileExtensionOfPathFromVMToAsm(path)
        const codeWriter = new CodeWriter(asmPath)

        while(parser.hasMoreCommandsLeftToProcess()) {
            if(parser.commandHasArg2()) {
                if(['pop', 'push'].includes(parser.commandType())) {
                    codeWriter.writePopPush(parser.commandType(), parser.arg1(), parser.arg2())
                }
            }
            parser.advanceToNextCommand()
        }
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

module.exports = InstanceOfVMTranslator