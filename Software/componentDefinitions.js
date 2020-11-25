//Component types
const componentTypes = {
	RESISTOR: "Resistor",
	CAPACITOR: "Capacitor",
	TRANSISTOR: "Transistor",
	LED: "LED",
	IC: "IC",
	OTHER: "Other"
};
const SMDpackageSizes = {
	S0805: "0805",
	S0603: "0603",
	S0402: "0402",
	DISCRETE: "Discrete",
	S1206: "1206",
	S0201: "0201"
};
const discreteICPackages = {
	"ThroughHole": [
		"SIP",
		"DIP",
		"QIP",
		"ZIP"
	],
	"ChipCarrier": [
		"BCC",
		"CLCC",
		"LCC",
		"LCCC",
		"DLCC",
		"PLCC"
	],
	"FlatPack": [
		"CFP",
		"CQFP",
		"BQFP",
		"DFN",
		"ETQFP",
		"PQFN",
		"PQFP",
		"LQFP",
		"QFN",
		"QFP",
		"MQFP",
		"HVQFN",
		"TQFP",
		"VQFP",
		"TQFN",
		"VQFN",
		"WQFN",
		"UQFN",
		"OFDN"
	],
	"SmallOutline": [
		"SOP",
		"CSOP",
		"DSOP",
		"HSOP",
		"HSSOP",
		"HTSSOP",
		"SOIC",
		"MSOP",
		"PSOP",
		"PSON",
		"QSOP",
		"SOJ",
		"SON",
		"SSOP",
		"TSOP",
		"TSSOP",
		"TVSOP",
		"VSOP",
		"VSSOP",
		"WSON",
		"USON"
	],
	"ChipScale": [
		"CSP",
		"TCSP",
		"TDSP",
		"WCSP, WLCSP",
		"PMCP",
		"COB",
		"COF",
		"TAB",
		"COG"
	],
	"BallGridArray": [
		"FBGA",
		"LBGA",
		"TEPBGA",
		"CBGA",
		"OBGA",
		"TFBGA",
		"PBGA",
		"UCSP",
		"uBGA",
		"LFBGA",
		"TBGA",
		"SBGA",
		"UFBGA"
	]
}

const manufacturers = [
	"Murata",
	"Yageo",
	"TI"
]

const resistorUnits = {
	resistance: [
		["ohms (Ω)", "Ω", 1], //full unit, shorthand for printing, normalized value
		["kiloOhms (kΩ)", "kΩ", 1000],
		["megaOhms (MΩ)", "MΩ", 1000000],
		["milliOhms (mΩ)", "mΩ", 0.001],
	],
	normUnit: "Ω"
}

const capacitorUnits = {
	capacitance: [
		["microFarad (μF)", "μF", 1000],
		["nanoFarad (nF)", "nF", 1],
		["picoFarad (pF)]", "pF", 0.001],
	],
	normUnit: "nF",
	tolerance: [
		["percent (%)", "%"],
		["picoFarad (pF)]", "pF", 0.001],
		["microFarad (μF)", "μF", 1000],
		["nanoFarad (nF)", "nF", 1],
	]
}

var mExports = {
	types: componentTypes,
	smdSizes: SMDpackageSizes,
	ICPackages: discreteICPackages,
	manufacturers: manufacturers,
	units: {}
}
mExports.units[componentTypes.RESISTOR] = resistorUnits;
mExports.units[componentTypes.CAPACITOR] = capacitorUnits;

module.exports = mExports;