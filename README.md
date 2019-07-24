# serverless-lumigo

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

Serverless framework plugin to auto-install the Lumigo tracer for Node.js and Python functions.

## TOC

- [Install](#install)

## Install

Run `npm install` in your Serverless project.

`$ npm install --save-dev @lumigo/serverless-lumigo`

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
    <YOUR TOKEN GOES HERE>
```

## Python functions

For Python functions, we recommend using the [serverless-python-requirements](https://www.npmjs.com/package/serverless-python-requirements) plugin to help you manage your dependencies. You should have the following in your `requirements.txt`:

```
--index-url https://1wmWND-GD5RPAwKgsdvb6DphXCj0vPLs@pypi.fury.io/lumigo/
--extra-index-url https://pypi.org/simple/
lumigo_tracer
```

This installs the Lumigo tracer for Python, and this plugin would wrap your functions during `serverless package` and `serverless deploy`.

As with Node.js functions, you also need to configure the Lumigo token in a `custom` section in the `serverless.yml`.

```yml
provider:
  name: aws
  runtime: python3.7

custom:
  lumigo:
    <YOUR TOKEN GOES HERE>
```
