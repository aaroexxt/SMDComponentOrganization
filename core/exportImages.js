//required modules
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
//additional component settings
const cDefs = require("./componentDefinitions.js");

//constants
const canvasWidth = 4; //in
const canvasPrintableHeight = 6; //in
const canvasHeight = 6.5; //in

const ppi = 300;
const canvasWidthPx = canvasWidth*ppi;
const canvasHeightPx = canvasPrintableHeight*ppi;
const canvasActualHeightPx = canvasHeight*ppi;

const inToPx = uIn => {
	return uIn*ppi;
}

//Label size defs
const heightBoxLabel = inToPx(1.25);
const componentLabelDims = {
	"small": [inToPx(0.35), inToPx(0.6), 10, 50], //height, width in px, max text len, font size
	"medium": [inToPx(0.4), inToPx(1.32), 15, 60],
	"large": [inToPx(1.3), inToPx(1.32), 15, 75]
}

let writeCanvas = (canvas, imgName, dir) => { //will overwrite any file already there
	let buf = canvas.toBuffer('image/png');
	fs.writeFileSync(path.join(dir, (imgName.indexOf("png") > -1) ? imgName : imgName+".png"), buf);
}

let initBasicCanvas = () => {
	let canvas = createCanvas(canvasWidthPx, canvasActualHeightPx);
	let ctx = canvas.getContext('2d');

	ctx.fillStyle = "#fff";
	ctx.textBaseline = 'top';
	ctx.fillRect(0, 0, canvasWidthPx, canvasActualHeightPx);

	return {canvas: canvas, ctx: ctx};
}

const exportComponentsDynamic = (list, boxes, dir, fPrefix) => {
	return new Promise((resolve, reject) => {
		if (typeof fPrefix == "undefined") {
			fPrefix = "dynamic";
		}

		/*
		* Step 1: Get a list of all the components in a more printable format
		*/

		let parsedComponents = []; //value, qty, row, col
		for (let i=0; i<list.length; i++) {
			let component = list[i];
			if (!component.assigned) continue;

			//Get component info into string form
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
				case cDefs.types.LED:
					info = component.additional.color;
					break;
				default:
					info = "Unknown";
					break;
			}

			//Perform box lookup
			let found = false;
			for (let z=0; z<boxes.length; z++) {
				let box = boxes[z];
				for (let i=0; i<box.sections.length; i++) {
					for (let j=0; j<box.sections[i].assignments.length; j++) {
						for (let b=0; b<box.sections[i].assignments[j].length; b++) {
							if (box.sections[i].assignments[j][b] == component.uuid) { //check uuid match
								parsedComponents.push({
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

		if (parsedComponents.length == 0) {
			return reject("Couldn't find any components that are assigned; make sure components have all been assigned before exporting");
		}

		//Now recursively call sheet until we've reached the end of the list
		let sheet = (idx, num) => { //idx of component, sheet number
			let {canvas, ctx} = initBasicCanvas();

			ctx.strokeStyle = "#000";
			ctx.lineWidth = 5;

			ctx.fillStyle = '#000';
			let y = inToPx(0.066);
			let x = inToPx(0.066);

			let hardStopIdx = 2500; //limit to max recursion to program doesn't crash

			while (y < canvasHeightPx && idx < hardStopIdx) { //Row
				let rowComponentMaxHeight = 0;
				while (x < canvasWidthPx && y < canvasHeightPx && idx < hardStopIdx) { //Column
					if (idx > parsedComponents.length) {
						writeCanvas(canvas, fPrefix+"-sheet-"+num, dir); //write the current canvas
						console.log("Successfully exported "+(num)+" sheet(s) of labels");
						return resolve(); //are we done?
					}

					//console.log("CurPos: x="+x+", y="+y+", idx="+idx+", num="+num);

					let component = parsedComponents[idx];
					if (!component) { //if the component isn't found, skip
						idx++;
						console.warn("Invalid component found (parsedComponents object missing), has it not been assigned to a box yet?");
						continue;
					}

					let foundDim = false;
					let dimKeys = Object.keys(componentLabelDims);
					let cDim;
					for (let i=0; i<dimKeys.length; i++) {
						if (dimKeys[i].toLowerCase() == component.sectionType.toLowerCase()) { //dim key matches i.e. "small"
							foundDim = true;
							cDim = componentLabelDims[dimKeys[i]];
						}
					}
					if (!foundDim) { //if it doesn't match an dimension, skip
						idx++;
						console.warn("Component found that does not match any existing dimension");
						continue;
					}
					if (cDim[0] > rowComponentMaxHeight) { //make sure we set the max height
						rowComponentMaxHeight = cDim[0];
					}

					if (cDim[0] > canvasHeightPx || cDim[1] > canvasWidthPx) { //would cause infinite looping
						idx++;
						console.warn("Component found with invalid dimensions (too large)");
						continue;
					}
					
					if ((x + cDim[1]) > canvasWidthPx) { //if this will go further than it should, then end row early
						x+=cDim[1]; //will trigger new row next cycle
						continue;
					}
					if ((y + cDim[0]) > canvasHeightPx) { //if this will go further than it should, then end sheet early
						y += cDim[0]; //will trigger new sheet next cycle
						continue;
					}

					canvasRoundRect(ctx, x, y, cDim[1], cDim[0], 10, false, true);
					
					let value = component.value.substring(0, cDim[2]).trim(); //cut text length down to max allowed by size			

					let maxSize = cDim[3]; //max font size
					let fontSize = 25; //Starting font size
					while (ctx.measureText(value).width < cDim[1]-15 && fontSize <= maxSize) {
						ctx.font = "bold "+fontSize+"px Helvetica";
						fontSize++;
					}
					let valueWidth = ctx.measureText(value).width;
					
					ctx.fillText(value, ((cDim[1]-valueWidth)/2)+x, y+inToPx(0.025)+(maxSize-fontSize)/2);

					let code = ("B"+component.boxNum+"-"+"S"+component.sectionNum+"-"+component.sectionRow+"-"+component.sectionCol).trim();
					ctx.font = "25px Helvetica";
					const codeWidth = ctx.measureText(code).width;
					ctx.fillText(code, ((cDim[1]-codeWidth)/2)+x, y+cDim[0]-inToPx(0.125));

					x+=cDim[1]+inToPx(0.025); //increment x
					idx++;
				}

				//!! we're in a new row now
				x = inToPx(0.066); //reset x

				y+=rowComponentMaxHeight+inToPx(0.025); //increment y by max height in row
				rowComponentMaxHeight = 0;
			}

			if (idx >= hardStopIdx) {
				return reject("Uhh something has likely gone wrong with recursion (looped "+hardStopIdx+" times), remove this check if you want more than this many components");
			} else {
				writeCanvas(canvas, fPrefix+"-sheet-"+num, dir);

				//if y has gone beyond the bounds of the listing, then loop will terminate and go to a new sheet
				num++;
				sheet(idx, num); //recurse into a new sheet
			}


		}
		sheet(0, 1);
	})
}

const exportImages = (store, dir) => { //Will export images from store
	return new Promise((resolve, reject) => {
		/*
		Steps:
		1) export box labels (full sheet sideways)
		2) get array of all things to print in format [info, id]
		3) render all things to print onto images
		*/

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
				if (!boxPrintInfo[boxIdx]) break;
				
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
			writeCanvas(canvas, "label-box-"+(i+1), dir);
		}
		console.log("Successfully exported "+boxSheets+" sheet(s) of box labels");
		console.log("Now generating component labels. This may take a while...");

		exportComponentsDynamic(store.components, store.boxes, dir, "label").then(() => {
			return resolve();
		}).catch(e => {
			return reject(e); //elevate error
		})
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

module.exports = {
	exportImages: exportImages,
	exportComponentList: exportComponentsDynamic
};