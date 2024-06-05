function VMCleaner(myStr, debug) {
    if (debug) console.log("removed all comments")
    myStr = removeComments(myStr)
    if (debug) console.log(myStr)
  
    myStr = removeWhitespaceExceptNewlines(myStr)
    if (debug) console.log("remove all whitespace except new lines");
    if (debug) console.log(myStr)
  
    if (debug) console.log("removed all new lines, added them back in as separators of commands ");
    myStr = removeAllNewlinesAndAddThemBackInAsCommandSeparators(myStr)
    if (debug) {
      console.log("Final result:");
      console.log(myStr)
    }
    return myStr
  }
  
  
  function removeWhitespaceExceptNewlines(inputString) {
    return inputString.replace(/[^\S\n]/g, '');
  }
  
  function removeComments(inputString) {
    // for some reason regexLin works in android termux, and I assume on linux,
    // and I assume that the regexWin works on windows, because when I tried the first one, 
    // it didn't, but with \r  it does 
    const commentRegexLin = /\/\/(.*?)\n/gi;
    inputString = inputString.replace(commentRegexLin, "\n");
  
    const commentRegexWin = /\/\/(.*?)\r\n/gi;
    inputString = inputString.replace(commentRegexWin, "\r\n");
  
    return inputString
  }
  
  /* example usage:
  input = "\n\n\n\n\n\n\ntext\n\n\n\n\n\nanother Text\n\n\n\n\n\n\nmore Text\n\n\n\n\n\n\nanotherText2";
  output = "text\nanother Text\nmore Text\nanoterText2"
  */
  function removeAllNewlinesAndAddThemBackInAsCommandSeparators(inputString) {
    const lines = inputString.split('\n');
    const linesWithoutNewlines = [];
  
    let trimmedLine
    for (const line of lines) {
      trimmedLine = line.trim()
      if (trimmedLine !== '') {
        linesWithoutNewlines.push(trimmedLine);
      }
    }
    const linesWithNewlineSeparators = linesWithoutNewlines.join('\n');
    return linesWithNewlineSeparators
  }

  module.exports = VMCleaner