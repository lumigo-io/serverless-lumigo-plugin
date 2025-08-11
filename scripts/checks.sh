#!/bin/bash
set -e
set -o pipefail

if [ -n "$STAGING_AWS_ACCESS_KEY_ID" ]; then
    echo "Staging credentials detected, overriding default credentials."
    export AWS_ACCESS_KEY_ID="$STAGING_AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$STAGING_AWS_SECRET_ACCESS_KEY"
fi

npm run test:lint
npm run prettier:ci
npm run test

pushd integration-test/nodejs

random=$RANDOM

echo
echo "********************"
echo "** Testing NodeJS **"
echo "********************"
echo

echo
echo "** Deploying **"
echo
npx serverless deploy --force --stage $random

echo
echo "** Testing **"
echo
npx serverless invoke -l -f test --stage $random | grep "#LUMIGO#"

echo
echo "** Removing stack **"
echo
npx serverless remove --stage $random
popd


pushd integration-test/nodejs-esbuild

random=$RANDOM

echo
echo "**********************************"
echo "** Testing NodeJS with es-build **"
echo "**********************************"
echo

echo
echo "** Install packages **"
echo
npm i

echo
echo "** Deploying **"
echo
npx serverless deploy --force --stage $random

echo
echo "** Testing **"
echo
npx serverless invoke -l -f test --stage $random | grep "#LUMIGO#"

echo
echo "** Removing stack **"
echo
npx serverless remove --stage $random
popd


pushd integration-test/nodejs-pnpm

random=$RANDOM

echo
echo "******************************"
echo "** Testing NodeJS with PNPM **"
echo "******************************"
echo

echo
echo "** Deploying **"
echo
npx serverless deploy --force --stage $random

echo
echo "** Testing **"
echo
npx serverless invoke -l -f test --stage $random | grep "#LUMIGO#"

echo
echo "** Removing stack **"
echo
npx serverless remove --stage $random
popd

pushd integration-test/nodejs-esm

random=$RANDOM

echo
echo "***********************************"
echo "** Testing NodeJS with ES Module **"
echo "***********************************"
echo

echo
echo "** Deploying **"
echo
npx serverless deploy --force --stage $random

echo
echo "** Testing **"
echo
npx serverless invoke -l -f test --stage $random | grep "#LUMIGO#"

echo
echo "** Removing stack **"
echo
npx serverless remove --stage $random
popd

echo
echo "********************"
echo "** Testing Python **"
echo "********************"
echo
echo
pushd integration-test
rm -rf venv || true
virtualenv venv -p python3.12
. venv/bin/activate
popd

echo
echo "** Deploying **"
echo
pushd integration-test/python
npm i
npx serverless deploy --force --stage $random
echo
echo "** Testing #1 **"
echo
npx serverless invoke -l -f test --stage $random | grep "#LUMIGO#"
echo
echo "** Testing #2 **"
echo
npx serverless invoke -l -f test --stage $random | grep "#LUMIGO#"
echo
echo "** Removing stack **"
echo
npx serverless remove --stage $random
popd

echo
echo "** Tests completed successfully. **"
