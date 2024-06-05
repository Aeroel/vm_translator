const VMCleaner = require('./VMCleaner').default
const fsProm = require('node:fs/promises');
class Parser {
  commandTypesThatHaveArg2 = ['push', 'pop', 'call', 'function']
  arithmeticCommands = ["add", "sub", "neg", "eq", "gt", "lt", "and", "or", "not"]
  commands = []
  currentCommandIndex = 0
  currentCommand = null
  constructor(filePath) {
    this.init(filePath)
  }
  async init(filePath) {
    if (!filePath) {
      throw new Error("Please provide a filePath")
    }

    let fileContents

    try {
      if (debug) {
        console.log(`Reading ${filePath} `)
      }
      fileContents = await fsProm.readFile(filePath, { encoding: 'utf8' });
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
      console.log(cleanedUpVMCode)
    }
    const VMCommandsArray = cleanedUpVMCommandsString.split('\n')
    this.commands = VMCommandsArray
    this.currentCommand = this.commands[this.currentCommandIndex]


  }
  hasMoreCommandsLeftToProcess() {
    return (this.currentCommandIndex < (this.commands.length))
  }
  advanceToNextCommand() {
    this.currentCommandIndex++
    this.currentCommand = this.commands[this.currentCommandIndex]
  }
  commandType() {
    const currentCommandParts = this.currentCommand.split(' ')

    if(this.arithmeticCommands.includes(currentCommandParts[0])) {
      return "arithemtic"
    }

    if(currentCommandParts[0] === "push") {
      return "push"
    }

    if(currentCommandParts[0] === "pop") {
      return "pop"
    }

  }
  arg1() {
    if(this.commandType === 'arithmetic') {
      const currentCommandParts = this.currentCommand.split(' ')
      // will return whatever the arithmetic command is (add, sub or whatever it may happen to be)
      return currentCommandParts[0]
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
    return (this.commandTypesThatHaveArg2.includes(this.commandType))
  }
}

module.exports = Parser