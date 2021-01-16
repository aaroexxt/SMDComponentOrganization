//required modules
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
//additional component settings
const cDefs = require("./componentDefinitions.js");

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
const componentLabelMediumDim = [inToPx(0.4), inToPx(1.32)]; //NOT TESTED YET
const componentLabelLargeDim = [inToPx(1.4), inToPx(1.32)]; //NOT TESTED YET



const exportImages = (store, dir) => { //Will export images from store
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
				case cDefs.types.LED:
					info = component.additional.color;
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
					
					let value = component.value.substring(0, 10).trim();				

					let maxSize = 50;
					let fontSize = 25;
					while (ctx.measureText(value).width < componentLabelSmallDim[1]-15 && fontSize <= maxSize) {
						ctx.font = "bold "+fontSize+"px Helvetica";
						fontSize++;
					}
					let valueWidth = ctx.measureText(value).width;
					
					ctx.fillText(value, ((componentLabelSmallDim[1]-valueWidth)/2)+x, y+inToPx(0.025)+(50-fontSize)/2);

					let code = ("B"+component.boxNum+"-"+"S"+component.sectionNum+"-"+component.sectionRow+"-"+component.sectionCol).trim();
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

module.exports = exportImages;