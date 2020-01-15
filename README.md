# serverless-lumigo

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![version](https://badge.fury.io/js/serverless-lumigo.svg)](https://www.npmjs.com/package/serverless-lumigo)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![CircleCI](https://circleci.com/gh/lumigo-io/serverless-lumigo-plugin.svg?style=svg)](https://circleci.com/gh/lumigo-io/serverless-lumigo-plugin) 
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

```yml
plugins:
  - serverless-lumigo
```

## Node.js functions

For Node.js functions, the plugin would install the latest version of the Lumigo tracer for Node.js during `serverless package` and `serverless deploy`. It would also wrap your functions as well, so you only need to configure your Lumigo token in a `custom` section inside the `serverless.yml`.

For example:

```yml
provider:
  name: aws
  runtime: nodejs10.x

custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    nodePackageManager: <npm or yarn>
```

## Python functions

For Python functions, we recommend using the [serverless-python-requirements](https://www.npmjs.com/package/serverless-python-requirements) plugin to help you manage your dependencies. You should have the following in your `requirements.txt`:

```
lumigo_tracer
```

This installs the Lumigo tracer for Python, and this plugin would wrap your functions during `serverless package` and `serverless deploy`.

You also need to configure the Lumigo token in a `custom` section in the `serverless.yml`.

```yml
provider:
  name: aws
  runtime: python3.7
custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
```

## Configuration
In order to pass parameters to the tracer, just add them as keys to lumigo custom configuration. For example, in order to add [enhanced print](https://github.com/lumigo-io/python_tracer#enhanced-print) support use:
```yml
custom:
  lumigo:
    token: <YOUR TOKEN GOES HERE>
    enhance_print: true
```

## How to test
* Run `npm run test-all`
