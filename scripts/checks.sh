#!/bin/bash
set -e
set -o pipefail

npm run test:lint
npm run prettier:ci
npm run test

pushd integration-test/nodejs

sls deploy
echo "Results"
sls invoke -l true -f test

echo "Test"
sls invoke -l true -f test | grep "#LUMIGO#"

sls remove
popd

pushd integration-test/nodejs-layers

sls deploy

echo "Results"
sls invoke -l true -f test

echo "Test"
sls invoke -l true -f test | grep "#LUMIGO#"

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
echo "Results"
sls invoke -l true -f test
echo "Test"
sls invoke -l true -f test | grep "'type': 'function'"
sls remove
popd

pushd integration-test/python-layers
npm i
sls deploy
echo "Results"
sls invoke -l true -f test
echo "Test"
sls invoke -l true -f test | grep "'type': 'function'"
sls remove
popd

echo "Done"
