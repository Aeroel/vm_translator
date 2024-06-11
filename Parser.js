const VMCleaner = require('./VMCleaner')
const fs = require('node:fs');

class Parser {
  commandTypesThatHaveArg2 = ['push', 'pop', 'call', 'function']
  arithmeticCommands = ["add", "sub"]
  negOrNotCommands = [ "neg", "not"]
  andOrOrCommands = ["and", "or"]
  comparisonCommands = ["eq", "gt", "lt",]
  commands = []
  currentCommandIndex = 0
  currentCommand = null
  constructor(filePath) {
 if (!filePath) {
      throw new Error("Please provide a filePath")
    }

    let fileContents

    try {
      if (debug) {
        console.log(`Reading ${filePath} `)
      }
      fileContents = fs.readFileSync(filePath, { encoding: 'utf8' });
      if (debug) {
        console.log(`Showing contents below:`);
        console.log(fileContents);
      }
    } catch (err) {
      console.log(err);
    }
    const cleanedUpVMCommandsString = VMCleaner(fileContents)
    if (debug) {
      console.log("Cleaned up VM Code: ")
      console.log(cleanedUpVMCommandsString)
    }
    const VMCommandsArray = cleanedUpVMCommandsString.split('\n')
    this.commands = VMCommandsArray
    this.currentCommand = this.commands[this.currentCommandIndex]
  }
  hasMoreCommandsLeftToProcess() {
    if(debug) {
      console.log(this.commands);
    }
    return (this.currentCommandIndex < (this.commands.length))
  }
  advanceToNextCommand() {
    this.currentCommandIndex++
    this.currentCommand = this.commands[this.currentCommandIndex]
  }
  commandType() {
    const currentCommandParts = this.currentCommand.split(' ')
    if(debug) {
      console.log("currentCommandParts: " +currentCommandParts);
    }

    if(this.arithmeticCommands.includes(currentCommandParts[0])) {
      return "arithmetic"
    }
    if(this.andOrOrCommands.includes(currentCommandParts[0])) {
      return "andOrOr"
    }
    if(this.negOrNotCommands.includes(currentCommandParts[0])) {
      return "negOrNot"
    }
    if(this.comparisonCommands.includes(currentCommandParts[0])) {
      return "comparison"
    }
    if(currentCommandParts[0] === "push") {
      return "push"
    }
    if(currentCommandParts[0] === "pop") {
      return "pop"
    }
    if(currentCommandParts[0] === "label") {
      return "label"
    }
    if(currentCommandParts[0] === "goto") {
      return "goto"
    }
    if(currentCommandParts[0] === "if-goto") {
      return "if"
    }
    if(currentCommandParts[0] === "call") {
      return "call"
    }
    if(currentCommandParts[0] === "function") {
      return "function"
    }    
    if(currentCommandParts[0] === "call") {
      return "goto"
    }
    if(currentCommandParts[0] === "return") {
      return "return"
    }

  }
  arg1() {
    const currentCommandParts = this.currentCommand.split(' ')
    if(debug) {
      console.log("Arg1: Command parts:  " + currentCommandParts);
      console.log("Comtype: " + this.commandType());
    }
    if(this.commandType() === 'return') {
      throw new Error("Parser.arg1() called on command of type \"return\"")
    }
    if(this.commandType() === 'arithmetic' || this.commandType() === "andOrOr" || this.commandType() === "negOrNot" || this.commandType() === "comparison") {
      
      // will return whatever the arithmetic command is (add, sub or whatever it may happen to be)
      return currentCommandParts[0]
    } else {
      return currentCommandParts[1]
    }
  }
  arg2() {
    // if the command type isn't one specified in the array above, it will not have argument 2, so it thus cannot be accessed... And I guess if someone tries to access argument 2 on a command which is neither push, pop, call or function this is likely an error, thus the error throw
    if(!this.commandHasArg2()) {
        throw new Error("arg2() called on a command which is not of type push, pop, call or function")
    }
    const currentCommandParts = this.currentCommand.split(' ')
    return currentCommandParts[2]
  }

  commandHasArg2() {
    return (this.commandTypesThatHaveArg2.includes(this.commandType()))
  }
}

module.exports = Parser