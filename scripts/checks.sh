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
sls invoke -l true -f test| grep "#LUMIGO#"

sls remove
popd


. $HOME/miniconda/bin/activate
conda create -n myvenv python=3.7 -y
conda activate myvenv

pushd integration-test/python
npm i
sls deploy
echo "Results"
sls invoke -l true -f test
echo "Test"
sls invoke -l true -f test | grep "'type': 'function'"

echo "Results with numbers"
sls invoke -l true -f test-with-numbers
echo "Test with numbers"
sls invoke -l true -f test-with-numbers | grep "'type': 'function'"

sls remove
popd
echo "Done"
