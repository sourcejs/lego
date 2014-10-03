module.exports = {
    common: {
        port: 7777,
        pathToUser: "user"
    },

    specsMaster: {
        dev: "http://127.0.0.1:8080",
        prod: "http://okp.me:8080"
    },

    cssMod: {
    	files: [
			"http://127.0.0.1:8080/res/css/prod/core/ncore.css",
			"http://127.0.0.1:8080/res/css/prod/core/ncore_postponed.css",
			"http://127.0.0.1:8080/res/css/prod/main/nmain_postponed.css",
			"http://127.0.0.1:8080/res/css/prod/main/nmain.css"
		],
		rules: {
			blockRule: "^[a-zA-Z0-9]+$",
			modifierRule: "__",
			startModifierRule: "^__"
		},
		debug: false
    },

    modifyInnerBlocks: true
};