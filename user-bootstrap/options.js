// Overrides /options.js
module.exports = {
    specsMaster: {
        customDataUrl: '/data/bootstrap/bootstrap.json'
    },

    cssMod: {
    	files: [
			"http://127.0.0.1:7777/data/bootstrap/css/bootstrap.css"
		],
        rules: {
            blockRule: "^[a-zA-Z0-9]+$",
            modifierRule: "-",
            startModifierRule: "^-"
        }
    }
};