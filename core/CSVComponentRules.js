const cDefs = require("./componentDefinitions.js")


const packageReplaceRules = [
	["C0805","0805"],
	["R0805","0805"],
	["C0603","0603"],
	["R0603","0603"],
	["SMD",""],
	["SML",""],
	["CLOSEDWIRE_",""]
];

const nameReplaceRules = [
	["R-US_",cDefs.types.RESISTOR],
	["C-US",cDefs.types.CAPACITOR],
	["CPOL-US",cDefs.types.CAPACITOR],
	["INDUCTOR",cDefs.types.IC],
	["CONN_",""],
	["CON_",""],
	["SMD",""]
]

const ignoredComponents = [ //format: component needs to have the data in both [NAME, PACKAGE, strictCheckName]
	["PINHD", "X"],
	["SOLDERJUMPER", "SOLDERJUMPER"],
	["SJ", "unknown", true],
	["TP", "B", true],
	["HEADER_", "X"],
	["HEADER-", "1X"]
]

const ignoreKeys = [
	"qty"
]

module.exports = {
	packageReplaceRules: packageReplaceRules,
	nameReplaceRules: nameReplaceRules,
	ignoreKeys: ignoreKeys,
	ignoredComponents: ignoredComponents
}