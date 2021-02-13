//required modules
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
//basedir settings
const {baseDir, bomBaseDir} = require("./baseDirectories.js");

async function getFilesInDir(dir) {
	const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
	const files = await Promise.all(dirents.map((dirent) => {
	const res = path.resolve(dir, dirent.name);
	return (dirent.isDirectory() && res.indexOf("node_modules") == -1) ? getFilesInDir(res) : res;
	}));
	return Array.prototype.concat(...files);
}

const dirPicker = startDir => {
	return new Promise((resolve, reject) => {
		let base = startDir || baseDir;
		let potentialDirs = fs.readdirSync(base);
		let dirs = [];
		if (base == baseDir) dirs.push(baseDir); //Make sure . dir is present in base
		for (let i=0; i<potentialDirs.length; i++) {
			let fullPath = path.join(base,potentialDirs[i]);
			if (fs.lstatSync(fullPath).isDirectory() && fullPath.indexOf("node_modules") == -1) {
				dirs.push(fullPath)
			}
		}

		if (dirs.length == 0) {
			return reject();
		} else if (dirs.length == 1) {
			return resolve(dirs[0]);
		} else {
			inquirer.prompt({
				name: "Choose a directory",
				type: "list",
				choices: dirs
			}).then(choice => {
				let keys = Object.keys(choice);
				choice = choice[keys[0]];
				return resolve(choice);
			})
		}
	})
}

module.exports = {
	getFilesInDir: getFilesInDir,
	dirPicker: dirPicker
}