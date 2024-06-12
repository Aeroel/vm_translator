const fs = require("node:fs")

class CodeWriter {
    nextAvailableIndices = []
    availableLabelId = 0;
    fileStream = null;
    currentFileName = null;

    constructor(outputFilePath) {
        // "w" flag overwrites the file, if it exists, effectively deleting it before writing into it
        this.fileStream = fs.createWriteStream(outputFilePath, { flags: 'w' });
    }
    setFileName(fileName) {
        this.currentFileName = fileName;
        this.fileStream.write("// " + fileName + "\n");
    }
    getFileName() {
        return this.currentFileName;
    }
    provideAvailableIndex(name) {

        if (!this.nextAvailableIndices.hasOwnProperty(name)) {
            this.nextAvailableIndices[name] = 0;
        } else {
            this.nextAvailableIndices[name] += 1;
        }
        return this.nextAvailableIndices[name];
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

    // command can be either "add" or "sub"
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
        const andOrOrAsm = { and: "&", or: "|" }
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
        const negOrNotAsm = { neg: "-", not: "!" }
        const code = `
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
        const availableLabelId = this.provideAvailableIndex("label");
        const asm = { eq: `JEQ`, gt: `JGT`, lt: `JLT` }

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
    writeIf(label) {
        let code = `
        // if-goto ${label}
        @SP
        M=M-1
        A=M
        D=M
        @${this.getFileName() + "$" + label}
        D;JGT
        `
        this.fileStream.write(code)
    }
    writeGoto(label) {
        let code = `
        // goto ${label}
        @${this.getFileName() + "$" + label}
        0;JMP`
        this.fileStream.write(code)
    }
    writeLabel(label) {
        let code = `
        // label ${label}
        (${this.getFileName() + ":" + label})`
        this.fileStream.write(code)
    }
    writePopPush(isTypePopOrPush, segment, index) {
        let code
        if (segment === "constant") {
            code = this.codeForConstant(isTypePopOrPush, segment, index);
        } else if (segment === "static") {
            code = this.codeForStatic(isTypePopOrPush, segment, index);
        } else if (segment === "pointer") {
            code = this.codeForPointer(isTypePopOrPush, segment, index);
        } else {
            code = this.codeForPopPushLocalOrArgumentOrThisOrThatOrTemp(isTypePopOrPush, segment, index);
        }
        this.fileStream.write(code)
    }

    writeCall(functionName, amountOfArgVars) {
        const returnIndex = this.provideAvailableIndex(functionName)
        const returnLabel = functionName + "$ret." + returnIndex
        const fivePlusAmOfArgs = amountOfArgVars + 5
        let code = `
        // call ${functionName} ${amountOfArgVars}
        // put returnAddress, increase SP by 1
        @${returnLabel}
        D=A
        @SP
        A=M
        M=D

        @SP
        M=M+1

        // put LCL, increase SP by 1
        @LCL
        D=M
        @SP
        A=M
        M=D
        
        @SP
        M=M+1

        // put ARG, increase SP by 1
        @ARG
        D=M
        @SP
        A=M
        M=D
        
        @SP
        M=M+1
                
        // put THIS, increase SP by 1
        @THIS
        D=M
        @SP
        A=M
        M=D
        
        @SP
        M=M+1

        // put THAT, increase SP by 1
        @THAT
        D=M
        @SP
        A=M
        M=D
        
        @SP
        M=M+1

        // reposition ARG to the first passed argument
        @${fivePlusAmOfArgs}
        D=A
        @SP
        D=M-D
        @ARG
        M=D

        // reposition, LCL = SP
        @SP
        D=M
        @LCL
        M=D

        @${functionName}
        0;JMP
        // the return will go here
        (${returnLabel})
        `
        this.fileStream.write(code)
    }
    writeFunction(functionName, amountOfLocalVars) {
        const pushInitLocalVarsToZero = `
        @SP
        A=M
        M=0
        @SP
        M=M+1
        `.repeat(amountOfLocalVars)
        let code = `
        // function ${functionName} ${amountOfLocalVars}
        (${functionName})
        ${pushInitLocalVarsToZero}
        `
        this.fileStream.write(code)
    }

    putIntoDAddressOfFrameMinus(num) {
        const codeMinusZero = `
        @FRAME
        D=M
    `
    const codeMinusOne = `
        @FRAME
        A=A-1
        D=M
        `
    if (num === 0) {
        return codeMinusZero
    } else if(num === 1) {
        return  codeMinusOne
    }
    
    const codeMinusN = `
        @FRAME
    ` +
    `
        A=A-1
        `.repeat(num) + 
    `
        D=M
        `
     return codeMinusN
    }
    writeReturn() {
      
        let code = `
        // return
        // FRAME = LCL
        @LCL
        D=M
        @FRAME
        M=D

        // RET = * (FRAME - 5)
        ${this.putIntoDAddressOfFrameMinus(5)}
        @RET
        M=D

        // *ARG = pop()
        @SP
        M=M-1
        A=M
        D=M
        @ARG
        A=M
        M=D

        // SP = ARG+1
        @ARG
        D=M
        @SP
        M=D+1

        // THAT=*(FRAME-1) restore THAT of calling function
        ${this.putIntoDAddressOfFrameMinus(1)}
        @THAT
        M=D

        // THIS=*(FRAME-2) restore THIS of calling function
        ${this.putIntoDAddressOfFrameMinus(2)}
        @THIS
        M=D
        // ARG=*(FRAME-3) restore ARG of calling function
        ${this.putIntoDAddressOfFrameMinus(3)}
        @ARG
        M=D
        // LCL=*(FRAME-4) restore LCL of calling function
        ${this.putIntoDAddressOfFrameMinus(4)}
        @LCL
        M=D

        // goto RET  GOTO the return-address
        @RET
        0;JMP
        `
        this.fileStream.write(code)
    }



    codeForPointer(isTypePopOrPush, segment, index) {
        const indexToSegmentLabel = { 0: "THIS", 1: "THAT" }
        let code;
        switch (isTypePopOrPush) {
            case "pop":
                code = `
        // pop pointer ${index} (${indexToSegmentLabel[index]})
        @SP
        M=M-1
        A=M
        D=M
        @${indexToSegmentLabel[index]}
        M=D
                `
                break;
            case "push":
                code = `
        // push pointer ${index} (${indexToSegmentLabel[index]})
        @${indexToSegmentLabel[index]}
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1
                `
                break;
        }
        return code;
    }

    codeForStatic(isTypePopOrPush, segment, index) {
        let code;
        switch (isTypePopOrPush) {
            case "push":
                code = `
        // push static ${index}
        @${this.getFileName()}.${index}
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1
                `
                break;
            case "pop":
                code = `
        // pop static ${index}
        @SP
        M=M-1
        A=M
        D=M
        @${this.getFileName()}.${index}
        M=D
                `

                break;
        }
        return code
    }

    codeForPopPushLocalOrArgumentOrThisOrThatOrTemp(isTypePopOrPush, segment, index) {
        const segments = { local: `LCL
        D=M
        `, argument: `ARG
        D=M
        `, this: `THIS
        D=M`, that: `THAT
        D=M
        `, temp: `5
        D=A
        ` };
        const baseDPlus1 = `
        D=D+1
        `;
        const DPlus1 = baseDPlus1.repeat(index);
        let code;
        switch (isTypePopOrPush) {
            case "push":
                code = `
        // push ${segment} ${index}
        @${segments[segment]}
        ${DPlus1}
        A=D
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1
                `
                break;
            case "pop":
                code = `
        // pop ${segment} ${index}
        @SP
        M=M-1
        @${segments[segment]}
        ${DPlus1}
        @13
        M=D
        @SP
        A=M
        D=M
        @13
        A=M
        M=D
        @13
        M=0
                `
                break;
        }
        return code
    }
    codeForConstant(isTypePopOrPush, segment, index) {
        if (isTypePopOrPush !== "push") {
            throw new Error("pop constant i is an invalid command (popping constant) because where is nothing to pop since i is a number, not an index of some storage in memory... or something like that")
        }
        const code = `
        // ${isTypePopOrPush} ${segment} ${index}
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