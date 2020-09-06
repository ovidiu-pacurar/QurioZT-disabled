// https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide
const fs = require('fs');
const path = require('path');
const vsctm = require('vscode-textmate');
const oniguruma = require('oniguruma');
const glob = require('glob');
const readline = require('readline');
const ut = require('./utility');


//const targetDirectory = (process.argv[2] || 'c:/Code/Covid19Radar');// +'/src/Covid19Radar.Background';
const targetDirectory = (process.argv[2] || 'c:/code/dotnet/runtime/src/coreclr/src/System.Private.CoreLib/src/System/Reflection/');// +'/src/Covid19Radar.Background';
const baseFileName = path.basename(targetDirectory);
const filePattern = '/**/*.cs';
const ignoreFileExtensions = ['.designer.cs', 'BinaryFormatterTestData.cs'];


const curiosityNames = {};
const curiosityWords = {};
const curiosityConnections = {};

function cleanScopes(scopes) {
  var res = scopes;
  res = ut.arrayRemove(res, 'source.cs');
    
  return res;
}


function isName(scopes) {
  return scopes.filter(scope => scope.startsWith('entity.name')).length > 0;    
}


function addConnections(level, words) {
  for (let i = 0; i < words.length - 1; i++) {
    let source = words[i];
    for (let j = i + 1; j < words.length; j++) {
      let target = words[j];

      if (source !== target) {
        const first = smallWord(source, target);
        const second = bigWord(source, target);

        const connectionId = `${first} -> ${second}`;

        if (!curiosityConnections[connectionId]) {
          curiosityConnections[connectionId] = {
            source: first,
            target: second,
            levels: {}
          };
        }

        const connection = curiosityConnections[connectionId];
        if (!connection.levels[level]) {
          connection.levels[level] = 0;
        }
        connection.levels[level]++;
      }
    }
  }
}

function smallWord(a, b) {
  if (a < b) return a;
  return b;
}

function bigWord(a, b) {
  if (a > b) return a;
  return b;
}

function addNameToDictionary(dic, name, file, line, char) {
  try {
    if (name == 'constructor') {
      name = '_constructor_'
    }
    if (name == 'toString') {
      name = '_toString_'
    }
    if (!dic[name]) {
      dic[name] = {
        count: 0 // []
      };
    }
    let dicEntry = dic[name];
    file = ut.getRelativeFilePath(file, targetDirectory);
    //let instanceAddress = `${file} | ln: ${line}, ch: ${char}`;
    dicEntry.count++;//.push(instanceAddress);
  } catch (e) {
    console.error(`Could not add name to dictionary: ${name}`);
    //console.error(e);
  }
}

function addWordToDictionary(dic, word, file, line, char, token) {
  try {
    word = word.toLowerCase();
    if (word == 'constructor') {
      word='_constructor_'
    }
    if (!dic[word]) {
      dic[word] = {
        count: 0// []
      };
    }
    let dicEntry = dic[word];
    file = ut.getRelativeFilePath(file, targetDirectory);
    //let instanceAddress = `${file} | ln: ${line}, ch: ${char} | token: ${token}`;
    dicEntry.count++;//.push(instanceAddress);
  } catch (e) {
    console.error(`Could not add word to dictionary: ${word}`);
    //console.error(e);
  }
}

// Create a registry that can create a grammar from a scope name.
const registry = new vsctm.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
    createOnigString: (str) => new oniguruma.OnigString(str)
  }),
  loadGrammar: (scopeName) => {
    if (scopeName === 'source.json') {
      return ut.readFile('./languages/JSON.tmLanguage.json').then(data => vsctm.parseRawGrammar(data.toString(), './languages/JSON.tmLanguage.json'))
    }
    if (scopeName === 'source.cs') {
      return ut.readFile('./languages/csharp.tmLanguage.json').then(data => vsctm.parseRawGrammar(data.toString(), './languages/csharp.tmLanguage.json'))
    }
    console.log(`Unknown scope name: ${scopeName}`);
    return null;
  }
});

// Load the JSON grammar and any other grammars included by it async.
registry.loadGrammar('source.cs').then(grammar => {  
  glob(targetDirectory + filePattern, {}, (err, files) => {
    const filePromises = [];
    files.forEach(file => {
      if (!ut.isFileExtensionInList(file, ignoreFileExtensions)) {
        filePromises.push(processLineByLine(file, grammar));
      }
    });
    Promise.all(filePromises).then(() => {
      console.log('Writing curiosity files');
      //fs.writeFileSync(targetDirectory + '/curiosity.names', JSON.stringify(curiosityNames, null, 2));
      const sortedWords = ut.sortProperties(curiosityWords, (a,b) => b.value.count - a.value.count);
      fs.writeFileSync(targetDirectory + `/${baseFileName}.words`, JSON.stringify(sortedWords, null, 2));
      fs.writeFileSync(targetDirectory + `/${baseFileName}.connections`, JSON.stringify(curiosityConnections, null, 2));
      let wordCloud = [];      
      for (var word in curiosityWords) {
        //wordCloud.push({ word, count: curiosityWords[word].instances.length});        
        wordCloud.push({ word, count: curiosityWords[word].count});        
      }
      wordCloud = wordCloud.sort((a, b) => b.count - a.count);
      const maxSize = wordCloud[0].count;
      const scaleFactor = maxSize / 12;
      let normalizedWordCloudLines = wordCloud
        .map(i => {
          return `${Math.ceil(i.count / scaleFactor)} ${i.word}`
        });
      let wordCloudLines = wordCloud
        .map(i => {
          return `${i.count} ${i.word}`
        }); 
      fs.writeFileSync(targetDirectory + `/${baseFileName}.wordcloud`, wordCloudLines.join('\r\n'));
      fs.writeFileSync(targetDirectory + `/${baseFileName}.normalizedwordcloud`, normalizedWordCloudLines.join('\r\n'));      
    });
  })  
});

function processLineByLine(filePath, grammar) {
  console.log(filePath);
  //const inputStream = fs.createReadStream(filePath);
  const inputText = fs.readFileSync(filePath, 'UTF-8');
  //const linesStream = fs.createWriteStream(filePath + '.lines');
  //const tokensStream = fs.createWriteStream(filePath + '.tokens');
  //const stripStream = fs.createWriteStream(filePath + '.strip');
  //const splitStream = fs.createWriteStream(filePath + '.split');

  //let namesDic = {};
  //let wordsDic = {};

  let ruleStack = vsctm.INITIAL;
  let lineIndex = 0;
  //linesStream.write('[');
  //tokensStream.write('[');

  //const rl = readline.createInterface({
  //  input: inputStream,
  //  crlfDelay: Infinity
  //});  
  const lines = inputText.split(/\r?\n/);
  const fileWords = [];
//  for (const line of rl) {
  lines.forEach(line => {
    const lineTokens = grammar.tokenizeLine(line, ruleStack);
    const lineWords = [];
    const lineOutput = {
      index: lineIndex,
      text: line,
      tokens: []
    };

    for (let j = 0; j < lineTokens.tokens.length; j++) {
      const token = lineTokens.tokens[j];
      const tokenText = line.substring(token.startIndex, token.endIndex);      

      if (isName(token.scopes)) {
        //stripStream.write(tokenText);
        //addNameToDictionary(namesDic, tokenText, filePath, lineIndex + 1, token.startIndex + 1);
        //addNameToDictionary(curiosityNames, tokenText, filePath, lineIndex + 1, token.startIndex + 1);

        const nameWords = [];

        const separatedName = ut.separateNameByUpperCase(tokenText);
        //splitStream.write(splitName);
        ut.splitByNonAlphabet(separatedName).forEach(word => {
          //addWordToDictionary(wordsDic, word, filePath, lineIndex + 1, token.startIndex + 1, tokenText);
          addWordToDictionary(curiosityWords, word, filePath, lineIndex + 1, token.startIndex + 1, tokenText);
          nameWords.push(word.toLowerCase());
        });
        addConnections('name', nameWords);
        lineWords.push(...nameWords);
      } else {
        //stripStream.write(' '.repeat(tokenText.length));
        //splitStream.write(' '.repeat(tokenText.length));
      }
      lineOutput.tokens.push({
        text: tokenText,
        startIndex: token.startIndex,
        endIndex: token.endIndex,
        scopes: cleanScopes(token.scopes)
      });      
    }
    addConnections('line', lineWords);
    fileWords.push(...lineWords);
    //tokensStream.write(JSON.stringify(lineOutput, null, 2));
    //tokensStream.write(',\r\n');

    ruleStack = lineTokens.ruleStack;

    //linesStream.write(JSON.stringify(line));

    //linesStream.write(',\r\n');

    //stripStream.write('\r\n');
    //splitStream.write('\r\n');

    lineIndex++;
  });
  addConnections('file', fileWords);
  //fs.writeFileSync(filePath + '.names', JSON.stringify(namesDic, null, 2));
  //fs.writeFileSync(filePath + '.words', JSON.stringify(wordsDic, null, 2));

  //linesStream.write(']');
  //tokensStream.write(']');
  //linesStream.end();
  //tokensStream.end();
  //inputStream.end();
  //stripStream.end();
  //splitStream.end();
}




