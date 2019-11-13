#!/bin/bash
set -e
set -o pipefail

npm run test:lint
npm run prettier:ci
npm run test

pushd integration-test/nodejs
sls deploy
sls invoke -f hello
sls remove
popd


pushd integration-test
rm -rf venv || true
virtualenv venv -p python3
. venv/bin/activate
popd

pushd integration-test/python
npm i
sls deploy
sls invoke -f hello
sls remove
popd
