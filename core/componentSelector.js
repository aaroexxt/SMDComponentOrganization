const cDefs = require("./componentDefinitions.js");
const inquirer = require('inquirer');

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
				case cDefs.types.LED:
					component.type = cDefs.types.LED;
					inquirer.prompt({
						name: "idt",
						message: "Enter LED identifier or model number:",
						type: "input"
					}).then(ident => {
						ident = ident[Object.keys(ident)[0]];
						component.additional.identifier = ident;

						inquirer.prompt({
							name: "col",
							message: "Pick color:",
							type: "list",
							choices: cDefs.ledColors
						}).then(color => {
							color = color[Object.keys(color)[0]];

							if (color.toLowerCase().indexOf("other") > -1) { //"other"
								inquirer.prompt({
									name: "col2",
									message: "Enter a color:",
									type: "input"
								}).then(customColor => {
									customColor = customColor[Object.keys(customColor)[0]];
									component.additional.color = customColor;

									return resolve(component);
								})
							} else {
								component.additional.color = color;

								return resolve(component);
							}
						})
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
							message: "Enter frequency (in "+freqChoice+"):",
							type: "input"
						}).then(freq => {
							freq = freq[Object.keys(freq)[0]];

							inquirer.prompt({
								name: "lCap",
								message: "Enter load capacitance (pF):",
								type: "input"
							}).then(lCap => {
								lCap = lCap[Object.keys(lCap)[0]];

								inquirer.prompt({
									name: "idt",
									message: "Enter crystal identifier or model number:",
									type: "input"
								}).then(ident => {
									ident = ident[Object.keys(ident)[0]];

									component.additional.identifier = ident;
									component.additional.frequency = freq;
									component.additional.frequencyUnit = freqChoice;
									component.additional.loadCapacitance = lCap;
									component.additional.loadCapacitanceUnit = "pF";
									
									return resolve(component);
								})								
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

module.exports = componentSelector;