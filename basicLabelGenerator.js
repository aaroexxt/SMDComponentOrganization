//labelGeneratorV1.js
//Written by Aaron Becker later then he should be awake lol

/*Todos:
- when adding component, if already assigned tell where
- Lookup function with box visualization, highlight in red where component would go
- change rendering method to dynamically fill page (when get to too large, just create another page) instead of precomputing
- finish component additional asking for other types (diode etc)
- unassign function
- 'auto' unit selection which will convert to best possible unit choice
- check if component is valid before writing
- activate/deactivate boxes
*/


//libs
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { createCanvas, loadImage } = require('canvas');

//constants
const canvasWidth = 4; //in
const canvasHeight = 6; //in

const ppi = 300;
const canvasWidthPx = canvasWidth*ppi;
const canvasHeightPx = canvasHeight*ppi;


const inToPx = uIn => {
	return uIn*ppi;
}

//Label defs
const componentLabelDim = [inToPx(0.4), inToPx(0.85)]; //height, width in px
const text = "Choking hazard\nPeligro de asfixia";
const fontSize = 28;
const subtext = "窒息的危险";
const subtextSize = 38;
const copies = 140;
const exportDir = "basic";

/*
Steps:
1) export box labels (full sheet sideways)
2) get array of all things to print in format [info, id]
3) render all things to print onto images
*/

let writeCanvas = (canvas, imgName) => {
	let buf = canvas.toBuffer('image/png');
	fs.writeFileSync(path.join(exportDir, (imgName.indexOf("png") > -1) ? imgName : imgName+".png"), buf);
}

let initBasicCanvas = () => {
	let canvas = createCanvas(canvasWidthPx, canvasHeightPx);
	let ctx = canvas.getContext('2d');

	ctx.fillStyle = "#fff";
	ctx.textBaseline = 'top';
	ctx.fillRect(0, 0, canvasWidthPx, canvasHeightPx);

	return {canvas: canvas, ctx: ctx};
}

//Small
let labelsPerRow = Math.floor(canvasWidthPx/(componentLabelDim[1]+inToPx(0.025)));
let labelsPerSheet = labelsPerRow*Math.floor(canvasHeightPx/(componentLabelDim[0]+inToPx(0.075)));
let labelSheets = Math.ceil(copies/labelsPerSheet);

let compIdx = 0;
if (copies > 0) {
	for (let i=0; i<labelSheets; i++) {
		let {canvas, ctx} = initBasicCanvas();

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 5;

		
		ctx.fillStyle = '#000';
		let y = inToPx(0.066);
		let x = inToPx(0.066);
		for (let j=0; j<labelsPerSheet; j++) {

			canvasRoundRect(ctx, x, y, componentLabelDim[1], componentLabelDim[0], 10, false, true);
			
			ctx.font = "bold "+fontSize+"px Helvetica";
			const textWidth = ctx.measureText(text).width;
			const textHeight = ctx.measureText(text).emHeightDescent;
			ctx.fillText(text, ((componentLabelDim[1]-textWidth)/2)+x, y+inToPx(0.03));

			ctx.font = subtextSize+"px Tahoma";
			const subtextWidth = ctx.measureText(subtext).width;
			ctx.fillText(subtext, ((componentLabelDim[1]-subtextWidth)/2)+x, y+textHeight+inToPx(0.04));

			x+=componentLabelDim[1]+inToPx(0.025);
			if (x/componentLabelDim[1] > labelsPerRow) {
				x = inToPx(0.066);
				y+=componentLabelDim[0]+inToPx(0.025);
			}
			compIdx++;

			if (compIdx >= copies) { //for last loop
				break;
			}
		}
		writeCanvas(canvas, "label-basic-"+(i+1));
	}
}
console.log("Successfully exported "+labelSheets+" sheet(s) of labels");

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
