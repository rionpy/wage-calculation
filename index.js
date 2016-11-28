var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use('/vendor', express.static('node_modules'));

// views is directory for all template files
app.set('views', __dirname + '/node_views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.use(function(request, response) {
	response.send("four oh four");
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
