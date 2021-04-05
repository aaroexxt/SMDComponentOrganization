//labelGeneratorV1.js
//Written by Aaron Becker later then he should be awake lol

/*Todos:
- Lookup function with box visualization, highlight in red where component would go
- change rendering method to dynamically fill page (when get to too large, just create another page) instead of precomputing
- finish component additional asking for other types (diode etc)
- unassign function
- 'auto' unit selection which will convert to best possible unit choice
- check if component is valid before writing

- delete assigned or unassigned component capability

- function to check which components in box are low

- DO THIS RN: ABILITY TO DELETE RECENTLY ASSIGNED COMPONENTS
- todo: make components that sometimes have model numbers (LED, Crystal, etc) be factored into pcb search
*/


//libs
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

//Addtl files
const { dirPicker, getFilesInDir } = require("./core/directoryUtils.js");
const {exportImages, exportComponentList} = require("./core/exportImages.js");

//Component selectors
const boxSelector = require("./core/boxSelector.js");
const componentSelector = require("./core/componentSelector.js");
const groupComponentSelector = require("./core/groupComponentSelector.js");

//Definitions
const cDefs = require("./core/componentDefinitions.js");
const bDefs = require("./core/boxDefinitions.js");

//Printing stuff
const {printComponent, returnComponentWithQuantity, printBox} = require("./core/printComponentBox.js");

const {componentLookup, getSpaceInBox} = require("./core/lookup.js");
const {levenshtein, ratcliffObershelp} = require("./core/stringCompare.js");
const {baseDir, bomBaseDir} = require("./core/baseDirectories.js");
const CSVToComponentList = require("./core/CSVToComponentList.js");

//Component manip stuff 
const assignComponents = require("./core/assignComponents.js");

//Settings
const strictComponentComparison = false; //enables strict checks like matching voltage range for capacitors in comparison
const componentSimilarityThreshold = 0.6; //string compare threshold in CSV parsing
const minComponentsBeforeWarning = 5; //minimum amount of components in box before warning

var store = {
	boxes: [],
	components: [],
	componentTotal: -1,
	boxTotal: -1
}
var sessionComponents = []; //new components added in this session

/*
FILE HANDLING
*/

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
			if (aAdd.tolerance != bAdd.tolerance && strictComponentComparison) return false;
			if (aAdd.normalizedValue != bAdd.normalizedValue) return false;
			break;
		case cDefs.types.CAPACITOR:
			if (aAdd.normalizedTolerance != bAdd.normalizedTolerance && strictComponentComparison) return false;
			if (aAdd.normalizedValue != bAdd.normalizedValue) return false;
			if (aAdd.maxVoltage != bAdd.maxVoltage && strictComponentComparison) return false;
			break;
		case cDefs.types.OTHER:
		case cDefs.types.IC:
			if (aAdd.identifier.toLowerCase() != bAdd.identifier.toLowerCase()) return false;
			//Description can slide
			break;
		case cDefs.types.LED:
			if (aAdd.color.toLowerCase() != bAdd.color.toLowerCase()) return false;
			break;
		case cDefs.types.CRYSTAL:
			if (aAdd.frequency != bAdd.frequency) return false;
			if (aAdd.frequencyUnit != bAdd.frequencyUnit) return false;
			if (aAdd.loadCapacitance != bAdd.loadCapacitance) return false;
			break;
	}

	return true; //If you get here, wowowow congrats there's truly a duplicate component
}

const approxComponentCompare = (a, b) => {
	if (a.type != b.type) return false;
	if (a.size != b.size) return false;

	let aAdd = a.additional;
	let bAdd = b.additional;
	switch (a.type) {
		case cDefs.types.RESISTOR:
		case cDefs.types.CAPACITOR:
			if (aAdd.normalizedValue != bAdd.normalizedValue) return false;
			break;
		default:
			return false;
			break;
	}

	return true;
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
				if (!found) {
					console.warn("The merged component has been assigned, but could not be located within any box.");
				}
			} else {
				console.log("The merged component has not yet been assigned, and as such a location cannot be provided.");
			}
		} else { //if different just add it into the list
			store.components.push(component);
			sessionComponents.push(component);
			store.componentTotal++;
		}
	}
	return true;
}

const actDeactBoxes = () => {
	return new Promise((resolve, reject) => {
		console.log("Box selectability utility for assigning components (* = not selectable)");

		let bActDeact = () => {
			let bChoices = ["Exit"];
			let bInf = [-1];
			for (let i=0; i<store.boxes.length; i++) {
				let box = store.boxes[i];
				let space = getSpaceInBox(box);
				bChoices.push((box.selectable?"":"* ") + "'"+box.title+"'"+", space="+space);
				bInf.push(i);
			}

			inquirer.prompt({
				name: "bAct",
				message: "Select box to toggle selectablility",
				type: "rawlist",
				choices: bChoices
			}).then(bChoice => {
				bChoice = bChoice[Object.keys(bChoice)[0]];

				if (bChoice == bChoices[0]) {
					return resolve();
				} else {
					let bIdx = bInf[bChoices.indexOf(bChoice)];
					store.boxes[bIdx].selectable = !store.boxes[bIdx].selectable;
					bActDeact();
				}
			})
		}
		bActDeact();
	})
}

const delBoxSelector = () => {
	return new Promise((resolve, reject) => {
		let bChoices = ["Exit"];
		let bInf = [-1];
		for (let i=0; i<store.boxes.length; i++) {
			let box = store.boxes[i];
			let space = getSpaceInBox(box);
			bChoices.push((box.selectable?"":"* ") + "'"+box.title+"'"+", space="+space);
			bInf.push(i);
		}

		inquirer.prompt({
			name: "bDel",
			message: "Select box to delete",
			type: "rawlist",
			choices: bChoices
		}).then(bChoice => {
			bChoice = bChoice[Object.keys(bChoice)[0]];

			if (bChoice == bChoices[0]) {
				return resolve();
			} else {
				let bIdx = bInf[bChoices.indexOf(bChoice)];
				store.boxes.splice(bIdx, 1); //actually remove it
				return resolve();
			}
		})
	});
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
			dirPicker(baseDir).then(dir => {
				getFilesInDir(dir).then(files => {
					let validFiles = [];
					for (let i=0; i<files.length; i++) {
						if (files[i].toLowerCase().indexOf(".json") > -1 && files[i].indexOf("package.json") == -1) {
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
	const mChoices = ["Add (Component, Box)", "Delete (Component, Box)", "Assign (Component)", "Edit Selectability (Box)", "Storage Info", "Save Data File", "Export Labels", "Export Session Labels", "BOM Management", "Exit"];
	inquirer.prompt({
		name: "mC",
		message: "Choose an action",
		type: "list",
		choices: mChoices
	}).then(choice => {
		choice = choice[Object.keys(choice)[0]];

		if (choice == mChoices[0]) { //add
			addComponentMenu();
		} else if (choice == mChoices[1]) { //delete
			deleteComponentMenu();
		} else if (choice == mChoices[2]) {
			assignComponents(store).then(() => {
				afterMain();
			})
		} else if (choice == mChoices[3]) {
			actDeactBoxes().then(() => {
				afterMain();
			}).catch(() => {
				afterMain();
			})
		} else if (choice == mChoices[4]) {
			console.log("\n~~~~ Storage Info ~~~");
			console.log("Total Box Count: "+store.boxTotal);
			if (store.boxTotal > 0) {
				console.log("~~~~~\nBox Breakdown:");
				//name sectionCount
				//	sectionType: width=w, height=h

				for (let i=0; i<store.boxes.length; i++) {
					let box = store.boxes[i];
					console.log("Box '"+box.title+"' has "+box.sections.length+" section(s)");
					for (let j=0; j<box.sections.length; j++) {
						console.log("\t"+box.sections[j].type+": W="+box.sections[j].width+", H="+box.sections[j].height);
					}
					printBox(store, box);
					console.log("\n");
				}
			}
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

			let entryTotal = 0;
			let componentTotal = 0;
			for (let i=0; i<counts.length; i++) {
				console.log(counts[i][0].substring(0, 15)+((counts[i][0].length > 7)?"\t":"\t\t")+counts[i][1]+"\t\t"+counts[i][2]); //another funky fresh oneliner from yours truly
				entryTotal+=counts[i][1];
				componentTotal+=counts[i][2];
			}
			console.log("\nTOTAL\t\t"+entryTotal+"\t\t"+componentTotal);
			console.log("\n~~~~ End Storage Info ~~~~");

			afterMain(); //return to main
		} else if (choice == mChoices[5]) {
			console.log("Save to directory:");
			
			dirPicker(baseDir).then(dir => {
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
		} else if (choice == mChoices[6]) {
			console.log("Pick save directory for the images:");
			dirPicker(baseDir).then(dir => {
				exportImages(store, dir).then(() => {
					console.log("Exported images successfully!");
					afterMain();
				})
			});
		} else if (choice == mChoices[7]) {
			if (sessionComponents.length == 0) {
				console.log("No new components added this session to save!");
				afterMain();
			} else {
				console.log("Pick save directory for the session images:");
				dirPicker(baseDir).then(dir => {
					exportComponentList(sessionComponents, store.boxes, dir, "sessionLabels").then(() => {
						console.log("Exported session images successfully!");
						afterMain();
					}).catch(e => {
						console.error("There was an error saving the images: "+e);
						afterMain();
					})
				});
			}
		} else if (choice == mChoices[8]) {
			BOMMenu();
		} else if (choice == mChoices[9]) {
			let c = ["Quit", "Don't Quit"]
			inquirer.prompt({
				"message": "Are you sure you want to exit?",
				"type": "confirm",
				"name": "ex"
			}).then(e => {
				if (e[Object.keys(e)[0]]) {
					console.log("Exiting...");
				} else {
					console.log("Not exiting.");
					afterMain();
				}
			})
		}
	})
}

const addComponentMenu = () => {
	let mChoices = ["Back", "Add Component (Oneshot)", "Add Multiple Components", "Add Box (Oneshot)", "Add Multiple Boxes"];
	inquirer.prompt({
		name: "cAdd",
		type: "list",
		choices: mChoices,
		message: "Choose an action"
	}).then(choice => {
		choice = choice[Object.keys(choice)[0]];

		if (choice == mChoices[0]) {
			afterMain();
		} else if (choice == mChoices[1]) {
			componentSelector().then(component => {
				addComponent(component); //Actually add it to store
				afterMain();
			}).catch(() => {
				afterMain();
			});
		} else if (choice == mChoices[2]) {
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
					groupComponentSelector().then(list => {
						list.forEach(component => addComponent(component));
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
		} else if (choice == mChoices[3]) {
			boxSelector().then(box => {
				store.boxes.push(box); //add box!
				store.boxTotal++;
				console.log("Added box successfully");
				afterMain();
			})
		} else if (choice == mChoices[4]) {
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
		}
	})
}

const deleteComponentMenu = () => {
	let mChoices = ["Back", "Delete Box"];
	inquirer.prompt({
		name: "dMenu",
		message: "Pick an action",
		choices: mChoices,
		type: "list"
	}).then(choice => {
		choice = choice[Object.keys(choice)[0]];

		if (choice == mChoices[0]) {
			afterMain();
		} else if (choice == mChoices[1]) {
			delBoxSelector().then(() => {
				afterMain();
			}).catch(() => {
				afterMain();
			})
		}
	})
}

const BOMMenu = () => {
	let mChoices = ["Back", "Eagle BOM CSV"];
	inquirer.prompt({
		name: "eBom",
		message: "Pick an option",
		choices: mChoices,
		type: "list"
	}).then(choice => {
		choice = choice[Object.keys(choice)[0]];

		if (choice == mChoices[0]) {
			afterMain();
		} else {
			let allComponents = [];
			let allProjects = [];

			const csvPicker = () => {
				console.log("Pick a project file:");
				dirPicker(bomBaseDir).then(dirs => {
					getFilesInDir(dirs).then(files => {
						if (files.length == 0) {
							console.log("Oop no files found in folder, pick another project");
							csvPicker();
						} else {
							let csvs = [];
							for (let i=0; i<files.length; i++) {
								if (files[i].toLowerCase().indexOf(".csv") > -1) {
									csvs.push(files[i]);
								}
							}

							switch (csvs.length) {
								case 0:
									console.error("Oop no CSV files found, pick another project");
									csvPicker();
									break;
								case 1:
									csvFound(csvs[0]);
									break;
								default:
									inquirer.prompt({
										name: "Pick a CSV file",
										type: "list",
										choices: csvs
									}).then(csvchoice => {
										let keys = Object.keys(csvchoice);

										csvFound(csvchoice[keys[0]]);
									}).catch(err => {
										console.error(err);
									});
									break;
							}
						}
					})
				})
			}
			csvPicker(); //immediately call CSVPicker for the first time

			const csvFound = csvPath => {
				inquirer.prompt({
					name: "amt",
					message: "Amount of this project that are being made?",
					type: "number"
				}).then(amnt => {
					amnt = amnt[Object.keys(amnt)[0]];

					let projectName = csvPath.substring(csvPath.lastIndexOf("/")+1, csvPath.lastIndexOf("."));
					allProjects.push([projectName, amnt]);

					CSVToComponentList(csvPath, amnt).then(components => {
						for (let i=0; i<components.length; i++) {
							allComponents.push(components[i]);
						}

						inquirer.prompt({
							name: "addAnother",
							message: "Add another CSV file?",
							type: "confirm"
						}).then(addAnother => {
							addAnother = addAnother[Object.keys(addAnother)[0]];

							if (addAnother) { //go back and add another csv
								csvPicker(); //go back to picker
							} else { //continue on to processing
								let cChoices = ["Immediately Remove From Inventory", "Don't Remove From Inventory (dry run)"];
								inquirer.prompt({
									name: "irq",
									message:"What do you want to do with component data from CSV file(s)?",
									type: "list",
									choices: cChoices
								}).then(cChoice => {
									cChoice = cChoice[Object.keys(cChoice)[0]];
									let removeFromBOM = cChoice == cChoices[0];
									console.log(removeFromBOM ? "Will remove parsed components from BOM":"Dry run mode");

									processParsedComponents(allComponents, removeFromBOM);

								})
							}
						})

					})

					
					
					
				})

				const processParsedComponents = (components, removeFromBOM) => {
					console.log("Checking parsed components against store...");

					let foundComponents = [];
					let notFoundComponents = [];


					/*
					STEP 1: iterate through component store and see if there are any matches
					*/

					for (let i=0; i<components.length; i++) {
						let component = components[i];

						switch (component.type) {
							case cDefs.types.RESISTOR: //For these two, the normalizedValue stuff should be ready to use
							case cDefs.types.CAPACITOR:
								let found = false;
								for (let j=0; j<store.components.length; j++) {
									let storeComponent = store.components[j];
									if (approxComponentCompare(component, storeComponent)) {
										foundComponents.push([j, component.quantity]);
										// console.log("HIT STORE for "+component.value+", "+component.size);
										found = true;
										break;
									}
								}
								// if (!found) console.log("NOHIT store for "+component.value+", "+component.size);
								if (!found) notFoundComponents.push([component, component.quantity]);
								break;
							//case cDefs.types.LED:
							default:
								let maxSimilar = similarIdx = -1;
								for (let j=0; j<store.components.length; j++) {
									let storeComponent = store.components[j];
									let compareTo;
									switch (storeComponent.type) {
										case cDefs.types.IC:
										case cDefs.types.OTHER:
											compareTo = storeComponent.additional.identifier;
											break;
										case cDefs.types.CRYSTAL:
											compareTo = storeComponent.additional.frequency+storeComponent.additional.frequencyUnit;
											break;
										case cDefs.types.LED:
											compareTo = storeComponent.additional.color;
											break;
										default:
											continue; //skip loop if it didn't find it
											break;
									}
									let similarity = ratcliffObershelp(component.value, compareTo);

									if (similarity > maxSimilar) {
										maxSimilar = similarity;
										similarIdx = j;
									}
								}

								if (maxSimilar > componentSimilarityThreshold) { //make sure it matches enough
									// console.log("CHIT STORE for "+component.value+", "+component.size);
									foundComponents.push([similarIdx, component.quantity]);
								} else {
									notFoundComponents.push([component, component.quantity]);
									// console.log("CNOHIT store for "+component.value+", "+component.size);
								}

								break;
						}
					}

					/*
					STEP 2: uniqueify lists to combine any labels that refer to the same component (B120-13-F from zenith I'm looking at u)
					*/
					for (let i=foundComponents.length - 1; i>=0; i--) { //Iterate in reverse to avoid breaking loop when we remove elements
						for (let j=0; j<foundComponents.length; j++) {
							if (i == j) continue; //don't check elements against themselves
							if (foundComponents[i][0] == foundComponents[j][0]) { //indexes match, combine
								foundComponents[i][1] += foundComponents[j][1];
								foundComponents.splice(j, 1);
								break;
							}
						}
					}

					for (let i=notFoundComponents.length - 1; i>=0; i--) { //Iterate in reverse to avoid breaking loop when we remove elements
						for (let j=0; j<notFoundComponents.length; j++) {
							if (i == j) continue; //don't check elements against themselves
							let c1 = notFoundComponents[i][0];
							let c2 = notFoundComponents[j][0]
							if (c1.value == c2.value && c1.type == c2.type && c1.size == c2.size) { //data matches, combine
								notFoundComponents[i][1] += notFoundComponents[j][1];
								notFoundComponents[i][0].quantity += notFoundComponents[j][0].quantity;
								notFoundComponents.splice(j, 1);
								break;
							}
						}
					}

					/*
					STEP 3: take components found in store, subtract quantities and find out if store has enough
					*/
					//Separation 1: whether inventory is good
					let enoughComponents = [];
					let notEnoughComponents = [];

					//Separation 2: whether they're assigned
					let assignedComponents = [];
					let unassignedComponents = [];

					for (let i=0; i<foundComponents.length; i++) {
						let matchIdx = foundComponents[i][0];
						let quantity = foundComponents[i][1];
						let prevQuantity = JSON.parse(JSON.stringify(store.components[matchIdx].quantity));
						let newQuantity = store.components[matchIdx].quantity - quantity; //subtract quantity since we're using them

						if (removeFromBOM) store.components[matchIdx].quantity = newQuantity; //only remove from BOM if option specified
						if (store.components[matchIdx].assigned) {
							let uuid = store.components[matchIdx].uuid;

							let found = false;
							for (let z=0; z<store.boxes.length; z++) {
								let box = store.boxes[z];
								for (let i=0; i<box.sections.length; i++) {
									for (let j=0; j<box.sections[i].assignments.length; j++) {
										for (let b=0; b<box.sections[i].assignments[j].length; b++) {
											if (box.sections[i].assignments[j][b] == uuid) { //check uuid match

												let loc = "B"+(z+1)+"-"+"S"+(i+1)+"-"+(j+1)+"-"+(b+1);
												assignedComponents.push([store.components[matchIdx], quantity, prevQuantity, newQuantity, loc]);
												if (newQuantity > minComponentsBeforeWarning) {
													enoughComponents.push([store.components[matchIdx], newQuantity]);
												} else {
													notEnoughComponents.push([store.components[matchIdx], newQuantity]);
												}

												found = true;
												break;
											}
										}
										if (found) break;
									}
									if (found) break;
								}
							}
						} else { //Component is unassigned
							unassignedComponents.push([store.components[matchIdx], quantity, prevQuantity, newQuantity])
							if (newQuantity > minComponentsBeforeWarning) {
								enoughComponents.push([store.components[matchIdx], newQuantity]);
							} else {
								notEnoughComponents.push([store.components[matchIdx], newQuantity]);
							}
						}
					}

					let printable = "";

					//Uniquify allProjects
					for (let i=allProjects.length - 1; i>=0; i--) { //Iterate in reverse to avoid breaking loop when we remove elements
						for (let j=0; j<allProjects.length; j++) {
							if (i == j) continue; //don't check elements against themselves
							if (allProjects[i][0] == allProjects[j][0]) { //indexes match, combine
								allProjects[i][1] += allProjects[j][1];
								allProjects.splice(j, 1);
								break;
							}
						}
					}

					let projectName = allProjects[0][0];
					for (let i=1; i<allProjects.length; i++) {
						projectName+="_"+allProjects[i][0];
					}


					printable += "SMDComponentOrganization V2\nBy Aaron Becker\n\n";
					printable += "Report Generated On "+new Date().toLocaleString()+"\n";
					printable += "Project(s) included in report:\n";
					for (let i=0; i<allProjects.length; i++) {
						printable+= "\t"+allProjects[i][1]+"x "+allProjects[i][0]+"\n";
					}
					printable += "\n----------------------\n\n";

					printable += ("You have enough of the following components in boxes (remaining amount):\n\n");
					for (let i=0; i<enoughComponents.length; i++) {
						printable += returnComponentWithQuantity(enoughComponents[i][0], enoughComponents[i][1])+"\n";
					}
					if (enoughComponents.length == 0) printable += ("<<< CATEGORY EMPTY >>>");
					printable += "\n----------------------\n\n";

					printable += ("You should consider ordering more of the following components (remaining amount):\n\n");
					for (let i=0; i<notEnoughComponents.length; i++) {
						printable += returnComponentWithQuantity(notEnoughComponents[i][0], notEnoughComponents[i][1])+"\n";
					}
					if (notEnoughComponents.length == 0) printable += ("<<< CATEGORY EMPTY >>>");

					printable += "\n----------------------\n\n";
					printable += ("The following components aren't in the collection and need to be ordered:\n\n");
					for (let i=0; i<notFoundComponents.length; i++) {
						printable += returnComponentWithQuantity(notFoundComponents[i][0])+"\n";
					}
					if (notFoundComponents.length == 0) printable += ("<<< CATEGORY EMPTY >>>");

					printable += "\n\n----------------------\n\n\n";
					printable += "In-Collection Component Report\n\n";

					printable+= "Assigned (P = previously had, N = need, H = have after building):\n\n";
					for (let i=0; i<assignedComponents.length; i++) {
						printable += "P"+assignedComponents[i][2]+"x\tN"+assignedComponents[i][1]+"x\tH"+returnComponentWithQuantity(assignedComponents[i][0], assignedComponents[i][3])+" in location "+assignedComponents[i][4]+"\n";
					}
					if (assignedComponents.length == 0) printable += ("<<< CATEGORY EMPTY >>>");
					printable += "\n\n----------------------\n\n";

					printable+= "Unassigned:\n\n";
					for (let i=0; i<unassignedComponents.length; i++) {
						// printable += "Had "+assignedComponents[i][2]+"x, used "+assignedComponents[i][1]+"x, now have "+returnComponentWithQuantity(assignedComponents[i][0], assignedComponents[i][3])+" in location "+assignedComponents[i][3]+"\n";
					}
					if (unassignedComponents.length == 0) printable += ("<<< CATEGORY EMPTY >>>");

					let rChoices = ["Print report to console", "Save report to file (as "+projectName+".txt)", "Save report to file (custom name)", "Back to Main Menu"]
					
					const afterReport = () => {
						
						const writeReport = (path, data) => {
							const doWrite = () => { //the lengths I go to to save duplicating code...
								fs.writeFile(path, data, function(err) {
									if (err) {
										console.error("Error writing file: "+err);
										afterReport();
									} else {
										console.log("Written file successfully to "+path);
										afterReport();
									}
								});
							}

							if (fs.existsSync(path)) {
								inquirer.prompt({
									type: "confirm",
									name: "overw",
									message: "Report file already exists, overwrite?"
								}).then(ovw => {
									ovw = ovw[Object.keys(ovw)[0]];

									if (ovw) {
										doWrite();
									} else { //j return to menu if no overwrite
										afterReport();
									}
								})
							} else {
								doWrite();
							}
							
						}

						inquirer.prompt({
							name: "tD",
							message:"A report has been generated successfully. What would you like to do?",
							choices: rChoices,
							type: "list"
						}).then(repChoice => {
							repChoice = repChoice[Object.keys(repChoice)[0]];

							if (repChoice == rChoices[0]) {
								console.log(printable);
								afterReport();
							} else if (repChoice == rChoices[1]) {
								let fPath = path.join(__dirname,projectName+".txt");
								writeReport(fPath, printable);
							} else if (repChoice == rChoices[2]) {
								inquirer.prompt({
									name: "cName",
									message: "Enter a filename (no extension please):",
									type: "input"
								}).then(fName => {
									fName = fName[Object.keys(fName)[0]];
									let fPath = path.join(__dirname,fName+".txt");
									writeReport(fPath, printable);
								})
							} else {
								afterMain();
							}
						})
					}
					afterReport(); //trigger after report

				}
			}
		}
	})
}



main(); //let's get this show on the road shall we?