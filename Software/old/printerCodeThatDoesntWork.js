const pngString = require('console-png');
const jimp = require('jimp');
const printer = require('printer');

/*
IMAGE MANIP STUFF
*/

//Ex: printImagesFromFolder("./testImages");
const printImagesFromFolder = (dir, h) => {
	return new Promise((resolve, reject) => {
		let allowedFormats = ["jpg", "png"];

		let finalList = [];
		fs.readdir(dir, (err, files) => {
			for (let i=0; i<files.length; i++) {
				let file = files[i];

				for (let j=0; j<allowedFormats.length; j++) {
					let fExtension = file.substring(file.lastIndexOf("."));
					if (fExtension.indexOf(allowedFormats[j]) > -1) {
						finalList.push(file); //matches ok extension so we good
						break;
					}
				}
			}

			if (finalList.length > 0) {
				printN(0);
			} else {
				return resolve();
			}
		});

		function printN(n) {
			console.log("Printing image '"+finalList[n]+"'");
			printImage(path.join(dir,finalList[n]), h).then(() => {
				if (n < finalList.length-1) {
					n++;
					printN(n); //recursion gang
				} else {
					return resolve();
				}
			})
		}
	})
}

const printImage = (dir, h) => {
	if (typeof h == "undefined") {
		h = 100;
	}
	return new Promise((resolve, reject) => {
		jimp.read(fs.readFileSync(dir)).then(image => {
			image.resize(jimp.AUTO, 100);
			image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
				pngString(buffer, function(err, string) {
					if (err) throw err;
					console.log(string);
					return resolve();
				})
			})
		})
	})
}

//Ex: printImageBuffer(fs.readFileSync("testPrint.png"), 30);
const printImageBuffer = (imgBuf, h) => {
	if (typeof h == "undefined") {
		h = 100;
	}
	return new Promise((resolve, reject) => {
		jimp.read(imgBuf).then(image => {
			image.resize(jimp.AUTO, h);
			image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
				pngString(buffer, function(err, string) {
					if (err) throw err;
					console.log(string);
					return resolve();
				})
			})
		})
	})
}

const convertImageToEMF = dir => {
	return new Promise((resolve, reject) => {
		let child = cp.exec("magick convert "+dir+" "+"./temp.emf")
		child.stdout.on('data', data => {
			console.log("data get!");
		})
		child.stderr.on('data', data => {
			console.log("err get :(");
			return reject(data);
		})
		child.on('close', () => {
			let buf = fs.readFileSync("./temp.emf");
			//fs.unlinkSync("./temp.emf"); //remove file
			return resolve(buf);
		})
	})
}



/*
PRINTER STUFF
*/

const getPrimaryPrinter = () => {
	return new Promise((resolve, reject) => {
		const printerExcludes = ["microsoft", "onenote", "fax"];
		let list = printer.getPrinters();
		let finalList = [];
		for (let i=0; i<list.length; i++) {
			let bad = false;
			for (let j=0; j<printerExcludes.length; j++) {
				let pName = list[i].name.toLowerCase(); //was j too chunky of a oneliner lol
				if (pName.indexOf(printerExcludes[j]) >= 0) {
					bad = true;
					break;
				}
			}

			if (!bad) {
				finalList.push(list[i]);
			}
		}

		if (finalList.length == 0) {
			console.log("No suitable printer found; is one connected?");
			return reject();
		} else if (finalList.length == 1) {
			return resolve(finalList[0]); //there's only 1 printer so we can j return it
		} else {
			inquirer.prompt({
				name: "Choose a printer:",
				type: "list",
				choices: finalList
			}).then(choice => {
				let keys = Object.keys(choice);
				let actualChoice = choice[keys[0]]; //remap choice to actually be the choice lol

				return resolve(actualChoice);
			})
		}
	});
}

/*
This code doesn't work :(
The printer I'm using required things in a very weird format and doesn't like the generated ones here
So I'll give it up for now
const cp = require('child_process');

//Hey let's print stuff!
const printFiles = (fileList, printerName) => {
	return new Promise((resolve, reject) => {
		function printN(n) {
			let file = fileList[n];
			console.log("Now printing: "+file);
			convertImageToEMF(file).then(buf => {
				printer.printDirect({
					data: buf,
					type: "TEXT",
					printer: printerName,
					success: function(jobID) {
						console.log("sent to printer w ID: "+jobID);
						if (n < fileList.length-1) {
							setTimeout(() => {
								console.log("Printing next page...");
								n++;
								printN(n);
							},2000);
						} else {
							return resolve();
						}
					}, error: function(err) {
						console.log("Error: "+err);
						return reject(err);
					}
				})
				
			})
			console.log(printer.getSupportedPrintFormats(printerName));
		}

		if (fileList.length > 0) {
			printN(0);
		} else {
			return resolve();
		}
	});
}


getPrimaryPrinter().then(printer => {
	printFiles(["./batch11-22-2020/testPrint.png"], printer);
})
*/