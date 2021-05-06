#!/bin/bash
set -e
set -o pipefail

npm run test:lint
npm run prettier:ci
npm run test

pushd integration-test/nodejs

sls deploy --force
echo "Results"
sls invoke -l true -f test

echo "Test"
sls invoke -l true -f test | grep "#LUMIGO#"

sls remove
popd


pushd integration-test
rm -rf venv || true
virtualenv venv -p python3.7
. venv/bin/activate
popd

pushd integration-test/python
npm i
sls deploy --force
echo "Invoking test"
echo
sls invoke -l true -f test | grep "#LUMIGO#"

sls invoke -f test-with-numbers
echo "Invoking with numbers"
echo 
sls invoke -f test-with-numbers
sls invoke -l true -f test | grep "#LUMIGO#"

sls remove
popd

echo "Done"
