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
        @${this.getFileName() + ":" + label}
        D;JGT
        `
        this.fileStream.write(code)
    }
    writeGoto(label) {
        let code = `
        // goto ${label}
        @${this.getFileName() + ":" + label}
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
        const returnIndex = this.provideAvailableIndex("return")
        const returnAddress = functionName + ".return." + returnIndex
        const arg0Loc = `D=D-1`.repeat(amountOfArgVars)
        let code = `
        // call ${functionName} ${amountOfArgVars}
        @SP
        D=M
        ${arg0Loc}
        // D now contains the local ARG, store it
        @localArg
        M=D
        // save old arg
        
        @ARG
        D=M
        @oldArg
        M=D
        // set local arg
        @localArg
        D=M
        @ARG
        M=D

        // store return address
        @${returnAddress}
        D=A
        @SP
        A=M
        M=D
        @SP
        M=M+1

        // save caller's LCL
        @LCL
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1

        // save caller's ARG
        @oldArg
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1

        // save caller's THIS
        @THIS
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1

        // save caller's THAT
        @THAT
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1



        (${returnAddress})
        `
        this.fileStream.write(code)
    }
    writeFunction(functionName, amountOfLocalVars) {
        const pushLocal0= `
        @SP
        A=M
        M=0
        @SP
        M=M+1
        `.repeat(amountOfLocalVars)
        let code = `
        // function ${functionName} ${amountOfLocalVars}
        // set LCL to SP
        @SP
        D=M
        @LCL
        M=D
        ${pushLocal0}

        `
        this.fileStream.write(code)
    }

    writeReturn() {
        let code = `
        // return
        // first of all, get the return value and put it into local *ARG
        @SP
        A=M-1
        D=M
        @ARG
        A=M
        M=D

        // Okay, here we don't need the callee's SP or ARG anymore, so we might as well restore the SP it to the caller's SP now
        @ARG
        D=M+1
        @SP
        M=D

        // now, we set a reference point from which we can access caller's THAT, THIS, ARG and LCL.
        // the reference is just callee's LCL
        @LCL
        D=M
        @referencePoint
        M=D

        // let's store the return address, we will use it at the end
        // it's located in referencePoint-5
        @5
        D=A
        @referencePoint
        D=M-D
        A=D
        D=M
        @returnAddress
        M=D

        // Now we can restore the caller's THAT, THIS, ARG and LCL
        
        // repP - 1 is THAT
        @referencePoint
        D=M-1
        A=D
        D=M
        @THAT
        M=D
        
        // THIS is refP -2
        @2
        D=A
        @referencePoint
        D=M-D
        A=D
        D=M
        @THIS
        M=D
        
        // ARG is refP - 3
        @3
        D=A
        @referencePoint
        D=M-D
        A=D
        D=M
        @ARG
        M=D
        // LCL is refP - 4
        @4
        D=A
        @referencePoint
        D=M-D
        A=D
        D=M
        @LCL
        M=D

        // Okay, now we have restored everything to the caller's state, we can jump to the return address and exit the function
        @returnAddress
        A=M
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
        const segments = {
            local: `LCL
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