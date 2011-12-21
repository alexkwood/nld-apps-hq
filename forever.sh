#! /bin/bash

DIR=$(cd $(dirname $0); pwd)

forever start -l $DIR/log/forever.log -o $DIR/log/output.log -e $DIR/log/error.log --append --sourceDir=$DIR -c "sudo node" app.js || \
    { echo "Failed to start."; exit 1; }

forever list

/var/nodejs/logtail/logtail.js forever:$DIR/log/forever.log output:$DIR/log/output.log error:$DIR/log/error.log
