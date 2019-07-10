const _ = require("lodash");
const fs = require("fs-extra");
const BbPromise = require("bluebird");
const childProcess = BbPromise.promisifyAll(require("child_process"));
const path = require("path");

class LumigoPlugin {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;
		this.log = (msg) => this.serverless.cli.log(`serverless-lumigo: ${msg}`);
		this.folderPath = path.join(this.serverless.config.servicePath, "_lumigo");

		this.hooks = {
			"after:package:initialize": this.afterPackageInitialize.bind(this),
			"after:package:createDeploymentArtifacts": this.afterCreateDeploymentArtifacts.bind(this),
		};
	}

	async afterPackageInitialize() {    
		this.functionsToWrap = this.getFunctionsToWrap(      
			this.serverless.service
		);
		// [{"handler":"handler.hello","events":[],"name":"aws-nodejs-dev-hello"}]
		this.log(`there are ${this.functionsToWrap.length} function(s) to wrap...`);

		if (this.functionsToWrap.length > 0) {
			await this.installLumigo();

			const token = _.get(this.serverless.service, "custom.lumigo.token");

			for (const func of this.functionsToWrap)
			{
				const handler = await this.createWrappedFunction(func, token);
				// replace the function handler to the wrapped function
				func.handler = handler;
			}
		}
	}

	async afterCreateDeploymentArtifacts() {
		await this.cleanFolder();
		await this.uninstallLumigo();
	}

	getFunctionsToWrap(service) {
		if(!service.provider.runtime.startsWith("nodejs")) {
			this.log(`unsupported runtime: [${service.provider.runtime}], skipped...`);
			return [];
		}

		return service.getAllFunctions()
			.map(name => service.getFunction(name));
	}

	async installLumigo() {
		this.log("installing @lumigo/tracer...");
		await childProcess.execAsync("npm install @lumigo/tracer");
	}

	async uninstallLumigo() {
		this.log("uninstalling @lumigo/tracer...");
		await childProcess.execAsync("npm uninstall @lumigo/tracer");
	}

	async createWrappedFunction(func, token) {
		// e.g. functions/hello.world.handler -> hello.world.handler
		const handler = path.basename(func.handler);

		// e.g. functions/hello.world.handler -> functions/hello.world
		const handlerModulePath = func.handler.substr(0, func.handler.lastIndexOf("."));
		// e.g. functions/hello.world.handler -> .handler
		const handlerFuncName = handler.substr(handler.lastIndexOf("."));

		const wrappedFunction = `
const LumigoTracer = require("@lumigo/tracer");
const tracer = new LumigoTracer({
  token: '${token}'
});
const handler = require('../${handlerModulePath}')${handlerFuncName};

module.exports.handler = tracer.trace(handler);
    `;
    
		// e.g. functions/hello.world -> hello.world.js
		const fileName = handler.substr(0, handler.lastIndexOf(".")) + ".js";
		// e.g. hello.world.js -> /Users/username/source/project/_lumigo/hello.world.js
		const filePath = path.join(this.folderPath, fileName);
		await fs.outputFile(filePath, wrappedFunction);

		// convert from abs path to relative path, e.g. 
		// /Users/username/source/project/_lumigo/hello.world.js -> _lumigo/hello.world.js
		const newFilePath = path.relative(this.serverless.config.servicePath, filePath);
		// e.g. _lumigo/hello.world.js -> _lumigo/hello.world.handler
		return newFilePath.substr(0, newFilePath.lastIndexOf(".")) + handlerFuncName;
	}

	async cleanFolder() {
		return fs.remove(this.folderPath);
	}
}

module.exports = LumigoPlugin;
