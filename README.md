# serverless-lumigo

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![version](https://badge.fury.io/js/serverless-lumigo.svg)](https://www.npmjs.com/package/serverless-lumigo)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![CircleCI](https://circleci.com/gh/lumigo-io/serverless-lumigo-plugin/tree/master.svg?style=svg&circle-token=a136efcbcc581c23e081c4fa171a2d05c6fb8ab3)](https://circleci.com/gh/lumigo-io/serverless-lumigo-plugin/tree/master)
[![codecov](https://codecov.io/gh/lumigo-io/serverless-lumigo-plugin/branch/master/graph/badge.svg?token=8mXE2G04ZO)](https://codecov.io/gh/lumigo-io/serverless-lumigo-plugin)

This is a plugin for Serverless Framework. It auto-installs the Lumigo tracer for Node.js and Python Lambda functions.

## TOC

- [Installing the plugin](#installing-the-plugin)
- [Node.js functions](#nodejs-functions)
- [Python functions](#python-functions)
- [Configuring the tracer](#configuration)

## Installing the plugin
Install the Lumigo plugin using `npm`:

```bash
$ npm install --save-dev serverless-lumigo
```

Once you've added the plugin, include it in your `serverless.yml` file.

```yml
plugins:
  - serverless-lumigo
```

You are now ready to work with Lumigo in your serverless functions.

## Node.js functions

For Node.js functions, the plugin will install the latest version of the Lumigo Node.js plugin during the `serverless package` and `serverless deploy` steps. The plugin automatically wraps your Lambda functions in Lumigo's tracer, so you do not need to configure your token on each function - instead, simply add the token to the `custom` section of your `serverless.yml` file:

```yml
provider:
  name: aws
  runtime: nodejs10.x

custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    nodePackageManager: <npm or yarn>
```

If you want to lock the Lumigo tracer to a specific package version, use the `pinVersion` attribute. When present, the Serverless framework will attempt to import that specific version of the lumigo tracer library.:

```yml
provider:
  name: aws
  runtime: nodejs10.x

custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    pinVersion: 1.31.1
```

In some cases, such as when working with tools like Lerna or Webpack, you may not want the Serverless plugin to install the Lumigo tracer on your behalf for every deployment. If you encounter this, you can disable the NPM installation process altogether using the `skipInstallNdoeTracer` configuration setting:

```yml
provider:
  name: aws
  runtime: nodejs10.x

custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    skipInstallNodeTracer: true # defaults to false
```

## Python functions

**Note:** For Python functions, we recommend using the [serverless-python-requirements](https://www.npmjs.com/package/serverless-python-requirements) plugin to help you manage your dependencies. 

Start by adding the following line to your `requirements.txt` file:

```
lumigo_tracer
```

This step installs the Lumigo tracer for Python. The plugin will now automatically wrap your Lambda functions during the `serverless package` and `serverless deploy` steps.

To enable the tracer for your functions, you also need to provide the Lumigo token. This is provided in the section `custom` in your `serverless.yml` file:

```yml
provider:
  name: aws
  runtime: python3.7
custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
```

If you are using a mechanism other than `requirements.txt` to manage your dependencies, then you can disable the plugin's requirements check using the `skipReqCheck` flag as follows:
```yaml
custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    skipReqCheck: true
```

## Configuration

To pass parameters to the tracer, add them as new keys to the `custom` section, underneath the `lumigo` key, in your `serverless.yml` file:
```yml
custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    step_function: true
    parameter_2: value_2
```

### Function Scope Configuration

In addition to configuring the lumigo tracer at the library level, you can also configure tracer behavior at the individual function level. You can add a `lumigo` section to the function's definition in `serverless.yml`, then give it the key `enabled: false`. This will disable Lumigo tracing for the function

  ```yml
  functions:
    foo:
      lumigo:
        enabled: false
  
    bar:
      lumigo:
        enabled: ${self:custom.enabledLumigo}
  ```

## How to test
To test your code locally, make use of our test suite. Simply run the following `npm` command to see the results:

* `npm run test-all`
