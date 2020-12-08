const fs = require('fs');
var p = JSON.parse(fs.readFileSync("./storage.json"));

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

for (let i=0; i<p.boxes.length; i++) {
	p.boxes[i].selectable = true;
}

fs.writeFileSync("./storageFixed.json", JSON.stringify(p));