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
			message: () =>
				`expected ${received} contain the strings [${strings.join(",")}]`,
			pass
		};
	}
});

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
		hello: {
			handler: "hello.world",
			events: []
		},
		"hello.world": {
			handler: "hello.world.handler", // . in the filename
			events: []
		},
		foo: {
			handler: "foo_bar.handler", // both pointing to same handler
			events: []
		},
		bar: {
			handler: "foo_bar.handler", // both pointing to same handler
			events: []
		},
		jet: {
			handler: "foo/foo/bar.handler", // / in the path
			events: []
		},
		pack: {
			handler: "foo.bar/zoo.handler", // . in file name and / in the path
			events: []
		}
	};
	serverless.service.custom = {
		lumigo: {
			token: token
		}
	};
	serverless.config.servicePath = __dirname;
	childProcess.exec.mockImplementation((cmd, cb) => cb());
	const LumigoPlugin = require("./index");
	lumigo = new LumigoPlugin(serverless, {});
});

describe("Lumigo plugin (node.js)", () => {
	describe("nodejs8.10", () => {
		beforeEach(() => {
			serverless.service.provider.runtime = "nodejs8.10";
		});

		test("it should wrap all functions after package initialize", async () => {
			await lumigo.afterPackageInitialize();
			assertNodejsFunctionsAreWrapped();
		});

		test("it should clean up after deployment artefact is created", async () => {
			await lumigo.afterCreateDeploymentArtifacts();
			assertNodejsFunctionsAreCleanedUp();
		});

		describe("there are no functions", () => {
			beforeEach(() => {
				serverless.service.functions = {};
			});

			test("it shouldn't wrap any function after package initialize", async () => {
				await lumigo.afterPackageInitialize();
				assertFunctionsAreNotWrapped();
			});

			test("it does nothing after deployment artefact is created", async () => {
				await lumigo.afterCreateDeploymentArtifacts();
				assertNothingHappens();
			});
		});
    
		describe("when functions are packaged individually", () => {
			beforeEach(() => {
				serverless.service.package = {
					individually: true
				};
			});
      
			test("if package.include is not set, it's initialized with _lumigo/*", async () => {    
				await lumigo.afterPackageInitialize();
				assertLumigoIsIncluded();
			});
      
			test("if package.include is set, it adds _lumigo/* to the array", async () => {
				Object.values(serverless.service.functions).forEach(fun => {
					fun.package = {
						include: ["node_modules/**/*"]
					};
				});
    
				await lumigo.afterPackageInitialize();
				assertLumigoIsIncluded();
			});
		});
	});

	describe("nodejs10.x", () => {
		beforeEach(() => {
			serverless.service.provider.runtime = "nodejs10.x";
		});

		test("it should wrap all functions after package initialize", async () => {
			await lumigo.afterPackageInitialize();
			assertNodejsFunctionsAreWrapped();
		});

		test("it should clean up after deployment artefact is created", async () => {
			await lumigo.afterCreateDeploymentArtifacts();
			assertNodejsFunctionsAreCleanedUp();
		});

		describe("there are no functions", () => {
			beforeEach(() => {
				serverless.service.functions = {};
			});

			test("it shouldn't wrap any function after package initialize", async () => {
				await lumigo.afterPackageInitialize();
				assertFunctionsAreNotWrapped();
			});

			test("it does nothing after deployment artefact is created", async () => {
				await lumigo.afterCreateDeploymentArtifacts();
				assertNothingHappens();
			});
		});
    
		describe("when functions are packaged individually", () => {
			beforeEach(() => {
				serverless.service.package = {
					individually: true
				};
			});
      
			test("if package.include is not set, it's initialized with _lumigo/*", async () => {    
				await lumigo.afterPackageInitialize();
				assertLumigoIsIncluded();
			});
      
			test("if package.include is set, it adds _lumigo/* to the array", async () => {
				Object.values(serverless.service.functions).forEach(fun => {
					fun.package = {
						include: ["node_modules/**/*"]
					};
				});
    
				await lumigo.afterPackageInitialize();
				assertLumigoIsIncluded();
			});
		});
	});
});

describe("Lumigo plugin (python)", () => {
	describe("python2.7", () => {
		beforeEach(() => {
			serverless.service.provider.runtime = "python2.7";
		});

		test("it shouldn't wrap any function after package initialize", async () => {
			await lumigo.afterPackageInitialize();
			assertFunctionsAreNotWrapped();
		});

		test("it does nothing after deployment artefact is created", async () => {
			await lumigo.afterCreateDeploymentArtifacts();
			assertNothingHappens();
		});
	});

	describe("python3.7", () => {
		beforeEach(() => {
			serverless.service.provider.runtime = "python3.7";
		});

		describe("there are no functions", () => {
			beforeEach(() => {
				serverless.service.functions = {};
			});

			test("it shouldn't wrap any function after package initialize", async () => {
				await lumigo.afterPackageInitialize();
				assertFunctionsAreNotWrapped();
			});

			test("it does nothing after deployment artefact is created", async () => {
				await lumigo.afterCreateDeploymentArtifacts();
				assertNothingHappens();
			});
		});

		test("it should wrap all functions after package initialize", async () => {
			fs.pathExistsSync.mockReturnValue(true);
			fs.readFile.mockReturnValue(`
--index-url https://1wmWND-GD5RPAwKgsdvb6DphXCj0vPLs@pypi.fury.io/lumigo/
--extra-index-url https://pypi.org/simple/
lumigo_tracer`);

			await lumigo.afterPackageInitialize();
			assertPythonFunctionsAreWrapped();
		});

		test("it should clean up after deployment artefact is created", async () => {
			await lumigo.afterCreateDeploymentArtifacts();
			assertPythonFunctionsAreCleanedUp();
		});

		describe("if there is override file name for requirements.txt (for the serverless-python-requirements plugin)", () => {
			beforeEach(() => {
				serverless.service.custom.pythonRequirements = {
					fileName: "requirements-dev.txt"
				};
			});

			test("it should check the requirements for the override file", async () => {
				fs.pathExistsSync.mockReturnValue(true);
				fs.readFile.mockReturnValue(`
  --index-url https://1wmWND-GD5RPAwKgsdvb6DphXCj0vPLs@pypi.fury.io/lumigo/
  --extra-index-url https://pypi.org/simple/
  lumigo_tracer`);

				await lumigo.afterPackageInitialize();
				assertPythonFunctionsAreWrapped();
				expect(fs.pathExistsSync).toBeCalledWith("requirements-dev.txt");
				expect(fs.readFile).toBeCalledWith("requirements-dev.txt", "utf8");
			});
		});

		describe("if the requirements.txt is missing", () => {
			beforeEach(() => {
				fs.pathExistsSync.mockReturnValue(false);
			});

			test("it should error", async () => {
				await expect(lumigo.afterPackageInitialize()).rejects;
				expect(fs.pathExistsSync).toBeCalledWith("requirements.txt");
			});
		});

		describe("if the requirements.txt does not have lumigo_tracer", () => {
			beforeEach(() => {
				fs.pathExistsSync.mockReturnValue(true);
				fs.readFile.mockReturnValue("some_other_package");
			});

			test("it should error", async () => {
				await expect(lumigo.afterPackageInitialize()).rejects;
				expect(fs.pathExistsSync).toBeCalledWith("requirements.txt");
				expect(fs.readFile).toBeCalledWith("requirements.txt", "utf8");
			});
		});

		describe("if functions are packed individually", () => {
			beforeEach(() => {
				serverless.service.package = {
					individually: true
				};
				serverless.service.functions = {
					hello: {
						handler: "functions/hello/hello.world",
						events: []
					},
					world: {
						handler: "functions/world/world.handler",
						events: []
					}
				};
			});

			test("it should check the requirements.txt in each function's folder", async () => {
				fs.pathExistsSync.mockReturnValue(true);
				fs.readFile.mockReturnValue(`
  --index-url https://1wmWND-GD5RPAwKgsdvb6DphXCj0vPLs@pypi.fury.io/lumigo/
  --extra-index-url https://pypi.org/simple/
  lumigo_tracer`);

				await lumigo.afterPackageInitialize();
				expect(fs.pathExistsSync).toBeCalledTimes(2);
				expect(fs.pathExistsSync).toBeCalledWith(
					"functions/hello/requirements.txt"
				);
				expect(fs.pathExistsSync).toBeCalledWith(
					"functions/world/requirements.txt"
				);
				expect(fs.readFile).toBeCalledTimes(2);
				expect(fs.readFile).toBeCalledWith(
					"functions/hello/requirements.txt",
					"utf8"
				);
				expect(fs.readFile).toBeCalledWith(
					"functions/world/requirements.txt",
					"utf8"
				);
			});

			describe("if there is override file name for requirements.txt", () => {
				beforeEach(() => {
					serverless.service.custom.pythonRequirements = {
						fileName: "requirements-dev.txt"
					};
				});

				test("it should check the requirements for the override file", async () => {
					fs.pathExistsSync.mockReturnValue(true);
					fs.readFile.mockReturnValue(`
  --index-url https://1wmWND-GD5RPAwKgsdvb6DphXCj0vPLs@pypi.fury.io/lumigo/
  --extra-index-url https://pypi.org/simple/
  lumigo_tracer`);

					await lumigo.afterPackageInitialize();

					expect(fs.pathExistsSync).toBeCalledTimes(2);
					expect(fs.pathExistsSync).toBeCalledWith("requirements-dev.txt");
					expect(fs.readFile).toBeCalledWith("requirements-dev.txt", "utf8");

					expect(fs.pathExistsSync).not.toBeCalledWith(
						"functions/hello/requirements.txt"
					);
					expect(fs.pathExistsSync).not.toBeCalledWith(
						"functions/world/requirements.txt"
					);

					expect(fs.readFile).not.toBeCalledWith(
						"functions/hello/requirements.txt",
						"utf8"
					);
					expect(fs.readFile).not.toBeCalledWith(
						"functions/world/requirements.txt",
						"utf8"
					);
				});
			});
      
			test("if package.include is not set, it's initialized with _lumigo/*", async () => {    
				await lumigo.afterPackageInitialize();
				assertLumigoIsIncluded();
			});
        
			test("if package.include is set, it adds _lumigo/* to the array", async () => {
				Object.values(serverless.service.functions).forEach(fun => {
					fun.package = {
						include: ["functions/**/*"]
					};
				});
      
				await lumigo.afterPackageInitialize();
				assertLumigoIsIncluded();
			});
		});
	});
});

describe("is not nodejs or python", () => {
	beforeEach(() => {
		serverless.service.provider.runtime = "java8";
	});

	test("it shouldn't wrap any function after package initialize", async () => {
		await lumigo.afterPackageInitialize();
		assertFunctionsAreNotWrapped();
	});

	test("it does nothing after deployment artefact is created", async () => {
		await lumigo.afterCreateDeploymentArtifacts();
		assertNothingHappens();
	});
});

function assertNodejsFunctionsAreWrapped() {
	expect(childProcess.exec).toBeCalledWith(
		"npm install @lumigo/tracer",
		expect.anything()
	);

	expect(fs.outputFile).toBeCalledTimes(6);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/hello.js",
		expect.toContainAllStrings(
			'const tracer = require("@lumigo/node-tracer")',
			"const handler = require('../hello').world",
			`token: '${token}'`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/hello.world.js",
		expect.toContainAllStrings(
			'const tracer = require("@lumigo/node-tracer")',
			"const handler = require('../hello.world').handler",
			`token: '${token}'`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/foo.js",
		expect.toContainAllStrings(
			'const tracer = require("@lumigo/node-tracer")',
			"const handler = require('../foo_bar').handler",
			`token: '${token}'`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/bar.js",
		expect.toContainAllStrings(
			'const tracer = require("@lumigo/node-tracer")',
			"const handler = require('../foo_bar').handler",
			`token: '${token}'`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/jet.js",
		expect.toContainAllStrings(
			'const tracer = require("@lumigo/node-tracer")',
			"const handler = require('../foo/foo/bar').handler",
			`token: '${token}'`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/pack.js",
		expect.toContainAllStrings(
			'const tracer = require("@lumigo/node-tracer")',
			"const handler = require('../foo.bar/zoo').handler",
			`token: '${token}'`
		)
	);
}

function assertPythonFunctionsAreWrapped() {
	expect(fs.outputFile).toBeCalledTimes(6);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/hello.py",
		expect.toContainAllStrings(
			"from lumigo_tracer import lumigo_tracer",
			"from hello import world as userHandler",
			`@lumigo_tracer(token='${token}')`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/hello.world.py",
		expect.toContainAllStrings(
			"from lumigo_tracer import lumigo_tracer",
			"from hello.world import handler as userHandler",
			`@lumigo_tracer(token='${token}')`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/foo.py",
		expect.toContainAllStrings(
			"from lumigo_tracer import lumigo_tracer",
			"from foo_bar import handler as userHandler",
			`@lumigo_tracer(token='${token}')`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/bar.py",
		expect.toContainAllStrings(
			"from lumigo_tracer import lumigo_tracer",
			"from foo_bar import handler as userHandler",
			`@lumigo_tracer(token='${token}')`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/jet.py",
		expect.toContainAllStrings(
			"from lumigo_tracer import lumigo_tracer",
			"from foo.foo.bar import handler as userHandler",
			`@lumigo_tracer(token='${token}')`
		)
	);
	expect(fs.outputFile).toBeCalledWith(
		__dirname + "/_lumigo/pack.py",
		expect.toContainAllStrings(
			"from lumigo_tracer import lumigo_tracer",
			"from foo.bar.zoo import handler as userHandler",
			`@lumigo_tracer(token='${token}')`
		)
	);
}

function assertFunctionsAreNotWrapped() {
	expect(childProcess.exec).not.toBeCalled();
	expect(fs.outputFile).not.toBeCalled();
}

function assertNodejsFunctionsAreCleanedUp() {
	expect(fs.remove).toBeCalledWith(__dirname + "/_lumigo");
	expect(childProcess.exec).toBeCalledWith(
		"npm uninstall @lumigo/tracer",
		expect.anything()
	);
}

function assertPythonFunctionsAreCleanedUp() {
	expect(fs.remove).toBeCalledWith(__dirname + "/_lumigo");
}

function assertNothingHappens() {
	expect(fs.remove).not.toBeCalled();
	expect(childProcess.exec).not.toBeCalled();
}

function assertLumigoIsIncluded() {
	Object.values(serverless.service.functions).forEach(fun => {
		expect(fun.package.include).toContain("_lumigo/*");
	});
}
