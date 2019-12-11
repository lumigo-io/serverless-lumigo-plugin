const _ = require("lodash");
const fs = require("fs-extra");
const BbPromise = require("bluebird");
const childProcess = BbPromise.promisifyAll(require("child_process"));
const path = require("path");

const NodePackageManagers = {
	NPM: "npm",
	Yarn: "yarn"
};

class LumigoPlugin {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;
		this.log = msg => this.serverless.cli.log(`serverless-lumigo: ${msg}`);
		this.verboseLog = msg => {
			if (process.env.SLS_DEBUG) {
				this.log(msg);
			}
		};
		this.folderPath = path.join(this.serverless.config.servicePath, "_lumigo");

		this.hooks = {
			"after:package:initialize": this.afterPackageInitialize.bind(this),
			"after:deploy:function:initialize": this.afterDeployFunctionInitialize.bind(
				this
			),
			"after:package:createDeploymentArtifacts": this.afterCreateDeploymentArtifacts.bind(
				this
			)
		};
	}

	get nodePackageManager() {
		return _.get(
			this.serverless.service,
			"custom.lumigo.nodePackageManager",
			NodePackageManagers.NPM
		).toLowerCase();
	}

	async afterDeployFunctionInitialize() {
		await this.wrapFunctions([this.options.function]);
	}

	async afterPackageInitialize() {
		await this.wrapFunctions();
	}

	async wrapFunctions(functionNames) {
		const { runtime, functions } = this.getFunctionsToWrap(
			this.serverless.service,
			functionNames
		);

		this.log(`there are ${functions.length} function(s) to wrap...`);
		functions.forEach(fn => this.verboseLog(JSON.stringify(fn)));

		if (functions.length === 0) {
			return;
		}

		const token = _.get(this.serverless.service, "custom.lumigo.token");
		const parameters = _.get(this.serverless.service, "custom.lumigo", {});
		if (token === undefined) {
			throw new this.serverless.classes.Error(
				"serverless-lumigo: Unable to find token. Please follow https://github.com/lumigo-io/serverless-lumigo"
			);
		}

		if (runtime === "nodejs") {
			await this.installLumigoNodejs();

			for (const func of functions) {
				const handler = await this.createWrappedNodejsFunction(
					func,
					token,
					parameters
				);
				// replace the function handler to the wrapped function
				this.verboseLog(
					`setting [${func.localName}]'s handler to [${handler}]...`
				);
				this.serverless.service.functions[func.localName].handler = handler;
			}
		} else if (runtime === "python") {
			await this.ensureLumigoPythonIsInstalled();
			const { isZip } = await this.getPythonPluginConfiguration();
			this.verboseLog(`Python plugin zip status ${isZip}`);
			for (const func of functions) {
				const handler = await this.createWrappedPythonFunction(
					func,
					token,
					parameters,
					isZip
				);
				// replace the function handler to the wrapped function
				this.verboseLog(
					`setting [${func.localName}]'s handler to [${handler}]...`
				);
				this.serverless.service.functions[func.localName].handler = handler;
			}
		}

		if (this.serverless.service.package) {
			const include = this.serverless.service.package.include || [];
			include.push("_lumigo/*");
			this.serverless.service.package.include = include;
		}
	}

	async afterCreateDeploymentArtifacts() {
		const { runtime, functions } = this.getFunctionsToWrap(this.serverless.service);

		if (functions.length === 0) {
			return;
		}

		await this.cleanFolder();

		if (runtime === "nodejs") {
			await this.uninstallLumigoNodejs();
		}
	}

	getFunctionsToWrap(service, functionNames) {
		functionNames = functionNames || this.serverless.service.getAllFunctions();

		const functions = service
			.getAllFunctions()
			.filter(localName => functionNames.includes(localName))
			.map(localName => {
				const x = _.cloneDeep(service.getFunction(localName));
				x.localName = localName;
				return x;
			});

		if (service.provider.runtime.startsWith("nodejs")) {
			return { runtime: "nodejs", functions };
		} else if (service.provider.runtime.startsWith("python3")) {
			return { runtime: "python", functions };
		} else {
			this.log(`unsupported runtime: [${service.provider.runtime}], skipped...`);
			return { runtime: "unsupported", functions: [] };
		}
	}

	async installLumigoNodejs() {
		this.log("installing @lumigo/tracer...");
		let installCommand;
		if (this.nodePackageManager === NodePackageManagers.NPM) {
			installCommand = "npm install --no-save @lumigo/tracer@latest";
		} else if (this.nodePackageManager === NodePackageManagers.Yarn) {
			installCommand = "yarn add @lumigo/tracer@latest";
		} else {
			throw new this.serverless.classes.Error(
				"No Node.js package manager found. Please install either NPM or Yarn."
			);
		}

		const installDetails = childProcess.execSync(installCommand, "utf8");
		this.verboseLog(installDetails);
	}

	async uninstallLumigoNodejs() {
		if (this.isNodeTracerInstalled) {
			return;
		}

		this.log("uninstalling @lumigo/tracer...");
		let uninstallCommand;
		if (this.nodePackageManager === NodePackageManagers.NPM) {
			uninstallCommand = "npm uninstall @lumigo/tracer";
		} else if (this.nodePackageManager === NodePackageManagers.Yarn) {
			uninstallCommand = "yarn remove @lumigo/tracer";
		} else {
			throw new this.serverless.classes.Error(
				"No Node.js package manager found. Please install either NPM or Yarn."
			);
		}

		const uninstallDetails = childProcess.execSync(uninstallCommand, "utf8");
		this.verboseLog(uninstallDetails);
	}

	async getPythonPluginConfiguration() {
		const isZip = _.get(
			this.serverless.service,
			"custom.pythonRequirements.zip",
			false
		);

		return { isZip };
	}
	async ensureLumigoPythonIsInstalled() {
		this.log("checking if lumigo_tracer is installed...");

		const plugins = _.get(this.serverless.service, "plugins", []);
		const slsPythonInstalled = plugins.includes("serverless-python-requirements");

		const ensureTracerInstalled = async fileName => {
			const requirementsExists = fs.pathExistsSync(fileName);

			if (!requirementsExists) {
				let errorMessage = `${fileName} is not found.`;
				if (!slsPythonInstalled) {
					errorMessage += `
Consider using the serverless-python-requirements plugin to help you package Python dependencies.`;
				}
				throw new this.serverless.classes.Error(errorMessage);
			}

			const requirements = await fs.readFile(fileName, "utf8");
			if (!requirements.includes("lumigo_tracer")) {
				const errorMessage = `lumigo_tracer is not installed. Please check ${fileName}.`;
				throw new this.serverless.classes.Error(errorMessage);
			}
		};

		const packageIndividually = _.get(
			this.serverless.service,
			"package.individually",
			false
		);

		if (packageIndividually) {
			this.log(
				"functions are packed individually, ensuring each function has a requirement.txt..."
			);
			const { functions } = this.getFunctionsToWrap(this.serverless.service);

			for (const fn of functions) {
				// functions/hello.world.handler -> functions
				const dir = path.dirname(fn.handler);

				// there should be a requirements.txt in each function's folder
				// unless there's an override
				const defaultRequirementsFilename = path.join(dir, "requirements.txt");
				const requirementsFilename = _.get(
					this.serverless.service,
					"custom.pythonRequirements.fileName",
					defaultRequirementsFilename
				);
				await ensureTracerInstalled(requirementsFilename);
			}
		} else {
			this.log("ensuring there is a requirement.txt or equivalent...");
			const requirementsFilename = _.get(
				this.serverless.service,
				"custom.pythonRequirements.fileName",
				"requirements.txt"
			);
			await ensureTracerInstalled(requirementsFilename);
		}
	}

	getTracerParameters(
		token,
		options,
		equalityToken = ":",
		trueValue = "true",
		falseValue = "false"
	) {
		if (token === undefined) {
			throw new this.serverless.classes.Error("Lumigo's tracer token is undefined");
		}
		let configuration = [];
		options = _.omit(options, ["nodePackageManager"]);
		for (const [key, value] of Object.entries(options)) {
			if (String(value).toLowerCase() === "true") {
				configuration.push(`${key}${equalityToken}${trueValue}`);
			} else if (String(value).toLowerCase() === "false") {
				configuration.push(`${key}${equalityToken}${falseValue}`);
			} else {
				configuration.push(`${key}${equalityToken}'${value}'`);
			}
		}
		return configuration.join(",");
	}

	getNodeTracerParameters(token, options) {
		return this.getTracerParameters(token, options, ":", "true", "false");
	}

	getPythonTracerParameters(token, options) {
		return this.getTracerParameters(token, options, "=", "True", "False");
	}

	async createWrappedNodejsFunction(func, token, options) {
		this.verboseLog(`wrapping [${func.handler}]...`);

		const localName = func.localName;

		// e.g. functions/hello.world.handler -> hello.world.handler
		const handler = path.basename(func.handler);

		// e.g. functions/hello.world.handler -> functions/hello.world
		const handlerModulePath = func.handler.substr(0, func.handler.lastIndexOf("."));
		// e.g. functions/hello.world.handler -> handler
		const handlerFuncName = handler.substr(handler.lastIndexOf(".") + 1);
		const wrappedFunction = `
const tracer = require("@lumigo/tracer")({
	${this.getNodeTracerParameters(token, options)}
});
const handler = require('../${handlerModulePath}').${handlerFuncName};

module.exports.${handlerFuncName} = tracer.trace(handler);
    `;

		const fileName = localName + ".js";
		// e.g. hello.world.js -> /Users/username/source/project/_lumigo/hello.world.js
		const filePath = path.join(this.folderPath, fileName);
		this.verboseLog(`writing wrapper function to [${filePath}]...`);
		await fs.outputFile(filePath, wrappedFunction);

		// convert from abs path to relative path, e.g.
		// /Users/username/source/project/_lumigo/hello.world.js -> _lumigo/hello.world.js
		const newFilePath = path.relative(this.serverless.config.servicePath, filePath);
		// e.g. _lumigo/hello.world.js -> _lumigo/hello.world.handler
		return newFilePath.substr(0, newFilePath.lastIndexOf(".") + 1) + handlerFuncName;
	}

	async createWrappedPythonFunction(func, token, options, isZip) {
		this.verboseLog(`wrapping [${func.handler}]...`);

		const localName = func.localName;

		// e.g. functions/hello.world.handler -> hello.world.handler
		const handler = path.basename(func.handler);

		// e.g. functions/hello.world.handler -> functions.hello.world
		const handlerModulePath = func.handler
			.substr(0, func.handler.lastIndexOf("."))
			.split("/") // replace all occurances of "/""
			.join(".");
		// e.g. functions/hello.world.handler -> handler
		const handlerFuncName = handler.substr(handler.lastIndexOf(".") + 1);
		let addZipConstruct = "";
		if (isZip) {
			addZipConstruct = `
try:
  import unzip_requirements
except ImportError:
  pass
		`;
		}
		const wrappedFunction = `
${addZipConstruct}
from lumigo_tracer import lumigo_tracer
from ${handlerModulePath} import ${handlerFuncName} as userHandler

@lumigo_tracer(${this.getPythonTracerParameters(token, options)})
def ${handlerFuncName}(event, context):
  return userHandler(event, context)
    `;

		const fileName = localName + ".py";
		// e.g. hello.world.py -> /Users/username/source/project/_lumigo/hello.world.py
		const filePath = path.join(this.folderPath, fileName);
		this.verboseLog(`writing wrapper function to [${filePath}]...`);
		await fs.outputFile(filePath, wrappedFunction);

		// convert from abs path to relative path, e.g.
		// /Users/username/source/project/_lumigo/hello.world.py -> _lumigo/hello.world.py
		const newFilePath = path.relative(this.serverless.config.servicePath, filePath);
		// e.g. _lumigo/hello.world.py -> _lumigo/hello.world.handler
		return newFilePath.substr(0, newFilePath.lastIndexOf(".") + 1) + handlerFuncName;
	}

	async cleanFolder() {
		this.verboseLog(`removing the temporary folder [${this.folderPath}]...`);
		return fs.remove(this.folderPath);
	}
}

module.exports = LumigoPlugin;
