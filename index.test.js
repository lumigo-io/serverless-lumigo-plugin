const fs = require("fs-extra");
const childProcess = require("child_process");
const Serverless = require("serverless/lib/Serverless");
const AwsProvider = require("serverless/lib/plugins/aws/provider/awsProvider");

jest.mock("fs-extra");
jest.mock("child_process");

const token = "test-token";

afterEach(() => jest.clearAllMocks());

expect.extend({
	toContainAllStrings(received, ...strings) {
		const pass = strings.every(s => received.includes(s));
		return {
			message: () => `expected ${received} contain the strings [${strings.join(",")}]`,
			pass,
		};
	}
});
	
describe("Lumigo plugin (node.js)", () => {
	let serverless;
	let lumigo;	
  
	beforeEach(() => {
		serverless = new Serverless();
		serverless.servicePath = true;
		serverless.service.service = "lumigo-test";
		serverless.service.provider.compiledCloudFormationTemplate = { Resources: {} };
		serverless.setProvider("aws", new AwsProvider(serverless));
		serverless.cli = { log: jest.fn() };
		serverless.service.functions = {
			"hello": {
				handler: "hello.world",
				events: []
			},
			"world": {
				handler: "hello.world.handler",
				events: []
			},
			"foo": {
				handler: "foo_bar.handler",
				events: []
			},
			"bar": {
				handler: "foo-bar.handler",
				events: []
			}
		};
		serverless.service.custom = {
			lumigo: {
				token: token
			}
		};
		childProcess.exec.mockImplementation((cmd, cb) => cb());
		const LumigoPlugin = require("./index");
		lumigo = new LumigoPlugin(serverless, {});
	});

	describe("nodejs8.10", () => {
		beforeEach(() => {
			serverless.service.provider.runtime = "nodejs8.10";
		});
    
		test("it should wrap all functions after package initialize", async () => {			
			await lumigo.afterPackageInitialize();
			assertFunctionsAreWrapped();
		});
    
		test("it should clean up after deployment artefact is created", async () => {
			await lumigo.afterCreateDeploymentArtifacts();
			assertWrappedFunctionsAreCleanedUp();
		});
	});

	describe("nodejs10.x", () => {
		beforeEach(() => {
			serverless.service.provider.runtime = "nodejs10.x";
		});
    
		test("it should wrap all functions after package initialize", async () => {			
			await lumigo.afterPackageInitialize();
			assertFunctionsAreWrapped();
		});
    
		test("it should clean up after deployment artefact is created", async () => {
			await lumigo.afterCreateDeploymentArtifacts();
			assertWrappedFunctionsAreCleanedUp();
		});
	});

	describe("is not nodejs", () => {
		beforeEach(() => {
			serverless.service.provider.runtime = "java";
		});
    
		test("it shouldn't wrap any function after package initialize", async () => {			
			await lumigo.afterPackageInitialize();
			assertFunctionsAreNotWrapped();
		});
	});
});

function assertFunctionsAreWrapped() {
	expect(childProcess.exec).toBeCalledWith(
		"npm install @lumigo/tracer", expect.anything());
        
	expect(fs.outputFile).toBeCalledTimes(4);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/hello.js", 
		expect.toContainAllStrings(
			'const LumigoTracer = require("@lumigo/tracer");',
			"const handler = require('../hello').world",
			`token: '${token}'`
		));
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/hello.world.js",
		expect.toContainAllStrings(
			'const LumigoTracer = require("@lumigo/tracer");',
			"const handler = require('../hello.world').handler",
			`token: '${token}'`
		));
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/foo_bar.js", 
		expect.toContainAllStrings(
			'const LumigoTracer = require("@lumigo/tracer");',
			"const handler = require('../foo_bar').handler",
			`token: '${token}'`
		));
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/foo-bar.js", 
		expect.toContainAllStrings(
			'const LumigoTracer = require("@lumigo/tracer");',
			"const handler = require('../foo-bar').handler",
			`token: '${token}'`
		));
}

function assertFunctionsAreNotWrapped() {
	expect(childProcess.exec).not.toBeCalled();
	expect(fs.outputFile).not.toBeCalled();
}

function assertWrappedFunctionsAreCleanedUp() {
	expect(fs.remove).toBeCalledWith(__dirname + "/_lumigo");
	expect(childProcess.exec).toBeCalledWith(
		"npm uninstall @lumigo/tracer", expect.anything());
}
