const cDefs = require("./componentDefinitions.js");
const bDefs = require("./boxDefinitions.js");
const inquirer = require('inquirer');

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
			sections: [],
			selectable: true
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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = boxSelector;