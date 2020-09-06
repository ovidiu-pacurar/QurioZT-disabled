const fs = require('fs');
const path = require('path');
const ut = require('./utility');

const command = (process.argv[2] || 'exclude');

if (command === 'exclude') commandExclude();
if (command === 'wordcloud') commandWordcloud();
if (command === 'graph') commandGraph();

function commandGraph() {
  const fileA = (process.argv[3] || './data/Covid19Radar.words');
  const fileB = (process.argv[4] || './data/dotnet.words');
  const fileC = (process.argv[5] || './data/Covid19Radar.connections');

  const extensionA = path.extname(fileA);
  const extensionB = path.extname(fileB);
  const fileNameA = path.basename(fileA, extensionA);
  const fileNameB = path.basename(fileB, extensionB);

  const fileOut = `${path.dirname(fileA)}/${fileNameA}_tech_${fileNameB}.graph.json`;

  console.log(`Executing: ${command} -> ${fileOut}`);
  const business = ut.readJSON(fileA);
  const tech = ut.readJSON(fileB);
  const connections = ut.readJSON(fileC);
  const graph = generateGraph(business, tech, connections);
  fs.writeFileSync(fileOut, JSON.stringify(graph, null, 2));  
}


function commandExclude() {
  const fileA = (process.argv[3] || './data/Covid19Radar.words');
  const fileB = (process.argv[4] || './data/dotnet.words');

  const extensionA = path.extname(fileA);
  const extensionB = path.extname(fileB);
  const fileNameA = path.basename(fileA, extensionA);
  const fileNameB = path.basename(fileB, extensionB);

  const fileOut = `${path.dirname(fileA)}/${fileNameA}_exclude_${fileNameB}${extensionA}`;

  console.log(`Executing: ${command} -> ${fileOut}`);
  const dictionaryA = ut.readJSON(fileA);
  const dictionaryB = ut.readJSON(fileB);
  const dictionaryOut = substract(dictionaryA, dictionaryB);  
  fs.writeFileSync(fileOut, JSON.stringify(dictionaryOut, null, 2));  
}


function commandWordcloud() {
  const file = (process.argv[3] || './data/Covid19Radar_exclude_dotnet.words');

  const extension = path.extname(file);
  const fileName = path.basename(file, extension);
  

  const fileOut = `${path.dirname(file)}/${fileName}.wordcloud`;

  console.log(`Executing: ${command} -> ${fileOut}`);
  const dictionary = ut.readJSON(file);
  const normalizedOut = dictionaryToNormalizedWordCloud(dictionary, 12);  
  fs.writeFileSync(fileOut, normalizedOut);
}



function substract(A, B) {
  const result = {};
  for (let a in A) {
    if (!B[a]) result[a] = A[a];
  }  
  return result;
}

function dictionaryToNormalizedWordCloud(A, maxSize) {
  const lines = [];
  let maxCount = 0;

  for (let word in A) {
    if (A[word].count > maxCount) maxCount = A[word].count;
  }
  const scaleFactor = maxCount / maxSize;  
  for (let word in A) {
    lines.push(`${Math.ceil(A[word].count / scaleFactor)} ${word}`);
  }
  const res = lines.join('\r\n');
  return res;
}


function generateGraph(business, tech, connections) {
  const maxScore = 10000;
  const minTechScore = 9990;

  const graph = {
    nodes: [],
    edges:[]
  };

  let i = 0;

  for (let w in business) {
    graph.nodes.push(
      {
        id: w,
        //label: `${w}: ${words[w].count}`,
        label: w,
        //x: 100 * Math.cos(2 * i * Math.PI / wordCount),
        //y: 100 * Math.sin(2 * i * Math.PI / wordCount),
        x: 100 * Math.cos(i),
        y: 100 * Math.sin(i*3),
        //x: 100 * Math.random(),
        //y: 100 * Math.random(),
        businessFrequency: business[w].count,
        businessScore: 0,
        techFrequency: tech[w] ? tech[w].count : 0,
        techScore:0,
        size: business[w].count,
        edgeCount: 0
      },
    );    
    i++;
  }
  // compute business score
  let businessNodes = graph.nodes.filter(n=> n.techFrequency == 0);
  let nodeCount = businessNodes.length;
  let scaleFactor = maxScore / nodeCount;

  businessNodes.forEach((n, i) => {
    n.businessScore = Math.ceil((nodeCount - i) * scaleFactor);
    n.size = n.businessScore;
  });
  //
  // compute tech score
  let techWordList = [];

  for (var w in tech) {
    techWordList.push({word: w, count: tech[w].count});
  }

  nodeCount = techWordList.length;
  scaleFactor = maxScore / nodeCount;
  techWordList = techWordList.sort((a, b) => b.count - a.count);

  techWordList.forEach((n, i) => {
    tech[n.word].techScore = Math.ceil((nodeCount - i) * scaleFactor);
  });

  graph.nodes.forEach(n => {
    if (tech[n.id]) {
      n.techScore = tech[n.id].techScore;
    }
  });
  //
  // resize nodes with scores, add color
  graph.nodes.forEach(n => {
    if (n.businessScore) {
      n.size = 2 * n.businessScore;
      n.color = '#FF0000'
    }
    if (n.techScore) {
      n.size = n.techScore;
      n.color = '#0000FF'
    }
   
  });
  // filter out Tech nodes with Tech score bellow minTechScore
  graph.nodes = graph.nodes.filter(n => n.techScore >= minTechScore || n.businessScore > 0);
  // Add edges
  for (let c in connections) {
    let con = connections[c];
    const size = con.levels.name;
    if ((business[con.source] || business[con.target]) && size > 0) {
      if (!tech[con.source] || !tech[con.target]) { // exclude tech to tech connections
        // check if source is in nodes
        const sourceInNodes = graph.nodes.filter(n => n.id === con.source).length > 0;
        const targetInNodes = graph.nodes.filter(n => n.id === con.target).length > 0;
        if (sourceInNodes && targetInNodes) {
          //increment egde count on nodes
          graph.nodes.filter(n => n.id === con.source || n.id === con.target).forEach(n => n.edgeCount++);
          graph.edges.push({
            id: c,
            source: con.source,
            target: con.target,
            label: size,
            size: size
          });
        }
      }
    }
  }


 
  // filter out nodes without edges
  graph.nodes = graph.nodes.filter(n => n.edgeCount > 0);

  return graph;
}

function newGraphNode(word, count, color) {
  return {
    id: word,
    //label: `${w}: ${words[w].count}`,
    label: word,
    //x: 100 * Math.cos(2 * i * Math.PI / wordCount),
    //y: 100 * Math.sin(2 * i * Math.PI / wordCount),
    x: 100 * Math.random(),
    y: 100 * Math.random(),
    size: count,    
    color: color,
    edgeCount: 0
  };
}