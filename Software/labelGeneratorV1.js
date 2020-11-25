//labelGeneratorV1.js
//Written by Aaron Becker later then he should be awake lol

//libs
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { createCanvas, loadImage } = require('canvas');
const printer = require('printer');
const pngString = require('console-png');
const jimp = require('jimp');

const cDefs = require("./componentDefinitions.js");


//constants
const canvasWidth = 4; //in
const canvasHeight = 5.5; //in

const ppi = 300;
const canvasWidthPx = canvasWidth*ppi;
const canvasHeightPx = canvasHeight*ppi;





const store = {
	books: [],
	components: []
}




const exportCanvas = async function(store) {
	console.log("Canvas now exporting!");
	const canvas = createCanvas(canvasWidthPx, canvasHeightPx);
	const ctx = canvas.getContext('2d');

	//fill background
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, canvasWidthPx, canvasHeightPx);

	//text
	const text = 'Hello, World!'

	ctx.textBaseline = 'top'
	ctx.fillStyle = '#3574d4'
	const textWidth = ctx.measureText(text).width
	ctx.fillRect(600 - textWidth / 2 - 10, 170 - 5, textWidth + 20, 120)
	ctx.fillStyle = '#fff'
	ctx.fillText(text, 600, 170)

	const buffer = canvas.toBuffer('image/png');

	fs.writeFileSync('./test.png', buffer);

}

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
FILE HANDLING
*/

async function getFilesInDir(dir) {
	const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
	const files = await Promise.all(dirents.map((dirent) => {
	const res = path.resolve(dir, dirent.name);
	return dirent.isDirectory() ? getFilesInDir(res) : res;
	}));
	return Array.prototype.concat(...files);
}

const dirPicker = startDir => {
	return new Promise((resolve, reject) => {
		let potentialDirs = fs.readdirSync("./");
		let dirs = ["."];
		for (let i=0; i<potentialDirs.length; i++) {
			let fullPath = path.join("./",potentialDirs[i]);
			if (fs.lstatSync(fullPath).isDirectory()) {
				dirs.push(fullPath)
			}
		}

		if (dirs.length == 0) {
			return reject();
		} else if (dirs.length == 1) {
			return resolve(dirs[0]);
		} else {
			inquirer.prompt({
				name: "Choose a directory:",
				type: "list",
				choices: dirs
			}).then(choice => {
				let keys = Object.keys(choice);
				choice = choice[keys[0]];
				return resolve(choice);
			})
		}
	})
}

/*
COMPONENT SELECTION
*/
const componentSelector = () => {
	/*
	We want to know manufacturer, type (resistor, cap, inductor, misc)
	If cap, want to know rating (X7R, C0G, etc)

	How to do component selection:
	1) Select component type: Resistor, Capacitor, Other
	2) Select component size: 0201, 0402, 0603, 0805, 1206, Discrete
	3a) If resistor, ask
	3b) If capacitor, ask type (X7R, C0G, etc)
	3c) Ask for voltage rating 
	3d) If res or cap ask for tolerance, value (no unit)
	3e) if res ask for value unit (mO, o, kO, MO)
	3f) if cap ask for value unit (pF, nF, uF, mF)
	3g) if led ask for value unit (vForward)
	5) Ask for manufacturer part no
	6) Ask for qty

	return json object with fields:
	{
		type: 0=resistor, 1=capacitor, 2-3, -1 = other,
		size: 0=Discrete, 1=1206, 2=0805, 3=0603, 4=0402, 5=0201
		manufacturer: manufactuer part number or "unknown"
		qty: #qty
		additional: {
			tolerance: num or string <- for res or caps
			value: num
			valueUnit: "ohms, pF etc"
			normalizedValue: <- convert thing measured in miliohms to ohms etc
			normalizedUnit
		}
	}

	component flow:
	1) user fills out component
	2) check against db: if found, ask to add and tell user what compartment it is assigned into
	3) if not found, ask to assign to box or manual
	*/

	return new Promise((resolve, reject) => {
		//Component object itself
		var component = {
			additional: {}
		};

		//Setup choices
		let componentChoices = ["Back"];
		for (const prop in cDefs.types) {
			componentChoices.push(cDefs.types[prop]);
		};

		let sizeChoices = [];
		for (const prop in cDefs.smdSizes) {
			sizeChoices.push(cDefs.smdSizes[prop]);
		}

		let manufacturerChoices = ["Other"];
		cDefs.manufacturers.forEach(m => {
			manufacturerChoices.push(m);
		})

		//Ask user what they want
		inquirer.prompt({
			name: "type",
			message: "Pick a Component Type",
			type: "list",
			choices: componentChoices,
		}).then(choiceType => {
			let keysCT = Object.keys(choiceType);
			choiceType = choiceType[keysCT[0]];

			inquirer.prompt({
				name: "size",
				message: "Pick Component Size",
				type: "list",
				choices: sizeChoices
			}).then(choiceSize => {
				let keysSZ = Object.keys(choiceSize);
				choiceSize = choiceSize[keysSZ[0]];

				inquirer.prompt({
					name: "qty",
					message: "Input Quantity:",
					type: "number"
				}).then(inputQTY => {
					let keysQTY = Object.keys(inputQTY);
					inputQTY = inputQTY[keysQTY[0]];


					inquirer.prompt({
						name: "mf",
						message: "Choose Manufacturer",
						type: "list",
						choices: manufacturerChoices	
					}).then(choiceManuf => {
						let keysMF = Object.keys(choiceManuf);
						choiceManuf = choiceManuf[keysMF[0]];

						if (choiceManuf == "Other") {
							inquirer.prompt({
								name: "mpn",
								message: "Input Manufacturer:",
								type: "input"
							}).then(inputMPN => {
								let keysMPN = Object.keys(inputMPN);
								inputMPN = inputMPN[keysMPN[0]];

								basicPromptsDone(choiceType, choiceSize, inputQTY, inputMPN);
							})
						} else {
							basicPromptsDone(choiceType, choiceSize, inputQTY, choiceManuf);
						}
					})
				})
			})
		})

		function basicPromptsDone(type, size, qty, manuf) {
			component.quantity = qty;
			component.size = size;
			component.manufacturer = manuf;

			//Now we ask for additional information
			switch (type) {
				case "Back":
					return reject("back");
					break;
				case cDefs.types.RESISTOR: //Resistor
					component.type = cDefs.types.RESISTOR;
					
					let resistanceUnitsLong = [];
					let resistanceUnitsShort = [];
					let resistanceMults = [];
					cDefs.units[cDefs.types.RESISTOR].resistance.forEach(r => {
						resistanceUnitsLong.push(r[0]);
						resistanceUnitsShort.push(r[1]);
						resistanceMults.push(r[2]);
					})

					inquirer.prompt({
						name: "unit",
						message: "Pick a resistance unit",
						type: "list",
						choices: resistanceUnitsLong
					}).then(resUnit => {
						resUnit = resUnit[Object.keys(resUnit)[0]];
						let idxR = resistanceUnitsLong.indexOf(resUnit);

						inquirer.prompt({
							name: "res",
							message: "Enter resistance (in "+resistanceUnitsShort[idxR]+"):",
							type: "number"
						}).then(res => {
							res = res[Object.keys(res)[0]];

							inquirer.prompt({
								name: "tol",
								message: "Enter tolerance (in %):",
								type: "number"
							}).then(tol => {
								tol = tol[Object.keys(tol)[0]];

								component.additional.tolerance = fixFloatRounding(tol);
								component.additional.toleranceUnit = "%";

								component.additional.value = fixFloatRounding(res);
								component.additional.valueUnit = resistanceUnitsShort[idxR];

								let normResist = res*resistanceMults[idxR];
								component.additional.normalizedValue = fixFloatRounding(normResist);
								component.additional.normalizedValueUnit = cDefs.units[cDefs.types.RESISTOR].normUnit;

								return resolve(component);
							})	
						})
					})
					break;
				case cDefs.types.CAPACITOR: //Capacitor
					component.type = cDefs.types.CAPACITOR;
					
					let capUnitsLong = [];
					let capUnitsShort = [];
					let capMults = [];
					cDefs.units[cDefs.types.CAPACITOR].capacitance.forEach(c => {
						capUnitsLong.push(c[0]);
						capUnitsShort.push(c[1]);
						capMults.push(c[2]);
					})

					let toleranceUnitsLong = [];
					let toleranceUnitsShort = [];
					let toleranceMults = [];
					cDefs.units[cDefs.types.CAPACITOR].tolerance.forEach(t => {
						toleranceUnitsLong.push(t[0]);
						toleranceUnitsShort.push(t[1]);
						if (typeof t[2] == "undefined") {
							toleranceMults.push(0);
						} else {
							toleranceMults.push(t[2]);
						}
						
					})

					inquirer.prompt({
						name: "unit",
						message: "Pick a capacitance unit",
						type: "list",
						choices: capUnitsLong
					}).then(capUnit => {
						capUnit = capUnit[Object.keys(capUnit)[0]];
						let idxC = capUnitsLong.indexOf(capUnit);

						inquirer.prompt({
							name: "cap",
							message: "Enter capacitance (in "+capUnitsShort[idxC]+"):",
							type: "number"
						}).then(cap => {
							cap = cap[Object.keys(cap)[0]];

							inquirer.prompt({
								name: "tolU",
								message: "Pick a tolerance unit",
								type: "list",
								choices: toleranceUnitsLong
							}).then(tolUnit => {
								tolUnit = tolUnit[Object.keys(tolUnit)[0]];
								let idxT = toleranceUnitsLong.indexOf(tolUnit);

								inquirer.prompt({
									name: "tol",
									message: "Enter tolerance (in "+toleranceUnitsShort[idxT]+"):",
									type: "number"
								}).then(tol => {
									tol = tol[Object.keys(tol)[0]];

									inquirer.prompt({
										name: "vol",
										message: "Enter max voltage (in V):",
										type: "number"
									}).then(maxV => {
										maxV = maxV[Object.keys(maxV)[0]];

										component.additional.value = fixFloatRounding(cap);
										component.additional.valueUnit = capUnitsShort[idxC];

										component.additional.maxVoltage = fixFloatRounding(maxV);
										component.additional.maxVoltageUnit = "V";

										let normCap = cap*capMults[idxC];
										component.additional.normalizedValue = fixFloatRounding(normCap);
										component.additional.normalizedUnit = cDefs.units[cDefs.types.CAPACITOR].normUnit;

										component.additional.tolerance = fixFloatRounding(tol);
										component.additional.toleranceUnit = toleranceUnitsShort[idxT];

										let normCapTol;
										if (tolUnit.indexOf("%") > -1) {
											normCapTol = normCap*(tol/100);
										} else {
											normCapTol = tol*toleranceMults[idxT];
										}
										component.additional.normalizedTolerance = fixFloatRounding(normCapTol);
										component.additional.normalizedToleranceUnit = cDefs.units[cDefs.types.CAPACITOR].normUnit;

										return resolve(component);
									})
								})	
							})	
						})
					})
					break;
				default:
					return reject("Something went wrong :(");
					break;
			}
		}

	});
}

function fixFloatRounding(number) {
    return parseFloat(parseFloat(number).toPrecision(12)); //hey it's jank but it works
}

componentSelector().then(component => {
	console.log("\n\n\n",component);
})

const componentCompare = (a, b) => {
	return new Promise((resolve, reject) => {
		if (a.type != b.type) return reject();
		if (a.size != b.size) return reject();

		if (a.manufacturer.toLowerCase().indexOf("unknown") < 0 && b.manufacturer.toLowerCase().indexOf("unknown"))
			if (a.manufacturer.toLowerCase() != b.manufacturer.toLowerCase()) return reject();

		switch (a.type) { //Now compare the "additional" fields
			case cDefs.types.RESISTOR:
				if (a.tolerance != b.tolerance) return reject();
				if (a.normalizedValue != b.normalizedValue) return reject();
				break;
			case cDefs.types.CAPACITOR:
				if (a.normalizedTolerance != b.normalizedTolerance) return reject();
				if (a.normalizedValue != b.normalizedValue) return reject();
				if (a.maxVoltage != b.maxVoltage) return reject();
				break;
		}

		return resolve(); //If you get here, wowowow congrats there's truly a duplicate component
	})
}

/*
USER INPUT
*/

const main = () => {
	const mChoices = ["Load File", "Edit Currently Loaded File", "Export Currently Loaded File"];
	inquirer.prompt({
		name: "Choose an action",
		type: "list",
		choices: mChoices
	}).then(choice => {
		let keys = Object.keys(choice);
		choice = choice[keys[0]];

		if (choice == mChoices[0]) {
			dirPicker(".").then(dir => {
				getFilesInDir(dir).then(files => {
					for (let i=0; i<files.length; i++) {

					}
				})
			})
			
		}
	})
}

//main();






// const cp = require('child_process');

// //Hey let's print stuff!
// const printFiles = (fileList, printerName) => {
// 	return new Promise((resolve, reject) => {
// 		function printN(n) {
// 			let file = fileList[n];
// 			console.log("Now printing: "+file);
// 			convertImageToEMF(file).then(buf => {
// 				printer.printDirect({
// 					data: buf,
// 					type: "TEXT",
// 					printer: printerName,
// 					success: function(jobID) {
// 						console.log("sent to printer w ID: "+jobID);
// 						if (n < fileList.length-1) {
// 							setTimeout(() => {
// 								console.log("Printing next page...");
// 								n++;
// 								printN(n);
// 							},2000);
// 						} else {
// 							return resolve();
// 						}
// 					}, error: function(err) {
// 						console.log("Error: "+err);
// 						return reject(err);
// 					}
// 				})
				
// 			})
// 			console.log(printer.getSupportedPrintFormats(printerName));
// 		}

// 		if (fileList.length > 0) {
// 			printN(0);
// 		} else {
// 			return resolve();
// 		}
// 	});
// }


// getPrimaryPrinter().then(printer => {
// 	printFiles(["./batch11-22-2020/testPrint.png"], printer);
// })