#! /bin/bash

## run the app using the Forever daemon controller.
## (https://github.com/indexzero/forever)

# note the -w flag watches for file changes, auto-reloads!
# -- never mind, -w flag doesn't work properly yet. reload manually.

DIR=$(cd $(dirname $0) && pwd)

forever start -l ${DIR}/logs/forever.log -o ${DIR}/logs/out.log -e ${DIR}/logs/err.log -a -c node --sourceDir ${DIR} app.js
