#!/bin/bash
set -e
set -o pipefail

npm run test:lint
npm run prettier:ci
npm run test

pushd integration-test/nodejs

random=$RANDOM

echo "** Testing NodeJS **"
echo "********************"
echo
echo

echo "** Deploying **"
echo
sls deploy --force --stage $random

echo "** Testing **"
echo
sls invoke -l true -f test --stage $random | grep "#LUMIGO#"

echo "** Removing stack **"
echo
sls remove --stage $random
popd

echo "** Testing Python **"
echo "********************"
echo
echo
pushd integration-test
rm -rf venv || true
virtualenv venv -p python3.7
. venv/bin/activate
popd

echo "** Deploying **"
echo
pushd integration-test/python
npm i
sls deploy --force --stage $random
echo "** Testing #1 **"
echo
sls invoke -l true -f test --stage $random | grep "#LUMIGO#"

echo "** Testing #2 **"
echo 
sls invoke -l true -f test --stage $random | grep "#LUMIGO#"
echo "** Removing stack **"
echo
sls remove --stage $random
popd

echo "** Success **"
