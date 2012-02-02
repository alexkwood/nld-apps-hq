#! /bin/bash

DIR=$(cd $(dirname $0); pwd)

$DIR/logtail/logtail.js forever:$DIR/log/forever.log output:$DIR/log/output.log error:$DIR/log/error.log
