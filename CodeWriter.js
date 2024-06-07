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
                @SP
                M=M-1
                M=M-1
                A=M
                D=M
                @SP
                M=M+1
                A=M
            `
            // now arg1 is avaialble in D and arg2 is in M
            break;

            // arithmetiic end puts D into the arg1 space on the stack and positions SP below
            case 'arithmetic end':
                asmInstr = `
                @SP
                M=M-1
                A=M
                M=D
                @SP
                M=M+1
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
                D=D+M
                ${this.asmPart("arithmetic end")}
                `
                break
            case "sub":
                code = `
                // sub
                ${this.asmPart("arithmetic init")}
                D=D-M
                ${this.asmPart("arithmetic end")}
                
    `
                break;
        }
        this.fileStream.write(code)
    }
    writeAndOrOr(command) {
        const andOrOrAsm = {and: "&", or: "|"}
        const code = `
        // ${command}
        @SP
        M=M-1
        M=M-1
        A=M
        D=M
        @SP
        M=M+1
        A=M
        D=D${andOrOrAsm[command]}M
        @SP
        M=M-1
        A=M
        M=D
        @SP
        M=M+1
        `
        this.fileStream.write(code)
    }
    writeNegOrNot(command) {
        const negOrNotAsm = {neg: "-", not: "!"}
        const code= `
        // ${command}
        @SP
        M=M-1
        A=M
        M=${negOrNotAsm[command]}M
        @SP
        M=M+1
        `
        this.fileStream.write(code)
    }
    writeComparison(command) {
        const availableLabelId = this.provideAvailableLabelId();
        const asm = {eq: `JEQ`, gt: `JGT`, lt: `JLT`}

        const code = `
        // ${command}
        @SP
        M=M-1
        M=M-1
        A=M
        D=M
        @SP
        M=M+1
        A=M
        D=D-M
        @IF_TRUE_${availableLabelId}
        D;${asm[command]}
        @IF_FALSE_${availableLabelId}
        0;JMP
        (IF_TRUE_${availableLabelId})
        @SP
        M=M-1
        A=M
        M=-1
        @END_IF_${availableLabelId}
        0;JMP
        (IF_FALSE_${availableLabelId})
        @SP
        M=M-1
        A=M
        M=0
        (END_IF_${availableLabelId})
        @SP
        M=M+1
        `
            this.fileStream.write(code)
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