const _ = require("lodash");
const fs = require("fs-extra");
const BbPromise = require("bluebird");
const childProcess = BbPromise.promisifyAll(require("child_process"));
const path = require("path");

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
		this.isNodeTracerInstalled = this.isLumigoNodejsInstalled();

		this.hooks = {
			"after:package:initialize": this.afterPackageInitialize.bind(this),
			"after:package:createDeploymentArtifacts": this.afterCreateDeploymentArtifacts.bind(
				this
			)
		};
	}

	async afterPackageInitialize() {
		// [{"handler":"handler.hello","events":[],"name":"aws-nodejs-dev-hello"}]
		const { runtime, functions } = this.getFunctionsToWrap(this.serverless.service);

		this.log(`there are ${functions.length} function(s) to wrap...`);
		functions.forEach(fn => this.verboseLog(JSON.stringify(fn)));

		if (functions.length === 0) {
			return;
		}

		const token = _.get(this.serverless.service, "custom.lumigo.token");

		if (runtime === "nodejs") {
			await this.installLumigoNodejs();

			for (const func of functions) {
				const handler = await this.createWrappedNodejsFunction(func, token);
				// replace the function handler to the wrapped function
				func.handler = handler;
			}
		} else if (runtime === "python") {
			await this.ensureLumigoPythonIsInstalled();

			for (const func of functions) {
				const handler = await this.createWrappedPythonFunction(func, token);
				// replace the function handler to the wrapped function
				func.handler = handler;
			}
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

	getFunctionsToWrap(service) {
		const functions = service.getAllFunctions().map(localName => {
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

	isLumigoNodejsInstalled() {
		const packageJsonPath = path.join(
			this.serverless.config.servicePath,
			"package.json"
		);

		try {
			const packageJson = require(packageJsonPath);
			const dependencies = _.get(packageJson, "dependencies", {});
			return _.has(dependencies, "@lumigo/tracer");
		} catch (err) {
			this.verboseLog(
				"error when trying to check if @lumigo/tracer is already installed..."
			);
			this.verboseLog(err.message);
			this.verboseLog("assume @lumigo/tracer has not been installed...");
			return false;
		}
	}

	async installLumigoNodejs() {
		if (this.isNodeTracerInstalled) {
			this.verboseLog("@lumigo/tracer is already installed, skipped...");
			return;
		}

		this.log("installing @lumigo/tracer...");
		await childProcess.execAsync("npm install @lumigo/tracer");
	}

	async uninstallLumigoNodejs() {
		if (this.isNodeTracerInstalled) {
			return;
		}

		this.log("uninstalling @lumigo/tracer...");
		await childProcess.execAsync("npm uninstall @lumigo/tracer");
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

	async createWrappedNodejsFunction(func, token) {
		this.verboseLog(`wrapping [${func.handler}]...`);

		const localName = func.localName;

		// e.g. functions/hello.world.handler -> hello.world.handler
		const handler = path.basename(func.handler);

		// e.g. functions/hello.world.handler -> functions/hello.world
		const handlerModulePath = func.handler.substr(0, func.handler.lastIndexOf("."));
		// e.g. functions/hello.world.handler -> handler
		const handlerFuncName = handler.substr(handler.lastIndexOf(".") + 1);

		const wrappedFunction = `
const LumigoTracer = require("@lumigo/tracer");
const tracer = new LumigoTracer({
  token: '${token}'
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

	async createWrappedPythonFunction(func, token) {
		this.verboseLog(`wrapping [${func.handler}]...`);

		// e.g. functions/hello.world.handler -> hello.world.handler
		const handler = path.basename(func.handler);

		// e.g. functions/hello.world.handler -> functions.hello.world
		const handlerModulePath = func.handler
			.substr(0, func.handler.lastIndexOf("."))
			.split("/") // replace all occurances of "/""
			.join(".");
		// e.g. functions/hello.world.handler -> handler
		const handlerFuncName = handler.substr(handler.lastIndexOf(".") + 1);

		const wrappedFunction = `
from lumigo_tracer import lumigo_tracer
from ${handlerModulePath} import ${handlerFuncName} as userHandler

@lumigo_tracer(token='${token}')
def ${handlerFuncName}(event, context):
  userHandler(event, context)
    `;

		// e.g. functions/hello.world.handler -> hello.world.py
		const fileName = handler.substr(0, handler.lastIndexOf(".")) + ".py";
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
