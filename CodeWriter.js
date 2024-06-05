class CodeWriter {
    fileStream = null
    constructor(outputFilePath) {
        // "w" flag overwrites the file, if it exists, effectively deleting it before writing into it
        this.fileStream = fs.createWriteStream(filePath, { flags: 'w' });
    }

    asmPart(name) {
        let asmInstr = null
        switch (name) {
            case "put the value of *SP-1 and *SP-2 to D and M respectively":
            asmInstr = `
            // put the value of *SP-1 to D and *SP-2 to M
            @SP
            A=M
            A=A-1
            D=M
            A=A-1
            
            `
            break
            
            case "SP=SP-2 then put content of D into *SP":
                            
            asmInstr = `
                // SP = SP - 2
                @SP
                M=M-1
                M=M-1
                // and don't forget to put the value of the add (which is now stored in D) to the place in the stack where the first add operand was located
                @SP
                A=M
                M=D

                `
            break
        }
        return asmInstr
    }

    // command can be either "add", "sub", "neg", "eq", "gt", "lt", "and", "or" and "not"
    writeArithmetic(command) {
        let code = null
        switch (command) {
            case "add":
                code = `
                        // add
                            ${this.asmPart("put the value of *SP-1 and *SP-2 to D and M respectively")}

                            // the actual add operation
                            D=D+M
                            
                            ${this.asmPart("SP=SP-2 then put content of D into *SP")}

                `
                break
            case "sub":
                code = `
                            // sub
                                ${this.asmPart("put the value of *SP-1 and *SP-2 to D and M respectively")}
                                
                                // the actual sub operation
                                D=D-M
                                
                                ${this.asmPart("SP=SP-2 then put content of D into *SP")}

        `
                break;
        }
        this.fileStream.write(code)
    }
    writePushPop(isTypePushOrPop, segment, index) {
        let code
            if(segment === "constant") {
                if(isTypePushOrPop !== "push") {
                    throw new Error("pop constant i is an invalid command (popping constant)")
                }
                code = `
                // *SP = index
                @${index}
                D=A
                @SP
                M=D

                `
            }
        this.fileStream.write(code)
    }
    close() {
        this.fileStream.end(() => {
            if(debug) {
            console.log("CodeWriter successfully closed the outFile stream.")
            }
        })
    }
}

module.exports = CodeWriter