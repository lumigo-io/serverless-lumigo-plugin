# serverless-lumigo

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/lumigo-io/serverless-lumigo-plugin/tree/master.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/lumigo-io/serverless-lumigo-plugin/tree/master)
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![version](https://badge.fury.io/js/serverless-lumigo.svg)](https://www.npmjs.com/package/serverless-lumigo)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![codecov](https://codecov.io/gh/lumigo-io/serverless-lumigo-plugin/branch/master/graph/badge.svg?token=8mXE2G04ZO)](https://codecov.io/gh/lumigo-io/serverless-lumigo-plugin)

Serverless framework plugin to auto-install the Lumigo tracer for Node.js and Python functions.

## TOC

- [Install](#install)
- [Node.js functions](#nodejs-functions)
- [Python functions](#python-functions)
- [Configuring the tracer](#configuration)

## Install

Run `npm install` in your Serverless project.

`$ npm install --save-dev serverless-lumigo`

Add the plugin to your serverless.yml file

```yaml
plugins:
  - serverless-lumigo
```

## Node.js functions

For Node.js functions, the plugin would install the latest version of the Lumigo tracer for Node.js during `serverless package` and `serverless deploy`. It would also wrap your functions as well, so you only need to configure your Lumigo token in a `custom` section inside the `serverless.yml`.

For example:

```yaml
provider:
  name: aws
  runtime: nodejs12.x

custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    nodePackageManager: <npm, pnpm or yarn>
```

In case you want to pin the specific tracer version use `pinVersion` attribute.

For example

```yaml
provider:
  name: aws
  runtime: nodejs12.x

custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    pinVersion: 1.31.1
```

In case you want to manage the Lumigo tracer dependency yourself - e.g. you want to use Lerna or Webpack, and can't have this plugin install the Lumigo tracer on your behalf on every deployment - then you can also disable the NPM install process altogether.

```yaml
provider:
  name: aws
  runtime: nodejs12.x

custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    skipInstallNodeTracer: true # defaults to false
```

In case you are using ES Modules for Lambda handlers.

```yaml
provider:
  name: aws
  runtime: nodejs14.x

custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    nodeUseESModule: true
    nodeModuleFileExtension: js
```

## Python functions

For Python functions, we recommend using the [serverless-python-requirements](https://www.npmjs.com/package/serverless-python-requirements) plugin to help you manage your dependencies. You should have the following in your `requirements.txt`:

```txt
lumigo_tracer or lumigo-tracer
```

This installs the Lumigo tracer for Python, and this plugin would wrap your functions during `serverless package` and `serverless deploy`.

You also need to configure the Lumigo token in a `custom` section in the `serverless.yml`.

```yaml
provider:
  name: aws
  runtime: python3.7
custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
```

In case you are not using `requirements.txt` to manage your requirements then you can add `skipReqCheck` and set it to `true`

```yaml
custom:
  lumigo:
    token: 1234
    skipReqCheck: true
```

## Configuration

In order to pass parameters to the tracer, just add them as keys to lumigo custom configuration. For example:

```yaml
custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    step_function: true
```

### Function Scope Configuration

You can configure lumigo behavior for individual functions as well:

- `enabled` - Allows one to enable or disable lumigo for specific a specific function

  ```yaml
  functions:
    foo:
      lumigo:
        enabled: false

    bar:
      lumigo:
        enabled: ${self:custom.enabledLumigo}
  ```

## How to test

Run `npm run test:all`
