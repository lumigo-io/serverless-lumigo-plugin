const fs = require("fs-extra");
const childProcess = require("child_process");
const Serverless = require("serverless/lib/Serverless");
const AwsProvider = require("serverless/lib/plugins/aws/provider/awsProvider");

jest.mock("fs-extra");
jest.mock("child_process");

afterEach(() => jest.clearAllMocks());
	
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
		expect.stringContaining("const handler = require('../hello').world"));
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/hello.world.js",
		expect.stringContaining("const handler = require('../hello.world').handler"));
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/foo_bar.js", 
		expect.stringContaining("const handler = require('../foo_bar').handler"));
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/foo-bar.js", 
		expect.stringContaining("const handler = require('../foo-bar').handler"));
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
