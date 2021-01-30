//Component types
const componentTypes = {
	RESISTOR: "Resistor", //done
	CAPACITOR: "Capacitor", //done
	CRYSTAL: "Crystal", //done
	LED: "LED", //done
	IC: "IC/Transistor/Diode/Inductor", //done
	MECHANICAL: "Mechanical",
	OTHER: "Other" //done
};
const groupComponentTypes = {
	RESISTOR: "Resistor",
	CAPACITOR: "Capacitor"
}
const SMDpackageSizes = {
	S0805: "0805",
	S0603: "0603",
	S0402: "0402",
	ICPACKAGES: "SMDPackages",
	DISCRETE: "Discrete",
	S1206: "1206",
	S0201: "0201"
};

const ICPackages = {
	"ThroughHole (DIP, SIP, etc)": [
		"SIP",
		"DIP",
		"QIP",
		"ZIP"
	],
	"Transistor (TO-252 - DPAK, TO-92, SOT-143, etc)": [
		"TO-252 (DPAK)",
		"TO-263 (DDPAK)",
		"LL-34",
		"LL-41",
		"SOT-23",
		"SOT-89",
		"SOD-123",
		"SOD-123FL",
		"SMAF",
		"SMBF",
		"SMA",
		"SMB",
		"SMC",
		"TO-277",
		"DO-214AC/AB/AA",
		"SOD-323",
		"SOD-523",
		"SOD-723",
		"SOT-223",
		"SOT-363",
		"SOT-23-6",
		"SOP4"
	],
	"Diode/Sensor (TO-220, etc)": [
		"R-1",
		"DO-41",
		"DO-15",
		"DO-27",
		"R-6",
		"DO-35",
		"DO-41",
		"TO-220 (AB, AC)",
		"ITO-220 (AB, AC)",
		"TO-247",
		"TO-126",
		"TO-92",
		"TO-251",
		"DIP-4",
		"SEP"
	],
	"ChipCarrier (BCC, CLCC, etc)": [
		"BCC",
		"CLCC",
		"LCC",
		"LCCC",
		"DLCC",
		"PLCC"
	],
	"LandGridArray (LLGA, LGA, etc)": [
		"LGA",
		"LLGA"
	],
	"FlatPack (TQFP, VQFN, etc)": [
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
	"SmallOutline (SOP, SOIC, etc)": [
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
	"ChipScale (CSP, TCSP, etc)": [
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
	"BallGridArray (FBGA, LBGA, etc)": [
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
	"Texas Instruments",
	"ON Semiconductor",
	"ST Microelectronics",
	"Microchip Technology"
]

const resistorUnits = {
	resistance: [
		["ohms (Ω)", "Ω", 1], //full unit, shorthand for printing, normalized value, strict caps comparison
		["kiloOhms (kΩ)", "kΩ", 1000],
		["megaOhms (MΩ)", "MΩ", 1000000, true],
		["milliOhms (mΩ)", "mΩ", 0.001, true],
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

const crystalUnits = {
	frequency: [
		"MHz",
		"KHz"
	]
}

const ledColors = [
	"Other",
	"Red",
	"RedDiffused",
	"Green",
	"GreenDiffused",
	"Blue",
	"BlueDiffused",
	"Yellow",
	"YellowDiffused",
	"Orange",
	"OrangeDiffused"
]

var mExports = {
	types: componentTypes,
	groupTypes: groupComponentTypes,
	smdSizes: SMDpackageSizes,
	ICPackages: ICPackages,
	manufacturers: manufacturers,
	ledColors: ledColors,
	units: {}
}
mExports.units[componentTypes.RESISTOR] = resistorUnits;
mExports.units[componentTypes.CAPACITOR] = capacitorUnits;
mExports.units[componentTypes.CRYSTAL] = crystalUnits;

module.exports = mExports;