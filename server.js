const express = require('express');
const glob = require('glob');
const app = express();

app.use(express.static('./'));

app.get('/getGraphFiles', (req, res) => {
  glob('data/*.graph.json', {}, (err, files) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(files, null, 2));
  });
});

app.listen(3000, () => console.log('Graph app listening on port 3000!'));