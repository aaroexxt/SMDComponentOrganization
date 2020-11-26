//labelGeneratorV1.js
//Written by Aaron Becker later then he should be awake lol

//Todos: when adding component, if already assigned tell where

//libs
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { createCanvas, loadImage } = require('canvas');
const printer = require('printer');
const pngString = require('console-png');
const jimp = require('jimp');

const cDefs = require("./componentDefinitions.js");
const bDefs = require("./boxDefinitions.js");

//constants
const canvasWidth = 4; //in
const canvasHeight = 5.5; //in

const ppi = 300;
const canvasWidthPx = canvasWidth*ppi;
const canvasHeightPx = canvasHeight*ppi;


var store = {
	boxes: [],
	components: [],
	componentTotal: -1,
	boxTotal: -1
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

const loadStoreFile = path => {
	return new Promise((resolve, reject) => {
		store = JSON.parse(fs.readFileSync(path));
		return resolve(); //we will never get here if the code above fails
	})
}

const saveStoreFile = path => {
	return new Promise((resolve, reject) => {
		fs.writeFileSync(path, JSON.stringify(store));
		return resolve(); //we will never get here if the code above fails
	})
}

/*
BOX SELECTION
*/

const boxSelector = () => {
	/*
	We want to know dimensions, size of each package
	1st ask how many sections (defined as areas of different types within storage)
	Then ask book title, description
	For each section:
	1st ask pocket type (small medium large)
	2nd ask width in pockets
	3rd ask height in pockets
	Then ask what components to assign
	*/

	return new Promise((resolve, reject) => {
		var box = {
			sections: []
		}
		inquirer.prompt({
			name: "title",
			message: "Enter box identifier/title (what will be printed on top):",
			type: "input"
		}).then(bTitle => {
			bTitle = bTitle[Object.keys(bTitle)[0]];

			inquirer.prompt({
				name: "description",
				message: "Enter box description (will be printed):",
				type: "input"
			}).then(bDesc => {
				bDesc = bDesc[Object.keys(bDesc)[0]];

				box.title = bTitle;
				box.description = bDesc;
				box.uuid = generateUUID();

				inquirer.prompt({
					name: "nSec",
					message: "Enter number of sections in box:",
					type: "number"
				}).then(bSecN => {
					bSecN = bSecN[Object.keys(bSecN)[0]];

					let fillSection = n => {
						console.log("Section "+(n+1)+" of "+bSecN);
						var section = {};

						inquirer.prompt({
							name: "sType",
							message: "Pick a section type:",
							type: "list",
							choices: bDefs.sectionTypes
						}).then(sType => {
							sType = sType[Object.keys(sType)[0]];
							section.type = sType;

							inquirer.prompt({
								name: "sWidth",
								message: "Enter section width (in pockets):",
								type: "number"
							}).then(sWidth => {
								sWidth = sWidth[Object.keys(sWidth)[0]];

								inquirer.prompt({
									name: "sHeight",
									message: "Enter section height (in pockets):",
									type: "number"
								}).then(sHeight => {
									sHeight = sHeight[Object.keys(sHeight)[0]];

									section.width = sWidth;
									section.height = sHeight;

									box.sections.push(section); //Add section to box
									if (n >= bSecN-1) {
										return resolve(box); //Box done
									} else {
										fillSection(n+1);
									}
								})
							})
						})
					}
					fillSection(0);
				})
			})
		})
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
		let componentChoices = ["Cancel"];
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

			if (choiceType == "Cancel") { //insta-return boii
				return reject("cancelled");
			}

			inquirer.prompt({
				name: "size",
				message: "Pick Component Size",
				type: "list",
				choices: sizeChoices
			}).then(choiceSize => {
				let keysSZ = Object.keys(choiceSize);
				choiceSize = choiceSize[keysSZ[0]];


				if (choiceSize == cDefs.smdSizes.ICPACKAGES) { //IC packages need more type information
					selectICPackage().then(icPkg => {
						choiceSize = "SMD-"+icPkg;
						sizeDone(choiceType, choiceSize);
					})
				} else {
					sizeDone(choiceType, choiceSize);
				}

				
			})
		})

		function sizeDone(choiceType, choiceSize) { //For some components, we have a more complex flow with size, so this function seperates it out
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
		}

		function basicPromptsDone(type, size, qty, manuf) {
			component.quantity = qty;
			component.size = size;
			component.manufacturer = manuf;
			component.uuid = generateUUID();
			component.assignment = {
				assigned: false,
				box: undefined
			}

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
				case cDefs.types.IC:
					component.type = cDefs.types.IC;
					inquirer.prompt({
						name: "ident",
						message: "Enter IC name or number (identifier):",
						type: "input"
					}).then(ident => {
						ident = ident[Object.keys(ident)[0]];

						inquirer.prompt({
							name: "desc",
							message: "Describe component:",
							type: "input"
						}).then(desc => {
							desc = desc[Object.keys(desc)[0]];

							component.additional.identifier = ident;
							component.additional.description = desc;

							return resolve(component);
						});
					})
					break;
				case cDefs.types.CRYSTAL:
					component.type = cDefs.types.CRYSTAL;
					inquirer.prompt({
						name: "timUnit",
						message: "Pick freqency unit",
						type: "list",
						choices: cDefs.units[cDefs.types.CRYSTAL].frequency
					}).then(freqChoice => {
						freqChoice = freqChoice[Object.keys(freqChoice)[0]];

						inquirer.prompt({
							name: "freq",
							message: "Enter frequency (in"+freqChoice+"):",
							type: "input"
						}).then(freq => {
							freq = freq[Object.keys(freq)[0]];

							inquirer.prompt({
								name: "lCap",
								message: "Enter load capacitance (pF):",
								type: "input"
							}).then(lCap => {
								lCap = lCap[Object.keys(lCap)[0]];

								component.additional.frequency = freq;
								component.additional.frequencyUnit = freqChoice;
								component.additional.loadCapacitance = lCap;
								component.additional.loadCapacitanceUnit = "pF";

								return resolve(component);
							})
						})
					})
					break;
				case cDefs.types.OTHER:
					component.type = cDefs.types.OTHER;
					inquirer.prompt({
						name: "ident",
						message: "Enter component name or number (identifier):",
						type: "input"
					}).then(ident => {
						ident = ident[Object.keys(ident)[0]];

						inquirer.prompt({
							name: "desc",
							message: "Describe component:",
							type: "input"
						}).then(desc => {
							desc = desc[Object.keys(desc)[0]];

							component.additional.identifier = ident;
							component.additional.description = desc;

							return resolve(component);
						});
					})
					break;
				default:
					return reject("Something went wrong :(");
					break;
			}
		}

	});
}

const selectICPackage = () => {
	return new Promise((resolve, reject) => {
		let outerChoices = [];
		for (const prop in cDefs.ICPackages) {
			outerChoices.push(prop);
		}
		function outer() {
			inquirer.prompt({
				name: "outTyp",
				message: "Select package type (general)",
				type: "list",
				choices: outerChoices
			}).then(c => {
				c = c[Object.keys(c)[0]];
				inner(c);
			})
		}
		function inner(sel) {
			let innerChoices = ["Back"];
			cDefs.ICPackages[sel].forEach(p => {
				innerChoices.push(p);
			})
			inquirer.prompt({
				name: "inTyp",
				message: "Select specific type",
				type: "list",
				choices: innerChoices
			}).then(c => {
				c = c[Object.keys(c)[0]];
				if (c.toLowerCase().indexOf("back") > -1) {
					outer();
				} else {
					return resolve(c);
				}
			})
		}

		outer();
	})
}

function fixFloatRounding(number) {
    return parseFloat(parseFloat(number).toPrecision(12)); //hey it's jank but it works
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const componentCompare = (a, b) => {
	if (a.type != b.type) return false;
	if (a.size != b.size) return false;

	if (a.manufacturer.toLowerCase().indexOf("unknown") < 0 && b.manufacturer.toLowerCase().indexOf("unknown")) {
		if (a.manufacturer.toLowerCase() != b.manufacturer.toLowerCase()) return false;
	}
	//Qty can slide

	let aAdd = a.additional;
	let bAdd = b.additional;
	switch (a.type) { //Now compare the "additional" fields
		case cDefs.types.RESISTOR:
			if (aAdd.tolerance != bAdd.tolerance) return false;
			if (aAdd.normalizedValue != bAdd.normalizedValue) return false;
			break;
		case cDefs.types.CAPACITOR:
			if (aAdd.normalizedTolerance != bAdd.normalizedTolerance) return false;
			if (aAdd.normalizedValue != bAdd.normalizedValue) return false;
			if (aAdd.maxVoltage != bAdd.maxVoltage) return false;
			break;
		case cDefs.types.OTHER:
		case cDefs.types.IC:
			if (aAdd.identifier != bAdd.identifier) return false;
			//Description can slide
			break;
		case cDefs.types.CRYSTAL:
			if (aAdd.frequency != bAdd.frequency) return false;
			if (aAdd.frequencyUnit != bAdd.frequencyUnit) return false;
			if (aAdd.loadCapacitance != bAdd.loadCapacitance) return false;
			break;
	}

	return true; //If you get here, wowowow congrats there's truly a duplicate component
}

const addComponent = component => {
	if (store.components.length == 0) { //nothing to compare so uhhh... return
		store.components.push(component);
		store.componentTotal++;
	} else {
		let matchFound = false;
		let matchIdx = 0;
		for (let i=0; i<store.components.length; i++) {
			if (componentCompare(store.components[i], component)) {
				matchFound = true;
				matchIdx = i;
				break;
			}
		}

		if (matchFound) { //if same just add quantity
			store.components[matchIdx].quantity += component.quantity;
			if (store.components[matchIdx].assignment.assigned) {
				console.log("UHHH COMPONENT IS ASSIGNED ALREADY TELL USER WHERE");
			}
		} else { //if different just add it into the list
			store.components.push(component);
			store.componentTotal++;
		}
	}
	return true;
}

/*
USER INPUT
*/

const main = () => {
	const mChoices = ["Load Component Book", "New Component Book"];
	inquirer.prompt({
		name: "Choose an action:",
		type: "list",
		choices: mChoices
	}).then(choice => {
		let keys = Object.keys(choice);
		choice = choice[keys[0]];

		if (choice == mChoices[0]) {
			dirPicker(".").then(dir => {
				getFilesInDir(dir).then(files => {
					let validFiles = [];
					for (let i=0; i<files.length; i++) {
						if (files[i].toLowerCase().indexOf(".json") > -1) {
							validFiles.push(files[i])
						}
					}

					if (validFiles.length == 0) {
						console.log("No valid files found in that directory!");
						main();
					} else if (validFiles.length == 1) {
						loadStoreFile(validFiles[0]).then(() => {
							console.log("Loaded "+store.componentTotal+" components and "+store.boxTotal+" boxes successfully.");
							afterMain();
						})
					} else {
						inquirer.prompt({
							name: "fil",
							message: "Select file:",
							type: "list",
							choices: validFiles
						}).then(fil => {
							loadStoreFile(fil[Object.keys(fil)[0]]).then(() => { //Do NOT ask about this one liner or my sanity goes riprooni
								console.log("Loaded "+store.componentTotal+" components and "+store.boxTotal+" boxes successfully.");
								afterMain();
							})
						})
					}
				})
			})
		} else {
			store.componentTotal = 0;
			store.boxTotal = 0;
			afterMain();
		}
	})
}

const afterMain = () => {
	const mChoices = ["Add Component (Oneshot)", "Add Multiple Components", "Add Box (Oneshot)", "Add Multiple Boxes", "Storage Info", "Save Data File", "Export Labels", "Exit"];
	inquirer.prompt({
		name: "mC",
		message: "Choose an action:",
		type: "list",
		choices: mChoices
	}).then(choice => {
		choice = choice[Object.keys(choice)[0]];

		if (choice == mChoices[0]) {
			componentSelector().then(component => {
				addComponent(component); //Actually add it to store
				afterMain();
			}).catch(() => {
				afterMain();
			});
		} else if (choice == mChoices[1]) {
			inquirer.prompt({
				name: "cAmnt",
				message: "Enter amount of components to add:",
				type: "number"
			}).then(amnt => {
				amnt = Number(amnt[Object.keys(amnt)[0]]);

				let addN = n => {
					console.log("Component "+(n+1)+" of "+amnt);
					componentSelector().then(component => {
						addComponent(component); //Actually add it to store
							
						if (n >= amnt-1) {
							console.log("Added "+amnt+" components successfully");
							afterMain(); //wee we done
						} else {
							addN(n+1); //recursion gang
						}
					}).catch(() => {
						afterMain();
					})
				}
				addN(0);
			})
		} else if (choice == mChoices[2]) {
			boxSelector().then(box => {
				store.boxes.push(box); //add box!
				store.boxTotal++;
				console.log("Added box successfully");
				afterMain();
			})
		} else if (choice == mChoices[3]) {
			inquirer.prompt({
				name: "cAmnt",
				message: "Enter amount of boxes to add:",
				type: "number"
			}).then(amnt => {
				amnt = Number(amnt[Object.keys(amnt)[0]]);

				let addN = n => {
					console.log("Box "+(n+1)+" of "+amnt);
					boxSelector().then(box => {
						store.boxes.push(box); //add box!
						store.boxTotal++;
							
						if (n >= amnt-1) {
							console.log("Added "+amnt+" boxes successfully");
							afterMain(); //wee we done
						} else {
							addN(n+1); //recursion gang
						}
					}).catch(() => {
						afterMain();
					})
				}
				addN(0);
			})
		} else if (choice == mChoices[4]) {
			console.log("\n~~~~ Storage Info ~~~");
			console.log("Total Component Count: "+store.componentTotal);
			console.log("~~~~~\nComponent breakdown:\nType\t\tEntryCount\tComponentCount");
			let counts = [];
			let typeKeys = Object.keys(cDefs.types);
			for (let i=0; i<typeKeys.length; i++) { //init the array
				counts[i] = [cDefs.types[typeKeys[i]], 0, 0];
			}

			for (let i=0; i<store.components.length; i++) {
				for (let j=0; j<typeKeys.length; j++) {
					if (cDefs.types[typeKeys[j]] == store.components[i].type) {
						counts[j][1]++; //add 1 to entry count
						counts[j][2] += store.components[i].quantity; //add actual component count
					}
				}
			}

			for (let i=0; i<counts.length; i++) {
				console.log(counts[i][0]+((counts[i][0].length > 7)?"\t":"\t\t")+counts[i][1]+"\t\t"+counts[i][2]); //another funky fresh oneliner from yours truly
			}
			console.log("\n");
			console.log("Total Box Count: "+store.boxTotal);
			if (store.boxTotal > 0) {
				console.log("~~~~~\nBox Breakdown:");
				//name sectionCount
				//	sectionType: width=w, height=h

				for (let i=0; i<store.boxes.length; i++) {
					let box = store.boxes[i];
					console.log("Box '"+box.title+"' has "+box.sections.length+" sections");
					for (let j=0; j<box.sections.length; j++) {
						console.log("\t"+box.sections[i].type+": W="+box.sections[i].width+", H="+box.sections[i].height);
					}
				}
			}
			console.log("\n~~~~ End Storage Info ~~~~");

			afterMain(); //return to main
		} else if (choice == mChoices[5]) {
			console.log("Save to directory:");
			dirPicker(".").then(dir => {
				getFilesInDir(dir).then(files => {
					let fileExists = false;
					for (let i=0; i<files.length; i++) {
						if (files[i].indexOf("storage.json") > -1) {
							fileExists = true;
						}
					}

					let storePath = path.join(dir, "storage.json");
					console.log(storePath);
					if (fileExists) {
						inquirer.prompt({
							type: "confirm",
							name: "overw",
							message: "Overwrite file 'storage.json'?"
						}).then(ovw => {
							ovw = ovw[Object.keys(ovw)[0]];

							if (ovw) {
								saveStoreFile(storePath).then(() => {
									console.log("File saved successfully.");
									afterMain();
								}).catch(e => {
									console.error("There was an error saving the file: "+e);
									afterMain();
								})
							} else { //j return to main if no overwrite
								afterMain();
							}
						})
					} else {
						saveStoreFile(storePath).then(() => {
							console.log("File saved successfully.");
							afterMain();
						}).catch(e => {
							console.error("There was an error saving the file: "+e);
							afterMain();
						})
					}
				});
			});
		}
	})
}



main(); //let's get this show on the road shall we?


/*
Generating printable pages:

start with blank canvas of correct size
print box labels as entire sheet
*/