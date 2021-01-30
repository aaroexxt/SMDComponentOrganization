const componentLookup = (store, uuid) => {
	for (let i=0; i<store.components.length; i++) {
		if (store.components[i].uuid == uuid) {
			return store.components[i];
		}
	}
	return false;
}

module.exports = componentLookup;