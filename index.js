// https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide
const fs = require('fs');
const vsctm  = require('vscode-textmate');
const oniguruma = require('oniguruma');

/**
 * Utility to read a file as a promise
 */
function readFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (error, data) => error ? reject(error) : resolve(data));
  })
}
/**
 * Utility to remove elements from array
 */
function arrayRemove(arr, value) { return arr.filter(function (ele) { return ele != value; }); }
/**
 * Utility to remove irellevant scopes from token, for better readability in console.log
 */
function cleanScopes(scopes) {
  var res = scopes;
  res = arrayRemove(res, 'source.json');
  res = arrayRemove(res, 'meta.structure.dictionary.json');
  res = arrayRemove(res, 'meta.structure.dictionary.value.json');
  //res = arrayRemove(scopes, 'source.json');
  return res;
}

// Create a registry that can create a grammar from a scope name.
const registry = new vsctm.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
    createOnigString: (str) => new oniguruma.OnigString(str)
  }),
  loadGrammar: (scopeName) => {
    if (scopeName === 'source.json') {      
      return readFile('./JSON.tmLanguage.json').then(data => vsctm.parseRawGrammar(data.toString(), './JSON.tmLanguage.json'))
    }
    console.log(`Unknown scope name: ${scopeName}`);
    return null;
  }
});

// Load the JSON grammar and any other grammars included by it async.
registry.loadGrammar('source.json').then(grammar => {
  const text = [
    `{`,
    `   "number" : 123,`,
    `"string":"test value",`,
    `"object-prop":{"sdf":4},`,
    `"list":[4,5,"67"],`,
    `}`
  ];
  let ruleStack = vsctm.INITIAL;
  let objectPath = [];
  let propertyName = '$';
  
  const rootNode = {
    name : "$",
    startIndex : 0,
    endIndex : text.length-1,
    text : text,
    scopes :["source.json", "root.source.json"],
    children : [],
    parent: null,
    path : "$"
  }
  let node = null;

  for (let i = 0; i < text.length; i++) {
    const line = text[i];
    const lineTokens = grammar.tokenizeLine(line, ruleStack);
    console.log(`\n\rLINE ${i}: ${line}`);
    for (let j = 0; j < lineTokens.tokens.length; j++) {
      const token = lineTokens.tokens[j];
      const tokenText = line.substring(token.startIndex, token.endIndex);      
      //console.log(JSON.stringify(token));      
      if (token.scopes.includes('punctuation.definition.dictionary.begin.json')) {
        if (node) {
          node = {
            name: propertyName,
            startIndex: 0,
            endIndex: text.length - 1,
            text: text,
            scopes: ["source.json", "root.source.json"],
            children: [],
            path:node.path+"."+propertyName,
            parent: node
          }
        } else {
          node = rootNode;
        }        
        objectPath.push(propertyName);
      }
      if (token.scopes.includes('punctuation.definition.dictionary.end.json')) {        
        objectPath.pop();
        node = node.parent;
      }
      if (token.scopes.includes('punctuation.support.type.property-name.begin.json')) {
        objectPath.push(propertyName);
      }
      if (token.scopes.includes('punctuation.separator.dictionary.pair.json')) {
        objectPath.pop();
      }
      if (token.scopes.includes('support.type.property-name.json') &&
        !(token.scopes.includes('punctuation.support.type.property-name.begin.json') || token.scopes.includes('punctuation.support.type.property-name.end.json'))) {
        propertyName = tokenText;
      }
      
      console.log(`    (${tokenText}) - token from ${token.startIndex} to ${token.endIndex} ` +
        `\r\n        NODE ${node.path}` +
        `\r\n        PATH ${objectPath.join('.')}`+
        `\r\n        ${cleanScopes(token.scopes).join(',\r\n        ')}`
      );
    }
    ruleStack = lineTokens.ruleStack;
  }
});

