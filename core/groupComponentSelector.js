const cDefs = require("./componentDefinitions.js");
const inquirer = require('inquirer');

/*
COMPONENT SELECTION
*/

const groupComponentSelector = () => {
	return new Promise((resolve, reject) => {
		let generatedComponentList = [];

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

							let tolUnit = component.additional.toleranceUnit;
							let tol = component.additional.tolerance;
							let idxT = toleranceUnitsLong.indexOf(tolUnit);

							let normCapTol;
							if (tolUnit.indexOf("%") > -1) {
								normCapTol = normCap*(tol/100);
							} else {
								normCapTol = tol*toleranceMults[idxT];
							}
							component.additional.normalizedTolerance = fixFloatRounding(normCapTol);
							component.additional.normalizedToleranceUnit = cDefs.units[cDefs.types.CAPACITOR].normUnit;

							doneN(n);
						})
					})
					break;
			}
		}

		function doneN(n) {
			component.uuid = generateUUID(); //randomize the UUID
			generatedComponentList.push(JSON.parse(JSON.stringify(component))); //break dependence
			if (n >= numComponents-1) {
				return resolve(generatedComponentList);
			} else {
				askN(n+1);
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

module.exports = groupComponentSelector;