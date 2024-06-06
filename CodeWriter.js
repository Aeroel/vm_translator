const fs = require("node:fs")

class CodeWriter {
    availableLabelId = 0;
    fileStream = null

    constructor(outputFilePath) {
        // "w" flag overwrites the file, if it exists, effectively deleting it before writing into it
        this.fileStream = fs.createWriteStream(outputFilePath, { flags: 'w' });
    }
    provideAvailableLabelId() {
        const availableLabelId = this.availableLabelId
        this.availableLabelId++
        return availableLabelId;
    }
    asmPart(name) {
        let asmInstr = null
        switch (name) {
            case "arithmetic init":
                asmInstr = `
            // arithmetic init
            // D now contains SP-2 and M now contains SP-1
            @SP
            M=M-1
            M=M-1
            A=M
            D=M
            @SP
            M=M+1
            A=M
            `
                break

            case "arithmetic end":

                asmInstr = `
                // arithmetic end here, but no commands are actually gen'ed for it
                `
                break
        }
        return asmInstr
    }

    // command can be either "add", "sub", "neg", "eq", "gt", "lt", "and", "or" and "not"
    writeArithmetic(command) {
        console.log("Called writeArithmetic on: " + command);
        let code = null
        switch (command) {
            case "add":
                code = `
                        // add
                        ${this.asmPart("arithmetic init")}

                        // the      actual add operation
                        D=D+M
                        
                        ${this.asmPart("arithmetic end")}

                `
                break
            case "sub":
                code = `
                            // sub
                            ${this.asmPart("arithmetic init")}
                            
                            // the actual sub operation
                            D=D-M
                            
                            ${this.asmPart("arithmetic end")}

    `
                break;
            case "eq":
            case "lt":
            case "gt":

            code = this.writeCmp(command);
            break;
            case "neg":
            case "not":
                code = this.writeNegOrNot(command);
            break;
            case "and":
            case "or":
                code = this.writeAndOrOr(command);
            break;
            default:
                throw new Error("Unknown command encountered: " + command);
                break;
        }
        this.fileStream.write(code)
    }
    writeAndOrOr(command) {
        const andOrOrAsm = {and: "&", or: "|"}
        const code = `
        // and
        @SP
        M=M-1
        A=M
        D=M
        @SP
        M=M-1
        A=M
        D=D${andOrOrAsm[command]}M
        @SP
        A=M
        M=D
        @SP
        M=M+1
        `
        return code
    }
    writeNegOrNot(command) {
        const negOrNotAsm = {neg: "-", not: "!"}
        const code= `
        @SP
        M=M-1
        A=M
        D=M
        D=${negOrNotAsm[command]}D
        @SP
        A=M
        M=D
        @SP
        M=M+1
        `
        return code;
    }
    writeCmp(command) {
        const availableLabelId = this.provideAvailableLabelId();
        const asm = {eq: `JEQ`, gt: `JGT`, lt: `JLT`}
        const cmpHeader = `
        D=D-M
        @IF_TRUE_${availableLabelId}
        `

        const cmpFooter = `
        @IF_FALSE_${availableLabelId}
        0;JMP
        (IF_TRUE_${availableLabelId})
        @SP
        M=M-1
        M=M-1
        A=M
        M=-1
        @END_IF_${availableLabelId}
        0;JMP
        (IF_FALSE_${availableLabelId})
        @SP
        M=M-1
        M=M-1
        A=M
        M=0
        (END_IF_${availableLabelId})
        // set SP to just below the result of eq
        @SP
        M=M+1
        `
            const  code = `
            // ${command}
            ${this.asmPart("arithmetic init")}
            ${cmpHeader}
            D;${asm[command]}
            ${cmpFooter}
            ${this.asmPart("arithmetic end")}
            // ${command} end                
            `

            return code;
    }
    writePopPush(isTypePushOrPop, segment, index) {
        let code
        if (segment === "constant") {
            if (isTypePushOrPop !== "push") {
                throw new Error("pop constant i is an invalid command (popping constant)")
            }
            code = `
                // ${isTypePushOrPop} ${segment} ${index}
                @${index}
                D=A
                @SP
                A=M
                M=D
                @SP
                M=M+1

                `
        }
        this.fileStream.write(code)
    }
    close() {
        this.fileStream.end(() => {
            if (debug) {
                console.log("CodeWriter successfully closed the outFile stream.")
            }
        })
    }
}

module.exports = CodeWriter