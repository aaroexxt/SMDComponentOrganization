//labelGeneratorV1.js
//Written by Aaron Becker later then he should be awake lol

/*Todos:
- when adding component, if already assigned tell where
- Lookup function with box visualization, highlight in red where component would go
- change rendering method to dynamically fill page (when get to too large, just create another page) instead of precomputing
- finish component additional asking for other types (diode etc)
- unassign function
- 'auto' unit selection which will convert to best possible unit choice
*/


//libs
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { createCanvas, loadImage } = require('canvas');

const cDefs = require("./componentDefinitions.js");
const bDefs = require("./boxDefinitions.js");

//constants
const canvasWidth = 4; //in
const canvasHeight = 6; //in

const ppi = 300;
const canvasWidthPx = canvasWidth*ppi;
const canvasHeightPx = canvasHeight*ppi;


const inToPx = uIn => {
	return uIn*ppi;
}

//Label size defs
const heightBoxLabel = inToPx(1.25);
const componentLabelSmallDim = [inToPx(0.35), inToPx(0.6)]; //height, width in px
const componentLabelMediumDim = [inToPx(0.5), inToPx(0.8)]; //NOT TESTED YET
const componentLabelLargeDim = [inToPx(0.75), inToPx(0.75)]; //NOT TESTED YET



var store = {
	boxes: [],
	components: [],
	componentTotal: -1,
	boxTotal: -1
}

const exportImages = dir => { //Will export images from store
	return new Promise((resolve, reject) => {
		/*
		Steps:
		1) export box labels (full sheet sideways)
		2) get array of all things to print in format [info, id]
		3) render all things to print onto images
		*/

		let writeCanvas = (canvas, imgName) => {
			let buf = canvas.toBuffer('image/png');
			fs.writeFileSync(path.join(dir, (imgName.indexOf("png") > -1) ? imgName : imgName+".png"), buf);
		}

		let initBasicCanvas = () => {
			let canvas = createCanvas(canvasWidthPx, canvasHeightPx);
			let ctx = canvas.getContext('2d');

			ctx.fillStyle = "#fff";
			ctx.textBaseline = 'top';
			ctx.fillRect(0, 0, canvasWidthPx, canvasHeightPx);

			return {canvas: canvas, ctx: ctx};
		}

		let boxPrintInfo = [];
		for (let i=0; i<store.boxes.length; i++) { //Generate box labels
			boxPrintInfo.push([store.boxes[i].title, store.boxes[i].description, (i+1)]);
		}

		let boxesPerSheet = Math.floor(canvasHeightPx/(heightBoxLabel+inToPx(0.1)));
		let boxSheets = Math.ceil(boxPrintInfo.length/boxesPerSheet);
		let boxIdx = 0;
		for (let i=0; i<boxSheets; i++) {
			let {canvas, ctx} = initBasicCanvas();

			ctx.strokeStyle = "#000";
			ctx.lineWidth = 20;

			
			ctx.fillStyle = '#000';
			let y = inToPx(0.066);
			for (let j=0; j<Math.min(boxPrintInfo.length,boxesPerSheet); j++) {
				canvasRoundRect(ctx, 20, y, canvasWidthPx-40, heightBoxLabel, 50, false, true);
				
				let title = boxPrintInfo[boxIdx][0].substring(0, 16).trim();
				let desc = boxPrintInfo[boxIdx][1].substring(0, 50).trim();	
				let bn = ("#"+boxPrintInfo[boxIdx][2]).trim();

				ctx.font = "bold 125px Helvetica";
				const titleWidth = ctx.measureText(title).width;
				ctx.fillText(title, (canvasWidthPx-20-titleWidth)/2, y+inToPx(0.2));

				ctx.font = "75px Helvetica";
				const descWidth = ctx.measureText(desc).width;
				ctx.fillText(desc, (canvasWidthPx-20-descWidth)/2, y+inToPx(0.75));

				ctx.font = "bold 50px Helvetica";
				const bnWidth = ctx.measureText(bn).width;
				ctx.fillText(bn, canvasWidthPx-50-bnWidth, y+inToPx(0.1));

				y+=heightBoxLabel+inToPx(0.1);
				boxIdx++;
			}
			writeCanvas(canvas, "label-box-"+(i+1));
		}
		console.log("Successfully exported "+boxSheets+" sheet(s) of box labels");

		let componentPrintInfo = []; //value, qty, row, col
		for (let i=0; i<store.components.length; i++) {
			let component = store.components[i];
			if (!component.assigned) continue;

			let info = "";
			switch(component.type) {
				case cDefs.types.RESISTOR:
				case cDefs.types.CAPACITOR:
					info = component.additional.value+component.additional.valueUnit;
					break;
				case cDefs.types.IC:
				case cDefs.types.OTHER:
					info = component.additional.identifier;
					break;
				case cDefs.types.CRYSTAL:
					info = component.additional.frequency+component.additional.frequencyUnit;
					break;
				default:
					info = "Unknown";
					break;
			}

			let found = false;
			for (let z=0; z<store.boxes.length; z++) {
				let box = store.boxes[z];
				for (let i=0; i<box.sections.length; i++) {
					for (let j=0; j<box.sections[i].assignments.length; j++) {
						for (let b=0; b<box.sections[i].assignments[j].length; b++) {
							if (box.sections[i].assignments[j][b] == component.uuid) { //check uuid match
								componentPrintInfo.push({
									value: info,
									quantity: component.quantity,
									boxNum: (z+1),
									sectionNum: (i+1),
									sectionType: box.sections[i].type,
									sectionRow: (j+1),
									sectionCol: (b+1)
								});

								found = true;
								break;
							}
						}
						if (found) break;
					}
					if (found) break;
				}
			}
		}

		let smallLabelComponents = [];
		let mediumLabelComponents = [];
		let largeLabelComponents = [];
		for (let i=0; i<componentPrintInfo.length; i++) {
			let st = componentPrintInfo[i].sectionType.toLowerCase();
			((st == "small")?smallLabelComponents:(st == "medium")?medLabelComponents:largeLabelComponents).push(componentPrintInfo[i]);
		}
		//Small
		let labelsPerRowSmall = Math.floor(canvasWidthPx/(componentLabelSmallDim[1]+inToPx(0.025)));
		let labelsPerSheetSmall = labelsPerRowSmall*Math.floor(canvasHeightPx/(componentLabelSmallDim[0]+inToPx(0.075)));
		let labelSheetsSmall = Math.ceil(smallLabelComponents.length/labelsPerSheetSmall);
		//Med
		let labelsPerRowMedium = Math.floor(canvasWidthPx/(componentLabelMediumDim[1]+inToPx(0.025)));
		let labelsPerSheetMedium = labelsPerRowMedium*Math.floor(canvasHeightPx/(componentLabelMediumDim[0]+inToPx(0.075)));
		let labelSheetsMedium = Math.ceil(mediumLabelComponents.length/labelsPerSheetMedium);
		//Large
		let labelsPerRowLarge = Math.floor(canvasWidthPx/(componentLabelLargeDim[1]+inToPx(0.025)));
		let labelsPerSheetLarge = labelsPerRowLarge*Math.floor(canvasHeightPx/(componentLabelLargeDim[0]+inToPx(0.075)));
		let labelSheetsLarge = Math.ceil(largeLabelComponents.length/labelsPerSheetLarge);

		let compIdx = 0;
		if (labelSheetsSmall > 0) {
			for (let i=0; i<labelSheetsSmall; i++) {
				let {canvas, ctx} = initBasicCanvas();

				ctx.strokeStyle = "#000";
				ctx.lineWidth = 5;

				
				ctx.fillStyle = '#000';
				let y = inToPx(0.066);
				let x = inToPx(0.066);
				for (let j=0; j<Math.min(smallLabelComponents.length,labelsPerSheetSmall); j++) {
					let component = smallLabelComponents[compIdx];
					if (!component) continue;

					canvasRoundRect(ctx, x, y, componentLabelSmallDim[1], componentLabelSmallDim[0], 10, false, true);
					
					let value = component.value.substring(0, 6).trim();
					let code = ("B"+component.boxNum+"-"+"S"+component.sectionNum+"-"+component.sectionRow+"-"+component.sectionCol).trim();				

					ctx.font = "bold 50px Helvetica";
					const valueWidth = ctx.measureText(value).width;
					ctx.fillText(value, ((componentLabelSmallDim[1]-valueWidth)/2)+x, y+inToPx(0.025));

					ctx.font = "25px Helvetica";
					const codeWidth = ctx.measureText(code).width;
					ctx.fillText(code, ((componentLabelSmallDim[1]-codeWidth)/2)+x, y+inToPx(0.225));

					x+=componentLabelSmallDim[1]+inToPx(0.025);
					if (x/componentLabelSmallDim[1] > labelsPerRowSmall) {
						x = inToPx(0.066);
						y+=componentLabelSmallDim[0]+inToPx(0.025);
					}
					compIdx++;
				}
				writeCanvas(canvas, "label-small-"+(i+1));
			}
		}
		console.log("Successfully exported "+labelSheetsSmall+" sheet(s) of small labels");

		compIdx = 0;
		if (labelSheetsMedium > 0) {
			for (let i=0; i<labelSheetsMedium; i++) {
				let {canvas, ctx} = initBasicCanvas();

				ctx.strokeStyle = "#000";
				ctx.lineWidth = 5;
				
				ctx.fillStyle = '#000';
				let y = inToPx(0.066);
				let x = inToPx(0.066);
				for (let j=0; j<Math.min(mediumLabelComponents.length,labelsPerSheetMedium); j++) {
					let component = mediumLabelComponents[compIdx];
					if (!component) continue;

					canvasRoundRect(ctx, x, y, componentLabelMediumDim[1], componentLabelMediumDim[0], 10, false, true);
					
					let value = component.value.substring(0, 6).trim();
					let code = ("B"+component.boxNum+"-"+"S"+component.sectionNum+"-"+component.sectionRow+"-"+component.sectionCol).trim();				

					ctx.font = "bold 50px Helvetica";
					const valueWidth = ctx.measureText(value).width;
					ctx.fillText(value, ((componentLabelMediumDim[1]-valueWidth)/2)+x, y+inToPx(0.025));

					ctx.font = "25px Helvetica";
					const codeWidth = ctx.measureText(code).width;
					ctx.fillText(code, ((componentLabelMediumDim[1]-codeWidth)/2)+x, y+inToPx(0.225));

					x+=componentLabelMediumDim[1]+inToPx(0.025);
					if (x/componentLabelMediumDim[1] > labelsPerRowMedium) {
						x = inToPx(0.066);
						y+=componentLabelMediumDim[0]+inToPx(0.025);
					}
					compIdx++;
				}
				writeCanvas(canvas, "label-medium-"+(i+1));
			}
		}
		console.log("Successfully exported "+labelSheetsMedium+" sheet(s) of medium labels");

		compIdx = 0;
		if (labelSheetsLarge > 0) {
			for (let i=0; i<labelSheetsLarge; i++) {
				let {canvas, ctx} = initBasicCanvas();

				ctx.strokeStyle = "#000";
				ctx.lineWidth = 5;

				
				ctx.fillStyle = '#000';
				let y = inToPx(0.066);
				let x = inToPx(0.066);
				for (let j=0; j<Math.min(largeLabelComponents.length,labelsPerSheetLarge); j++) {
					let component = largeLabelComponents[compIdx];
					if (!component) continue;

					canvasRoundRect(ctx, x, y, componentLabelLargeDim[1], componentLabelLargeDim[0], 10, false, true);
			
					let value = component.value.substring(0, 6).trim();
					let code = ("B"+component.boxNum+"-"+"S"+component.sectionNum+"-"+component.sectionRow+"-"+component.sectionCol).trim();				

					ctx.font = "bold 50px Helvetica";
					const valueWidth = ctx.measureText(value).width;
					ctx.fillText(value, ((componentLabelLargeDim[1]-valueWidth)/2)+x, y+inToPx(0.025));

					ctx.font = "25px Helvetica";
					const codeWidth = ctx.measureText(code).width;
					ctx.fillText(code, ((componentLabelLargeDim[1]-codeWidth)/2)+x, y+inToPx(0.225));

					x+=componentLabelLargeDim[1]+inToPx(0.025);
					if (x/componentLabelLargeDim[1] > labelsPerRowLarge) {
						x = inToPx(0.066);
						y+=componentLabelLargeDim[0]+inToPx(0.025);
					}
					compIdx++;
				}
				writeCanvas(canvas, "label-large-"+(i+1));
			}
		}
		console.log("Successfully exported "+labelSheetsLarge+" sheet(s) of large labels");

		return resolve();
	})
}

//from https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
function canvasRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
	if (typeof stroke === 'undefined') {
		stroke = true;
	}
	if (typeof radius === 'undefined') {
		radius = 5;
	}
	if (typeof radius === 'number') {
		radius = {tl: radius, tr: radius, br: radius, bl: radius};
	} else {
		var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
		for (var side in defaultRadius) {
		  radius[side] = radius[side] || defaultRadius[side];
		}
	}
	ctx.beginPath();
	ctx.moveTo(x + radius.tl, y);
	ctx.lineTo(x + width - radius.tr, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
	ctx.lineTo(x + width, y + height - radius.br);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
	ctx.lineTo(x + radius.bl, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
	ctx.lineTo(x, y + radius.tl);
	ctx.quadraticCurveTo(x, y, x + radius.tl, y);
	ctx.closePath();
	if (fill) {
		ctx.fill();
	}
	if (stroke) {
		ctx.stroke();
	}

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
				name: "Choose a directory",
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
							message: "Pick a section type",
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

									let row = [];
									for (let i=0; i<sWidth; i++) {
										row.push("");
									}

									section.assignments = [];
									for (let i=0; i<sHeight; i++) {
										section.assignments.push(row); //no need to recalculate it every time
									}

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

const groupComponentSelector = () => {
	return new Promise((resolve, reject) => {
		//Base component to build value into
		var component = {
			additional: {}
		};
		//Setup choices
		let componentChoices = ["Cancel"];
		for (const prop in cDefs.groupTypes) {
			componentChoices.push(cDefs.groupTypes[prop]);
		};

		let sizeChoices = [];
		for (const prop in cDefs.smdSizes) {
			sizeChoices.push(cDefs.smdSizes[prop]);
		}

		let manufacturerChoices = ["Other"];
		cDefs.manufacturers.forEach(m => {
			manufacturerChoices.push(m);
		})

		let numComponents;
		let commonType, commonSize, commonQty, commonManuf;

		//Ask user what they want
		inquirer.prompt({
			name: "cAmn",
			message: "Enter number of components with common params to add:",
			type: "number"
		}).then(nc => {
			numComponents = nc[Object.keys(nc)[0]];
			inquirer.prompt({
				name: "type",
				message: "Pick a Component Type for Group",
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
					message: "Pick Component Size for Group",
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
		})

		function sizeDone(choiceType, choiceSize) { //For some components, we have a more complex flow with size, so this function seperates it out
			inquirer.prompt({
				name: "qty",
				message: "Input Group Quantity:",
				type: "number"
			}).then(inputQTY => {
				let keysQTY = Object.keys(inputQTY);
				inputQTY = inputQTY[keysQTY[0]];

				inquirer.prompt({
					name: "mf",
					message: "Choose Group Manufacturer",
					type: "list",
					choices: manufacturerChoices	
				}).then(choiceManuf => {
					let keysMF = Object.keys(choiceManuf);
					choiceManuf = choiceManuf[keysMF[0]];

					if (choiceManuf == "Other") {
						inquirer.prompt({
							name: "mpn",
							message: "Input Group Manufacturer:",
							type: "input"
						}).then(inputMPN => {
							let keysMPN = Object.keys(inputMPN);
							inputMPN = inputMPN[keysMPN[0]];

							commonType = choiceType;
							commonSize = choiceSize;
							commonQty = inputQTY;
							commonManuf = inputMPN;
							basicPromptsDone();
						})
					} else {
						commonType = choiceType;
						commonSize = choiceSize;
						commonQty = inputQTY;
						commonManuf = choiceManuf;
						basicPromptsDone();
					}
				})
			})
		}

		function basicPromptsDone() {
			component.quantity = commonQty;
			component.size = commonSize;
			component.manufacturer = commonManuf;
			component.uuid = generateUUID();
			component.assigned = false;

			//Now we ask for additional information
			switch (commonType) {
				case "Back":
					return reject("back");
					break;
				case cDefs.types.RESISTOR: //Resistor
					component.type = cDefs.types.RESISTOR;

					inquirer.prompt({
						name: "tol",
						message: "Enter common tolerance (in %):",
						type: "number"
					}).then(tol => {
						tol = tol[Object.keys(tol)[0]];

						component.additional.tolerance = fixFloatRounding(tol);
						component.additional.toleranceUnit = "%";

						askN(0);
					})
					break;
				case cDefs.types.CAPACITOR: //Capacitor
					component.type = cDefs.types.CAPACITOR;

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
						name: "tolU",
						message: "Pick a common tolerance unit",
						type: "list",
						choices: toleranceUnitsLong
					}).then(tolUnit => {
						tolUnit = tolUnit[Object.keys(tolUnit)[0]];
						let idxT = toleranceUnitsLong.indexOf(tolUnit);

						inquirer.prompt({
							name: "tol",
							message: "Enter common tolerance (in "+toleranceUnitsShort[idxT]+"):",
							type: "number"
						}).then(tol => {
							tol = tol[Object.keys(tol)[0]];

							inquirer.prompt({
								name: "vol",
								message: "Enter common max voltage (in V):",
								type: "number"
							}).then(maxV => {
								maxV = maxV[Object.keys(maxV)[0]];

								component.additional.maxVoltage = fixFloatRounding(maxV);
								component.additional.maxVoltageUnit = "V";

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

								askN(0);
							})
						})	
					})
					break;
				default:
					return reject("Something went wrong, that component type is not currently supported :(");
					break;
			}
		}

		function askN(n) {
			console.log("Group component "+(n+1)+" of "+numComponents);
			switch (component.type) {
				case cDefs.types.RESISTOR:
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

							component.additional.value = fixFloatRounding(res);
							component.additional.valueUnit = resistanceUnitsShort[idxR];

							let normResist = res*resistanceMults[idxR];
							component.additional.normalizedValue = fixFloatRounding(normResist);
							component.additional.normalizedValueUnit = cDefs.units[cDefs.types.RESISTOR].normUnit;
							
							doneN(n);
						})
					})
					break;
				case cDefs.types.CAPACITOR:
					let capUnitsLong = [];
					let capUnitsShort = [];
					let capMults = [];
					cDefs.units[cDefs.types.CAPACITOR].capacitance.forEach(c => {
						capUnitsLong.push(c[0]);
						capUnitsShort.push(c[1]);
						capMults.push(c[2]);
					});

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

							component.additional.value = fixFloatRounding(cap);
							component.additional.valueUnit = capUnitsShort[idxC];
							
							let normCap = cap*capMults[idxC];
							component.additional.normalizedValue = fixFloatRounding(normCap);
							component.additional.normalizedUnit = cDefs.units[cDefs.types.CAPACITOR].normUnit;

							doneN(n);
						})
					})
					break;
			}
		}

		function doneN(n) {
			component.uuid = generateUUID(); //randomize the UUID
			addComponent(component);
			if (n >= numComponents-1) {
				return resolve();
			} else {
				askN(n+1);
			}
		}

	});
}
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
			component.assigned = false;

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
					return reject("Something went wrong, that component type is not currently supported :(");
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
	component = JSON.parse(JSON.stringify(component)); //break any relations when passed in
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
			console.log("Component was merged with existing component matching definitions");
			if (store.components[matchIdx].assigned) {
				let uuid = store.components[matchIdx].uuid;

				let found = false;
				for (let z=0; z<store.boxes.length; z++) {
					let box = store.boxes[z];
					for (let i=0; i<box.sections.length; i++) {
						for (let j=0; j<box.sections[i].assignments.length; j++) {
							for (let b=0; b<box.sections[i].assignments[j].length; b++) {
								if (box.sections[i].assignments[j][b] == uuid) { //check uuid match
									console.log("This component was previously assigned and can be found at the following location:\nB"+(z+1)+"-"+"S"+(i+1)+"-"+(j+1)+"-"+(b+1))

									found = true;
									break;
								}
							}
							if (found) break;
						}
						if (found) break;
					}
				}
			}
		} else { //if different just add it into the list
			store.components.push(component);
			store.componentTotal++;
		}
	}
	return true;
}

const assignComponents = () => {
	return new Promise((resolve, reject) => {
		let cAssign = [];
		for (let i=0; i<store.components.length; i++) {
			if (!store.components[i].assigned) {
				cAssign.push([i, store.components[i]]); //idx, component
			}
		}

		if (cAssign.length == 0) {
			console.log("No components left to assign!");
			return resolve();
		} else {
			console.log(cAssign.length+" components left to assign");

			let assignN = n => {
				console.log("Assigning component "+(n+1)+" of "+cAssign.length);
				printComponent(store.components[cAssign[n][0]]);

				let availableBoxes = []; //box idx
				for (let i=0; i<store.boxes.length; i++) {
					let filled = true;
					let box = store.boxes[i];
					let space = getSpaceInBox(box);
					if (space > 0) {
						availableBoxes.push([i, space]);
					}
				}
				if (availableBoxes.length == 0) {
					console.warn("No boxes available! Add one before trying to assign components");
					return reject("No boxes available! Add one before trying to assign components");
				}

				console.log("Boxes available: "+availableBoxes.length);

				let availBoxTitles = [];
				for (let i=0; i<availableBoxes.length; i++) {
					availBoxTitles.push("Name: '"+store.boxes[availableBoxes[i][0]].title+"', freeSpace="+availableBoxes[i][1]);
				}

				inquirer.prompt({
					name: "bSel",
					message: "Select a box for component",
					type: "list",
					choices: availBoxTitles
				}).then(bSel => {
					bSel = bSel[Object.keys(bSel)[0]];
					let bIdx = 0; //global store box id
					for (let i=0; i<store.boxes.length; i++) {
						if (bSel.indexOf(store.boxes[i].title) > -1) {
							bIdx = i;
							break;
						}
					}
					let box = store.boxes[bIdx];

					printBox(box);

					let assignComponent = () => {
						let methodChoices = ["AutoAssign", "Manually"];
						inquirer.prompt({
							name: "aSel",
							message: "Pick assignment method",
							type: "list",
							choices: methodChoices
						}).then(method => {
							method = method[Object.keys(method)[0]];

							if (method == methodChoices[0]) { //AutoAssign gang rise up
								let assigned = false;
								for (let i=0; i<box.sections.length; i++) {
									for (let j=0; j<box.sections[i].assignments.length; j++) {
										for (let b=0; b<box.sections[i].assignments[j].length; b++) {
											/*
											Steps to assign box UUIDs

											1) Put component UUID in box assignment field
											2) Set "assigned" flag in component
											*/
											if (box.sections[i].assignments[j][b] == "") {
												store.boxes[bIdx].sections[i].assignments[j][b] = store.components[cAssign[n][0]].uuid; //i think my brain just exploded thats a lot of variables
												store.components[cAssign[n][0]].assigned = true;
												console.log("AutoAssigned to row="+(j+1)+", col="+(b+1));

												assigned = true;
												break;
											}
										}
										if (assigned) break;
									}
									if (assigned) break;
								}
								if (n >= cAssign.length-1) {
									return resolve();
								} else {
									assignN(n+1);
								}
							} else if (method == methodChoices[1]) {
								let sectionOptions = [];
								for (let i=0; i<box.sections.length; i++) {
									sectionOptions.push("Section "+(i+1)+" of type '"+box.sections[i].type+"'");
								}
								inquirer.prompt({
									name: "bSec",
									message: "Pick a section to put component in",
									type: "list",
									choices: sectionOptions
								}).then(sec => {
									sec = sec[Object.keys(sec)[0]];

									let secIdx = sectionOptions.indexOf(sec);

									let section = box.sections[secIdx];
									
									let rowOptions = [];
									let columnOptions = [];
									for (let i=0; i<section.height; i++) {
										rowOptions.push("Row "+(i+1));
									}
									for (let i=0; i<section.width; i++) {
										columnOptions.push("Column "+(i+1));
									}
									inquirer.prompt({
										name: "bRow",
										message: "Pick a row",
										type: "list",
										choices: rowOptions
									}).then(row => {
										inquirer.prompt({
											name: "bCol",
											message: "Pick a column",
											type: "list",
											choices: columnOptions
										}).then(col => {
											row = row[Object.keys(row)[0]];
											col = col[Object.keys(col)[0]];

											let rowIdx = rowOptions.indexOf(row);
											let colIdx = columnOptions.indexOf(col);

											if (section.assignments[rowIdx][colIdx] == "") { //it's empty so we gucci
												store.boxes[bIdx].sections[secIdx].assignments[rowIdx][colIdx] = store.components[cAssign[n][0]].uuid; //i think my brain just exploded thats a lot of variables
												store.components[cAssign[n][0]].assigned = true;

												if (n >= cAssign.length-1) {
													return resolve();
												} else {
													assignN(n+1);
												}
											} else { //spot filled
												console.log("That spot is currently filled. Try again");
												assignComponent();
											}
										})
									})
								})
							}
						})

					}
					assignComponent();
				})
			}
			assignN(0);
		}
	})
}

const printComponent = component => {
	let info;
	switch(component.type) {
		case cDefs.types.RESISTOR:
		case cDefs.types.CAPACITOR:
			info = "value "+component.additional.value+component.additional.valueUnit;
			break;
		case cDefs.types.IC:
		case cDefs.types.OTHER:
			info = "identifier "+component.additional.identifier;
			break;
		case cDefs.types.CRYSTAL:
			info = "frequency "+component.additional.frequency+component.additional.frequencyUnit;
			break;
		default:
			info = "unknown info";
			break;
	}
	info+= " of size '"+component.size+"'";
	console.log("Component: "+component.type+" with "+info);
	return;
}

const printBox = box => {
	/*
	Ex visualization
	Section Type: Small
	|-------------------------------|
	|0pf	| 1pf	| 2pf	| EMPTY	|
	|-------|-------|-------|-------|


	*/
	for (let i=0; i<box.sections.length; i++) {
		let section = box.sections[i];

		console.log("Section Type: "+section.type);
		let am = section.assignments;

		let divider = "";
		for (let j=0; j<section.width*8; j++) {
			divider+=(j == 0)?"|" : (j==(section.width*8-1)) ? "-|" : "-";
		}

		for (let j=0; j<am.length; j++) { //for each row
			console.log(divider); //print divider

			let printStr = "|";
			for (let b=0; b<am[j].length; b++) {
				if (am[j][b] == "") {
					printStr += " EMPTY\t|";
				} else {
					let component = componentLookup(am[j][b]); //get component info

					let info = "";
					switch(component.type) {
						case cDefs.types.RESISTOR:
						case cDefs.types.CAPACITOR:
							info = component.additional.value+component.additional.valueUnit;
							break;
						case cDefs.types.IC:
						case cDefs.types.OTHER:
							info = component.additional.identifier;
							break;
						case cDefs.types.CRYSTAL:
							info = component.additional.frequency+component.additional.frequencyUnit;
							break;
						default:
							info = "*";
							break;
					}
					info = info.substring(0,7);
					let padLength = Math.floor((7-info.length)/2); //do we need to pad it out
					if (padLength >= 1) {
						for (let i=0; i<padLength; i++) {
							info = " "+info; //preappend space
						}
					}

					printStr += info+"\t|";
				}
			}
			console.log(printStr);
		}
		console.log(divider);
	}
}

const componentLookup = uuid => {
	for (let i=0; i<store.components.length; i++) {
		if (store.components[i].uuid == uuid) {
			return store.components[i];
		}
	}
	return false;
}

const getSpaceInBox = box => {
	let s = 0;
	for (let i=0; i<box.sections.length; i++) {
		for (let j=0; j<box.sections[i].assignments.length; j++) {
			for (let b=0; b<box.sections[i].assignments[j].length; b++) {
				if (box.sections[i].assignments[j][b] == "") {
					s++;
				}
			}
		}
	}

	return s;
} 

/*
USER INPUT
*/

const main = () => {
	const mChoices = ["Load Component Book", "New Component Book"];
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
							message: "Select file",
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
	const mChoices = ["Add Component (Oneshot)", "Add Multiple Components", "Add Box (Oneshot)", "Add Multiple Boxes", "Assign Components", "Storage Info", "Save Data File", "Export Labels", "Exit"];
	inquirer.prompt({
		name: "mC",
		message: "Choose an action",
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
			let multiComponentChoices = ["Individually", "As Group"];
			inquirer.prompt({
				name: "pType",
				message: "Pick an option for how to assign multiple components",
				type: "list",
				choices: multiComponentChoices
			}).then(mChoice => {
				mChoice = mChoice[Object.keys(mChoice)[0]];
				let groupAdd = mChoice.indexOf(multiComponentChoices[1]) > -1;

				if (groupAdd) {
					groupComponentSelector().then(() => {
						console.log("Added components successfully");
						afterMain();
					}).catch(() => {
						afterMain();
					})
				} else {
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
				}
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
			assignComponents().then(() => {
				afterMain();
			}).catch(() => {
				afterMain();
			})
		} else if (choice == mChoices[5]) {
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
						console.log("\t"+box.sections[j].type+": W="+box.sections[j].width+", H="+box.sections[j].height);
					}
					printBox(box);
				}
			}
			console.log("\n~~~~ End Storage Info ~~~~");

			afterMain(); //return to main
		} else if (choice == mChoices[6]) {
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
		} else if (choice == mChoices[7]) {
			console.log("Pick save directory for the images:");
			dirPicker(".").then(dir => {
				exportImages(dir).then(() => {
					console.log("Exported images successfully!");
					afterMain();
				}).catch(e => {
					console.error("There was an error saving the images: "+e);
					afterMain();
				})
			});
		}
	})
}



main(); //let's get this show on the road shall we?