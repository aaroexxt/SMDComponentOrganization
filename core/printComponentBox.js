const {componentLookup} = require("./lookup.js");
const cDefs = require("./componentDefinitions.js");

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
		case cDefs.types.LED:
			info = "color "+component.additional.color;
			break;
		default:
			info = "unknown info";
			break;
	}
	info+= " of size '"+component.size+"'";
	console.log("Component: "+component.type+" with "+info);
	return;
}

const returnComponentWithQuantity = (component, quantity) => {
	if (typeof quantity == "undefined") quantity = component.quantity; //allow overrides

	let info = "";
	try {
		switch(component.type) {
			case cDefs.types.RESISTOR:
			case cDefs.types.CAPACITOR:
				info = component.additional.value+component.additional.valueUnit+" size "+component.size;
				break;
			case cDefs.types.IC:
			case cDefs.types.OTHER:
				info = component.additional.identifier+" in "+component.size+" package";
				break;
			case cDefs.types.CRYSTAL:
				info = component.additional.frequency+component.additional.frequencyUnit+" in "+component.size+" package";
				break;
			case cDefs.types.LED:
				info = "color "+component.additional.color+" in "+component.size+" package";;
				break;
			default:
				bonk; //go to catch block (yes this is a meme)
				break;
		}
	} catch(e) {
		info = component.type;
		return (quantity+"x "+info+" of size " + component.size);
	}
	if (component.type != cDefs.types.IC && component.type != cDefs.types.OTHER) {
		return (quantity+"x "+info+" "+component.type);
	} else {
		return (quantity+"x "+info);
	}
}


const printBox = (store, box) => {
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
					printStr += "   *\t|";
				} else {
					let component = componentLookup(store, am[j][b]); //get component info

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
							info = "*";
							break;
					}
					info = info.substring(0,7);
					let iLen = info.length;
					let padLength = Math.floor((7-info.length)/2); //do we need to pad it out
					if (padLength >= 1) {
						for (let i=0; i<padLength; i++) {
							info = " "+info; //preappend space
						}
					}

					printStr += info+((iLen == 7)?"|":"\t|"); //only if windows
				}
			}
			console.log(printStr);
		}
		console.log(divider);
	}
}

module.exports = {
	printComponent: printComponent,
	printBox: printBox,
	returnComponentWithQuantity: returnComponentWithQuantity
}