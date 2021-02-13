const componentLookup = (store, uuid) => {
	for (let i=0; i<store.components.length; i++) {
		if (store.components[i].uuid == uuid) {
			return store.components[i];
		}
	}
	return false;
}

const getSpaceInBox = box => {
	let s = 0;
	for (let i=0; i<box.sections.length; i++) {
		for (let j=0; j<box.sections[i].assignments.length; j++) {
			for (let b=0; b<box.sections[i].assignments[j].length; b++) {
				if (box.sections[i].assignments[j][b] == "") {
					s++;
				}
			}
		}
	}

	return s;
}

module.exports = {
	componentLookup: componentLookup,
	getSpaceInBox: getSpaceInBox
};