//Some of the code was yoinked from EaglePostProcessor and is very jank, I should replace it at some point
const {packageReplaceRules, nameReplaceRules, ignoreKeys, ignoredComponents} = require("./CSVComponentRules.js");
const cDefs = require("./componentDefinitions.js");

const fs = require('fs');
//const parse = require('csv-parse');
const path = require('path');
const { resolve } = require('path');
const { readdir } = require('fs').promises;

const debugMode = false;


const skipFirstLine = true; //skip first line in CSV (it only has a header)

function jankParse(data, opts, callback) { //lmao did I rly just write a CSV parser in about 7 minutes that only processes the first 4 elements? wow what a jank hack. bet it has a lot of bugs lol lets speedrun this boi
	let split = data.split("\r\n");
	if (split.length == 1) split = data.split("\n"); //JANK hack for macos generated linefeeds, it won't split properly if it's using only \n instead of \n\r
	
	let procRet = [];
	for (let b=0; b<split.length; b++) {
		let elemProps = [];
		let elemBuffer = "";
		let elemsParsedCount = 4;
		for (let c=0; c<split[b].length; c++) {
			if (elemsParsedCount <= 0) {
				break;
			}
			if (split[b][c] == (opts.delimiter||";")) {
				elemProps.push(elemBuffer.replace(new RegExp("\"", 'g'), ""));
				elemBuffer = "";
				elemsParsedCount--;
			} else {
				elemBuffer+=split[b][c];
			}
		}

		procRet.push(elemProps);
	}

	procRet.splice(-1,1); //remove last element dont ask why

	return callback(false,procRet);
}


const CSVToComponentList = function(csvPath, boardCount) {
	return new Promise((resolve, reject) => {
		if (boardCount == 0) return resolve([]); //just in case something dumb happens

		let csvData = fs.readFileSync(csvPath, {encoding:'utf8', flag:'r'});
		let components = []; //component list

		jankParse(csvData, {delimiter: ";"}, function(err, output) {
			if (err) {
				return reject("Error parsing CSV: "+err);
			} else {
				for (let i = (skipFirstLine)?1:0; i<output.length; i++) { //Skip first line if flag is set
					var name = output[i][2];
					var package = output[i][3];
					var value = output[i][1];
					if (name == package) {
						package = "unknown";
					} else {
						name = name.replace(new RegExp(package, 'g'), "");
					}

					//filter name and package by rules
					for (let j=0; j<packageReplaceRules.length; j++) {
						if (package.indexOf(packageReplaceRules[j][0]) > -1) {
							package = package.replace(new RegExp(packageReplaceRules[j][0], 'g'), packageReplaceRules[j][1]);
						}
					}

					for (let j=0; j<nameReplaceRules.length; j++) {
						if (name.indexOf(nameReplaceRules[j][0]) > -1) {
							name = name.replace(new RegExp(nameReplaceRules[j][0], 'g'), nameReplaceRules[j][1]);
						}
					}

					let ignore = false;
					for (let j=0; j<ignoredComponents.length; j++) {
						if (ignoredComponents[j][2]) { //strict
							if (name == ignoredComponents[j][0] && package.indexOf(ignoredComponents[j][1]) > -1) {
								if (debugMode || true) console.log("Strict - Ignored component "+name+", "+package);
								ignore = true; //ignore component since it's not a real one, like a solder jumper
							}
						} else {
							if (name.indexOf(ignoredComponents[j][0]) > -1 && package.indexOf(ignoredComponents[j][1]) > -1) {
								if (debugMode || true) console.log("Ignored component "+name+", "+package);
								ignore = true; //ignore component since it's not a real one, like a solder jumper
							}
						}
					}
					if (ignore) continue;

					//Dumb value matching to fix missing units/weird units
					switch (name) {
						case cDefs.types.RESISTOR:
							let defaultUnit = cDefs.units[cDefs.types.RESISTOR].normUnit;
							if (value.indexOf(defaultUnit) < 0) {
								value+= defaultUnit;
							}
							break;
						case cDefs.types.CAPACITOR:
							value = value.toLowerCase().replace(new RegExp("uf", 'g'), "μf"); //jank asf
							break;
					}
					value = value.replace(/\s/g, ''); //remove whitespace

					//Create new component as object
					let cObject = {
						quantity: Number(output[i][0])*boardCount,
						value: value,
						type: name,
						size: package
					};

					//Add additional fields (parse value data)
					let trueVal = trueUnit = "";
					for (let i=0; i<value.length; i++) { //Extract value and unit from contcatenated version
						let c = value.substring(i, i+1);
						if (isNaN(c) && c != ".") {
							trueUnit = value.substring(i);
							break;
						} else {
							trueVal += c;
						}
					}

					var normUnit = normVal = -1;
					var found = false;
					switch (name) {
						case cDefs.types.RESISTOR:
							let rUnits = cDefs.units[cDefs.types.RESISTOR]; //Normalize units
							normUnit = normVal = -1;
							found = false;
							for (let i=0; i<rUnits.resistance.length; i++) {
								if (rUnits.resistance[i][3]) { //strict compare?
									if (rUnits.resistance[i][1] == trueUnit) { // unit match
										normVal = trueVal*rUnits.resistance[i][2];
										normUnit = rUnits.normUnit;
										found = true;
										break;
									}
								} else {
									if (rUnits.resistance[i][1].toLowerCase() == trueUnit.toLowerCase()) { // unit match
										normVal = trueVal*rUnits.resistance[i][2];
										normUnit = rUnits.normUnit;
										found = true;
										break;		
									}
								}
							}
							if (!found) console.log("No valid unit was found in parsing resistor value '"+value+"'");

							cObject.additional = {
								value: Number(trueVal),
								valueUnit: trueUnit,
								normalizedValue: Number(normVal),
								normalizedValueUnit: normUnit
							}
							break;
						case cDefs.types.CAPACITOR:
							let cUnits = cDefs.units[cDefs.types.CAPACITOR]; //Normalize units
							normUnit = normVal = -1;
							found = false;
							for (let i=0; i<cUnits.capacitance.length; i++) {
								if (cUnits.capacitance[i][3]) { //strict compare?
									if (cUnits.capacitance[i][1] == trueUnit) { // unit match
										normVal = trueVal*cUnits.capacitance[i][2];
										normUnit = cUnits.normUnit;
										found = true;
										break;
									}
								} else {
									if (cUnits.capacitance[i][1].toLowerCase() == trueUnit.toLowerCase()) { // unit match
										normVal = trueVal*cUnits.capacitance[i][2];
										normUnit = cUnits.normUnit;
										found = true;
										break;		
									}
								}
							}
							if (!found) console.log("No valid unit was found in parsing capacitor value '"+value+"'");

							cObject.additional = {
								value: Number(trueVal),
								valueUnit: trueUnit,
								normalizedValue: Number(normVal),
								normalizedValueUnit: normUnit
							}
							break;
					}

					//Lastly make sure value exists, replace with some category if not
					if (typeof cObject.value == "undefined" || cObject.value == "") {
						cObject.value = (typeof cObject.type != "undefined" && cObject.type != "") ? cObject.type : cObject.size;
					}

					//Check if it exists and whether to combine with existing component
					let fullMatch = false;
					for (let j=0; j<components.length; j++) {
						let cpKeys = Object.keys(components[j]);
						let cKeys = Object.keys(cObject);
						let commonKeys = []; //only check keys that are the same (in case csvs have different formats for some reason idk y)
						for (let z = 0; z<cpKeys.length; z++) {
							if (cKeys.indexOf(cpKeys[z]) > -1 && ignoreKeys.indexOf(cpKeys[z]) < 0) {
								commonKeys.push(cpKeys[z]);
							}
						}

						let partialMatch = true; 
						for (let z=0; z<commonKeys.length; z++) { //only compare common keys
							if (cObject[commonKeys[z]] != components[j][commonKeys[z]]) {
								partialMatch = false;
								break;
							}
						}

						if (partialMatch) { //if it's still a partial match, that means that the components matched exactly
							components[j]["qty"] += Number(cObject["qty"]); //add the quantity to the component in existing db
							fullMatch = true;
						}
					}

					if (!fullMatch) {
						components.push(cObject);
					}
				}

				console.log("CSV processed successfully; parsed "+components.length+" components");
				for (let i=0; i<components.length; i++) {
				}
				return resolve(components);
			}
		})
	})
}

module.exports = CSVToComponentList;