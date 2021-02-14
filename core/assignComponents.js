const inquirer = require('inquirer');
const {printComponent, printBox} = require("./printComponentBox.js");

const assignComponents = (store) => {
	return new Promise((resolve, reject) => {
		let cAssign = [];
		for (let i=0; i<store.components.length; i++) {
			if (!store.components[i].assigned) {
				cAssign.push([i, store.components[i]]); //idx, component
			}
		}

		if (cAssign.length == 0) {
			console.log("No components left to assign!");
			return resolve(store);
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
					if (space > 0 && box.selectable) { //is it open and selectable?
						availableBoxes.push([i, space]);
					}
				}
				if (availableBoxes.length == 0) {
					console.warn("No boxes available! Add one before trying to assign components");
					return reject("No boxes available! Add one before trying to assign components");
				}

				console.log("Boxes available: "+availableBoxes.length);

				let availBoxTitles = [];
				let boxUUIDs = [];
				for (let i=0; i<availableBoxes.length; i++) {
					availBoxTitles.push("Name: '"+store.boxes[availableBoxes[i][0]].title+"', freeSpace="+availableBoxes[i][1]);
					boxUUIDs.push(store.boxes[availableBoxes[i][0]].uuid);
				}

				inquirer.prompt({
					name: "bSel",
					message: "Select a box for component",
					type: "list",
					choices: availBoxTitles
				}).then(bSel => {
					bSel = bSel[Object.keys(bSel)[0]];
					let selIdx = availBoxTitles.indexOf(bSel);

					let bIdx = 0; //global store box id
					for (let i=0; i<store.boxes.length; i++) {
						if (boxUUIDs[selIdx] == store.boxes[i].uuid) {
							bIdx = i;
							break;
						}
					}
					let box = store.boxes[bIdx];

					printBox(store, box);

					let assignComponent = () => {
						let methodChoices = ["AutoAssign", "Manually", "Cancel"];
						let sectionChoices = [];
						for (let i=0; i<box.sections.length; i++) {
							let sectionAvailable = false;
							for (let j=0; j<box.sections[i].assignments.length; j++) {
								for (let b=0; b<box.sections[i].assignments[j].length; b++) {
									if (box.sections[i].assignments[j][b] == "") {
										sectionAvailable = true;
										sectionChoices.push([i, methodChoices.length]); //push index of section and index of choice
										methodChoices.push("AutoAssign to Section "+(i+1)+" of type '"+box.sections[i].type+"'");
										break;
									}
								}
								if (sectionAvailable) break;
							}
							
						}
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
									return resolve(store);
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
													return resolve(store);
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
							} else if (method == methodChoices[2]) { //just cancel
								return resolve(store);
							} else {
								let methodIdx = methodChoices.indexOf(method);
								let assigned = false;
								for (let i=0; i<sectionChoices.length; i++) {
									if (sectionChoices[i][1] == methodIdx) {
										let sectionIdx = sectionChoices[i][0];

										for (let j=0; j<box.sections[sectionIdx].assignments.length; j++) {
											for (let b=0; b<box.sections[sectionIdx].assignments[j].length; b++) {
												/*
												Steps to assign box UUIDs

												1) Put component UUID in box assignment field
												2) Set "assigned" flag in component
												*/
												if (box.sections[sectionIdx].assignments[j][b] == "") {
													store.boxes[bIdx].sections[sectionIdx].assignments[j][b] = store.components[cAssign[n][0]].uuid; //i think my brain just exploded thats a lot of variables
													store.components[cAssign[n][0]].assigned = true;
													console.log("AutoAssigned in section "+(sectionIdx+1)+"to row="+(j+1)+", col="+(b+1));

													assigned = true;
													break;
												}
											}
											if (assigned) break;
										}
										if (assigned) break;
									}
								}

								if (assigned) {
									if (n >= cAssign.length-1) {
										return resolve(store);
									} else {
										assignN(n+1);
									}
								} else {
									console.log("Something went wrong... no free space in section? Running component again");
									assignN(n);
								}
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

module.exports = assignComponents;