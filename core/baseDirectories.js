//dirs
const homedir = require('os').homedir();


const baseDir = ".";
const bomBaseDir = (process.platform == "darwin")? homedir+"/Documents/EAGLE/projects/": "%userprofile%/Documents/EAGLE";

module.exports = {
	baseDir: baseDir,
	bomBaseDir: bomBaseDir
}