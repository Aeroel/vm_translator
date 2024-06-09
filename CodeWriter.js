const fs = require("node:fs")

class CodeWriter {
    availableLabelId = 0;
    fileStream = null;
    fileName = null;

    constructor(outputFilePath) {
        // "w" flag overwrites the file, if it exists, effectively deleting it before writing into it
        this.fileStream = fs.createWriteStream(outputFilePath, { flags: 'w' });
    }
    setFileName(fileName) {
        this.fileName = fileName;
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
            code = this.writeConstant(isTypePushOrPop, segment, index);
        } else {
            code = this.writeLocalOrArgumentOrThisOrThatOrTemp(isTypePushOrPop, segment, index);
        }
        this.fileStream.write(code)
    }
    writeLocalOrArgumentOrThisOrThatOrTemp(isTypePushOrPop, segment, index) {
        const segmentToASMVarAddr = {local: "LCL", argument: "ARG", this: "THIS", that: "THAT", temp: "5"};
        const DPlusOne = `D=D+1
        `;
        let timesToRepeat = index - 1;
        if (timesToRepeat < 0) {
            timesToRepeat = 0;
        }
        let howeverManyDPlus1sAreNeededForTheGivenIndex =  DPlusOne.repeat(timesToRepeat);
        if(timesToRepeat > 0) {
         howeverManyDPlus1sAreNeededForTheGivenIndex = `${howeverManyDPlus1sAreNeededForTheGivenIndex}D=D+1`;
        }
       let code;
        if(isTypePushOrPop === "push") {
        code = `
        // push ${segment} ${index}
        @${segmentToASMVarAddr[segment]}
        D=M
        ${howeverManyDPlus1sAreNeededForTheGivenIndex}
        A=D 
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1
        `
       } else {
        code = `
        // pop ${segment} ${index}
        @SP
        M=M-1
        A=M
        D=M
        @13
        M=D
        @${segmentToASMVarAddr[segment]}
        D=M
        ${howeverManyDPlus1sAreNeededForTheGivenIndex}
        @14
        M=D
        @13
        D=M
        @14
        A=M
        M=D
        `
       }
        return code
    }
    writeConstant(isTypePushOrPop, segment, index) {
        if (isTypePushOrPop !== "push") {
            throw new Error("pop constant i is an invalid command (popping constant) because where is nothing to pop since i is a number, not an index of some storage in memory... or something like that")
        }
        const code = `
    // ${isTypePushOrPop} ${segment} ${index}
    @${index}
    D=A
    @SP
    A=M
    M=D
    @SP
    M=M+1
    `
    return code;
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